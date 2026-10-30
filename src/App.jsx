import React, { useState } from 'react';
import RouteMap, { BASEMAPS } from './RouteMap.jsx';
import Profile from './Profile.jsx';
import { RAMP_CSS } from './colors.js';
import { GRADE_LIMIT_PCT } from './elevation.js';
import { stats, total, minAlt, maxAlt, gradeAt, pointAt, fmtMi, fmtKm, fmtAlt, MILE, FOOT } from './course.js';
import { NOTES } from './notes.js';

const NEAR_NOTE_M = 0.25 * MILE;
const SPEEDS = [0.5, 1, 2, 4];

export default function App() {
  const [mode, setMode] = useState('elevation');
  const [basemap, setBasemap] = useState('satellite');
  const [terrain, setTerrain] = useState(true);
  const params = new URLSearchParams(window.location.search);
  const startMile = Number(params.get('mile'));
  const [pos, setPos] = useState(startMile > 0 ? Math.min(total, startMile * MILE) : null);
  const [flying, setFlying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [overviewTick, setOverviewTick] = useState(0);
  const [jump, setJump] = useState(startMile > 0 ? { d: Math.min(total, startMile * MILE), n: 0 } : null);

  const goTo = (note) => { setFlying(false); setPos(note.d); setJump({ d: note.d, n: Date.now() }); };
  const scrub = (d) => { setFlying(false); setPos(d); };
  const nearNote = pos == null ? null : NOTES.find((n) => Math.abs(n.d - pos) <= NEAR_NOTE_M);
  const here = pos == null ? null : pointAt(pos);

  return (
    <div className="page">
      <header>
        <h1>CIM Course Overview</h1>
        <span className="tag">California International Marathon · Folsom to Sacramento</span>
        <div className="modes">
          <button className={flying ? 'active' : ''} onClick={() => setFlying((f) => !f)}>{flying ? '⏸ Pause fly-over' : '▶ Fly over the course'}</button>
          {SPEEDS.map((s) => (<button key={s} className={speed === s ? 'active small' : 'small'} onClick={() => setSpeed(s)}>{s}×</button>))}
        </div>
      </header>

      <section className="about">
        <div>
          <h2>About the course</h2>
          <p>
            The California International Marathon runs point to point from Folsom, in the Sierra foothills, to the State Capitol in downtown Sacramento.
            It is a net-downhill course: it drops about {Math.round(stats.start - stats.finish)} m ({Math.round((stats.start - stats.finish) * FOOT)} ft) from start to finish
            and is known as one of the fastest marathons in the United States.
          </p>
          <p>
            The early miles roll, with short punchy climbs and descents through Folsom and Citrus Heights. The biggest hill is a short climb near mile 11.
            After the half-way point in Carmichael the course settles into a long, nearly flat run down Fair Oaks Boulevard, then J Street and L Street into
            downtown, and finishes on Capitol Mall.
          </p>
          <p className="hint">Drag the profile or the slider to move along the course, click a purple note for details, or press <b>Fly over the course</b>. Miles are white dots; every 5K is an orange tag.</p>
        </div>
        <dl>
          <div><dt>Distance</dt><dd>{fmtMi(stats.distance)} · {fmtKm(stats.distance)}</dd></div>
          <div><dt>Net drop</dt><dd>▼ {fmtAlt(stats.start - stats.finish)}</dd></div>
          <div><dt>Climbing</dt><dd>▲ {fmtAlt(stats.gain)}</dd></div>
          <div><dt>Descending</dt><dd>▼ {fmtAlt(stats.descent)}</dd></div>
          <div><dt>Start / finish</dt><dd>{Math.round(stats.start)} m / {Math.round(stats.finish)} m</dd></div>
        </dl>
      </section>

      <main>
        <RouteMap mode={mode} basemap={basemap} terrain={terrain} pos={pos} onPos={setPos} flying={flying} speed={speed}
          onFlyEnd={() => setFlying(false)} onNote={goTo} overviewTick={overviewTick} jump={jump} />
        <div className="legend">
          <b>{mode === 'grade' ? 'Grade' : 'Elevation'}</b>{' '}
          {mode === 'grade' ? `· ±${GRADE_LIMIT_PCT}%` : `· ${Math.round(minAlt)}–${Math.round(maxAlt)} m`}
          <div className="bar" style={{ background: RAMP_CSS }} />
          <div className="controls">
            {['elevation', 'grade'].map((m) => (<button key={m} className={mode === m ? 'active' : ''} onClick={() => setMode(m)}>{m}</button>))}
          </div>
          <div className="controls">
            {Object.entries(BASEMAPS).map(([k, b]) => (<button key={k} className={basemap === k ? 'active' : ''} onClick={() => setBasemap(k)}>{b.label}</button>))}
          </div>
          <label><input type="checkbox" checked={terrain} onChange={(e) => setTerrain(e.target.checked)} /> Terrain</label>
          <div className="controls"><button onClick={() => { setFlying(false); setOverviewTick((t) => t + 1); }}>Whole course</button></div>
          <div className="credit">{BASEMAPS[basemap].credit} · Terrain: Mapzen/AWS</div>
        </div>
        {nearNote && (
          <div className="callout"><b>{NOTES.indexOf(nearNote) + 1}. {nearNote.title}</b><p>{nearNote.text}</p></div>
        )}
      </main>

      <section className="panel">
        <div className="readout">
          {here ? (
            <>
              <b>Mile {(here.d / MILE).toFixed(1)}</b> · {(here.d / 1000).toFixed(1)} km · {fmtAlt(here.alt)} · grade {gradeAt(here.d).toFixed(1)}%
            </>
          ) : 'Drag along the profile or use the slider to explore the course'}
        </div>
        <Profile mode={mode} pos={pos} onPos={scrub} onNote={goTo} />
        <input className="scrub" type="range" min="0" max={total} step="10" value={pos ?? 0} onChange={(e) => scrub(+e.target.value)} aria-label="Position along the course" />
      </section>

      <section className="notes">
        <h2>Hills and features, mile by mile</h2>
        <ol>
          {NOTES.map((n, i) => (
            <li key={n.title}>
              <button className="note" onClick={() => goTo(n)}>
                <span className="num">{i + 1}</span>
                <span className="mile">{n.mile === 0 ? 'Start' : n.mile >= 26.2 ? 'Finish' : `Mile ${n.mile % 1 ? n.mile.toFixed(1) : n.mile}`}</span>
                <span><b>{n.title}</b><br />{n.text}</span>
              </button>
            </li>
          ))}
        </ol>
      </section>

      <footer>
        Course line from the 2025 CIM track published by <a href="https://www.goandrace.com">goandrace.com</a>, rescaled to 42.195 km; elevation from Mapzen/AWS terrain tiles. Hill notes are computed
        from that profile and will differ slightly from official figures. Not affiliated with the Sacramento Running Association or CIM.
      </footer>
    </div>
  );
}
