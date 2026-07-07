import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CARDS_TO_CURE,
  CARDS_TO_CURE_SCIENTIST,
  CITIES,
  isCityId,
  type CityId,
  type DiseaseColor,
  type GameSnapshot,
  type PlayerAction,
} from '@zero-patients/shared';
import { ask } from '../lib/socket.js';
import { useStore } from '../lib/store.js';
import { cityColor, cityName, DISEASE_COLORS, PLAYER_COLORS } from '../lib/game.js';

const COLORS: DiseaseColor[] = ['blue', 'yellow', 'black', 'red'];

export default function Controller() {
  const { code = '' } = useParams();
  const nav = useNavigate();
  const { session, room, snapshot, setRoom, setGame } = useStore();
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // resume the seat (covers refresh, wifi drops, and the initial visit)
  useEffect(() => {
    if (!session || session.code !== code) {
      nav('/');
      return;
    }
    ask<{ room: never; snapshot: never }>('room:rejoin', { code, token: session.token }).then((r) => {
      if (!r.ok) return setError(r.error);
      setRoom(r.room);
      setGame(r.snapshot);
    });
  }, [code, session, nav, setRoom, setGame]);

  const act = async (action: PlayerAction) => {
    setToast('');
    const r = await ask('game:action', { action });
    if (!r.ok) {
      setToast(r.error);
      setTimeout(() => setToast(''), 3000);
    }
  };

  if (error) return <div className="ctrl"><div className="c-lobby"><div className="error">{error}</div></div></div>;
  if (!session || !room) return null;

  const seatIndex = room.players.findIndex((p) => p.id === session.playerId);
  const roleColor = PLAYER_COLORS[seatIndex % PLAYER_COLORS.length]!;
  const isHost = room.players[seatIndex]?.isHost ?? false;

  // ---------- lobby ----------
  if (!snapshot)
    return (
      <div className="ctrl" style={{ ['--role' as string]: roleColor }}>
        <header className="c-head">
          <div className="c-idrow">
            <div className="c-who">
              <div className="chip" />
              <div>
                <div className="name">{session.name.toUpperCase()}</div>
                <div className="role">{isHost ? 'HOST' : 'READY'}</div>
              </div>
            </div>
            <div className="roomcode">ROOM <b>{code}</b></div>
          </div>
        </header>
        <div className="c-lobby">
          <div className="label">Players · {room.players.length}/4</div>
          {room.players.map((p, i) => (
            <div className="seat" key={p.id}>
              <div className="swatch" style={{ background: PLAYER_COLORS[i] }} />
              <span>{p.name}</span>
              {p.isHost && <span className="host label">HOST</span>}
            </div>
          ))}
          {isHost && (
            <button
              className="btn primary"
              disabled={room.players.length < 2}
              onClick={async () => {
                const r = await ask('room:start', {});
                if (!r.ok) setToast(r.error);
              }}
            >
              {room.players.length < 2 ? 'NEED 2+ PLAYERS' : 'START GAME'}
            </button>
          )}
          {!isHost && <div className="label" style={{ textAlign: 'center', marginTop: 8 }}>waiting for the host…</div>}
          <div className="label" style={{ textAlign: 'center', marginTop: 16 }}>
            TV: open {window.location.host}/board/{code}
          </div>
        </div>
        {toast && <div className="toast">{toast}</div>}
      </div>
    );

  return (
    <InGame
      code={code}
      snapshot={snapshot}
      playerId={session.playerId}
      roleColor={roleColor}
      act={act}
      toast={toast}
    />
  );
}

// ---------- in-game controller ----------

