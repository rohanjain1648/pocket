require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { OpenAI } = require('openai');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Basic in-memory store for rooms
const rooms = {};

// Helper: Generate Initial Story Prompt
const generateInitialPrompt = (genre, storyLength) => {
  let lengthHint = "";
  if (storyLength === 'short') lengthHint = "This is a VERY SHORT story (around 5 turns). Keep the plot fast-paced.";
  else if (storyLength === 'medium') lengthHint = "This is a MEDIUM story (around 10 turns). Let the plot develop naturally.";
  else if (storyLength === 'epic') lengthHint = "This is an EPIC story (around 20 turns). Take your time building the world and suspense.";

  return `You are an interactive storyteller and game master. We are playing a multiplayer audio game.
The genre is: ${genre}.
${lengthHint}
Start the story with a very short hook (2-3 sentences max). Set the scene and end with a cliffhanger or immediate choice that the players must respond to.
CRITICAL: Reply STRICTLY in conversational "Hinglish" (Hindi language written in English alphabet, like Indian WhatsApp text). Use natural, modern Indian street slang (like Tapori or Gen Z slang). DO NOT invent weird words. Keep it natural and dramatic.
Return a JSON object with this exact structure:
{
  "story_continuation": "<Your Hinglish story text here. Make it gripping!>",
  "player_score_awarded": 0,
  "score_reason": "",
  "game_state": {
    "current_location": "Location Name",
    "inventory": ["item1", "item2"],
    "npcs_present": ["npc1"]
  }
}
CRITICAL: Do NOT copy the placeholder text. Generate a real game_state based on the scene.`;
};

const appendTurnPrompt = (prompt, nextPlayerName) => {
  if (!nextPlayerName) return prompt;
  return prompt + `\n\nAt the very end of your response, explicitly address ${nextPlayerName} and ask them what they do next. E.g. "${nextPlayerName}, ab tum kya karoge?"`;
};

