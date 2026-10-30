import React, { useMemo, useRef } from 'react';
import { course, total, minAlt, maxAlt, miles, fiveKs, pointAt } from './course.js';
import { pointColors } from './elevation.js';
import { NOTES } from './notes.js';

const W = 1000, H = 190;
const PAD = { l: 44, r: 14, t: 30, b: 28 };
const innerW = W - PAD.l - PAD.r, innerH = H - PAD.t - PAD.b;
const FLOOR = Math.floor(minAlt / 10) * 10, CEIL = Math.ceil(maxAlt / 10) * 10;

const x = (d) => PAD.l + (d / total) * innerW;
const y = (a) => PAD.t + innerH - ((a - FLOOR) / (CEIL - FLOOR)) * innerH;

export default function Profile({ mode, pos, onPos, onNote }) {
  const svg = useRef(null);
  const colors = useMemo(() => pointColors(mode), [mode]);
  const line = useMemo(() => course.altitude.map((a, i) => `${i ? 'L' : 'M'}${x(course.distance[i]).toFixed(1)},${y(a).toFixed(1)}`).join(''), []);
  const area = `${line}L${x(total)},${y(FLOOR)}L${x(0)},${y(FLOOR)}Z`;
  const stops = useMemo(() => Array.from({ length: 41 }, (_, k) => {
    const i = Math.round((k / 40) * (colors.length - 1));
    return <stop key={k} offset={`${(k / 40) * 100}%`} stopColor={colors[i]} />;
  }), [colors]);

  const pick = (e) => {
    const r = svg.current.getBoundingClientRect();
    const fx = ((e.clientX - r.left) / r.width) * W;
    onPos(Math.min(total, Math.max(0, ((fx - PAD.l) / innerW) * total)));
  };
  const drag = (e) => { if (e.buttons === 1) pick(e); };

  const yTicks = [FLOOR, (FLOOR + CEIL) / 2, CEIL];
  const here = pos == null ? null : pointAt(pos);

  return (
    <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className="profile" onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); pick(e); }} onPointerMove={drag}>
      <defs>
        <linearGradient id="routeGradient" x1="0" x2="1" y1="0" y2="0">{stops}</linearGradient>
        <linearGradient id="areaFade" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#1b1f24" stopOpacity="0.14" /><stop offset="100%" stopColor="#1b1f24" stopOpacity="0.02" /></linearGradient>
      </defs>
      {yTicks.map((a) => (
        <g key={a}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(a)} y2={y(a)} stroke="#e3e6ea" />
          <text x={PAD.l - 6} y={y(a) + 3} textAnchor="end" className="axis">{Math.round(a)} m</text>
        </g>
      ))}
      <path d={area} fill="url(#areaFade)" />
      <path d={line} fill="none" stroke="url(#routeGradient)" strokeWidth="3" strokeLinejoin="round" />
      {miles.map((m) => (
        <g key={m.label}>
          <line x1={x(m.d)} x2={x(m.d)} y1={PAD.t + innerH} y2={PAD.t + innerH + 4} stroke="#666" />
          <text x={x(m.d)} y={PAD.t + innerH + 15} textAnchor="middle" className="axis">{m.label}</text>
        </g>
      ))}
      <text x={PAD.l} y={H - 3} className="axis">miles</text>
      {fiveKs.map((k) => (
        <g key={k.label} className="fivek">
          <line x1={x(k.d)} x2={x(k.d)} y1={PAD.t - 6} y2={PAD.t + innerH} stroke="#fc4c02" strokeDasharray="3 3" />
          <rect x={x(k.d) - 14} y={PAD.t - 22} width="28" height="15" rx="7" fill="#fc4c02" />
          <text x={x(k.d)} y={PAD.t - 11} textAnchor="middle">{k.label}</text>
        </g>
      ))}
      {NOTES.map((n, i) => (
        <circle key={n.title} cx={x(n.d)} cy={y(pointAt(n.d).alt)} r="5" className="note-dot" onPointerDown={(e) => { e.stopPropagation(); onNote(n); }}><title>{n.title}</title></circle>
      ))}
      {here && (
        <g pointerEvents="none">
          <line x1={x(here.d)} x2={x(here.d)} y1={PAD.t} y2={PAD.t + innerH} stroke="#000" />
          <circle cx={x(here.d)} cy={y(here.alt)} r="5" fill="#fff" stroke="#000" strokeWidth="2" />
        </g>
      )}
    </svg>
  );
}
