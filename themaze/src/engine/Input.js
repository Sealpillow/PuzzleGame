const KEY_TO_DIR = {
  ArrowUp: 'N', w: 'N', W: 'N',
  ArrowDown: 'S', s: 'S', S: 'S',
  ArrowLeft: 'W', a: 'W', A: 'W',
  ArrowRight: 'E', d: 'E', D: 'E',
};

const MOVE_LOCK_MS = 110;

export class InputController {
  constructor({ onMove, onUndo, onRestart, onPause, undoBtn, restartBtn, pauseBtn }) {
    this.onMove = onMove;
    this.onUndo = onUndo;
    this.onRestart = onRestart;
    this.onPause = onPause;
    this.locked = false;

    this._onKeydown = this._onKeydown.bind(this);
    window.addEventListener('keydown', this._onKeydown);

    undoBtn?.addEventListener('click', () => this.onUndo?.());
    restartBtn?.addEventListener('click', () => this.onRestart?.());
    pauseBtn?.addEventListener('click', () => this.onPause?.());
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeydown);
  }

  // Called by main.js right after a move is accepted, so input stays paced
  // with the player-token glide animation instead of outrunning it.
  lockBriefly() {
    this.locked = true;
    setTimeout(() => {
      this.locked = false;
    }, MOVE_LOCK_MS);
  }

  _onKeydown(e) {
    const dir = KEY_TO_DIR[e.key];
    if (dir) {
      e.preventDefault();
      if (!this.locked) this.onMove?.(dir);
      return;
    }
    if (e.key === 'z' || e.key === 'Z' || e.key === 'Backspace') {
      e.preventDefault();
      this.onUndo?.();
      return;
    }
    if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      this.onRestart?.();
      return;
    }
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      this.onPause?.();
    }
  }
}
