/* Wingspan Pocket — accessible HTML interface.
 * All game state is shown as real text and buttons so the game works with a
 * keyboard and a screen reader. p5.js (art.js) supplies the images.
 */

const UI = (() => {
  let pending = null;      // current ask spec (with resolve)
  let selected = new Set(); // multi-select keys
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- boot & setup form ---------- */
  function boot() {
    $('loading').hidden = true;
    $('setup').hidden = false;
    $('game').hidden = true;
    const form = $('setup-form');
    const sync = () => {
      const solo = $('mode-solo').checked;
      $('solo-opts').hidden = !solo;
      $('hot-opts').hidden = solo;
      $('opt-goals').disabled = solo;
      if (solo) $('opt-goals').checked = true;
      const n = +$('hot-count').value;
      for (let i = 1; i <= 4; i++) $('hot-name-wrap-' + i).hidden = i > n;
    };
    form.addEventListener('change', sync);
    sync();
    form.addEventListener('submit', e => {
      e.preventDefault();
      const solo = $('mode-solo').checked;
      const names = solo ? [($('solo-name').value || 'You').trim()]
        : Array.from({ length: +$('hot-count').value }, (_, i) => ($('hot-name-' + (i + 1)).value || `Player ${i + 1}`).trim());
      start({ players: names, automa: solo, difficulty: $('difficulty').value, goals: $('opt-goals').checked, chooseStart: $('opt-choose').checked });
    });
    $('btn-rules').addEventListener('click', () => $('rules').showModal());
    $('rules-close').addEventListener('click', () => $('rules').close());
    $('btn-new').addEventListener('click', () => {
      if (G && !G.over && !$('game').hidden) {
        $('confirm-new').hidden = !$('confirm-new').hidden;
        if (!$('confirm-new').hidden) $('confirm-yes').focus();
        return;
      }
      showSetup();
    });
    $('confirm-yes').addEventListener('click', () => { $('confirm-new').hidden = true; showSetup(); });
    $('confirm-no').addEventListener('click', () => { $('confirm-new').hidden = true; $('btn-new').focus(); });
    const app = $('game');
    app.addEventListener('click', onClick);
    app.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role="button"][data-key]')) { e.preventDefault(); onClick(e); }
    });
    if (window.WS_AUTOSTART) start(window.WS_AUTOSTART);
  }

  function showSetup() {
    if (pending) pending = null;
    G = null;
    $('setup').hidden = false; $('game').hidden = true; $('results').hidden = true;
    $('setup-title').focus();
  }

  function start(opts) {
    newGame(opts);
    $('setup').hidden = true; $('game').hidden = false; $('results').hidden = true;
    const myGame = G;
    startGame().catch(err => { if (G === myGame) { console.error(err); announce('Something went wrong: ' + err.message); } });
  }

  /* ---------- ask / answer ---------- */
  function ask(spec) {
    return new Promise(resolve => {
      const game = G;
      pending = { ...spec, resolve: v => { if (G === game) resolve(v); } };
      selected = new Set(spec.multi ? (spec.multi.preselect || []) : []);
      render();
      announce(spec.title + '. ' + (G.flash ? G.flash + ' ' : '') + spec.prompt);
      if (window.WS_AUTOPLAY) { setTimeout(autoAnswer, 0); return; }
      const h = $('prompt-title'); if (h) h.focus({ preventScroll: true });
      revealTargets(spec);
    });
  }
  function revealTargets(spec) {
    const keys = spec.targets && spec.targets.length ? spec.targets : spec.multi ? spec.multi.keys : [];
    if (!keys.length) return;
    const els = keys.map(k => document.querySelector(`[data-key="${k}"].selectable`)).filter(Boolean);
    const promptBottom = $('prompt').getBoundingClientRect().bottom;
    const visible = els.some(el => { const r = el.getBoundingClientRect(); return r.bottom > promptBottom && r.top < window.innerHeight; });
    if (!visible && els[0]) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      els[0].scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    }
  }
  function answer(v) {
    const p = pending; if (!p) return;
    pending = null;
    if (v.id !== undefined || v.key !== undefined) G.flash = v.keepFlash ? G.flash : '';
    p.resolve(v);
  }
  function multiValid() {
    const m = pending && pending.multi; if (!m) return true;
    const arr = [...selected];
    if (m.min !== undefined && arr.length < m.min) return false;
    if (m.max !== undefined && arr.length > m.max) return false;
    return m.validate ? m.validate(arr) : true;
  }
  function onClick(e) {
    const btn = e.target.closest('button[data-act]');
    if (btn && pending) {
      if (btn.disabled) return;
      answer({ id: btn.dataset.act, selected: [...selected] });
      return;
    }
    const el = e.target.closest('[data-key]');
    if (!el || !pending || !el.classList.contains('selectable')) return;
    const key = el.dataset.key;
    if (pending.multi) {
      if (selected.has(key)) selected.delete(key); else selected.add(key);
      el.classList.toggle('chosen', selected.has(key));
      el.setAttribute('aria-pressed', selected.has(key));
      updateMultiStatus();
      return;
    }
    answer({ key });
  }
  function updateMultiStatus() {
    const ok = multiValid();
    document.querySelectorAll('#prompt button[data-needs-valid]').forEach(b => { b.disabled = !ok; });
    const st = $('multi-status');
    if (st) st.textContent = `${selected.size} selected. ` + (ok ? 'This selection works.' : 'This selection does not pay the cost yet.');
  }
  function autoAnswer() {
    const p = pending; if (!p) return;
    if (typeof window.WS_AUTOPLAY === 'function') { const v = window.WS_AUTOPLAY(p, [...selected], multiValid()); if (v) return answer(v); }
    const btns = (p.buttons || []).filter(b => !b.disabled);
    if (p.multi) {
      if (!multiValid()) { selected = new Set(p.multi.keys.slice(0, p.multi.min || 1)); }
      const b = btns.find(b => b.primary) || btns[0];
      return answer({ id: b.id, selected: [...selected] });
    }
    const targets = p.targets || [];
    const safe = btns.filter(b => b.id !== 'back');
    if (targets.length && (Math.random() < 0.85 || !safe.length)) return answer({ key: targets[Math.floor(Math.random() * targets.length)] });
    const pool = safe.length ? safe : btns;
    // favour the primary action so games progress
    const pick = pool.find(b => b.primary && Math.random() < 0.6) || pool[Math.floor(Math.random() * pool.length)];
    answer({ id: pick.id });
  }

  function announce(msg) { const l = $('live'); if (!l) return; l.textContent = ''; setTimeout(() => { l.textContent = msg; }, 30); }

  /* ---------- descriptions (screen-reader text) ---------- */
  function costText(b, p) {
    const parts = b.food.map(foodName);
    if (b.eggCost) parts.push(b.eggCost + ' egg');
    return parts.length ? parts.join(', ') : 'free';
  }
  function birdDesc(card, slot) {
    const b = card.bird;
    const pw = b.power ? (b.power.green ? 'Green ongoing power: ' : 'Brown power: ') + powerText(b.power) : 'No power.';
    let s = `${b.name} (${b.sci}). Cost: ${costText(b)}. ${b.points} points. Egg limit ${b.eggLimit}. Wingspan ${b.wingspan} cm. ${pw} ${b.fact}`;
    if (slot) s += ` Eggs on card: ${slot.eggs} of ${b.eggLimit}. Tucked cards: ${slot.tucked.length}.`;
    return s;
  }
  const foodCardName = c => c.food.map(f => cap(foodName(f))).join(' or ');
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  /* ---------- element builders ---------- */
  function wrap(key, cls, desc, inner, extra = '') {
    const sel = pending && (pending.targets || []).includes(key) || (pending && pending.multi && pending.multi.keys.includes(key));
    const chosen = pending && pending.multi && selected.has(key);
    if (sel) {
      return `<div class="${cls} selectable${chosen ? ' chosen' : ''}" role="button" tabindex="0" data-key="${key}" aria-label="${esc(desc)}"${pending.multi ? ` aria-pressed="${!!chosen}"` : ''} ${extra}>${inner}<span class="pick-badge" aria-hidden="true">${pending.multi ? (chosen ? '✓ Selected' : 'Select') : 'Choose'}</span></div>`;
    }
    return `<div class="${cls}" data-key="${key || ''}" ${extra}><span class="sr-only">${esc(desc)}</span><div aria-hidden="true">${inner}</div></div>`;
  }
  function icons(foods) { return foods.map(f => `<img class="ico" src="${ART.food[f]}" alt="" title="${esc(foodName(f))}">`).join(''); }
  function eggRow(n, cap) {
    let h = '';
    for (let i = 0; i < cap; i++) h += `<img class="egg" src="${i < n ? ART.egg : ART.eggOutline}" alt="">`;
    return h;
  }

  function birdCard(card, key, opts = {}) {
    const b = card.bird; const slot = opts.slot;
    const pw = b.power;
    const pcls = !pw ? 'none' : pw.green ? 'green' : 'brown';
    const pwText = pw ? powerText(pw) : 'No power';
    let inner = `
      <div class="c-top"><span class="c-cost">${icons(b.food)}${b.eggCost ? `<img class="ico" src="${ART.egg}" alt="" title="egg">` : ''}${!b.food.length && !b.eggCost ? '<span class="free">Free</span>' : ''}</span>
        <span class="c-pts" title="points"><b>${b.points}</b><small>pts</small></span></div>
      <div class="c-name">${esc(b.name)}</div>
      <div class="c-sci">${esc(b.sci)}</div>
      <img class="c-art" src="${ART.bird[b.id]}" alt="">
      <div class="c-stats"><span title="egg limit"><img class="egg sm" src="${ART.egg}" alt="">≤ ${b.eggLimit}</span><span title="wingspan">${b.wingspan} cm</span></div>
      <div class="c-power ${pcls}">${pw ? (pw.green ? '<span class="tag">Ongoing</span> ' : '<span class="tag">When activated</span> ') : ''}${esc(pw ? pwText.replace(/^Ongoing: /, '') : 'No power')}</div>`;
    if (!opts.mini) inner += `<div class="c-fact">${esc(b.fact)}</div>`;
    if (slot) inner += `<div class="c-state"><span class="eggs">${eggRow(slot.eggs, b.eggLimit)}</span>${slot.tucked.length ? `<span class="tucked">+${slot.tucked.length} tucked</span>` : ''}</div>`;
    if (opts.token) inner = `<div class="token">▶ Activating</div>` + inner;
    if (opts.foodSide) inner += `<div class="c-back">Food side: ${icons(card.food)} ${esc(foodCardName(card))}</div>`;
    const desc = (opts.prefix || '') + birdDesc(card, slot) + (opts.foodSide ? ` Food side: ${foodCardName(card)}.` : '') + (opts.token ? ' Currently activating.' : '');
    return wrap(key, `card bird ${pcls}-pw${opts.mini ? ' mini' : ''}${opts.token ? ' is-token' : ''}`, desc, inner);
  }
  function foodCard(card, key) {
    const inner = `<div class="f-icons">${icons(card.food)}</div><div class="f-name">${esc(foodCardName(card))}</div><div class="f-sub">Food card</div>`;
    return wrap(key, 'card food', `Food card: ${foodCardName(card)}.`, inner);
  }
  function nestCard(p, mini) {
    const key = 'nest:' + p.id;
    let inner = `<div class="n-title">${p.automa ? "Automa's Nest" : 'Nest'}</div>
      <div class="n-eggs">${eggRow(p.nestEggs, NEST_LIMIT)}</div>`;
    if (p.automa) inner += `<div class="n-stat">${p.tucked.length} tucked · ${p.reserve.length} food cards</div><div class="n-sub">Birds 3 pts · Nest eggs 3 pts</div>`;
    else inner += `<div class="n-sub">Holds up to 3 eggs. Start of the Flock: brown powers activate left to right after your Nest action.</div>`;
    const desc = p.automa ? `Automa's Nest: ${p.nestEggs} of 3 eggs, ${p.tucked.length} tucked cards, ${p.reserve.length} food cards in her Reserve.` : `${p.name}'s Nest: ${p.nestEggs} of 3 eggs.`;
    return wrap(key, `card nest${mini ? ' mini' : ''}${G.token.p === p.id && G.token.i === -1 ? ' is-home' : ''}`, desc, inner);
  }
  function deckBox(i) {
    const d = G.decks[i]; const top = deckTop(i);
    const key = 'deck:' + i;
    const inner = top ? `<div class="f-icons">${icons(top.food)}</div><div class="f-name">${esc(foodCardName(top))}</div><div class="f-sub">Deck ${i + 1} · ${d.length} card${d.length === 1 ? '' : 's'}</div>`
      : `<div class="f-name">Empty</div><div class="f-sub">Deck ${i + 1}</div>`;
    const desc = top ? `Food deck ${i + 1}, ${d.length} cards. Top card: ${foodCardName(top)}.` : `Food deck ${i + 1} is empty.`;
    return wrap(key, 'card food deck', desc, inner);
  }

  /* ---------- render ---------- */
  function viewPlayer() {
    if (pending && pending.player !== undefined && !G.players[pending.player].automa) return G.players[pending.player];
    if (!G.players[G.cur].automa) return G.players[G.cur];
    return G.players.find(p => !p.automa);
  }

  function render() {
    if (!G) return;
    const me = viewPlayer();
    $('prompt').innerHTML = promptHTML();
    $('supply').innerHTML = supplyHTML();
    $('board-me').innerHTML = playerHTML(me, false);
    $('board-others').innerHTML = G.players.filter(p => p !== me).map(p => playerHTML(p, true)).join('');
    $('log-list').innerHTML = G.log.slice(-40).reverse().map(l => `<li class="${l.cls || ''}">${esc(l.msg)}</li>`).join('');
    $('round').textContent = `Round ${G.round}${G.endTriggered ? ' · final round' : ''}`;
    if (pending && pending.multi) updateMultiStatus();
  }

  function promptHTML() {
    if (!pending) return `<h2 id="prompt-title" tabindex="-1">Working…</h2>`;
    const p = G.players[pending.player];
    const who = p ? `<span class="who ${p.automa ? 'automa' : ''}">${esc(p.name)}</span>` : '';
    let h = `<div class="prompt-head">${who}<h2 id="prompt-title" tabindex="-1">${esc(pending.title)}</h2></div>`;
    if (G.flash) h += `<p class="flash" role="status">${esc(G.flash)}</p>`;
    h += `<p class="prompt-text">${esc(pending.prompt)}</p>`;
    if (pending.automaTurn && G.automaCard) h += automaCardHTML(G.automaCard);
    if (pending.multi) h += `<p id="multi-status" class="multi-status" aria-live="polite"></p>`;
    if (pending.targets && pending.targets.length) h += `<p class="hint">Selectable cards are outlined and marked “Choose”.</p>`;
    const btns = (pending.buttons || []).map(b => `<button type="button" data-act="${b.id}" class="${b.primary ? 'primary' : ''}"${b.disabled ? ' disabled' : ''}${b.needsValid ? ' data-needs-valid' : ''}>${esc(b.label)}</button>`).join('');
    if (btns) h += `<div class="prompt-btns">${btns}</div>`;
    if (pending.startHand !== undefined) {
      const q = G.players[pending.startHand];
      h += `<div class="row start-hand">${q.hand.map((c, i) => birdCard(c, `hand:${q.id}:${i}`, { foodSide: true, mini: true })).join('')}</div>`;
    }
    return h;
  }

  function automaCardHTML(ac) {
    const cells = [0, 1, 2, 3].map(i => `<span class="ac-cell">${ac.food.includes(i) ? 'Food' : ''}${ac.tuck.includes(i) ? (ac.food.includes(i) ? ' + ' : '') + 'Tuck' : ''}${!ac.food.includes(i) && !ac.tuck.includes(i) ? '—' : ''}</span>`).join('');
    return `<div class="automa-card" aria-label="Automa card ${esc(ac.id)}">
      <div class="ac-row"><span class="ac-n">1</span><span class="ac-label">Gain</span><span class="ac-grid">${cells}</span></div>
      <div class="ac-row"><span class="ac-n">2</span><span class="ac-label">Play</span><span>${ac.cost} food → ${ac.sel === 'goal' ? 'goal-based bird' : 'bird in slot ' + (ac.sel + 1)} <span class="ac-arrow">${ac.arrow === 'ltr' ? '→' : '←'}</span></span></div>
      <div class="ac-row"><span class="ac-n">3</span><span class="ac-label">Eggs</span><span>${ac.eggs ? eggRow(ac.eggs, ac.eggs) : 'none'}</span></div>
      <div class="ac-id">Card ${esc(ac.id)} · ${G.automaDeck.length} left in deck</div></div>`;
  }

  function supplyHTML() {
    let h = `<h2 class="sec-title">Supply</h2><div class="supply-grid">`;
    for (let i = 0; i < 4; i++) {
      h += `<div class="sup-col"><div class="sup-label" aria-hidden="true">${i + 1}</div>${deckBox(i)}`;
      h += G.slots[i] ? birdCard(G.slots[i], 'slot:' + i, { mini: true, prefix: `Supply slot ${i + 1}: ` }) : `<div class="card empty-slot"><span>Slot ${i + 1} empty<br>refills at end of turn</span></div>`;
      h += `</div>`;
    }
    h += `</div><div class="sup-meta"><div class="discard"><b>Discard pile:</b> ${G.discard.length} card${G.discard.length === 1 ? '' : 's'}${G.discard.length ? ` (top: ${esc(foodCardName(G.discard[G.discard.length - 1]))})` : ''}</div>`;
    if (G.goals.length) {
      h += `<div class="goals"><h3>Goal display</h3><ul>${G.goals.map((g, i) => `<li><span class="g-n">${i + 1}</span><span>+1 point per egg on birds with <b>${esc(g.text)}</b>${g.food ? ` <img class="ico sm" src="${ART.food[g.food]}" alt="">` : ''}${g.pct !== undefined ? ` <small>(${g.pct}% of birds${g.statNote ? ' ' + g.statNote : ''})</small>` : ''}</span></li>`).join('')}</ul></div>`;
    }
    h += `</div>`;
    return h;
  }

  function playerHTML(p, compact) {
    const s = scorePlayer(p);
    const turn = G.players[G.cur] === p;
    let h = `<section class="player ${compact ? 'compact' : ''} ${p.automa ? 'is-automa' : ''}" aria-labelledby="ph-${p.id}">
      <div class="p-head"><h2 class="sec-title" id="ph-${p.id}">${esc(p.name)}${p.automa ? '' : compact ? '' : ' — your Flock'}</h2>
      ${turn ? '<span class="chip now">Taking a turn</span>' : ''}${G.first === p.id ? '<span class="chip">First player</span>' : ''}
      <span class="chip">${p.flock.length} of 6 birds</span><span class="chip score">Score so far: ${s.total}</span></div>`;
    h += `<div class="row flock" aria-label="${esc(p.name)}'s Flock">${nestCard(p, compact)}${p.flock.map((sl, i) => birdCard(sl.card, `bird:${p.id}:${i}`, { slot: sl, mini: compact, token: G.token.p === p.id && G.token.i === i, prefix: `Flock position ${i + 1}: ` })).join('')}</div>`;
    if (!p.automa && p.reserve) {
      const birds = p.reserve.map((r, i) => ({ r, i })).filter(x => x.r.side === 'bird');
      const foods = p.reserve.map((r, i) => ({ r, i })).filter(x => x.r.side === 'food').sort((a, b) => a.r.card.food.join().localeCompare(b.r.card.food.join()));
      h += `<h3 class="sub-title">${compact ? 'Reserve' : 'Your Reserve'} <small>${birds.length} bird${birds.length === 1 ? '' : 's'}, ${foods.length} food</small></h3>`;
      h += `<div class="row reserve">${birds.map(x => birdCard(x.r.card, `res:${p.id}:${x.i}`, { mini: compact, prefix: 'In Reserve: ' })).join('')}${foods.map(x => foodCard(x.r.card, `res:${p.id}:${x.i}`)).join('')}${!p.reserve.length ? '<p class="muted">Empty</p>' : ''}</div>`;
    }
    return h + `</section>`;
  }

  /* ---------- results ---------- */
  function showResults(res) {
    const r = $('results');
    const winners = res.filter(x => x.winner).map(x => x.p.name);
    const gl = G.goals.length;
    const rows = [['Birds', 'birds'], ['Eggs in Nest', 'nestEggs'], ['Eggs on birds', 'birdEggs'], ['Tucked cards', 'tucked']];
    let t = `<table><caption>Final scores</caption><thead><tr><th scope="col">Category</th>${res.map(x => `<th scope="col">${esc(x.p.name)}</th>`).join('')}</tr></thead><tbody>`;
    rows.forEach(([lab, k]) => { t += `<tr><th scope="row">${lab}</th>${res.map(x => `<td>${x.s[k]}</td>`).join('')}</tr>`; });
    for (let i = 0; i < gl; i++) t += `<tr><th scope="row">Goal ${i + 1}</th>${res.map(x => `<td>${x.s.goalParts[i]}</td>`).join('')}</tr>`;
    t += `<tr class="total"><th scope="row">Total</th>${res.map(x => `<td>${x.s.total}</td>`).join('')}</tr></tbody></table>`;
    r.innerHTML = `<h2 id="results-title" tabindex="-1">${winners.length > 1 ? 'Shared victory: ' + esc(winners.join(' and ')) : esc(winners[0]) + (winners[0] === 'You' ? ' win!' : ' wins!')}</h2>
      ${res.some(x => x.p.automa) ? '<p class="muted">Automa scores 3 points per bird and per Nest egg, 1 per egg on birds, 1 per tucked card, plus goals (tuck-capable birds count as having a tucked card).</p>' : ''}
      <div class="table-wrap">${t}</div><div class="prompt-btns"><button type="button" class="primary" id="again">New game</button></div>`;
    r.hidden = false;
    $('prompt').innerHTML = `<h2 tabindex="-1">Game over</h2><p class="prompt-text">Final scores are below.</p>`;
    $('again').addEventListener('click', showSetup);
    $('results-title').focus();
    announce('Game over. ' + (winners.length > 1 ? 'Shared victory.' : winners[0] + ' won.') + ' ' + res.map(x => `${x.p.name} ${x.s.total} points`).join(', '));
  }

  return { boot, ask, render, announce, showResults };
})();
