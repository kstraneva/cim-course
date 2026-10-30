import { ramp } from './colors.js';
import { course, minAlt, maxAlt } from './course.js';

const GRADE_LIMIT = 4;

// A 0..1 colour value per course point, from elevation or from grade (±GRADE_LIMIT %).
export function pointColors(mode) {
  const { altitude, distance } = course;
  const n = altitude.length;
  const smooth = altitude.map((_, i) => {
    let sum = 0, c = 0;
    for (let j = Math.max(0, i - 3); j <= Math.min(n - 1, i + 3); j++) { sum += altitude[j]; c++; }
    return sum / c;
  });
  return smooth.map((a, i) => {
    if (mode !== 'grade') return ramp((a - minAlt) / ((maxAlt - minAlt) || 1));
    const j = Math.min(n - 1, i + 1), k = Math.max(0, i - 1);
    const grade = ((smooth[j] - smooth[k]) / ((distance[j] - distance[k]) || 1)) * 100;
    return ramp((Math.max(-GRADE_LIMIT, Math.min(GRADE_LIMIT, grade)) + GRADE_LIMIT) / (2 * GRADE_LIMIT));
  });
}

export const GRADE_LIMIT_PCT = GRADE_LIMIT;
