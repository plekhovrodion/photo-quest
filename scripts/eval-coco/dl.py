import json, os, urllib.request
from concurrent.futures import ThreadPoolExecutor
S=json.load(open('samples.json'))
urls={s['img']:s['url'] for s in S}
def get(item):
    f,u=item; p='img/'+f
    if os.path.exists(p) and os.path.getsize(p)>1000: return 1
    try:
        urllib.request.urlretrieve(u,p); return 1
    except Exception as e: return 0
with ThreadPoolExecutor(12) as ex: r=list(ex.map(get,urls.items()))
print(sum(r),len(r))
