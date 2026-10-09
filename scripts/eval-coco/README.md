# Замер на размеченных фото COCO (val2017)

Что делает: берёт ~760 объектов 43 классов COCO (крупнее 4% кадра), прогоняет через CLIP (как в игре) в нескольких режимах:
весь кадр, идеальная вырезка по разметке, рамки YOLOv8n. Считает, сколько предметов узнано и как часто засчитывается чужое задание того же места.

```bash
python3 -m venv venv && venv/bin/pip install ultralytics onnx onnxruntime
curl -LO http://images.cocodataset.org/annotations/annotations_trainval2017.zip && unzip annotations_trainval2017.zip annotations/instances_val2017.json
node --input-type=module -e "import {LEVELS} from '<путь>/src/data/tasks.ts'; const o={}; for (const l of LEVELS) o[l.id]=l.tasks.map(t=>t.local?.clip).filter(Boolean); console.log(JSON.stringify(o))" > levels.json
python3 pick_samples.py && python3 dl.py && venv/bin/python eval.py && venv/bin/python summarize.py
```
Пути к CLIP-файлам в `eval.py` (PROJ) поправьте под свою машину. Лицензия: ultralytics и веса YOLOv8 — AGPL-3.0.
