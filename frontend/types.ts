export type Point = { x: number; y: number };
export type Vec3 = Point & { z: number };
export type CameraPose = { position: Vec3; target: Vec3 };
export type Ref = {
  source_id: string;
  page?: number | null;
  locator?: string;
  label?: string;
  source_text?: string;
};
export type PlantImage = {
  id: string;
  topic_id: string;
  role: "whole" | "detail";
  alt: string;
  caption: string;
  provenance: {
    tool: string;
    source_asset: string;
    generated_on?: string;
    reviewed_on?: string;
    [key: string]: unknown;
  };
  references: { label: string; url: string }[];
  variants: Partial<
    Record<
      "original" | "preview" | "thumbnail",
      {
        url: string;
        sha256: string;
        width: number;
        height: number;
        mime: string;
      }
    >
  >;
};
export type Item = {
  id: string;
  label: string;
  kind: string;
  domain: string;
  description?: string;
  aliases?: string[];
  spanish_name?: string | null;
  english_name?: string | null;
  scientific_name?: string | null;
  name_note?: string;
  plant_images?: PlantImage[];
  name_status?: "recorded" | "source-spelling" | "genus-only";
  name_references?: {
    title: string;
    url: string;
    fields: string[];
    accessed: string;
    note?: string;
  }[];
  source_refs?: Ref[];
  [key: string]: any;
};
export type Edge = {
  id: string;
  source: string;
  target: string;
  label: string;
  basis?: string;
  explanation?: string;
  source_refs?: Ref[];
  [key: string]: any;
};
export type Route = {
  id: string;
  endpoint: string;
  nodes: string[];
  edges: string[];
  why: string;
};
export type BrowseGroup = {
  id: string;
  label: string;
  parent_id: string;
  anchor_topic_id: string | null;
  user_created?: boolean;
  members: { topic_id: string; role: "primary" | "shared" }[];
  maintenance_rule: string;
  description?: string;
  source_refs?: Ref[];
  member_layout?: 'grid' | 'vertical';
  presentation?: 'standard' | 'hierarchy';
  catalogue?: boolean;
};
export type Catalog = {
  revision: number;
  topics: Item[];
  relationships: Edge[];
  findings: Item[];
  sources: Item[];
  coverage: any[];
  unresolved: any[];
  browse_groups: BrowseGroup[];
  organization_roots: {id: string; label: string; domain: string}[];
  communities: Community[];
  irrigation_evidence: IrrigationEvidence[];
  plant_images?: PlantImage[];
  root_groups: string[];
  topic_kinds: string[];
  identity_redirects?: Record<string, string>;
  organization_review?: {
    topic_roots: Record<string,string>;
    warnings: {code:string;message:string;topic_ids:string[];group_ids:string[]}[];
    pending_groups: {id:string;label:string;domain:string;member_ids:string[];readonly:true;presentation:'hierarchy'}[];
  };
};
export type PlannedField = {value: number | string | null; origin: "not-set" | "source" | "user-set" | "user-adjusted"; baseline: IrrigationEvidence | null; rationale: string; actor: string; changed_at: string | null};
export type IrrigationEvidence = {id:string;species_id:string|null;stage:string;field:string;value:number|string|null;units:string;wording:string;context:string;applicability:string;limitations:string;source_refs:Ref[]};
export type CommunityPlant = {topic_id:string;count:number|null;notes:string;basis:Ref[];irrigation:Record<string,{status:"configured"|"not-applicable";fields:Record<string,PlannedField>}>};
export type Community = {id:string;label:string;kind:"working"|"source";parent_id:string;description:string;region:string;context:string;basis:Ref[];origin:{id:string;label:string;revision:number;selection:string}|null;plants:CommunityPlant[]};
export type RouteSearch = {
  complete: boolean;
  budget_exhausted: boolean;
  expansions: number;
  depth: number;
};
export type ExploreView = {
  group_member_ids?: string[];
  revision: number;
  scope: Scope;
  group_id: string | null;
  centre: string | null;
  search: string;
  domain: string;
  kinds: string[];
  depth: number;
  nodes: Item[];
  edges: Edge[];
  endpoint_ids: string[];
  routes: Route[];
  matches: Item[];
  passages: any[];
  notices: string[];
  complete: boolean;
  route_search: RouteSearch;
};
export type Scope = "overview" | "group" | "neighbors" | "search";
export type Grouping = "none" | "family" | "type" | "place";
export type State = {
  version: 6;
  scope: Scope;
  groupId: string | null;
  groupMembers?: string[];
  centre: string | null;
  anchor: string | null;
  search: string;
  domain: string;
  kinds: string[];
  grouping: Grouping;
  pendingDomain?: string;
  expandedGroups: string[];
  expandedRoutes: string[];
  alternatives: Route[];
  depth: 6 | 8;
  compare: string[];
  positions: Record<string, Point>;
  layerOffsets?: Record<string, Point>;
  layerRoot?: boolean;
  closedLayers?: string[];
  openedFrom?: { layerKey: string; cardId: string };
  camera?: CameraPose;
  revision: number;
  view?: ExploreView;
};
export const COLORS: Record<string, string> = {
  ecosystem: "#49765b",
  technology: "#3e7d90",
  funding: "#b78132",
  source: "#806f96",
};
export const GROUP_LABELS: Record<string, string> = {
  species: "Species & companions",
  habitats: "Habitats & conditions",
  "restoration-methods": "Restoration methods",
  irrigation: "Establishment water",
  drones: "Drones & components",
  monitoring: "Monitoring",
  programmes: "Funding programmes",
  activities: "Activities",
  requirements: "Requirements",
};
export const ROOT_GROUPS = [
  "ecosystem:species",
  "ecosystem:habitats",
  "ecosystem:restoration-methods",
  "technology:irrigation",
  "technology:drones",
  "technology:monitoring",
  "funding:programmes",
  "funding:activities",
  "funding:requirements",
];
export function landscapeGroup(t: Item) {
  // Compatibility for old catalogues; current catalogues supply canonical roots.
  const bases:Record<string,Record<string,string>>={ecosystem:{species:'species',habitats:'habitats','restoration-methods':'restoration-methods',monitoring:'restoration-methods',requirements:'habitats'},technology:{irrigation:'irrigation',drones:'drones',monitoring:'monitoring'},funding:{programmes:'programmes',activities:'activities',requirements:'requirements'}};
  const base=bases[t.domain]?.[t.group_id];
  return base&&!['place','organization','event'].includes(t.kind)?t.domain+':'+base:'review:'+t.domain;
}
export async function api<T = any>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!response.ok) {
    let detail = "The request failed. Your exploration is preserved.";
    try {
      detail = (await response.json()).detail || detail;
    } catch {}
    throw new Error(
      typeof detail === "string" ? detail : JSON.stringify(detail),
    );
  }
  const value=await response.json();
  if(url==='/api/catalog' && (!Array.isArray(value.organization_roots)||!Array.isArray(value.communities)||!Array.isArray(value.irrigation_evidence)||!ROOT_GROUPS.every(id=>value.organization_roots.some((g:any)=>g.id===id&&typeof g.label==='string'&&g.label.trim())))){
    throw new Error('The backend is incompatible with the community editor. Restart the Knowledge Browser and refresh; your saved data is preserved.');
  }
  return value;
}
