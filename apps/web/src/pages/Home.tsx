import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ask } from '../lib/socket.js';
import { useStore } from '../lib/store.js';
import MapBackdrop from '../components/MapBackdrop.js';

interface SeatAck {
  code: string;
  playerId: string;
  token: string;
}

export default function Home() {
  const nav = useNavigate();
  const setSession = useStore((s) => s.setSession);
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [watchCode, setWatchCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const seat = async (event: 'room:create' | 'room:join', payload: object) => {
    setBusy(true);
    setError('');
    const r = await ask<SeatAck>(event, payload);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setSession({ code: r.code, playerId: r.playerId, token: r.token, name });
    nav(`/play/${r.code}`);
  };

  return (
    <div className="home">
      <MapBackdrop />
      <div className="home-scrim" />
      <div className="home-inner">
        <h1 className="home-title">
          ZERO<span className="home-title-sep">//</span><span>PATIENTS</span>
        </h1>
        <div className="home-sub label"><span>GLOBAL OUTBREAK RESPONSE — COOPERATIVE</span></div>
        <div className="tagline">Board on the TV. Phones as controllers. Save the world together.</div>

        <div className="panel">
          <div className="label">Your name</div>
          <input
            className="field"
            value={name}
            maxLength={24}
            placeholder="Dr Okafor"
            onChange={(e) => setName(e.target.value)}
          />
          <button
            className="btn primary"
            disabled={busy || !name.trim()}
            onClick={() => seat('room:create', { name: name.trim() })}
          >
            HOST A GAME
          </button>
          <div className="row">
            <input
              className="field code"
              value={joinCode}
              maxLength={4}
              placeholder="CODE"
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            />
            <button
              className="btn"
              disabled={busy || !name.trim() || joinCode.length !== 4}
              onClick={() => seat('room:join', { code: joinCode, name: name.trim() })}
            >
              JOIN
            </button>
          </div>
        </div>

        <div className="panel">
          <div className="label">Board display (the TV)</div>
          <div className="row">
            <input
              className="field code"
              value={watchCode}
              maxLength={4}
              placeholder="CODE"
              onChange={(e) => setWatchCode(e.target.value.toUpperCase())}
            />
            <button
              className="btn"
              disabled={watchCode.length !== 4}
              onClick={() => nav(`/board/${watchCode}`)}
            >
              OPEN
            </button>
          </div>
        </div>

        {error && <div className="error">{error}</div>}
      </div>
    </div>
  );
}
