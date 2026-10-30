import { MILE } from './course.js';

// Hand-written notes. Mile positions and grades come from the course profile in src/data/cim.json.
export const NOTES = [
  { mile: 0, title: 'Start · Folsom', text: 'The race starts on Folsom-Auburn Road at about 358 ft (109 m), the highest point of the course. The first mile drops 22 m (72 ft), so it feels effortless. Hold back.' },
  { mile: 1.5, title: 'First punchy bit', text: 'A short ramp of about 5% (+12 m) is followed straight away by a 5% drop (-15 m) around Oak Avenue Parkway. Short and sharp rather than long.' },
  { mile: 2.8, title: 'Long early descent', text: 'Oak Avenue falls about 29 m (95 ft) from mile 2 to mile 3.7. It is gentle, around 1%, and easy to run too fast. The quads pay for it later.' },
  { mile: 6, title: 'Fair Oaks Boulevard', text: 'The route joins Fair Oaks Boulevard in Citrus Heights near mile 6 and stays on it through Fair Oaks, Carmichael and Arden-Arcade until around mile 21.' },
  { mile: 7.55, title: 'First real uphill', text: 'About +12 m (39 ft) at 2.4% over 0.3 mi. This is the first climb since the start. Keep the effort steady and let the pace slip a little.' },
  { mile: 10.55, title: 'Roll in, drop, climb out', text: 'A 2.7% rise to mile 10.7 leads into a steep drop: 26 m (85 ft) at 3.3% down to a low point near mile 11.15.' },
  { mile: 11.35, title: 'Biggest hill on the course', text: 'The climb out of that dip gains 14 m (46 ft) at 2.5% between miles 11.2 and 11.5. It is the largest single climb here, and it is short.' },
  { mile: 13.1, title: 'Halfway · Carmichael', text: 'Halfway at 13.1 mi in Carmichael, about 38 m (125 ft) above sea level. Almost all the climbing is behind you.' },
  { mile: 18, title: 'Flat and fast', text: 'From mile 15 to mile 21.7 the course eases down 34 m (110 ft), a grade of only 0.3%. It is effectively flat, with nothing to climb.' },
  { mile: 21.75, title: 'Last bump', text: 'One last short ramp at about 3.6% (+6 m over 175 m) near mile 21.7. It is the final uphill of the race.' },
  { mile: 22.5, title: 'J Street · East Sacramento', text: 'Past mile 22 the course turns onto J Street through East Sacramento. It is flat: the course drops only 7 m over the last 4.4 miles.' },
  { mile: 25, title: 'L Street · Midtown', text: 'The course runs along L Street through Midtown into downtown. It is flat all the way into downtown.' },
  { mile: 26.2, title: 'Finish · Capitol Mall', text: 'The finish is on Capitol Mall at about 21 ft (6 m). From start to finish the course drops about 340 ft (103 m) by this data. Published figures range from 316 to 366 ft.' },
].map((n) => ({ ...n, d: Math.min(n.mile * MILE, 42195) }));
