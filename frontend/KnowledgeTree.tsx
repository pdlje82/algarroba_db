import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Catalog } from './types';
import { filterNavigation, inclusion, navigationTree, type NavigationNode } from './navigationTree';

const EXPANSION_KEY = 'kgb:navigation:expanded:v1';
function readExpansion(): string[] {
  try { const value = JSON.parse(localStorage.getItem(EXPANSION_KEY) || '[]'); return Array.isArray(value) ? value.filter(id => typeof id === 'string') : []; } catch { return []; }
}
function InclusionBox({checked, mixed, label, disabled, change}: {checked: boolean; mixed: boolean; label: string; disabled: boolean; change: () => void}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = mixed; }, [mixed]);
  return <input ref={ref} tabIndex={-1} type="checkbox" aria-label={'Include ' + label} checked={checked} disabled={disabled} onClick={e => e.stopPropagation()} onChange={change}/>;
}
export function NavigationTree({catalog, hiddenIds, selectedId, groupId, busy, openGroup, inspect, toggle, reset}: {
  catalog: Catalog; hiddenIds: string[]; selectedId?: string; groupId: string | null; busy: boolean;
  openGroup: (id: string) => void; inspect: (id: string) => void; toggle: (ids: string[], included: boolean) => void; reset: () => void;
}) {
  const [expanded, setExpanded] = useState(readExpansion), [search, setSearch] = useState(''), [focusKey, setFocusKey] = useState('');
  const tree = useRef<HTMLDivElement>(null), hidden = useMemo(() => new Set(hiddenIds), [hiddenIds]);
  const nodes = useMemo(() => navigationTree(catalog), [catalog]);
  const filtered = useMemo(() => filterNavigation(nodes, search), [nodes, search]);
  const searching = !!search.trim();
  const scrollBeforeSearch = useRef({left: 0, top: 0}), wasSearching = useRef(false);
  useEffect(() => {
    const el = tree.current;
    if (!el) return;
    if (!searching && wasSearching.current) el.scrollTo(scrollBeforeSearch.current.left, scrollBeforeSearch.current.top);
    wasSearching.current = searching;
  }, [searching]);
  const changeSearch = (text: string) => {
    if (!searching && text.trim() && tree.current) scrollBeforeSearch.current = {left: tree.current.scrollLeft, top: tree.current.scrollTop};
    setSearch(text);
  };
  useEffect(() => { try {localStorage.setItem(EXPANSION_KEY, JSON.stringify(expanded));} catch {} }, [expanded]);
  // Following a graph folder reveals its path; manually collapsing remains a separate operation.
  useEffect(() => {
    if (!groupId) return;
    const path: string[] = []; let at: string | undefined = groupId; const seen = new Set<string>();
    while (at && !seen.has(at)) {seen.add(at); path.push(at); at = catalog.browse_groups.find(g => g.id === at)?.parent_id || catalog.communities.find(g => g.id === at)?.parent_id;}
    setExpanded(prev => [...new Set([...prev, ...path])]);
  }, [groupId, catalog]);
  const rows: {node: NavigationNode; depth: number; parent?: string}[] = [];
  const flatten = (items: NavigationNode[], depth = 0, parent?: string) => items.forEach(node => {
    rows.push({node, depth, parent});
    if (searching || expanded.includes(node.key)) flatten(node.children, depth + 1, node.key);
  });
  flatten(filtered);
  const focus = (key?: string) => { if (!key) return; setFocusKey(key); tree.current?.querySelector<HTMLElement>(`[data-tree-key="${CSS.escape(key)}"]`)?.focus(); };
  const expand = (key: string, value: boolean) => setExpanded(prev => value ? [...new Set([...prev, key])] : prev.filter(id => id !== key));
  const effectiveFocus = rows.some(r => r.node.key === focusKey) ? focusKey : rows[0]?.node.key;
  return <>
    <div className="tree-tools">
      <label className="tree-search"><span>Find in tree</span><input type="search" aria-label="Find in navigation tree" placeholder="Find a topic or group" value={search} onChange={e => changeSearch(e.target.value)}/></label>
      <div className="tree-commands"><button onClick={() => {setSearch(''); setExpanded([]);}}>Collapse all</button><button disabled={busy || !hiddenIds.length} onClick={reset}>Reset visibility</button></div>
      <small>{catalog.topics.length - hiddenIds.filter(id => catalog.topics.some(t => t.id === id)).length}/{catalog.topics.length} included</small>
    </div>
    <div ref={tree} className="navigation-tree" role="tree" aria-label="Knowledge navigation" aria-multiselectable="true">
      {rows.map(({node, depth, parent}, index) => {
        const status = inclusion(node, hidden), isExpanded = searching || expanded.includes(node.key), branch = node.kind === 'branch';
        const selected = branch ? !selectedId && groupId === node.id || !!node.anchor && selectedId === node.anchor : selectedId === node.id;
        const change = () => toggle(node.members, status.mixed || !status.checked);
        return <div key={node.key} role="treeitem" data-tree-key={node.key} data-topic-id={branch ? node.anchor || undefined : node.id}
          aria-label={node.label} aria-level={depth + 1} aria-expanded={branch && node.children.length ? isExpanded : undefined}
          aria-selected={selected} aria-checked={status.mixed ? 'mixed' : status.checked} aria-disabled={busy || !status.total}
          className={'tree-row' + (selected ? ' inspected' : '') + (!status.checked ? ' excluded' : '')}
          style={{paddingLeft: 6 + depth * 12, minWidth: 244 + depth * 12}} tabIndex={node.key === effectiveFocus ? 0 : -1} onFocus={() => setFocusKey(node.key)}
          onKeyDown={e => {
            if (e.target !== e.currentTarget) return;
            if (['ArrowDown','ArrowUp','ArrowRight','ArrowLeft','Home','End',' ','Enter'].includes(e.key)) e.preventDefault();
            if (e.key === 'ArrowDown') focus(rows[index + 1]?.node.key);
            if (e.key === 'ArrowUp') focus(rows[index - 1]?.node.key);
            if (e.key === 'Home') focus(rows[0]?.node.key);
            if (e.key === 'End') focus(rows.at(-1)?.node.key);
            if (e.key === 'ArrowRight' && branch) {if (!isExpanded) expand(node.key, true); else if (node.children.length) focus(node.children[0].key);}
            if (e.key === 'ArrowLeft') {if (branch && isExpanded && !searching) expand(node.key, false); else focus(parent);}
            if (e.key === ' ' && !busy) change();
            if (e.key === 'Enter' && !busy) branch ? openGroup(node.id) : inspect(node.id);
          }}>
          {branch && node.children.length ? <button className="tree-chevron" tabIndex={-1} aria-label={(isExpanded ? 'Collapse ' : 'Expand ') + node.label} disabled={searching} onClick={() => expand(node.key, !isExpanded)}>{isExpanded ? '⌄' : '›'}</button> : <span className="tree-chevron"/>}
          <InclusionBox checked={status.checked} mixed={status.mixed} label={node.label} disabled={busy || !status.total} change={change}/>
          <button className="tree-label" tabIndex={-1} title={node.label + (node.shared ? ' · Shared topic' : '')} data-group-id={branch ? node.id : undefined} disabled={busy}
            onClick={() => branch ? openGroup(node.id) : inspect(node.id)}>{node.label}</button>
          {node.shared && <span className="tree-shared" title="Shared topic" aria-label="Shared topic">↗</span>}
          {branch && <small className="tree-count" title={`${status.included}/${status.total} included`}>{status.included}/{status.total} included</small>}
        </div>;
      })}
      {!rows.length && <p className="tree-empty">No matching topics or groups.</p>}
    </div>
  </>;
}
