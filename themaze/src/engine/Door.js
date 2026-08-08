// Door type behavior. A "door" here is a single grid tile (see LevelLoader.js)
// that gates movement onto itself. Each function is pure given the door's
// static definition (from the level) and its current mutable state.

export const DIRS = {
  N: { dx: 0, dy: -1 },
  S: { dx: 0, dy: 1 },
  E: { dx: 1, dy: 0 },
  W: { dx: -1, dy: 0 },
};

export function initialDoorState(def) {
  switch (def.type) {
    case 'limited':
      return { usesRemaining: def.uses };
    case 'closing':
    case 'linked':
      return { open: true };
    case 'toggle':
      return { open: def.initialOpen !== false };
    default:
      return {};
  }
}

// travelDir: the direction (N/S/E/W) the player is moving *into* this tile.
export function canEnter(def, state, travelDir) {
  switch (def.type) {
    case 'oneway':
      return travelDir === def.dir;
    case 'closing':
    case 'linked':
      return state.open;
    case 'limited':
      return state.usesRemaining > 0;
    case 'toggle':
      return state.open;
    default:
      return true;
  }
}

// Mutates `doorStates` (id -> state) in place after the player successfully
// steps onto this door tile. `linkPairs` maps linkId -> [doorIdA, doorIdB].
export function onEnter(def, doorStates, linkPairs) {
  switch (def.type) {
    case 'closing':
      doorStates[def.id].open = false;
      break;
    case 'limited':
      doorStates[def.id].usesRemaining -= 1;
      break;
    case 'linked': {
      const pair = linkPairs.get(def.linkId) || [];
      const partnerId = pair.find((id) => id !== def.id);
      if (partnerId) doorStates[partnerId].open = false;
      break;
    }
    default:
      break;
  }
}

// Trigger tiles are always passable floor tiles that flip a toggle group.
export function applyTrigger(groupId, doorDefs, doorStates) {
  for (const def of doorDefs) {
    if (def.type === 'toggle' && def.groupId === groupId) {
      doorStates[def.id].open = !doorStates[def.id].open;
    }
  }
}

export function describeDoor(def, state) {
  switch (def.type) {
    case 'oneway':
      return `One-way (${def.dir})`;
    case 'closing':
      return state.open ? 'Closing door (open)' : 'Closing door (sealed)';
    case 'limited':
      return `Limited use (${state.usesRemaining} left)`;
    case 'linked':
      return state.open ? 'Linked door (open)' : 'Linked door (sealed)';
    case 'toggle':
      return state.open ? 'Toggle door (open)' : 'Toggle door (closed)';
    default:
      return 'Door';
  }
}
