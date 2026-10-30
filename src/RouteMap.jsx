import React, { useEffect, useMemo, useRef } from 'react';
import { Deck, MapView, WebMercatorViewport, FlyToInterpolator } from '@deck.gl/core';
import { PathLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { TerrainLayer } from '@deck.gl/geo-layers';
import { course, total, minAlt, maxAlt, miles, fiveKs, pointAt, bearing } from './course.js';
import { pointColors } from './elevation.js';
import { NOTES } from './notes.js';

const DEM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
export const BASEMAPS = {
  satellite: { label: 'Satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', credit: 'Imagery © Esri, Maxar, Earthstar Geographics' },
  streets: { label: 'Streets', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', credit: '© OpenStreetMap contributors' },
  topo: { label: 'Topo', url: 'https://tile.opentopomap.org/{z}/{x}/{y}.png', credit: '© OpenTopoMap (CC-BY-SA), © OpenStreetMap contributors' },
};

const LIFT = 8; // metres above the course altitude so the line is never buried by DEM mismatch
const MID_ALT = (minAlt + maxAlt) / 2;
const MARGIN = { lat: 0.02, lng: 0.025 }; // degrees of map kept around the course (about 2 km)
const MAX_TILE_ZOOM = 15;
const MAX_ZOOM = 17;
const FLY = { pitch: 68, zoom: 15.6, lookAhead: 450, ease: 3.5 };
const ORANGE = [252, 76, 2];
const toRgb = (s) => s.match(/\d+/g).slice(0, 3).map(Number);
const lerp = (a, b, t) => a + (b - a) * t;
const lerpAngle = (a, b, t) => a + ((((b - a) % 360) + 540) % 360 - 180) * t;

const posOf = (p) => [p.lng, p.lat, p.alt + LIFT - MID_ALT];
// [west, south, east, north] of the course plus a margin: the only area the map draws and the camera may visit.
const EXTENT = (() => {
  const lats = course.latlng.map((p) => p[0]), lngs = course.latlng.map((p) => p[1]);
  return [Math.min(...lngs) - MARGIN.lng, Math.min(...lats) - MARGIN.lat, Math.max(...lngs) + MARGIN.lng, Math.max(...lats) + MARGIN.lat];
})();

const segments = course.latlng.slice(1).map((p, i) => ({ a: course.latlng[i], b: p, ai: i, bi: i + 1 }));

export default function RouteMap({ mode, basemap, terrain, pos, onPos, flying, speed, onFlyEnd, onNote, overviewTick, jump }) {
  const parent = useRef(null);
  const deckRef = useRef(null);
  const viewRef = useRef(null);
  const posRef = useRef(pos);
  const overviewRef = useRef(null);
  const props = useRef({});
  props.current = { onPos, onFlyEnd, speed, onNote };
  posRef.current = pos;

  const colors = useMemo(() => pointColors(mode).map(toRgb), [mode]);

  const routeLayers = useMemo(() => {
    const path = (d) => [posOf({ lng: d.a[1], lat: d.a[0], alt: course.altitude[d.ai] }), posOf({ lng: d.b[1], lat: d.b[0], alt: course.altitude[d.bi] })];
    const always = { depthCompare: 'always' };
    const text = (id, data, extra) => new TextLayer({
      id, data, parameters: always, getPosition: (d) => posOf(d), getText: (d) => d.label, fontFamily: 'system-ui, sans-serif',
      fontSettings: { sdf: true }, billboard: true, ...extra,
    });
    return [
      new PathLayer({ id: 'casing', data: segments, getPath: path, getColor: [0, 0, 0, 200], getWidth: 9, widthUnits: 'pixels', capRounded: true, jointRounded: true, parameters: always }),
      new PathLayer({ id: 'route', data: segments, pickable: true, getPath: path, getColor: (d) => [...colors[d.bi], 255], getWidth: 5, widthUnits: 'pixels', capRounded: true, jointRounded: true, parameters: always, updateTriggers: { getColor: mode } }),
      // Miles: small white dots with a number underneath.
      new ScatterplotLayer({ id: 'mile-dots', data: miles, getPosition: posOf, getRadius: 5, radiusUnits: 'pixels', getFillColor: [255, 255, 255], getLineColor: [20, 20, 20], stroked: true, lineWidthMinPixels: 2, billboard: true, parameters: always }),
      text('mile-labels', miles, { getSize: 12, getColor: [255, 255, 255], outlineWidth: 4, outlineColor: [0, 0, 0, 230], getPixelOffset: [0, 16] }),
      // 5K marks: big orange rings with an orange "5K" tag above.
      new ScatterplotLayer({ id: 'fivek-dots', data: fiveKs, getPosition: posOf, getRadius: 11, radiusUnits: 'pixels', getFillColor: ORANGE, getLineColor: [255, 255, 255], stroked: true, lineWidthMinPixels: 3, billboard: true, parameters: always }),
      text('fivek-labels', fiveKs, { getSize: 16, getColor: [255, 255, 255], fontWeight: 800, background: true, getBackgroundColor: [...ORANGE, 245], backgroundPadding: [7, 3], getBorderColor: [255, 255, 255], getBorderWidth: 2, getPixelOffset: [0, -30] }),
      // Notes: numbered purple badges beside the line, clickable.
      new TextLayer({
        id: 'note-badges', data: NOTES.map((n, i) => ({ ...n, ...pointAt(n.d), label: String(i + 1) })), pickable: true, parameters: always, getPosition: posOf, getText: (d) => d.label,
        fontFamily: 'system-ui, sans-serif', fontSettings: { sdf: true }, billboard: true, getSize: 12, getColor: [255, 255, 255], fontWeight: 700, background: true,
        getBackgroundColor: [124, 58, 237, 245], backgroundPadding: [5, 2], getPixelOffset: [20, -18],
      }),
    ];
  }, [colors, mode]);

  const markerLayer = useMemo(() => pos == null ? [] : [new ScatterplotLayer({
    id: 'marker', data: [pointAt(pos)], getPosition: posOf, getRadius: 10, radiusUnits: 'pixels', getFillColor: [255, 255, 255], getLineColor: [0, 0, 0], stroked: true, lineWidthMinPixels: 3, billboard: true, parameters: { depthCompare: 'always' },
  })], [pos]);

  const terrainLayers = useMemo(() => !terrain ? [] : [new TerrainLayer({
    id: 'terrain', elevationData: DEM, texture: BASEMAPS[basemap].url, extent: EXTENT, minZoom: 8, maxZoom: MAX_TILE_ZOOM, zoomOffset: 1, meshMaxError: 2,
    elevationDecoder: { rScaler: 256, gScaler: 1, bScaler: 1 / 256, offset: -32768 - MID_ALT },
    color: [255, 255, 255],
  })], [terrain, basemap]);

  useEffect(() => {
    const el = parent.current;
    const vp = new WebMercatorViewport({ width: el.clientWidth || 900, height: el.clientHeight || 600 }).fitBounds([[EXTENT[0], EXTENT[1]], [EXTENT[2], EXTENT[3]]], { padding: 20 });
    overviewRef.current = { longitude: vp.longitude, latitude: vp.latitude, zoom: vp.zoom, pitch: 30, bearing: 0 };
    const minZoom = vp.zoom - 0.5;
    // Keep the camera inside the drawn area.
    const clamp = (v) => ({
      ...v,
      longitude: Math.min(Math.max(v.longitude, EXTENT[0]), EXTENT[2]),
      latitude: Math.min(Math.max(v.latitude, EXTENT[1]), EXTENT[3]),
      zoom: Math.min(Math.max(v.zoom, minZoom), MAX_ZOOM),
      pitch: Math.min(v.pitch, 80),
    });
    viewRef.current = overviewRef.current;
    const deck = new Deck({
      parent: el,
      views: new MapView({ repeat: false }),
      viewState: viewRef.current,
      controller: true,
      onViewStateChange: ({ viewState }) => { viewRef.current = clamp(viewState); deck.setProps({ viewState: viewRef.current }); },
      getCursor: ({ isHovering }) => (isHovering ? 'pointer' : 'grab'),
      onClick: (info) => {
        if (info.layer?.id === 'route') props.current.onPos(course.distance[info.object.bi]);
        else if (info.layer?.id === 'note-badges') props.current.onNote(info.object);
      },
    });
    deckRef.current = deck;
    return () => { deck.finalize(); deckRef.current = null; };
  }, []);

  useEffect(() => { deckRef.current?.setProps({ layers: [...terrainLayers, ...routeLayers, ...markerLayer] }); }, [terrainLayers, routeLayers, markerLayer]);

  const flyTo = (view, duration = 1500) => {
    viewRef.current = { ...view, transitionDuration: duration, transitionInterpolator: new FlyToInterpolator({ speed: 1.6 }) };
    deckRef.current?.setProps({ viewState: viewRef.current });
  };

  useEffect(() => { if (overviewTick) flyTo(overviewRef.current); }, [overviewTick]);
  useEffect(() => {
    if (!jump) return;
    const p = pointAt(jump.d);
    flyTo({ longitude: p.lng, latitude: p.lat, zoom: 15, pitch: 60, bearing: bearing(pointAt(jump.d - 200), pointAt(jump.d + 300)) });
  }, [jump]);

  // Following the marker while scrubbing, once the user has zoomed in.
  useEffect(() => {
    if (flying || pos == null || !viewRef.current || viewRef.current.zoom < 12.5 || jump?.d === pos) return;
    const p = pointAt(pos);
    viewRef.current = { ...viewRef.current, longitude: p.lng, latitude: p.lat };
    deckRef.current?.setProps({ viewState: viewRef.current });
  }, [pos, flying]);

  // Fly-over: the camera rides along the course, looking ahead, easing toward the target each frame.
  useEffect(() => {
    deckRef.current?.setProps({ controller: !flying });
    if (!flying) return undefined;
    let d = posRef.current != null && posRef.current < total - 50 ? posRef.current : 0;
    let last = performance.now(), raf;
    const step = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      d = Math.min(total, d + 100 * props.current.speed * dt);
      props.current.onPos(d);
      const here = pointAt(d);
      const heading = bearing(pointAt(d + FLY.lookAhead * 0.25), pointAt(d + FLY.lookAhead));
      const k = 1 - Math.exp(-dt * FLY.ease);
      const v = viewRef.current;
      viewRef.current = {
        longitude: lerp(v.longitude, here.lng, k), latitude: lerp(v.latitude, here.lat, k),
        zoom: lerp(v.zoom, FLY.zoom, k), pitch: lerp(v.pitch, FLY.pitch, k), bearing: lerpAngle(v.bearing, heading, k),
      };
      deckRef.current?.setProps({ viewState: viewRef.current });
      if (d >= total) { props.current.onFlyEnd(); return; }
      raf = requestAnimationFrame(step);
    };
    viewRef.current = { ...viewRef.current, transitionDuration: 0 };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [flying]);

  return <div ref={parent} style={{ position: 'absolute', inset: 0, background: 'linear-gradient(#e8eef5, #f7f9fb)' }} />;
}
