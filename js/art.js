/* Wingspan Pocket — original procedural artwork drawn with p5.js.
 * Every bird portrait is generated from a small shape/color recipe in data.js,
 * so none of the published card illustrations are reproduced.
 * Images are rendered once to off-screen p5.Graphics and cached as data URLs.
 */

const ART = { bird: {}, food: {}, egg: null, eggOutline: null };

const FOOD_STYLE = {
  I: { bg: '#f1d2a8', ink: '#6b3d16' },
  S: { bg: '#f3e09a', ink: '#7a5a0c' },
  F: { bg: '#a9d0f0', ink: '#174a78' },
  R: { bg: '#f5b3b3', ink: '#8e1426' },
  M: { bg: '#d3cdc5', ink: '#3e3934' },
};

function setup() {
  noCanvas();
  const status = document.getElementById('loading-status');
  // Generate in small batches so the loading message can update.
  const jobs = [];
  FOOD_TYPES.concat(['W']).forEach(f => jobs.push(() => { ART.food[f] = foodIcon(f); }));
  jobs.push(() => { ART.egg = eggIcon(false); ART.eggOutline = eggIcon(true); });
  BIRDS.forEach(b => jobs.push(() => { ART.bird[b.id] = birdArt(b); }));
  let k = 0;
  function step() {
    const end = Math.min(jobs.length, k + 6);
    for (; k < end; k++) jobs[k]();
    if (status) status.textContent = `Painting birds… ${Math.round(100 * k / jobs.length)}%`;
    if (k < jobs.length) setTimeout(step, 0); else UI.boot();
  }
  step();
}

/* ---------- helpers ---------- */
function shade(g, hex, amt) { return g.lerpColor(g.color(hex), g.color(amt < 0 ? '#000000' : '#ffffff'), Math.abs(amt)); }
function toURL(g, type) { const u = g.elt.toDataURL(type || 'image/png', 0.88); g.remove(); return u; }

/* ---------- food icons ---------- */
function foodIcon(f) {
  const g = createGraphics(64, 64); g.pixelDensity(2);
  g.clear();
  if (f === 'W') {
    const cols = ['#f1d2a8', '#f3e09a', '#a9d0f0', '#f5b3b3', '#d3cdc5'];
    g.stroke('#2a2a2a'); g.strokeWeight(2.5);
    for (let i = 0; i < 5; i++) { g.fill(cols[i]); g.arc(32, 32, 56, 56, -HALF_PI + i * TWO_PI / 5, -HALF_PI + (i + 1) * TWO_PI / 5, PIE); }
    g.noFill(); g.circle(32, 32, 56);
    g.fill('#2a2a2a'); g.noStroke(); g.circle(32, 32, 8);
    return toURL(g);
  }
  const st = FOOD_STYLE[f];
  g.stroke('#2a2a2a'); g.strokeWeight(2.5); g.fill(st.bg); g.circle(32, 32, 58);
  g.fill(st.ink); g.stroke(st.ink);
  if (f === 'I') { // caterpillar
    g.noStroke();
    const pts = [[16, 40], [24, 34], [32, 31], [40, 34], [47, 30]];
    pts.forEach(([x, y], i) => g.circle(x, y, i === 4 ? 13 : 12));
    g.stroke(st.ink); g.strokeWeight(2); g.line(47, 25, 44, 17); g.line(50, 25, 54, 18);
    g.stroke(st.bg); g.strokeWeight(1.5); pts.slice(0, 4).forEach(([x, y]) => g.line(x, y - 4, x, y + 4));
    g.noStroke(); g.fill(st.bg); g.circle(49, 29, 3);
  } else if (f === 'S') { // wheat head
    g.strokeWeight(2.5); g.line(32, 54, 32, 12);
    g.noStroke();
    for (let i = 0; i < 4; i++) {
      const y = 20 + i * 8;
      g.push(); g.translate(26, y); g.rotate(-0.6); g.ellipse(0, 0, 12, 6.5); g.pop();
      g.push(); g.translate(38, y); g.rotate(0.6); g.ellipse(0, 0, 12, 6.5); g.pop();
    }
    g.ellipse(32, 13, 6, 10);
  } else if (f === 'F') { // fish
    g.noStroke();
    g.ellipse(30, 32, 34, 18);
    g.triangle(44, 32, 55, 22, 55, 42);
    g.fill(st.bg); g.circle(20, 29, 5);
    g.stroke(st.bg); g.strokeWeight(1.5); g.noFill(); g.arc(28, 32, 10, 14, -HALF_PI, HALF_PI);
  } else if (f === 'R') { // cherries
    g.noFill(); g.stroke('#2f6b2a'); g.strokeWeight(2.5);
    g.bezier(22, 38, 26, 22, 34, 16, 38, 12); g.bezier(42, 40, 42, 26, 40, 18, 38, 12);
    g.noStroke(); g.fill('#2f6b2a'); g.push(); g.translate(43, 13); g.rotate(-0.4); g.ellipse(0, 0, 13, 6); g.pop();
    g.fill(st.ink); g.circle(22, 42, 17); g.circle(42, 44, 17);
    g.fill(255, 255, 255, 160); g.circle(19, 39, 4); g.circle(39, 41, 4);
  } else if (f === 'M') { // mouse
    g.noStroke();
    g.ellipse(30, 38, 32, 20);
    g.ellipse(45, 33, 16, 13);
    g.circle(40, 25, 10); g.fill(st.bg); g.circle(40, 25, 5);
    g.fill(st.bg); g.circle(48, 31, 3);
    g.noFill(); g.stroke(st.ink); g.strokeWeight(2.5); g.bezier(15, 40, 6, 44, 10, 52, 18, 50);
  }
  return toURL(g);
}

