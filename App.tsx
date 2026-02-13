
import React, { useState, useEffect } from 'react';
import localforage from 'localforage';
import { 
  Plus,
  Loader2,
  Trash2,
  Save,
  Layout,
  Menu,
  X,
  Search,
  Image as ImageIcon,
  ArrowRight,
  ArrowLeft,
  Film,
  Sparkles,
  LogOut,
  User as UserIcon,
  Lock,
  Mail,
  Settings,
  Check,
  UserCircle // Added icon for guest
} from 'lucide-react';
import { Project, ProjectStep, VideoIdea, User } from './types';
import { brainstormIdeas, generateScript, generateStoryboardImage } from './services/geminiService';

// Security Helper
async function hashPassword(password: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  const [usernameInput, setUsernameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Profile Modal State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwStatus, setPwStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  // App State
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentStep, setCurrentStep] = useState<ProjectStep>(ProjectStep.IDEATION);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  
  // Input State
  const [nicheInput, setNicheInput] = useState('');
  const [ideas, setIdeas] = useState<VideoIdea[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Persistence: User
  useEffect(() => {
    const checkUser = async () => {
      try {
        const savedUser = await localforage.getItem<User>('inflow_user');
        if (savedUser) setUser(savedUser);
      } catch (err) {
        console.error("Auth check failed", err);
      } finally {
        setIsAuthLoading(false);
      }
    };
    checkUser();
  }, []);

  // Persistence: Projects
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const saved = await localforage.getItem<Project[]>('inflow_scripts_v1');
        if (saved) setProjects(saved);
      } catch (err) {
        console.error("Failed to load scripts", err);
      }
    };
    if (user) loadProjects();
  }, [user]);

  useEffect(() => {
    const saveProjects = async () => {
      try {
        await localforage.setItem('inflow_scripts_v1', projects);
      } catch (err) {
        console.error("Failed to save scripts", err);
      }
    };
    if (user && projects.length > 0) saveProjects();
  }, [projects, user]);

  // Auth Handlers
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsSubmitting(true);

    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));

      const usersDb = await localforage.getItem<Record<string, any>>('inflow_users_db') || {};
      const email = emailInput.trim().toLowerCase();

      if (authMode === 'SIGNUP') {
        if (!usernameInput.trim() || !email || !passwordInput.trim()) {
           throw new Error("Please fill in all fields.");
        }
        if (usersDb[email]) {
           throw new Error("User with this email already exists.");
        }

        const hashedPassword = await hashPassword(passwordInput);

        const newUser = {
          name: usernameInput.trim(),
          email,
          password: hashedPassword, // Stored as hash
          joinedAt: Date.now()
        };

        // Save to "DB"
        await localforage.setItem('inflow_users_db', { ...usersDb, [email]: newUser });
        
        // Create Session
        const sessionUser: User = { name: newUser.name, email: newUser.email, joinedAt: newUser.joinedAt };
        await localforage.setItem('inflow_user', sessionUser);
        setUser(sessionUser);

      } else {
        // LOGIN
        if (!email || !passwordInput.trim()) {
           throw new Error("Please enter email and password.");
        }
        
        const storedUser = usersDb[email];
        const inputHash = await hashPassword(passwordInput);

        // Check if user exists and hash matches
        // Note: For existing legacy cleartext passwords in dev, this might fail, requiring a reset.
        if (!storedUser || storedUser.password !== inputHash) {
           throw new Error("Invalid email or password.");
        }

        // Create Session
        const sessionUser: User = { name: storedUser.name, email: storedUser.email, joinedAt: storedUser.joinedAt };
        await localforage.setItem('inflow_user', sessionUser);
        setUser(sessionUser);
      }
    } catch (err: any) {
      setAuthError(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsSubmitting(true);
    setAuthError(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      const guestUser: User = {
        name: 'Guest Creative',
        email: 'guest@inflow.io',
        joinedAt: Date.now()
      };
      await localforage.setItem('inflow_user', guestUser);
      setUser(guestUser);
    } catch (e) {
      console.error(e);
      setAuthError("Failed to start guest session.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwStatus(null);
    if (!user || !user.email) return;

    try {
      const usersDb = await localforage.getItem<Record<string, any>>('inflow_users_db') || {};
      const storedUser = usersDb[user.email];

      if (!storedUser) throw new Error("User record not found.");
      
      const currentInputHash = await hashPassword(pwCurrent);
      if (storedUser.password !== currentInputHash) throw new Error("Current password is incorrect.");
      
      if (pwNew.length < 6) throw new Error("New password must be at least 6 characters.");

      // Update with new hash
      const newHash = await hashPassword(pwNew);
      const updatedUser = { ...storedUser, password: newHash };
      
      await localforage.setItem('inflow_users_db', { ...usersDb, [user.email]: updatedUser });
      
      setPwStatus({ type: 'success', msg: 'Password updated successfully.' });
      setPwCurrent('');
      setPwNew('');
      
      // Auto close after success? Or just clear status
      setTimeout(() => setPwStatus(null), 3000);
    } catch (err: any) {
      setPwStatus({ type: 'error', msg: err.message });
    }
  };

  const handleLogout = async () => {
    await localforage.removeItem('inflow_user');
    setUser(null);
    setCurrentProject(null);
    setIdeas([]);
    setCurrentStep(ProjectStep.IDEATION);
    // Reset form
    setUsernameInput('');
    setPasswordInput('');
    setEmailInput('');
    setAuthError(null);
    setAuthMode('LOGIN');
    setShowProfileModal(false);
  };

  const toggleAuthMode = () => {
    setAuthMode(prev => prev === 'LOGIN' ? 'SIGNUP' : 'LOGIN');
    setAuthError(null);
  };

  // App Logic
  const startNewProject = () => {
    setCurrentStep(ProjectStep.IDEATION);
    setIdeas([]);
    setCurrentProject(null);
    setNicheInput('');
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const handleBrainstorm = async () => {
    if (!nicheInput.trim()) return;
    setLoading('Gathering inspiration...');
    try {
      const res = await brainstormIdeas(nicheInput);
      setIdeas(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  const generateVisualsForProject = async (project: Project) => {
    for (let i = 0; i < project.script.length; i++) {
      const seg = project.script[i];
      if (seg.visualImage) continue;

      try {
        const imageBase64 = await generateStoryboardImage(seg.visualPrompt);
        if (imageBase64) {
          setCurrentProject(prev => {
            if (!prev || prev.id !== project.id) return prev;
            const newScript = [...prev.script];
            newScript[i] = { ...newScript[i], visualImage: imageBase64 };
            return { ...prev, script: newScript };
          });
        }
      } catch (err) {
        console.error("Failed to generate image for segment", i);
      }
    }
  };

  const handleSelectIdea = async (idea: VideoIdea) => {
    setLoading('Composing script & visuals...');
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
      generateVisualsForProject(newProject);
      
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
    } else {
      const updated = projects.map(p => p.id === currentProject.id ? currentProject : p);
      setProjects(updated);
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

  // --- RENDER: LOADING ---
  if (isAuthLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#FAFAF9]">
         <div className="relative">
            <div className="absolute inset-0 bg-stone-200 rounded-full animate-ping opacity-25"></div>
            <div className="relative bg-white p-3 rounded-full shadow-lg border border-stone-100">
              <Loader2 className="text-stone-800 animate-spin" size={24} />
            </div>
          </div>
      </div>
    );
  }

  // --- RENDER: AUTH (LOGIN / SIGNUP) ---
  if (!user) {
    return (
      <div className="min-h-screen w-full bg-[#FAFAF9] flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-white p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-stone-100 text-center fade-enter-active">
          <div className="flex flex-col items-center justify-center mb-8">
              <div className="w-16 h-16 rounded-full bg-stone-50 border border-stone-100 flex items-center justify-center text-stone-800 shadow-sm mb-4">
                  <span className="font-bold text-3xl font-serif">i</span>
              </div>
              <h2 className="text-xl font-bold text-stone-900 tracking-tight">inflow<span className="text-stone-400">.io</span></h2>
          </div>

          <h1 className="text-3xl font-bold text-stone-900 mb-2 tracking-tight">
            {authMode === 'LOGIN' ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-stone-500 mb-8 text-base">
            {authMode === 'LOGIN' ? 'Enter your details to access your studio.' : 'Start your viral journey today.'}
          </p>
          
          <form onSubmit={handleAuth} className="space-y-4">
              {authMode === 'SIGNUP' && (
                <div className="text-left space-y-1.5">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-wider ml-1">Full Name</label>
                  <div className="relative group">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-stone-800 transition-colors" size={18} />
                    <input 
                      type="text" 
                      placeholder="e.g. Sarah"
                      value={usernameInput}
                      onChange={e => setUsernameInput(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-11 pr-5 py-3.5 text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 transition-all"
                    />
                  </div>
                </div>
              )}

              <div className="text-left space-y-1.5">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider ml-1">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-stone-800 transition-colors" size={18} />
                  <input 
                    type="email" 
                    placeholder="sarah@example.com"
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-11 pr-5 py-3.5 text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 transition-all"
                  />
                </div>
              </div>

              <div className="text-left space-y-1.5">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-stone-800 transition-colors" size={18} />
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    value={passwordInput}
                    onChange={e => setPasswordInput(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-11 pr-5 py-3.5 text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 transition-all"
                  />
                </div>
              </div>

              {authError && (
                <div className="text-red-500 text-sm font-medium pt-2 animate-pulse">
                  {authError}
                </div>
              )}

              <button 
                 type="submit"
                 disabled={isSubmitting}
                 className="w-full bg-stone-900 text-white font-semibold py-4 rounded-xl hover:bg-stone-800 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-stone-900/10 mt-2 flex items-center justify-center gap-2"
              >
                 {isSubmitting && authMode !== 'LOGIN' && authMode !== 'SIGNUP' ? <Loader2 size={18} className="animate-spin" /> : null}
                 {authMode === 'LOGIN' ? 'Sign In' : 'Create Account'}
              </button>
          </form>

          <div className="mt-6 flex flex-col gap-4">
             <div className="relative">
                <div className="absolute inset-0 flex items-center">
                   <div className="w-full border-t border-stone-200"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                   <span className="bg-white px-2 text-stone-400 font-medium tracking-wider">Or</span>
                </div>
             </div>

             <button 
               type="button"
               onClick={handleGuestLogin}
               disabled={isSubmitting}
               className="w-full bg-white border border-stone-200 text-stone-600 font-semibold py-3.5 rounded-xl hover:bg-stone-50 hover:border-stone-300 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
             >
                <UserCircle size={18} />
                Continue as Guest
             </button>
          </div>

          <div className="mt-8 pt-6 border-t border-stone-100 text-sm text-stone-500">
            {authMode === 'LOGIN' ? "Don't have an account?" : "Already have an account?"}
            <button 
              onClick={toggleAuthMode}
              className="ml-2 font-semibold text-stone-900 hover:underline focus:outline-none"
            >
              {authMode === 'LOGIN' ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER: APP ---
  return (
    <div className="flex h-screen w-full bg-[#FAFAF9] text-stone-800 font-sans overflow-hidden fade-enter-active">
      
      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 fade-enter-active">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-stone-100">
             <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
                <h3 className="font-bold text-stone-800">Account Settings</h3>
                <button onClick={() => setShowProfileModal(false)} className="text-stone-400 hover:text-stone-800 transition-colors"><X size={20}/></button>
             </div>
             <div className="p-6 space-y-6">
                {/* User Info Readonly */}
                <div className="flex items-center gap-4">
                   <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 font-bold text-2xl shadow-inner">
                      {user.name.charAt(0).toUpperCase()}
                   </div>
                   <div>
                      <p className="font-bold text-lg text-stone-900">{user.name}</p>
                      <p className="text-stone-500 text-sm">{user.email}</p>
                      <p className="text-stone-400 text-xs mt-1">Joined {new Date(user.joinedAt).toLocaleDateString()}</p>
                   </div>
                </div>

                <hr className="border-stone-100" />

                {/* Change Password Form */}
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                   <h4 className="text-sm font-bold text-stone-500 uppercase tracking-wider">Change Password</h4>
                   
                   <div className="space-y-3">
                      <input 
                        type="password" 
                        placeholder="Current Password"
                        value={pwCurrent}
                        onChange={e => setPwCurrent(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 text-sm"
                      />
                      <input 
                        type="password" 
                        placeholder="New Password"
                        value={pwNew}
                        onChange={e => setPwNew(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 text-sm"
                      />
                   </div>

                   {pwStatus && (
                      <div className={`text-sm flex items-center gap-2 ${pwStatus.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                         {pwStatus.type === 'success' && <Check size={14} />}
                         {pwStatus.msg}
                      </div>
                   )}

                   <button 
                      type="submit"
                      disabled={!pwCurrent || !pwNew}
                      className="w-full bg-stone-900 text-white font-medium py-3 rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50 text-sm"
                   >
                      Update Password
                   </button>
                </form>
             </div>
          </div>
        </div>
      )}

      {/* Mobile Toggle */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-sm border border-stone-200 text-stone-600"
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar - The Library */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-80 bg-white border-r border-stone-100 flex flex-col transition-transform duration-300 shadow-[2px_0_24px_rgba(0,0,0,0.02)]
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0
      `}>
        <div className="p-8">
          <div className="flex items-center gap-2 mb-10">
            <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-800">
               <span className="font-bold text-lg font-serif">i</span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-stone-800">inflow<span className="text-stone-400">.io</span></h1>
          </div>
          
          <button 
            onClick={startNewProject}
            className="w-full py-3 px-4 rounded-xl bg-stone-900 text-white hover:bg-stone-800 transition-all flex items-center justify-center gap-2 group font-medium shadow-sm active:scale-[0.98]"
          >
            <Plus size={18} />
            <span>Create New</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
          <div className="px-4 py-2 text-[11px] font-bold text-stone-400 uppercase tracking-widest">Your Archive</div>
          {projects.length === 0 ? (
            <div className="px-4 py-8 text-center text-stone-400 text-sm">
              Your library is empty.
            </div>
          ) : (
            projects.map(p => (
              <div 
                key={p.id}
                onClick={() => openProject(p)}
                className={`
                  group relative px-4 py-3 rounded-lg cursor-pointer transition-all duration-200
                  ${currentProject?.id === p.id ? 'bg-stone-100' : 'hover:bg-stone-50'}
                `}
              >
                <div className="flex justify-between items-start mb-1">
                  <h4 className={`text-sm font-medium leading-tight line-clamp-1 ${currentProject?.id === p.id ? 'text-stone-900' : 'text-stone-600 group-hover:text-stone-800'}`}>
                    {p.title}
                  </h4>
                  <button 
                    onClick={(e) => deleteProject(p.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-400 transition-opacity ml-2"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-stone-400">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </span>
                  <span className="text-[10px] bg-white border border-stone-200 px-1.5 py-0.5 rounded text-stone-500">
                    {p.niche}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* User Footer */}
        <div className="p-4 border-t border-stone-100 bg-stone-50/50">
          <div className="flex items-center gap-3 mb-4 px-2">
             <div className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-600 font-bold text-xs shadow-sm">
                {user.name.charAt(0).toUpperCase()}
             </div>
             <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-stone-800 truncate">{user.name}</p>
                <p className="text-[10px] text-stone-400 font-medium truncate">{user.email}</p> 
             </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => {
                setPwStatus(null);
                setPwCurrent('');
                setPwNew('');
                setShowProfileModal(true);
              }}
              className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-stone-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-stone-200 text-xs font-semibold transition-all"
            >
               <Settings size={14} /> Settings
            </button>
            <button 
              onClick={handleLogout} 
              className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-stone-500 hover:text-red-500 hover:bg-red-50 text-xs font-semibold transition-colors"
            >
               <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Canvas */}
      <main className="flex-1 h-full overflow-y-auto relative bg-[#FAFAF9]">
        
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm transition-all duration-500">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-stone-200 rounded-full animate-ping opacity-25"></div>
                <div className="relative bg-white p-3 rounded-full shadow-lg border border-stone-100">
                  <Loader2 className="text-stone-800 animate-spin" size={24} />
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-stone-800 font-medium">{loading}</h3>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-5xl mx-auto px-8 py-16 min-h-screen">
          
          {/* Step 1: Ideation */}
          {currentStep === ProjectStep.IDEATION && (
            <div className="h-full flex flex-col justify-center min-h-[60vh] max-w-2xl mx-auto fade-enter-active">
              <div className="text-center mb-12 space-y-3">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white shadow-sm border border-stone-100 mb-4 text-stone-800">
                  <Sparkles size={20} strokeWidth={1.5} />
                </div>
                <h2 className="text-3xl font-semibold text-stone-800 tracking-tight">What do you want to create, {user.name}?</h2>
                <p className="text-stone-500">Enter a topic or niche to start generating concepts.</p>
              </div>

              <div className="relative mb-12 w-full group">
                <div className="relative flex items-center bg-white rounded-2xl shadow-sm border border-stone-200 focus-within:border-stone-400 focus-within:shadow-md transition-all duration-300 p-2">
                  <Search className="ml-4 text-stone-400" size={20} />
                  <input 
                    type="text" 
                    value={nicheInput}
                    onChange={(e) => setNicheInput(e.target.value)}
                    placeholder="E.g. Coffee brewing, Tech reviews, History facts..."
                    className="flex-1 bg-transparent border-none outline-none px-4 py-4 text-lg text-stone-800 placeholder:text-stone-300"
                    onKeyDown={(e) => e.key === 'Enter' && handleBrainstorm()}
                  />
                  <button 
                    onClick={handleBrainstorm}
                    disabled={!nicheInput}
                    className="bg-stone-900 hover:bg-stone-800 text-white px-6 py-3 rounded-xl font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ArrowRight size={20} />
                  </button>
                </div>
              </div>

              {ideas.length > 0 && (
                <div className="space-y-3">
                   <div className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4 px-2">Suggestions</div>
                   {ideas.map((idea, idx) => (
                    <div 
                      key={idx}
                      onClick={() => handleSelectIdea(idea)}
                      className="group p-5 bg-white border border-stone-200 hover:border-stone-400 rounded-xl cursor-pointer transition-all hover:shadow-md flex items-start gap-4"
                    >
                      <div className="mt-1 w-6 h-6 rounded-full border border-stone-200 text-stone-400 flex items-center justify-center text-xs group-hover:bg-stone-900 group-hover:text-white transition-colors">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-stone-800 mb-1">
                          {idea.title}
                        </h3>
                        <p className="text-stone-500 text-sm">
                          {idea.hook}
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
            <div className="fade-enter-active">
              
              <button 
                onClick={() => {
                  setCurrentStep(ProjectStep.IDEATION);
                  setCurrentProject(null);
                }}
                className="mb-8 inline-flex items-center gap-2 text-stone-400 hover:text-stone-800 transition-colors text-sm font-medium group"
              >
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                <span>Back to {ideas.length > 0 ? 'Concepts' : 'Search'}</span>
              </button>

              <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <div className="flex items-center gap-2 text-stone-400 text-xs font-semibold tracking-wider uppercase mb-3">
                    <span className="bg-stone-100 px-2 py-1 rounded text-stone-500">
                      {currentStep === ProjectStep.SCRIPTING ? 'Drafting' : 'Library'}
                    </span>
                    <span>/</span>
                    <span>{currentProject.niche}</span>
                  </div>
                  <h1 className="text-3xl font-bold text-stone-900 tracking-tight leading-tight max-w-2xl">
                    {currentProject.title}
                  </h1>
                </div>
                
                {currentStep === ProjectStep.SCRIPTING && (
                  <button 
                    onClick={saveToLibrary}
                    className="flex items-center gap-2 px-5 py-2.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors font-medium text-sm shadow-sm"
                  >
                    <Save size={16} /> Save to Library
                  </button>
                )}
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Script Content */}
                <div className="lg:col-span-8 space-y-10">
                  
                  {/* Hook Card */}
                  <div className="bg-white border border-stone-100 shadow-sm rounded-2xl p-8 relative overflow-hidden">
                     <div className="absolute top-0 left-0 w-1 h-full bg-stone-900"></div>
                     <span className="text-xs font-bold text-stone-400 uppercase tracking-widest block mb-3">The Hook</span>
                     <p className="text-xl font-medium text-stone-800 leading-relaxed font-serif">
                      "{currentProject.idea.hook}"
                     </p>
                  </div>

                  {/* Segments */}
                  <div className="space-y-8">
                    {currentProject.script.map((seg, i) => (
                      <div key={i} className="flex gap-6 group">
                        <div className="flex-shrink-0 flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center text-xs font-semibold text-stone-500 shadow-sm">
                            {i + 1}
                          </div>
                          {i !== currentProject.script.length - 1 && (
                            <div className="w-px h-full bg-stone-200 my-2"></div>
                          )}
                        </div>
                        
                        <div className="flex-1 pb-4">
                          {/* Script Text */}
                          <div className="mb-4">
                             <p className="text-lg text-stone-800 leading-relaxed">
                              {seg.text}
                             </p>
                          </div>
                          
                          {/* Visual Card */}
                          <div className="bg-white p-1 rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row gap-4 overflow-hidden">
                             
                             {/* Generated Image */}
                             <div className="sm:w-32 aspect-[9/16] bg-stone-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                                {seg.visualImage ? (
                                  <img 
                                    src={seg.visualImage} 
                                    alt="Storyboard" 
                                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" 
                                  />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center text-stone-300 gap-2">
                                    <ImageIcon size={18} />
                                    <span className="text-[9px] uppercase tracking-wider font-semibold">Generating</span>
                                  </div>
                                )}
                             </div>

                             <div className="flex-1 py-3 pr-4 min-w-0 flex flex-col justify-center">
                               <div className="flex items-center gap-2 mb-2">
                                 <Film size={14} className="text-stone-400" />
                                 <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Visual Direction</span>
                               </div>
                               <span className="text-sm text-stone-600 italic leading-snug">
                                 {seg.visualPrompt}
                               </span>
                             </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Metadata Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                  <div className="bg-white border border-stone-100 rounded-2xl p-6 sticky top-6 shadow-sm">
                    <h3 className="text-sm font-bold text-stone-900 mb-6 flex items-center gap-2">
                      <Layout size={16} /> Details
                    </h3>
                    
                    <div className="space-y-6">
                      <div className="group">
                        <div className="text-[10px] text-stone-400 uppercase tracking-wider mb-2 font-semibold">Primary Niche</div>
                        <div className="text-sm text-stone-700 font-medium">
                          {currentProject.niche}
                        </div>
                      </div>
                      
                      <div className="w-full h-px bg-stone-100"></div>
                      
                      <div className="group">
                         <div className="text-[10px] text-stone-400 uppercase tracking-wider mb-2 font-semibold">Context</div>
                         <div className="text-sm text-stone-600 leading-relaxed">
                           {currentProject.idea.description}
                         </div>
                      </div>

                      <div className="w-full h-px bg-stone-100"></div>

                      <div>
                         <div className="text-[10px] text-stone-400 uppercase tracking-wider mb-2 font-semibold">Virality Score</div>
                         <div className="flex items-center gap-3">
                           <div className="flex-1 bg-stone-100 h-1.5 rounded-full overflow-hidden">
                              <div className="h-full bg-stone-800 w-[85%] rounded-full"></div>
                           </div>
                           <span className="text-xs font-bold text-stone-900">8.5/10</span>
                         </div>
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
