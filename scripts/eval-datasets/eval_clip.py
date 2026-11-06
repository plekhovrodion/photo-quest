#!/usr/bin/env python3
"""Прогоняет текущий CLIP игры по manifest Open Images.

Использует тот же vision.onnx, text.json, центральный квадрат,
softmax x100 и порог 0.02, что src/vision/clip.ts.
"""
import argparse
import json
import time
from collections import defaultdict
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / '.eval-data' / 'open-images'
MODEL = ROOT / 'public' / 'models' / 'clip'
SIZE = 256
THRESHOLD = 0.02


def arguments():
    parser = argparse.ArgumentParser()
    parser.add_argument('--manifest', type=Path, default=DATA / 'manifest.jsonl')
    parser.add_argument('--output', type=Path, default=DATA / 'clip-report.json')
    parser.add_argument('--limit', type=int, default=0, help='Сбалансированный лимит; 0 — весь manifest')
    return parser.parse_args()


def balanced(samples, limit):
    if not limit or len(samples) <= limit:
        return samples
    groups = defaultdict(list)
    for sample in samples:
        groups[sample['taskId']].append(sample)
    out = []
    index = 0
    while len(out) < limit:
        added = False
        for group in groups.values():
            if index < len(group) and len(out) < limit:
                out.append(group[index])
                added = True
        if not added:
            break
        index += 1
    return out


def center_square(image):
    width, height = image.size
    side = min(width, height)
    left, top = (width - side) // 2, (height - side) // 2
    return image.crop((left, top, left + side, top + side))


def object_crop(image, bbox, margin=0.12):
    width, height = image.size
    x0, y0, x1, y1 = bbox
    x, y = x0 * width, y0 * height
    w, h = (x1 - x0) * width, (y1 - y0) * height
    return image.crop((
        max(0, int(x - w * margin)), max(0, int(y - h * margin)),
        min(width, int(x + w * (1 + margin))), min(height, int(y + h * (1 + margin))),
    ))


def pixels(image):
    image = center_square(image).resize((SIZE, SIZE), Image.Resampling.BICUBIC)
    array = np.asarray(image, dtype=np.float32) / 255
    return array.transpose(2, 0, 1)[None]


def main():
    args = arguments()
    samples = [json.loads(line) for line in args.manifest.read_text().splitlines() if line.strip()]
    samples = balanced(samples, args.limit)
    text = json.loads((MODEL / 'text.json').read_text())
    names = list(text['ens'])
    backgrounds = list(text['bg'])
    # clip.ts считает скалярные произведения числами JavaScript (double).
    vectors = np.array([text['ens'][name] for name in names] + [text['bg'][name] for name in backgrounds], dtype=np.float64)
    name_index = {name: index for index, name in enumerate(names)}
    session = ort.InferenceSession(str(MODEL / 'vision.onnx'), providers=['CPUExecutionProvider'])

    def rank(image):
        started = time.perf_counter()
        # Браузерный ONNX может вернуть float16. В clipWorker результат далее
        # нормализуется числами JS (float64), поэтому здесь явно считаем в float32.
        embedding = session.run(None, {'pixel_values': pixels(image)})[0][0].astype(np.float64)
        if not np.isfinite(embedding).all():
            raise ValueError('CLIP вернул NaN или Infinity')
        embedding /= np.linalg.norm(embedding) or 1
        # Явная сумма повторяет цикл dot() из clip.ts и не зависит от BLAS.
        scores = np.sum(vectors * embedding[None, :], axis=1)
        probability = np.exp(100 * (scores - scores.max()))
        probability /= probability.sum()
        elapsed = round((time.perf_counter() - started) * 1000)
        order = np.argsort(-probability[:len(names)])[:5]
        return probability, elapsed, [f'{names[i]}:{probability[i]:.4f}' for i in order]

    results, errors = [], []
    for index, sample in enumerate(samples, 1):
        try:
            path = DATA / sample['image']
            with Image.open(path) as opened:
                image = ImageOps.exif_transpose(opened).convert('RGB')
                full, full_ms, top = rank(image)
                crop, crop_ms, _ = rank(object_crop(image, sample['bbox']))
            target = name_index[sample['target']]
            full_prob, crop_prob = float(full[target]), float(crop[target])
            results.append({
                **sample,
                'clipFull': full_prob >= THRESHOLD,
                'clipCrop': crop_prob >= THRESHOLD,
                'clipFullProb': round(full_prob, 6),
                'clipCropProb': round(crop_prob, 6),
                'clipFullMs': full_ms,
                'clipCropMs': crop_ms,
                'clipTop': top,
            })
        except Exception as error:  # сохраняем проблемный файл и продолжаем набор
            errors.append({'sample': sample, 'error': str(error)})
        if index % 10 == 0 or index == len(samples):
            print(f'{index}/{len(samples)}, ошибок {len(errors)}', flush=True)

    grouped = defaultdict(list)
    for result in results:
        grouped[result['taskId']].append(result)
    tasks = {}
    for task, rows in grouped.items():
        tasks[task] = {
            'n': len(rows),
            'clipFull': round(sum(row['clipFull'] for row in rows) / len(rows), 4),
            'clipCrop': round(sum(row['clipCrop'] for row in rows) / len(rows), 4),
        }
    total = len(results)
    report = {
        'generatedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'manifest': str(args.manifest),
        'model': 'MobileCLIP-S0 fp16',
        'threshold': THRESHOLD,
        'total': total,
        'overall': {
            'clipFull': round(sum(row['clipFull'] for row in results) / total, 4) if total else 0,
            'clipCrop': round(sum(row['clipCrop'] for row in results) / total, 4) if total else 0,
            'fullMsMean': round(sum(row['clipFullMs'] for row in results) / total) if total else 0,
            'cropMsMean': round(sum(row['clipCropMs'] for row in results) / total) if total else 0,
        },
        'tasks': tasks,
        'results': results,
        'errors': errors,
    }
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(f"CLIP кадр {report['overall']['clipFull']:.1%}; объект {report['overall']['clipCrop']:.1%}; отчёт {args.output}")


if __name__ == '__main__':
    main()
