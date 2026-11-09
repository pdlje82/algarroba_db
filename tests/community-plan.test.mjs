import test from 'node:test';
import assert from 'node:assert/strict';
import {evidenceProblem,newPlantDraft,plantDraftDirty,plantPlanData,previewField,fieldKey,fieldText} from '../frontend/communityPlan.ts';
const evidence={id:'irrigation-evidence:test',species_id:'plant',stage:'settlement',field:'amount',value:10,units:'L/plant/event',wording:'Synthetic fixture',context:'Test site',applicability:'Test only',limitations:'',source_refs:[]};
const manual={value:15,origin:'user-set',baseline:null,rationale:'Existing decision',actor:'Local user',changed_at:'2026-11-01'};
const plant={topic_id:'plant',count:null,notes:'Existing notes',basis:[],irrigation:{settlement:{status:'configured',fields:{amount:manual}}}};
const catalog={irrigation_evidence:[evidence]};
test('a draft starts unchanged and source inspection cannot fill its values',()=>{
 const before=structuredClone(plant),draft=newPlantDraft(plant);
 assert.equal(plantDraftDirty(plant,draft),false);assert.equal(previewField(plant,draft,'settlement','amount',catalog).origin,'user-set');
 assert.equal(previewField(plant,draft,'nursery','amount',catalog),undefined);assert.deepEqual(plant,before);
});
test('adopted previews retain legacy values separately and submit evidence IDs instead of doses',()=>{
 const before=structuredClone(plant),draft=newPlantDraft(plant);
 draft.fields[fieldKey('settlement','amount')]={stage:'settlement',field:'amount',mode:'source',evidence_id:evidence.id,reviewed:true,rationale:'Reviewed context'};
 assert.equal(previewField(plant,draft,'settlement','amount',catalog).value,10);
 assert.equal(plant.irrigation.settlement.fields.amount.value,15);
 assert.equal(previewField(plant,draft,'settlement','frequency',catalog),undefined);
 const payload=plantPlanData('community:test',plant,draft);
 assert.equal(payload.fields[0].evidence_id,evidence.id);assert.ok(!('value' in payload.fields[0]));assert.deepEqual(plant,before);
});
test('zero, unknown and cleared values remain distinct without erasing source history',()=>{
 assert.equal(fieldText({...manual,value:0},'amount'),'0 L/plant/event');assert.equal(fieldText({...manual,value:null},'amount'),'Not set');
 const saved=structuredClone(plant);saved.irrigation.settlement.fields.amount={...manual,baseline:evidence};
 const draft=newPlantDraft(saved);draft.count='0';draft.fields['settlement:amount']={stage:'settlement',field:'amount',mode:'clear',rationale:''};
 assert.equal(plantPlanData('c',saved,draft).changes.count,0);assert.equal(previewField(saved,draft,'settlement','amount',catalog).baseline.id,evidence.id);
});
test('source compatibility rejects generic guidance, ranges, totals and mismatched fields',()=>{
 assert.equal(evidenceProblem(evidence,'plant','settlement','amount'),null);
 for(const e of [{...evidence,species_id:null},{...evidence,value:'10–20'},{...evidence,value:null},{...evidence,units:'L/plant/season'},{...evidence,value:true},{...evidence,value:-1},{...evidence,field:'period'}])assert.ok(evidenceProblem(e,'plant','settlement','amount'));
});
