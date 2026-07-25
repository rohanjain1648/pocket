import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Lobby from './components/Lobby';
import Room from './components/Room';

// Connect to the Node.js backend. Uses VITE_BACKEND_URL in production, falls back to localhost:3001 locally.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || `http://${window.location.hostname}:3001`;
const socket = io(BACKEND_URL);

function App() {
  const [currentRoom, setCurrentRoom] = useState(null);
  const [playerName, setPlayerName] = useState('');

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 font-sans">
      {!currentRoom ? (
        <Lobby socket={socket} onJoinRoom={(roomId) => setCurrentRoom(roomId)} playerName={playerName} setPlayerName={setPlayerName} />
      ) : (
        <Room socket={socket} roomId={currentRoom} playerName={playerName} onLeave={() => setCurrentRoom(null)} />
      )}
    </div>
  );
}

export default App;
