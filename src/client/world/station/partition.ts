import type { PropConfig } from '../../../shared/maps';
import { mesh, textPlane, toon } from '../toon';
import { box, collide, placed, type Kit } from './kit';

/** Interior room walls; the same footprint is used by server navigation. */
export function partition(kit: Kit, p: PropConfig) {
  const width = p.width ?? 3;
  const depth = p.length ?? 0.3;
  const height = p.height ?? 3.4;
  const g = placed(p.x, 0, p.z, p.rotY ?? 0);
  g.add(mesh(box(width, height, depth), toon(p.color ?? '#e8edf3'), 0, height / 2, 0));
  g.add(mesh(box(width, 0.12, depth + 0.04), kit.mats.metal, 0, 0.06, 0));
  if (p.label) {
    for (const side of [-1, 1]) {
      const sign = textPlane(p.label, { size: 48, color: '#ffffff', bg: '#18354b' });
      const natural = sign.geometry.parameters.width;
      sign.scale.setScalar(Math.min(1, (width - 0.25) / natural));
      sign.position.set(0, Math.min(height - 0.35, 2.7), side * (depth / 2 + 0.025));
      sign.rotation.y = side < 0 ? Math.PI : 0;
      g.add(sign);
    }
  }
  kit.group.add(g);
  collide(kit, p.x, p.z, width, depth, p.rotY ?? 0, height);
}

