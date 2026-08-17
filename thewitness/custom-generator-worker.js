import { generateCustomLevel, setRng } from './scripts/level-generator.mjs';

self.addEventListener('message', (event) => {
  const { type, profile, preferredTypes } = event.data || {};
  if (type !== 'generate') return;

  try {
    setRng(Math.random);
    const puzzle = generateCustomLevel({
      profile,
      preferredTypes,
      onProgress: (payload) => {
        self.postMessage({ type: 'progress', payload });
      },
    });
    self.postMessage({ type: 'result', puzzle });
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});
