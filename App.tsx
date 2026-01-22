
import React, { useState, useEffect } from 'react';
import localforage from 'localforage';
import { 
  Zap,
  Plus,
  FileText,
  ChevronRight,
  Loader2,
  Trash2,
  Save,
  Video,
  Layout,
  Menu,
  X,
  Search
} from 'lucide-react';
import { Project, ProjectStep, VideoIdea } from './types';
import { brainstormIdeas, generateScript } from './services/geminiService';

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentStep, setCurrentStep] = useState<ProjectStep>(ProjectStep.IDEATION);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  
  // Input State
  const [nicheInput, setNicheInput] = useState('');
  const [ideas, setIdeas] = useState<VideoIdea[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Persistence
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const saved = await localforage.getItem<Project[]>('inflow_scripts_v1');
        if (saved) setProjects(saved);
      } catch (err) {
        console.error("Failed to load scripts", err);
      }
    };
    loadProjects();
  }, []);

  useEffect(() => {
    const saveProjects = async () => {
      try {
        await localforage.setItem('inflow_scripts_v1', projects);
      } catch (err) {
        console.error("Failed to save scripts", err);
      }
    };
    if (projects.length > 0) saveProjects();
  }, [projects]);

  const startNewProject = () => {
    setCurrentStep(ProjectStep.IDEATION);
    setIdeas([]);
    setCurrentProject(null);
    setNicheInput('');
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const handleBrainstorm = async () => {
    if (!nicheInput.trim()) return;
    setLoading('Analyzing trends & ideating...');
    try {
      const res = await brainstormIdeas(nicheInput);
      setIdeas(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  const handleSelectIdea = async (idea: VideoIdea) => {
    setLoading('Drafting high-retention script...');
    try {
      const script = await generateScript(idea);
      const newProject: Project = {
        id: Math.random().toString(36).substr(2, 9),
        title: idea.title,
        niche: idea.suggestedNiche,
        idea,
        script,
        createdAt: Date.now(),
        lastModified: Date.now()
      };
      
      setCurrentProject(newProject);
      setCurrentStep(ProjectStep.SCRIPTING);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  const saveToLibrary = () => {
    if (!currentProject) return;
    const exists = projects.find(p => p.id === currentProject.id);
    if (!exists) {
      setProjects([currentProject, ...projects]);
    }
    setCurrentStep(ProjectStep.NOTE);
  };

  const deleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = projects.filter(p => p.id !== id);
    setProjects(updated);
    if (currentProject?.id === id) {
      startNewProject();
    }
  };

  const openProject = (project: Project) => {
    setCurrentProject(project);
    setCurrentStep(ProjectStep.NOTE);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-screen w-full bg-[#050505] text-white font-sans overflow-hidden">
      
      {/* Mobile Toggle */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-[#18181b] text-indigo-400 border border-[#27272a]"
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar - The Library */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-80 bg-[#0a0a0a] border-r border-[#18181b] flex flex-col transition-transform duration-300
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0
      `}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Zap className="text-indigo-500" size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">inflow<span className="text-indigo-500">.io</span></h1>
          </div>
          
          <button 
            onClick={startNewProject}
            className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-zinc-300 hover:text-white transition-all flex items-center justify-center gap-2 group font-semibold"
          >
            <Plus size={18} />
            <span>New Script</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          <div className="px-2 py-2 text-xs font-bold text-zinc-500 uppercase tracking-wider">Library</div>
          {projects.length === 0 ? (
            <div className="px-2 py-8 text-center text-zinc-600 text-sm">
              No saved scripts yet.
            </div>
          ) : (
            projects.map(p => (
              <div 
                key={p.id}
                onClick={() => openProject(p)}
                className={`
                  group relative p-4 rounded-xl cursor-pointer transition-all duration-200 border
                  ${currentProject?.id === p.id ? 'bg-[#18181b] border-indigo-500/30' : 'bg-transparent border-transparent hover:bg-[#18181b] hover:border-[#27272a]'}
                `}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider bg-indigo-500/10 px-2 py-0.5 rounded-full">
                    {p.niche}
                  </span>
                  <button 
                    onClick={(e) => deleteProject(p.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <h4 className={`text-sm font-semibold leading-tight ${currentProject?.id === p.id ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                  {p.title}
                </h4>
                <div className="mt-2 text-[10px] text-zinc-600">
                  {new Date(p.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main Canvas */}
      <main className="flex-1 h-full overflow-y-auto relative bg-[#050505]">
        
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#050505]/90 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-6">
              <Loader2 className="text-indigo-500 animate-spin" size={40} />
              <div className="text-center">
                <h3 className="text-xl font-bold text-white mb-2">{loading}</h3>
                <p className="text-zinc-500 text-sm">Optimizing for engagement...</p>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-4xl mx-auto px-6 py-12 min-h-screen">
          
          {/* Step 1: Ideation */}
          {currentStep === ProjectStep.IDEATION && (
            <div className="h-full flex flex-col justify-center min-h-[60vh] animate-in fade-in duration-500">
              <div className="text-center mb-12 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-4">
                  <Zap size={12} /> Viral Engine Active
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">Production Assistant</h2>
                <p className="text-zinc-400 text-lg">Input a topic. Get 5 high-retention script concepts instantly.</p>
              </div>

              <div className="relative mb-12 max-w-2xl mx-auto w-full group">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-25 group-focus-within:opacity-50 transition duration-500"></div>
                <div className="relative flex items-center bg-[#0a0a0a] rounded-2xl border border-[#27272a] p-2">
                  <Search className="ml-4 text-zinc-500" />
                  <input 
                    type="text" 
                    value={nicheInput}
                    onChange={(e) => setNicheInput(e.target.value)}
                    placeholder="E.g. Psychology Facts, Tech News, Gym Motivation..."
                    className="flex-1 bg-transparent border-none outline-none px-4 py-4 text-lg text-white placeholder:text-zinc-600"
                    onKeyDown={(e) => e.key === 'Enter' && handleBrainstorm()}
                  />
                  <button 
                    onClick={handleBrainstorm}
                    disabled={!nicheInput}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Generate
                  </button>
                </div>
              </div>

              {ideas.length > 0 && (
                <div className="grid grid-cols-1 gap-4 max-w-2xl mx-auto w-full">
                  {ideas.map((idea, idx) => (
                    <div 
                      key={idx}
                      onClick={() => handleSelectIdea(idea)}
                      className="group p-6 bg-[#0a0a0a] border border-[#27272a] hover:border-indigo-500/50 rounded-2xl cursor-pointer transition-all hover:bg-[#101012]"
                    >
                      <h3 className="text-lg font-bold mb-2 text-zinc-200 group-hover:text-white transition-colors">
                        {idea.title}
                      </h3>
                      <div className="flex items-start gap-3">
                        <div className="mt-1 min-w-[4px] h-4 bg-indigo-500 rounded-full"></div>
                        <p className="text-zinc-500 text-sm leading-relaxed">
                          "{idea.hook}"
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2 & 3: Script & Notes */}
          {(currentStep === ProjectStep.SCRIPTING || currentStep === ProjectStep.NOTE) && currentProject && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#27272a] pb-6">
                <div>
                  <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold tracking-wider uppercase mb-2">
                    {currentStep === ProjectStep.SCRIPTING ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
                    {currentStep === ProjectStep.SCRIPTING ? 'Drafting Mode' : 'Saved to Library'}
                  </div>
                  <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
                    {currentProject.title}
                  </h1>
                </div>
                
                {currentStep === ProjectStep.SCRIPTING && (
                  <button 
                    onClick={saveToLibrary}
                    className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-xl hover:bg-zinc-200 transition-colors font-bold text-sm shadow-lg shadow-white/5"
                  >
                    <Save size={16} /> Save Script
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Script Content */}
                <div className="lg:col-span-2 space-y-8">
                  <div className="bg-[#0a0a0a] border border-[#27272a] rounded-2xl p-6">
                     <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-3">Hook Strategy</span>
                     <p className="text-lg font-medium text-white leading-relaxed">
                      "{currentProject.idea.hook}"
                     </p>
                  </div>

                  <div className="space-y-6">
                    {currentProject.script.map((seg, i) => (
                      <div key={i} className="flex gap-4 group">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#18181b] border border-[#27272a] flex items-center justify-center text-xs font-bold text-zinc-500">
                          {i + 1}
                        </div>
                        <div className="space-y-3 flex-1 pt-1">
                          <p className="text-lg text-zinc-300 leading-relaxed font-medium">
                            {seg.text}
                          </p>
                          <div className="flex items-start gap-2 text-sm text-zinc-500 bg-[#18181b]/50 p-3 rounded-lg border border-transparent group-hover:border-[#27272a] transition-colors">
                             <Video size={14} className="mt-0.5 text-indigo-400" />
                             <span className="italic">{seg.visualPrompt}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Metadata / Sidebar */}
                <div className="space-y-6">
                  <div className="bg-[#0a0a0a] border border-[#27272a] rounded-2xl p-6 sticky top-6">
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                      <Layout size={16} className="text-indigo-500" /> Content Stats
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Target Niche</div>
                        <div className="text-sm font-medium text-white bg-[#18181b] px-3 py-2 rounded-lg border border-[#27272a]">
                          {currentProject.niche}
                        </div>
                      </div>
                      <div>
                         <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Estimated Duration</div>
                         <div className="text-sm font-medium text-white bg-[#18181b] px-3 py-2 rounded-lg border border-[#27272a]">
                           ~45 Seconds
                         </div>
                      </div>
                      <div>
                         <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Virality Score</div>
                         <div className="w-full bg-[#18181b] h-2 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 w-[85%]"></div>
                         </div>
                         <div className="text-right text-xs text-indigo-400 mt-1 font-bold">High (8.5/10)</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
