"""extract.html이 만든 meta.json과 모듈 목록(mods.txt)으로 src/lib/ui5meta.json을 만들어요.

사용법: python3 build.py meta.json mods.txt ../../src/lib/ui5meta.json
"""
import json
import sys

meta_path, mods_path, out_path = sys.argv[1:4]
d = json.load(open(meta_path))
mods = {l.strip() for l in open(mods_path) if l.strip()}
mods |= {n.replace('.', '/') for n in d['classes']}
c = {}
for n, v in sorted(d['classes'].items()):
    flags = (1 if v['a'] else 0) | (2 if v.get('base') else 0)
    c[n] = [v['p'], flags, v['d'],
            ','.join(f'{a}:{b}' for a, b in v['props']),
            ','.join(f'{a}:{b}:{m}' for a, b, m in v['aggs']),
            ','.join(v['events']),
            ','.join(v['assocs'])]
out = {'v': d['version'], 'c': c, 'e': {k: ','.join(map(str, vs)) for k, vs in sorted(d['enums'].items())},
       'm': ' '.join(sorted(mods)), 'f': ' '.join(d['methods'])}
open(out_path, 'w').write(json.dumps(out, ensure_ascii=False, separators=(',', ':')))
print(d['version'], len(c), 'classes')
