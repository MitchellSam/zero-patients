import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { INFECTION_RATE_TRACK, type DiseaseColor } from '@zero-patients/shared';
import { ask } from '../lib/socket.js';
import { useStore } from '../lib/store.js';
import { describeEvent, DISEASE_COLORS, PLAYER_COLORS } from '../lib/game.js';
import BoardMap from '../components/BoardMap.js';

const COLORS: DiseaseColor[] = ['blue', 'yellow', 'black', 'red'];

export default function Board() {
  const { code = '' } = useParams();
  const { room, snapshot, feed, recentInfections, setRoom, setGame } = useStore();
  const [error, setError] = useState('');

  useEffect(() => {
    ask<{ room: never; snapshot: never }>('room:watch', { code }).then((r) => {
      if (!r.ok) return setError(r.error);
      setRoom(r.room);
      setGame(r.snapshot);
    });
  }, [code, setRoom, setGame]);

  if (error)
    return (
      <div className="b-lobby">
        <div className="error">{error}</div>
      </div>
    );

  const playerName = (id: string) =>
    snapshot?.players.find((p) => p.id === id)?.name ?? room?.players.find((p) => p.id === id)?.name ?? '?';

  // ---------- lobby: big code, waiting seats ----------
  if (!snapshot)
    return (
      <div className="board-page">
        <div className="b-bar">
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <div className="b-title">ZERO&nbsp;PATIENTS</div>
            <div className="b-sub">WAITING FOR PLAYERS</div>
          </div>
        </div>
        <div className="b-lobby">
          <div className="b-lobby-inner">
            <div className="label">JOIN AT {window.location.host} WITH CODE</div>
            <div className="bigcode">{code}</div>
            <div className="seats">
              {Array.from({ length: 4 }, (_, i) => {
                const p = room?.players[i];
                return p ? (
                  <div className="seatcard" key={p.id}>
                    <div className="swatch" style={{ background: PLAYER_COLORS[i] }} />
                    <div className="name">{p.name}</div>
                    <div className="sub">{p.isHost ? 'HOST' : p.connected ? 'READY' : 'OFFLINE'}</div>
                  </div>
                ) : (
                  <div className="seatcard empty" key={i}>
                    <div className="swatch" style={{ background: 'rgba(226,232,240,0.3)' }} />
                    <div className="name">—</div>
                    <div className="sub">OPEN SEAT</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );

  // ---------- live board ----------
  const turnIdx = snapshot.turnPlayerIndex;
  const turnPlayer = snapshot.players[turnIdx]!;
  const turnColor = PLAYER_COLORS[turnIdx % PLAYER_COLORS.length]!;
  const rateIdx = Math.min(snapshot.infectionRateIndex, INFECTION_RATE_TRACK.length - 1);

  return (
    <div className="board-page">
      <header className="b-bar">
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <div className="b-title">ZERO&nbsp;PATIENTS</div>
          <div className="b-sub">GLOBAL SITUATION // TURN {String(snapshot.turnNumber).padStart(2, '0')}</div>
        </div>
        <div className="readouts">
          <div className="readout">
            <div className="label">Infection rate</div>
            <div className="track">
              {INFECTION_RATE_TRACK.map((v, i) => (
                <div key={i} className={`cell${i === rateIdx ? ' active' : ''}`}>{v}</div>
              ))}
            </div>
          </div>
          <div className="readout">
            <div className="label">Outbreaks</div>
            <div className="track">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className={`tick${i < snapshot.outbreaks ? ' hit' : ''}`} />
              ))}
            </div>
          </div>
          <div className="readout">
            <div className="label">Cures</div>
            <div className="cures">
              {COLORS.map((c) => (
                <div key={c} className={`cure ${snapshot.cures[c] === 'active' ? 'off' : 'on'}`}>
                  <div className="dot" style={{ background: DISEASE_COLORS[c] }} />
                  <span className="state">
                    {snapshot.cures[c] === 'active' ? '——' : snapshot.cures[c] === 'cured' ? 'CURED' : 'ERAD'}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="readout">
            <div className="label">Player deck</div>
            <div className="deckcount">
              {snapshot.playerDeckCount} <span>CARDS</span>
            </div>
          </div>
        </div>
      </header>

      <main className="b-map">
        <BoardMap snapshot={snapshot} recentInfections={recentInfections} />
        <div className="vignette" />
        {snapshot.result && (
          <div className={`overlay ${snapshot.result.result}`}>
            <div>
              <div className="verdict">{snapshot.result.result === 'won' ? 'VICTORY' : 'DEFEAT'}</div>
              <div className="reason">{snapshot.result.reason}</div>
            </div>
          </div>
        )}
      </main>

      <footer className="b-bar bottom">
        <div className="turnchip" style={{ color: turnColor }}>
          <div className="swatch" style={{ background: turnColor, boxShadow: `0 0 10px ${turnColor}` }} />
          <div className="who" style={{ color: 'var(--text)' }}>
            {turnPlayer.name}&nbsp;·&nbsp;<span style={{ color: turnColor }}>{turnPlayer.role.toUpperCase()}</span>
          </div>
          <div className="pips">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className={`pip${i < snapshot.actionsLeft ? ' full' : ' used'}`} />
            ))}
          </div>
        </div>
        <div className="feed">
          {feed
            .filter((e) => e.type !== 'turn-started') // the turn chip already shows this
            .slice(-3)
            .map((e, i) => (
              <div key={i} className={['epidemic', 'outbreak', 'game-over'].includes(e.type) ? 'alert' : ''}>
                {describeEvent(e, playerName)}
              </div>
            ))}
        </div>
        <div className="roomcode">
          ROOM <b>{code}</b>
        </div>
      </footer>
    </div>
  );
}
