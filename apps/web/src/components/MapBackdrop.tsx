import { CITIES, CITY_IDS, type CityId } from '@zero-patients/shared';
import { DISEASE_COLORS } from '../lib/game.js';

const W = 1920;
const H = 1080;

// deterministic "infected" cities so the pulse pattern doesn't jump between renders
const PULSING = new Set<CityId>(CITY_IDS.filter((_, i) => i % 7 === 3));

/** Dimmed, label-free city network — the title screen's backdrop. */
export default function MapBackdrop() {
  const seen = new Set<string>();
  const edges: [CityId, CityId][] = [];
  for (const id of CITY_IDS)
    for (const n of CITIES[id].neighbors) {
      const key = [id, n].sort().join('|');
      if (!seen.has(key)) {
        seen.add(key);
        edges.push([id, n as CityId]);
      }
    }

  return (
    <svg className="map-backdrop" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
      <g stroke="rgba(110,150,210,0.16)" strokeWidth={1}>
        {edges.map(([a, b]) => (
          <line
            key={`${a}|${b}`}
            x1={CITIES[a].x * W} y1={CITIES[a].y * H}
            x2={CITIES[b].x * W} y2={CITIES[b].y * H}
          />
        ))}
      </g>
      {CITY_IDS.map((id) => {
        const c = CITIES[id];
        const col = DISEASE_COLORS[c.color];
        const x = c.x * W;
        const y = c.y * H;
        return (
          <g key={id}>
            {PULSING.has(id) && (
              <circle className="halo" cx={x} cy={y} r={13} fill="none" stroke={col}
                strokeWidth={1.2} style={{ animationDelay: `${(x % 11) / 4}s` }} />
            )}
            <circle cx={x} cy={y} r={4} fill={col} fillOpacity={PULSING.has(id) ? 0.9 : 0.45}
              style={PULSING.has(id) ? { filter: `drop-shadow(0 0 6px ${col})` } : undefined} />
          </g>
        );
      })}
    </svg>
  );
}
