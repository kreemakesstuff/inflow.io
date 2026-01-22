
import { GoogleGenAI, Type } from "@google/genai";
import { VideoIdea, ScriptSegment } from "../types";

const MODELS = {
  FAST: 'gemini-3-flash-preview',
  PRO: 'gemini-3-pro-preview',
};

export const brainstormIdeas = async (niche: string): Promise<VideoIdea[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: MODELS.FAST,
    contents: `You are a viral content strategist. Generate 5 high-retention YouTube Shorts ideas for the niche: ${niche}. 
    Focus on controversial takes, "did you know" facts, or deep curiosity loops.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            hook: { type: Type.STRING, description: 'A scroll-stopping opening line (under 5 seconds)' },
            description: { type: Type.STRING },
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
    contents: `Write a high-retention script for a YouTube Short titled: "${idea.title}".
    Context: ${idea.description}
    Hook: "${idea.hook}"
    
    Style: Fast-paced, punchy, conversational. No fluff.
    Structure: Split into short segments suitable for rapid cuts.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            time: { type: Type.STRING, description: 'Duration in seconds (e.g. "0:00-0:03")' },
            text: { type: Type.STRING, description: 'Voiceover text' },
            visualPrompt: { type: Type.STRING, description: 'Direct instructions for b-roll or visuals' }
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
