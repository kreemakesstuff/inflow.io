
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { VideoIdea, ScriptSegment } from "../types";

const MODELS = {
  FAST: 'gemini-3-flash-preview',
  PRO: 'gemini-3-pro-preview',
  IMAGE: 'gemini-2.5-flash-image',
  TTS: 'gemini-2.5-flash-preview-tts'
};

// Helper to wrap raw PCM in a WAV header so the browser can play it
function createWavFile(pcmBase64: string, sampleRate: number = 24000): string {
  const binaryString = atob(pcmBase64);
  const pcmData = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    pcmData[i] = binaryString.charCodeAt(i);
  }

  const header = new Uint8Array(44);
  const view = new DataView(header.buffer);
  
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + pcmData.length, true); // file length
  view.setUint32(8, 0x57415645, false); // "WAVE"
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true); // format chunk length
  view.setUint16(20, 1, true); // sample format (PCM)
  view.setUint16(22, 1, true); // channel count (mono)
  view.setUint32(24, sampleRate, true); // sample rate
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, pcmData.length, true); // data length

  const wavBlob = new Blob([header, pcmData], { type: 'audio/wav' });
  return URL.createObjectURL(wavBlob);
}

export const brainstormIdeas = async (niche: string): Promise<VideoIdea[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: MODELS.FAST,
    contents: `Act as a viral YouTube growth expert. Brainstorm 5 viral YouTube Shorts ideas for the niche: ${niche}. 
    Focus on "pattern interrupts", psychological hooks, and high-retention storytelling.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            hook: { type: Type.STRING, description: 'The explosive opening line' },
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
    contents: `Write a word-for-word, high-speed YouTube Shorts script (approx 50-60 seconds) for: "${idea.title}".
    Context: ${idea.description}
    Hook: "${idea.hook}"
    Ensure the script has no fluff. Break it into 6-10 logical visual segments. Return as a clean JSON array.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            time: { type: Type.STRING },
            text: { type: Type.STRING, description: 'Spoken dialogue' },
            visualPrompt: { type: Type.STRING, description: 'Detailed cinematic image prompt' }
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

export const generateAssetImage = async (prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: MODELS.IMAGE,
    contents: { parts: [{ text: `${prompt}. Cinematic hyper-realistic, 9:16 aspect ratio, dramatic lighting, high quality 4k digital art.` }] },
    config: {
      imageConfig: { aspectRatio: "9:16" }
    }
  });

  const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (part?.inlineData) {
    return `data:image/png;base64,${part.inlineData.data}`;
  }
  throw new Error("Generation failed");
};

export const generateAudio = async (text: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: MODELS.TTS,
    contents: [{ parts: [{ text: `Read this with a fast-paced, engaging documentary-style voice: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' }
        }
      }
    }
  });

  const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64) throw new Error("Audio generation failed");
  
  // Return the playable blob URL instead of raw base64
  return createWavFile(base64);
};
