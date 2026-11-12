import { ROOT_GROUPS, type Catalog, type Item } from './types.ts';
import { groupLabel, navigationChildren, navigationContainers, orderFundingNumbers, rootGroup } from './organization.ts';

export type NavigationNode = {
  key: string;
  id: string;
  label: string;
  aliases: string[];
  kind: 'branch' | 'topic';
  members: string[];
  children: NavigationNode[];
  anchor?: string | null;
  shared?: boolean;
};

/** Browsing references share canonical topic IDs; membership never becomes a factual edge. */
export function navigationTree(catalog: Catalog): NavigationNode[] {
  const topics = new Map(catalog.topics.map(t => [t.id, t]));
  const leaf = (topic: Item, parent: string, shared = false): NavigationNode => ({
    key: parent + '::' + topic.id, id: topic.id, label: topic.label,
    aliases: topic.aliases || [], kind: 'topic', members: [topic.id], children: [], shared,
  });
  const branch = (id: string, ancestors = new Set<string>()): NavigationNode => {
    const group = catalog.browse_groups.find(g => g.id === id);
    const community = catalog.communities.find(g => g.id === id);
    const pending = catalog.organization_review?.pending_groups.find(g => g.id === id);
    const anchor = group?.anchor_topic_id;
    const node: NavigationNode = {key: id, id, label: groupLabel(id, catalog), kind: 'branch',
      aliases: anchor ? topics.get(anchor)?.aliases || [] : [], anchor, members: [], children: []};
    if (ancestors.has(id)) return node;
    const path = new Set([...ancestors, id]);
    const children = navigationChildren(id, catalog).map(g => branch(g.id, path));
    const containers = navigationContainers(id, catalog);
    const visibleParents = new Set([id, ...containers.map(g => g.id)]);
    children.push(...catalog.communities.filter(g => visibleParents.has(g.parent_id)).map(g => branch(g.id, path)));
    const represented = new Set([anchor, ...children.flatMap(n => n.members)]);
    const direct = community ? community.plants.map(p => ({topic_id: p.topic_id, role: 'shared'}))
      : pending ? pending.member_ids.map(topic_id => ({topic_id, role: 'primary'}))
      : [group, ...containers].flatMap(g => g?.members || []);
    // Base-category topics without a custom home still belong in their canonical root.
    if (ROOT_GROUPS.includes(id)) for (const topic of catalog.topics) {
      if (rootGroup(topic.id, catalog) === id && !represented.has(topic.id) && !direct.some(m => m.topic_id === topic.id))
        direct.push({topic_id: topic.id, role: 'primary'});
    }
    const anchors = (nodes: NavigationNode[]): string[] => nodes.flatMap(n => [...(n.anchor ? [n.anchor] : []), ...anchors(n.children)]);
    const childAnchors = new Set(anchors(children));
    const unique = new Map(direct.map(m => [m.topic_id, m]));
    const leaves = [...unique.values()].filter(m => m.topic_id !== anchor && !childAnchors.has(m.topic_id) && topics.has(m.topic_id))
      .map(m => leaf(topics.get(m.topic_id)!, id, m.role === 'shared'));
    const entries = [...children, ...leaves];
    node.children = group?.member_layout === 'vertical' ? entries : orderFundingNumbers(
      entries.sort((a, b) => a.label.localeCompare(b.label)), n => n.label,
      n => n.kind === 'topic' ? topics.get(n.id)?.domain === 'funding' : n.members.some(t => topics.get(t)?.domain === 'funding'));
    node.members = [...new Set([...(anchor && topics.has(anchor) ? [anchor] : []), ...direct.map(m => m.topic_id), ...children.flatMap(n => n.members)])].filter(id => topics.has(id));
    return node;
  };
  return [...ROOT_GROUPS, ...catalog.browse_groups.filter(g => g.parent_id.startsWith('domain:') && !ROOT_GROUPS.includes(g.id)).map(g => g.id),
    ...(catalog.organization_review?.pending_groups || []).map(g => g.id)].map(id => branch(id));
}

export function filterNavigation(nodes: NavigationNode[], search: string): NavigationNode[] {
  const query = search.trim().toLocaleLowerCase();
  if (!query) return nodes;
  return nodes.flatMap(node => {
    if ([node.label, ...node.aliases].some(text => text.toLocaleLowerCase().includes(query))) return [node];
    const children = filterNavigation(node.children, search);
    return children.length ? [{...node, children}] : [];
  });
}

export function inclusion(node: NavigationNode, hidden: Set<string>) {
  const included = node.members.filter(id => !hidden.has(id)).length;
  return {included, total: node.members.length, checked: included > 0, mixed: included > 0 && included < node.members.length};
}
