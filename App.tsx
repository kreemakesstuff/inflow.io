
import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, 
  Search, 
  LayoutDashboard, 
  Plus, 
  Sparkles, 
  FileText, 
  Image as ImageIcon, 
  Play, 
  Pause,
  CheckCircle, 
  Trash2, 
  ChevronRight, 
  Loader2,
  Video,
  Download,
  Volume2,
  Menu,
  X,
  History
} from 'lucide-react';
import { Project, ProjectStep, VideoIdea, ScriptSegment, ProjectVisual } from './types';
import { brainstormIdeas, generateScript, generateAssetImage, generateAudio } from './services/geminiService';

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'create' | 'history'>('dashboard');
  const [currentStep, setCurrentStep] = useState<ProjectStep>(ProjectStep.IDEATION);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [nicheInput, setNicheInput] = useState('');
  const [ideas, setIdeas] = useState<VideoIdea[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [currentVisualIndex, setCurrentVisualIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackInterval = useRef<number | null>(null);

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem('inflow_projects');
    if (saved) setProjects(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('inflow_projects', JSON.stringify(projects));
  }, [projects]);

  // Reset playback when project changes
  useEffect(() => {
    setCurrentVisualIndex(0);
    setIsPlaying(false);
    if (playbackInterval.current) {
      window.clearInterval(playbackInterval.current);
    }
  }, [currentProject]);

  // Production Playback Logic
  useEffect(() => {
    if (isPlaying && currentProject?.visuals.length) {
      playbackInterval.current = window.setInterval(() => {
        setCurrentVisualIndex((prev) => (prev + 1) % currentProject.visuals.length);
      }, 3500); // 3.5s per scene
      
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.warn("Audio play blocked:", e));
      }
    } else {
      if (playbackInterval.current) {
        window.clearInterval(playbackInterval.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
    return () => {
      if (playbackInterval.current) window.clearInterval(playbackInterval.current);
    };
  }, [isPlaying, currentProject]);

  const startNewProject = () => {
    setActiveTab('create');
    setCurrentStep(ProjectStep.IDEATION);
    setIdeas([]);
    setCurrentProject(null);
    setIsSidebarOpen(false);
    setIsPlaying(false);
  };

  const handleBrainstorm = async () => {
    if (!nicheInput.trim()) return;
    setLoading('Ideating viral concepts...');
    try {
      const res = await brainstormIdeas(nicheInput);
      setIdeas(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  const selectIdea = async (idea: VideoIdea) => {
    setLoading('Scripting high-retention story...');
    try {
      const script = await generateScript(idea);
      const proj: Project = {
        id: Math.random().toString(36).substr(2, 9),
        niche: idea.suggestedNiche,
        idea,
        script,
        visuals: [],
        createdAt: Date.now(),
        status: 'draft'
      };
      setCurrentProject(proj);
      setCurrentStep(ProjectStep.SCRIPTING);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  const generateFullProduction = async () => {
    if (!currentProject) return;
    setCurrentStep(ProjectStep.GENERATING);
    setLoading('Generating cinematic visuals...');
    
    try {
      const script = currentProject.script;
      const visuals: ProjectVisual[] = [];
      
      // Batch generate visuals
      for (let i = 0; i < script.length; i++) {
        setLoading(`Generating scene ${i + 1} of ${script.length}...`);
        const url = await generateAssetImage(script[i].visualPrompt);
        visuals.push({ url, segmentId: script[i].id, isGenerating: false });
      }

      setLoading('Synthesizing AI voiceover...');
      const fullText = script.map(s => s.text).join(' ');
      const audioUrl = await generateAudio(fullText);

      const finalProject: Project = {
        ...currentProject,
        visuals,
        audioData: audioUrl, // Now a blob URL from our service
        status: 'ready'
      };

      setCurrentProject(finalProject);
      setProjects([finalProject, ...projects]);
      setCurrentStep(ProjectStep.REVIEW);
      setIsPlaying(true); // Start playback automatically
    } catch (e) {
      console.error(e);
      alert('Generation encountered an issue. Please try again.');
      setCurrentStep(ProjectStep.SCRIPTING);
    } finally {
      setLoading(null);
    }
  };

  const deleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjects(projects.filter(p => p.id !== id));
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar Mobile Toggle */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-4 right-4 z-50 p-3 glass rounded-2xl"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Navigation Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 glass border-r border-white/5 transition-transform duration-300 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="accent-gradient p-2.5 rounded-2xl shadow-lg shadow-indigo-500/20">
              <Zap className="text-white" size={24} />
            </div>
            <span className="text-2xl font-extrabold tracking-tighter">inflow<span className="accent-text">.io</span></span>
          </div>

          <nav className="flex flex-col gap-2 mb-auto">
            <button 
              onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${activeTab === 'dashboard' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}
            >
              <LayoutDashboard size={20} />
              <span className="font-semibold">Dashboard</span>
            </button>
            <button 
              onClick={startNewProject}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${activeTab === 'create' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}
            >
              <Plus size={20} />
              <span className="font-semibold">Create Studio</span>
            </button>
            <button 
              onClick={() => { setActiveTab('history'); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${activeTab === 'history' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}
            >
              <History size={20} />
              <span className="font-semibold">Archive</span>
            </button>
          </nav>

          <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
            <div className="glass p-4 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Credits</span>
                <Sparkles size={12} className="text-indigo-400" />
              </div>
              <div className="flex items-end justify-between">
                <span className="text-xl font-bold">12,450</span>
                <span className="text-[10px] text-zinc-500 mb-1">UNLIMITED PRO</span>
              </div>
              <div className="w-full bg-white/5 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="h-full accent-gradient w-[65%]"></div>
              </div>
            </div>
            <p className="text-[10px] text-center text-zinc-600 uppercase tracking-widest font-bold">Version 2.4.0 (Stable)</p>
          </div>
        </div>
      </aside>

      {/* Main App Area */}
      <main className="flex-1 overflow-y-auto bg-[#050505] relative">
        <div className="max-w-7xl mx-auto p-6 lg:p-12">
          
          {activeTab === 'dashboard' && (
            <div className="animate-in fade-in duration-500">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                <div>
                  <h1 className="text-4xl font-black mb-2 tracking-tight">Active Automations</h1>
                  <p className="text-zinc-400">Manage your AI-generated shorts and scheduled posts.</p>
                </div>
                <button onClick={startNewProject} className="accent-gradient hover:scale-105 transition-transform text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-indigo-600/20">
                  <Plus size={20} />
                  New Project
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {projects.length === 0 ? (
                  <div className="col-span-full py-32 flex flex-col items-center justify-center text-center">
                    <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center mb-6 animate-float">
                      <Zap size={40} className="text-zinc-600" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Your Studio is Empty</h2>
                    <p className="text-zinc-500 max-w-sm mb-8">Start your first automated channel today. Let AI handle the hard work.</p>
                    <button onClick={startNewProject} className="bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-zinc-200 transition">Create First Short</button>
                  </div>
                ) : (
                  projects.map(proj => (
                    <div 
                      key={proj.id} 
                      onClick={() => { setCurrentProject(proj); setCurrentStep(ProjectStep.REVIEW); setActiveTab('create'); }}
                      className="group relative glass p-6 rounded-[2.5rem] cursor-pointer hover:border-indigo-500/40 transition-all duration-500 flex flex-col"
                    >
                      <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => deleteProject(proj.id, e)} className="p-2 text-zinc-500 hover:text-red-500 transition"><Trash2 size={18} /></button>
                      </div>
                      <div className="mb-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-full">{proj.niche}</span>
                      </div>
                      <h3 className="text-xl font-extrabold mb-3 line-clamp-2 leading-tight group-hover:accent-text transition-all">{proj.idea.title}</h3>
                      <div className="mt-auto pt-6 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase tracking-widest">
                          <CheckCircle size={14} className="text-green-500" />
                          Ready
                        </div>
                        <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-indigo-600 transition-colors">
                          <Play size={16} className="fill-current text-white" />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'create' && (
            <div className="max-w-5xl mx-auto">
              {/* Process Stepper */}
              <div className="flex items-center justify-center gap-4 mb-16 overflow-x-auto py-2">
                {[
                  { step: ProjectStep.IDEATION, label: 'Concept', icon: Sparkles },
                  { step: ProjectStep.SCRIPTING, label: 'Script', icon: FileText },
                  { step: ProjectStep.GENERATING, label: 'Studio', icon: Video },
                  { step: ProjectStep.REVIEW, label: 'Export', icon: CheckCircle },
                ].map((s, idx) => {
                  const isActive = currentStep === s.step;
                  const isPast = Object.values(ProjectStep).indexOf(currentStep) > idx;
                  return (
                    <React.Fragment key={s.step}>
                      <div className="flex flex-col items-center gap-3 min-w-[80px]">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${isActive ? 'accent-gradient text-white scale-110 shadow-2xl shadow-indigo-500/50' : isPast ? 'bg-indigo-500/20 text-indigo-400' : 'bg-zinc-900 text-zinc-600'}`}>
                          <s.icon size={22} />
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-white' : 'text-zinc-600'}`}>{s.label}</span>
                      </div>
                      {idx < 3 && <div className={`w-8 h-[2px] rounded-full mb-6 ${isPast ? 'bg-indigo-500/50' : 'bg-zinc-900'}`} />}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Step: Ideation */}
              {currentStep === ProjectStep.IDEATION && (
                <div className="text-center space-y-12 animate-in slide-in-from-bottom-8 duration-500">
                  <div className="space-y-4">
                    <h2 className="text-5xl font-black tracking-tighter">What will we build today?</h2>
                    <p className="text-zinc-400 text-xl max-w-2xl mx-auto">Input your niche and let Gemini architect a viral content strategy for you.</p>
                  </div>

                  <div className="relative max-w-3xl mx-auto group">
                    <div className="absolute -inset-1 accent-gradient rounded-[2.5rem] blur opacity-25 group-focus-within:opacity-50 transition duration-1000"></div>
                    <div className="relative glass rounded-[2.5rem] p-2 flex items-center bg-[#050505]">
                      <Search className="ml-6 text-zinc-500" />
                      <input 
                        type="text" 
                        value={nicheInput}
                        onChange={(e) => setNicheInput(e.target.value)}
                        placeholder="Stoic Philosophy, Facts about the Ocean, AI Tech News..."
                        className="flex-1 bg-transparent border-none outline-none px-6 py-5 text-xl placeholder:text-zinc-700"
                        onKeyPress={(e) => e.key === 'Enter' && handleBrainstorm()}
                      />
                      <button 
                        disabled={!nicheInput || !!loading}
                        onClick={handleBrainstorm}
                        className="accent-gradient text-white px-10 py-5 rounded-[2rem] font-bold hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2"
                      >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Brainstorm'}
                      </button>
                    </div>
                  </div>

                  {ideas.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16 text-left">
                      {ideas.map((idea, i) => (
                        <div 
                          key={i} 
                          onClick={() => selectIdea(idea)}
                          className="glass p-8 rounded-[2rem] cursor-pointer hover:border-indigo-500/40 hover:bg-white/[0.02] transition-all group border-transparent"
                        >
                          <div className="flex justify-between items-start mb-6">
                            <span className="text-[10px] font-black tracking-[0.3em] uppercase text-zinc-600 bg-white/5 px-3 py-1.5 rounded-full">Concept {i+1}</span>
                            <ChevronRight size={18} className="text-zinc-700 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                          </div>
                          <h4 className="text-2xl font-black mb-3 group-hover:accent-text transition-all leading-tight">{idea.title}</h4>
                          <p className="text-zinc-500 text-sm line-clamp-3 leading-relaxed mb-6 italic">"{idea.hook}"</p>
                          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-widest">
                            <Zap size={14} className="fill-indigo-400" />
                            Viral Ready
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step: Scripting */}
              {currentStep === ProjectStep.SCRIPTING && currentProject && (
                <div className="animate-in slide-in-from-right-8 duration-500 space-y-8">
                  <div className="flex items-end justify-between gap-4">
                    <div className="space-y-2">
                      <h2 className="text-4xl font-black tracking-tight">{currentProject.idea.title}</h2>
                      <p className="text-zinc-400">Review your generated script. Every word counts for retention.</p>
                    </div>
                    <button 
                      onClick={generateFullProduction}
                      className="accent-gradient text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 shadow-2xl shadow-indigo-600/20 hover:scale-105 transition-all"
                    >
                      Assemble Production <Video size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-4">
                      {currentProject.script.map((seg, i) => (
                        <div key={seg.id} className="glass p-6 rounded-[2rem] group hover:border-white/20 transition-all border-white/5">
                          <div className="flex items-center gap-4 mb-4">
                            <span className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs">{seg.time}</span>
                            <div className="h-[1px] flex-1 bg-white/5"></div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Scene {i+1}</span>
                          </div>
                          <p className="text-lg leading-relaxed text-zinc-200 mb-4">{seg.text}</p>
                          <div className="bg-white/5 p-4 rounded-xl flex items-start gap-3">
                            <ImageIcon size={16} className="text-indigo-400 mt-1 flex-shrink-0" />
                            <p className="text-xs text-zinc-500 italic leading-relaxed">{seg.visualPrompt}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-6">
                      <div className="glass p-8 rounded-[2rem] sticky top-8">
                        <h4 className="text-lg font-extrabold mb-6 flex items-center gap-2">
                          <Zap size={18} className="text-indigo-400" />
                          Content Stats
                        </h4>
                        <div className="space-y-6">
                          <div>
                            <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
                              <span>Estimated Length</span>
                              <span className="text-white">58 Seconds</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div className="w-[95%] h-full accent-gradient"></div>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
                              <span>Word Count</span>
                              <span className="text-white">142 Words</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div className="w-[85%] h-full bg-indigo-500"></div>
                            </div>
                          </div>
                          <div className="pt-6 border-t border-white/5">
                            <p className="text-xs text-zinc-500 italic leading-relaxed">
                              "Gemini suggests using dynamic captions and fast cuts for this specific niche."
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step: Review */}
              {currentStep === ProjectStep.REVIEW && currentProject && (
                <div className="animate-in zoom-in-95 duration-700 space-y-12">
                  <audio ref={audioRef} src={currentProject.audioData} loop />
                  
                  <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 bg-indigo-500/10 text-indigo-400 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-[0.2em]">
                      <Sparkles size={14} /> Production Complete
                    </div>
                    <h2 className="text-5xl font-black tracking-tighter">{currentProject.idea.title}</h2>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
                    {/* Phone Preview */}
                    <div className="relative group">
                      <div className="absolute -inset-4 accent-gradient blur-2xl opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                      <div className="relative aspect-[9/16] max-w-[400px] mx-auto bg-black rounded-[3rem] p-4 shadow-2xl border-8 border-[#1a1a1a]">
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-24 h-6 bg-[#1a1a1a] rounded-full z-20"></div>
                        <div className="w-full h-full rounded-[2.2rem] overflow-hidden relative bg-[#0a0a0a]">
                          
                          {/* Visuals Sequence */}
                          <div className="absolute inset-0">
                             {currentProject.visuals.length > 0 ? (
                               <img 
                                 key={currentVisualIndex}
                                 src={currentProject.visuals[currentVisualIndex].url} 
                                 className="w-full h-full object-cover opacity-100 transition-opacity duration-700" 
                                 alt="Production frame"
                               />
                             ) : (
                               <div className="w-full h-full flex items-center justify-center text-zinc-700">
                                 <Loader2 className="animate-spin" />
                               </div>
                             )}
                          </div>

                          {/* YouTube Overlay Mockup */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 z-10 p-6 flex flex-col justify-end pointer-events-none">
                            <div className="flex items-center gap-3 mb-6">
                              <div className="w-10 h-10 rounded-full accent-gradient flex items-center justify-center border-2 border-white/20">
                                <Zap size={20} />
                              </div>
                              <div>
                                <div className="text-sm font-bold">inflow_studio</div>
                                <div className="text-[10px] text-zinc-400">AI Generated Original</div>
                              </div>
                            </div>
                            
                            <p className="text-sm mb-4 line-clamp-2 leading-snug">{currentProject.idea.description}</p>
                            
                            <div className="space-y-2">
                              <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-white transition-all duration-300"
                                  style={{ width: `${((currentVisualIndex + 1) / currentProject.visuals.length) * 100}%` }}
                                ></div>
                              </div>
                              <div className="flex justify-between text-[10px] text-zinc-400 font-bold tracking-widest">
                                <span>0:{String(currentVisualIndex * 5).padStart(2, '0')}</span>
                                <span>0:58</span>
                              </div>
                            </div>
                          </div>

                          {/* Controls */}
                          <div className="absolute inset-0 flex items-center justify-center z-20 group">
                            <button 
                              onClick={() => setIsPlaying(!isPlaying)}
                              className={`w-20 h-20 rounded-full glass border-white/20 flex items-center justify-center hover:scale-110 transition-all ${isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}
                            >
                              {isPlaying ? <Pause size={32} className="fill-white text-white" /> : <Play size={32} className="fill-white text-white ml-2" />}
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Visual Switcher Dots */}
                      <div className="flex justify-center gap-2 mt-8">
                        {currentProject.visuals.map((_, idx) => (
                          <button 
                            key={idx}
                            onClick={() => { setCurrentVisualIndex(idx); setIsPlaying(false); }}
                            className={`h-2 rounded-full transition-all ${currentVisualIndex === idx ? 'w-8 accent-gradient' : 'w-2 bg-zinc-800'}`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Production Details */}
                    <div className="space-y-8">
                      <div className="glass p-8 rounded-[2.5rem] space-y-6">
                        <h4 className="text-lg font-black uppercase tracking-widest text-zinc-500">Mastered Assets</h4>
                        <div className="space-y-4">
                          {[
                            { name: 'AI Narrator', status: 'Enhanced 24kHz', icon: Volume2 },
                            { name: 'Cinematic Visuals', status: `${currentProject.visuals.length}/${currentProject.visuals.length} Rendered`, icon: ImageIcon },
                            { name: 'Dynamic Captions', status: 'Synced (0.5s precision)', icon: FileText },
                            { name: 'Music Bed', status: 'Licensed Background', icon: Zap },
                          ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                              <div className="flex items-center gap-4">
                                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                                  <item.icon size={18} />
                                </div>
                                <div>
                                  <div className="text-sm font-bold">{item.name}</div>
                                  <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">{item.status}</div>
                                </div>
                              </div>
                              <CheckCircle size={16} className="text-green-500" />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col gap-4">
                        <button 
                          className="w-full accent-gradient text-white py-6 rounded-[2rem] font-black text-xl flex items-center justify-center gap-3 shadow-2xl shadow-indigo-600/30 hover:scale-[1.02] transition-transform"
                          onClick={() => alert("MP4 Assembly starting... Check your downloads in a moment.")}
                        >
                          <Download size={24} />
                          EXPORT FINAL MP4
                        </button>
                        <div className="grid grid-cols-2 gap-4">
                          <button className="glass py-5 rounded-[2rem] font-bold text-sm hover:bg-white/5 transition flex items-center justify-center gap-2">
                            <Search size={16} /> SEO Strategy
                          </button>
                          <button className="glass py-5 rounded-[2rem] font-bold text-sm hover:bg-white/5 transition flex items-center justify-center gap-2">
                            <History size={16} /> Version History
                          </button>
                        </div>
                      </div>

                      <div className="p-6 border-l-2 border-indigo-500/20 bg-indigo-500/5 rounded-r-3xl">
                        <p className="text-sm text-zinc-400 italic">
                          "Pro Tip: inflow.io analytics suggest posting this short at 6:00 PM EST for maximum initial velocity."
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="animate-in fade-in duration-500 py-12 text-center">
              <h1 className="text-4xl font-black mb-4">Project Archive</h1>
              <p className="text-zinc-500 mb-12">Browse your past creations and exports.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map(p => (
                   <div key={p.id} className="glass p-6 rounded-[2rem] text-left opacity-60 hover:opacity-100 transition-opacity">
                      <div className="text-[10px] font-bold text-zinc-500 mb-2">{new Date(p.createdAt).toLocaleDateString()}</div>
                      <h3 className="font-bold text-lg mb-4 line-clamp-1">{p.idea.title}</h3>
                      <button 
                        onClick={() => { setCurrentProject(p); setCurrentStep(ProjectStep.REVIEW); setActiveTab('create'); }}
                        className="text-xs font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-2"
                      >
                        Restore <ChevronRight size={14} />
                      </button>
                   </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modern Full-Screen Loader */}
      {loading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl"></div>
          <div className="relative text-center space-y-8 max-w-lg">
            <div className="relative inline-flex items-center justify-center">
              <div className="w-24 h-24 rounded-full border-4 border-white/5 border-t-indigo-500 animate-spin"></div>
              <Zap size={32} className="absolute text-indigo-500 animate-pulse fill-indigo-500" />
            </div>
            <div className="space-y-3">
              <h3 className="text-3xl font-black tracking-tight">{loading}</h3>
              <p className="text-zinc-500 font-medium italic">"Great content takes a few seconds to architect..."</p>
            </div>
            <div className="flex justify-center gap-1.5">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: `${i * 0.1}s` }}></div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
