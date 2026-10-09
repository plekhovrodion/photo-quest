import json, random, collections
random.seed(7)
d=json.load(open('annotations/instances_val2017.json'))
cats={c['id']:c['name'] for c in d['categories']}
MAP={'fork':'fork','spoon':'spoon','cup':'cup','bowl':'bowl','bottle':'bottle','refrigerator':'refrigerator','microwave':'microwave oven','sink':'sink','bed':'bed','couch':'sofa','chair':'chair','tv':'television','book':'book','clock':'wall clock','potted plant':'potted plant','teddy bear':'teddy bear','vase':'vase','scissors':'scissors','laptop':'laptop','cell phone':'mobile phone','keyboard':'computer keyboard','mouse':'computer mouse','umbrella':'umbrella','backpack':'backpack','handbag':'handbag','skateboard':'skateboard','banana':'banana','apple':'apple','carrot':'carrot','broccoli':'broccoli','pizza':'pizza','sandwich':'sandwich','cake':'cake','bicycle':'bicycle','car':'car','bus':'bus','dog':'dog','cat':'cat','bird':'bird','bench':'bench','toothbrush':'toothbrush','toilet':'toilet','orange':'orange fruit'}
imgs={i['id']:i for i in d['images']}
byimg=collections.defaultdict(list)
for a in d['annotations']: byimg[a['image_id']].append(a)
cand=collections.defaultdict(list)
for a in d['annotations']:
    n=cats[a['category_id']]
    if n not in MAP or a.get('iscrowd'): continue
    im=imgs[a['image_id']]; x,y,w,h=a['bbox']
    if w*h/(im['width']*im['height'])<0.04 or min(w,h)<70: continue
    cand[n].append(a)
out=[]
for n,lst in cand.items():
    random.shuffle(lst)
    for a in lst[:18]:
        im=imgs[a['image_id']]
        present=sorted({MAP[cats[b['category_id']]] for b in byimg[a['image_id']] if cats[b['category_id']] in MAP})
        out.append({'en':MAP[n],'img':im['file_name'],'w':im['width'],'h':im['height'],'bbox':a['bbox'],'present':present,'url':im['coco_url']})
json.dump(out,open('samples.json','w'))
print(len(out), len({o['img'] for o in out}), collections.Counter(o['en'] for o in out).most_common(5), len(cand))