// Helper: Generate Continuation Prompt
const generateContinuationPrompt = (history, newAction, isEndGame, storyLength) => {
  let lengthHint = "";
  if (storyLength === 'short') lengthHint = "CRITICAL: The story is short. Push the narrative to a quick climax.";
  else if (storyLength === 'epic') lengthHint = "CRITICAL: This is a long epic. Focus on world-building and slow drama.";

  return `You are the interactive storyteller. The story so far in Hinglish:
${history.map(m => m.role + ': ' + m.content).join('\n')}

The current game state from the previous turn is:
${JSON.stringify(history.gameState || {})}

The user just did/said this: "${newAction}"

${lengthHint}
${isEndGame 
  ? "CRITICAL: This is the FINAL turn of the game. Wrap up the story in 2-3 sentences in a dramatic or hilarious way based on their action." 
  : "Continue the story immediately from this action. Keep it short (2-3 sentences). React to what they said, push the narrative forward, and end with another small hook or question."}
CRITICAL: Reply STRICTLY in conversational "Hinglish" (Hindi in English letters). No formal Hindi script. Use natural, modern Indian street slang (like Tapori or Gen Z slang). DO NOT invent weird words.
CRITICAL: Maintain absolute continuity with the previous turns. The story must have a logical flow and build upon what just happened.

SCORING MECHANISM:
Evaluate the user's action and award points based on this strict rubric:
🌟 10 - 15 Points (EPIC): Highly creative, plot-twisting, deeply dramatic, or extremely hilarious. (e.g. "I rip off my disguise to reveal I was the villain's brother all along!")
👍 5 - 9 Points (SOLID): Good roleplaying that moves the plot forward logically. (e.g. "I jump behind the car and shoot out the tires.")
🥱 1 - 4 Points (BASIC): Very simple or boring actions with no flair. (e.g. "I run away.")
❌ 0 Points (SPAM): Irrelevant nonsense or completely breaking character.

Return a JSON object with this exact structure. DO NOT COPY THE PLACEHOLDER TEXT. YOU MUST GENERATE UNIQUE VALUES FOR EVERY TURN:
{
  "story_continuation": "<Write your unique Hinglish story text here, maintaining a strong narrative flow from the previous turns.>",
  "player_score_awarded": <A number from 0 to 15 based on the rubric>,
  "score_reason": "<Write a completely unique, short Hinglish explanation of why you gave this score.>",
  "game_state": {
    "current_location": "<Updated location>",
    "inventory": ["<Updated inventory based on what player picked up/lost>"],
    "npcs_present": ["<Updated NPCs>"]
  }
}`;
};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('create_room', async ({ genre, playerName, config }) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Map storyLength to maxTurns
    const defaultLength = 'short';
    const stLength = config?.storyLength || defaultLength;
    const turnsMap = { 'short': 5, 'medium': 10, 'epic': 20 };
    const maxTurns = turnsMap[stLength] || 5;

    rooms[roomId] = {
      id: roomId,
      genre,
      config: config ? { ...config, maxTurns } : { gameMode: 'turn-based', firstMove: 'ai', storyLength: 'short', maxTurns: 5 },
      players: [{ id: socket.id, name: playerName, score: 0 }],
      history: [],
      status: 'waiting', // Wait for creator to start
      creatorId: socket.id,
      currentTurn: null,
      turnCount: 0
    };
    
    socket.join(roomId);
    socket.emit('room_created', { roomId });
  });

  socket.on('start_game', async ({ roomId, starter }) => {
    const room = rooms[roomId];
    if (!room || room.creatorId !== socket.id || room.status !== 'waiting') return;

    room.status = 'active';
    io.to(roomId).emit('game_started');

    if (starter === 'host') {
       // Host starts. Wait for them.
       if (room.config.gameMode === 'turn-based') {
         room.currentTurn = socket.id;
         io.to(roomId).emit('turn_change', { turnId: socket.id, turnName: room.players.find(p => p.id === socket.id)?.name });
       }
       return;
    }

    // AI Starts: Generate hook
    try {
      let prompt = generateInitialPrompt(room.genre, room.config.storyLength);
      
      if (room.config.gameMode === 'turn-based') {
        room.currentTurn = socket.id;
        prompt = appendTurnPrompt(prompt, room.players.find(p => p.id === socket.id)?.name);
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: prompt }]
      });

      const data = JSON.parse(response.choices[0].message.content);
      const aiText = data.story_continuation;
      room.gameState = data.game_state || {};
      
      rooms[roomId].history.push({ role: 'ai', content: aiText });
      
      io.to(roomId).emit('story_update', { text: aiText, speaker: 'AI Dungeon Master' });
      if (rooms[roomId].config.gameMode === 'turn-based') {
        io.to(roomId).emit('turn_change', { turnId: socket.id, turnName: room.players.find(p => p.id === socket.id)?.name });
      }
      
      // Generate TTS Audio Stream via ElevenLabs
      await streamAudioToRoom(roomId, aiText);

    } catch (e) {
      console.error(e);
      socket.emit('error', 'Failed to generate initial story');
    }
  });

  socket.on('join_room', ({ roomId, playerName }) => {
    if (rooms[roomId]) {
      socket.join(roomId);
      if (!rooms[roomId].players.find(p => p.id === socket.id)) {
        rooms[roomId].players.push({ id: socket.id, name: playerName, score: 0 });
      }
      socket.emit('room_joined', { room: rooms[roomId] });
      io.to(roomId).emit('player_joined', { players: rooms[roomId].players });
      io.to(roomId).emit('turn_change', { 
        turnId: rooms[roomId].currentTurn, 
        turnName: rooms[roomId].players.find(p => p.id === rooms[roomId].currentTurn)?.name 
      });
    } else {
      socket.emit('error', 'Room not found');
    }
  });

  socket.on('user_action', async ({ roomId, text, playerName }) => {
    if (!rooms[roomId] || rooms[roomId].status === 'ended') return;
    const room = rooms[roomId];
    
    // Only allow if it's their turn (if turn-based)
    if (room.config.gameMode === 'turn-based' && room.currentTurn && room.currentTurn !== socket.id) return;

    // Broadcast what the user said
    io.to(roomId).emit('story_update', { text, speaker: playerName });
    room.turnCount++;

    const isEndGame = room.turnCount >= room.config.maxTurns;
    
    // Pick next random player for Spin the Bottle
    let nextPlayer = null;
    if (room.config.gameMode === 'turn-based' && !isEndGame) {
      nextPlayer = room.players[Math.floor(Math.random() * room.players.length)];
      room.currentTurn = nextPlayer.id;
    }
    
    try {
      let prompt = generateContinuationPrompt(
        Object.assign([], room.history, { gameState: room.gameState }), 
        text, isEndGame, room.config.storyLength
      );
      if (nextPlayer && !isEndGame) {
        prompt = appendTurnPrompt(prompt, nextPlayer.name);
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: prompt }
        ]
      });

      const data = JSON.parse(response.choices[0].message.content);
      const aiText = data.story_continuation;
      if (data.game_state) room.gameState = data.game_state;
      
      // Update score
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1 && data.player_score_awarded) {
        room.players[playerIndex].score += data.player_score_awarded;
        io.to(roomId).emit('player_joined', { players: room.players }); // update scoreboard
        io.to(roomId).emit('story_update', { 
          text: `[Score Awarded: +${data.player_score_awarded}] ${data.score_reason}`, 
          speaker: 'System' 
        });
      }

      room.history.push({ role: playerName, content: text });
      room.history.push({ role: 'ai', content: aiText });

      io.to(roomId).emit('story_update', { text: aiText, speaker: 'AI Dungeon Master' });
      
      if (isEndGame) {
        room.status = 'ended';
        io.to(roomId).emit('game_over', { players: room.players });
      } else if (room.config.gameMode === 'turn-based' && nextPlayer) {
        io.to(roomId).emit('turn_change', { turnId: nextPlayer.id, turnName: nextPlayer.name });
      }
      
      // Generate TTS Audio Stream via ElevenLabs
      await streamAudioToRoom(roomId, aiText);

    } catch (e) {
      console.error(e);
      io.to(roomId).emit('error', 'Failed to generate continuation');
    }
  });

  socket.on('player_audio_stream', ({ roomId, chunk }) => {
    // Broadcast the chunk to everyone else in the room
    socket.to(roomId).emit('player_audio_stream', { chunk });
  });

  socket.on('get_rooms', () => {
    // Send active rooms for lobby
    socket.emit('rooms_list', Object.values(rooms).map(r => ({
      id: r.id,
      genre: r.genre,
      players: r.players.length
    })));
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    for (const roomId in rooms) {
      if (rooms[roomId].players.find(p => p.id === socket.id)) {
        rooms[roomId].players = rooms[roomId].players.filter(p => p.id !== socket.id);
        io.to(roomId).emit('player_joined', { players: rooms[roomId].players });
        
        if (rooms[roomId].players.length === 0) {
          delete rooms[roomId];
        } else if (rooms[roomId].currentTurn === socket.id) {
          // If the person whose turn it is disconnects, pass turn to someone else
          const nextPlayer = rooms[roomId].players[0];
          rooms[roomId].currentTurn = nextPlayer.id;
          io.to(roomId).emit('turn_change', { turnId: nextPlayer.id, turnName: nextPlayer.name });
        }
      }
    }
  });
});

async function streamAudioToRoom(roomId, text) {
  try {
    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
    if (!ELEVENLABS_API_KEY) {
      console.log("No ElevenLabs API key found, skipping TTS");
      return;
    }

    // Using the voice requested by the user from ElevenLabs Voice Library
    const VOICE_ID = "XNJDyPyJ8r4J7de0WJwB";
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    });

    if (!response.ok) {
      console.error("ElevenLabs API Error:", await response.text());
      return;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    io.to(roomId).emit('audio_stream', { buffer });
  } catch (err) {
    console.error("Audio TTS error:", err);
  }
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
