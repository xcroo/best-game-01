// input.js — keyboard + mouse state for LUMEN DRIFT.
// One Input object per game. It listens on the window and the canvas,
// keeps the current key set and the mouse position in canvas pixels,
// and exposes tiny query helpers. No imports.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.mouseX = canvas.width / 2;
    this.mouseY = canvas.height / 2 - 120;
    this.mouseDown = false;
    this._pressed = new Set(); // keys pressed since last poll (edge-triggered)
    this._onKeyDown = (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
      if (!e.repeat) this._pressed.add(k);
      this.keys.add(k);
    };
    this._onKeyUp = (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      this.keys.delete(k);
    };
    this._onMouseMove = (e) => {
      const r = this.canvas.getBoundingClientRect();
      this.mouseX = (e.clientX - r.left) * (this.canvas.width / r.width);
      this.mouseY = (e.clientY - r.top) * (this.canvas.height / r.height);
    };
    this._onMouseDown = (e) => {
      if (e.button === 0) this.mouseDown = true;
      this._onMouseMove(e);
    };
    this._onMouseUp = (e) => {
      if (e.button === 0) this.mouseDown = false;
    };
    this._onBlur = () => {
      this.keys.clear();
      this.mouseDown = false;
    };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
    window.addEventListener('blur', this._onBlur);
  }

  /** True while the key is held. Accepts any of the aliases listed. */
  down(...names) {
    for (const n of names) if (this.keys.has(n)) return true;
    return false;
  }

  /** True only on the frame the key was first pressed. Consumed on read. */
  pressed(...names) {
    for (const n of names) {
      if (this._pressed.has(n)) {
        this._pressed.delete(n);
        return true;
      }
    }
    return false;
  }

  /** Movement vector from WASD / arrows, normalised. {x, y} in [-1, 1]. */
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.down('a', 'ArrowLeft')) x -= 1;
    if (this.down('d', 'ArrowRight')) x += 1;
    if (this.down('w', 'ArrowUp')) y -= 1;
    if (this.down('s', 'ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.sqrt(2);
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  /** Drop the edge-triggered set at the end of a frame. */
  endFrame() {
    this._pressed.clear();
  }

  /** Clear all held keys and the mouse button (e.g. on a state change). */
  reset() {
    this.keys.clear();
    this._pressed.clear();
    this.mouseDown = false;
  }

  /** For scripted tests: pretend a key is held. */
  setKey(name, held) {
    if (held) this.keys.add(name);
    else this.keys.delete(name);
  }

  /** For scripted tests: place the mouse and optionally hold the button. */
  setMouse(x, y, down) {
    this.mouseX = x;
    this.mouseY = y;
    if (down !== undefined) this.mouseDown = down;
  }

  detach() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mousedown', this._onMouseDown);
    window.removeEventListener('mouseup', this._onMouseUp);
    window.removeEventListener('blur', this._onBlur);
  }
}
