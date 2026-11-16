// ui.js — the DOM layer: HUD bar, title screen, upgrade draft and
// game-over screen. The canvas (render.js) draws the arena; this file
// owns every readable word on the page. Built once, then updated.

import { CFG } from './config.js';
import { fmt } from './utils.js';

/** Build the UI against the page's elements. hooks: {start, pick, restart}. */
export function buildUI(G, hooks) {
  const el = (id) => document.getElementById(id);
  const ui = {
    hud: el('hud'),
    hearts: el('hearts'),
    score: el('score'),
    combo: el('combo'),
    comboFill: el('combo-fill'),
    wave: el('wave'),
    dash: el('dash'),
    bossWrap: el('boss-wrap'),
    bossFill: el('boss-fill'),
    bossLabel: el('boss-label'),
    title: el('overlay-title'),
    draft: el('overlay-draft'),
    draftCards: el('draft-cards'),
    over: el('overlay-over'),
    bestTitle: el('best-title'),
    finalScore: el('final-score'),
    finalWave: el('final-wave'),
    finalBest: el('final-best'),
    startBtn: el('start-btn'),
    restartBtn: el('restart-btn'),
  };

  ui.startBtn.addEventListener('click', () => hooks.start());
  ui.restartBtn.addEventListener('click', () => hooks.restart());

  function showOnly(which) {
    ui.title.classList.toggle('hidden', which !== 'title');
    ui.draft.classList.toggle('hidden', which !== 'draft');
    ui.over.classList.toggle('hidden', which !== 'gameover');
    ui.hud.classList.toggle('hidden', which === 'title');
  }

  return {
    showTitle(best) {
      ui.bestTitle.textContent = best > 0 ? 'BEST  ' + fmt(best) : 'no runs yet — be the first light';
      showOnly('title');
    },

    showDraft(choices) {
      ui.draftCards.innerHTML = '';
      choices.forEach((up, i) => {
        const card = document.createElement('button');
        card.className = 'card';
        card.type = 'button';
        const owned = G.owned[up.id] || 0;
        card.innerHTML =
          '<span class="card-key">' + (i + 1) + '</span>' +
          '<span class="card-name">' + up.name + '</span>' +
          '<span class="card-desc">' + up.desc + '</span>' +
          '<span class="card-owned">' + (owned > 0 ? 'owned ×' + owned : 'new') + '</span>';
        card.addEventListener('click', () => hooks.pick(i));
        ui.draftCards.appendChild(card);
      });
      showOnly('draft');
    },

    showGameOver(score, wave, best) {
      ui.finalScore.textContent = fmt(score);
      ui.finalWave.textContent = 'wave ' + wave;
      ui.finalBest.textContent = 'best  ' + fmt(best);
      showOnly('gameover');
    },

    hideOverlays() {
      showOnly(null);
    },

    updateHUD() {
      const p = G.player;
      let hearts = '';
      for (let i = 0; i < p.maxHp; i++) {
        hearts += i < p.hp ? '♥' : '♡';
      }
      ui.hearts.textContent = hearts;
      ui.score.textContent = fmt(G.score);
      const mult = 1 + Math.min(G.combo, 40) * CFG.COMBO_STEP;
      ui.combo.textContent = G.combo > 1 ? 'COMBO ×' + G.combo + '  (' + mult.toFixed(1) + '×)' : '';
      ui.comboFill.style.width = G.combo > 0
        ? Math.round((G.comboTimer / CFG.COMBO_WINDOW) * 100) + '%'
        : '0%';
      ui.wave.textContent = 'WAVE ' + G.wave;
      let pips = '';
      for (let i = 0; i < p.maxDash; i++) {
        pips += i < p.dashCharges ? '●' : '○';
      }
      ui.dash.textContent = 'DASH ' + pips;
      // Keep the tab title in sync so a headless playtest can read the score.
      if (document.title !== 'LUMEN DRIFT — ' + fmt(G.score)) {
        document.title = 'LUMEN DRIFT — ' + fmt(G.score);
      }
      if (G.boss) {
        ui.bossWrap.classList.remove('hidden');
        ui.bossFill.style.width = Math.max(0, Math.round((G.boss.hp / G.boss.maxHp) * 100)) + '%';
        ui.bossLabel.textContent = 'BOSS';
      } else {
        ui.bossWrap.classList.add('hidden');
      }
    },
  };
}
