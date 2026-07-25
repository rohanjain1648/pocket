"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { io, Socket } from "socket.io-client";
import { GradientText } from "@/components/ui/GradientText";
import {
  ArrowLeft, Swords, Play, Volume2, Mic, MicOff, Users, Crown,
  RefreshCw, Send, Radio, Sparkles, CheckCircle2, AlertCircle,
} from "lucide-react";

// Connect to the Node.js backend on Port 3001
const BACKEND_URL = "http://localhost:3001";
const socket: Socket = io(BACKEND_URL, { autoConnect: true });

export default function AudioversePage() {
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string>("Hero");

  return (
    <div className="min-h-screen bg-[#080a14] text-[#eaedf5] flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[#1e2340] bg-[#0f1220]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <Link
              href="/listen"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#1e2340] bg-[#161a2c] text-[#7d859e] hover:text-white transition-colors"
            >
              <ArrowLeft size={16} />
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-[#f5a623] to-[#8b5cf6] text-black shadow-lg">
                <Swords size={18} />
              </div>
              <h1 className="text-lg font-semibold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
                <GradientText animate={false}>Audioverse RPG</GradientText>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {currentRoom && (
              <button
                onClick={() => setCurrentRoom(null)}
                className="rounded-full border border-[#1e2340] bg-[#161a2c] px-4 py-1.5 text-xs text-[#7d859e] transition-all hover:border-[#8b5cf6]/40 hover:text-white"
              >
                Leave Room
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1">
        {!currentRoom ? (
          <Lobby
            socket={socket}
            onJoinRoom={(roomId: string) => setCurrentRoom(roomId)}
            playerName={playerName}
            setPlayerName={setPlayerName}
          />
        ) : (
          <Room
            socket={socket}
            roomId={currentRoom}
            playerName={playerName}
            onLeave={() => setCurrentRoom(null)}
          />
        )}
      </div>
    </div>
  );
}

/* ── Lobby Component ──────────────────────────────────────────────── */
function Lobby({
  socket,
  onJoinRoom,
  playerName,
  setPlayerName,
}: {
  socket: Socket;
  onJoinRoom: (roomId: string) => void;
  playerName: string;
  setPlayerName: (name: string) => void;
}) {
  const [rooms, setRooms] = useState<any[]>([]);
  const [newGenre, setNewGenre] = useState("Cyberpunk Heist");
  const [roomCode, setRoomCode] = useState("");
  const [gameMode, setGameMode] = useState("turn-based");
  const [storyLength, setStoryLength] = useState("short");

  useEffect(() => {
    socket.emit("get_rooms");

    socket.on("rooms_list", (roomsList: any[]) => {
      setRooms(roomsList);
    });

    socket.on("room_created", ({ roomId }: { roomId: string }) => {
      onJoinRoom(roomId);
    });

    return () => {
      socket.off("rooms_list");
      socket.off("room_created");
    };
  }, [socket, onJoinRoom]);

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGenre || !playerName) {
      alert("Please enter your name first!");
      return;
    }
    socket.emit("create_room", { genre: newGenre, playerName, config: { gameMode, storyLength } });
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode || !playerName) {
      alert("Please enter your name and a room code!");
      return;
    }
    onJoinRoom(roomCode.toUpperCase());
  };

  return (
    <div className="container mx-auto p-8 max-w-5xl">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-black text-white" style={{ fontFamily: "var(--font-heading)" }}>
          <GradientText>Audioverse</GradientText>
        </h1>
        <p className="text-[#7d859e] mt-1 text-base">Interactive Voice-Driven Stories & AI Dungeon Master</p>
      </header>

      <div className="max-w-4xl mx-auto mb-12">
        {/* Name Input Bar */}
        <div className="bg-[#0f1220] p-6 rounded-2xl border border-[#1e2340] shadow-2xl mb-8 flex items-center gap-4">
          <label className="text-lg font-bold whitespace-nowrap text-[#7d859e]">Your Name:</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your hero name..."
            className="flex-1 bg-[#06080f] border border-[#1e2340] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#3b82f6] transition-colors font-bold text-base"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create Room */}
          <div className="bg-[#0f1220] p-6 rounded-2xl border border-[#1e2340] shadow-2xl">
            <h2 className="text-2xl font-bold mb-4 text-white" style={{ fontFamily: "var(--font-heading)" }}>
              Create New Room
            </h2>
            <form onSubmit={handleCreateRoom} className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-[#7d859e] font-bold uppercase tracking-wider mb-2 block">GENRE</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {["Mumbai Mafia", "Cyberpunk Heist", "Haunted Haveli", "Bollywood Drama"].map((g) => (
                    <button
                      type="button"
                      key={g}
                      onClick={() => setNewGenre(g)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                        newGenre === g
                          ? "bg-[#3b82f6] text-white shadow-lg"
                          : "bg-[#161a2c] text-[#7d859e] hover:bg-[#1e2340]"
                      }`}
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
                  className="w-full bg-[#06080f] border border-[#1e2340] rounded-xl px-3 py-2.5 text-xs text-white placeholder-[#4a5072] focus:outline-none focus:border-[#3b82f6]"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs text-[#7d859e] font-bold uppercase tracking-wider mb-2 block">GAME MODE</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setGameMode("turn-based")}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold ${
                        gameMode === "turn-based" ? "bg-[#8b5cf6] text-white" : "bg-[#161a2c] text-[#7d859e]"
                      }`}
                    >
                      Spin the Bottle
                    </button>
                    <button
                      type="button"
                      onClick={() => setGameMode("free-for-all")}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold ${
                        gameMode === "free-for-all" ? "bg-[#8b5cf6] text-white" : "bg-[#161a2c] text-[#7d859e]"
                      }`}
                    >
                      Free-For-All
                    </button>
                  </div>
                </div>

                <div className="flex-1">
                  <label className="text-xs text-[#7d859e] font-bold uppercase tracking-wider mb-2 block">STORY LENGTH</label>
                  <select
                    value={storyLength}
                    onChange={(e) => setStoryLength(e.target.value)}
                    className="w-full bg-[#06080f] border border-[#1e2340] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#3b82f6]"
                  >
                    <option value="short">Short (5 Turns)</option>
                    <option value="medium">Medium (10 Turns)</option>
                    <option value="epic">Epic (20 Turns)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="mt-4 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold py-3 px-8 rounded-xl transition-colors shadow-lg"
              >
                Create Room
              </button>
            </form>
          </div>

          {/* Join by Code */}
          <div className="bg-[#0f1220] p-6 rounded-2xl border border-[#1e2340] shadow-2xl flex flex-col justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-4 text-white" style={{ fontFamily: "var(--font-heading)" }}>
                Join by Code
              </h2>
              <form onSubmit={handleJoinByCode} className="flex flex-col gap-4">
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="E.g., A7X9P1"
                  maxLength={6}
                  className="bg-[#06080f] border border-[#1e2340] rounded-xl px-4 py-3 text-white tracking-widest text-center font-mono font-bold text-lg focus:outline-none focus:border-[#34d399]"
                />
                <button
                  type="submit"
                  className="bg-[#34d399] hover:bg-[#10b981] text-black font-bold py-3 px-8 rounded-xl transition-colors shadow-lg"
                >
                  Join Room
                </button>
              </form>
            </div>

            <div className="mt-6 bg-[#06080f] border border-[#1e2340] p-4 rounded-xl text-xs text-[#7d859e] leading-relaxed">
              💡 <b>Tip:</b> Create a room, share the code with friends, and play an interactive AI audio adventure together!
            </div>
          </div>
        </div>

        {/* Active Rooms */}
        <h2 className="text-xl font-bold mb-4 text-white" style={{ fontFamily: "var(--font-heading)" }}>
          Active Rooms
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.length === 0 ? (
            <p className="text-[#7d859e] italic col-span-full text-xs">No active rooms right now. Create one!</p>
          ) : (
            rooms.map((r) => (
              <div
                key={r.id}
                className="bg-[#0f1220] rounded-2xl p-5 border border-[#1e2340] flex flex-col justify-between hover:border-[#8b5cf6]/40 transition-colors"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#34d399] bg-[#34d399]/10 px-2 py-0.5 rounded-full">
                      Live
                    </span>
                    <span className="text-xs text-[#7d859e]">👤 {r.players} players</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">Room: {r.id}</h3>
                  <p className="text-[#7d859e] text-xs">{r.genre}</p>
                </div>
                <button
                  className="mt-4 w-full bg-[#161a2c] hover:bg-[#1e2340] text-white font-semibold py-2 text-xs rounded-xl transition-colors"
                  onClick={() => {
                    if (!playerName) alert("Enter your name first!");
                    else onJoinRoom(r.id);
                  }}
                >
                  Join Room
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Room Component (Exact Port from audioverse-main) ────────────── */
function Room({
  socket,
  roomId,
  playerName,
  onLeave,
}: {
  socket: Socket;
  roomId: string;
  playerName: string;
  onLeave: () => void;
}) {
  const [room, setRoom] = useState<any>(null);
  const [transcript, setTranscript] = useState<Array<{ speaker: string; text: string }>>([]);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [currentTurnId, setCurrentTurnId] = useState<string | null>(null);
  const [currentTurnName, setCurrentTurnName] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<any>(null);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<any[]>([]);
  const isListeningRef = useRef(false);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.mediaDevices) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          mediaRecorderRef.current = new MediaRecorder(stream);
          mediaRecorderRef.current.ondataavailable = (e: any) => {
            if (e.data.size > 0) audioChunksRef.current.push(e.data);
          };
          mediaRecorderRef.current.onstop = () => {
            const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
            socket.emit("player_audio_stream", { roomId, chunk: blob });
            audioChunksRef.current = [];
          };
        })
        .catch((err) => console.error("Mic access denied", err));
    }
  }, [roomId, socket]);

  useEffect(() => {
    // CRITICAL: Emit join_room on mount of Room component
    socket.emit("join_room", { roomId, playerName });

    socket.on("room_joined", ({ room }: { room: any }) => {
      setRoom(room);
      if (room.history && room.history.length > 0) {
        setTranscript(
          room.history.map((msg: any) => ({
            speaker: msg.role === "ai" ? "AI Dungeon Master" : msg.role,
            text: msg.content,
          }))
        );
      }
    });

    socket.on("player_joined", ({ players }: { players: any[] }) => {
      setRoom((prev: any) => (prev ? { ...prev, players } : null));
    });

    socket.on("turn_change", ({ turnId, turnName }: { turnId: string; turnName: string }) => {
      setCurrentTurnId(turnId);
      setCurrentTurnName(turnName);
    });

    socket.on("game_over", ({ players }: { players: any[] }) => {
      setGameOver(true);
      if (players && players.length > 0) {
        const topPlayer = players.reduce((prev: any, current: any) => (prev.score > current.score ? prev : current));
        setWinner(topPlayer);
      }
    });

    socket.on("game_started", () => {
      setRoom((prev: any) => (prev ? { ...prev, status: "active" } : null));
    });

    socket.on("story_update", ({ text, speaker }: { text: string; speaker: string }) => {
      setTranscript((prev) => [...prev, { speaker, text }]);
    });

    socket.on("audio_stream", async ({ buffer }: { buffer: ArrayBuffer }) => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const ctx = audioContextRef.current;
        const audioBuffer = await ctx.decodeAudioData(buffer.slice(0));
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.start(0);
      } catch (err) {
        console.error("Failed to play audio", err);
      }
    });

    socket.on("player_audio_stream", ({ chunk }: { chunk: any }) => {
      try {
        const blob = new Blob([chunk], { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play();
      } catch (err) {
        console.error("Failed to play player audio", err);
      }
    });

    socket.on("error", (msg: string) => {
      alert("Error: " + msg);
      onLeave();
    });

    // Setup Speech Recognition
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = "en-IN";

        recognitionRef.current.onresult = (event: any) => {
          let finalTranscript = "";
          let currentInterim = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              currentInterim += event.results[i][0].transcript;
            }
          }

          setInterimText(currentInterim);

          if (finalTranscript.trim() !== "") {
            socket.emit("user_action", { roomId, text: finalTranscript.trim(), playerName });
            setInterimText("");
            stopListening();
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsListening(false);
        };
      }
    }

    // Spacebar to talk
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat && !isListeningRef.current) {
        startListening();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        stopListening();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      socket.off("room_joined");
      socket.off("player_joined");
      socket.off("turn_change");
      socket.off("game_over");
      socket.off("game_started");
      socket.off("story_update");
      socket.off("audio_stream");
      socket.off("player_audio_stream");
      socket.off("error");
      if (recognitionRef.current) recognitionRef.current.stop();
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [socket, roomId]);

  // Auto-scroll transcript
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, interimText]);

  const isMyTurn = room?.config?.gameMode === "free-for-all" || currentTurnId === socket.id;

  const startListening = () => {
    if (gameOver) return;
    if (recognitionRef.current && !isListening && isMyTurn) {
      try {
        recognitionRef.current.start();
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "inactive") {
          audioChunksRef.current = [];
          mediaRecorderRef.current.start();
        }
        setIsListening(true);
      } catch (e) {}
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      setIsListening(false);
      setInterimText("");
    }
  };

  if (!room) {
    return (
      <div className="p-8 text-center text-white h-[calc(100vh-60px)] bg-[#080a14] flex items-center justify-center">
        <RefreshCw size={24} className="animate-spin text-[#3b82f6] mr-2" /> Loading Room...
      </div>
    );
  }

  const isCreator = room.creatorId === socket.id;

  if (room.status === "waiting") {
    return (
      <div className="flex flex-col h-[calc(100vh-60px)] bg-[#080a14] text-white items-center justify-center p-6">
        <div className="bg-[#0f1220] p-10 rounded-2xl border border-[#1e2340] shadow-2xl max-w-2xl w-full text-center">
          <h1 className="text-4xl font-black mb-2" style={{ fontFamily: "var(--font-heading)" }}>
            Room Code: <span className="text-[#3b82f6] tracking-widest font-mono">{roomId}</span>
          </h1>
          <p className="text-[#7d859e] text-xs mb-8">Share this code with your friends to let them join!</p>

          <div className="bg-[#06080f] rounded-xl p-6 mb-8 text-left border border-[#1e2340]">
            <h2 className="text-xs font-bold text-[#7d859e] uppercase tracking-wider border-b border-[#1e2340] pb-2 mb-3">
              Players in Lobby ({room.players.length})
            </h2>
            <ul className="space-y-2">
              {room.players.map((p: any) => (
                <li key={p.id} className="flex items-center gap-3 text-base font-semibold text-white">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#34d399] animate-pulse"></span>
                  {p.name}{" "}
                  {p.id === room.creatorId && (
                    <span className="text-[10px] bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 text-[#8b5cf6] px-2 py-0.5 rounded uppercase font-bold">
                      Host
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={onLeave}
              className="px-8 py-3 rounded-xl text-[#7d859e] bg-[#161a2c] hover:bg-[#1e2340] font-bold text-xs transition-colors"
            >
              Leave Room
            </button>
            {isCreator ? (
              <>
                <button
                  onClick={() => socket.emit("start_game", { roomId, starter: "ai" })}
                  className="px-6 py-3 rounded-xl text-white bg-[#3b82f6] hover:bg-[#2563eb] font-bold text-xs shadow-lg transition-all"
                >
                  AI Starts Story
                </button>
                <button
                  onClick={() => socket.emit("start_game", { roomId, starter: "host" })}
                  className="px-6 py-3 rounded-xl text-white bg-[#8b5cf6] hover:bg-[#7c3aed] font-bold text-xs shadow-lg transition-all"
                >
                  I Will Start (Use Mic)
                </button>
              </>
            ) : (
              <div className="px-10 py-3 rounded-xl text-[#7d859e] bg-[#06080f] border border-[#1e2340] text-xs font-bold">
                Waiting for Host to Start...
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] bg-[#080a14]">
      {/* Active Room Bar */}
      <header className="bg-[#0f1220] border-b border-[#1e2340] p-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-heading)" }}>
            Room: {roomId}
          </h1>
          <p className="text-[#7d859e] text-xs">Genre: {room.genre}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[#7d859e] bg-[#161a2c] px-3 py-1 rounded-full text-xs">
            👥 {room.players.length} Players
          </span>
          <button onClick={onLeave} className="text-xs text-[#7d859e] hover:text-white transition-colors">
            Leave Room
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Scoreboard Sidebar */}
        <aside className="w-64 bg-[#0f1220] border-r border-[#1e2340] flex flex-col">
          <div className="p-4 bg-[#06080f] border-b border-[#1e2340]">
            <h2 className="font-bold text-[#7d859e] uppercase tracking-widest text-xs">Leaderboard</h2>
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-2">
            {room.players
              .slice()
              .sort((a: any, b: any) => b.score - a.score)
              .map((p: any, i: number) => (
                <div key={p.id} className="flex justify-between items-center bg-[#161a2c] p-2.5 rounded-xl text-xs">
                  <span className="font-bold text-white">
                    {i === 0 ? "👑 " : ""}
                    {p.name}
                  </span>
                  <span className="text-[#34d399] font-black">+{p.score || 0}</span>
                </div>
              ))}
          </div>
        </aside>

        {/* Chat / Transcript */}
        <main className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 relative">
          {gameOver && winner && (
            <div className="absolute inset-0 bg-[#080a14]/90 z-10 flex flex-col items-center justify-center p-8 text-center backdrop-blur-sm">
              <h2 className="text-5xl font-black text-[#34d399] mb-4 animate-bounce" style={{ fontFamily: "var(--font-heading)" }}>
                GAME OVER!
              </h2>
              <p className="text-2xl text-white mb-2">
                The Winner is 👑 <span className="font-bold text-[#3b82f6]">{winner.name}</span>
              </p>
              <p className="text-lg text-[#7d859e]">with {winner.score} points!</p>
              <button
                onClick={onLeave}
                className="mt-8 bg-[#3b82f6] hover:bg-[#2563eb] px-8 py-3 rounded-full text-white font-bold text-base transition-colors"
              >
                Return to Lobby
              </button>
            </div>
          )}

          {transcript.length === 0 && (
            <div className="text-center text-[#7d859e] mt-10 text-xs italic">
              Waiting for the story to begin...
            </div>
          )}

          {transcript.map((msg, idx) => {
            const isSystem = msg.speaker === "System";
            const isMe = msg.speaker === playerName;
            return (
              <div key={idx} className={`flex flex-col ${isMe ? "items-end" : isSystem ? "items-center" : "items-start"}`}>
                {!isSystem && <span className={`text-[10px] text-[#7d859e] mb-1 ${isMe ? "mr-1" : "ml-1"}`}>{msg.speaker}</span>}
                <div
                  className={`max-w-2xl p-4 rounded-2xl text-sm leading-relaxed ${
                    isSystem
                      ? "bg-[#34d399]/10 border border-[#34d399]/40 text-[#34d399] font-bold shadow-lg"
                      : isMe
                      ? "bg-[#3b82f6] text-white rounded-tr-none shadow-lg"
                      : "bg-[#0f1220] text-white border border-[#1e2340] rounded-tl-none shadow-lg"
                  }`}
                >
                  <p>{msg.text}</p>
                </div>
              </div>
            );
          })}

          {interimText && (
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-[#7d859e] mb-1 mr-1">You (Listening...)</span>
              <div className="max-w-2xl p-4 rounded-2xl bg-[#0f1220] border border-[#3b82f6]/50 text-xs text-[#3b82f6] rounded-tr-none animate-pulse">
                <p>{interimText}</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </main>
      </div>

      {/* Footer / Controls */}
      <footer className="bg-[#0f1220] border-t border-[#1e2340] p-4 flex flex-col justify-center items-center gap-3">
        {room.config.gameMode === "turn-based" && currentTurnName && !gameOver && (
          <div className="text-xs font-semibold text-[#7d859e] bg-[#06080f] px-4 py-1.5 rounded-full border border-[#1e2340]">
            {isMyTurn ? (
              <span className="text-[#34d399] animate-pulse flex items-center gap-2">
                <span className="w-2 h-2 bg-[#34d399] rounded-full"></span>
                It's your turn to speak!
              </span>
            ) : (
              <span>
                Waiting for <span className="text-[#3b82f6]">{currentTurnName}</span> to speak...
              </span>
            )}
          </div>
        )}

        {room.config.gameMode === "free-for-all" && !gameOver && (
          <div className="text-xs text-[#3b82f6] font-semibold bg-[#3b82f6]/10 px-4 py-1.5 rounded-full border border-[#3b82f6]/30">
            🎙️ Free-For-All Mode: Anyone can speak at any time!
          </div>
        )}

        <button
          onMouseDown={startListening}
          onMouseUp={stopListening}
          onTouchStart={startListening}
          onTouchEnd={stopListening}
          disabled={!isMyTurn || gameOver}
          className={`relative group px-10 py-3.5 rounded-full font-bold text-sm transition-all duration-200 select-none ${
            !isMyTurn || gameOver
              ? "bg-[#161a2c] text-[#7d859e] cursor-not-allowed opacity-50"
              : isListening
              ? "bg-[#f0453a] text-white shadow-[0_0_30px_rgba(240,69,58,0.6)] scale-95"
              : "bg-[#3b82f6] hover:bg-[#2563eb] text-white shadow-[0_0_20px_rgba(59,130,246,0.4)]"
          }`}
        >
          {isListening ? (
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-white rounded-full animate-ping"></span>
              Recording...
            </span>
          ) : gameOver ? (
            "Game Over"
          ) : isMyTurn ? (
            "Hold Spacebar to Speak"
          ) : (
            "Not your turn"
          )}
        </button>
      </footer>
    </div>
  );
}
