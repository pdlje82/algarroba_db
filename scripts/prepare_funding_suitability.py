"""Prepare the user-authorized initial ideas and eight manually reviewed funding contexts.

Requires the separately inspected official captures in the run directory. Never seeds at startup.
Without --apply, prepare/validate in a temporary copy; --apply publishes checked data.
"""
from pathlib import Path
import argparse,copy,hashlib,json,sys,sqlite3,tempfile
from contextlib import closing

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from backend.store import Store
from backend.funding import ProjectEdit,edit_project

def read(p):return json.loads(Path(p).read_text(encoding='utf-8-sig'))
def write(p,v):Path(p).parent.mkdir(parents=True,exist_ok=True);Path(p).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

IDEAS=[
('restoration','Alhama ecological restoration pilot','Explore a dryland ecological restoration pilot around Alhama, comparing establishment methods, water use and vegetation recovery. Land, applicant, partners and budget are unconfirmed.',['restoration','carob','water-harvesting','cocoon']),
('drone','Drone irrigation system development','Explore a drone-based irrigation or planting-reservoir refill system. Distinguish prototype development and field validation from a later commercial service; no functioning integration or technical maturity is assumed.',['drones','drone-water-delivery','reservoir-refill-interface','drone-refilled-seedling-reservoir']),
('monitoring','Restoration monitoring','Explore vegetation, establishment and soil-moisture monitoring using imagery and field measurements. Compare a research pilot with a possible monitoring service; no applicant or operational capability is confirmed.',['monitoring','drone-imagery','soil-moisture-monitoring']),
('education','Environmental education and demonstration','Explore public environmental education and restoration demonstrations, distinguishing educational research, awareness activities and public technology demonstrations. No organisation or partnership is confirmed.',['rural-awareness','demonstration','rural-studies'])]

