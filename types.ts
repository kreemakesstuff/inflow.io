
export enum ProjectStep {
  IDEATION = 'IDEATION',
  SCRIPTING = 'SCRIPTING',
  GENERATING = 'GENERATING',
  REVIEW = 'REVIEW'
}

export interface VideoIdea {
  title: string;
  hook: string;
  description: string;
  suggestedNiche: string;
}

export interface ScriptSegment {
  id: string;
  time: string;
  text: string;
  visualPrompt: string;
}

export interface ProjectVisual {
  url: string;
  segmentId: string;
  isGenerating: boolean;
}

export interface Project {
  id: string;
  niche: string;
  idea: VideoIdea;
  script: ScriptSegment[];
  audioData?: string; // base64 pcm/wav
  visuals: ProjectVisual[];
  createdAt: number;
  status: 'draft' | 'ready' | 'exported';
}