function eggIcon(outline) {
  const g = createGraphics(40, 48); g.pixelDensity(2); g.clear();
  g.stroke(outline ? '#6b5a4a' : '#5a4636'); g.strokeWeight(2.2);
  if (outline) { g.drawingContext.setLineDash([3, 3]); g.noFill(); } else g.fill('#f6e2cf');
  g.beginShape();
  for (let a = 0; a < TWO_PI; a += 0.1) {
    const x = 20 + 14 * Math.sin(a);
    const y = 26 - 19 * Math.cos(a) * (Math.cos(a) > 0 ? 1 : 0.8);
    g.vertex(x, y);
  }
  g.endShape(CLOSE);
  if (!outline) { g.noStroke(); g.fill(255, 255, 255, 170); g.ellipse(15, 18, 5, 9); }
  return toURL(g);
}

/* ---------- bird portraits ---------- */
const BODY = {
  perch: { bw: 72, bh: 44, tilt: -0.45, hr: 19, neck: 0, leg: 12, tail: 34, base: 'branch', sc: 1 },
  raptor: { bw: 78, bh: 50, tilt: -0.85, hr: 19, neck: 0, leg: 12, tail: 34, base: 'branch', sc: 0.95 },
  owl: { bw: 78, bh: 60, tilt: -1.5, hr: 28, neck: -10, leg: 10, tail: 16, base: 'branch', sc: 0.92 },
  parrot: { bw: 64, bh: 40, tilt: -1.05, hr: 18, neck: 0, leg: 10, tail: 50, base: 'branch', sc: 0.95 },
  duck: { bw: 100, bh: 40, tilt: 0.05, hr: 17, neck: 16, leg: 0, tail: 16, base: 'water', sc: 1 },
  goose: { bw: 96, bh: 40, tilt: 0.0, hr: 14, neck: 42, leg: 0, tail: 14, base: 'water', sc: 0.9 },
  wader: { bw: 70, bh: 38, tilt: -0.15, hr: 12, neck: 44, leg: 50, tail: 16, base: 'marsh', sc: 0.82 },
  shore: { bw: 64, bh: 38, tilt: -0.2, hr: 14, neck: 12, leg: 28, tail: 20, base: 'sand', sc: 1 },
  upright: { bw: 86, bh: 50, tilt: -1.52, hr: 19, neck: -6, leg: 6, tail: 8, base: 'ice', sc: 0.95 },
  ground: { bw: 94, bh: 58, tilt: -0.15, hr: 12, neck: 30, leg: 30, tail: 30, base: 'grass', sc: 0.82 },
  ratite: { bw: 90, bh: 56, tilt: -0.1, hr: 11, neck: 62, leg: 56, tail: 20, base: 'grass', sc: 0.66 },
  hummer: { bw: 40, bh: 20, tilt: -0.5, hr: 11, neck: 0, leg: 0, tail: 16, base: 'flower', sc: 1.2 },
  soar: { bw: 50, bh: 20, tilt: 0, hr: 11, neck: 4, leg: 0, tail: 18, base: 'sky', sc: 1 },
};
const BG = { branch: '#cfe3d4', water: '#bfd9ea', marsh: '#d2e4cf', sand: '#eadfc6', ice: '#dbe8f1', grass: '#e2e6c2', flower: '#f0d9e2', sky: '#cfe1f1' };

