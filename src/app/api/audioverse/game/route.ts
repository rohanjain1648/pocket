import { NextResponse } from "next/server";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

function generateInitialPrompt(genre: string, storyLength: string) {
  let lengthHint = "";
  if (storyLength === "short") lengthHint = "This is a VERY SHORT story (around 5 turns). Keep the plot fast-paced.";
  else if (storyLength === "medium") lengthHint = "This is a MEDIUM story (around 10 turns). Let the plot develop naturally.";
  else if (storyLength === "epic") lengthHint = "This is an EPIC story (around 20 turns). Take your time building the world and suspense.";

  return `You are an interactive AI Dungeon Master for an audio RPG game on PocketFM.
The genre is: ${genre}.
${lengthHint}
Start the story with a gripping short hook (2-3 sentences max). Set the scene and end with a cliffhanger or immediate choice for the player.
CRITICAL: Reply STRICTLY in conversational "Hinglish" (Hindi language written in English alphabet, like Indian WhatsApp text). Use natural, modern Indian street slang (like Tapori or Gen Z slang). DO NOT invent weird words. Keep it natural and dramatic.

Return a JSON object with this exact structure:
{
  "story_continuation": "<Your Hinglish story text here. Make it gripping!>",
  "player_score_awarded": 0,
  "score_reason": "Game start",
  "game_state": {
    "current_location": "Initial Location",
    "inventory": ["Item 1"],
    "npcs_present": ["NPC 1"]
  }
}`;
}

function generateContinuationPrompt(
  history: Array<{ role: string; content: string }>,
  newAction: string,
  isEndGame: boolean,
  storyLength: string,
  gameState: any
) {
  let lengthHint = "";
  if (storyLength === "short") lengthHint = "CRITICAL: The story is short. Push the narrative to a quick climax.";
  else if (storyLength === "epic") lengthHint = "CRITICAL: This is a long epic. Focus on world-building and slow drama.";

  return `You are the interactive AI Dungeon Master. Story so far in Hinglish:
${history.map((m) => m.role + ": " + m.content).join("\n")}

Previous game state:
${JSON.stringify(gameState || {})}

The user just did/said this: "${newAction}"

${lengthHint}
${
  isEndGame
    ? "CRITICAL: This is the FINAL turn of the game. Wrap up the story in 2-3 sentences in a dramatic or hilarious way based on their action."
    : "Continue the story immediately from this action. Keep it short (2-3 sentences). React to what they said, push the narrative forward, and end with another small hook or question."
}
CRITICAL: Reply STRICTLY in conversational "Hinglish" (Hindi in English letters). No formal Hindi script. Use natural, modern Indian street slang.
CRITICAL: Maintain absolute continuity with previous turns.

SCORING MECHANISM:
Evaluate the user's action and award points based on this strict rubric:
🌟 10 - 15 Points (EPIC): Highly creative, plot-twisting, deeply dramatic, or extremely hilarious.
👍 5 - 9 Points (SOLID): Good roleplaying that moves the plot forward logically.
🥱 1 - 4 Points (BASIC): Very simple or boring actions with no flair.
❌ 0 Points (SPAM): Irrelevant nonsense or breaking character.

Return a JSON object with this exact structure:
{
  "story_continuation": "<Write your unique Hinglish story text here.>",
  "player_score_awarded": <Number from 0 to 15>,
  "score_reason": "<Short Hinglish explanation of why you gave this score.>",
  "game_state": {
    "current_location": "<Updated location>",
    "inventory": ["<Updated inventory items>"],
    "npcs_present": ["<Updated NPCs>"]
  }
}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, genre, storyLength = "short", history = [], userAction = "", isEndGame = false, gameState = {} } = body;

    let systemPrompt = "";
    if (action === "start") {
      systemPrompt = generateInitialPrompt(genre || "Mumbai Mafia", storyLength);
    } else {
      systemPrompt = generateContinuationPrompt(history, userAction, isEndGame, storyLength, gameState);
    }

    let aiResponseText = "";
    let parsedData: any = {};

    // Try OpenAI or Groq for JSON response
    if (OPENAI_API_KEY) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [{ role: "system", content: systemPrompt }],
        }),
      });
      const json = await res.json();
      aiResponseText = json.choices?.[0]?.message?.content || "";
    } else if (GROQ_API_KEY) {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          response_format: { type: "json_object" },
          messages: [{ role: "system", content: systemPrompt }],
        }),
      });
      const json = await res.json();
      aiResponseText = json.choices?.[0]?.message?.content || "";
    } else {
      // Mock response if no API keys
      parsedData = {
        story_continuation: "Bhai, tumne toh kamaal kar diya! Mumbai ke galliyo mein hungama ho gaya.",
        player_score_awarded: 10,
        score_reason: "Gazab dialog mara hai!",
        game_state: {
          current_location: "Dharavi Hideout",
          inventory: ["Gold Chain", "Stealth Gun"],
          npcs_present: ["Don Bhau"],
        },
      };
    }

    if (aiResponseText) {
      try {
        parsedData = JSON.parse(aiResponseText);
      } catch {
        parsedData = {
          story_continuation: aiResponseText,
          player_score_awarded: 5,
          score_reason: "Solid response!",
          game_state: gameState || { current_location: "Unknown", inventory: [], npcs_present: [] },
        };
      }
    }

    // Generate ElevenLabs audio if key exists
    let audioBase64 = null;
    if (ELEVENLABS_API_KEY && parsedData.story_continuation) {
      try {
        const VOICE_ID = "XNJDyPyJ8r4J7de0WJwB"; // Expressive Hindi/Hinglish voice
        const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": ELEVENLABS_API_KEY,
          },
          body: JSON.stringify({
            text: parsedData.story_continuation,
            model_id: "eleven_multilingual_v2",
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          }),
        });

        if (ttsRes.ok) {
          const buffer = await ttsRes.arrayBuffer();
          audioBase64 = Buffer.from(buffer).toString("base64");
        }
      } catch (err) {
        console.error("Audioverse TTS failed:", err);
      }
    }

    return NextResponse.json({
      ok: true,
      story: parsedData.story_continuation,
      scoreAwarded: parsedData.player_score_awarded || 0,
      scoreReason: parsedData.score_reason || "",
      gameState: parsedData.game_state || { current_location: "Unknown", inventory: [], npcs_present: [] },
      audioBase64,
    });
  } catch (error) {
    console.error("Audioverse API error:", error);
    return NextResponse.json({ ok: false, error: "Game generation failed" }, { status: 500 });
  }
}
