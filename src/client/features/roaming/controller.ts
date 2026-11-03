import type { Pt } from '../../../shared/nav';
import type { WorkerInfo } from '../../../shared/protocol';

export interface BreakHost {
  away(id: string): boolean;
  roaming(id: string): boolean;
  travelling(id: string): boolean;
  roam(id: string, point: Pt): boolean;
  home(id: string): void;
  cheer(id: string): void;
}
interface Break { phase: 'wait' | 'walk' | 'rest' | 'home'; remaining: number; visit: number; }
export const onBreakEligible = (w: Pick<WorkerInfo, 'kind' | 'status' | 'acked' | 'meeting' | 'lost'>) =>
  w.kind === 'agent' && !w.meeting && !w.lost && (w.status === 'idle' || (w.status === 'done' && w.acked));
const hash = (id: string) => [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
/** Idle-time animation only: this never sends input or changes an agent's work. */
export class Breaks {
  private people = new Map<string, Break>();
  clear() { this.people.clear(); }
  update(dt: number, workers: readonly WorkerInfo[], host: BreakHost, destinations: readonly Pt[]) {
    const present = new Set(workers.map(w => w.id));
    for (const id of this.people.keys()) if (!present.has(id)) this.people.delete(id);
    for (const w of workers) {
      if (!onBreakEligible(w)) { host.home(w.id); this.people.delete(w.id); continue; }
      let b = this.people.get(w.id);
      if (!b) { b = { phase: 'wait', remaining: 20 + hash(w.id) % 20, visit: hash(w.id) % Math.max(1, destinations.length) }; this.people.set(w.id, b); }
      if (b.phase === 'wait') {
        if (host.away(w.id)) continue;
        b.remaining -= dt;
        if (b.remaining <= 0 && destinations.length) {
          const target = destinations[b.visit++ % destinations.length];
          if (host.roam(w.id, target)) { b.phase = 'walk'; b.remaining = 60; }
          else b.remaining = 10;
        }
      } else if (b.phase === 'walk') {
        b.remaining -= dt;
        if (!host.roaming(w.id)) b.phase = 'home';
        else if (!host.travelling(w.id)) { b.phase = 'rest'; b.remaining = 10; host.cheer(w.id); }
        else if (b.remaining <= 0) { host.home(w.id); b.phase = 'home'; }
      } else if (b.phase === 'rest') {
        b.remaining -= dt;
        if (b.remaining <= 0) { host.home(w.id); b.phase = 'home'; }
      } else if (!host.away(w.id)) { b.phase = 'wait'; b.remaining = 35 + hash(w.id) % 25; }
    }
  }
}
