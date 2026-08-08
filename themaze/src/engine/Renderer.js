export const TILE = 40;
const SVG_NS = 'http://www.w3.org/2000/svg';

export class Renderer {
  constructor(container) {
    this.container = container;
    this.svgEl = null;
    this.playerEl = null;
    this.level = null;
  }

  mount(level) {
    this.container.replaceChildren();
    this.level = level;
    this.svgEl = level.svgEl;
    this.svgEl.classList.add('board');
    this.container.appendChild(this.svgEl);

    this.playerEl = document.createElementNS(SVG_NS, 'circle');
    this.playerEl.setAttribute('class', 'player-token');
    this.playerEl.setAttribute('r', TILE * 0.28);
    this.svgEl.appendChild(this.playerEl);

    this._positionPlayer(level.start);
    for (const def of level.doorDefs) {
      this._syncDoor(def, initialLikeState(def), { flash: false });
    }
  }

  _positionPlayer(pos) {
    this.playerEl.setAttribute('cx', (pos.x + 0.5) * TILE);
    this.playerEl.setAttribute('cy', (pos.y + 0.5) * TILE);
  }

  // Renders the current game state. `prevDoorStates` is used only to decide
  // which doors should flash (their state actually changed this move).
  render(gameState, prevDoorStates) {
    this._positionPlayer(gameState.playerPos);
    for (const def of this.level.doorDefs) {
      const state = gameState.doorStates[def.id];
      const prev = prevDoorStates ? prevDoorStates[def.id] : null;
      const changed = prev && JSON.stringify(prev) !== JSON.stringify(state);
      this._syncDoor(def, state, { flash: !!changed });
    }
  }

  _syncDoor(def, state, { flash }) {
    const el = def.el;
    const isOpen = def.type === 'limited' ? state.usesRemaining > 0 : state.open !== false;

    el.classList.toggle('is-sealed', !isOpen && def.type !== 'toggle' && def.type !== 'oneway');
    el.classList.toggle('is-open', def.type === 'toggle' ? !!state.open : isOpen);
    el.classList.toggle('is-closed', def.type === 'toggle' ? !state.open : !isOpen);

    if (def.type === 'limited') {
      const label = el.querySelector('.uses-label');
      if (label) label.textContent = String(state.usesRemaining);
    }

    if (flash) {
      el.classList.remove('flash');
      // restart the animation even if it's already mid-flash
      void el.getBoundingClientRect();
      el.classList.add('flash');
      el.addEventListener('animationend', () => el.classList.remove('flash'), { once: true });
    }
  }

  flashPlayer(kind) {
    this.playerEl.classList.remove('bump');
    void this.playerEl.getBoundingClientRect();
    this.playerEl.classList.add('bump');
  }
}

function initialLikeState(def) {
  if (def.type === 'limited') return { usesRemaining: def.uses };
  if (def.type === 'toggle') return { open: def.initialOpen !== false };
  return { open: true };
}
