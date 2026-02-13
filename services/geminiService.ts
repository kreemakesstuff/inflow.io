
import { GoogleGenAI, Type } from "@google/genai";
import { VideoIdea, ScriptSegment } from "../types";

const MODELS = {
  FAST: 'gemini-3-flash-preview',
  PRO: 'gemini-3-pro-preview',
  IMAGE: 'gemini-2.5-flash-image',
};

export const brainstormIdeas = async (niche: string): Promise<VideoIdea[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: MODELS.FAST,
    contents: `You are a world-class viral strategist for short-form vertical video (TikTok, Instagram Reels, YouTube Shorts). Generate 5 highly viral, high-retention video ideas for the niche: "${niche}".
    
    **Viral Criteria (Must Meet All):**
    1. **Psychological Hook**: Use frameworks like "The Gap Theory" (reveal a knowledge gap), "Negativity Bias" (warn against a mistake), or "Counter-Intuitive Truths" (challenge common beliefs).
    2. **Visual Potential**: Ideas must be visually demonstrable, not just abstract talking heads.
    3. **Broad Appeal**: Even within the niche, the specific angle must be interesting to a general audience on any platform.
    4. **Loopability**: Ideas that naturally loop or encourage re-watching are preferred.

    Focus on high energy, curiosity, and immediate value suitable for the TikTok/Reels/Shorts algorithm.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Clickbaity but truthful title" },
            hook: { type: Type.STRING, description: 'A scroll-stopping opening line (under 3 seconds)' },
            description: { type: Type.STRING, description: "Brief context on why this will go viral on TikTok/Reels/Shorts" },
            suggestedNiche: { type: Type.STRING }
          },
          required: ['title', 'hook', 'description', 'suggestedNiche']
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || '[]');
  } catch (e) {
    console.error("Ideation error:", e);
    return [];
  }
};

export const generateScript = async (idea: VideoIdea): Promise<ScriptSegment[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: MODELS.PRO,
    contents: `Act as a professional scripter for short-form viral content (TikTok, Reels, Shorts) specializing in >100% retention. Write a script for: "${idea.title}".
    
    **Context:** ${idea.description}
    **Hook:** "${idea.hook}"
    
    **Strict Guidelines for Virality:**
    1. **Pacing**: Fast. Zero fluff. Every sentence must provide new information or visual stimulation.
    2. **Structure**:
       - **0-3s (The Hook)**: Visual + Audio shock. Grab attention immediately.
       - **3-10s (The Re-Hook)**: Why should they care? What is at stake?
       - **10-45s (The Meat)**: Rapid-fire value delivery. Use active verbs. 4th-grade reading level.
       - **45-60s (The Payoff/Loop)**: A satisfying conclusion that can loop back to the start seamlessly if possible.
    3. **Visual Prompts**: These must be HIGHLY detailed. Describe specific camera angles (e.g., "Low angle shot"), lighting (e.g., "Neon cinematic lighting"), and action. They should be ready for a high-end AI image generator.

    Generate a JSON array of segments.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            time: { type: Type.STRING, description: 'Duration in seconds (e.g. "0:00-0:03")' },
            text: { type: Type.STRING, description: 'Voiceover text (punchy, conversational)' },
            visualPrompt: { type: Type.STRING, description: 'Cinematic, highly detailed visual description for AI image generation (include lighting, style, camera angle).' }
          },
          required: ['id', 'time', 'text', 'visualPrompt']
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || '[]');
  } catch (e) {
    console.error("Script error:", e);
    return [];
  }
};

export const generateStoryboardImage = async (visualDescription: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: MODELS.IMAGE,
      contents: {
        parts: [{ text: `Cinematic, hyper-realistic 4k vertical image, 9:16 aspect ratio, highly detailed, trending on artstation. Designed for TikTok/Reels background. ${visualDescription}` }]
      },
      config: {
        imageConfig: {
          aspectRatio: "9:16"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (e) {
    console.error("Image gen error:", e);
    return null;
  }
};
