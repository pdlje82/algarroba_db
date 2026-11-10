import { api, type Catalog, type ExploreView, type State } from './types.ts';
import { query } from './exploration.ts';
import { reconcileIdentities } from './migration.ts';

const changed = () => new Error('The knowledge changed while this view was loading. Retry to load its current groups. Your exploration is preserved.');

/** Publish live queries only with the catalog from the same knowledge revision. */
export async function loadExploration(
  state: State,
  catalog: Catalog,
  signal: AbortSignal,
  force = false,
  request: typeof api = api,
) {
  if (state.view && !force) {
    // Older captured views keep their membership; newer views need their catalog.
    if (state.view.revision > catalog.revision) catalog = await request<Catalog>('/api/catalog', { signal });
    if (state.view.revision > catalog.revision) throw changed();
    return { state: reconcileIdentities(state, catalog), view: state.view, catalog };
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    state = reconcileIdentities(state, catalog);
    const view = await request<ExploreView>(query(state), { signal });
    if (view.revision !== catalog.revision) catalog = await request<Catalog>('/api/catalog', { signal });
    if (view.revision === catalog.revision) return { state: reconcileIdentities(state, catalog), view, catalog };
  }
  throw changed();
}