def prepare(store,run,apply=False,output=None,_preview=False):
    if not apply:
        with tempfile.TemporaryDirectory(prefix='funding-preview-') as folder:
            target=Path(folder)/'preview.sqlite'
            with closing(sqlite3.connect(store.path.resolve().as_uri()+'?mode=ro',uri=True)) as source,closing(sqlite3.connect(target)) as destination:source.backup(destination)
            return prepare(Store(target,media_root=store.media_root),run,True,output,_preview=True)
    for key,label,goals,ids in IDEAS:
        id='idea:'+key; old=next((p for p in store.records('project_ideas') if p['id']==id),None)
        if old:
            if old['goals']!=goals or any(old[k]!='Unconfirmed' for k in ['applicant_status','land_access','partners','budget','readiness']):raise ValueError('Existing idea was edited; review before reseeding assessments: '+id)
            continue
        edit=ProjectEdit(expected_revision=store.revision(),action='create',id=id,changes=dict(label=label,goals=goals,topic_ids=ids))
        checked=edit_project(store,edit,actor='Codex',dry_run=True)
        edit_project(store,edit,actor='Codex')
    d=store.snapshot();topics={t['id']:t for t in d['topics']};source_ids={s['id'] for s in d['sources']}
    B=dict(batch_id='funding-suitability-20261110-v1',summary='Transparent funding navigation, eight official funding reviews and 32 conditional project assessments; exploratory user ideas remain separate.',base_revision=d['revision'],sources=[],topics=[],browse_groups=[],funding_reviews=[],funding_assessments=[])
    captures={x['key']:x for x in read(run/'captures.json')}
    n=max([int(s.removeprefix('KGB-SRC-')) for s in source_ids if s.startswith('KGB-SRC-')]+[0])+1
    webrefs={}
    sections={
    'leader':('AL20 advertised application window','ADR Alpujarra','CONVOCATORIA PUBLICADA','Tipologías'),
    'forestry':('BINDIFO preliminary access and planned 6881.4 call','Junta de Andalucía','03 de noviembre de 2026','Nodo:'),
    'water':('Water4All current dates and national-rule editions','Water4All partnership','DISCLAIMER - October 23, 2026',' Joint Calls'),
    'horizon':('Horizon BIODIV03 forthcoming restoration technology call','EFSA',' Technical innovation to protect ecosystems','Expected Outcome:'),
    'paeas':('PAEAS 2026 official call window','Fundación Biodiversidad',' Convocatoria para proyectos de Educación','Fundación Biodiversidad\nSede en Madrid'),
    'groundwork':('GroundWork call countries, deadline and farm support','GroundWork consortium','Open call!','Living Labs Requirements'),
    'sudoe':('SUDOE5 original-project requirements and calendar','Interreg Sudoe','Dar una segunda vida','Sesiones de información'),
    'cdti':('CDTI PID company research: year-round partially repayable funding','CDTI',None,None)}
    for key,(title,issuer,start,end) in sections.items():
        c=captures[key];path=run/(key+'.html')
        if key=='cdti':
            path=run/'cdti-web-excerpt.txt'
            if not path.exists():raise ValueError('Supply the reviewed official CDTI web-reader excerpt; direct HTTP was insufficient.')
            excerpt=path.read_text(encoding='utf-8');c['successful_method']='Official web-reader retrieval; direct HTTP body insufficient'
        else:
            if c['state']=='failed':raise ValueError('Official capture failed; preserve earlier evidence and stage this context separately: '+key)
            text=(run/(key+'.txt')).read_text(encoding='utf-8');a=text.find(start);b=text.find(end,a+len(start));
            if min(a,b)<0:raise ValueError('Review excerpt boundaries: '+key)
            excerpt=text[a:b].strip()
        raw=path.read_bytes();sha=hashlib.sha256(raw).hexdigest();existing=next((s for s in d['sources'] if s['sha256']==sha and s.get('url')==c['url']),None)
        if existing:id=existing['id']
        else:
            id=f'KGB-SRC-{n:04d}';n+=1;managed=ROOT/'sources/funding-suitability-20261110'/path.name;managed.parent.mkdir(parents=True,exist_ok=True)
            if managed.exists() and managed.read_bytes()!=raw:raise ValueError('Managed capture collision; use a new edition path')
            if not managed.exists():managed.write_bytes(raw)
            B['sources'].append(dict(id=id,title=title,kind='web',filename=path.name,managed_path=managed.relative_to(ROOT).as_posix(),sha256=sha,url=c['url'],retrieved_on='2026-11-10',issuer=issuer,publication_date=None,excerpt=excerpt))
        webrefs[key]=dict(source_id=id,label=title,locator=title+'; verified 2026-11-10')
        c.update(registered_source_id=id,reviewed_excerpt=excerpt,reviewed=True)
    write(run/'reviewed-captures.json',list(captures.values()))
    cdti_ref=[webrefs['cdti']]
    cdti=dict(id='cdti-company-rd',label='CDTI · Company R&D (PID)',kind='programme',domain='funding',group_id='programmes',aliases=['Proyectos de I+D','CDTI PID'],description='Company research and experimental development instrument described by CDTI as open year-round. It supports creation or significant improvement of products, services or processes. Funding is partially repayable, not a pure grant; published minimum eligible project budget €175,000. A viable company, technical uncertainty, financing and incentive-effect conditions require review before a drone or monitoring idea becomes an application. No applicant or project eligibility is established here.',source_refs=cdti_ref)
    if cdti['id'] not in topics:B['topics'].append(cdti);topics[cdti['id']]=cdti
    root=copy.deepcopy(next(g for g in d['browse_groups'] if g['id']=='browse:funding-structure'));root['navigation']='transparent'
    if not any(m['topic_id']==cdti['id'] for m in root['members']):root['members'].append(dict(topic_id=cdti['id'],role='primary'));root['source_refs']+=cdti_ref
    B['browse_groups'].append(root)
    def refs(topic):
        return [dict(source_id=r['source_id'],**({'page':r['page']} if r.get('page') else {}),label=r.get('label') or r['locator'],locator=r['locator']) for r in topics[topic]['source_refs']]
    def review(key,topic,instrument,availability,note,territory,applicants,activities,finance,deadlines=[],extra=[]):
        x=dict(id='funding-review:'+key,topic_id=topic,version=1,instrument_type=instrument,availability=availability,availability_note=note,territory=territory,applicants=applicants,activities=activities,financial_summary=finance,deadlines=deadlines,checked_on='2026-11-10',verification_state='confirmed',verification_note='This verifies the stated passages; it is not a complete eligibility audit.',source_refs=[webrefs[key],*extra])
        B['funding_reviews'].append(x);return x
    def deadline(label,value,zone=None,note='',kind='deadline'):return dict(label=label,value=value,timezone=zone,note=note,kind=kind)
    reviews={}
    reviews['leader']=review('leader','leader-nongdr-call-2026','grant','open','GDR advertises applications through 31 December 2028. Remaining budget, suspensions and every amendment were not established.','AL20 includes Alhama de Almería; precise site and operation conditions still apply.','Applicant class depends on the selected productive or nonproductive line; no applicant arrangement is confirmed.','Selected local operations include studies 3.1, awareness 3.3 and demonstration 3.4. Do not infer that training 3.2 is selected; its inspected table cell is blank.','Aid rate and caps depend on operation, applicant, eligible costs and budget; programme co-financing percentages are not the applicant grant rate.',[deadline('Advertised application end','2028-12-31',note='Exact time/timezone and remaining budget unverified.')],refs('demonstration')+refs('rural-awareness')+refs('rural-training')+refs('leader-aid-limits'))
    reviews['forestry']=review('forestry','pepac-6881-4','grant','upcoming','3 November announcement expects a call at year-end 2026; BINDIFO is preliminary access before applications.','Andalusia; forest classification, parcel size, ownership/agreement and final call must be checked.','Eligible landholder/applicant classes depend on final applicable rules; none is confirmed for this idea.','Environmental silviculture and nonproductive forest investment, not generic aircraft development or ordinary education.','Announced €40,057,892 is a total allocation across three forest-area lines, not an individual grant.',extra=refs('pepac-6881-4'))
    reviews['cdti']=review('cdti',cdti['id'],'partially-repayable','open','Official instrument page states applications are open all year; no fixed closing date is asserted.','Company R&D context in Spain; this does not establish a particular site’s eligibility.','Companies with a suitable R&D project and financial capacity; individual, nonprofit or municipal status is not interchangeable with this route.','Industrial research or experimental development creating or significantly improving products, processes or services.','Minimum eligible budget €175,000. Partially repayable assistance; company contribution, repayment and incentive-effect conditions require financial review.')
    reviews['water']=review('water','water4all-jtc-2026','grant','open','Mandatory preproposal deadline 10 November 2026 15:00 CET; full stage is for invited entrants. Current submission link changed on 23 October.','Transnational consortium and Spanish national rules; Alhama is only a proposed possible research site.','At least three funded partners in three countries; Spanish AEI research-body and CDTI company routes have different gates.','Sustainable-water-management R&I, including catchment-scale nature-based approaches and technological infrastructure.','Spanish CDTI route: €150,000 minimum financeable budget, grants up to 70%, TRL4–7. AEI rules differ; do not substitute general CDTI PID terms.',[deadline('Mandatory preproposal','2026-11-10T15:00:00+01:00','CET'),deadline('Invited full proposal','2027-04-06T15:00:00+02:00','CEST','Not a fresh entry window; timetable-dependent.')],refs('water4all-spain-aei')+refs('water4all-spain-cdti'))
    reviews['horizon']=review('horizon','horizon-cl6-biodiv03-2027','grant','upcoming','EFSA lists opening 20 April 2027 and deadline 22 September 2027. Exact submission time and full topic conditions remain to review.','European research-call geography and topic conditions require the official topic documents; Alhama eligibility is not certified.','Appropriate research/innovation applicants and consortium; exact topic and financial conditions remain unreviewed.','Technical innovation to protect ecosystems and scale restoration. A project needs the topic’s research contribution, not only restoration keywords.','Topic budget, rate, eligible costs and payment timing require the actual call documents.',[deadline('Planned opening','2027-04-20',kind='opening'),deadline('Listed application deadline','2027-09-22',note='Exact time/timezone unverified.')],refs('horizon-cl6-biodiv03-2027'))
    reviews['paeas']=review('paeas','fb-paeas-dc-call-2026','grant','open','Official page marks the call open with end date 10 November 2026 inclusive; exact electronic closing time/timezone remains unverified.','Spain; a local site alone does not establish educational/research eligibility.','Line A includes eligible Spanish nonprofits and listed public research/university/professional bodies. Line B is restricted to public research bodies/universities.','Evidence-building environmental education / climate-disinformation research; ordinary planting or purchasing a drone is not automatically eligible.','Up to €200,000 and 80% of eligible cost. Payment after justification; possible advance has guarantee conditions and exemptions. Asset purchase exclusions matter.',[deadline('Inclusive application date','2026-11-10',note='Exact time/timezone unverified.')],refs('paeas-line-a')+refs('paeas-costs-cashflow-2026'))
    reviews['groundwork']=review('groundwork','groundwork-call-2026','grant','open','Farm cascade call lists 19 November 2026 at 15:00 CET.','Applicant countries listed: Portugal, Germany, Belgium, Sweden, Serbia. Spain is not listed.','Eligible farmers/farming entities in the listed Living Lab areas, with proof of agricultural activity.','Regenerative livestock grazing trials and related monitoring/training in the defined Living Labs.','Up to €27,000 over three years with milestone-linked support; this is not locally available funding for an Alhama site.',[deadline('Application deadline','2026-11-19T15:00:00+01:00','CET')],refs('groundwork-call-2026'))
    reviews['sudoe']=review('sudoe','sudoe-valorisation-call5-2026','grant','open','Restricted fifth call opened 9 November 2026; eSudoe form from 15 December. Applications before 29 January 2027 noon UTC+1.','SUDOE cooperation area plus the call’s specific entity and original-project conditions.','Route must derive from one of 34 listed original projects, retain original beneficiaries in Spain/France/Portugal and an original-beneficiary lead. New for-profit firms cannot join.','Transfer, replication or adoption of completed original outputs; not unrelated new objectives or unfinished original deliverables.','Up to 75% FEDER, minimum €50,000 budget per FEDER beneficiary, maximum 18 months. No individual award or payment schedule is promised.',[deadline('Main application and annexes','2027-01-29T12:00:00+01:00','Europe/Madrid','Must be submitted before this time.'),deadline('Translations','2027-02-05T12:00:00+01:00','Europe/Madrid')],refs('sudoe-valorisation-call5-2026')+refs('sudoe5-finance'))

    explanations={
    'leader':[
    ('conditional','Nonprofit/public-benefit operation or eligible rural enterprise, depending on the exact line.','A restoration pilot may have a rural-heritage, study or demonstration component; ordinary private planting is not established as eligible.','Define the public benefit and exact selected operation; verify site rights, applicant class, current criteria and available allocation.'),
    ('conditional','Public-benefit demonstrator or qualifying rural business; assess these as separate routes.','The graph links drones to AL20 precision-agriculture innovation, but a novel aircraft does not automatically earn points or qualify. Prototype R&D and commercial service investment need separate review.','Write separate prototype/demonstration and service-business scopes, then check the applicable selected line and innovation evidence.'),
    ('conditional','Eligible studies/demonstration promoter or qualifying monitoring-service business.','Monitoring can contribute to a heritage study or public demonstration; a generic equipment purchase is not itself a qualifying operation.','Define the useful monitoring output and its audience, then map costs and applicant to the specific local line.'),
    ('conditional','Eligible awareness or public-demonstration promoter.','Awareness 3.3 and demonstration 3.4 are selected in the inspected local tables. Training 3.2 has a blank selection cell and must not be treated as an available substitute.','Draft a public awareness/demonstration concept; verify its nonproductive conditions and selected operation before treating training as eligible.')],
    'forestry':[
    ('conditional','Eligible forest landholder or entity with the required site agreement.','The idea could overlap environmental silviculture, but no parcel classification, rights or final application conditions are confirmed.','Establish a candidate parcel and forest classification; review the published call when available.'),
    ('needs-review','Possible delivery partner within an eligible forest operation; a separate R&D route may be needed.','An aircraft prototype is not shown to be an eligible environmental-silviculture operation.','Separate technology development from any eligible forest treatment and inspect the final cost rules.'),
    ('needs-review','Possible monitoring component within an eligible forest operation.','Monitoring may support forestry work, but standalone monitoring-service or equipment eligibility is not verified.','Identify the treatment being monitored and check whether the final rules admit that specific cost.'),
    ('needs-review','Possible ancillary public communication within an eligible forest operation.','Standalone educational work is not established as a forestry-investment route.','Keep education as a separate scope until the final call supports a specific connection.')],
    'cdti':[
    ('needs-review','Company conducting genuine technical R&D, if the restoration idea includes it.','Ordinary planting is not the same as industrial research or experimental development.','Identify a concrete technological uncertainty and R&D work package before considering this instrument.'),
    ('conditional','Spanish company with a technically and financially credible R&D project.','A new water-transfer interface or aircraft/control system could be an R&D candidate; this is a curated possibility, not proof of novelty, feasibility or eligibility.','Define the technical uncertainty, prototype validation, market and financing. Review the €175,000 minimum and apply-before-start conditions.'),
    ('conditional','Company developing a substantially improved monitoring product, process or service.','A technological monitoring innovation could fit company R&D; routine measurements or buying an existing sensor do not establish an R&D project.','Describe the technical advance, comparison and validation plan, then review company financial capacity.'),
    ('needs-review','Company R&D route only if a genuine technical development is separately established.','Workshops and public demonstrations alone do not establish an industrial R&D project.','Separate educational delivery from any independently justified technical R&D.')],
    'water':[
    ('conditional','Eligible research consortium with a suitable Spanish research-body or company partner.','A local restoration pilot might supply a catchment-scale nature-based water-management research contribution, rather than a direct parcel grant.','Define the transferable research question and site evidence; confirm a prepared consortium and the national submission gates.'),
    ('conditional','Eligible Spanish R&D company under CDTI or appropriate research partner under AEI.','Smart infrastructure and nature-based water-management themes may support a technological question. This idea has no confirmed delivery/refill validation; reference prototypes do not establish the proposed system’s performance.','Define the research activity and technical maturity; check national rules and the mandatory first-stage deadline.'),
    ('conditional','Appropriate research-body or company partner, with its permitted topic.','AEI Spanish groups are restricted to topics 2–4; standalone Topic1 monitoring cannot be assumed eligible through AEI. CDTI has different technological gates.','Choose the national route and topic before developing the monitoring work package.'),
    ('needs-review','Possible stakeholder/knowledge-transfer partner within a qualifying water R&I consortium.','Educational outputs may complement research, but a standalone education grant is not established.','Identify a funded research objective that genuinely needs the education activity; confirm partner cost eligibility.')],
    'horizon':[
    ('conditional','Appropriate research/innovation consortium, subject to the actual topic rules.','Restoration innovation is thematically relevant; a local planting project needs a transferable research contribution.','Obtain the full topic documents and define the novel intervention, validation and partners.'),
    ('conditional','Technology-development participant within an eligible research consortium.','Drone-assisted establishment might become a restoration-technology research question; existing citrus spraying does not validate this system.','Specify the prototype, refill/delivery uncertainty and ecological validation, then test fit against full topic conditions.'),
    ('conditional','Monitoring/validation participant within a suitable restoration-innovation project.','Monitoring could evaluate the innovation, but a dedicated monitoring procurement is a different route.','Define measured outcomes and the innovation being evaluated; review full topic and consortium conditions.'),
    ('needs-review','Possible dissemination/adoption partner in a qualifying research project.','Public education alone is not established as the topic’s technical innovation.','Identify a research output requiring adoption/education and verify the partner’s role and costs.')],
    'paeas':[
    ('conditional','Eligible nonprofit or listed public/research organisation under Line A.','The restoration site could host evidence-building environmental education, while planting expenditure remains a separate eligibility question.','Frame an educational research question, participants and evaluation; verify organisation and cost conditions.'),
    ('needs-review','Eligible educational research organisation, if there is a genuine education project.','A drone prototype does not by itself establish environmental-education research; direct asset purchase exclusions matter.','Separate aircraft R&D from any educational evaluation and verify permitted depreciation or service costs.'),
    ('conditional','Eligible environmental-education research applicant under Line A.','Monitoring educational effectiveness may fit; ordinary biophysical monitoring alone is not the same purpose.','Specify the educational intervention and how learning/behaviour effects will be evaluated.'),
    ('conditional','Eligible established nonprofit or listed research/public education body.','This is a relevant education-research lead, but no organisation or near-ready application is confirmed.','Develop the education/research framework and finance plan. The imminent 2026 date is not a practical substitute for preparation; no future round is assumed.')],
    'sudoe':[
    ('conditional','A justified new public/nonprofit participant alongside the required original-project beneficiaries.','A restoration site could adopt an eligible completed output, provided a specific original-project lineage and territorial conditions exist.','Identify a relevant listed original project and mature output; establish an actual qualified partnership before further application work.'),
    ('conditional','Qualified participant in an existing eligible project lineage; no new for-profit beneficiary route.','The call concerns transfer of completed outputs, not developing an unrelated drone prototype. New firms cannot join as beneficiaries.','Check whether a listed project already has the relevant completed technology and a permitted participation role.'),
    ('conditional','Qualified adopter or transfer partner of a completed monitoring output.','Replication of a mature monitoring method could be relevant only through the required original-project lineage.','Identify the eligible original output, adoption site and permitted partner role.'),
    ('conditional','Qualified adoption/training participant supporting transfer of an eligible completed output.','Training and adoption can support valorisation, while an independent new education project would not meet the original-output gate.','Identify a listed project output and the concrete adoption/training contribution, then verify partner eligibility.')]
    }
    for key,r in reviews.items():
        for i,(idea,_,_,_) in enumerate(IDEAS):
            project=next(p for p in d['project_ideas'] if p['id']=='idea:'+idea)
            if key=='groundwork':
                relevance='outside-scope';route='Only farming entities in the listed Living Lab countries; no Spanish applicant/site route is verified.';reason='For this idea’s proposed Alhama/Spain setting, the published country list excludes Spain. This is a scoped geographic exclusion, not a judgement about future projects in other countries.';action='Retain as a reference; reconsider only if geography changes or an official exception is evidenced.';exclusions=[dict(scope='location',reason='Spain/Alhama is outside the published applicant-country list.')]
            else:relevance,route,reason,action=explanations[key][i];exclusions=[]
            requirements=['Applicant status, land access, partners, budget and readiness are unconfirmed.',action]
            B['funding_assessments'].append(dict(id=f'funding-assessment:{idea}-{key}',project_id=project['id'],project_version=project['version'],review_id=r['id'],review_version=r['version'],relevance=relevance,applicant_route=route,reasons=[reason],requirements=requirements,next_action=action,exclusions=exclusions,checked_on='2026-11-10',source_refs=r['source_refs']))
    output=output or run/'candidate.json';write(output,B)
    check=store.import_batch(B,True);write(run/'check.json',check)
    if apply and not _preview:write(run/'apply.json',store.import_batch(B))
    print(json.dumps({'candidate':str(output),'result':check,'applied':apply and not _preview,'preview_only':_preview},ensure_ascii=False))
    return B

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--database',type=Path,required=True);p.add_argument('--run',type=Path,default=ROOT/'research/funding-suitability-20261110');p.add_argument('--apply',action='store_true');p.add_argument('--output',type=Path);a=p.parse_args()
    prepare(Store(a.database),a.run,a.apply,a.output)
