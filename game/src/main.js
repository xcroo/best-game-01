// main.js — boot for PINECREST. Sizes the canvas to the window, builds
// the game object and hands it to game.js's start(), which runs the
// fixed-timestep loop and the screenshot presets.

import { makeGame, start } from './game.js';

const canvas = document.getElementById('game');

function fitCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

fitCanvas();
window.addEventListener('resize', fitCanvas);

const game = makeGame(canvas);
// Exposed for headless playtests: the soak test reads game.state,
// game.score and game.player through window.__pinecrest.
window.__pinecrest = game;
start(game);
