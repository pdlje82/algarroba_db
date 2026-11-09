"""Prepare the reviewed lifecycle/community intake from the current authoritative snapshot.

No database writes: use backend.cli import --check, isolated QA, then import the new batch.
"""
from pathlib import Path
import argparse
import copy
import hashlib
import json
import sqlite3

ROOT = Path(__file__).resolve().parents[1]
PHASES = ['nursery-irrigation', 'settlement-irrigation', 'maintenance-irrigation', 'support-irrigation']


def prepare(database):
    with sqlite3.connect(Path(database).resolve().as_uri()+'?mode=ro', uri=True) as c:
        revision = int(c.execute("SELECT value FROM meta WHERE key='revision'").fetchone()[0])
        stored = {table: {d['id']: d for row in c.execute('SELECT data FROM '+table) if (d := json.loads(row[0]))}
                  for table in ['topics', 'findings', 'browse_groups', 'sources', 'unresolved']}
    for sid, expected in [('FOREST-002', '75262e343d4d1e2f1d981b08c9e36a73c9a2c5e9130d14af951124d4cc5d84b8'),
                          ('IRR-003', '90e6fa5730d2f3d17cc59c2e0bf3a2949ebaf65494ddbd20ed4f214dfda42ec2')]:
        source = stored['sources'][sid]
        if source['sha256'] != expected or hashlib.sha256((ROOT/source['managed_path']).read_bytes()).hexdigest() != expected:
            raise ValueError('Reviewed edition mismatch: '+sid)
    batch = dict(batch_id='irrigation-lifecycle-carob-context-2026-11-08-v2', base_revision=revision,
                 summary='Reader-facing ordered irrigation lifecycle, per-event units, contextual source evidence and Mediterranean/Almería carob communities.',
                 topics=[], relationships=[], findings=[], coverage=[], unresolved=[], browse_groups=[], irrigation_evidence=[])
    def refs(sid, pages, locator):
        return [dict(source_id=sid, page=p, locator=locator) for p in ([pages] if isinstance(pages,int) else pages)]
    def fref(p, loc): return refs('FOREST-002',p,loc)
    def iref(p, loc): return refs('IRR-003',p,loc)
    def topic(id, label, kind, description, references, **extra):
        t=copy.deepcopy(stored['topics'].get(id, dict(id=id,domain='ecosystem',aliases=[])))
        t.update(label=label,kind=kind,description=description,group_id='irrigation' if extra.get('domain')=='technology' else 'places' if kind=='place' else 'restoration-methods' if kind=='method' else 'habitats',source_refs=references,**extra)
        batch['topics'].append(t);return t
    def finding(id,label,text,ids,references,kind='finding',**extra):
        batch['findings'].append(dict(id=id,label=label,text=text,topic_ids=ids,source_refs=references,kind=kind,**extra))
    def edge(id,a,b,label,text,references,basis='source',**context):
        batch['relationships'].append(dict(id=id,source=a,target=b,label=label,explanation=text,source_refs=references,basis=basis,**({'context':context} if context else {})))
    def evidence(id,stage,field,value,units,wording,context,references,species=None,limitations='',applicability='Documented source context; not a universal plant prescription.'):
        batch['irrigation_evidence'].append(dict(id='irrigation-evidence:'+id,species_id=species,stage=stage,field=field,value=value,units=units,wording=wording,context=context,applicability=applicability,limitations=limitations,source_refs=references))

    outline = '''Read watering evidence before selecting a planting example.

1. Nursery: watering before field planting, adapted to substrate, stock and growth or hardening stage.
2. Settlement: the first watering immediately after planting; it is different from all watering over the establishment years.
3. Summer maintenance: recurring watering during a difficult season, with a stated frequency and applicable period.
4. Support: extra water prompted by weather, soil moisture or plant stress. Support can overlap establishment and maintenance; it is not a final age stage.

Amounts and timing: L/plant/event means litres per plant for one watering application. Frequency says how often or what triggers it; period says when in the year; age context distinguishes nursery age from years since field planting. Unknown does not mean zero. A range is not a single recommended dose.

Read the context: soil, rainfall, species, nursery stock size, planting method and access to water affect the regime. Source recommendations, project choices and finca observations have different meanings. Generic LIFE NIEBLAS examples are not species-specific carob recommendations. Evidence does not automatically set a working community's values.

Compare like quantities: 30 L for 100 plants equals an average 0.3 L/plant/event. Container sizes in litres are not doses. A 20 L Cocoon reservoir fill is additional to settlement water. A seasonal total (Las Labores: 400 L/plant over May–September), annual allocation or tank capacity cannot become a per-event dose without sufficient information. No automatic age-based dose curve or stopping age is established.

Glossary: IND/IFWC means individual fog water collector. AFDS means Autonomous Fluid Discharge System: collected water fills a tank and its level triggers discharge through an irrigation network. The maintenance passage uses “SAD” without expanding it; its correspondence with AFDS is a curated interpretation of the matching operation, not a verified acronym expansion. MR means restoration model: MR1 recovers degraded areas; MR2 is oasificación, or restoration using runoff harvesting. MP means production model: MP1 enriches dehesas, MP2 improves older afforestation, MP3 establishes extensive production and MP4 uses intensive production.

Open a phase for quantities, frequency or trigger, season, age context, source limitations and exact-page evidence. Follow its connections to methods and fincas for the practical examples.'''
    g=copy.deepcopy(stored['browse_groups']['browse:irrigation-lifecycle'])
    g.update(description=outline,member_layout='vertical',members=[dict(topic_id=id,role='primary') for id in PHASES],
             source_refs=iref([90,93,95,97,98,103,104,142,143],'Lifecycle, method operation, first-year context and project regimes')+fref([72,73,74,79,95,96,97,127],'Nursery stages, planting models, establishment and seasonal total'))
    batch['browse_groups'].append(g)
    phase_data = [
        ('Nursery watering','Before field planting, maintain suitable substrate moisture and adapt irrigation to the growing stage, stock, climate and hardening programme. LIFE NIEBLAS documents a project nursery regime; the carob handbook does not prescribe a universal numerical nursery dose.',
         {'Purpose':'Prepare plants before field planting.', 'Amount':'LIFE NIEBLAS: approximately 0.3 L/plant/event as an average calculated from 30 L for 100 plants. Carob handbook: Not specified in this source.', 'Frequency or trigger':'LIFE: twice weekly. Carob: frequent irrigation during growth; more intense, spaced applications during hardening, adapted to weather.', 'Applicable period':'Nursery growth and preconditioning before planting; no universal calendar.', 'Age and stock':'Nursery one-season stock (1+0) and two-season grafted stock (1+1) have different programmes. These ages are not years since field planting.', 'Limitations':'A 1 L or 3 L pot is container capacity, not water dose. Up to 10% leaching describes drainage, not litres per plant. A batch average is not a measured individual dose.'},iref([142,143],'Nursery regime')+fref([72,73,74,79],'Tables 4.4/4.5a/4.5b and nursery irrigation caveat')),
        ('Settlement watering','The first water supplied immediately after field planting helps settle the planted root zone. Keep this single purpose separate from maintenance and support throughout the following establishment years.',
         {'Purpose':'First watering immediately after field planting.', 'Amount':'LIFE: 10–15 L/plant/event; Cocoon also receives a separate 20 L reservoir fill.', 'Frequency or trigger':'At planting. Subsequent watering is classified by its purpose.', 'Applicable period':'The planting date; a universal month is Not specified in this source.', 'Age and stock':'Newly field-planted seedlings, which may already have spent one or more seasons in a nursery.', 'Limitations':'LIFE project choices across methods, not a universal carob dose. Tank filling is a separate quantity. “Establishment watering” may span several years and is broader than settlement.'},iref([142,143],'Settlement and reservoir filling')),
        ('Summer maintenance watering','Recurring watering during summer or another difficult period follows a documented interval or trigger. Read the method, site, season and establishment period together rather than selecting a dose on its own.',
         {'Purpose':'Recurring water during difficult seasonal conditions.', 'Amount':'LIFE traditional/Cocoon: 15 L/plant/event; IND: 10 L/plant/event. “SAD”: approximately 15 L/plant/event. Carob examples have their own doses.', 'Frequency or trigger':'Traditional/Cocoon/IND: monthly. “SAD”: tank filling triggers discharge; the project describes about every three weeks, not a guaranteed interval.', 'Applicable period':'LIFE traditional/Cocoon/IND: July–September inclusive. SAD calendar season: Not specified in this source.', 'Age and stock':'LIFE method passages discuss the first field year. Carob examples include the first two summers; this does not establish a universal stopping age.', 'Limitations':'The first-year water-network estimate (about 40 L/plant, around 12.5 L/event) is a storage-planning estimate, separate from method-specific schedules. Seasonal totals cannot supply a dose by themselves.'},iref([90,93,95,103,104,142,143],'First-year context, storage planning and maintenance regimes')+fref([96,103,123,127],'General summer advice and finca practices')),
        ('Support watering during stress','Additional water may be considered when weather, soil moisture or plant condition indicates stress. It can overlap the establishment and maintenance periods; being listed last does not make it a final lifecycle stage.',
         {'Purpose':'Respond to unusually dry weather, heat or plant stress.', 'Amount':'LIFE: Not specified in this source. MR2: Not specified in this source. El Triguero reports 50 L/plant/event as a site-specific emergency practice.', 'Frequency or trigger':'LIFE: monitor forecasts and plant condition; prolonged lack of rain or widespread yellow/dry symptoms can prompt watering. El Triguero reports monthly emergency watering.', 'Applicable period':'When the stated conditions occur; no universal seasonal calendar.', 'Age and stock':'May overlap the field establishment years and maintenance. No general dose by plant age or automatic stopping age is supplied.', 'Limitations':'Unknown amount is not zero. An observed emergency regime at one finca is not a general prescription for all carob or Almería sites.'},iref([142,143],'Support triggers')+fref([117,132,134],'Emergency practice and MR2 support'))]
    for id,(label,description,aspects,references) in zip(PHASES,phase_data):
        t=copy.deepcopy(stored['topics'][id])
        t.update(label=label,description=description,source_refs=references,aspects=aspects)
        if id=='settlement-irrigation':t['aliases']=[a for a in t['aliases'] if a!='establishment water']
        batch['topics'].append(t)
    finding('life-nursery-water','Nursery batch quantity and its calculated average','LIFE NIEBLAS describes watering the nursery twice a week with around 30 L for 100 plants. Dividing the documented batch quantity by its plant count gives an average 0.3 L/plant/event; the source does not report individually metered doses or identify this as a carob-specific requirement.',[PHASES[0]],iref(143,'Nursery bullet; original 30L for 100 plants; 30 ÷ 100 = 0.3'))
    finding('life-maintenance-water','LIFE summer schedules retain method and season','The project choices are 15 L/plant/event monthly July–September for traditional planting and Cocoon, and 10 L/plant/event on that schedule for IND. The passage labelled SAD describes about 15 L/plant/event every three weeks when the fog-water tank fills. Its timing depends on collection, and the passage does not specify its calendar season.',[PHASES[2],'cocoon','traditional-reforestation','individual-fog-water-collector','sad-life-source'],iref(143,'Maintenance bullets'))
    finding('life-first-year-water','First field year differs from nursery age','Traditional, Cocoon and individual fog collector method descriptions discuss irrigation in the first year after field planting, with amounts adapted to site, species and soil moisture. Nursery age or stock format is a different measure. No universal age for stopping irrigation is given.',[PHASES[1],PHASES[2],PHASES[3],'traditional-reforestation','cocoon','individual-fog-water-collector'],iref([90,93,95],'Amount of water'))
    finding('life-storage-estimate','A first-year storage estimate is not a method dose','The water-network section estimates about 40 L/plant for first-year summer provision, around 12.5 L per irrigation across three important irrigations, and illustrates 120,000 L storage for 3,000 plants. These are approximate storage-planning figures; preserve them separately from the 15/10 L project maintenance regimes and do not force the rounded figures into exact agreement.',[PHASES[2],'pe-pipe-network'],iref([103,104],'Water network, storage sizing and Amount of water'))
    finding('carob-nursery-water','Carob nursery irrigation changes with development','Tables 4.4–4.5b describe humid germination, frequent early watering without leaching, active growth watering with up to 10% leaching, and spaced intense irrigation during preconditioning to moderate water stress. Page 79 says nursery-specific schedules prevent specific general recommendations. No litres-per-plant dose is supplied.',[PHASES[0],'carob','seedling-quality'],fref([72,73,74,79],'Nursery irrigation rows and Otras prácticas culturales'),'recommendation')
    finding('carob-establishment-years','Carob establishment spans years, not a single settlement event','The general planting recommendations describe 3–5 years of establishment and advise 1–5 summer waterings during the first five years, without litres per event or an explicit annual allocation. Preserve that wording without inventing a per-year frequency or a universal dose.',[PHASES[2],PHASES[3],'carob','establishment-water'],fref([95,96],'5.3 recommendations 1 and 7'),'recommendation')
    topic('sad-life-source','SAD (LIFE maintenance wording)','method','The maintenance passage uses SAD for a fog-water tank system that releases about 15 L/plant/event when full, at a reported interval of about three weeks. The acronym is not expanded there. A correspondence with the AFDS mechanism is curated, not a verified expansion.',iref(143,'Maintenance SAD bullet'),domain='technology')
    afds=topic('afds','Autonomous Fluid Discharge System (AFDS)','method','A tank-level-triggered device discharges collected water through an irrigation network without electrical energy. Intervals depend on fog-water supply, tank settings and the network. The source maintenance label SAD is linked by an explicitly curated correspondence.',iref([97,98,99,143,155],'AFDS definition, operation, maintenance and comparator table'),domain='technology')
    afds['aspects']['Trial conditions']='LIFE method description reviewed on PDF 97–99; irrigation depends on fog supply, tank settings and network characteristics.'
    afds['group_id']='irrigation';afds['aliases']=list(dict.fromkeys(afds['aliases']+['Autonomous Fluid Discharge System']))
    edge('life-sad-afds','sad-life-source','afds','operation corresponds to','The SAD maintenance description and the AFDS definition both describe a fog-fed tank whose water level triggers automatic irrigation. The manual does not explicitly expand SAD; this correspondence is interpretive.',iref([98,143],'Compare AFDS operation and SAD maintenance'),'curated')
    edge('life-sad-maintenance','sad-life-source',PHASES[2],'reported maintenance regime','About 15 L/plant/event at the described tank-full trigger and approximately three-week interval; preserve source spelling SAD.',iref(143,'Maintenance SAD bullet'))
    edge('life-afds-fog','afds','fog-water-collection','can use collected water','The source describes irregular fog-water input filling the discharge tank.',iref([97,98],'AFDS operation'))
    edge('life-afds-network','afds','pe-pipe-network','discharges through','Tank level initiates discharge through the irrigation network; changing settings changes the quantity/interval.',iref(98,'System operation'))
    finding('life-afds-operation','AFDS uses a tank level, not a guaranteed calendar','AFDS discharges automatically once the tank reaches a level and resets after emptying. Cycle time depends on collection, tank settings and network characteristics. Internal installation is compact but less accessible; external installation permits level adjustment and easier maintenance, with more exposure and blockage risk.', ['afds','fog-water-collection','pe-pipe-network'],iref([97,98,99],'Definition, operation and inside/outside installation options'))
    finding('life-irrigation-measurement','Measure water and plant counts by purpose','The manual separates nursery, settlement, maintenance, support, waste and other water. Hose watering can be measured from before/after quantities and plant counts; AFDS monitoring records discharge count, frequency and volume. Total water use and water per surviving tree are different metrics from an event dose.',PHASES+['monitoring','afds'],iref(152,'2. Irrigation water monitoring'))
    # General project references never auto-fill a species-specific working plan.
    for id,stage,amount,wording,ctx in [
        ('life-nursery-average','nursery',0.3,'Calculated average 0.3 L/plant/event; original: around 30 L for 100 plants.','LIFE nursery; twice weekly; no universal calendar or species-specific identification.'),
        ('life-settlement-range','settlement','10–15','10–15 L/plant/event immediately after field planting.','LIFE traditional, IND, AFDS and Cocoon settlement; Cocoon reservoir fill is separate.'),
        ('life-maintenance-traditional-cocoon','summer-maintenance',15,'15 L/plant/event, once monthly July–September.','LIFE traditional and Cocoon project choices; method descriptions discuss first field year.'),
        ('life-maintenance-ind','summer-maintenance',10,'10 L/plant/event, once monthly July–September.','LIFE IND/IFWC project choice; first-year method context.'),
        ('life-maintenance-sad','summer-maintenance',15,'About 15 L/plant/event; source label SAD.','LIFE SAD: when tank fills, about every three weeks; calendar season not specified.')]:
        evidence(id,stage,'amount',amount,'L/plant/event',wording,ctx,iref(143,'Project irrigation choices'),limitations='Project reference, not species-specific guidance. Nursery value is an arithmetic average; ranges remain ranges.')
    for stage,freq,period in [('nursery','Twice weekly','Before field planting; calendar season not specified'),('settlement','Once, immediately after field planting','At planting'),('summer-maintenance','Monthly for traditional/Cocoon/IND; SAD uses a tank-full trigger with an approximately three-week interval','July–September for traditional/Cocoon/IND; SAD season not specified'),('support','Consider forecasts, soil moisture and plant drought symptoms','When stress conditions occur')]:
        evidence('life-'+stage+'-frequency',stage,'frequency',freq,'',freq,'LIFE project regime; method distinctions must be retained.',iref([142,143],'Irrigation purposes and choices'))
        evidence('life-'+stage+'-period',stage,'period',period,'',period,'LIFE project regime; no universal calendar inferred.',iref([142,143],'Irrigation purposes and choices'))
    evidence('life-support-unquantified','support','amount',None,'L/plant/event','Support watering quantity: Not specified in this source.','Monitor weather and plants; no fixed dose or age-based schedule.',iref(143,'Support irrigation'))

    general=topic('carob-community','Mediterranean carob associations','habitat','General overview of Mediterranean vegetation associated with carob in section 1.2, page 18. The named companions are not one formal botanical association, a worldwide recipe or proof that every species occurs together. Read the Almería examples for local observations.',fref(18,'1.2 distribution and companion vegetation'),place_ids=['mediterranean'])
    general['aliases']=list(dict.fromkeys(general['aliases']+['Carob plant communities','Comunidades mediterráneas con algarrobo']))
    topic('carob-community-almeria','Carob communities in Almería','habitat','Regional examples of carob-associated vegetation in arid and semiarid Almería. Mastic and wild olive are observed at La Alcantarilla and La Tórtola; wider MR2 companions and potential habitats have different evidence. Las Labores is a managed restoration planting replacing almond and olive. These are explanatory regional groupings, not a single formal association.',fref([126,131,134,135,136,137],'Almería settings and finca observations'),aliases=['Comunidades con algarrobo en Almería','Almeria carob communities'],place_ids=['almeria'])
    edge('carob-almeria-mediterranean','carob-community-almeria','carob-community','regional examples within','Organizational interpretation of regional cases within the broader Mediterranean overview; not a formal phytosociological classification.',fref([18,131,134,136],'General overview and regional cases'),'curated')
    edge('carob-almeria-place','carob-community-almeria','almeria','examples described in','All three named Almería fincas retain their own municipality and case context.',fref([126,134,136],'Finca characterizations'))
    edge('carob-almeria-carob','carob','carob-community-almeria','occurs in regional examples','Carob is the focal species in the documented Almería examples.',fref([126,134,136],'Almería cases'))
    for plant in ['wild-olive','mastic']:
        edge('carob-almeria-observed-'+plant,'carob-community-almeria',plant,'observed companion','The finca accounts describe establishment of lentisco and acebuche with carob at La Alcantarilla and La Tórtola; do not inherit the entire general Mediterranean companion list.',fref([135,136,137],'Observed accompanying vegetation'))
    for plant in ['dwarf-palm','aleppo-pine']:
        edge('carob-almeria-regional-'+plant,'carob-community-almeria',plant,'named in regional setting','Named in the general arid/semiarid MR2 setting, not confirmed by this passage at every finca.',fref(131,'Área potencial de implantación'),scope='regional model setting')
    topic('cornical-scrub','Cornical scrub','habitat','Cornicales are named among the arid settings in the MR2 discussion. This habitat label alone does not establish a particular species identification or its occurrence at a finca.',fref(131,'Arid phytoclimatic settings'),aliases=['cornicales'])
    for habitat in ['mastic-scrub','wild-olive-scrub','kermes-oak-scrub','jujube-thorn-scrub','cornical-scrub']:
        edge('carob-almeria-setting-'+habitat,'carob-community-almeria',habitat,'vegetation setting named','The regional passage distinguishes arid jujube thorn scrub/cornicales and less arid mastic, kermes-oak and wild-olive scrub. Potential vegetation is not a census of current finca vegetation.',fref(131,'Área potencial de implantación'))
    topic('carob-restoration-mr1','Carob restoration of degraded areas (MR1)','method','MR1 uses carob with other forest species for soil protection and restoration of degraded Mediterranean areas. Restoration layouts, genetic diversity and microsite selection differ from production-oriented plantings.',fref([123,124,125,126],'5.6.1 MR1 and Table 5.14'))
    topic('carob-diversification-mr3','Carob landscape diversification (MR3)','method','The introductory passage describes diversification of low-productivity agricultural landscapes, particularly olive and almond areas, where carob can occur with other forest species and xerophytic shrubs. Only the opening on page 137 is covered here.',fref(137,'5.6.3 opening paragraph'))
    edge('carob-mr1-restoration','carob-restoration-mr1','restoration','restoration model','MR1 aims to protect soil, reduce erosion and diversify degraded forest ecosystems.',fref([123,124],'MR1 objectives'))
    edge('carob-mr3-restoration','carob-diversification-mr3','restoration','diversifies agricultural landscapes','MR3 opening describes agricultural landscape diversification; later MR3 pages remain outside this intake.',fref(137,'MR3 opening'))
    for model,page in [('carob-restoration-mr1',123),('carob-oasification',131)]:
        edge('carob-almeria-'+model,'carob-community-almeria',model,'examples use restoration model','Las Labores illustrates MR1; La Alcantarilla and La Tórtola appear as MR2 examples. Model membership is not proof of identical practices at every site.',fref([page,126 if page==123 else 134],'Models and Almería cases'))
    def place(id,label,description,page,parent=None):
        if id not in stored['topics']:
            topic(id,label,'place',description,fref(page,'Finca location'),**({'place_ids':[parent]} if parent else {}))
        if parent:edge('place-'+id+'-'+parent,id,parent,'located in',description,fref(page,'Finca location'))
    place('albox','Albox','Municipality of Las Labores, in Almería.',126,'almeria')
    place('nijar','Níjar','Municipality of La Tórtola, in Almería.',136,'almeria')
    place('las-labores','Las Labores','Restoration demonstration finca in Albox, Almería.',126,'albox')
    place('la-tortola','La Tórtola','Naturalized carob population in Níjar, Almería.',136,'nijar')
    for site,p in [('las-labores',126),('la-alcantarilla',134),('la-tortola',136)]:
        edge('carob-almeria-case-'+site,'carob-community-almeria',site,'documented example','This finca has its own land-use history, vegetation and management context.',fref(p,'Finca case'))
    edge('mr1-labores','carob-restoration-mr1','las-labores','demonstrated at','The manual identifies Las Labores as its MR1 demonstration.',fref(126,'Parcela demostrativa MR1'))
    edge('mr2-tortola','carob-oasification','la-tortola','demonstrated at','The manual labels La Tórtola as an MR2 example, while describing a naturalized population without cultural treatments.',fref([136,137],'La Tórtola account'))
    for site,p in [('la-alcantarilla',135),('la-tortola',137)]:
        for plant in ['mastic','wild-olive']:
            edge(site+'-observed-'+plant,site,plant,'observed with carob','The case describes lentisco and acebuche establishing in the carob population; this is an observation, not proof of quantified pairwise benefit.',fref(p,'Actuaciones and Estado actual'))
    for site,habitats,p in [('las-labores',['mastic-scrub'],126),('la-tortola',['mastic-scrub','jujube-thorn-scrub'],136)]:
        for h in habitats:edge(site+'-potential-'+h,site,h,'potential vegetation named','Potential vegetation from the environmental characterization, distinct from observed vegetation.',fref(p,'Caracterización ambiental'))
    edge('tortola-current-esparto','la-tortola','esparto-grassland','surrounding landscape dominated by','The current surrounding landscape is dominated by espartales; do not equate this with a complete list of the carob companions.',fref(136,'Environmental characterization'))
    finding('carob-labores-context','Las Labores: dryland crops and a restoration transition','Las Labores (Albox) has 200–400 mm annual rainfall, Mediterranean IV1 climate, coldest-month minimum 2–4°C, warmest-month maximum 32–36°C, annual mean 17–19°C, evapotranspiration 900–1000 mm/year, shallow calcareous soils and rocky outcrops. The landscape is dominated by dryland woody crops. Carob was planted in 2010 at 6 × 6 m in areas of dead almond trees, as almond and olive productivity declined.', ['las-labores','albox','almeria','carob-restoration-mr1','almond','olive','soil-depth'],fref([126,127],'Environmental characterization, Table 5.15 and Actuaciones'),place_ids=['las-labores','albox','almeria'])
    finding('carob-labores-establishment','Las Labores: planting, protection and grafting','The case uses nursery plants about 1 m high, manual 40 × 40 × 40 cm holes, perforated 60 cm shelters, tutors, formative pruning and tractor cultivation every three years. It reports grafting local hermaphrodite cultivars in autumn 2024. These are case practices, distinct from the MR1 summary table.', ['las-labores','carob','manual-planting','planting-holes','tree-shelters','grafting','carob-cultivars'],fref(127,'Actuaciones bullets'))
    finding('carob-labores-water','Las Labores: 400 litres is a seasonal total','Deficit drip irrigation is reported from May to September, with a total of 400 L/plant over that period. The number of events and dose per event are not specified. The seasonal total must not be imported as 400 L/plant/event.', ['las-labores','carob',PHASES[2]],fref(127,'Riegos bullet'),aspects={'source amount':'400 L/plant over May–September','event dose':'Not specified in this source'})
    finding('carob-labores-outcomes','Las Labores: reported establishment and fruit observations','The manual reports low losses, good condition, heights 3–5 m and normal diameters 10–25 cm, with alternate bearing. Table 5.16 (summer 2023) gives pod length 12.40 cm, pod weight 13.56 g, seed yield 16.39% and 100-seed weight 17.73 g. Its claim about production four years after grafting conflicts with the reported autumn-2024 grafting and harvest chronology; retain that unresolved.', ['las-labores','carob','grafting','carob-cultivars'],fref([127,128],'Estado actual and Table 5.16'),dates=[dict(value='2023',meaning='reported harvest')])
    finding('carob-alcantarilla-observed','La Alcantarilla: carob facilitates observed shrub establishment','A seminatural carob population around houses and a stream has expanded irregularly along paths, irrigation channels and streams. Lentisco and acebuche have established under carob protection. Care is limited mainly to fruit collection. Alternate bearing is moderate, but crops are small or absent in most years. This is not a quantified planting trial.', ['la-alcantarilla','carob-community-almeria','carob','mastic','wild-olive','seasonal-watercourse'],fref([135,136],'Actuaciones and Estado actual'))
    finding('carob-alcantarilla-fruit','La Alcantarilla: fruit table and climatic context','Table 5.20 gives rainfall 200–300 mm/year, minimum temperature of the coldest month >6°C, maximum of warmest month 28–32°C, mean annual temperature 17–19°C and evapotranspiration 900–1000 mm/year. Table 5.21 (summers 2022/2023) gives pod length 14.2 cm, pod weight 8.66 g, seed yield 16.39% and 100-seed weight 13.90 g; sample size is not supplied.', ['la-alcantarilla','carob','carob-cultivars'],fref([135,136],'Tables 5.20 and 5.21'),dates=[dict(value='2022',meaning='reported harvest'),dict(value='2023',meaning='reported harvest')])
    finding('carob-tortola-context','La Tórtola: potential scrub differs from the present landscape','La Tórtola (Níjar) has Mediterranean IV3 climate, rainfall 200–300 mm/year and potential lentiscares/jujube thorn scrub, while espartales dominate the current surrounding landscape. Table 5.22 gives coldest-month minimum >6°C, warmest-month maximum 28–32°C, annual mean 17–19°C and evapotranspiration 900–1000 mm/year.', ['la-tortola','nijar','almeria','mastic-scrub','jujube-thorn-scrub','esparto-grassland'],fref([136,137],'Environmental characterization and Table 5.22'),place_ids=['la-tortola','nijar','almeria'])
    finding('carob-tortola-observed','La Tórtola: naturalized vegetation and very low production','Abandonment of earlier agricultural and livestock activity allowed lentisco and acebuche to establish with carob, creating more luxuriant vegetation than surrounding areas. The population is described as fully naturalized without cultural treatments. Trees range from about 1 to 10 m, with variable diameters, very high alternate bearing and practically no production. Irrigation quantity/frequency is not specified; do not turn absence of a stated regime into zero.', ['la-tortola','carob','carob-community-almeria','mastic','wild-olive',PHASES[2],PHASES[3]],fref(137,'Actuaciones and Estado actual'))
    finding('carob-mr1-guidance','MR1 restoration guidance retains its own assumptions','MR1 recommends diverse, appropriate-provenance forest material, favourable deeper/moister microsites, autumn planting and low-density restoration layouts. Page 123 describes <350 trees/ha, page 124 gives <100 in generic protective restoration, and Table 5.14 describes enrichment <200. The table says no irrigation; this summary does not negate watering documented at Las Labores.', ['carob-restoration-mr1','carob','local-provenance','soil-depth','autumn-planting',PHASES[2]],fref([123,124,125,126],'MR1 narrative and Table 5.14'),'recommendation')
    finding('carob-mr1-survival','MR1 reports variable survival in earlier restoration','The narrative reports survival ranges of 18–30% at Guadiamar, 0–65% in Córdoba and 40–60% in Almería, citing earlier work. These heterogeneous reports are not a prediction for a new site. It recommends using experience from earlier afforestation to identify better microsites.', ['carob-restoration-mr1','carob','almeria','species-site-fit'],fref(124,'Restoration potential and earlier survival reports'))
    evidence('labores-season-total','summer-maintenance','amount',400,'L/plant/May–September total','Las Labores reports 400 L/plant in total from May to September.','Albox, Almería; deficit drip irrigation; event count and individual dose unspecified.',fref(127,'Riegos'),species='carob',limitations='Seasonal total, incompatible with L/plant/event. Do not divide without a documented event count.')
    evidence('labores-period','summer-maintenance','period','May–September','','May–September at Las Labores.','Albox, Almería; case practice, plant-age dependence not specified.',fref(127,'Riegos'),species='carob')
    evidence('mr2-support-unquantified','support','amount',None,'L/plant/event','MR2 mentions support watering without a numerical dose.','Arid/semiarid oasificación; water harvesting, microsite selection and care are part of the setting.',fref([132,134],'Establishment care and Table 5.19'),species='carob')

    # Wider practical examples encountered in the authorized watering passages.
    for province,label,page in [('cadiz','Cádiz',102),('sevilla','Sevilla',117),('cordoba','Córdoba',121)]:place(province,label,'Province named in the finca account.',page)
    for id,label,parent,page in [('prado-del-rey','Prado del Rey','cadiz',102),('carmona','Carmona','sevilla',117),('posadas','Posadas','cordoba',121),('gaucin','Gaucín','malaga',112),('ubrique','Ubrique','cadiz',129)]:place(id,label,'Municipality named in the finca account.',page,parent)
    for id,label,parent,page in [('huerta-los-tamayos','Huerta Los Tamayos','prado-del-rey',102),('el-triguero','El Triguero','carmona',117),('buenavista','Buenavista','posadas',121),('los-lirios','Los Lirios','gaucin',112)]:
        place(id,label,'Carob finca case; irrigation practices retain their production/restoration context.',page,parent)
        edge('carob-case-'+id,'carob',id,'cultivated at','Source-described carob case, not evidence of a universal regime.',fref(page,'Finca account'))
    edge('el-rano-ubrique','el-rano','ubrique','located in','El Rano is in Ubrique, Cádiz, not Almería.',fref(129,'Environmental characterization'))
    cases=[('huerta-los-tamayos',103,'summer-maintenance','50–80','50–80 L/plant/event; three summer waterings during the first two years.','Young 40–50 cm forest nursery stock in dehesa/olive enrichment; 40 cm holes, shelters and hay mulch. The 2000 L tank is equipment capacity, not a plant dose.'),
           ('el-triguero',117,'support',50,'50 L/plant/event, monthly emergency watering.','MP3 extensive planting at Carmona in autumn 2023; 1 m plants, 4 × 8 m spacing, 312 trees/ha, 30 ha, soil depth <50 cm. Calendar months and duration of this emergency regime are not specified.'),
           ('buenavista',123,'summer-maintenance',100,'100 L/plant/event every 15 days during the first two summers.','MP4 intensive phased planting at Posadas, Córdoba; 10 × 6 m, 166 trees/ha; stock and cultivars differ by phase. This is not MR1 or an Almería site.'),
           ('los-lirios',112,'summer-maintenance',50,'50 L/plant/event three times weekly from April to October.','Intensive one-hectare mother-plant plot established in 2023 at Los Lirios; 2 × 4 m, 1250 trees/ha, 1 m stock. The older afforestation on the same finca received no establishment irrigation; preserve both contexts.')]
    for site,page,stage,amount,wording,context in cases:
        phase=PHASES[2 if stage=='summer-maintenance' else 3]
        finding('carob-water-'+site,stored['topics'].get(site,{}).get('label',site.replace('-',' ').title())+': a site-specific watering regime',wording+' '+context,[site,'carob',phase,'establishment-water'],fref(page,'Riegos / case practice'),aspects={'dose':str(amount)+' L/plant/event','source context':context})
        edge('carob-water-phase-'+site,site,phase,'reported watering practice',wording+' '+context,fref(page,'Riegos'))
        evidence(site+'-dose',stage,'amount',amount,'L/plant/event',wording,context,fref(page,'Riegos'),species='carob',limitations='Observed finca practice, not a universal recommendation. A range cannot auto-fill a single value.')
    for site,page,stage,frequency,period in [
        ('huerta-los-tamayos',103,'summer-maintenance','Three summer waterings','First two years after planting; summer'),
        ('el-triguero',117,'support','Monthly emergency watering','Calendar months and duration not specified'),
        ('buenavista',123,'summer-maintenance','Every 15 days','First two summers after planting'),
        ('los-lirios',112,'summer-maintenance','Three times per week','April–October; mother-plant plot established in 2023')]:
        for field,value in [('frequency',frequency),('period',period)]:
            evidence(site+'-'+field,stage,field,value,'',value,'Source-described carob finca practice at '+site+'; retain the linked dose and site context.',fref(page,'Riegos'),species='carob')
    edge('labores-water-phase','las-labores',PHASES[2],'reported seasonal watering','400 L/plant over May–September in total; event dose and frequency not specified.',fref(127,'Riegos'))
    edge('mr2-support-phase','carob-oasification',PHASES[3],'may need support watering','Table 5.19 specifies support watering without a numerical dose.',fref([132,134],'MR2 establishment and support'))
    edge('carob-nursery-phase','carob',PHASES[0],'nursery watering guidance','The handbook describes moisture and hardening programmes, not a universal numerical dose.',fref([72,73,74,79],'Nursery watering'))
    finding('carob-buenavista-context','Buenavista: intensive production differs from restoration','The case in Posadas has rainfall 600–800 mm/year and deeper soils, uses 1 m cubic holes with a 50% cured-cow-manure mixture, and phases planted in autumn 2022/2023. Selected cultivars include Sayalonga, Alexia, P14 and P17, with 10% of the two hermaphrodite cultivars for pollination. Production was not yet measured; the source anticipates 3–4 years. These practices are not recommendations for Almería restoration.', ['buenavista','carob','grafting','carob-pollination','carob-cultivars'],fref([121,122,123],'MP4 case and continuation'))
    finding('carob-mp4-allocation','An annual area allocation is not a per-event dose','Table 5.12 describes establishment/production irrigation below 1500 m³/ha/year for the intensive MP4 model. It is an annual area-based allocation, not L/plant/event; the text does not provide an event count permitting conversion.', ['buenavista','carob',PHASES[2]],fref(121,'Table 5.12'))
    finding('carob-elrano-context','El Rano: historical management and inconsistent rainfall','El Rano (Ubrique, Cádiz) is a longstanding livestock finca with carob, wild olive and family crops. Accessible carobs are grafted and cleared; difficult areas remain seminatural. The narrative gives 800–1200 mm/year rainfall, while Table 5.17 gives 1200–1600. Do not silently choose one or classify it as an Almería case.', ['el-rano','ubrique','cadiz','carob','grafting'],fref(129,'Environmental characterization, management and Table 5.17'))
    for id,text,pages,ids in [
        ('carob-labores-chronology','Las Labores reports autumn-2024 grafting, production four years after grafting and a summer-2023 fruit table. These dates cannot be reconciled from the reviewed account; retain source wording without inventing a corrected date.',[127,128],['las-labores','grafting']),
        ('carob-elrano-rainfall','El Rano narrative gives 800–1200 mm/year, but Table 5.17 gives 1200–1600 mm/year. Preserve both as a source discrepancy.',[129],['el-rano']),
        ('life-sad-acronym','The manual uses SAD once in its maintenance list but defines AFDS elsewhere. Matching mechanism supports a curated correspondence; the expansion of SAD is not explicitly supplied.',[],['sad-life-source','afds'])]:
        batch['unresolved'].append(dict(id=id,text=text,topic_ids=ids,source_refs=fref(pages,'Source inconsistency') if pages else iref([98,143],'AFDS mechanism versus SAD wording')))
    if 'eco-partial-cases' in stored['unresolved']:
        old=copy.deepcopy(stored['unresolved']['eco-partial-cases']);old['text']='Historical limitation: initial coverage included only the El Rano ending and La Alcantarilla introduction. This intake extends El Rano to page 129 and La Alcantarilla through 136, and adds Las Labores and La Tórtola. Their reviewed case passages are now covered; other manual pages remain subject to their recorded coverage.';old['source_refs']=fref([129,130,134,135,136,137],'Extended case coverage');batch['unresolved'].append(old)

    for id in ['browse:plant-communities','browse:habitat-types','browse:places-trials']:
        group=copy.deepcopy(stored['browse_groups'][id])
        if id=='browse:plant-communities':
            group['members']=[dict(m,role='shared') if m['topic_id']=='carob-community' else m for m in group['members']]
            group['members'] += [dict(topic_id='carob-community-almeria',role='shared'),dict(topic_id='cornical-scrub',role='primary')]
        elif id=='browse:habitat-types':group['members'] += [dict(topic_id=i,role='shared') for i in ['carob-community-almeria','cornical-scrub']]
        else:
            known={m['topic_id'] for m in group['members']}
            group['members'] += [dict(topic_id=t['id'],role='primary') for t in batch['topics'] if t['kind']=='place' and t['id'] not in known]
        batch['browse_groups'].append(group)
    batch['browse_groups'].append(dict(id='browse:carob-communities',label='Carob plant communities',parent_id='browse:plant-communities',anchor_topic_id=None,
        members=[dict(topic_id=id,role='primary') for id in ['carob-community','carob-community-almeria']],
        description='Start with the Mediterranean overview, then inspect the Almería examples. Potential vegetation, observed companions and restoration practices retain separate source context.',
        source_refs=fref([18,126,131,134,136],'General and regional context'),
        maintenance_rule='Preserve the two stable carob community identities and contextual evidence; organizational membership is not a factual claim or formal botanical classification.'))
    reviewed={'FOREST-002':sorted(set([18,20,72,73,74,79,95,96,97,102,103,112,117]+list(range(121,138)))),
              'IRR-003':[90,93,95,97,98,99,103,104,142,143,152]}
    for sid,pages in reviewed.items():
        for page in pages:
            batch['coverage'].append(dict(source_id=sid,page=page,status='inspected',note='Reviewed complete page for lifecycle/community intake; preserved passage boundaries, original quantities, method/site and age context, tables/captions and unresolved statements. See batch findings and reviewed text/visual audit.'))
    if len({t['id'] for t in batch['topics']})!=len(batch['topics']):raise ValueError('Duplicate candidate topic')
    return batch


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database',type=Path,default=ROOT/'data/knowledge.sqlite')
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    if args.output.exists():raise ValueError('Use a new output filename; accepted batches are immutable.')
    batch=prepare(args.database)
    args.output.write_text(json.dumps(batch,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:len(v) if isinstance(v,list) else v for k,v in batch.items()},ensure_ascii=False))
