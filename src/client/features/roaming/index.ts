import type { Ctx } from '../../core/context';
import type { Parts } from '../../core/parts';
import type { Pt } from '../../../shared/nav';
import { store } from '../../state';
import { Breaks } from './controller';

/** Register idle-time strolls on maps that opt in with agents.roam. */
export function installRoaming(ctx: Ctx, parts: Pick<Parts, 'worlds' | 'views'>) {
  const breaks = new Breaks();
  let shown = '';
  let elapsed = 0;
  ctx.ticks.add('others', ({ dt }) => {
    const plan = parts.worlds.plan(), court = parts.worlds.court();
    const key = `${store.floor}:${plan.id}`;
    if (key !== shown) { breaks.clear(); shown = key; elapsed = 0; }
    if (!court || !plan.config?.agents?.roam) return;
    elapsed += dt;
    if (elapsed < 0.25) return;
    const points: Pt[] = [[0, 0], [-11, 0], [11, 0], [-14, 21], [0, -21]];
    const destinations = points.filter(p => ctx.world().nav.walkable(p[0], p[1]));
    const workers = [...store.workers.values()].filter(w => {
      const d = plan.byId.get(w.deskId); return d && !d.station && !d.room;
    });
    breaks.update(Math.min(elapsed, 1), workers, {
      away: id => court.away(id), roaming: id => court.roaming(id), travelling: id => court.travelling(id),
      roam: (id, p) => court.roam(id, p), home: id => court.home(id),
      cheer: id => parts.views.workerViews.get(id)?.model.cheer(1.5),
    }, destinations);
    elapsed = 0;
  });
}
