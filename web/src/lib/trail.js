// The hero signature: one trail that splits into a helix as marks pile up.
// Adapted from design/preview.html (kept framework-free so it can draw into any <svg>).
const NS = "http://www.w3.org/2000/svg";
const runs = new WeakMap();

function catmull(points, segments = 24) {
  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i], p1 = points[i], p2 = points[i + 1], p3 = points[i + 2] || p2;
    for (let s = 0; s < segments; s++) {
      const t = s / segments, t2 = t * t, t3 = t2 * t;
      const f = (k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 +
        (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
      out.push([f(0), f(1)]);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

function resample(points, step) {
  const out = [points[0]];
  let carried = 0;
  for (let i = 1; i < points.length; i++) {
    let [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    let distance = Math.hypot(x1 - x0, y1 - y0);
    while (carried + distance >= step) {
      const ratio = (step - carried) / distance;
      x0 += (x1 - x0) * ratio;
      y0 += (y1 - y0) * ratio;
      out.push([x0, y0]);
      distance = Math.hypot(x1 - x0, y1 - y0);
      carried = 0;
    }
    carried += distance;
  }
  return out;
}

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const make = (name, attributes, parent) => {
  const node = document.createElementNS(NS, name);
  for (const key in attributes) node.setAttribute(key, attributes[key]);
  parent?.appendChild(node);
  return node;
};
const seeded = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

function contours(group, cx, cy, count, radius, gap, seed) {
  const random = seeded(seed);
  const a1 = random() * 6, a2 = random() * 6;
  for (let k = 0; k < count; k++) {
    const r = radius + k * gap;
    let d = "";
    for (let i = 0; i <= 72; i++) {
      const angle = (i / 72) * Math.PI * 2;
      const wobble = r * (1 + 0.16 * Math.sin(3 * angle + a1 + k * 0.15) + 0.08 * Math.sin(5 * angle + a2));
      d += (i ? "L" : "M") + (cx + wobble * Math.cos(angle)).toFixed(1) + " " + (cy + wobble * 0.72 * Math.sin(angle)).toFixed(1);
    }
    make("path", {
      d: d + "Z", fill: "none", stroke: "currentColor", "stroke-width": k % 4 === 3 ? 1.4 : 0.8,
      opacity: k % 4 === 3 ? 0.14 : 0.09,
    }, group);
  }
}

export const heroLayouts = {
  wide: {
    points: [[-.02, .95], [.14, .92], [.3, .96], [.46, .9], [.6, .93], [.7, .8], [.66, .62], [.74, .5], [.86, .5], [.9, .36], [.84, .26], [.93, .18]],
    wavelength: 110, amp: 26, sw: 4.5, split: [.12, .62], duration: 4600,
    nodes: [.08, .26, .45, .6, .8, 1], states: ["verified", "onchain", "onchain", "onchain", "verified", "you"],
    labels: [[0, -24, "middle"], [-14, -26, "end"], [0, 34, "middle"], [-44, 4, "end"], [-16, -40, "end"], [-20, -34, "end"]],
    contours: [[.78, .3, 9, 30, 26, 7], [.2, .95, 7, 40, 30, 3], [.98, .95, 6, 50, 34, 11]],
  },
  narrow: {
    points: [[.06, .96], [.42, .9], [.82, .84], [.88, .7], [.5, .62], [.16, .55], [.2, .38], [.6, .3], [.86, .2], [.9, .06]],
    wavelength: 72, amp: 15, sw: 3.5, split: [.15, .7], duration: 3800,
    nodes: [.06, .24, .45, .62, .8, 1], states: ["verified", "onchain", "onchain", "onchain", "verified", "you"],
    labels: [null, [-22, 4, "end"], [22, -8, "start"], null, null, [-24, 4, "end"]],
    contours: [[.7, .35, 7, 24, 22, 5], [.1, .8, 5, 30, 24, 9]],
  },
  mini: {
    points: [[.04, .92], [.3, .86], [.5, .66], [.32, .45], [.55, .3], [.8, .26], [.94, .08]],
    wavelength: 60, amp: 12, sw: 3.2, split: [.1, .6], duration: 3200,
    nodes: [.08, .3, .55, .78, 1], states: ["verified", "onchain", "onchain", "verified", "you"],
    contours: [[.78, .55, 6, 20, 18, 4]],
  },
};

/**
 * Draw (and optionally animate) a trail into `svg`.
 * `events` is [[name, detail], ...] aligned with `options.nodes`, used for the map labels.
 */
export function drawTrail(svg, options, events = [], { instant = false } = {}) {
  const W = svg.clientWidth, H = svg.clientHeight;
  if (!W || !H) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.replaceChildren();
  svg.style.color = "var(--text)";
  const contourGroup = make("g", {}, svg);
  (options.contours || []).forEach(([x, y, n, r0, gap, s]) => contours(contourGroup, x * W, y * H, n, r0, gap, s));
  const base = resample(catmull(options.points.map(([x, y]) => [x * W, y * H])), 2.5);
  const N = base.length, wavelength = options.wavelength;
  const strandA = [], strandB = [];
  for (let i = 0; i < N; i++) {
    const a = base[Math.max(0, i - 1)], b = base[Math.min(N - 1, i + 1)];
    let nx = -(b[1] - a[1]), ny = b[0] - a[0];
    const m = Math.hypot(nx, ny) || 1;
    nx /= m; ny /= m;
    const u = i / (N - 1);
    const amplitude = options.amp * smooth(options.split[0], options.split[1], u) * (1 - 0.25 * smooth(0.97, 1, u));
    const w = Math.sin(((i * 2.5) / wavelength) * Math.PI * 2) * amplitude;
    strandA.push([base[i][0] + nx * w, base[i][1] + ny * w]);
    strandB.push([base[i][0] - nx * w, base[i][1] - ny * w]);
  }
  const rungGroup = make("g", { stroke: "var(--text-3)", "stroke-width": 1.6, "stroke-linecap": "round" }, svg);
  const rungs = [];
  const half = wavelength / 2 / 2.5;
  for (let k = 0; k * half < N; k++) for (const f of [.3, .5, .7]) {
    const i = Math.round((k + f) * half);
    if (i >= N) continue;
    const length = Math.hypot(strandA[i][0] - strandB[i][0], strandA[i][1] - strandB[i][1]);
    if (length < 10) continue;
    const shrink = 5 / length;
    rungs.push([i, make("line", {
      x1: strandA[i][0] + (strandB[i][0] - strandA[i][0]) * shrink, y1: strandA[i][1] + (strandB[i][1] - strandA[i][1]) * shrink,
      x2: strandB[i][0] + (strandA[i][0] - strandB[i][0]) * shrink, y2: strandB[i][1] + (strandA[i][1] - strandB[i][1]) * shrink,
      opacity: 0,
    }, rungGroup)]);
  }
  const line = (stroke, width) => make("polyline", {
    fill: "none", stroke, "stroke-width": width, "stroke-linecap": "round", "stroke-linejoin": "round",
  }, svg);
  const ink = line("var(--strand)", options.sw * 0.8);
  const halo = line("var(--bg)", options.sw + 5);
  const blaze = line("var(--blaze)", options.sw);
  const nodeGroup = make("g", {}, svg);
  const nodes = [];
  options.nodes.forEach((u, index) => {
    let i = Math.round(u * (N - 1));
    if (u < 1) i = Math.min(N - 1, Math.max(0, Math.round(Math.round(i / half) * half)));
    else i = N - 1;
    const [x, y] = base[i];
    const last = index === options.nodes.length - 1;
    const state = options.states[index];
    const color = state === "onchain" ? "var(--anchored)" : state === "verified" ? "var(--signed)" : "var(--blaze)";
    const g = make("g", {}, nodeGroup);
    if (last) make("circle", { class: "hring", cx: x, cy: y, r: 14 }, g);
    const node = make("g", { class: "hnode" }, g);
    if (state === "onchain") make("circle", { cx: x, cy: y, r: last ? 16 : 12, fill: "none", stroke: color, "stroke-width": 2 }, node);
    make("circle", { cx: x, cy: y, r: last ? 11 : 7.5, fill: last ? "var(--blaze)" : color, stroke: "var(--bg)", "stroke-width": 3 }, node);
    if (last) make("circle", { cx: x, cy: y, r: 11, fill: "none", stroke: "#14121F", "stroke-width": 2 }, node);
    let label = null;
    if (options.labels?.[index] && events[index]) {
      const [dx, dy, anchor] = options.labels[index];
      label = make("g", { class: "hlabel" }, g);
      make("text", { x: x + dx, y: y + dy, "text-anchor": anchor, class: "trail-label trail-label--name" }, label).textContent = events[index][0];
      make("text", { x: x + dx, y: y + dy + 16, "text-anchor": anchor, class: "trail-label" }, label).textContent = events[index][1];
    }
    nodes.push({ i, node, label });
  });
  const pen = make("circle", { r: options.sw * 1.3, fill: "var(--blaze)", style: "filter: drop-shadow(0 0 6px var(--blaze))" }, svg);
  const toPoints = (list) => list.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  const frame = (progress) => {
    const n = Math.max(2, Math.round(progress * N));
    ink.setAttribute("points", toPoints(strandB.slice(0, n)));
    halo.setAttribute("points", toPoints(strandA.slice(0, n)));
    blaze.setAttribute("points", toPoints(strandA.slice(0, n)));
    rungs.forEach(([i, rung]) => rung.setAttribute("opacity", i < n ? 0.55 : 0));
    nodes.forEach((item) => {
      const on = item.i <= n - 1;
      item.node.classList.toggle("on", on);
      item.label?.classList.toggle("on", on);
    });
    const tip = strandA[n - 1];
    pen.setAttribute("cx", tip[0]);
    pen.setAttribute("cy", tip[1]);
    pen.setAttribute("opacity", progress >= 1 ? 0 : 1);
  };
  const previous = runs.get(svg);
  if (previous) cancelAnimationFrame(previous);
  if (reduce || instant) { frame(1); return; }
  const start = performance.now();
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const tick = (now) => {
    const t = Math.min(1, (now - start) / options.duration);
    frame(ease(t));
    if (t < 1) runs.set(svg, requestAnimationFrame(tick));
  };
  runs.set(svg, requestAnimationFrame(tick));
}

export function cancelTrail(svg) {
  const id = runs.get(svg);
  if (id) cancelAnimationFrame(id);
}
