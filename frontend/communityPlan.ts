import type { Catalog, CommunityPlant, IrrigationEvidence, PlannedField } from './types.ts';

export const PHASES = [
  ['nursery', 'Nursery'], ['settlement', 'Settlement'],
  ['summer-maintenance', 'Summer maintenance'], ['support', 'Support'],
] as const;
export type Phase = typeof PHASES[number][0];
export const PARAMETERS = ['amount', 'frequency', 'period'] as const;
export type Parameter = typeof PARAMETERS[number];
export type StageStatus = 'unconfigured' | 'configured' | 'not-applicable';
export type FieldOperation = {stage: Phase; field: Parameter; mode: 'source' | 'clear'; evidence_id?: string; reviewed?: boolean; rationale: string};
export type PlantDraft = {count: string; notes: string; stages: Partial<Record<Phase, StageStatus>>; fields: Record<string, FieldOperation>};
export type PlanSave = (action: string, data: Record<string, unknown>, revision?: number) => Promise<Catalog | null>;
export const parameterLabel: Record<Parameter, string> = {amount: 'Water amount', frequency: 'Frequency or trigger', period: 'Applicable period'};
export const phaseLabel = (phase: Phase) => PHASES.find(([id]) => id === phase)![1];
export const fieldKey = (phase: Phase, field: Parameter) => `${phase}:${field}`;
export const newPlantDraft = (plant: CommunityPlant): PlantDraft => ({count: plant.count === null ? '' : String(plant.count), notes: plant.notes, stages: {}, fields: {}});
export function evidenceProblem(e: IrrigationEvidence, species: string, phase: Phase, field: Parameter): string | null {
  if (e.species_id !== species) return 'General guidance cannot supply a species-specific planning value.';
  if (e.stage !== phase || e.field !== field) return 'This evidence concerns a different phase or parameter.';
  if (field === 'amount') {
    if (typeof e.value !== 'number' || !Number.isFinite(e.value) || e.value < 0 || !['L/plant/event', 'L/plant/watering'].includes(e.units))
      return 'Ranges, reservoir fills, seasonal totals and unquantified amounts remain guidance. Research an event dose.';
  } else if (typeof e.value !== 'string' || !e.value.trim()) return 'No adoptable value is recorded. Research this parameter.';
  return null;
}
export function stageStatus(plant: CommunityPlant, draft: PlantDraft, phase: Phase): StageStatus {
  return draft.stages[phase] || plant.irrigation[phase]?.status || 'unconfigured';
}
export function previewField(plant: CommunityPlant, draft: PlantDraft, phase: Phase, field: Parameter, catalog: Catalog): PlannedField | undefined {
  if (stageStatus(plant, draft, phase) === 'unconfigured') return undefined;
  const saved = plant.irrigation[phase]?.fields[field];
  const operation = draft.fields[fieldKey(phase, field)];
  if (!operation) return saved;
  const baseline = operation.mode === 'source' ? catalog.irrigation_evidence.find(e => e.id === operation.evidence_id) || null : saved?.baseline || null;
  return {value: operation.mode === 'source' ? baseline?.value ?? null : null, baseline, origin: operation.mode === 'source' ? 'source' : 'not-set', rationale: operation.rationale, actor: 'Local user', changed_at: null};
}
export function fieldText(field?: PlannedField, parameter?: Parameter): string {
  return field?.value === null || field?.value === undefined ? 'Not set' : `${field.value}${parameter === 'amount' ? ' L/plant/event' : ''}`;
}
export function plantPlanData(id: string, plant: CommunityPlant, draft: PlantDraft) {
  const changes: Record<string, string | number | null> = {};
  if (draft.count !== (plant.count === null ? '' : String(plant.count))) changes.count = draft.count === '' ? null : Number(draft.count);
  if (draft.notes !== plant.notes) changes.notes = draft.notes;
  return {id, topic_id: plant.topic_id, changes, stages: draft.stages, fields: Object.values(draft.fields)};
}
export function plantDraftDirty(plant: CommunityPlant, draft: PlantDraft) {
  const data = plantPlanData('', plant, draft);
  return !!(Object.keys(data.changes).length || Object.keys(data.stages).length || data.fields.length);
}
export function sourceTitles(e: IrrigationEvidence, catalog: Catalog) {
  return [...new Set(e.source_refs.map(ref => catalog.sources.find(s => s.id === ref.source_id)?.title || ref.source_id))].join(' · ');
}
