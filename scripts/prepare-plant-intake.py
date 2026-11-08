"""Prepare an auditable plant-image batch; never imports accepted knowledge itself.

Run from project root: python scripts/prepare-plant-intake.py --old-root PATH.
Primary-source files in sources/plant-intake are the reviewed edition inputs.
"""
from pathlib import Path
import argparse, hashlib, json, shutil, sys, uuid
from PIL import Image
from pypdf import PdfReader
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from backend.store import Store, ROOT

DAY='2026-11-08'
MAPPING={
 'carob':'carob','wild_olive':'wild-olive','lentisk':'mastic','buckthorn':'rhamnus-alaternus',
 'palmetto':'dwarf-palm','retama':'retama-sphaerocarpa','esparto':'esparto','thyme':'thymus-hyemalis',
 'rosemary':'rosemary','rhamnus_lycioides':'rhamnus-lycioides','ephedra_fragilis':'ephedra-fragilis',
 'ziziphus':'ziziphus-lotus','lycium':'lycium-intricatum','salsola':'salsola-webbii',
 'oleander':'oleander','tamarix':'tamarix','kermes_oak':'kermes-oak','holm_oak':'holm-oak-rotundifolia',
 'phillyrea_angustifolia':'phillyrea-angustifolia','phillyrea_latifolia':'phillyrea-latifolia',
 'myrtle':'myrtle','terebinth':'terebinth','cork_oak':'cork-oak'}