function birdArt(b) {
  const W = 240, H = 160;
  const g = createGraphics(W, H); g.pixelDensity(2);
  randomSeed(b.id * 977 + 13); noiseSeed(b.id + 7);
  const a = b.art; const T = BODY[a.type];
  // paper + watercolor wash
  g.background('#fbfaf6');
  const wash = g.color(BG[T.base]);
  g.noStroke();
  for (let k = 0; k < 18; k++) {
    wash.setAlpha(26);
    g.fill(wash);
    g.ellipse(W / 2 + random(-46, 46), H / 2 + random(-26, 26), random(110, 230), random(70, 150));
  }
  const ground = { branch: 120, water: 112, marsh: 148, sand: 144, ice: 146, grass: 150, flower: 0, sky: 0 }[T.base];
  drawBase(g, T.base, W, H, ground);
  g.push();
  if (ground) { g.translate(W / 2, ground); g.scale(T.sc); g.translate(-W / 2, -ground); }
  else { g.translate(W / 2, H / 2); g.scale(T.sc); g.translate(-W / 2, -H / 2); }
  drawBird(g, a, T, ground, W, H);
  g.pop();
  // paper grain
  g.noStroke();
  for (let k = 0; k < 1100; k++) { g.fill(70, 55, 40, random(5, 16)); g.rect(random(W), random(H), 1, 1); }
  return toURL(g, 'image/jpeg');
}

