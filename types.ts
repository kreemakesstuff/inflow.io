
export enum ProjectStep {
  IDEATION = 'IDEATION',
  SCRIPTING = 'SCRIPTING',
  NOTE = 'NOTE'
}

export interface User {
  name: string;
  email: string;
  joinedAt: number;
}

export interface VideoIdea {
  title: string;
  hook: string;
  description: string;
  suggestedNiche: string;
}

export interface ScriptSegment {
  id: string;
  time: string; // Kept for pacing
  text: string;
  visualPrompt: string; // Kept as "Imagery Note"
  visualImage?: string; // Generated image base64
}

export interface Project {
  id: string;
  title: string;
  niche: string;
  idea: VideoIdea;
  script: ScriptSegment[];
  createdAt: number;
  lastModified: number;
}
