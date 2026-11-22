import type { GameMap } from './gamemap';

/** Breitensuche auf dem Tile-Raster (4 Richtungen). Gibt Tile-Kette ohne Start zurück. */
export function findPath(
  map: GameMap, sx: number, sy: number, tx: number, ty: number,
  blocked?: (x: number, y: number) => boolean, maxNodes = 4000,
): [number, number][] | null {
  if (sx === tx && sy === ty) return [];
  const W = map.w;
  const free = (x: number, y: number) => (x === tx && y === ty) || (!map.isSolid(x, y) && !(blocked?.(x, y)));
  const prev = new Int32Array(map.w * map.h).fill(-1);
  const start = sy * W + sx;
  prev[start] = start;
  const queue = [start];
  let head = 0;
  while (head < queue.length && head < maxNodes) {
    const cur = queue[head++];
    const cx = cur % W, cy = (cur / W) | 0;
    if (cx === tx && cy === ty) {
      const out: [number, number][] = [];
      let n = cur;
      while (n !== start) { out.push([n % W, (n / W) | 0]); n = prev[n]; }
      return out.reverse();
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (!map.inBounds(nx, ny)) continue;
      const ni = ny * W + nx;
      if (prev[ni] !== -1 || !free(nx, ny)) continue;
      prev[ni] = cur;
      queue.push(ni);
    }
  }
  return null;
}
