import { DIRS, canEnter } from './Door.js';

// Cheap BFS over the *current* door states. Used only for a non-blocking
// "no path to exit right now" HUD hint (plan.md Risk 5) — it does not
// simulate how crossing further doors along a hypothetical path would
// change other doors.
export function exitIsReachable(level, doorStates, from) {
  const key = (p) => `${p.x},${p.y}`;
  const visited = new Set([key(from)]);
  const queue = [from];

  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur.x === level.exit.x && cur.y === level.exit.y) return true;

    for (const dirKey of Object.keys(DIRS)) {
      const vec = DIRS[dirKey];
      const next = { x: cur.x + vec.dx, y: cur.y + vec.dy };
      const k = key(next);
      if (visited.has(k)) continue;

      const cell = level.cellAt(next.x, next.y);
      if (cell.kind === 'wall') continue;
      if (cell.kind === 'door') {
        const state = doorStates[cell.doorId];
        if (!canEnter(cell.def, state, dirKey)) continue;
      }

      visited.add(k);
      queue.push(next);
    }
  }

  return false;
}
