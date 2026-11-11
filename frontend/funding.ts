import type { Catalog, Item, Ref } from './types.ts';

export type ProjectIdea = {id:string;label:string;goals:string;topic_ids:string[];proposed_geography:string;applicant_options:string[];applicant_status:string;land_access:string;partners:string;budget:string;readiness:string;version:number;updated_at:string};
export type FundingReview = {id:string;topic_id:string;version:number;instrument_type:'grant'|'partially-repayable'|'loan'|'procurement'|'non-cash'|'framework';availability:'open'|'upcoming'|'closed'|'draft'|'unknown';availability_note:string;territory:string;applicants:string;activities:string;financial_summary:string;deadlines:{label:string;value:string;timezone:string|null;note:string}[];checked_on:string;verification_state:'confirmed'|'incomplete'|'failed';verification_note:string;attempted_on?:string|null;source_refs:Ref[]};
export type FundingAssessment = {id:string;project_id:string;project_version:number;review_id:string;review_version:number;evidence_fingerprint:string;relevance:'potential'|'conditional'|'needs-review'|'outside-scope';applicant_route:string;reasons:string[];requirements:string[];next_action:string;exclusions:{scope:string;reason:string}[];checked_on:string;source_refs:Ref[]};
export const RELEVANCE = {'potential':'Potential candidate','conditional':'Conditional candidate','needs-review':'Needs review','outside-scope':"Outside this idea’s scope"};
export const AVAILABILITY = {open:'Open at last check',upcoming:'Upcoming',closed:'Verified closed',draft:'Draft',unknown:'Availability unverified'};
export const INSTRUMENT = {grant:'Grant','partially-repayable':'Partially repayable funding',loan:'Loan',procurement:'Procurement','non-cash':'Non-cash assistance',framework:'Framework'};

export function assessmentWarnings(a:FundingAssessment,c:Catalog):string[]{
  const p=c.project_ideas?.find(x=>x.id===a.project_id),r=c.funding_reviews?.find(x=>x.id===a.review_id);
  return [...new Set([...(c.funding_state?.assessments[a.id]||[]),...(!p||p.version!==a.project_version?['Project idea changed; reconsider this assessment.']:[]),...(!r||r.version!==a.review_version?['Funding evidence changed; reconsider this assessment.']:[])])];
}
export function fundingContextIds(ids:string[],c:Catalog){
  const all=new Set(ids),pending=[...ids],topics=new Map(c.topics.map(t=>[t.id,t]));
  while(pending.length)for(const id of topics.get(pending.pop()!)?.funding_context_ids||[])if(!all.has(id)){all.add(id);pending.push(id);}
  return [...all];
}
export function fundingReviews(ids:string[],c:Catalog,includeContext=true){const all=includeContext?fundingContextIds(ids,c):ids;return (c.funding_reviews||[]).filter(r=>all.includes(r.topic_id));}
/** Display only a manually checked payment heading, never infer timing from rates or prose. */
export function paymentTiming(review:FundingReview){return review.financial_summary?.match(/^Payment timing: ([^\r\n]+)\r?\n/)?.[1]||'Payment unverified';}
export function fundingPaymentSummary(ids:string[],c:Catalog,aggregate=false){
  const topics=c.topics.filter(t=>ids.includes(t.id)&&t.domain==='funding');
  if(!topics.length||topics.every(t=>t.funding_role==='reference'))return '';
  if(aggregate||topics.some(t=>t.funding_role==='framework'))return 'View route payment terms';
  const reviews=fundingReviews(ids,c,false),labels=[...new Set(reviews.map(paymentTiming))];
  return labels.length===1?labels[0]:labels.length?'Payment terms differ':'Payment unverified';
}
export function fundingSummary(ids:string[],c:Catalog,project='all',aggregate=false):{relevance:string;availability:string}|null{
  const topics=c.topics.filter(t=>ids.includes(t.id)&&t.domain==='funding');
  if(!topics.length)return null;
  const reviews=fundingReviews(ids,c);
  if(topics.every(t=>t.funding_role==='reference'))return {relevance:aggregate?'Supporting references':'Supporting reference',availability:`${reviews.length} linked review${reviews.length===1?'':'s'} · no standalone application`};
  const framework=aggregate||topics.length===1&&topics[0].funding_role==='framework';
  const scope=fundingContextIds(ids,c),routes=c.topics.filter(t=>scope.includes(t.id)&&t.funding_role==='route');
  if(framework&&topics.every(t=>t.funding_role)){
    const covered=routes.filter(t=>reviews.some(r=>r.topic_id===t.id)),gaps=routes.length-covered.length;
    const ideas=(c.project_ideas||[]).filter(p=>project==='all'||p.id===project);
    const incomplete=covered.filter(t=>reviews.filter(r=>r.topic_id===t.id).some(r=>r.verification_state!=='confirmed'||ideas.some(p=>{const a=c.funding_assessments?.find(a=>a.review_id===r.id&&a.project_id===p.id);return !a||assessmentWarnings(a,c).length>0;}))).length;
    return {relevance:`${covered.length-incomplete} reviewed route${covered.length-incomplete===1?'':'s'}${gaps?' · '+gaps+' unreviewed':''}${incomplete?' · '+incomplete+' incomplete':''}`,availability:routes.length?'View individual dates and conditions':reviews.length?'Framework reviewed · no individual call established':'Framework · individual calls need review'};
  }
  // A route needs its own assessment; a linked framework never lends it a conclusion.
  const ownReviews=framework?reviews:fundingReviews(ids,c,false);
  if(!ownReviews.length)return {relevance:'Project fit unreviewed',availability:'Availability unreviewed'};
  const assessments=(c.funding_assessments||[]).filter(a=>ownReviews.some(r=>r.id===a.review_id)&&(project==='all'||a.project_id===project));
  const current=assessments.filter(a=>!assessmentWarnings(a,c).length);
  const candidates=current.filter(a=>a.relevance==='potential'||a.relevance==='conditional');
  const relevance=candidates.length?`${new Set(candidates.map(a=>a.project_id)).size} idea${new Set(candidates.map(a=>a.project_id)).size===1?'':'s'} · possible route${candidates.length===1?'':'s'}`:assessments.some(a=>assessmentWarnings(a,c).length)?'Assessment needs review':current.length&&current.every(a=>a.relevance==='outside-scope')?'Reviewed route outside scope':!assessments.length?'Project fit unreviewed':'Project fit needs review';
  const warnings=ownReviews.some(r=>(c.funding_state?.reviews[r.id]||[]).length||r.verification_state!=='confirmed');
  const first=ownReviews[0];
  const date=first.deadlines[0];
  const availability=!aggregate&&ownReviews.length===1?`${AVAILABILITY[first.availability]}${warnings?' · check needed':''}${date?' · '+date.value.slice(0,10):''}`:`${ownReviews.length} reviewed call${ownReviews.length===1?'':'s'}/route${ownReviews.length===1?'':'s'} · ${warnings?'checks needed':'view dates'}`;
  return {relevance,availability};
}
export function fundingCardRecord(record:Item,ids:string[],c:Catalog,project='all'):Item{
  const anchor=c.browse_groups?.find(g=>g.id===record.groupKey)?.anchor_topic_id;
  const historical=anchor&&c.topics.find(t=>t.id===anchor&&t.kind==='project'&&t.funding_role==='reference');
  if(historical)ids=[historical.id];
  const summary=fundingSummary(ids,c,project,!!record.displayGroup);
  return summary?{...record,fundingSummary:{...summary,payment:fundingPaymentSummary(ids,c,!!record.displayGroup)}}:record;
}
