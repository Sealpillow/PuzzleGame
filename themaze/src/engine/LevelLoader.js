// Parses a level .svg file into a runtime grid+doors model. The SVG's
// data-* attributes are the level's authoritative data; its shapes are also
// the literal visuals Renderer.js will mount, so there is nothing to keep
// "in sync" between layout data and art.

function key(x, y) {
  return `${x},${y}`;
}

export async function loadLevel(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load level: ${url}`);
  const text = await res.text();
  return parseLevelSVG(text, String(url));
}

// Parses level SVG source text directly (no fetch) into the same runtime
// model `loadLevel` produces. Used by `loadLevel` itself, and by anything
// else that already has SVG text in hand - e.g. the maze editor, which
// builds this string itself rather than fetching it from a file.
export function parseLevelSVG(text, sourceLabel = 'level') {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const svgEl = doc.documentElement;
  if (svgEl.querySelector('parsererror')) {
    throw new Error(`Malformed level SVG: ${sourceLabel}`);
  }

  const cols = parseInt(svgEl.dataset.cols, 10);
  const rows = parseInt(svgEl.dataset.rows, 10);

  const cells = new Map();
  const doorDefs = [];
  const linkPairs = new Map();
  let start = null;
  let exit = null;

  const nodes = svgEl.querySelectorAll('[data-x][data-y]');
  for (const el of nodes) {
    const x = parseInt(el.dataset.x, 10);
    const y = parseInt(el.dataset.y, 10);

    if (el.classList.contains('door')) {
      const id = `door-${x}-${y}`;
      const def = {
        id,
        x,
        y,
        type: el.dataset.type,
        dir: el.dataset.dir || null,
        uses: el.dataset.uses ? parseInt(el.dataset.uses, 10) : null,
        linkId: el.dataset.linkId || null,
        groupId: el.dataset.groupId || null,
        initialOpen: el.dataset.initialOpen !== 'false',
        el,
      };
      doorDefs.push(def);
      cells.set(key(x, y), { kind: 'door', doorId: id, def });

      if (def.linkId) {
        const pair = linkPairs.get(def.linkId) || [];
        pair.push(id);
        linkPairs.set(def.linkId, pair);
      }
    } else {
      const kind = el.dataset.kind;
      const triggerGroup = el.dataset.triggerGroup || null;
      cells.set(key(x, y), { kind, triggerGroup, el });
      if (kind === 'start') start = { x, y };
      if (kind === 'exit') exit = { x, y };
    }
  }

  if (!start) throw new Error(`Level ${sourceLabel} has no start tile`);
  if (!exit) throw new Error(`Level ${sourceLabel} has no exit tile`);

  return {
    cols,
    rows,
    start,
    exit,
    doorDefs,
    linkPairs,
    svgEl,
    cellAt(x, y) {
      if (x < 0 || y < 0 || x >= cols || y >= rows) return { kind: 'wall' };
      return cells.get(key(x, y)) || { kind: 'wall' };
    },
  };
}
