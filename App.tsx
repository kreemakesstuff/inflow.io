
import React, { useState, useEffect, useRef } from 'react';
import localforage from 'localforage';
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
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackInterval = useRef<number | null>(null);

  // Persistence via IndexedDB
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const saved = await localforage.getItem<Project[]>('inflow_projects_v2');
        if (saved) setProjects(saved);
      } catch (err) {
        console.error("Failed to load projects", err);
      }
    };
    loadProjects();
  }, []);

  useEffect(() => {
    const saveProjects = async () => {
      try {
        await localforage.setItem('inflow_projects_v2', projects);
      } catch (err) {
        console.error("Failed to save projects", err);
      }
    };
    if (projects.length > 0) saveProjects();
  }, [projects]);

  // Reset playback
  useEffect(() => {
    setCurrentVisualIndex(0);
    setIsPlaying(false);
    if (playbackInterval.current) window.clearInterval(playbackInterval.current);
  }, [currentProject]);

  // Playback Logic
  useEffect(() => {
    if (isPlaying && currentProject?.visuals.length) {
      playbackInterval.current = window.setInterval(() => {
        setCurrentVisualIndex((prev) => (prev + 1) % currentProject.visuals.length);
      }, 3500);
      
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.warn("Audio play blocked", e));
      }
    } else {
      if (playbackInterval.current) window.clearInterval(playbackInterval.current);
      if (audioRef.current) audioRef.current.pause();
    }
    return () => { if (playbackInterval.current) window.clearInterval(playbackInterval.current); };
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
        audioData: audioUrl, 
        status: 'ready'
      };

      setCurrentProject(finalProject);
      setProjects((prev) => [finalProject, ...prev]);
      setCurrentStep(ProjectStep.REVIEW);
      setIsPlaying(true); 
    } catch (e) {
      console.error(e);
      alert('Generation encountered an issue.');
      setCurrentStep(ProjectStep.SCRIPTING);
    } finally {
      setLoading(null);
    }
  };

  const deleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = projects.filter(p => p.id !== id);
    setProjects(updated);
    await localforage.setItem('inflow_projects_v2', updated);
  };

  const handleExport = async () => {
    if (!currentProject || isExporting) return;
    setIsExporting(true);
    setExportProgress(0);
    setIsPlaying(false);
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 720;
      canvas.height = 1280;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Canvas context failed");

      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentProject.idea.title.replace(/\s+/g, '_')}_inflow.webm`;
        a.click();
        setIsExporting(false);
        setExportProgress(0);
      };

      recorder.start();

      // Render frames with progress tracking
      for (let i = 0; i < currentProject.visuals.length; i++) {
        setExportProgress(Math.round(((i + 1) / currentProject.visuals.length) * 100));
        const visual = currentProject.visuals[i];
        const img = new Image();
        img.src = visual.url;
        await new Promise((resolve) => {
          img.onload = () => {
            ctx.drawImage(img, 0, 0, 720, 1280);
            resolve(true);
          };
        });
        await new Promise((resolve) => setTimeout(resolve, 1000)); 
      }

      recorder.stop();
    } catch (err) {
      console.error("Export failed", err);
      alert("Export failed. Please try again.");
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Fixed UI Overlap: Moved mobile toggle to the left */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
        className="lg:hidden fixed top-4 left-4 z-50 p-3 glass rounded-2xl shadow-xl hover:scale-105 transition-all"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside className={`fixed inset-y-0 left-0 z-40 w-72 glass border-r border-white/5 transition-transform duration-300 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="accent-gradient p-2.5 rounded-2xl shadow-lg shadow-indigo-500/20">
              <Zap className="text-white" size={24} />
            </div>
            <span className="text-2xl font-extrabold tracking-tighter">inflow<span className="accent-text">.io</span></span>
          </div>

          <nav className="flex flex-col gap-2 mb-auto">
            <button onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${activeTab === 'dashboard' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}>
              <LayoutDashboard size={20} /> <span className="font-semibold">Dashboard</span>
            </button>
            <button onClick={startNewProject} className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${activeTab === 'create' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}>
              <Plus size={20} /> <span className="font-semibold">Create Studio</span>
            </button>
            <button onClick={() => { setActiveTab('history'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${activeTab === 'history' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}>
              <History size={20} /> <span className="font-semibold">Archive</span>
            </button>
          </nav>

          <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
            <div className="glass p-4 rounded-2xl">
              <div className="flex justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Credits</span>
                <Sparkles size={12} className="text-indigo-400" />
              </div>
              <div className="flex items-end justify-between">
                <span className="text-xl font-bold">12,450</span>
                <span className="text-[10px] text-zinc-500 mb-1">PRO</span>
              </div>
              <div className="w-full bg-white/5 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="h-full accent-gradient w-[65%]"></div>
              </div>
            </div>
            <p className="text-[10px] text-center text-zinc-600 uppercase tracking-widest font-bold">v2.7.0 Optimized</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-[#050505] relative">
        <div className="max-w-7xl mx-auto p-6 lg:p-12">
          {activeTab === 'dashboard' && (
            <div className="animate-in fade-in duration-500">
              <div className="flex flex-col md:flex-row justify-end items-start md:items-center gap-4 mb-10">
                {/* Removed "Active Studio" heading as requested */}
                <button onClick={startNewProject} className="accent-gradient hover:scale-105 transition text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20">
                  <Plus size={20} /> New Short
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.length === 0 ? (
                  <div className="col-span-full py-32 text-center flex flex-col items-center">
                    <Zap size={48} className="text-zinc-700 mb-6 animate-float" />
                    <h2 className="text-2xl font-bold mb-2 text-zinc-400">Your studio is empty</h2>
                    <button onClick={startNewProject} className="text-indigo-400 font-bold hover:underline">Start Automating &rarr;</button>
                  </div>
                ) : (
                  projects.map(proj => (
                    <div key={proj.id} onClick={() => { setCurrentProject(proj); setCurrentStep(ProjectStep.REVIEW); setActiveTab('create'); }} className="group relative glass p-6 rounded-[2.5rem] cursor-pointer hover:border-indigo-500/40 transition-all">
                      <button onClick={(e) => deleteProject(proj.id, e)} className="absolute top-6 right-6 p-2 text-zinc-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={18} /></button>
                      <span className="text-[10px] font-black uppercase text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-full mb-4 inline-block">{proj.niche}</span>
                      <h3 className="text-xl font-extrabold mb-3 leading-tight group-hover:accent-text transition-all">{proj.idea.title}</h3>
                      <div className="mt-4 flex justify-between items-center">
                        <CheckCircle size={16} className="text-green-500" />
                        <div className="p-2 bg-white/5 rounded-xl"><Play size={14} className="fill-white" /></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'create' && (
            <div className="max-w-5xl mx-auto">
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
                      <div className="flex flex-col items-center gap-3">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isActive ? 'accent-gradient shadow-2xl scale-110' : isPast ? 'bg-indigo-500/20 text-indigo-400' : 'bg-zinc-900 text-zinc-600'}`}>
                          <s.icon size={22} />
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-white' : 'text-zinc-600'}`}>{s.label}</span>
                      </div>
                      {idx < 3 && <div className={`w-8 h-[2px] rounded-full mb-6 ${isPast ? 'bg-indigo-500/50' : 'bg-zinc-900'}`} />}
                    </React.Fragment>
                  );
                })}
              </div>

              {currentStep === ProjectStep.IDEATION && (
                <div className="text-center space-y-12 animate-in slide-in-from-bottom-8 duration-500">
                  <h2 className="text-5xl font-black tracking-tighter capitalize">youtube production assistant</h2>
                  <div className="relative max-w-3xl mx-auto group">
                    <div className="absolute -inset-1 accent-gradient rounded-[2.5rem] blur opacity-25 group-focus-within:opacity-50 transition duration-1000"></div>
                    <div className="relative glass rounded-[2.5rem] p-2 flex items-center bg-[#050505]">
                      <Search className="ml-6 text-zinc-500" />
                      <input type="text" value={nicheInput} onChange={(e) => setNicheInput(e.target.value)} placeholder="Stoic Philosophy, Facts about the Ocean..." className="flex-1 bg-transparent border-none outline-none px-6 py-5 text-xl" />
                      <button onClick={handleBrainstorm} disabled={!nicheInput || !!loading} className="accent-gradient text-white px-10 py-5 rounded-[2rem] font-bold">
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Ideate'}
                      </button>
                    </div>
                  </div>
                  {ideas.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16 text-left">
                      {ideas.map((idea, i) => (
                        <div key={i} onClick={() => selectIdea(idea)} className="glass p-8 rounded-[2rem] cursor-pointer hover:border-indigo-500/40 hover:bg-white/[0.02] transition-all group">
                          <h4 className="text-2xl font-black mb-3 group-hover:accent-text transition-all leading-snug">{idea.title}</h4>
                          <p className="text-zinc-500 text-sm line-clamp-3 mb-6 italic leading-relaxed">"{idea.hook}"</p>
                          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-widest"><Zap size={14} className="fill-indigo-400" /> Viral Ready</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {currentStep === ProjectStep.SCRIPTING && currentProject && (
                <div className="animate-in slide-in-from-right-8 duration-500 space-y-8">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                      <h2 className="text-4xl font-black tracking-tight">{currentProject.idea.title}</h2>
                      <p className="text-zinc-400 mt-1">Retention-optimized sequence generated by Gemini Pro.</p>
                    </div>
                    <button onClick={generateFullProduction} className="accent-gradient text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-indigo-600/20">
                      Generate Visuals <Video size={18} />
                    </button>
                  </div>
                  <div className="space-y-4">
                    {currentProject.script.map((seg, i) => (
                      <div key={seg.id} className="glass p-6 rounded-[2rem] flex flex-col md:flex-row gap-6 border-transparent hover:border-white/5 transition-all">
                        <div className="flex-1">
                          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] block mb-2">Scene {i+1} • {seg.time}</span>
                          <p className="text-lg leading-relaxed text-zinc-200">{seg.text}</p>
                        </div>
                        <div className="md:w-1/3 bg-white/5 p-4 rounded-xl border border-white/5">
                          <span className="text-[10px] font-bold text-zinc-600 block mb-1 tracking-widest uppercase">Visual Intent</span>
                          <p className="text-[10px] text-zinc-400 italic leading-relaxed">{seg.visualPrompt}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentStep === ProjectStep.REVIEW && currentProject && (
                <div className="animate-in zoom-in-95 duration-700 space-y-12">
                  <audio ref={audioRef} src={currentProject.audioData} loop />
                  
                  <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 bg-indigo-500/10 text-indigo-400 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest">
                      <Sparkles size={14} /> Studio Ready
                    </div>
                    <h2 className="text-5xl font-black tracking-tighter">{currentProject.idea.title}</h2>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
                    <div className="relative group">
                      <div className="absolute -inset-4 accent-gradient blur-3xl opacity-10"></div>
                      <div className="relative aspect-[9/16] max-w-[380px] mx-auto bg-black rounded-[3.2rem] p-3 shadow-2xl border-[10px] border-[#1a1a1a]">
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-24 h-6 bg-[#1a1a1a] rounded-full z-20"></div>
                        <div className="w-full h-full rounded-[2.5rem] overflow-hidden relative bg-[#0a0a0a]">
                          <div className="absolute inset-0">
                             {currentProject.visuals.length > 0 ? (
                               <img 
                                 src={currentProject.visuals[currentVisualIndex].url} 
                                 className="w-full h-full object-cover transition-all duration-700" 
                                 alt="Thumbnail"
                                 style={{ filter: isExporting ? 'blur(10px) brightness(0.5)' : 'none' }}
                               />
                             ) : (
                               <div className="w-full h-full flex items-center justify-center text-zinc-700"><Loader2 className="animate-spin" /></div>
                             )}
                          </div>

                          {isExporting && (
                            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-8 text-center bg-black/40 backdrop-blur-md">
                              <Loader2 className="animate-spin text-white mb-4" size={40} />
                              <h4 className="text-xl font-black mb-2">Assembling...</h4>
                              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden max-w-[200px]">
                                <div className="h-full accent-gradient transition-all duration-300" style={{ width: `${exportProgress}%` }}></div>
                              </div>
                              <p className="text-[10px] mt-4 font-bold uppercase tracking-widest text-zinc-400">Capturing frame {Math.ceil((exportProgress/100) * currentProject.visuals.length)} of {currentProject.visuals.length}</p>
                            </div>
                          )}

                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/20 z-10 p-6 flex flex-col justify-end pointer-events-none">
                            <div className="flex items-center gap-3 mb-6">
                              <div className="w-10 h-10 rounded-full accent-gradient flex items-center justify-center border border-white/20">
                                <Zap size={20} className="text-white" />
                              </div>
                              <div className="text-sm font-extrabold tracking-tight">inflow_studio</div>
                            </div>
                            <div className="h-1 bg-white/20 rounded-full overflow-hidden mb-2">
                              <div className="h-full bg-white transition-all duration-300" style={{ width: `${((currentVisualIndex + 1) / currentProject.visuals.length) * 100}%` }}></div>
                            </div>
                            <div className="flex justify-between text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                              <span>{isPlaying ? `Scene ${currentVisualIndex + 1}` : 'Poster View'}</span>
                              <span>0:58</span>
                            </div>
                          </div>

                          {!isExporting && (
                            <div className="absolute inset-0 flex items-center justify-center z-20">
                              <button onClick={() => setIsPlaying(!isPlaying)} className={`w-24 h-24 rounded-full glass border-white/20 flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${isPlaying ? 'opacity-0 hover:opacity-100' : 'opacity-100 shadow-2xl shadow-black'}`}>
                                {isPlaying ? <Pause size={40} className="fill-white text-white" /> : <Play size={40} className="fill-white text-white ml-2" />}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-8">
                      <div className="glass p-8 rounded-[2.5rem] space-y-6">
                        <div className="flex items-center justify-between">
                          <h4 className="text-lg font-black uppercase tracking-widest text-zinc-500">Asset Report</h4>
                          <span className="text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded-md">VERIFIED</span>
                        </div>
                        <div className="space-y-4">
                          {[
                            { name: 'AI Voiceover', status: 'Mastered Kore (24kHz)', icon: Volume2 },
                            { name: 'Visual Narrative', status: `${currentProject.visuals.length} HD Scenes Generated`, icon: ImageIcon },
                            { name: 'Viral Metadata', status: 'SEO Tags Optimized', icon: Sparkles },
                          ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/[0.07] transition-all">
                              <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl group-hover:scale-110 transition-transform"><item.icon size={20} /></div>
                                <div><div className="text-sm font-bold">{item.name}</div><div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{item.status}</div></div>
                              </div>
                              <CheckCircle size={18} className="text-green-500" />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col gap-4">
                        <button 
                          disabled={isExporting}
                          onClick={handleExport}
                          className="w-full accent-gradient text-white py-6 rounded-[2.2rem] font-black text-xl flex items-center justify-center gap-3 shadow-2xl shadow-indigo-600/30 hover:scale-[1.02] transition-all disabled:opacity-50 active:scale-95"
                        >
                          {isExporting ? <Loader2 className="animate-spin" /> : <Download size={26} />}
                          {isExporting ? 'GENERATING PRODUCTION...' : 'EXPORT FINAL VIDEO'}
                        </button>
                        <div className="flex items-center justify-center gap-2 text-zinc-600 text-[10px] font-bold uppercase tracking-[0.2em] pt-2">
                           <CheckCircle size={12} /> Optimized for high-speed engagement
                        </div>
                      </div>

                      <div className="p-6 border-l-4 border-indigo-500/30 bg-white/5 rounded-r-[2rem]">
                        <p className="text-sm text-zinc-400 italic leading-relaxed">
                          "inflow recommendation: Add trending audio in the YouTube app for an extra 15% reach velocity."
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="animate-in fade-in py-12">
              <div className="text-center mb-16">
                <h1 className="text-4xl font-black mb-4">Production History</h1>
                <p className="text-zinc-500">Access and re-export your automated library.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {projects.map(p => (
                   <div key={p.id} onClick={() => { setCurrentProject(p); setCurrentStep(ProjectStep.REVIEW); setActiveTab('create'); }} className="group glass p-8 rounded-[2.5rem] text-left hover:border-indigo-500/40 transition-all cursor-pointer">
                      <div className="flex justify-between items-start mb-6">
                        <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{new Date(p.createdAt).toLocaleDateString()}</span>
                        <div className="p-2 bg-white/5 rounded-lg group-hover:bg-indigo-500 transition-colors"><ChevronRight size={14} /></div>
                      </div>
                      <h3 className="font-extrabold text-xl mb-4 line-clamp-2 leading-tight">{p.idea.title}</h3>
                      <div className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                         <CheckCircle size={14} /> Ready to Export
                      </div>
                   </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Global Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl"></div>
          <div className="relative text-center space-y-8 max-w-lg">
            <div className="relative inline-flex items-center justify-center">
              <div className="w-28 h-28 rounded-full border-4 border-white/5 border-t-indigo-500 animate-spin"></div>
              <Zap size={36} className="absolute text-indigo-500 animate-pulse fill-indigo-500" />
            </div>
            <div className="space-y-4">
              <h3 className="text-4xl font-black tracking-tight">{loading}</h3>
              <p className="text-zinc-500 italic">"Engineering your viral narrative... this takes about 15 seconds."</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
