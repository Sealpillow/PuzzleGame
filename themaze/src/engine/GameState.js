import { DIRS, canEnter, onEnter, applyTrigger, initialDoorState } from './Door.js';

export class GameState {
  constructor(level) {
    this.level = level;
    this.doorStates = {};
    for (const def of level.doorDefs) {
      this.doorStates[def.id] = initialDoorState(def);
    }
    this.playerPos = { ...level.start };
    this.history = [];
    this.completed = false;
  }

  _snapshot() {
    return {
      playerPos: { ...this.playerPos },
      doorStates: structuredClone(this.doorStates),
    };
  }

  // dirKey: one of 'N' | 'S' | 'E' | 'W'
  move(dirKey) {
    const vec = DIRS[dirKey];
    const target = { x: this.playerPos.x + vec.dx, y: this.playerPos.y + vec.dy };
    const cell = this.level.cellAt(target.x, target.y);

    if (cell.kind === 'wall') {
      return { moved: false, reason: 'wall' };
    }

    if (cell.kind === 'door') {
      const state = this.doorStates[cell.doorId];
      if (!canEnter(cell.def, state, dirKey)) {
        return { moved: false, reason: 'blocked', doorType: cell.def.type };
      }
    }

    this.history.push(this._snapshot());
    this.playerPos = target;

    let toggledGroup = null;
    if (cell.kind === 'door') {
      onEnter(cell.def, this.doorStates, this.level.linkPairs);
    } else if (cell.kind === 'floor' && cell.triggerGroup) {
      applyTrigger(cell.triggerGroup, this.level.doorDefs, this.doorStates);
      toggledGroup = cell.triggerGroup;
    }

    if (cell.kind === 'exit') {
      this.completed = true;
    }

    return { moved: true, cell, toggledGroup, won: this.completed };
  }

  undo() {
    if (this.history.length === 0) return false;
    const snap = this.history.pop();
    this.playerPos = snap.playerPos;
    this.doorStates = snap.doorStates;
    this.completed = false;
    return true;
  }

  restart() {
    for (const def of this.level.doorDefs) {
      this.doorStates[def.id] = initialDoorState(def);
    }
    this.playerPos = { ...this.level.start };
    this.history = [];
    this.completed = false;
  }
}
