import { resilientJSON } from "@/lib/llm/resilient";

export type BlockCategory = "self_harm" | "sexually_explicit" | "dangerous_content" | "hate_harassment";

export interface CategoryVerdict {
  name: BlockCategory | "unavailable";
  violated: boolean;
  rationale: string;
}

export interface ModerationResult {
  blocked: boolean;
  categories: CategoryVerdict[];
}

const MAX_SCREEN_CHARS = 8000;

/**
 * Deterministic, zero-latency, zero-dependency backstop — and the primary
 * line of defense, not just a fallback.
 *
 * An LLM classifier makes judgment calls that vary run to run: asked to
 * weigh narrative framing, it will pass a bleak depiction of suicidal
 * ideation as "responsible portrayal" one time and flag it the next. That
 * variance is unacceptable both for user safety and for a live demo, so
 * these patterns block self-harm and sexual-content themes on sight,
 * regardless of how sympathetically they're framed. This app produces
 * synthetic audio drama from arbitrary pasted text; it is not the right
 * venue for suicide narratives even well-intentioned ones, and refusing is
 * cheap while getting it wrong is not.
 */
const KEYWORD_RULES: { category: BlockCategory; pattern: RegExp }[] = [
  {
    category: "self_harm",
    pattern:
      /\b(suicid(e|al|es)|self[- ]harm(ing|ed)?|kill (myself|himself|herself|themselves|yourself)|end (my|his|her|their|your) (own )?life|take (my|his|her|their) own life|cut(ting)? (myself|himself|herself)|overdos(e|ing)|want(ed|s)? to die)\b/i,
  },
  {
    category: "sexually_explicit",
    pattern: /\b(porn|porno|pornography|pornographic|explicit sex|sex scene|erotica|xxx|child sexual|nsfw)\b/i,
  },
  {
    category: "dangerous_content",
    pattern:
      /\b(how to (make|build) a bomb|build an explosive|synthesiz(e|ing) (nerve gas|sarin)|mass shooting|school shooting)\b/i,
  },
];

function keywordPreScreen(text: string): ModerationResult | null {
  for (const { category, pattern } of KEYWORD_RULES) {
    if (pattern.test(text)) {
      return {
        blocked: true,
        categories: [{ name: category, violated: true, rationale: "Matched a disallowed keyword pattern." }],
      };
    }
  }
  return null;
}

const CATEGORY_POLICIES: Record<BlockCategory, string> = {
  self_harm:
    "Any depiction of, reference to, or dwelling on suicide or self-harm — including ideation, intent, methods, or a character's despair about wanting to die. Sympathetic, tragic, or recovery-framed portrayals are still violations.",
  sexually_explicit: "Pornographic or sexually explicit content, including any sexual content involving minors.",
  dangerous_content: "Instructions, facilitation, or glorification of violence, weapons, or other physically dangerous acts.",
  hate_harassment: "Content that demeans, harasses, or incites hatred against a person or group.",
};

interface LLMVerdict {
  categories: { name: BlockCategory; violated: boolean; rationale: string }[];
}

/**
 * Content-safety gate for user-submitted source material, run before the
 * Adapter Agent turns it into a produced pilot. Follows the ShieldGemma
 * policy pattern (per-category binary verdict + rationale) but implemented
 * on top of this app's existing Groq/Gemini providers, not the ShieldGemma
 * model itself — this stack has no Hugging Face inference wired up.
 *
 * Unlike every other agent in this codebase (which fails OPEN — see
 * llm/resilient.ts's resilientJSONOrDefault, "never let the demo see a
 * failure"), a safety filter must fail CLOSED: if both LLM providers are
 * unreachable, we refuse rather than silently letting content through. The
 * keyword pre-screen above is the deterministic floor; this function is the
 * one deliberate exception to the fail-open philosophy used everywhere else.
 */
export async function classifyContent(text: string): Promise<ModerationResult> {
  const screened = text.slice(0, MAX_SCREEN_CHARS);

  const keywordHit = keywordPreScreen(screened);
  if (keywordHit) return keywordHit;

  const system = `You are a content safety classifier. Evaluate the given text against these policies and return a strict verdict for EACH one, even if not violated:\n${Object.entries(
    CATEGORY_POLICIES
  )
    .map(([name, policy]) => `- ${name}: ${policy}`)
    .join("\n")}\nRespond ONLY with JSON: { "categories": [{ "name": string, "violated": boolean, "rationale": string }] }. "rationale" must be one short sentence. Apply these policies to fiction exactly as you would to non-fiction — a sympathetic, tragic, or recovery-framed narrative treatment does NOT exempt content from the definitions above. Ordinary dramatic conflict, danger, or morally complex characters are fine; the specific harms named above are not.`;

  const user = `TEXT TO EVALUATE:\n${screened}`;

  try {
    const { categories } = await resilientJSON<LLMVerdict>(system, user, "gemini");
    const blocked = categories.some((c) => c.violated);
    return { blocked, categories };
  } catch (err) {
    console.warn("[moderation] classifier unavailable, failing closed:", err instanceof Error ? err.message : err);
    return {
      blocked: true,
      categories: [
        { name: "unavailable", violated: true, rationale: "Safety check unavailable — refusing to proceed." },
      ],
    };
  }
}
