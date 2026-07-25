import React, { useState, useEffect } from 'react';

function Lobby({ socket, onJoinRoom, playerName, setPlayerName }) {
  const [rooms, setRooms] = useState([]);
  const [newGenre, setNewGenre] = useState('Cyberpunk Heist');
  const [roomCode, setRoomCode] = useState('');
  const [gameMode, setGameMode] = useState('turn-based');
  const [storyLength, setStoryLength] = useState('short');

  useEffect(() => {
    socket.emit('get_rooms');
    
    socket.on('rooms_list', (roomsList) => {
      setRooms(roomsList);
    });

    socket.on('room_created', ({ roomId }) => {
      onJoinRoom(roomId);
    });

    return () => {
      socket.off('rooms_list');
      socket.off('room_created');
    };
  }, [socket, onJoinRoom]);

  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (!newGenre || !playerName) {
      alert("Please enter your name first!");
      return;
    }
    socket.emit('create_room', { genre: newGenre, playerName, config: { gameMode, storyLength } });
  };

  const handleJoinByCode = (e) => {
    e.preventDefault();
    if (!roomCode || !playerName) {
      alert("Please enter your name and a room code!");
      return;
    }
    // Navigate to Room component which handles emitting join_room
    onJoinRoom(roomCode.toUpperCase());
  };

  return (
    <div className="container mx-auto p-8">
      <header className="mb-12 text-center">
        <h1 className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
          AudioVerse
        </h1>
        <p className="text-slate-400 mt-2 text-lg">Interactive Voice-Driven Stories</p>
      </header>

      <div className="max-w-4xl mx-auto mb-12">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-2xl mb-8 flex items-center gap-4">
          <label className="text-xl font-bold whitespace-nowrap">Your Name:</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your hero name..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors font-bold text-lg"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-2xl">
            <h2 className="text-2xl font-bold mb-4">Create New Room</h2>
            <form onSubmit={handleCreateRoom} className="flex flex-col gap-4">
              
              <div>
                <label className="text-sm text-slate-400 font-bold uppercase tracking-wider mb-2 block">Genre</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {['Mumbai Mafia', 'Cyberpunk Heist', 'Haunted Haveli', 'Bollywood Drama'].map(g => (
                    <button 
                      type="button" 
                      key={g}
                      onClick={() => setNewGenre(g)}
                      className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${newGenre === g ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={newGenre}
                  onChange={(e) => setNewGenre(e.target.value)}
                  placeholder="Or type a custom genre..."
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm text-slate-400 font-bold uppercase tracking-wider mb-2 block">Game Mode</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setGameMode('turn-based')} className={`flex-1 py-2 rounded text-sm font-bold ${gameMode === 'turn-based' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'}`}>Spin the Bottle</button>
                    <button type="button" onClick={() => setGameMode('free-for-all')} className={`flex-1 py-2 rounded text-sm font-bold ${gameMode === 'free-for-all' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'}`}>Free-For-All</button>
                  </div>
                </div>

                <div className="flex-1">
                  <label className="text-sm text-slate-400 font-bold uppercase tracking-wider mb-2 block">Story Length</label>
                  <select value={storyLength} onChange={e => setStoryLength(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white">
                    <option value="short">Short (5 Turns)</option>
                    <option value="medium">Medium (10 Turns)</option>
                    <option value="epic">Epic (20 Turns)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-lg transition-colors"
              >
                Create Room
              </button>
            </form>
          </div>

          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-2xl">
            <h2 className="text-2xl font-bold mb-4">Join by Code</h2>
            <form onSubmit={handleJoinByCode} className="flex flex-col gap-4">
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="E.g., A7X9P1"
                maxLength={6}
                className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors tracking-widest text-center font-bold"
              />
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-lg transition-colors"
              >
                Join Room
              </button>
            </form>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-6">Active Rooms</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.length === 0 ? (
          <p className="text-slate-500 italic col-span-full">No active rooms right now. Create one!</p>
        ) : (
          rooms.map(room => (
            <div key={room.id} className="bg-slate-800 rounded-xl p-6 border border-slate-700 flex flex-col justify-between hover:border-slate-500 transition-colors">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">Live</span>
                  <span className="text-sm text-slate-400">👤 {room.players} players</span>
                </div>
                <h3 className="text-xl font-bold mb-2">Room: {room.id}</h3>
                <p className="text-slate-300 text-sm">{room.genre}</p>
              </div>
              <button className="mt-6 w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 rounded transition-colors" onClick={() => {
                if (!playerName) alert("Enter your name first!");
                else onJoinRoom(room.id);
              }}>
                Join Room
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Lobby;