def load(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()

def prepare(old_root:Path,db:Path|None):
    source=old_root/'restoration_simulator/frontend/public/plants'
    metadata=load(old_root/'restoration_simulator/frontend/src/plant-illustrations.json')['plants']
    names={x['id']:x for x in load(old_root/'restoration_simulator/scenarios/plant-names.json')['plants']}
    catalogue={x['id']:x for x in load(old_root/'restoration_simulator/scenarios/planting-catalog-v2.json')['plants']}
    if {x['id'] for x in metadata}!=set(MAPPING):raise ValueError('The illustration collection changed; reconcile the reviewed mapping.')
    store=Store(db) if db else Store();snap=store.snapshot();existing={t['id']:t for t in snap['topics']}
    batch={'batch_id':'plant-illustrations-and-focused-profiles-2026-11-08','summary':'46 reviewed local illustrations; 23 focused profiles and evidence-based community links. No simulator rules or prices imported.',
           'base_revision':snap['revision'],'topics':[],'relationships':[],'findings':[],'coverage':[],'unresolved':[],'sources':[],'plant_images':[]}
    review=load(ROOT/'imports/plant-profile-review.json')
    if review['reviewed_on']!=DAY:raise ValueError('Review date mismatch')
    for spec in review['sources']:
        spec=dict(spec);path=ROOT/spec['managed_path'];spec.update(sha256=digest(path),filename=path.name)
        if spec['kind']=='pdf':spec['pdf_pages']=len(PdfReader(path).pages)
        batch['sources'].append(spec)
    def ref(key,locator=None):
        spec=next(x for x in batch['sources'] if x['key']==key)
        return {'source_id':spec['id'],'page':spec['initial_pdf_page_ranges'][0][0] if spec['kind']=='pdf' else None,'locator':locator or spec['reviewed_locator']}
    for key,profile in review['new_profiles'].items():
        tid=MAPPING[key];identity=names[key]
        if tid in existing:raise ValueError(f'Expected new topic now exists: {tid}; reconcile rather than overwrite it.')
        duplicates=[t['id'] for t in existing.values() if t.get('scientific_name')==identity['scientific']]
        if duplicates:raise ValueError(f'Existing scientific identity: {duplicates}')
        batch['topics'].append({'id':tid,'label':catalogue[key]['label'],'kind':'species','domain':'ecosystem','group_id':'species',
          'description':profile['description'],'spanish_name':identity['spanish'],'english_name':catalogue[key]['label'],
          'scientific_name':identity['scientific'],'name_status':'genus-only' if key=='tamarix' else 'recorded',
          'aliases':list(dict.fromkeys([identity['spanish'],*identity.get('spanish_aliases',[]),identity['scientific'],*profile.get('aliases',[])])),
          'name_note':profile.get('name_note','Names reconciled with the old-app catalogue and the cited botanical identity. Common names vary.'),
          'source_refs':[ref(x) for x in profile['sources']]})
    for raw in review['habitats']:
        topic={k:v for k,v in raw.items() if k!='source_key'};topic['source_refs']=[ref(raw['source_key'])]
        if topic['id'] not in existing:batch['topics'].append(topic)
    for raw in review['relationships']:
        r=dict(raw);key=r.pop('source_key');r['source_refs']=[ref(key)];r.setdefault('basis','source');r.setdefault('traversable',True)
        batch['relationships'].append(r)
    for raw in review['findings']:
        f=dict(raw);keys=f.pop('source_keys');f['source_refs']=[ref(x) for x in keys];f['kind']='finding';batch['findings'].append(f)
    for spec in batch['sources']:
        if spec['kind']=='pdf':
            for start,end in spec['initial_pdf_page_ranges']:
                batch['coverage'] += [{'source_id':spec['id'],'page':page,'status':'inspected','note':spec['reviewed_locator']} for page in range(start,end+1)]
    batch['unresolved']=review['unresolved']
    # The immutable manifests are the source of checksums, never filenames alone.
    provenance={}
    for name,key,prefix in [('high-resolution-manifest.json','plants',''),('whole/manifest.json','plants','whole/'),('designer-illustrations-manifest.json','images','')]:
        for entry in load(source/name)[key]:
            path=prefix+entry.get('asset',entry.get('image',''))
            if digest(source/path)!=entry['sha256']:raise ValueError(f'Original checksum mismatch: {path}')
            provenance[path]={'manifest':name,'sha256':entry['sha256'],'generated_on':'2026-10-29' if 'designer' in name else '2026-10-28'}
    if set(provenance)!={p.relative_to(source).as_posix() for p in source.rglob('*.png')}:raise ValueError('Manifest does not cover exactly the PNG collection')
    staging=ROOT/'media/plants'/('staging-'+uuid.uuid4().hex);staging.mkdir(parents=True)
    created=[]
    try:
        for entry in metadata:
            key=entry['id'];tid=MAPPING[key]
            for role,relative in [('whole','whole/'+key+'.png'),('detail',key+'.png')]:
                target_relative='media/plants/originals/'+relative;staged=staging/'originals'/relative;staged.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source/relative,staged)
                files={'original':{'path':target_relative,'sha256':digest(staged),'width':1254,'height':1254,'mime':'image/png'}}
                with Image.open(staged) as im:
                    im.load()
                    if im.size!=(1254,1254) or im.mode!='RGBA':raise ValueError(f'Unexpected original image: {relative}')
                    for variant,size in [('preview',768)]+([('thumbnail',256)] if role=='whole' else []):
                        path=staging/'derived'/role/(key+'-'+variant+'.webp');path.parent.mkdir(parents=True,exist_ok=True)
                        im.resize((size,size),Image.Resampling.LANCZOS).save(path,'WEBP',quality=86,method=3)
                        files[variant]={'path':'media/plants/'+path.relative_to(staging).as_posix(),'sha256':digest(path),'width':size,'height':size,'mime':'image/webp'}
                history=provenance[relative]
                batch['plant_images'].append({'id':tid+'-'+role,'topic_id':tid,'role':role,'alt':names[key]['scientific']+' — '+('representative mature whole plant' if role=='whole' else 'botanical detail illustration'),
                    'caption':entry['habit'] if role=='whole' else entry['features'],
                    'provenance':{'tool':'image_gen','source_asset':relative,'manifest':'media/plants/provenance/'+history['manifest'],
                                  'generated_on':history['generated_on'],'reviewed_on':history['generated_on'],'copied_on':DAY,'review_note':'Original app review preserved; illustration is not diagnostic evidence or a growth prediction.'},
                    'references':entry['references'],'files':files})
            profile={'identifying_features':entry['features'],'growth_form':entry['habit'],'basis':'Illustration review notes; botanical references are attached to the image records.'}
            topic=next((x for x in batch['topics'] if x['id']==tid),None)
            if topic is None:
                if tid not in existing:raise ValueError(f'Existing mapping unavailable: {tid}')
                topic=dict(existing[tid]);batch['topics'].append(topic)
            topic['plant_profile']=profile
        for f in source.rglob('*'):
            if f.is_file() and f.suffix in {'.json','.md'}:
                dest=staging/'provenance'/f.relative_to(source);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(f,dest)
        for path in staging.rglob('*'):
            if not path.is_file():continue
            dest=ROOT/'media/plants'/path.relative_to(staging);dest.parent.mkdir(parents=True,exist_ok=True)
            if dest.exists():
                if digest(dest)!=digest(path):raise ValueError(f'Existing managed file differs: {dest}')
            else:path.replace(dest);created.append(dest)
        # Portability: retain each existing edition's bytes and IDs, replacing only its file location.
        for old_source in snap['sources']:
            if 'managed_path' in old_source:continue
            original=Path(old_source['path'])
            if digest(original)!=old_source['sha256']:raise ValueError(f"Existing source edition mismatch: {old_source['id']}")
            relative='sources/library/'+old_source['filename'];dest=ROOT/relative;dest.parent.mkdir(parents=True,exist_ok=True)
            if dest.exists():
                if digest(dest)!=old_source['sha256']:raise ValueError(f'Existing managed source differs: {dest}')
            else:shutil.copyfile(original,dest);created.append(dest)
            copied={k:v for k,v in old_source.items() if k!='path'}
            copied.update(kind='pdf',managed_path=relative)
            batch['sources'].append(copied)
        store.import_batch(batch,True)
        out=ROOT/'imports/plant-illustrations-and-profiles-2026-11-08.json'
        out.write_text(json.dumps(batch,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
        print(json.dumps({'candidate':str(out),'images':len(batch['plant_images']),'topics':len(batch['topics']),'new_species':len(review['new_profiles']),'base_revision':batch['base_revision']},indent=2))
    except BaseException:
        for path in reversed(created):path.unlink()
        raise
    finally:shutil.rmtree(staging)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--old-root',type=Path,required=True);parser.add_argument('--database',type=Path)
    args=parser.parse_args();prepare(args.old_root,args.database)
