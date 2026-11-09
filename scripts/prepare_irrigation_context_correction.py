"""Keep lifecycle concepts generic and attach watering evidence to its actual context."""
import argparse
import copy
import json
import sqlite3
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
PHASES=['nursery-irrigation','settlement-irrigation','maintenance-irrigation','support-irrigation']


def prepare(database):
    with sqlite3.connect(Path(database).resolve().as_uri()+'?mode=ro',uri=True) as c:
        revision=int(c.execute("SELECT value FROM meta WHERE key='revision'").fetchone()[0])
        stored={table:{d['id']:d for row in c.execute('SELECT data FROM '+table) if (d:=json.loads(row[0]))}
                for table in ['topics','findings','relationships','browse_groups']}
    batch=dict(batch_id='irrigation-context-separation-2026-11-08-v1',base_revision=revision,
        summary='Plant-neutral lifecycle definitions; carob doses and age/site recommendations on carob communities; LIFE schedules remain with LIFE methods.',
        topics=[],findings=[],relationships=[],browse_groups=[])
    def refs(sid,pages,locator):return [dict(source_id=sid,page=p,locator=locator) for p in pages]
    generic_refs=refs('IRR-003',[142,143],'Irrigation purposes and context-dependent regimes; no universal plant dose')
    phase_data=[
        ('nursery-irrigation','Watering before field planting prepares nursery plants for the next stage. The regime depends on the plant, growing conditions and nursery stage; this phase does not prescribe a dose or frequency.',
         'Water plants while they are in the nursery, before field planting.',
         'Set the interval or moisture trigger for the species, growing medium, stock and conditions. No universal interval is defined.',
         'Before field planting; calendar months depend on the growing programme and location.',
         'Record the nursery or propagation stage. Nursery age is different from time since field planting.'),
        ('settlement-irrigation','The first watering immediately after field planting is a purpose category that can be used for any plant. Subsequent establishment watering belongs to maintenance or support according to its purpose.',
         'The first water application immediately after field planting.',
         'At planting. Classify later applications by their purpose rather than calling the whole establishment period settlement.',
         'At the planting date; no universal calendar month.',
         'Newly field-planted stock can already be of different ages. This phase is defined by the planting event, not a fixed biological age.'),
        ('maintenance-irrigation','Recurring watering during summer or another difficult period follows a chosen interval or trigger. Its dose, season and duration must be selected for the plant, site and method.',
         'Recurring water during a period when the chosen planting needs maintenance irrigation.',
         'Record the chosen interval or trigger separately from the amount. The appropriate interval depends on plant and site conditions.',
         'The locally relevant difficult or dry period; no universal months or season length.',
         'Record time since field planting and the relevant development stage. There is no universal age-based dose or stopping age.'),
        ('support-irrigation','Additional water may be considered in response to unusual weather, soil moisture or plant stress. Support can overlap establishment and maintenance; it is not a final age stage.',
         'Respond to stress or exceptional conditions, rather than follow an assumed standard schedule.',
         'Monitor forecasts, soil moisture and plant condition. Consider support water when the relevant conditions justify it.',
         'When the relevant stress conditions occur; no universal month or recurrence.',
         'Can overlap field establishment and maintenance. Assess the particular plant and site instead of using age alone.')]
    for id,description,purpose,frequency,period,age in phase_data:
        t=copy.deepcopy(stored['topics'][id]);t.update(description=description,source_refs=generic_refs,
            aspects={'Purpose':purpose,'Amount':'No universal dose. Record the selected amount in L/plant/event for the particular plant and site.',
                     'Frequency or trigger':frequency,'Applicable period':period,'Age and stock':age,
                     'Limitations':'This is a plant-neutral phase definition. Species/community recommendations, project schedules and case observations belong to their own context. Unknown is not zero; seasonal totals and reservoir capacities are not event doses.'})
        batch['topics'].append(t)
    guide=copy.deepcopy(stored['browse_groups']['browse:irrigation-lifecycle'])
    guide.update(description='''The irrigation lifecycle describes why water is applied. It is a framework for any plant, not a watering prescription for a particular species.

1. Nursery: watering before field planting.
2. Settlement: the first water application immediately after planting.
3. Summer maintenance: recurring watering during a difficult period.
4. Support: additional watering prompted by weather, soil moisture or plant stress. Support can overlap establishment and maintenance; it is not a final age stage.

Amounts and timing: L/plant/event means litres per plant for one watering application. Record the amount, frequency or trigger, applicable period and age/stock context separately. Nursery age differs from time since field planting. Do not infer an automatic dose or stopping age from either.

Choose a regime in its own context: soil, rainfall, species, plant size, nursery stock, planting method and water availability affect the decision. Source recommendations, project schedules and case observations have different meanings. A phase label does not supply a universal amount or calendar.

Compare like quantities: a dose per event is different from a batch quantity, seasonal total, annual area allocation or reservoir capacity. Convert only when the denominator and event count are known; preserve the original wording and calculation. Unknown is different from zero, and ranges remain ranges.

Read contextual recommendations on the relevant species or community, and project schedules on the corresponding project or method. Those examples retain their source, location, plant age, season and limitations; they do not become rules for every plant using this phase. Existing working-plan values are independent decisions.

Glossary: IND/IFWC means individual fog water collector. AFDS means Autonomous Fluid Discharge System: a tank level triggers discharge through an irrigation network. The source label SAD is not expanded in its passage; its correspondence with AFDS is an explicit interpretation of the matching operation. A reservoir fill is separate from the water applied directly at settlement.

Select a phase for its purpose, unit, timing and monitoring considerations. Follow the context links to plant/community recommendations or project methods for specific regimes.''',source_refs=generic_refs+refs('IRR-003',[98,152],'AFDS operation and water recording by purpose'))
    batch['browse_groups'].append(guide)

    general=copy.deepcopy(stored['topics']['carob-community'])
    general['description']+=' Carob-specific watering guidance and wider finca examples are recorded here by lifecycle phase; the lifecycle definitions themselves remain plant-neutral.'
    general['aspects']={**general.get('aspects',{}),
        'Irrigation applicability':'These recommendations and observations concern carob trees in the cited setting, not every companion species or every Mediterranean site. Finca practices are examples, not universal doses.',
        'Nursery watering — carob':'The handbook describes frequent growth-stage watering and spaced, more intense hardening irrigation, adapted to the nursery. It gives no universal litres-per-plant dose. Nursery programmes for one- and two-season stock are not years since field planting. See the nursery finding and PDF 72–74, 79.',
        'Settlement watering — carob':'The reviewed carob passages do not supply a single numerical first-watering dose. Do not substitute the LIFE NIEBLAS project’s quantities as a carob recommendation.',
        'Maintenance watering — carob guidance':'The handbook describes a 3–5-year establishment period and advises 1–5 summer waterings during the first five years, without specifying an event dose or an explicit annual count (PDF 95–96).',
        'Maintenance watering — finca observations':'Huerta Los Tamayos: 50–80 L/plant/event, three summer waterings during the first two years (PDF 103). Buenavista: 100 L/plant/event every 15 days during the first two summers, in an intensive production planting (PDF 123). Los Lirios: 50 L/plant/event three times weekly, April–October, in an intensive mother-plant plot; its older afforestation received no establishment irrigation (PDF 112). These settings must not be treated as interchangeable.',
        'Support watering — carob example':'El Triguero reports 50 L/plant/event monthly as emergency watering (PDF 117). Calendar months and the duration of that regime are not specified. This is a finca observation, not a general emergency dose.',
        'Quantities and age':'Keep L/plant/event, frequency, period and field-establishment age separate. Annual area allocations are not event doses. The reported age windows do not establish a universal stopping age.',
        'Restoration and production models':'MR1 restores degraded areas; MR2 uses runoff harvesting (oasificación). MP1 enriches dehesas, MP2 improves afforestation, MP3 establishes extensive production and MP4 is intensive production. Their inputs and objectives differ.',
        'Regional example':'See Carob communities in Almería for Las Labores, La Alcantarilla and La Tórtola. Do not transfer the wider finca doses automatically to arid Almería.'}
    general['source_refs']+=refs('FOREST-002',[72,73,74,79,95,96,97,103,112,117,121,123],'Carob nursery/establishment guidance and production/restoration case practices')
    batch['topics'].append(general)
    regional=copy.deepcopy(stored['topics']['carob-community-almeria'])
    regional['description']+=' Carob watering evidence is given here by lifecycle phase, with regional/site-specific limits; no dose is inferred for the accompanying plants.'
    regional['aspects']={**regional.get('aspects',{}),
        'Irrigation applicability':'Carob-specific evidence for the named Almería cases and regional restoration setting. Do not apply these quantities to lentisco, acebuche or other companions without their own evidence.',
        'Nursery watering — regional evidence':'No Almería nursery dose is documented in these case accounts. The wider carob nursery guidance is available on Mediterranean carob associations; it is not a locally measured regime.',
        'Settlement watering — regional evidence':'No numerical immediate post-planting dose is specified for these Almería cases. Nursery plant size and planting-hole dimensions do not determine a water dose.',
        'Maintenance watering — Las Labores':'Deficit drip irrigation from May to September, totalling 400 L/plant over that period (PDF 127). Event count, frequency and L/plant/event dose are not specified. Preserve this as a seasonal total; do not divide by an assumed schedule.',
        'Support watering — MR2':'The arid/semiarid MR2 model mentions small establishment waterings and support watering, with runoff capture and favourable microsites, but supplies no numerical dose (PDF 132, 134).',
        'La Alcantarilla and La Tórtola':'The accounts describe little cultural care/naturalized vegetation, but do not quantify an irrigation regime. Do not interpret unspecified amounts as zero (PDF 135–137).',
        'Age and source limitations':'The regional passages do not establish an age-based watering curve or stopping age. Las Labores’ grafting/production chronology remains unresolved. Its documented watering total does not establish a treatment for every carob in Almería.',
        'Broader guidance':'The Mediterranean carob node holds carob-wide nursery and establishment guidance and the non-Almería finca examples, with their individual conditions.'}
    regional['source_refs']+=refs('FOREST-002',[127,132],'Las Labores seasonal total and MR2 establishment/support care')
    batch['topics'].append(regional)

    moved_carob=[];moved_life=[]
    for id,original in stored['findings'].items():
        if not set(original['topic_ids'])&set(PHASES):continue
        f=copy.deepcopy(original)
        if any(ref['source_id']=='FOREST-002' for ref in f['source_refs']):
            context='carob-community-almeria' if id in {'carob-labores-water','carob-tortola-observed'} else 'carob-community'
            f['topic_ids']=list(dict.fromkeys([i for i in f['topic_ids'] if i not in PHASES]+[context]))
            moved_carob.append(id);batch['findings'].append(f)
        elif id in {'life-settlement-water','life-maintenance-water','life-nursery-water','life-first-year-water','life-storage-estimate','cocoon-water-caution'}:
            f['topic_ids']=list(dict.fromkeys([i for i in f['topic_ids'] if i not in PHASES]+['life-nieblas']))
            moved_life.append(id);batch['findings'].append(f)
    # Keep source identities and regimes; change where their contextual connections point.
    for id in ['carob-water-phase-huerta-los-tamayos','carob-water-phase-el-triguero','carob-water-phase-buenavista','carob-water-phase-los-lirios','labores-water-phase','mr2-support-phase','carob-nursery-phase']:
        e=copy.deepcopy(stored['relationships'][id])
        e['target']='carob-community-almeria' if id in {'labores-water-phase','mr2-support-phase'} else 'carob-community'
        e.update(label='provides carob watering context',basis='curated',explanation=e['explanation']+' This is a contextual discovery link to the carob evidence; it does not establish a common planting recipe or identical dose across a community.')
        batch['relationships'].append(e)
    for id,text in [('traditional-settlement','This method includes an immediate post-planting watering. The documented quantity remains with the LIFE project and method evidence.'),('traditional-maintenance','The LIFE project includes maintenance watering for this method; its particular schedule belongs to that project.'),('life-sad-maintenance','The source classifies tank-triggered watering as maintenance; the particular amount and cycle remain on the SAD/LIFE method evidence.')]:
        e=copy.deepcopy(stored['relationships'][id]);e['explanation']=text;batch['relationships'].append(e)
    for context in ['carob-community','carob-community-almeria']:
        for phase in PHASES:
            batch['relationships'].append(dict(id=context+'-watering-context-'+phase,source=context,target=phase,
                label='watering context by phase',basis='curated',
                explanation='The lifecycle phase is plant-neutral. Read this carob community’s cited guidance and examples for its particular plant, site, season and age context; no dose is assigned to the phase itself.',
                source_refs=refs('FOREST-002',[72,79,95,96] if context=='carob-community' else [127,132,134],'Contextual organization of existing carob watering evidence by the general phase framework')))
    # Keep the project's concrete quantities out of generic phase descriptions and out of carob prescriptions.
    life=copy.deepcopy(stored['topics']['life-nieblas'])
    life['aspects']={**life.get('aspects',{}),
        'Watering evidence scope':'These are LIFE NIEBLAS project choices and method examples, not universal plant requirements or species-specific carob recommendations.',
        'Nursery example':'Around 30 L for 100 plants twice weekly, an average calculated 0.3 L/plant/event (PDF 143).',
        'Settlement example':'10–15 L/plant/event; Cocoon additionally receives a separate 20 L reservoir fill (PDF 143).',
        'Maintenance examples':'Traditional/Cocoon: 15 L/plant/event monthly July–September; IND: 10 L/plant/event on that schedule. SAD: about 15 L/plant/event, tank-full triggered, reported about every three weeks (PDF 143).',
        'Support':'Monitor weather and plant condition; a fixed quantity is not specified (PDF 143).',
        'Storage estimate':'About 40 L/plant for first-year summer provision, around 12.5 L/application, is a separate approximate storage-planning estimate, not a substitute for the method schedules (PDF 103–104).'}
    life['source_refs']+=refs('IRR-003',[103,104,142,143],'Project-specific watering choices and storage estimate')
    batch['topics'].append(life)
    batch['summary']+=f' Reassociated {len(moved_carob)} carob findings and {len(moved_life)} LIFE project findings without changing their source wording or immutable dose evidence.'
    return batch


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--database',type=Path,default=ROOT/'data/knowledge.sqlite');p.add_argument('--output',type=Path,required=True);a=p.parse_args()
    if a.output.exists():raise RuntimeError('Use a new filename; never overwrite an accepted batch.')
    value=prepare(a.database);a.output.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:len(v) if isinstance(v,list) else v for k,v in value.items()},ensure_ascii=False))