function drawBase(g, base, W, H, y) {
  if (base === 'branch') {
    g.stroke('#6b4a32'); g.strokeWeight(7); g.noFill();
    g.bezier(-5, y + 6, 70, y - 2, 150, y + 4, W + 5, y - 4);
    g.strokeWeight(3); g.line(180, y - 1, 210, y - 22);
    g.noStroke(); g.fill('#5f8f55');
    [[210, y - 24, 0.6], [196, y - 12, -0.5], [40, y + 2, 0.3]].forEach(([x, yy, r]) => { g.push(); g.translate(x, yy); g.rotate(r); g.ellipse(0, 0, 18, 8); g.pop(); });
  } else if (base === 'water') {
    g.noStroke(); g.fill(120, 170, 205, 90); g.rect(0, y, W, H - y);
    g.stroke(70, 120, 160, 150); g.strokeWeight(1.6); g.noFill();
    for (let k = 0; k < 6; k++) { const yy = y + 8 + k * 7; const x = random(10, W - 60); g.arc(x, yy, 40, 6, PI, TWO_PI); }
  } else if (base === 'marsh' || base === 'grass' || base === 'sand' || base === 'ice') {
    const col = { marsh: '#7aa46a', grass: '#8ea457', sand: '#c9b07a', ice: '#e8f1f7' }[base];
    g.noStroke(); g.fill(col); g.rect(0, y, W, H - y);
    if (base === 'ice') { g.stroke('#9fb8c8'); g.strokeWeight(1.2); g.line(0, y, W, y); }
    if (base === 'marsh' || base === 'grass') {
      g.stroke(base === 'marsh' ? '#4f7a45' : '#6a7f3a'); g.strokeWeight(1.6);
      for (let k = 0; k < 22; k++) { const x = random(W); g.line(x, y + 2, x + random(-4, 4), y - random(6, 16)); }
    }
  } else if (base === 'flower') {
    g.stroke('#4f7a45'); g.strokeWeight(3); g.noFill(); g.bezier(200, H, 196, 120, 206, 100, 202, 78);
    g.noStroke(); g.fill('#c8324a');
    for (let k = 0; k < 5; k++) { g.push(); g.translate(202, 74); g.rotate(-0.4 + k * 0.22); g.ellipse(0, -10, 8, 22); g.pop(); }
  } else if (base === 'sky') {
    g.noStroke(); g.fill(255, 255, 255, 190);
    [[50, 120], [190, 40]].forEach(([x, y2]) => { g.ellipse(x, y2, 60, 18); g.ellipse(x + 14, y2 - 7, 34, 18); });
  }
}

function vext(T) { return Math.abs(Math.sin(T.tilt)) * T.bw / 2 + Math.abs(Math.cos(T.tilt)) * T.bh / 2; }
function blob(g, x, y, w, h, fillHex, strokeAmt = -0.45) {
  g.fill(fillHex); g.stroke(shade(g, fillHex, strokeAmt)); g.strokeWeight(1.6);
  g.ellipse(x, y, w, h);
}

