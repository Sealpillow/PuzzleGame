const SAVE_KEY = 'door-labyrinth-save-v1';

function defaultSave() {
  return {
    completedLevels: [],
    currentIndex: 0, // highest unlocked index into manifest.js
  };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    return { ...defaultSave(), ...JSON.parse(raw) };
  } catch {
    return defaultSave();
  }
}

export function writeSave(save) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

export function markCompleted(save, levelId, levelIndex, totalLevels) {
  if (!save.completedLevels.includes(levelId)) {
    save.completedLevels.push(levelId);
  }
  save.currentIndex = Math.min(Math.max(save.currentIndex, levelIndex + 1), totalLevels - 1);
  writeSave(save);
  return save;
}

export function isUnlocked(save, index) {
  return index <= save.currentIndex;
}

export function isCompleted(save, levelId) {
  return save.completedLevels.includes(levelId);
}
