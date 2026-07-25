import React, { useState, useEffect, useRef } from 'react';

function Room({ socket, roomId, playerName, onLeave }) {
  const [room, setRoom] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [currentTurnId, setCurrentTurnId] = useState(null);
  const [currentTurnName, setCurrentTurnName] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  
  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const isListeningRef = useRef(false);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        socket.emit('player_audio_stream', { roomId, chunk: blob });
        audioChunksRef.current = [];
      };
    }).catch(err => console.error("Mic access denied", err));
  }, [roomId, socket]);

  useEffect(() => {
    socket.emit('join_room', { roomId, playerName });

    socket.on('room_joined', ({ room }) => {
      setRoom(room);
      if (room.history && room.history.length > 0) {
        setTranscript(room.history.map(msg => ({
          speaker: msg.role === 'ai' ? 'AI Dungeon Master' : msg.role,
          text: msg.content
        })));
      }
    });

    socket.on('player_joined', ({ players }) => {
      setRoom(prev => prev ? { ...prev, players } : null);
    });

    socket.on('turn_change', ({ turnId, turnName }) => {
      setCurrentTurnId(turnId);
      setCurrentTurnName(turnName);
    });

    socket.on('game_over', ({ players }) => {
      setGameOver(true);
      const topPlayer = players.reduce((prev, current) => (prev.score > current.score) ? prev : current);
      setWinner(topPlayer);
    });

    socket.on('game_started', () => {
      setRoom(prev => prev ? { ...prev, status: 'active' } : null);
    });

    socket.on('story_update', ({ text, speaker }) => {
      setTranscript(prev => [...prev, { speaker, text }]);
    });

    socket.on('audio_stream', async ({ buffer }) => {
      // Play the received MP3 buffer
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      
      try {
        const audioBuffer = await ctx.decodeAudioData(buffer);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.start(0);
      } catch (err) {
        console.error("Failed to play audio", err);
      }
    });

    socket.on('player_audio_stream', ({ chunk }) => {
      try {
        const blob = new Blob([chunk], { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play();
      } catch (err) {
        console.error("Failed to play player audio", err);
      }
    });

    socket.on('error', (msg) => {
      alert("Error: " + msg);
      onLeave();
    });

    // Setup Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-IN'; // Support Indian English / Hinglish (English alphabet)

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let currentInterim = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }

        setInterimText(currentInterim);
        
        if (finalTranscript.trim() !== '') {
          socket.emit('user_action', { roomId, text: finalTranscript.trim(), playerName });
          setInterimText('');
          // Stop listening after a final result is sent
          stopListening();
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };
    }

    // Spacebar to talk
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && !e.repeat && !isListeningRef.current) {
        startListening();
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        stopListening();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      socket.off('room_joined');
      socket.off('player_joined');
      socket.off('turn_change');
      socket.off('game_over');
      socket.off('game_started');
      socket.off('story_update');
      socket.off('audio_stream');
      socket.off('player_audio_stream');
      socket.off('error');
      if (recognitionRef.current) recognitionRef.current.stop();
      window.speechSynthesis.cancel(); // Stop speaking if we leave
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [socket, roomId]);

  // Auto-scroll transcript
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, interimText]);

  const isMyTurn = room?.config?.gameMode === 'free-for-all' || currentTurnId === socket.id;

  const startListening = () => {
    if (gameOver) return;
    if (recognitionRef.current && !isListening && isMyTurn) {
      try {
        recognitionRef.current.start();
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
          audioChunksRef.current = [];
          mediaRecorderRef.current.start();
        }
        setIsListening(true);
      } catch(e) {}
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsListening(false);
      setInterimText('');
    }
  };

  if (!room) return <div className="p-8 text-center text-white h-screen bg-slate-900 flex items-center justify-center">Loading Room...</div>;

  const isCreator = room.creatorId === socket.id;

  if (room.status === 'waiting') {
    return (
      <div className="flex flex-col h-screen bg-slate-900 text-slate-50 items-center justify-center p-6">
        <div className="bg-slate-800 p-10 rounded-2xl border border-slate-700 shadow-2xl max-w-2xl w-full text-center">
          <h1 className="text-4xl font-black mb-2">Room Code: <span className="text-blue-500 tracking-widest">{roomId}</span></h1>
          <p className="text-slate-400 mb-8">Share this code with your friends to let them join!</p>
          
          <div className="bg-slate-900 rounded-xl p-6 mb-8 text-left">
            <h2 className="text-xl font-bold mb-4 text-slate-300 border-b border-slate-700 pb-2">Players in Lobby ({room.players.length})</h2>
            <ul className="space-y-2">
              {room.players.map(p => (
                <li key={p.id} className="flex items-center gap-3 text-lg">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  {p.name} {p.id === room.creatorId && <span className="text-xs bg-purple-600/30 text-purple-400 px-2 py-1 rounded ml-2 uppercase font-bold">Host</span>}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-4 justify-center">
            <button onClick={onLeave} className="px-8 py-3 rounded-lg text-slate-300 bg-slate-700 hover:bg-slate-600 font-bold transition-colors">
              Leave Room
            </button>
            {isCreator ? (
              <>
                <button 
                  onClick={() => socket.emit('start_game', { roomId, starter: 'ai' })}
                  className="px-6 py-3 rounded-lg text-white bg-blue-600 hover:bg-blue-500 font-bold shadow-[0_0_15px_rgba(37,99,235,0.5)] transition-all"
                >
                  AI Starts Story
                </button>
                <button 
                  onClick={() => socket.emit('start_game', { roomId, starter: 'host' })}
                  className="px-6 py-3 rounded-lg text-white bg-purple-600 hover:bg-purple-500 font-bold shadow-[0_0_15px_rgba(147,51,234,0.5)] transition-all"
                >
                  I Will Start (Use Mic)
                </button>
              </>
            ) : (
              <div className="px-10 py-3 rounded-lg text-slate-400 bg-slate-900 border border-slate-700 font-bold">
                Waiting for Host to Start...
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Room: {roomId}</h1>
          <p className="text-slate-400 text-sm">Genre: {room.genre}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-300 bg-slate-700 px-3 py-1 rounded-full text-sm">
            👥 {room.players.length} Players
          </span>
          <button 
            onClick={onLeave}
            className="text-slate-400 hover:text-white transition-colors"
          >
            Leave Room
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Scoreboard Sidebar */}
        <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
          <div className="p-4 bg-slate-900 border-b border-slate-700">
            <h2 className="font-bold text-slate-300 uppercase tracking-widest text-sm">Leaderboard</h2>
          </div>
          <div className="p-4 flex-1 overflow-y-auto">
            {room.players.sort((a,b) => b.score - a.score).map((p, i) => (
              <div key={p.id} className="flex justify-between items-center mb-3 bg-slate-700/50 p-2 rounded">
                <span className="font-bold text-slate-200">
                  {i === 0 ? '👑 ' : ''}{p.name}
                </span>
                <span className="text-emerald-400 font-black">{p.score || 0}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Chat / Transcript */}
        <main className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 relative">
          
          {gameOver && winner && (
            <div className="absolute inset-0 bg-slate-900/90 z-10 flex flex-col items-center justify-center p-8 text-center backdrop-blur-sm">
              <h2 className="text-6xl font-black text-emerald-400 mb-4 animate-bounce">GAME OVER!</h2>
              <p className="text-3xl text-white mb-2">The Winner is 👑 <span className="font-bold text-blue-400">{winner.name}</span></p>
              <p className="text-xl text-slate-300">with {winner.score} points!</p>
              <button onClick={onLeave} className="mt-8 bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-full text-white font-bold text-xl transition-colors">
                Return to Lobby
              </button>
            </div>
          )}

          {transcript.length === 0 && (
            <div className="text-center text-slate-500 mt-10 italic">
              Waiting for the story to begin...
            </div>
          )}
          
          {transcript.map((msg, idx) => {
            const isSystem = msg.speaker === 'System';
            const isMe = msg.speaker === playerName;
            return (
              <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : isSystem ? 'items-center' : 'items-start'}`}>
                {!isSystem && <span className={`text-xs text-slate-400 mb-1 ${isMe ? 'mr-1' : 'ml-1'}`}>{msg.speaker}</span>}
                <div className={`max-w-2xl p-4 rounded-2xl ${
                  isSystem
                    ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-sm font-bold shadow-lg'
                    : isMe
                      ? 'bg-blue-600 text-white rounded-tr-sm' 
                      : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-tl-sm shadow-lg'
                }`}>
                  <p className="text-lg leading-relaxed">{msg.text}</p>
                </div>
              </div>
            );
          })}

          {interimText && (
            <div className="flex flex-col items-end">
               <span className="text-xs text-slate-400 mb-1 mr-1">You (Listening...)</span>
               <div className="max-w-2xl p-4 rounded-2xl bg-slate-800 border border-blue-500/50 text-slate-300 rounded-tr-sm animate-pulse">
                  <p className="text-lg leading-relaxed">{interimText}</p>
               </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </main>
      </div>

      {/* Footer / Controls */}
      <footer className="bg-slate-800 border-t border-slate-700 p-6 flex flex-col justify-center items-center gap-4">
        {room.config.gameMode === 'turn-based' && currentTurnName && !gameOver && (
          <div className="text-slate-300 font-semibold bg-slate-900 px-4 py-2 rounded-full border border-slate-700">
            {isMyTurn ? (
              <span className="text-emerald-400 animate-pulse flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                It's your turn to speak!
              </span>
            ) : (
              <span>Waiting for <span className="text-blue-400">{currentTurnName}</span> to speak...</span>
            )}
          </div>
        )}

        {room.config.gameMode === 'free-for-all' && !gameOver && (
          <div className="text-blue-400 font-semibold bg-blue-900/30 px-4 py-2 rounded-full border border-blue-800/50">
            🎙️ Free-For-All Mode: Anyone can speak at any time!
          </div>
        )}

        <button
          onMouseDown={startListening}
          onMouseUp={stopListening}
          onTouchStart={startListening}
          onTouchEnd={stopListening}
          disabled={!isMyTurn || gameOver}
          className={`relative group px-12 py-4 rounded-full font-bold text-xl transition-all duration-200 select-none ${
            (!isMyTurn || gameOver)
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-50'
              : isListening 
                ? 'bg-red-500 text-white shadow-[0_0_40px_rgba(239,68,68,0.6)] scale-95'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]'
          }`}
        >
          {isListening ? (
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 bg-white rounded-full animate-ping"></span>
              Recording...
            </span>
          ) : (
            gameOver ? 'Game Over' : isMyTurn ? 'Hold Spacebar to Speak' : 'Not your turn'
          )}
        </button>
      </footer>
    </div>
  );
}

export default Room;