function drawBird(g, a, T, ground, W, H) {
  const m = a.marks;
  const fly = a.type === 'hummer' || a.type === 'soar';
  const legLen = T.leg * (m.legs === 'long' ? 2.2 : 1);
  const cx = 110;
  let cy;
  if (fly) cy = H / 2 + 6;
  else if (T.base === 'water') cy = ground - T.bh * 0.12;
  else cy = ground - legLen - vext(T) * 0.92;
  const t = T.tilt;
  const fx = cx + Math.cos(t) * T.bw * 0.43, fy = cy + Math.sin(t) * T.bw * 0.43;
  const bx = cx - Math.cos(t) * T.bw * 0.42, by = cy - Math.sin(t) * T.bw * 0.42;
  const hr = T.hr;
  const hx = fx + hr * 0.35, hy = fy - T.neck - hr * 0.55;
  const tailCol = m.tailc || a.wing;

  // far wing for fliers
  if (fly) drawWing(g, a, cx, cy, T, true);
  // tail (behind body)
  drawTail(g, a.tail, bx, by, t, T, tailCol, m, ground);
  // legs
  if (legLen > 0 && !fly) {
    g.stroke(a.legs); g.strokeWeight(Math.max(2.2, T.bw / 28));
    const ly = cy + vext(T) * 0.85;
    [[cx - T.bw * 0.06, -3], [cx + T.bw * 0.08, 3]].forEach(([lx, d]) => {
      const gy = ly + legLen;
      g.line(lx, ly, lx + d, gy);
      g.line(lx + d, gy, lx + d + 8, gy); g.line(lx + d, gy, lx + d - 4, gy + 1);
    });
  }
  // body
  g.push(); g.translate(cx, cy); g.rotate(t);
  blob(g, 0, 0, T.bw, T.bh, a.body);
  g.noStroke(); g.fill(a.belly);
  g.ellipse(T.bw * 0.08, T.bh * 0.17, T.bw * 0.72, T.bh * 0.58);
  if (m.side) { g.fill(m.side); g.ellipse(T.bw * 0.02, T.bh * 0.22, T.bw * 0.35, T.bh * 0.25); }
  if (m.speckle) {
    g.fill(m.speckle);
    for (let k = 0; k < 26; k++) { const ang = random(TWO_PI), r = Math.sqrt(random()) * 0.42; g.ellipse(Math.cos(ang) * T.bw * r, Math.sin(ang) * T.bh * r, 2.6, 2); }
  }
  if (!fly) {
    // folded wing
    blob(g, -T.bw * 0.08, -T.bh * 0.12, T.bw * 0.7, T.bh * 0.62, a.wing);
    g.stroke(shade(g, a.wing, -0.35)); g.strokeWeight(1.2);
    for (let k = 0; k < 4; k++) g.line(-T.bw * 0.43 + k * 4, -T.bh * 0.1 + k * 3, -T.bw * 0.18 + k * 4, -T.bh * 0.02 + k * 3);
    if (m.patch) { g.noStroke(); g.fill(m.patch); g.ellipse(-T.bw * 0.02, -T.bh * 0.12, T.bw * 0.24, T.bh * 0.2); }
    if (m.stripes) { g.stroke(m.stripes); g.strokeWeight(2.4); for (let k = 0; k < 3; k++) g.line(-T.bw * 0.25 + k * 8, -T.bh * 0.32, -T.bw * 0.3 + k * 8, T.bh * 0.08); }
    if (m.tip) { g.noStroke(); g.fill(m.tip); g.ellipse(-T.bw * 0.38, -T.bh * 0.06, T.bw * 0.14, T.bh * 0.2); }
  }
  g.pop();
  if (fly) drawWing(g, a, cx, cy, T, false);
  // neck
  if (T.neck > 0) {
    const nc = m.neck || a.body;
    g.stroke(shade(g, nc, -0.45)); g.strokeWeight(hr * 1.15 + 3);
    g.line(fx, fy, hx - hr * 0.15, hy + hr * 0.3);
    g.stroke(nc); g.strokeWeight(hr * 1.15);
    g.line(fx, fy, hx - hr * 0.15, hy + hr * 0.3);
  }
  if (m.collar) { g.noStroke(); g.fill(m.collar); const t2 = T.neck > 0 ? 0.6 : 0.15; g.ellipse(lerp(fx, hx, t2), lerp(fy, hy, t2) + hr * 0.45, hr * 1.4, hr * 0.42); }
  if (m.crown) {
    g.stroke(m.crown); g.strokeWeight(1.6);
    for (let k = 0; k < 14; k++) { const ang = -PI * 0.95 + k * 0.09; g.line(hx - hr * 0.1, hy - hr * 0.8, hx - hr * 0.1 + Math.cos(ang) * hr * 1.6, hy - hr * 0.8 + Math.sin(ang) * hr * 1.6); }
  }
  // crest (behind head)
  if (m.crest && a.type !== 'owl') {
    g.fill(m.crest); g.stroke(shade(g, m.crest, -0.45)); g.strokeWeight(1.4);
    g.triangle(hx - hr * 0.2, hy - hr * 0.7, hx - hr * 1.3, hy - hr * 1.45, hx + hr * 0.3, hy - hr * 0.85);
    g.triangle(hx - hr * 0.6, hy - hr * 0.4, hx - hr * 1.5, hy - hr * 0.9, hx - hr * 0.1, hy - hr * 0.8);
  }
  if (a.type === 'owl' && m.crest) {
    g.fill(m.crest); g.stroke(shade(g, m.crest, -0.45)); g.strokeWeight(1.4);
    g.triangle(hx - hr * 0.85, hy - hr * 0.55, hx - hr * 0.75, hy - hr * 1.35, hx - hr * 0.35, hy - hr * 0.8);
    g.triangle(hx + hr * 0.85, hy - hr * 0.55, hx + hr * 0.75, hy - hr * 1.35, hx + hr * 0.35, hy - hr * 0.8);
  }
  // head
  blob(g, hx, hy, hr * 2, hr * 2 * (a.type === 'owl' ? 0.92 : 1), a.head);
  g.noStroke();
  if (m.cap) { g.fill(m.cap); g.arc(hx, hy, hr * 2, hr * 2, PI + 0.25, TWO_PI - 0.15, CHORD); }
  if (m.disc) { g.fill(m.disc); g.stroke(shade(g, m.disc, -0.3)); g.strokeWeight(1.4); g.ellipse(hx + hr * 0.02, hy + hr * 0.05, hr * 1.7, hr * 1.55); g.noStroke(); }
  if (m.cheek) { g.fill(m.cheek); g.ellipse(hx + hr * 0.05, hy + hr * 0.38, hr * 1.0, hr * 0.62); }
  if (m.face) { g.fill(m.face); g.ellipse(hx + hr * 0.35, hy - hr * 0.02, hr * 1.1, hr * 0.62); }
  if (m.throat) { g.fill(m.throat); g.ellipse(hx + hr * 0.38, hy + hr * 0.72, hr * 0.95, hr * 0.62); }
  // eyes
  if (a.type === 'owl') {
    const ic = m.eyes || '#1a1a1a';
    [[hx - hr * 0.33, hy - hr * 0.08], [hx + hr * 0.37, hy - hr * 0.08]].forEach(([ex, ey]) => {
      g.fill('#1a1a1a'); g.circle(ex, ey, hr * 0.62);
      g.fill(ic); g.circle(ex, ey, hr * 0.5);
      g.fill('#111111'); g.circle(ex, ey, hr * 0.26);
      g.fill(255, 255, 255, 220); g.circle(ex - hr * 0.08, ey - hr * 0.08, hr * 0.1);
    });
  } else {
    const ex = hx + hr * 0.38, ey = hy - hr * 0.12;
    if (m.eyering) { g.fill(m.eyering); g.circle(ex, ey, hr * 0.62); }
    g.fill('#1a1a1a'); g.circle(ex, ey, hr * 0.38);
    g.fill(255, 255, 255, 230); g.circle(ex + hr * 0.07, ey - hr * 0.07, hr * 0.12);
  }
  // beak
  g.push();
  if (a.type === 'owl') { g.translate(hx + hr * 0.02, hy + hr * 0.22); g.rotate(1.35); }
  else { g.translate(hx + hr * 0.82, hy + hr * 0.12); g.rotate(a.beak === 'bent' ? 0.75 : a.beak === 'curve' ? 0.25 : 0.1); }
  drawBeak(g, a.beak, hr, a.bill, m);
  g.pop();
  if (m.wattle) { g.noStroke(); g.fill(m.wattle); g.ellipse(hx + hr * 0.9, hy + hr * 0.75, hr * 0.35, hr * 0.7); }
}

