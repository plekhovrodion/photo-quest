import json, collections
import numpy as np
d=json.load(open('result.json')); OBJ=d['OBJ']; R=d['res']; idx={n:i for i,n in enumerate(OBJ)}
LV=json.load(open('levels.json')); peers={}
for l,names in LV.items():
    for n in names: peers.setdefault(n,set()).update(x for x in names if x!=n)
def run(scn,th=0.02):
    n=ok=fp=fpn=0; per=collections.defaultdict(lambda:[0,0])
    for r in R:
        p=np.array(r['P'][scn]); n+=1; hit=p[idx[r['en']]]>=th; ok+=hit; per[r['en']][0]+=hit; per[r['en']][1]+=1
        for q in peers.get(r['en'],()):
            if q in r['present']: continue
            fpn+=1; fp+= p[idx[q]]>=th
    return round(ok/n*100,1), round(fp/fpn*100,1), per
print('образцов',len(R),'  рамка YOLO попала в предмет (IoU>0.4, топ-3):',round(sum(r['hit'] for r in R)/len(R)*100,1),'%')
names={'whole':'весь кадр (как сейчас без рамки)','gt':'идеальная вырезка по разметке','yolo1':'YOLO: одна рамка ближе к центру','yolo3':'YOLO: 3 лучшие рамки','whole+yolo3':'весь кадр + 3 рамки YOLO'}
for scn in ['whole','yolo1','yolo3','whole+yolo3','gt']:
    for th in (0.02,0.05):
        a,b,_=run(scn,th); print(f'{names[scn]:42s} порог {th}: узнано {a:5.1f}%  путаница {b:4.1f}%')
print()
_,_,pw=run('whole'); _,_,py=run('whole+yolo3')
print('по предметам (весь кадр -> кадр+YOLO):')
for n in sorted(pw): print(f'  {n:18s} {pw[n][0]:2d}/{pw[n][1]:2d} -> {py[n][0]:2d}/{py[n][1]:2d}')
