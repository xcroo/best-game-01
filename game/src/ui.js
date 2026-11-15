// ui.js — the DOM half of LUMEN DRIFT: HUD, title, upgrade draft,
// game-over screen, pause and mute. The canvas (render.js) draws the
// arena; this module owns everything the player reads as text.

import { formatScore } from './utils.js';

export function createUI(game) {
  const $ = (id) => document.getElementById(id);
  const hud = $('hud');
  const heartsEl = $('hearts');
  const scoreEl = $('score');
  const bestEl = $('best');
  const waveEl = $('wave');
  const comboWrap = $('combo-wrap');
  const comboFill = $('combo-fill');
  const comboText = $('combo-text');
  const dashFill = $('dash-fill');
  const bossWrap = $('boss-wrap');
  const bossFill = $('boss-fill');
  const bossName = $('boss-name');
  const overlayTitle = $('overlay-title');
  const overlayDraft = $('overlay-draft');
  const overlayOver = $('overlay-over');
  const overlayPause = $('overlay-pause');
  const draftCards = $('draft-cards');
  const finalScore = $('final-score');
  const finalBest = $('final-best');
  const finalWave = $('final-wave');
  const titleBest = $('title-best');

  let lastHp = -1;
  let lastScore = -1;

  function showOnly(overlay) {
    for (const el of [overlayTitle, overlayDraft, overlayOver, overlayPause]) {
      el.classList.toggle('hidden', el !== overlay);
    }
    hud.classList.toggle('hidden', overlay === overlayTitle);
  }

  return {
    /** Title screen, with the saved best score. */
    showTitle(best) {
      titleBest.textContent = `BEST ${formatScore(best)}`;
      showOnly(overlayTitle);
    },
    showPlaying() {
      showOnly(null);
    },
    /** The draft: three upgrade cards; click or press 1 / 2 / 3. */
    showDraft(cards, onPick) {
      draftCards.innerHTML = '';
      cards.forEach((card, i) => {
        const el = document.createElement('button');
        el.className = 'card';
        el.style.setProperty('--card-color', card.color);
        el.innerHTML =
          `<span class="card-icon">${card.icon}</span>` +
          `<span class="card-name">${card.name}</span>` +
          `<span class="card-desc">${card.desc}</span>` +
          `<span class="card-key">${i + 1}</span>`;
        el.addEventListener('click', () => onPick(i));
        draftCards.appendChild(el);
      });
      showOnly(overlayDraft);
    },
    /** Game over: final score, best, wave reached. */
    showGameOver(score, best, wave) {
      finalScore.textContent = formatScore(score);
      finalBest.textContent = formatScore(best);
      finalWave.textContent = String(wave);
      showOnly(overlayOver);
    },
    showPause(paused) {
      overlayPause.classList.toggle('hidden', !paused);
    },
    hidePause() {
      overlayPause.classList.add('hidden');
    },
    setWave(n) {
      waveEl.textContent = `WAVE ${n}`;
    },
    /** Keep the mute button's icon in step with the audio state. */
    setMuteIcon(muted) {
      document.getElementById('mute-btn').textContent = muted ? '🔇' : '🔊';
    },
    setBoss(boss) {
      if (boss) {
        bossWrap.classList.remove('hidden');
        bossName.textContent = 'THE HOLLOW STAR';
      } else {
        bossWrap.classList.add('hidden');
      }
    },
    /** Boss bar follows the boss's HP (called every frame while active). */
    updateBoss(boss) {
      if (!boss) return;
      bossFill.style.width = `${Math.max(0, (boss.hp / boss.maxHp) * 100)}%`;
    },
    /** HUD refresh: hearts, score, combo, dash cooldown. Cheap-guarded. */
    update(game) {
      const p = game.player;
      if (p.hp !== lastHp) {
        lastHp = p.hp;
        heartsEl.textContent = '♥'.repeat(Math.max(0, p.hp)) + '♡'.repeat(Math.max(0, p.maxHp - p.hp));
      }
      if (game.score !== lastScore) {
        lastScore = game.score;
        scoreEl.textContent = formatScore(game.score);
      }
      bestEl.textContent = formatScore(game.best);
      const comboFrac = game.combo > 0 ? game.comboTimer / 2.5 : 0;
      comboWrap.classList.toggle('hot', game.combo > 1);
      comboFill.style.width = `${Math.max(0, Math.min(1, comboFrac)) * 100}%`;
      comboText.textContent = game.combo > 1 ? `COMBO ×${game.comboMult.toFixed(1)}` : 'COMBO';
      const dashFrac = 1 - Math.max(0, p.dashCooldown) / p.dashCooldownMax;
      dashFill.style.width = `${Math.max(0, Math.min(1, dashFrac)) * 100}%`;
      dashFill.classList.toggle('ready', p.dashCooldown <= 0);
      this.updateBoss(game.boss);
    },
  };
}
