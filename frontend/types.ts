export type Point = { x: number; y: number };
export type Vec3 = Point & { z: number };
export type CameraPose = { position: Vec3; target: Vec3 };
export type Ref = {
  source_id: string;
  page: number;
  locator?: string;
  source_text?: string;
};
export type Item = {
  id: string;
  label: string;
  kind: string;
  domain: string;
  description?: string;
  aliases?: string[];
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
  anchor_topic_id: string;
  members: { topic_id: string; role: "primary" | "shared" }[];
  maintenance_rule: string;
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
  root_groups: string[];
  topic_kinds: string[];
  identity_redirects?: Record<string, string>;
};
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
  const g = t.group_id || "other";
  return (
    t.domain +
    ":" +
    (t.domain === "ecosystem"
      ? g === "species"
        ? "species"
        : ["restoration-methods", "monitoring"].includes(g)
          ? "restoration-methods"
          : "habitats"
      : t.domain === "technology"
        ? g === "irrigation"
          ? "irrigation"
          : ["drones", "requirements"].includes(g)
            ? "drones"
            : "monitoring"
        : g === "activities"
          ? "activities"
          : ["requirements", "places"].includes(g)
            ? "requirements"
            : "programmes")
  );
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
  return response.json();
}
