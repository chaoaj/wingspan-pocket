/* Wingspan Pocket — rules engine.
 * The engine is async: whenever a player must decide something it awaits
 * UI.ask(spec), which resolves with { id } for a button or { key } for a
 * board element (see keys below). Board keys:
 *   slot:i  deck:i  res:p:i  nest:p  bird:p:i
 */

let G = null;

const NEST_LIMIT = 3;
const rnd = n => Math.floor(Math.random() * n);
function shuffleArr(a) { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const foodName = f => FOOD[f].name;
const foodList = arr => arr.map(foodName).join(', ');

function glog(msg, cls) { G.log.push({ msg, cls, turn: G.round }); UI.announce(msg); }
function flash(msg) { G.flash = msg; glog(msg, 'flash'); }

/* ---------- setup ---------- */
function newGame(opts) {
  const deck = shuffleArr(CARDS.map(c => ({ ...c })));
  G = {
    opts, players: [], decks: [[], [], [], []], slots: [null, null, null, null], discard: [],
    goals: [], cur: 0, first: 0, round: 1, endTriggered: false, over: false,
    log: [], flash: '', token: { p: -1, i: -1 }, copiedGreen: {}, automaCard: null, automaLog: [],
  };
  opts.players.forEach((name, i) => G.players.push({ id: i, name, automa: false, nestEggs: 1, flock: [], reserve: [], hand: deck.splice(0, 6), turns: 0 }));
  if (opts.automa) {
    G.players.push({ id: G.players.length, name: 'Automa', automa: true, nestEggs: 1, flock: [], reserve: [], tucked: [], turns: 0 });
    let set = AUTOMA_CARDS.slice();
    if (opts.difficulty === 'easy') set = set.filter(c => +c.id <= 6);
    if (opts.difficulty === 'hard') set = set.map(c => AUTOMA_HARD.find(h => h.id === c.id + ' HARD') || c);
    G.automaSet = set;
    G.automaDeck = [];
    automaReshuffle();
  }
  deck.forEach((c, i) => G.decks[i % 4].push(c));
  for (let i = 0; i < 4; i++) G.slots[i] = G.decks[i].pop();
  if (opts.goals || opts.automa) {
    const pool = shuffleArr(GOALS.filter(g => opts.automa ? g.automa : true).slice()).slice(0, 2);
    G.goals = pool.map(g => g.sides[rnd(2)]);
  }
  G.first = rnd(G.players.length);
  G.cur = G.first;
  return G;
}

async function startGame() {
  for (const p of G.players) {
    if (p.automa) continue;
    let birdIdx = [0, 1];
    if (G.opts.chooseStart) {
      UI.render();
      const r = await UI.ask({ player: p.id, title: `${p.name}: choose your starting birds`,
        prompt: 'Pick exactly 2 of your 6 cards to keep bird-side up. The other 4 become food.',
        startHand: p.id, multi: { keys: p.hand.map((c, i) => `hand:${p.id}:${i}`), min: 2, max: 2, preselect: ['hand:' + p.id + ':0', 'hand:' + p.id + ':1'] },
        buttons: [{ id: 'ok', label: 'Keep these birds', primary: true, needsValid: true }] });
      birdIdx = r.selected.map(k => +k.split(':')[2]);
    }
    p.reserve = p.hand.map((card, i) => ({ card, side: birdIdx.includes(i) ? 'bird' : 'food' }));
    delete p.hand;
  }
  glog(`${G.players[G.first].name} takes the first turn.`);
  while (!G.over) {
    const p = G.players[G.cur];
    G.flash = '';
    if (p.automa) await automaTurn(p); else await humanTurn(p);
    endOfTurn(p);
  }
  UI.render();
  UI.showResults(scoreAll());
}

/* ---------- supply ---------- */
function ensureDeck(i) {
  if (G.decks[i].length > 0) return;
  if (G.discard.length > 0) {
    const n = Math.ceil(G.discard.length / 2);
    G.decks[i] = shuffleArr(G.discard.splice(0, n));
    glog(`Food deck ${i + 1} ran out and was rebuilt from the bottom half of the discard pile.`);
    return;
  }
  let big = -1;
  G.decks.forEach((d, j) => { if (j !== i && (big < 0 || d.length > G.decks[big].length)) big = j; });
  if (big < 0 || G.decks[big].length <= 2) {
    if (!G.endTriggered) { G.endTriggered = true; glog('The food decks are exhausted. The game will end after this round.', 'flash'); }
    return;
  }
  const n = Math.floor(G.decks[big].length / 2);
  G.decks[i] = shuffleArr(G.decks[big].splice(0, n));
  glog(`Food deck ${i + 1} ran out and was rebuilt from the bottom half of deck ${big + 1}.`);
}
function deckTop(i) { const d = G.decks[i]; return d.length ? d[d.length - 1] : null; }
function drawFromDeck(i) { const c = G.decks[i].pop(); ensureDeck(i); return c; }
function refillSlots() {
  for (let i = 0; i < 4; i++) if (!G.slots[i]) { ensureDeck(i); if (G.decks[i].length) G.slots[i] = G.decks[i].pop(); ensureDeck(i); }
}
function topSig(i) { const c = deckTop(i); return c ? c.food.slice().sort().join('/') : null; }
function tripleSig() {
  const counts = {};
  for (let i = 0; i < 4; i++) { const s = topSig(i); if (s) counts[s] = (counts[s] || 0) + 1; }
  return Object.keys(counts).find(s => counts[s] >= 3) || null;
}
function discardTriple() {
  const sig = tripleSig(); if (!sig) return;
  for (let i = 0; i < 4; i++) if (topSig(i) === sig) { G.discard.push(G.decks[i].pop()); ensureDeck(i); }
  glog(`Discarded the matching ${sig.split('/').map(foodName).join(' or ')} cards from the top of the food decks.`);
}
function gainFromKey(p, key) {
  const [k, a] = key.split(':'); const i = +a;
  if (k === 'slot') { const c = G.slots[i]; G.slots[i] = null; p.reserve.push({ card: c, side: 'bird' }); glog(`${p.name} took ${c.bird.name} (bird) from the supply.`); return c; }
  const c = drawFromDeck(i); p.reserve.push({ card: c, side: 'food' }); glog(`${p.name} drew a ${c.food.map(foodName).join(' / ')} food card from deck ${i + 1}.`); return c;
}
function supplyKeys() {
  const ks = [];
  G.slots.forEach((c, i) => { if (c) ks.push('slot:' + i); });
  G.decks.forEach((d, i) => { if (d.length) ks.push('deck:' + i); });
  return ks;
}

/* ---------- green powers ---------- */
function greensOf(p) {
  const out = [];
  p.flock.forEach(s => { const pw = s.card.bird.power; if (pw && pw.green && pw.t !== 'copy') out.push(pw); });
  (G.copiedGreen[p.id] || []).forEach(pw => out.push(pw));
  return out;
}
function wildFoods(p) { return new Set(greensOf(p).filter(g => g.t === 'wild').map(g => g.food)); }
function powAny(p, f) { return !!f && greensOf(p).some(g => g.t === 'powany' && g.food === f); }

/* ---------- payment ---------- */
function effectiveCost(p, bird) {
  const reqs = bird.food.slice();
  greensOf(p).filter(g => g.t === 'ignore').forEach(g => { const i = reqs.indexOf(g.food); if (i >= 0) reqs.splice(i, 1); });
  // specific foods first, wildcards last
  reqs.sort((a, b) => (a === 'W') - (b === 'W'));
  return reqs;
}
function matches(r, food, wild) { return r === 'W' || food.includes(r) || food.some(f => wild.has(f)); }
function solvePay(reqs, foods, wild) {
  if (!reqs.length) return foods.length === 0;
  if (foods.length < reqs.length) return false;
  const r = reqs[0], rest = reqs.slice(1);
  for (let i = 0; i < foods.length; i++) {
    if (matches(r, foods[i], wild) && solvePay(rest, foods.filter((_, k) => k !== i), wild)) return true;
  }
  for (let i = 0; i < foods.length; i++) for (let j = i + 1; j < foods.length; j++) {
    if (solvePay(rest, foods.filter((_, k) => k !== i && k !== j), wild)) return true;
  }
  return false;
}
function suggestPay(p, reqs) {
  const wild = wildFoods(p);
  const pool = p.reserve.map((r, i) => ({ r, i })).filter(x => x.r.side === 'food');
  // prefer single-food cards and cards that are not wild
  pool.sort((a, b) => a.r.card.food.length - b.r.card.food.length);
  const used = new Set(); const pick = []; const unmet = [];
  for (const r of reqs) {
    let found = pool.find(x => !used.has(x.i) && r !== 'W' && x.r.card.food.includes(r));
    if (!found) found = pool.find(x => !used.has(x.i) && r !== 'W' && x.r.card.food.some(f => wild.has(f)));
    if (!found && r === 'W') found = pool.find(x => !used.has(x.i));
    if (found) { used.add(found.i); pick.push(found.i); } else unmet.push(r);
  }
  for (const r of unmet) {
    const two = pool.filter(x => !used.has(x.i)).slice(0, 2);
    if (two.length < 2) return null;
    two.forEach(x => { used.add(x.i); pick.push(x.i); });
  }
  return pick;
}
function eggTotal(p) { return p.nestEggs + p.flock.reduce((a, s) => a + s.eggs, 0); }
function canAfford(p, bird) {
  if (eggTotal(p) < bird.eggCost) return false;
  return suggestPay(p, effectiveCost(p, bird)) !== null;
}

/* ---------- eggs ---------- */
function eggSpaceKeys(p, exclude = []) {
  const ks = [];
  if (p.nestEggs < NEST_LIMIT) ks.push('nest:' + p.id);
  p.flock.forEach((s, i) => { if (s.eggs < s.card.bird.eggLimit) ks.push(`bird:${p.id}:${i}`); });
  return ks.filter(k => !exclude.includes(k));
}
function eggHolderKeys(p) {
  const ks = [];
  if (p.nestEggs > 0) ks.push('nest:' + p.id);
  p.flock.forEach((s, i) => { if (s.eggs > 0) ks.push(`bird:${p.id}:${i}`); });
  return ks;
}
function addEgg(p, key) { if (key.startsWith('nest')) p.nestEggs++; else p.flock[+key.split(':')[2]].eggs++; }
function removeEgg(p, key) { if (key.startsWith('nest')) p.nestEggs--; else p.flock[+key.split(':')[2]].eggs--; }
function cardLabel(p, key) { return key.startsWith('nest') ? 'the Nest' : p.flock[+key.split(':')[2]].card.bird.name; }

/* ---------- human turn ---------- */
async function humanTurn(p) {
  G.token = { p: p.id, i: -1 };
  await chooseCopiedGreen(p);
  let done = false;
  while (!done) {
    const playable = p.reserve.some(r => r.side === 'bird' && canAfford(p, r.card.bird));
    const r = await UI.ask({ player: p.id, title: `${p.name}: choose a Nest action`,
      prompt: playable ? 'Play a bird, draw 2 cards, or lay up to 3 eggs.' : 'You cannot afford any bird in your Reserve right now. Draw 2 cards or lay up to 3 eggs.',
      buttons: [
        { id: 'play', label: 'Play a bird', disabled: !playable, primary: true },
        { id: 'draw', label: 'Draw 2 cards' },
        { id: 'lay', label: 'Lay up to 3 eggs' }] });
    if (r.id === 'play') done = await actPlay(p);
    else if (r.id === 'draw') { await actDraw(p); done = true; }
    else { await actLay(p); done = true; }
  }
  await activateFlock(p);
  G.token = { p: -1, i: -1 };
}

async function chooseCopiedGreen(p) {
  G.copiedGreen[p.id] = [];
  const copiers = p.flock.filter(s => s.card.bird.power && s.card.bird.power.t === 'copy' && s.card.bird.power.green);
  for (const s of copiers) {
    const keys = [];
    G.players.forEach(q => { if (q.id !== p.id) q.flock.forEach((t, i) => { const pw = t.card.bird.power; if (pw && pw.green && pw.t !== 'copy') keys.push(`bird:${q.id}:${i}`); }); });
    if (!keys.length) continue;
    const r = await UI.ask({ player: p.id, title: `${s.card.bird.name}: copy a green power`,
      prompt: 'Choose a green power in another Flock. It works for you for this whole turn.', targets: keys,
      buttons: [{ id: 'skip', label: 'Do not copy' }] });
    if (r.key) {
      const [, q, i] = r.key.split(':'); const src = G.players[+q].flock[+i].card.bird;
      G.copiedGreen[p.id].push(src.power);
      glog(`${p.name}'s ${s.card.bird.name} copies the green power of ${src.name}.`);
    }
  }
}

async function actPlay(p) {
  const birdKeys = p.reserve.map((r, i) => (r.side === 'bird' && canAfford(p, r.card.bird)) ? `res:${p.id}:${i}` : null).filter(Boolean);
  const r = await UI.ask({ player: p.id, title: 'Play a bird', prompt: 'Choose a bird in your Reserve. Only birds you can afford are selectable.',
    targets: birdKeys, buttons: [{ id: 'back', label: 'Back' }] });
  if (r.id === 'back') return false;
  const ri = +r.key.split(':')[2];
  const bird = p.reserve[ri].card.bird;
  const reqs = effectiveCost(p, bird);
  const wild = wildFoods(p);
  let payIdx = [];
  if (reqs.length) {
    const sug = suggestPay(p, reqs) || [];
    const foodKeys = p.reserve.map((x, i) => x.side === 'food' ? `res:${p.id}:${i}` : null).filter(Boolean);
    const validate = keys => solvePay(reqs, keys.map(k => p.reserve[+k.split(':')[2]].card.food), wild);
    const reqText = reqs.map(foodName).join(', ');
    const pay = await UI.ask({ player: p.id, title: `Pay for ${bird.name}`,
      prompt: `Cost: ${reqText}${bird.eggCost ? ` + ${bird.eggCost} egg` : ''}. Select the food cards to discard. Any 2 food cards can stand in for 1 food. A suggestion is preselected.`,
      multi: { keys: foodKeys, preselect: sug.map(i => `res:${p.id}:${i}`), validate },
      buttons: [{ id: 'ok', label: 'Pay and play', primary: true, needsValid: true }, { id: 'back', label: 'Back' }] });
    if (pay.id === 'back') return false;
    payIdx = pay.selected.map(k => +k.split(':')[2]);
  }
  const eggKeys = [];
  for (let e = 0; e < bird.eggCost; e++) {
    const holders = eggHolderKeys(p).filter(k => eggKeys.filter(x => x === k).length < eggCountAt(p, k));
    const er = await UI.ask({ player: p.id, title: `Pay an egg for ${bird.name}`, prompt: 'Choose a card to remove 1 egg from.', targets: holders });
    eggKeys.push(er.key);
  }
  // commit
  eggKeys.forEach(k => removeEgg(p, k));
  const card = p.reserve[ri].card;
  const paid = payIdx.map(i => p.reserve[i].card);
  p.reserve = p.reserve.filter((_, i) => i !== ri && !payIdx.includes(i));
  G.discard.push(...paid);
  p.flock.push({ card, eggs: 0, tucked: [] });
  glog(`${p.name} played ${bird.name}${paid.length ? `, discarding ${paid.length} food card${paid.length > 1 ? 's' : ''}` : ''}${eggKeys.length ? ` and ${eggKeys.length} egg` : ''}.`);
  if (bird.power && bird.power.green && bird.power.t === 'copy') await chooseCopiedGreen(p);
  return true;
}
function eggCountAt(p, k) { return k.startsWith('nest') ? p.nestEggs : p.flock[+k.split(':')[2]].eggs; }

async function actDraw(p) {
  for (let n = 0; n < 2; n++) {
    const keys = supplyKeys();
    if (!keys.length) { glog('The supply is empty.'); return; }
    const trip = tripleSig();
    const btns = [];
    if (trip) btns.push({ id: 'triple', label: 'Discard the 3+ matching food cards' });
    const r = await UI.ask({ player: p.id, title: `Draw 2 cards (${n + 1} of 2)`,
      prompt: 'Take a face-up bird from the supply, or the top card of a food deck. Food decks refill right away; bird slots refill at the end of your turn.',
      targets: keys, buttons: btns });
    if (r.id === 'triple') { discardTriple(); n--; continue; }
    gainFromKey(p, r.key);
  }
}

async function actLay(p) {
  const used = [];
  for (let n = 0; n < 3; n++) {
    const keys = eggSpaceKeys(p, used);
    if (!keys.length) { if (n === 0) glog(`${p.name} has no room for eggs.`); break; }
    const r = await UI.ask({ player: p.id, title: `Lay eggs (${n + 1} of 3)`, prompt: 'Choose a card with room for an egg. Each egg must go on a different card.',
      targets: keys, buttons: [{ id: 'done', label: n ? 'Done laying' : 'Lay no eggs' }] });
    if (r.id === 'done') break;
    addEgg(p, r.key); used.push(r.key);
    glog(`${p.name} laid an egg on ${cardLabel(p, r.key)}.`);
  }
}

/* ---------- brown powers ---------- */
async function activateFlock(p) {
  for (let i = 0; i < p.flock.length; i++) {
    const s = p.flock[i]; const pw = s.card.bird.power;
    if (!pw || pw.green) continue;
    G.token = { p: p.id, i };
    const can = canActivate(p, pw);
    const r = await UI.ask({ player: p.id, title: `Activate ${s.card.bird.name}?`, prompt: powerText(pw) + (can ? '' : ' (You cannot pay this power\'s cost right now.)'),
      focusKey: `bird:${p.id}:${i}`,
      buttons: [{ id: 'yes', label: 'Activate', disabled: !can, primary: true }, { id: 'no', label: 'Skip' }] });
    if (r.id === 'yes') await runPower(p, s, pw);
  }
}

function canPayStep(p, st) {
  if (st.t === 'degg') return eggTotal(p) > 0;
  if (st.t === 'dcard') return reserveKeys(p, st).length > 0;
  return true;
}
function canActivate(p, pw) {
  if (pw.gain.some(s => s.t === 'copy')) return copyTargets(p).length > 0;
  return pw.cost.every(st => canPayStep(p, st));
}
function copyTargets(p) {
  const keys = [];
  G.players.forEach(q => { if (q.id !== p.id) q.flock.forEach((t, i) => {
    const pw = t.card.bird.power;
    if (pw && !pw.green && !pw.gain.some(s => s.t === 'copy') && canActivate(p, pw)) keys.push(`bird:${q.id}:${i}`);
  }); });
  return keys;
}
function reserveKeys(p, st) {
  return p.reserve.map((r, i) => {
    let ok;
    if (st.what === 'any') ok = true;
    else if (st.what === 'bird') ok = r.side === 'bird';
    else ok = r.side === 'food' && (!st.food || st.food === 'W' || powAny(p, st.food) || r.card.food.includes(st.food));
    return ok ? `res:${p.id}:${i}` : null;
  }).filter(Boolean);
}

async function runPower(p, host, pw) {
  for (const st of pw.cost) await doStep(p, host, st, true);
  for (const st of pw.gain) await doStep(p, host, st, false);
}

async function doStep(p, host, st, mandatory) {
  const hostName = host.card.bird.name;
  const skip = mandatory ? [] : [{ id: 'skip', label: 'Skip' }];
  const title = `${hostName}: ${stepText(st)}`;
  switch (st.t) {
    case 'draw': {
      let keys;
      if (st.what === 'any') keys = supplyKeys();
      else if (st.what === 'bird') keys = G.slots.map((c, i) => c && (!st.food || powAny(p, st.food) || c.bird.food.includes(st.food)) ? 'slot:' + i : null).filter(Boolean);
      else keys = G.decks.map((d, i) => d.length && (st.food === 'W' || powAny(p, st.food) || deckTop(i).food.includes(st.food)) ? 'deck:' + i : null).filter(Boolean);
      if (!keys.length) { flash(`${hostName}: nothing in the supply matches.`); return; }
      const r = await UI.ask({ player: p.id, title, prompt: 'Choose a matching card from the supply.', targets: keys, buttons: skip });
      if (r.key) gainFromKey(p, r.key);
      return;
    }
    case 'tuck': {
      const keys = reserveKeys(p, { what: st.what === 'bird' ? 'bird' : 'food', food: st.food });
      if (!keys.length) { flash(`${hostName}: you have no matching card to tuck.`); return; }
      const r = await UI.ask({ player: p.id, title, prompt: `Choose a card in your Reserve to tuck behind ${hostName} (1 point).`, targets: keys, buttons: skip });
      if (r.key) { const i = +r.key.split(':')[2]; const c = p.reserve.splice(i, 1)[0]; host.tucked.push(c.card); glog(`${p.name} tucked a card behind ${hostName}.`); }
      return;
    }
    case 'hunt': {
      const keys = G.decks.map((d, i) => d.length ? 'deck:' + i : null).filter(Boolean);
      if (!keys.length) return;
      const r = await UI.ask({ player: p.id, title, prompt: `Choose a food deck. Its top card's bird side is revealed: if the wingspan is under ${st.max} cm it is tucked behind ${hostName}; otherwise it is discarded.`, targets: keys, buttons: skip });
      if (!r.key) return;
      const c = drawFromDeck(+r.key.split(':')[1]);
      if (c.bird.wingspan < st.max) { host.tucked.push(c); flash(`Hunt success! ${c.bird.name} (${c.bird.wingspan} cm) was tucked behind ${hostName}.`); }
      else { G.discard.push(c); flash(`Hunt failed. ${c.bird.name} (${c.bird.wingspan} cm) was too large and was discarded.`); }
      return;
    }
    case 'lay': {
      const keys = eggSpaceKeys(p);
      if (!keys.length) { flash(`${hostName}: no card has room for an egg.`); return; }
      const r = await UI.ask({ player: p.id, title, prompt: 'Choose a card with room for an egg.', targets: keys, buttons: skip });
      if (r.key) { addEgg(p, r.key); glog(`${p.name} laid an egg on ${cardLabel(p, r.key)}.`); }
      return;
    }
    case 'degg': {
      const r = await UI.ask({ player: p.id, title, prompt: 'Choose a card to discard 1 egg from.', targets: eggHolderKeys(p) });
      removeEgg(p, r.key); glog(`${p.name} discarded an egg from ${cardLabel(p, r.key)}.`);
      return;
    }
    case 'dcard': {
      const r = await UI.ask({ player: p.id, title, prompt: 'Choose a card in your Reserve to discard.', targets: reserveKeys(p, st) });
      const i = +r.key.split(':')[2]; const c = p.reserve.splice(i, 1)[0]; G.discard.push(c.card);
      glog(`${p.name} discarded a card from their Reserve.`);
      return;
    }
    case 'alldraw': {
      const keys = G.decks.map((d, i) => d.length ? 'deck:' + i : null).filter(Boolean);
      if (!keys.length) return;
      const r = await UI.ask({ player: p.id, title, prompt: 'Choose 1 food deck. Every player draws its top card, starting with you.', targets: keys, buttons: skip });
      if (!r.key) return;
      const d = +r.key.split(':')[1];
      const n = G.players.length;
      for (let k = 0; k < n; k++) {
        const q = G.players[(p.id + k) % n];
        if (q.automa) {
          if (G.discard.length) { q.tucked.push(G.discard.pop()); glog('Automa tucked a card from the discard pile under her Nest.'); }
        } else if (G.decks[d].length) gainFromKey(q, 'deck:' + d);
      }
      return;
    }
    case 'copy': {
      const keys = copyTargets(p);
      const r = await UI.ask({ player: p.id, title, prompt: 'Choose a bird with a brown power in another Flock. You use its power as if it were this bird.', targets: keys, buttons: skip });
      if (!r.key) return;
      const [, q, i] = r.key.split(':'); const src = G.players[+q].flock[+i].card.bird;
      glog(`${p.name}'s ${hostName} copies ${src.name}.`);
      await runPower(p, host, src.power);
      return;
    }
  }
}

/* ---------- text ---------- */
function stepText(st) {
  switch (st.t) {
    case 'draw':
      if (st.what === 'any') return 'draw any 1 card';
      if (st.what === 'bird') return st.food ? `draw 1 bird with ${foodName(st.food)} in its cost` : 'draw 1 bird from the supply';
      return st.food === 'W' ? 'draw 1 food card of any type' : `draw 1 ${foodName(st.food)} food card`;
    case 'tuck': return st.what === 'bird' ? 'tuck a bird card from your Reserve' : `tuck a ${foodName(st.food)} card from your Reserve`;
    case 'hunt': return `hunt for a bird with wingspan under ${st.max} cm`;
    case 'lay': return 'lay 1 egg';
    case 'degg': return 'discard 1 egg';
    case 'dcard': return st.what === 'any' ? 'discard 1 card from your Reserve' : st.what === 'bird' ? 'discard 1 bird card from your Reserve' : `discard 1 ${foodName(st.food)} card`;
    case 'alldraw': return 'all players draw 1 card from the same food deck';
    case 'copy': return 'copy a brown power in another Flock';
  }
  return '';
}
function powerText(pw) {
  if (!pw) return 'No power.';
  if (pw.green) {
    if (pw.t === 'ignore') return `Ongoing: ignore 1 ${foodName(pw.food)} in bird costs.`;
    if (pw.t === 'wild') return `Ongoing: use ${foodName(pw.food)} as any food when playing birds.`;
    if (pw.t === 'powany') return `Ongoing: ${foodName(pw.food)} in powers counts as any food.`;
    return 'Ongoing: copy 1 green power in another Flock.';
  }
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  if (pw.cost.length) {
    const g = groupGain(pw.gain);
    return `${cap(pw.cost.map(stepText).join(' and '))} to ${g}.`;
  }
  if (pw.either) return `${cap(pw.gain.map(stepText).join(', and/or '))}.`;
  return cap(groupGain(pw.gain)) + '.';
}
function groupGain(steps) {
  if (steps.length === 2 && steps[0].t === steps[1].t && steps[0].what === steps[1].what) {
    const t = stepText(steps[0]);
    return t.replace('draw any 1 card', 'draw any 2 cards').replace('lay 1 egg', 'lay 2 eggs').replace(/\b1 /, '2 ');
  }
  return steps.map(stepText).join(' and ');
}

/* ---------- Automa ---------- */
function automaReshuffle() {
  G.automaDeck = shuffleArr(G.automaSet.slice());
  if (G.opts.difficulty !== 'easy') G.automaDeck.pop(); // set aside unseen
}
function automaGoalScore(card) {
  const fake = { card, eggs: 0, tucked: [] };
  return G.goals.filter(g => g.test(fake, [], 0, true)).length;
}
async function automaTurn(a) {
  if (!G.automaDeck.length) { automaReshuffle(); glog('Automa shuffled her deck.'); }
  const ac = G.automaDeck.pop();
  G.automaCard = ac;
  const steps = [];
  ac.food.forEach(i => { if (G.decks[i].length) { const c = drawFromDeck(i); a.reserve.push({ card: c, side: 'food' }); steps.push(`Took a food card from deck ${i + 1}.`); } });
  ac.tuck.forEach(i => { const c = G.slots[i]; if (c) { G.slots[i] = null; a.tucked.push(c); steps.push(`Tucked ${c.bird.name} from supply slot ${i + 1} under her Nest.`); } });
  if (a.reserve.length >= ac.cost) {
    G.discard.push(...a.reserve.splice(0, ac.cost).map(r => r.card));
    let eggMsg = 'She had no egg to return.';
    if (a.nestEggs > 0) { a.nestEggs--; eggMsg = 'Returned 1 egg from her Nest.'; }
    else { const s = a.flock.find(s => s.eggs > 0); if (s) { s.eggs--; eggMsg = `Returned 1 egg from ${s.card.bird.name}.`; } }
    let pick = -1;
    const order = ac.arrow === 'ltr' ? [0, 1, 2, 3] : [3, 2, 1, 0];
    if (ac.sel === 'goal') {
      let best = -1, bestEgg = -1;
      for (const i of order) {
        const c = G.slots[i]; if (!c) continue;
        const sc = automaGoalScore(c);
        if (sc > best || (sc === best && c.bird.eggLimit > bestEgg)) { best = sc; bestEgg = c.bird.eggLimit; pick = i; }
      }
    } else {
      const start = order.indexOf(ac.sel);
      for (let k = 0; k < 4; k++) { const i = order[(start + k) % 4]; if (G.slots[i]) { pick = i; break; } }
    }
    if (pick >= 0) {
      const c = G.slots[pick]; G.slots[pick] = null;
      a.flock.push({ card: c, eggs: 0, tucked: [] });
      steps.push(`Paid ${ac.cost} food cards. ${eggMsg} Added ${c.bird.name} to her Flock (${ac.sel === 'goal' ? 'goal-based pick' : 'supply slot ' + (ac.sel + 1)}).`);
    } else steps.push(`Paid ${ac.cost} food cards. ${eggMsg} The bird supply was empty.`);
  } else steps.push(`She has ${a.reserve.length} food card${a.reserve.length === 1 ? '' : 's'}, short of ${ac.cost}, so she plays no bird.`);
  for (let e = 0; e < ac.eggs; e++) {
    let placed = false;
    for (let i = a.flock.length - 1; i >= 0; i--) { const s = a.flock[i]; if (s.eggs < s.card.bird.eggLimit) { s.eggs++; steps.push(`Laid an egg on ${s.card.bird.name}.`); placed = true; break; } }
    if (!placed && a.nestEggs < NEST_LIMIT) { a.nestEggs++; steps.push('Laid an egg in her Nest.'); placed = true; }
    if (!placed) steps.push('Had no room to lay an egg.');
  }
  G.automaLog = steps;
  glog(`Automa revealed card ${ac.id}. ` + steps.join(' '));
  await UI.ask({ player: a.id, automaTurn: true, title: `Automa's turn (card ${ac.id})`, prompt: steps.join(' '), buttons: [{ id: 'ok', label: 'Continue', primary: true }] });
}

/* ---------- end of turn & scoring ---------- */
function endOfTurn(p) {
  refillSlots();
  p.turns++;
  if (!G.endTriggered && G.players.some(q => q.flock.length >= 6)) {
    G.endTriggered = true;
    glog(`${p.name} has 6 birds. The game ends once every player has taken the same number of turns.`, 'flash');
  }
  const next = (G.cur + 1) % G.players.length;
  if (G.endTriggered && next === G.first) { G.over = true; glog('Game over!', 'flash'); return; }
  if (next === G.first) G.round++;
  G.cur = next;
}

function goalPoints(p) {
  return G.goals.map(g => p.flock.reduce((a, s, i) => a + (g.test(s, p.flock, i, p.automa) ? s.eggs : 0), 0));
}
function scorePlayer(p) {
  const gp = goalPoints(p);
  const goals = gp.reduce((a, b) => a + b, 0);
  const birdEggs = p.flock.reduce((a, s) => a + s.eggs, 0);
  if (p.automa) {
    const rows = { birds: p.flock.length * 3, nestEggs: p.nestEggs * 3, birdEggs, tucked: p.tucked.length, goals, goalParts: gp };
    rows.total = rows.birds + rows.nestEggs + rows.birdEggs + rows.tucked + goals;
    return rows;
  }
  const rows = { birds: p.flock.reduce((a, s) => a + s.card.bird.points, 0), nestEggs: p.nestEggs, birdEggs, tucked: p.flock.reduce((a, s) => a + s.tucked.length, 0), goals, goalParts: gp };
  rows.total = rows.birds + rows.nestEggs + rows.birdEggs + rows.tucked + goals;
  return rows;
}
function scoreAll() {
  const res = G.players.map(p => ({ p, s: scorePlayer(p), reserve: p.reserve.length }));
  const best = Math.max(...res.map(r => r.s.total));
  let top = res.filter(r => r.s.total === best);
  if (top.length > 1) { const br = Math.max(...top.map(r => r.reserve)); top = top.filter(r => r.reserve === br); }
  top.forEach(r => r.winner = true);
  return res;
}
