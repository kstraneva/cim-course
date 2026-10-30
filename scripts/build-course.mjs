// Builds src/data/cim.json from raw/cim-2025.gpx (not committed).
// Resamples the track every ~25 m, rescales distance to the official 42.195 km, and samples
// elevation from the same Terrarium tiles the 3D view uses so the route sits on the terrain.
import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const STEP = 25;
const OFFICIAL = 42195;
const Z = 14;
const gpx = readFileSync('raw/cim-2025.gpx', 'utf8');
const raw = [...gpx.matchAll(/<trkpt lat="([\d.-]+)" lon="([\d.-]+)">\s*<ele>([\d.-]+)<\/ele>/g)].map((m) => [+m[1], +m[2], +m[3]]);

const R = 6371000;
const hav = (a, b) => {
  const x = ((b[1] - a[1]) * Math.PI / 180) * Math.cos(((a[0] + b[0]) / 2) * Math.PI / 180);
  const y = (b[0] - a[0]) * Math.PI / 180;
  return R * Math.hypot(x, y);
};
const cum = [0];
for (let i = 1; i < raw.length; i++) cum.push(cum[i - 1] + hav(raw[i - 1], raw[i]));
const scale = OFFICIAL / cum.at(-1);

const pts = [];
for (let d = 0, j = 0; d <= cum.at(-1); d += STEP / scale) {
  while (j < raw.length - 2 && cum[j + 1] < d) j++;
  const f = (d - cum[j]) / ((cum[j + 1] - cum[j]) || 1);
  pts.push([raw[j][0] + (raw[j + 1][0] - raw[j][0]) * f, raw[j][1] + (raw[j + 1][1] - raw[j][1]) * f, raw[j][2] + (raw[j + 1][2] - raw[j][2]) * f]);
}
pts.push(raw.at(-1));

const tiles = new Map();
async function tile(x, y) {
  const k = `${x}/${y}`;
  if (!tiles.has(k)) {
    const res = await fetch(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${Z}/${x}/${y}.png`);
    if (!res.ok) throw new Error(`tile ${k}: ${res.status}`);
    tiles.set(k, PNG.sync.read(Buffer.from(await res.arrayBuffer())));
  }
  return tiles.get(k);
}
async function demAt(lat, lon) {
  const n = 2 ** Z;
  const fx = ((lon + 180) / 360) * n;
  const fy = ((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2) * n;
  const px = (fx % 1) * 256 - 0.5, py = (fy % 1) * 256 - 0.5;
  const x0 = Math.floor(px), y0 = Math.floor(py);
  let sum = 0;
  for (const [dx, dy, w] of [[0, 0, (1 - (px - x0)) * (1 - (py - y0))], [1, 0, (px - x0) * (1 - (py - y0))], [0, 1, (1 - (px - x0)) * (py - y0)], [1, 1, (px - x0) * (py - y0)]]) {
    const gx = x0 + dx, gy = y0 + dy;
    const t = await tile(Math.floor(fx) + Math.floor(gx / 256), Math.floor(fy) + Math.floor(gy / 256));
    const i = ((((gy % 256) + 256) % 256) * 256 + (((gx % 256) + 256) % 256)) * 4;
    sum += w * (t.data[i] * 256 + t.data[i + 1] + t.data[i + 2] / 256 - 32768);
  }
  return sum;
}

const dem = [];
for (const p of pts) dem.push(await demAt(p[0], p[1]));
// ~150 m moving average takes bridge decks and cuttings out of the DEM.
const W = 3;
const smooth = dem.map((_, i) => {
  let s = 0, c = 0;
  for (let j = Math.max(0, i - W); j <= Math.min(dem.length - 1, i + W); j++) { s += dem[j]; c++; }
  return s / c;
});

const distance = pts.map((_, i) => Math.min(OFFICIAL, Math.round(i * STEP * 10) / 10));
distance[distance.length - 1] = OFFICIAL;
const out = {
  latlng: pts.map((p) => [+p[0].toFixed(6), +p[1].toFixed(6)]),
  altitude: smooth.map((a) => +a.toFixed(1)),
  distance,
};
writeFileSync('src/data/cim.json', JSON.stringify(out));

const gain = (a) => { let ref = a[0], g = 0, l = 0; for (const v of a) { if (v - ref >= 3) { g += v - ref; ref = v; } else if (ref - v >= 3) { l += ref - v; ref = v; } } return [Math.round(g), Math.round(l)]; };
console.log('points', pts.length, 'scale', scale.toFixed(4));
console.log('dem   gain/loss', gain(smooth), 'start', smooth[0].toFixed(1), 'end', smooth.at(-1).toFixed(1));
console.log('gpx   gain/loss', gain(pts.map((p) => p[2])), 'start', pts[0][2], 'end', pts.at(-1)[2]);
let err = 0; pts.forEach((p, i) => { err += Math.abs(p[2] - smooth[i]); }); console.log('mean |gpx-dem| m', (err / pts.length).toFixed(1));
