from importlib.metadata import distributions
from pathlib import Path
import json,shutil
root=Path(__file__).resolve().parents[1]
output=root/'third_party'/'python';output.mkdir(parents=True,exist_ok=True)
rows=[]
for distribution in distributions():
    m=distribution.metadata;name=m.get('Name','unknown');version=m.get('Version','unknown')
    expression=m.get('License-Expression') or m.get('License') or '; '.join(v for v in m.get_all('Classifier',[]) if v.startswith('License ::')) or 'See licence files'
    if len(expression)>200:expression='See included licence text'
    folder=output/(name+'-'+version);folder.mkdir(exist_ok=True)
    for file in distribution.files or []:
        if any(part.lower() in {'licenses','license'} for part in file.parts) or file.name.lower().startswith(('license','copying','notice')):
            path=distribution.locate_file(file)
            if path.is_file():shutil.copyfile(path,folder/file.name)
    rows.append(dict(name=name,version=version,license=expression))
(root/'third_party'/'python-licenses.json').write_text(json.dumps(sorted(rows,key=lambda x:x['name'].lower()),indent=2)+'\n',encoding='utf-8')
print(len(rows),'installed Python package licence records collected.')