function drawWing(g, a, cx, cy, T, far) {
  const col = far ? shade(g, a.wing, -0.25) : g.color(a.wing);
  g.fill(col); g.stroke(shade(g, a.wing, -0.5)); g.strokeWeight(1.5);
  if (a.type === 'hummer') {
    col.setAlpha(150); g.fill(col);
    g.push(); g.translate(cx - 2, cy - 4); g.rotate(far ? -2.1 : -1.7); g.ellipse(26, 0, 52, 14); g.pop();
    return;
  }
  const span = a.marks.patch ? 1.2 : 1; // condor-like long wings
  const d = far ? -10 : 0;
  g.beginShape();
  g.vertex(cx + 8 + d, cy - 4);
  g.vertex(cx - 18 + d, cy - 46 * span);
  g.vertex(cx - 48 + d, cy - 64 * span);
  g.vertex(cx - 36 + d, cy - 40 * span);
  g.vertex(cx - 16 + d, cy + 4);
  g.endShape(CLOSE);
  if (!far && a.marks.patch) { g.noStroke(); g.fill(a.marks.patch); g.quad(cx - 2, cy - 18, cx - 20, cy - 40, cx - 26, cy - 34, cx - 8, cy - 8); }
  if (!far && a.marks.tip) { g.noStroke(); g.fill(a.marks.tip); g.triangle(cx - 48 + d, cy - 64, cx - 34, cy - 54, cx - 40, cy - 46); }
}

