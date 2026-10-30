import data from './data/cim.json';
import { elevationStats } from './stats.js';

export const MILE = 1609.344;
export const FOOT = 3.28084;

export const course = data;
export const total = data.distance.at(-1);
export const minAlt = Math.min(...data.altitude);
export const maxAlt = Math.max(...data.altitude);

const { gain, descent } = elevationStats(data.altitude);
export const stats = { distance: total, gain, descent, start: data.altitude[0], finish: data.altitude.at(-1), high: maxAlt, low: minAlt };

// Interpolated { lat, lng, alt, d } at `d` metres along the course.
export function pointAt(d) {
  const x = Math.min(total, Math.max(0, d));
  const dist = data.distance;
  let lo = 0, hi = dist.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (dist[mid] <= x) lo = mid; else hi = mid;
  }
  const f = (x - dist[lo]) / ((dist[hi] - dist[lo]) || 1);
  const [a, b] = [data.latlng[lo], data.latlng[hi]];
  return { lat: a[0] + (b[0] - a[0]) * f, lng: a[1] + (b[1] - a[1]) * f, alt: data.altitude[lo] + (data.altitude[hi] - data.altitude[lo]) * f, d: x };
}

export function gradeAt(d, span = 100) {
  const a = pointAt(d - span), b = pointAt(d + span);
  return b.d > a.d ? ((b.alt - a.alt) / (b.d - a.d)) * 100 : 0;
}

export function bearing(a, b) {
  const dx = (b.lng - a.lng) * Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180);
  return ((Math.atan2(dx, b.lat - a.lat) * 180) / Math.PI + 360) % 360;
}

const range = (n, f) => Array.from({ length: n }, (_, i) => f(i));
const at = (d, extra) => ({ ...pointAt(d), ...extra });

// One marker per mile (1-26) and per 5 km (5K-40K), plus the 13.1 half-way point.
export const miles = range(26, (i) => at((i + 1) * MILE, { label: String(i + 1) }));
export const fiveKs = range(8, (i) => at((i + 1) * 5000, { label: `${(i + 1) * 5}K` }));
export const half = at(total / 2, { label: '13.1' });

export const fmtMi = (d) => `${(d / MILE).toFixed(1)} mi`;
export const fmtKm = (d) => `${(d / 1000).toFixed(1)} km`;
export const fmtAlt = (m) => `${Math.round(m)} m · ${Math.round(m * FOOT)} ft`;
