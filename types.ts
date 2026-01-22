
export enum ProjectStep {
  IDEATION = 'IDEATION',
  SCRIPTING = 'SCRIPTING',
  NOTE = 'NOTE'
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