function drawTail(g, type, bx, by, t, T, col, m, ground) {
  const len = T.tail; const w = T.bh * 0.36;
  g.fill(col); g.stroke(shade(g, col, -0.45)); g.strokeWeight(1.5);
  if (type === 'fan') {
    g.push(); g.translate(bx + 8, by - T.bh * 0.25);
    g.arc(0, 0, T.bh * 2.1, T.bh * 2.1, PI * 0.95, PI * 2.05, PIE);
    g.stroke(shade(g, col, 0.35)); g.strokeWeight(1.4);
    for (let k = 0; k < 9; k++) { const ang = PI + k * 0.13; g.line(0, 0, Math.cos(ang) * T.bh, Math.sin(ang) * T.bh); }
    g.pop(); return;
  }
  if (type === 'train') {
    g.beginShape(); g.vertex(bx + 6, by - 8); g.vertex(bx - 92, ground - 6); g.vertex(bx - 70, ground + 4); g.vertex(bx + 10, by + 12); g.endShape(CLOSE);
    g.noStroke();
    for (let k = 0; k < 5; k++) { const p = (k + 1) / 6; const x = lerp(bx, bx - 82, p), y = lerp(by, ground - 2, p); g.fill('#c99a2a'); g.circle(x, y, 9); g.fill('#1f5fb0'); g.circle(x, y, 5); }
    return;
  }
  if (type === 'lyre') {
    g.noFill(); g.strokeWeight(5); g.stroke(col);
    g.bezier(bx, by, bx - 30, by - 10, bx - 40, by - 60, bx - 20, by - 80);
    g.bezier(bx, by, bx - 20, by - 10, bx - 10, by - 60, bx + 4, by - 78);
    g.strokeWeight(1); g.stroke(shade(g, col, -0.4));
    for (let k = 0; k < 10; k++) g.line(bx - 6 - k * 2, by - 6 - k * 6, bx - 26 + k, by - 12 - k * 6);
    return;
  }
  if (type === 'streamers') {
    g.noFill(); g.strokeWeight(3.5); g.stroke(col);
    g.bezier(bx, by, bx - 20, by + 30, bx - 40, by + 50, bx - 70, by + 60);
    g.bezier(bx, by, bx - 14, by + 36, bx - 30, by + 58, bx - 56, by + 72);
    return;
  }
  g.push(); g.translate(bx, by); g.rotate(t + PI + 0.12);
  if (type === 'short') g.quad(0, -w * 0.5, len, -w * 0.4, len, w * 0.4, 0, w * 0.5);
  else if (type === 'long') g.quad(0, -w * 0.4, len * 1.35, -w * 0.32, len * 1.35, w * 0.32, 0, w * 0.4);
  else if (type === 'fork') { g.beginShape(); g.vertex(0, -w * 0.4); g.vertex(len * 1.7, -w * 0.55); g.vertex(len * 0.9, 0); g.vertex(len * 1.7, w * 0.55); g.vertex(0, w * 0.4); g.endShape(CLOSE); }
  g.pop();
}

