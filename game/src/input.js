// input.js — keyboard + mouse state for LUMEN DRIFT.
// One object owns the raw state; the game reads it each frame.

/**
 * Track keys and the mouse on a canvas. Positions are canvas pixels
 * (the canvas is fixed 1280x800 and shown at that size).
 */
export function createInput(canvas) {
  const keys = new Set();
  const mouse = { x: 640, y: 400, down: false, clicked: false };
  const pressed = new Set(); // keys pressed since the last frame was consumed

  function onKeyDown(e) {
    if (e.repeat) return;
    keys.add(e.code);
    pressed.add(e.code);
    // Keep the page from scrolling on game keys.
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
  }
  function onKeyUp(e) {
    keys.delete(e.code);
  }
  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  }
  function onMouseDown(e) {
    if (e.button === 0) {
      mouse.down = true;
      mouse.clicked = true;
      onMouseMove(e);
    }
  }
  function onMouseUp(e) {
    if (e.button === 0) mouse.down = false;
  }
  function onBlur() {
    keys.clear();
    mouse.down = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  // No context menu over the arena: right-click is a game gesture, not a menu.
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  return {
    keys,
    mouse,
    /** True while the key is held. */
    down(code) {
      return keys.has(code);
    },
    /** True only on the frame the key went down (consumed by endFrame). */
    wasPressed(code) {
      return pressed.has(code);
    },
    /** True only on the frame the mouse was clicked (consumed by endFrame). */
    wasClicked() {
      return mouse.clicked;
    },
    /** Movement vector from WASD / arrows, normalised. */
    moveVector() {
      let x = 0;
      let y = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) {
        const inv = 1 / Math.SQRT2;
        x *= inv;
        y *= inv;
      }
      return { x, y };
    },
    /** Call at the end of each frame so presses fire exactly once. */
    endFrame() {
      pressed.clear();
      mouse.clicked = false;
    },
  };
}
