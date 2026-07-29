import { satisfiesSymmetry } from './Symmetry.js';

export function isEdgeBlocked(grid, puzzle, a, b) {
  const key = grid.edgeKey(a, b);
  return (puzzle.blockedEdges || []).some((edge) => grid.edgeKey(edge[0], edge[1]) === key);
}

export function pathEdgeSet(grid, path) {
  const set = new Set();
  for (let i = 1; i < path.length; i++) {
    set.add(grid.edgeKey(path[i - 1], path[i]));
  }
  return set;
}

export function isValidPath(grid, puzzle, path) {
  if (path.length < 2) return false;
  const [sc, sr] = puzzle.start;
  if (path[0][0] !== sc || path[0][1] !== sr) return false;

  const seen = new Set([grid.nodeKey(path[0])]);
  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1];
    const curr = path[i];
    if (!grid.isAdjacent(prev, curr)) return false;
    if (isEdgeBlocked(grid, puzzle, prev, curr)) return false;
    const key = grid.nodeKey(curr);
    if (seen.has(key)) return false;
    seen.add(key);
  }
  return true;
}

export function reachesExit(puzzle, path) {
  const [lc, lr] = path[path.length - 1];
  return (puzzle.exits || []).some(([ec, er]) => ec === lc && er === lr);
}

export function passesAllDots(grid, puzzle, path) {
  const dots = puzzle.dots || [];
  if (dots.length === 0) return true;
  const visited = new Set(path.map((n) => grid.nodeKey(n)));
  return dots.every((dot) => visited.has(grid.nodeKey(dot)));
}

export function includesRequiredEdges(grid, puzzle, path) {
  const required = puzzle.requiredEdges || [];
  if (required.length === 0) return true;
  const traveled = pathEdgeSet(grid, path);
  return required.every((edge) => traveled.has(grid.edgeKey(edge[0], edge[1])));
}

export function satisfiesTriangles(grid, puzzle, path) {
  const triangles = puzzle.triangles || [];
  if (triangles.length === 0) return true;
  const traveled = pathEdgeSet(grid, path);
  return triangles.every(([col, row, count]) => {
    const touching = grid.cellEdges(col, row).filter(([a, b]) => traveled.has(grid.edgeKey(a, b)));
    return touching.length === count;
  });
}

export function satisfiesRegions(grid, puzzle, path) {
  const cellColors = puzzle.cellColors || [];
  if (cellColors.length === 0) return true;
  const traveled = pathEdgeSet(grid, path);
  const colorByCell = new Map(cellColors.map(([col, row, color]) => [`${col},${row}`, color]));

  const visited = new Set();
  for (const [col, row] of grid.allCells()) {
    const startKey = `${col},${row}`;
    if (visited.has(startKey)) continue;
    visited.add(startKey);
    const region = [[col, row]];
    const stack = [[col, row]];
    while (stack.length) {
      const [c, r] = stack.pop();
      for (const { cell, edge } of grid.cellNeighbors(c, r)) {
        const key = `${cell[0]},${cell[1]}`;
        if (visited.has(key)) continue;
        if (traveled.has(grid.edgeKey(edge[0], edge[1]))) continue;
        visited.add(key);
        region.push(cell);
        stack.push(cell);
      }
    }
    const colorsInRegion = new Set(
      region.map(([c, r]) => colorByCell.get(`${c},${r}`)).filter((color) => color !== undefined)
    );
    if (colorsInRegion.size > 1) return false;
  }
  return true;
}

export function validateSolution(grid, puzzle, path) {
  return (
    isValidPath(grid, puzzle, path) &&
    reachesExit(puzzle, path) &&
    passesAllDots(grid, puzzle, path) &&
    includesRequiredEdges(grid, puzzle, path) &&
    satisfiesTriangles(grid, puzzle, path) &&
    satisfiesRegions(grid, puzzle, path) &&
    satisfiesSymmetry(grid, puzzle, path)
  );
}