function InGame({ snapshot, playerId, roleColor, act, toast }: {
  code: string;
  snapshot: GameSnapshot;
  playerId: string;
  roleColor: string;
  act: (a: PlayerAction) => void;
  toast: string;
}) {
  const me = snapshot.players.find((p) => p.id === playerId)!;
  const myTurn = snapshot.players[snapshot.turnPlayerIndex]!.id === playerId && !snapshot.result;
  const mustDiscard = snapshot.pendingDiscard === playerId;
  const blocked = snapshot.pendingDiscard !== null && !mustDiscard;
  const canAct = myTurn && !snapshot.pendingDiscard;

  const here = me.location as CityId;
  const atStation = snapshot.researchStations.includes(here);
  const cubesHere = snapshot.cubes[here] ?? { blue: 0, yellow: 0, black: 0, red: 0 };
  const holdsHere = me.hand.includes(here);

  const [charterTo, setCharterTo] = useState('');

  const cureNeed = me.role === 'scientist' ? CARDS_TO_CURE_SCIENTIST : CARDS_TO_CURE;
  const byColor = useMemo(() => {
    const m: Record<DiseaseColor, CityId[]> = { blue: [], yellow: [], black: [], red: [] };
    for (const c of me.hand) if (isCityId(c)) m[CITIES[c].color].push(c);
    return m;
  }, [me.hand]);

  const others = snapshot.players.filter((p) => p.id !== playerId && p.location === me.location);

  const shareOptions: { label: string; action: PlayerAction }[] = [];
  for (const o of others) {
    const give = (city: string) => ({
      label: `Give ${cityName(city)} → ${o.name}`,
      action: { type: 'share-knowledge', withPlayer: o.id, city, direction: 'give' } as PlayerAction,
    });
    const take = (city: string) => ({
      label: `Take ${cityName(city)} ← ${o.name}`,
      action: { type: 'share-knowledge', withPlayer: o.id, city, direction: 'take' } as PlayerAction,
    });
    if (me.role === 'researcher') me.hand.forEach((c) => shareOptions.push(give(c)));
    else if (holdsHere) shareOptions.push(give(here));
    if (o.role === 'researcher') o.hand.forEach((c) => shareOptions.push(take(c)));
    else if (o.hand.includes(here)) shareOptions.push(take(here));
  }

  return (
    <div className="ctrl" style={{ ['--role' as string]: roleColor }}>
      <header className="c-head">
        <div className="c-idrow">
          <div className="c-who">
            <div className="chip" />
            <div>
              <div className="name">{me.name.toUpperCase()}</div>
              <div className="role">{me.role.replace('-', ' ')}</div>
            </div>
          </div>
          <div className="c-stats">
            <span>OUTBREAKS <b>{snapshot.outbreaks}</b>/8</span>
            <span>INF RATE <b>{snapshot.infectionRate}</b></span>
          </div>
        </div>
        <div className="c-turnrow">
          <div className={`c-turnlabel${myTurn ? '' : ' waiting'}`}>
            {snapshot.result
              ? snapshot.result.result === 'won' ? '✦ VICTORY' : '✕ DEFEAT'
              : mustDiscard ? '! OVER HAND LIMIT'
              : myTurn ? '▶ YOUR TURN'
              : `WAITING — ${snapshot.players[snapshot.turnPlayerIndex]!.name.toUpperCase()}`}
          </div>
          <div className="pips" style={{ color: roleColor }}>
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className={`pip${myTurn && i < snapshot.actionsLeft ? ' full' : ' used'}`} />
            ))}
          </div>
        </div>
      </header>

      <div className="c-scroll">
        {mustDiscard && <div className="c-banner">Hand limit is 7 — tap a card below to discard.</div>}
        {blocked && <div className="c-banner info">Waiting for a discard…</div>}

        <div className="c-loc">
          <div className="left">
            <div className="dot" style={{ background: cityColor(here), boxShadow: `0 0 10px ${cityColor(here)}` }} />
            <div>
              <div className="city">{cityName(here)}</div>
              <div className="sub">
                {COLORS.filter((c) => cubesHere[c] > 0).map((c) => `${cubesHere[c]} ${c}`).join(' · ') ||
                  'no active infection'}
              </div>
            </div>
          </div>
          {atStation && <div className="stn"><div className="dia" />RESEARCH STN</div>}
        </div>

        {canAct && (
          <>
            <div className="section-label label">Move — drive / ferry</div>
            <div className="list">
              {CITIES[here].neighbors.map((n) => (
                <button key={n} className="dest" onClick={() => act({ type: 'drive', to: n })}>
                  <span className="left">
                    <span className="dot" style={{ background: cityColor(n), boxShadow: `0 0 8px ${cityColor(n)}` }} />
                    {cityName(n).toUpperCase()}
                    {COLORS.map((c) =>
                      Array.from({ length: snapshot.cubes[n]?.[c] ?? 0 }, (_, i) => (
                        <span key={`${c}${i}`} className="cube" style={{ background: DISEASE_COLORS[c] }} />
                      ))
                    )}
                  </span>
                  <span className="go">GO →</span>
                </button>
              ))}
            </div>

            <div className="section-label label">Treat</div>
            <div className="agrid">
              {COLORS.map((c) => (
                <button key={c} className="action" disabled={cubesHere[c] === 0} onClick={() => act({ type: 'treat', color: c })}>
                  <span className="a-name" style={{ color: cubesHere[c] ? DISEASE_COLORS[c] : undefined }}>
                    Treat {c}
                  </span>
                  <span className="a-sub">
                    {cubesHere[c] === 0 ? 'no cubes here'
                      : me.role === 'medic' || snapshot.cures[c] !== 'active' ? `remove all ${cubesHere[c]}`
                      : 'remove 1 cube'}
                  </span>
                </button>
              ))}
            </div>

            <div className="section-label label">Other actions</div>
            <div className="agrid">
              <button
                className="action"
                disabled={atStation || (me.role !== 'operations-expert' && !holdsHere)}
                onClick={() => act({ type: 'build-station' })}
              >
                <span className="a-name">Build station</span>
                <span className="a-sub">
                  {atStation ? 'already one here'
                    : me.role === 'operations-expert' ? 'free build'
                    : holdsHere ? `discard ${cityName(here)}` : `need ${cityName(here)} card`}
                </span>
              </button>
              {COLORS.map((c) => (
                <button
                  key={c}
                  className="action"
                  disabled={!atStation || snapshot.cures[c] !== 'active' || byColor[c].length < cureNeed}
                  onClick={() => act({ type: 'discover-cure', color: c, cards: byColor[c].slice(0, cureNeed) })}
                >
                  <span className="a-name" style={{ color: DISEASE_COLORS[c] }}>Cure {c}</span>
                  <span className="a-sub">
                    {snapshot.cures[c] !== 'active' ? 'already cured'
                      : !atStation ? 'need a station'
                      : `${byColor[c].length}/${cureNeed} cards`}
                  </span>
                </button>
              ))}
              <button className="action" onClick={() => act({ type: 'pass' })}>
                <span className="a-name">Pass</span>
                <span className="a-sub">end your turn</span>
              </button>
            </div>

            {shareOptions.length > 0 && (
              <>
                <div className="section-label label">Share knowledge</div>
                <div className="list">
                  {shareOptions.map((o, i) => (
                    <button key={i} className="dest" onClick={() => act(o.action)}>
                      <span className="left">{o.label}</span>
                      <span className="go">SHARE</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="section-label label">Fly</div>
            <div className="list">
              {me.hand.filter((c) => c !== here).map((c) => (
                <button key={c} className="dest" onClick={() => act({ type: 'direct-flight', to: c })}>
                  <span className="left">
                    <span className="dot" style={{ background: cityColor(c) }} />
                    {cityName(c).toUpperCase()}
                  </span>
                  <span className="go">DISCARD + FLY →</span>
                </button>
              ))}
              {atStation && snapshot.researchStations.filter((s) => s !== here).map((s) => (
                <button key={s} className="dest" onClick={() => act({ type: 'shuttle-flight', to: s })}>
                  <span className="left">
                    <span className="dot" style={{ background: cityColor(s) }} />
                    {cityName(s).toUpperCase()}
                  </span>
                  <span className="go">SHUTTLE →</span>
                </button>
              ))}
              {holdsHere && (
                <div className="dest" style={{ gap: 8 }}>
                  <select className="field" value={charterTo} onChange={(e) => setCharterTo(e.target.value)}>
                    <option value="">Charter flight to…</option>
                    {Object.keys(CITIES).filter((c) => c !== here).map((c) => (
                      <option key={c} value={c}>{cityName(c)}</option>
                    ))}
                  </select>
                  <button className="go" disabled={!charterTo} onClick={() => { act({ type: 'charter-flight', to: charterTo }); setCharterTo(''); }}>
                    FLY →
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="c-sheet">
        <div className="grabber" />
        <div className="c-sheet-head">
          <div className="label">Your hand · {me.hand.length}</div>
          {mustDiscard && <div className="label" style={{ color: 'var(--red)' }}>TAP TO DISCARD</div>}
        </div>
        <div className="hand">
          {me.hand.map((c, i) => (
            <button
              key={`${c}${i}`}
              className={`card${mustDiscard ? ' discardable' : ''}`}
              disabled={!mustDiscard}
              onClick={() => act({ type: 'discard', card: c })}
            >
              <span className="band" style={{ background: `linear-gradient(135deg, ${cityColor(c)}44, ${cityColor(c)})` }}>
                <span className="bdot" />
              </span>
              <span className="cname">{cityName(c)}</span>
              <span className="ctype">CITY — {isCityId(c) ? CITIES[c].color.toUpperCase() : ''}</span>
            </button>
          ))}
        </div>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
