// Renders a level model (the same shape LevelLoader.js produces, minus the
// live `.el` references) into the SVG markup LevelLoader.js/Renderer.js
// expect: data-* attributes carry the authoritative data, the shapes are
// the literal visuals. Pure string building, no DOM/Node-only APIs, so it's
// shared by the level generator (scripts/generate-levels.mjs) and the
// in-browser maze editor (editor.js) — the source of a level's SVG is only
// written once.

export const TILE = 40;

export function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

export function doorSymbolMarkup(def) {
  const cx = 20, cy = 20;
  switch (def.type) {
    case 'oneway': {
      const rot = { E: 0, S: 90, W: 180, N: 270 }[def.dir];
      return `<g class="door-symbol door-arrow" transform="rotate(${rot} ${cx} ${cy})"><path d="M9,10 L31,20 L9,30 Z" /></g>`;
    }
    case 'closing':
      return (
        `<circle class="door-symbol door-ring" cx="${cx}" cy="${cy}" r="12" />` +
        `<rect class="door-shutter" x="4" y="4" width="32" height="32" />`
      );
    case 'limited':
      return (
        `<circle class="door-symbol door-ring" cx="${cx}" cy="${cy}" r="13" />` +
        `<text class="uses-label" x="${cx}" y="${cy + 5}" text-anchor="middle">${def.uses}</text>`
      );
    case 'linked':
      return (
        `<g class="door-symbol door-chain link-${esc(def.linkId)}">` +
        `<circle cx="14" cy="20" r="8" /><circle cx="26" cy="20" r="8" />` +
        `</g>` +
        `<rect class="door-shutter" x="4" y="4" width="32" height="32" />`
      );
    case 'toggle':
      return (
        `<g class="door-symbol toggle-open-art"><circle cx="${cx}" cy="${cy}" r="13" /></g>` +
        `<g class="door-symbol toggle-closed-art">` +
        `<circle cx="${cx}" cy="${cy}" r="13" />` +
        `<path d="M10,10 L30,30 M30,10 L10,30" />` +
        `</g>`
      );
    default:
      return '';
  }
}

export function triggerSymbolMarkup(groupId) {
  return `<path class="trigger-symbol group-${esc(groupId)}" d="M20,10 L30,20 L20,30 L10,20 Z" />`;
}

// model: { cols, rows, cellAt(x,y) } - cellAt results shaped like
// LevelLoader.js's cells (kind/door/def/triggerGroup), minus `.el`.
// meta: { id, title } - purely descriptive, stamped onto the root <svg>.
export function renderLevelSVG(model, meta) {
  const w = model.cols * TILE;
  const h = model.rows * TILE;
  let body = '';

  for (let y = 0; y < model.rows; y++) {
    for (let x = 0; x < model.cols; x++) {
      const cell = model.cellAt(x, y);
      const px = x * TILE, py = y * TILE;

      if (cell.kind === 'door') {
        const def = cell.def;
        const cssClass = `door door-${esc(def.type)}` + (def.groupId ? ` group-${esc(def.groupId)}` : '');
        const attrs = [
          `class="${cssClass}"`,
          `data-x="${x}"`, `data-y="${y}"`, `data-type="${esc(def.type)}"`,
          def.dir ? `data-dir="${esc(def.dir)}"` : '',
          def.uses != null ? `data-uses="${def.uses}"` : '',
          def.linkId ? `data-link-id="${esc(def.linkId)}"` : '',
          def.groupId ? `data-group-id="${esc(def.groupId)}"` : '',
          def.type === 'toggle' ? `data-initial-open="${def.initialOpen !== false}"` : '',
        ].filter(Boolean).join(' ');
        body += `<g ${attrs} transform="translate(${px} ${py})">` +
          `<rect class="tile-base" x="0" y="0" width="${TILE}" height="${TILE}" />` +
          doorSymbolMarkup(def) +
          `</g>`;
        continue;
      }

      const kindAttrs = `class="tile tile-${esc(cell.kind)}" data-x="${x}" data-y="${y}" data-kind="${esc(cell.kind)}"` +
        (cell.triggerGroup ? ` data-trigger-group="${esc(cell.triggerGroup)}"` : '');
      body += `<rect ${kindAttrs} x="${px}" y="${py}" width="${TILE}" height="${TILE}" />`;

      if (cell.kind === 'start') {
        body += `<circle class="start-marker" cx="${px + 20}" cy="${py + 20}" r="6" />`;
      } else if (cell.kind === 'exit') {
        body += `<rect class="exit-marker" x="${px + 12}" y="${py + 12}" width="16" height="16" />`;
      } else if (cell.triggerGroup) {
        body += `<g transform="translate(${px} ${py})">${triggerSymbolMarkup(cell.triggerGroup)}</g>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" data-cols="${model.cols}" data-rows="${model.rows}" data-level-id="${esc(meta.id)}" data-level-title="${esc(meta.title)}">\n${body}\n</svg>\n`;
}
