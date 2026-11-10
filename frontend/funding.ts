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
export function fundingReviews(ids:string[],c:Catalog){return (c.funding_reviews||[]).filter(r=>ids.includes(r.topic_id));}
export function fundingSummary(ids:string[],c:Catalog,project='all',aggregate=false):{relevance:string;availability:string}|null{
  if(!ids.some(id=>c.topics.some(t=>t.id===id&&t.domain==='funding')))return null;
  const reviews=fundingReviews(ids,c);
  if(!reviews.length)return {relevance:'Project fit unreviewed',availability:'Availability unreviewed'};
  const assessments=(c.funding_assessments||[]).filter(a=>reviews.some(r=>r.id===a.review_id)&&(project==='all'||a.project_id===project));
  const current=assessments.filter(a=>!assessmentWarnings(a,c).length);
  const candidates=current.filter(a=>a.relevance==='potential'||a.relevance==='conditional');
  const relevance=candidates.length?`${new Set(candidates.map(a=>a.project_id)).size} idea${new Set(candidates.map(a=>a.project_id)).size===1?'':'s'} · possible route${candidates.length===1?'':'s'}`:assessments.some(a=>assessmentWarnings(a,c).length)?'Assessment needs review':current.length&&current.every(a=>a.relevance==='outside-scope')?'Reviewed route outside scope':!assessments.length?'Project fit unreviewed':'Project fit needs review';
  const warnings=reviews.some(r=>(c.funding_state?.reviews[r.id]||[]).length||r.verification_state!=='confirmed');
  const first=reviews[0];
  const date=first.deadlines[0];
  const availability=!aggregate&&reviews.length===1?`${AVAILABILITY[first.availability]}${warnings?' · check needed':''}${date?' · '+date.value.slice(0,10):''}`:`${reviews.length} reviewed call${reviews.length===1?'':'s'}/route${reviews.length===1?'':'s'} · ${warnings?'checks needed':'view dates'}`;
  return {relevance,availability};
}
export function fundingCardRecord(record:Item,ids:string[],c:Catalog,project='all'):Item{
  const summary=fundingSummary(ids,c,project,!!record.displayGroup);
  return summary?{...record,fundingSummary:summary}:record;
}
