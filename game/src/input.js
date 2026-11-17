// input.js — keyboard and mouse state for PINECREST.
// Keys are tracked as held / just-pressed (edge) so jumps can buffer.
// Mouse clicks are reported as a position for menu buttons.

const held = new Set();
const pressed = new Set();
let mouseX = 0;
let mouseY = 0;
let mouseClicked = false;

const KEYMAP = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'jump',
  KeyW: 'jump',
  Space: 'jump',
  ShiftLeft: 'dash',
  ShiftRight: 'dash',
  KeyX: 'dash',
  KeyP: 'pause',
  Escape: 'pause',
  KeyR: 'restart',
  KeyM: 'mute',
  Enter: 'confirm',
};

export function initInput(canvas) {
  window.addEventListener('keydown', (e) => {
    const action = KEYMAP[e.code];
    if (!action) return;
    if (e.code === 'Space' || e.code === 'ArrowUp') e.preventDefault();
    if (!e.repeat) pressed.add(action);
    held.add(action);
  });
  window.addEventListener('keyup', (e) => {
    const action = KEYMAP[e.code];
    if (action) held.delete(action);
  });
  window.addEventListener('blur', () => held.clear());
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouseX = ((e.clientX - r.left) / r.width) * canvas.width;
    mouseY = ((e.clientY - r.top) / r.height) * canvas.height;
  });
  canvas.addEventListener('mousedown', (e) => {
    const r = canvas.getBoundingClientRect();
    mouseX = ((e.clientX - r.left) / r.width) * canvas.width;
    mouseY = ((e.clientY - r.top) / r.height) * canvas.height;
    mouseClicked = true;
  });
}

export function isHeld(action) {
  return held.has(action);
}

// True only on the frame the key went down; game.js clears the edge set
// at the end of each fixed update.
export function wasPressed(action) {
  return pressed.has(action);
}

export function clearPressed() {
  pressed.clear();
  mouseClicked = false;
}

export function consumeClick() {
  const c = mouseClicked;
  mouseClicked = false;
  return c;
}

export function mousePos() {
  return { x: mouseX, y: mouseY };
}

// Synthetic input for headless playtests and the soak test: the test
// driver calls these instead of dispatching real keyboard events.
export function pressAction(action) {
  pressed.add(action);
  held.add(action);
}

export function releaseAction(action) {
  held.delete(action);
}

// Drop every held and queued key (used when leaving a menu so a held
// key never leaks into the next state).
export function releaseAll() {
  held.clear();
  pressed.clear();
}