function drawBeak(g, type, hr, col, m) {
  g.fill(col); g.stroke(shade(g, col, -0.5)); g.strokeWeight(1.3);
  const tri = (L, h) => g.triangle(-2, -h, -2, h, L, h * 0.15);
  switch (type) {
    case 'cone': tri(hr * 0.7, hr * 0.36); break;
    case 'short': tri(hr * 0.62, hr * 0.2); break;
    case 'long': tri(hr * 2.0, hr * 0.12); break;
    case 'dagger': tri(hr * 2.5, hr * 0.18); break;
    case 'heavy': tri(hr * 1.15, hr * 0.32); break;
    case 'needle': tri(hr * 2.6, hr * 0.07); break;
    case 'wide': tri(hr * 0.55, hr * 0.42); break;
    case 'hook':
      g.beginShape(); g.vertex(-2, -hr * 0.3); g.bezierVertex(hr * 0.5, -hr * 0.3, hr * 0.8, -hr * 0.05, hr * 0.62, hr * 0.38);
      g.bezierVertex(hr * 0.5, hr * 0.15, hr * 0.3, hr * 0.22, -2, hr * 0.25); g.endShape(CLOSE); break;
    case 'curve':
      g.beginShape(); g.vertex(-2, -hr * 0.14); g.bezierVertex(hr, -hr * 0.1, hr * 1.7, hr * 0.2, hr * 2.1, hr * 0.7);
      g.bezierVertex(hr * 1.6, hr * 0.35, hr * 0.9, hr * 0.14, -2, hr * 0.14); g.endShape(CLOSE); break;
    case 'spoon': tri(hr * 2.0, hr * 0.12); g.ellipse(hr * 2.1, hr * 0.05, hr * 0.8, hr * 0.55); break;
    case 'pouch':
      g.fill(shade(g, col, 0.25)); g.beginShape(); g.vertex(0, hr * 0.1); g.bezierVertex(hr, hr * 0.9, hr * 2.2, hr * 0.7, hr * 3, hr * 0.15); g.endShape(CLOSE);
      g.fill(col); g.quad(-2, -hr * 0.16, hr * 3.1, -hr * 0.05, hr * 3.1, hr * 0.12, -2, hr * 0.14); break;
    case 'flat':
      g.rect(-2, -hr * 0.18, hr * 1.15, hr * 0.42, hr * 0.2); break;
    case 'big':
      g.triangle(-2, -hr * 0.5, -2, hr * 0.5, hr * 0.95, hr * 0.12);
      g.stroke('#3b5a8a'); g.strokeWeight(2.2); g.line(0, -hr * 0.42, 0, hr * 0.42);
      g.stroke('#f2d23a'); g.line(hr * 0.35, -hr * 0.3, hr * 0.35, hr * 0.32); break;
    case 'toucan':
      g.beginShape(); g.vertex(-2, -hr * 0.55); g.bezierVertex(hr * 1.4, -hr * 0.85, hr * 2.6, -hr * 0.5, hr * 3.0, hr * 0.15);
      g.bezierVertex(hr * 2.0, hr * 0.35, hr * 1, hr * 0.5, -2, hr * 0.5); g.endShape(CLOSE);
      if (m.tip) { g.noStroke(); g.fill(m.tip); g.ellipse(hr * 2.6, -hr * 0.05, hr * 0.8, hr * 0.5); } break;
    case 'shoe':
      g.beginShape(); g.vertex(-2, -hr * 0.55); g.bezierVertex(hr, -hr * 0.75, hr * 1.7, -hr * 0.5, hr * 1.8, hr * 0.2);
      g.bezierVertex(hr * 1.6, hr * 0.55, hr * 0.8, hr * 0.7, -2, hr * 0.6); g.endShape(CLOSE);
      g.fill(shade(g, col, -0.4)); g.noStroke(); g.triangle(hr * 1.6, hr * 0.05, hr * 1.85, hr * 0.15, hr * 1.6, hr * 0.45); break;
    case 'bent':
      g.beginShape(); g.vertex(-2, -hr * 0.32); g.vertex(hr * 0.9, -hr * 0.22); g.vertex(hr * 1.6, hr * 0.5); g.vertex(hr * 1.3, hr * 0.62); g.vertex(hr * 0.75, hr * 0.15); g.vertex(-2, hr * 0.3); g.endShape(CLOSE);
      g.noStroke(); g.fill('#1a1a1a'); g.triangle(hr * 1.1, hr * 0.15, hr * 1.6, hr * 0.5, hr * 1.3, hr * 0.62); break;
    default: tri(hr * 0.62, hr * 0.2);
  }
}
