import json, sys, time, math
import numpy as np
from PIL import Image
import onnxruntime as ort
from ultralytics import YOLO

PROJ='/Users/r.plekhov/code/photo-quest-ui/public/models/clip/'
sess=ort.InferenceSession(PROJ+'vision.onnx', providers=['CPUExecutionProvider'])
txt=json.load(open(PROJ+'text.json'))
OBJ=list(txt['ens'].keys()); BG=list(txt['bg'].keys())
T=np.array([txt['ens'][k] for k in OBJ]+[txt['bg'][k] for k in BG],dtype=np.float32)
NOBJ=len(OBJ)
MEAN=np.array([0.48145466,0.4578275,0.40821073],dtype=np.float32); STD=np.array([0.26862954,0.26130258,0.27577711],dtype=np.float32)
LV=json.load(open('levels.json'))
peers={}
for l,names in LV.items():
    for n in names: peers.setdefault(n,set()).update(x for x in names if x!=n)

def embed(im):
    w,h=im.size; s=min(w,h); l=(w-s)//2; t=(h-s)//2
    c=im.crop((l,t,l+s,t+s)).resize((224,224),Image.BICUBIC)
    a=(np.asarray(c,dtype=np.float32)/255-MEAN)/STD
    e=sess.run(None,{'pixel_values':a.transpose(2,0,1)[None]})[0][0]
    return e/np.linalg.norm(e)
def probs(e):
    sc=T@e; z=np.exp(100*(sc-sc.max())); return (z/z.sum())[:NOBJ]   # вероятность каждого предмета (фон входит в знаменатель)
yolo=YOLO('yolov8n.pt')
def crop_margin(im,box,m=0.12):
    x0,y0,x1,y1=box; w,h=x1-x0,y1-y0
    return im.crop((max(0,int(x0-w*m)),max(0,int(y0-h*m)),min(im.width,int(x1+w*m)),min(im.height,int(y1+h*m))))
S=json.load(open('samples.json'))
res=[]; t0=time.time()
for i,s in enumerate(S):
    im=Image.open('img/'+s['img']).convert('RGB')
    x,y,w,h=s['bbox']
    P={}
    P['whole']=probs(embed(im))
    P['gt']=probs(embed(crop_margin(im,(x,y,x+w,y+h))))
    r=yolo.predict(im,conf=0.10,verbose=False,imgsz=640)[0]
    boxes=r.boxes.xyxy.cpu().numpy(); conf=r.boxes.conf.cpu().numpy()
    order=np.argsort(-conf)
    cx,cy=im.width/2,im.height/2
    # кандидаты: три самые уверенные рамки любого класса
    top=[boxes[j] for j in order[:3]]
    pt=[probs(embed(crop_margin(im,b))) for b in top]
    P['yolo3']=np.max(pt,axis=0) if pt else np.zeros(NOBJ)
    # одна рамка: ближайшая к центру среди уверенных (имитация «ребёнок навёл на предмет»)
    if len(boxes):
        sc=[ (conf[j]>=0.25)*1.0/(1+math.hypot((boxes[j][0]+boxes[j][2])/2-cx,(boxes[j][1]+boxes[j][3])/2-cy)/max(im.width,im.height)) + conf[j]*0.3 for j in range(len(boxes))]
        b=boxes[int(np.argmax(sc))]; P['yolo1']=probs(embed(crop_margin(im,b)))
    else: P['yolo1']=np.zeros(NOBJ)
    P['whole+yolo3']=np.maximum(P['whole'],P['yolo3'])
    # box hit: есть ли рамка YOLO с IoU>0.4 к истинной
    def iou(a,b):
        ix=max(0,min(a[2],b[2])-max(a[0],b[0])); iy=max(0,min(a[3],b[3])-max(a[1],b[1])); I=ix*iy
        return I/((a[2]-a[0])*(a[3]-a[1])+(b[2]-b[0])*(b[3]-b[1])-I+1e-9)
    hit=any(iou(b,(x,y,x+w,y+h))>0.4 for b in top)
    res.append({'en':s['en'],'present':s['present'],'hit':bool(hit),'P':{k:v.tolist() for k,v in P.items()}})
    if i%40==0: print(i,len(S),round(time.time()-t0),flush=True)
json.dump({'OBJ':OBJ,'res':res},open('result.json','w'))
print('done',round(time.time()-t0))
