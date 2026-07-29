import { isEdgeBlocked } from './Validator.js';

export class InputController {
  constructor(svg, grid, { onChange, onRelease } = {}) {
    this.svg = svg;
    this.grid = grid;
    this.onChange = onChange || (() => {});
    this.onRelease = onRelease || (() => {});
    this.puzzle = null;
    this.path = [];
    this.dragging = false;

    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);

    svg.addEventListener('pointerdown', this.handlePointerDown);
    svg.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('pointercancel', this.handlePointerUp);
  }

  setPuzzle(puzzle) {
    this.puzzle = puzzle;
    this.path = [];
    this.dragging = false;
  }

  reset() {
    this.path = [];
    this.dragging = false;
  }

  destroy() {
    this.svg.removeEventListener('pointerdown', this.handlePointerDown);
    this.svg.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('pointercancel', this.handlePointerUp);
  }

  svgPoint(evt) {
    const rect = this.svg.getBoundingClientRect();
    const scaleX = this.grid.svgSize / rect.width;
    const scaleY = this.grid.svgSize / rect.height;
    return {
      x: (evt.clientX - rect.left) * scaleX,
      y: (evt.clientY - rect.top) * scaleY,
    };
  }

  nearestNode(point) {
    let closest = null;
    let bestDist = Infinity;
    for (const node of this.grid.allNodes()) {
      const p = this.grid.nodeToPoint(node);
      const dist = Math.hypot(p.x - point.x, p.y - point.y);
      if (dist < bestDist) {
        bestDist = dist;
        closest = node;
      }
    }
    return { node: closest, dist: bestDist };
  }

  pathContains(node) {
    return this.path.some((n) => n[0] === node[0] && n[1] === node[1]);
  }

  handlePointerDown(evt) {
    if (!this.puzzle) return;
    const { node, dist } = this.nearestNode(this.svgPoint(evt));
    const grabRadius = this.grid.cellSize * 0.6;
    if (dist > grabRadius) return;
    const [sc, sr] = this.puzzle.start;
    if (node[0] !== sc || node[1] !== sr) return;

    this.dragging = true;
    this.path = [node];
    this.onChange(this.path);
  }

  handlePointerMove(evt) {
    if (!this.dragging) return;
    const { node, dist } = this.nearestNode(this.svgPoint(evt));
    const grabRadius = this.grid.cellSize * 0.9;
    if (dist > grabRadius) return;

    const last = this.path[this.path.length - 1];
    if (last[0] === node[0] && last[1] === node[1]) return;

    if (this.path.length > 1) {
      const prev = this.path[this.path.length - 2];
      if (prev[0] === node[0] && prev[1] === node[1]) {
        this.path.pop();
        this.onChange(this.path);
        return;
      }
    }

    if (!this.grid.isAdjacent(last, node)) return;
    if (isEdgeBlocked(this.grid, this.puzzle, last, node)) return;
    if (this.pathContains(node)) return;

    this.path.push(node);
    this.onChange(this.path);
  }

  handlePointerUp() {
    if (!this.dragging) return;
    this.dragging = false;
    this.onRelease(this.path);
  }
}
