// Tiny WebAudio synth blips — one recognizable sound per event, no audio
// assets needed. The AudioContext is created lazily on first use since
// browsers require a user gesture before audio can start.

const MUTE_KEY = 'door-labyrinth.muted';

let ctx = null;
function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

export function isMuted() {
  return localStorage.getItem(MUTE_KEY) === '1';
}

export function setMuted(muted) {
  localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
}

function blip(freq, durationMs, { type = 'sine', gain = 0.16, glideTo = null } = {}) {
  if (isMuted()) return;
  const audio = getCtx();
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audio.currentTime);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, audio.currentTime + durationMs / 1000);
  amp.gain.setValueAtTime(gain, audio.currentTime);
  amp.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + durationMs / 1000);
  osc.connect(amp).connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + durationMs / 1000 + 0.02);
}

export function playStep() {
  blip(320, 70, { type: 'triangle', gain: 0.08 });
}

export function playBlocked() {
  blip(120, 140, { type: 'sawtooth', gain: 0.12 });
}

export function playDoorEvent(type) {
  switch (type) {
    case 'closing':
      blip(260, 220, { type: 'square', glideTo: 90, gain: 0.14 });
      break;
    case 'limited':
      blip(520, 90, { type: 'square', gain: 0.12 });
      break;
    case 'linked':
      blip(440, 160, { type: 'sine', glideTo: 220, gain: 0.14 });
      break;
    case 'toggle':
      blip(300, 90, { type: 'triangle', gain: 0.12 });
      blip(500, 90, { type: 'triangle', gain: 0.1 });
      break;
    default:
      break;
  }
}

export function playWin() {
  blip(440, 120, { type: 'sine', gain: 0.16 });
  setTimeout(() => blip(660, 220, { type: 'sine', gain: 0.18 }), 120);
}
