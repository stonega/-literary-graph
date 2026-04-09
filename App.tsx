

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FileUpload } from './components/FileUpload';
import GraphView from './components/GraphView';
import { RecentFiles } from './components/RecentFiles';
import { HistoryView } from './components/HistoryView';
import { AutoScrollingText } from './components/AutoScrollingText';
import { ApiKeyDialog } from './components/ApiKeyDialog';
import { parseEpub, estimateTokens, ParsedBook } from './services/epubService';
import { generateGraph } from './services/geminiService';
import { saveGraph, getRecentGraphs, getAllGraphs, deleteGraph } from './services/storageService';
import { AppState, GraphData, ProcessingStats, SavedGraph, Theme } from './types';
import { COST_PER_1M_TOKENS } from './constants';
import { RefreshCw, Download, ArrowLeft, Play, AlertCircle, Sun, Moon, BookOpen, Upload, Key } from 'lucide-react';

// Animated Theme Switch Component
const ThemeSwitch: React.FC<{ theme: Theme, onToggle: () => void }> = ({ theme, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className="relative w-16 h-8 rounded-full bg-gray-300 dark:bg-[#333] transition-colors duration-500 shadow-inner focus:outline-none group"
      title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
    >
      <div 
        className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-500 flex items-center justify-center ${theme === 'dark' ? 'translate-x-8' : 'translate-x-0'}`}
      >
        {theme === 'dark' ? (
          <Moon size={14} className="text-indigo-400" />
        ) : (
          <Sun size={14} className="text-amber-500" />
        )}
      </div>
    </button>
  );
};

const App = () => {
  // Initialize theme from localStorage or default to dark
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
       const saved = localStorage.getItem('theme');
       return (saved as Theme) || 'dark';
    }
    return 'dark';
  });

  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [stats, setStats] = useState<ProcessingStats | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  
  // Temporary state for the book pending confirmation
  const [pendingBook, setPendingBook] = useState<ParsedBook | null>(null);

  // API Key State
  const [apiKey, setApiKey] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('gemini_api_key') || '';
    }
    return '';
  });
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);

  // Storage State
  const [recentGraphs, setRecentGraphs] = useState<SavedGraph[]>([]);
  const [allGraphs, setAllGraphs] = useState<SavedGraph[]>([]);

  // File Input Ref
  const importRef = useRef<HTMLInputElement>(null);

  // Apply Theme Class
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Load recent files on mount and when returning to idle
  const refreshRecent = useCallback(async () => {
    try {
      const recent = await getRecentGraphs();
      setRecentGraphs(recent);
    } catch (e) {
      console.warn("Failed to load recent graphs", e);
    }
  }, []);

  useEffect(() => {
    refreshRecent();
  }, [refreshRecent]);

  // Load all graphs when entering history view
  const loadHistory = async () => {
    const all = await getAllGraphs();
    setAllGraphs(all);
    setState(AppState.HISTORY);
  };

  const handleFileSelect = async (file: File) => {
    try {
      setState(AppState.PARSING);
      setError(undefined);
      setStatusMessage('Reading book...');
      
      // 1. Parse Text & Metadata
      const bookData = await parseEpub(file);
      const tokenCount = estimateTokens(bookData.text);
      const estimatedCost = (tokenCount / 1_000_000) * COST_PER_1M_TOKENS;

      // Store data for confirmation screen
      setPendingBook(bookData);
      setStats({
        tokenCount,
        estimatedCost,
        processingTimeMs: 0
      });
      
      setState(AppState.CONFIRMATION);
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
      setState(AppState.IDLE);
    }
  };

  const handleConfirmAnalysis = async () => {
    if (!pendingBook) return;
    
    if (!apiKey) {
      setIsApiKeyDialogOpen(true);
      return;
    }

    try {
      setState(AppState.ANALYZING);
      const startTime = performance.now();

      // 2. Call Gemini
      const data = await generateGraph(pendingBook.text, apiKey, (msg) => {
        setStatusMessage(msg);
      });
      
      const endTime = performance.now();
      
      const finalStats = {
        tokenCount: stats?.tokenCount || 0,
        estimatedCost: stats?.estimatedCost || 0,
        processingTimeMs: endTime - startTime
      };

      // Update stats with actual time
      setStats(finalStats);
      setGraphData(data);
      
      // 3. Auto-save result
      try {
        await saveGraph(pendingBook.title, data, finalStats);
        // Refresh recent list in background so it's ready when we go back
        refreshRecent(); 
      } catch (e) {
        console.warn("Failed to auto-save graph", e);
      }

      setState(AppState.VISUALIZING);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Analysis failed. Please try again.");
      setState(AppState.IDLE); // Go back to idle on error to allow retry
    }
  };

  const handleLoadSavedGraph = (saved: SavedGraph) => {
    // Determine context. If we have text from it, great, but we usually don't save full text.
    // So we just visualize what we have.
    setGraphData(saved.data);
    setStats(saved.stats);
    // Mock a book object for display purposes
    setPendingBook({
      title: saved.title,
      text: "Text content not available in archive mode.", 
      coverUrl: null
    });
    setState(AppState.VISUALIZING);
  };

  const handleImportClick = () => {
    importRef.current?.click();
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const data = JSON.parse(json);
        
        // Basic validation
        if (!data.nodes || !Array.isArray(data.nodes) || !data.links || !Array.isArray(data.links)) {
          throw new Error("Invalid graph file format");
        }

        setGraphData(data);
        // Mock stats for imported file
        setStats({
          tokenCount: 0,
          estimatedCost: 0,
          processingTimeMs: 0
        });
        setPendingBook({
          title: file.name.replace('.json', ''),
          text: "Imported from JSON file.",
          coverUrl: null
        });
        setState(AppState.VISUALIZING);
        setError(undefined);
      } catch (err: any) {
        console.error(err);
        setError("Failed to import file. Invalid JSON format.");
      }
      
      // Reset input
      if (importRef.current) importRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleDeleteGraph = async (id: string) => {
    await deleteGraph(id);
    const updated = await getAllGraphs();
    setAllGraphs(updated);
    refreshRecent();
  };

  const handleCancel = () => {
    if (pendingBook?.coverUrl) {
      URL.revokeObjectURL(pendingBook.coverUrl);
    }
    setPendingBook(null);
    setStats(null);
    setState(AppState.IDLE);
  };

  const handleReset = () => {
    if (pendingBook?.coverUrl) {
      URL.revokeObjectURL(pendingBook.coverUrl);
    }
    setState(AppState.IDLE);
    refreshRecent(); // Refresh list to ensure new adds show up
    setGraphData(null);
    setStats(null);
    setPendingBook(null);
    setError(undefined);
  };

  const handleExport = () => {
    if (!graphData) return;
    const blob = new Blob([JSON.stringify(graphData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pendingBook?.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'graph'}.json`;
    a.click();
  };

  const handleSaveApiKey = (newKey: string) => {
    setApiKey(newKey);
    localStorage.setItem('gemini_api_key', newKey);
  };

  return (
    <div className={`w-full h-screen transition-colors duration-500 flex flex-col font-serif overflow-hidden relative ${theme === 'dark' ? 'bg-[#111111] text-[#e5e5e5]' : 'bg-[#fdfbf7] text-[#1a1a1a]'}`}>
      
      <ApiKeyDialog 
        isOpen={isApiKeyDialogOpen} 
        onClose={() => setIsApiKeyDialogOpen(false)} 
        onSave={handleSaveApiKey} 
        initialKey={apiKey} 
      />

      <div className="relative z-10 w-full h-full">
        
        {/* Theme Switcher - Absolute position on IDLE, Hidden on Visualizing/Analyzing */}
        {state === AppState.IDLE && (
          <div className="absolute top-6 right-6 z-50 animate-fade-in flex items-center gap-3">
             <ThemeSwitch theme={theme} onToggle={toggleTheme} />
             
             <button
               onClick={() => setIsApiKeyDialogOpen(true)}
               className="w-8 h-8 rounded-full bg-gray-300 dark:bg-[#333] hover:bg-gray-400 dark:hover:bg-[#444] transition-colors duration-500 shadow-inner flex items-center justify-center text-gray-600 dark:text-[#ccc] focus:outline-none"
               title="Set API Key"
             >
                <Key size={14} />
             </button>

             <button
               onClick={handleImportClick}
               className="w-8 h-8 rounded-full bg-gray-300 dark:bg-[#333] hover:bg-gray-400 dark:hover:bg-[#444] transition-colors duration-500 shadow-inner flex items-center justify-center text-gray-600 dark:text-[#ccc] focus:outline-none"
               title="Import JSON Graph"
             >
                <Upload size={14} />
             </button>
             <input 
                ref={importRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportFile}
             />
          </div>
        )}

        {/* State: IDLE or PARSING */}
        {(state === AppState.IDLE || state === AppState.PARSING) && (
           // Wrapper to allow scrolling for homepage content
           <div className="w-full h-full overflow-y-auto custom-scrollbar">
             <div className="flex flex-col items-center w-full min-h-screen">
               <FileUpload 
                 onFileSelect={handleFileSelect} 
                 isProcessing={state === AppState.PARSING}
                 statusMessage={statusMessage}
                 error={error}
               />
               {state === AppState.IDLE && (
                 <div className="w-full flex justify-center pb-12 -mt-10 z-10">
                   <RecentFiles 
                     recentGraphs={recentGraphs} 
                     onLoad={handleLoadSavedGraph} 
                     onViewAll={loadHistory} 
                   />
                 </div>
               )}
             </div>
           </div>
        )}

        {/* State: HISTORY */}
        {state === AppState.HISTORY && (
          <HistoryView 
            graphs={allGraphs}
            onLoad={handleLoadSavedGraph}
            onDelete={handleDeleteGraph}
            onBack={() => setState(AppState.IDLE)}
          />
        )}

        {/* State: CONFIRMATION */}
        {state === AppState.CONFIRMATION && pendingBook && stats && (
          <div className="flex flex-col items-center justify-center h-full p-8 animate-fade-in overflow-y-auto">
             <div className="dark:bg-[#1a1a1a] bg-white border dark:border-[#333] border-gray-200 p-8 max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 shadow-2xl my-auto transition-colors duration-500 rounded-sm animate-scale-in">
                
                {/* Book Cover / Placeholder */}
                <div className="flex items-center justify-center dark:bg-[#111] bg-gray-50 border dark:border-[#333] border-gray-200 aspect-[2/3] relative overflow-hidden transition-colors">
                   {pendingBook.coverUrl ? (
                     <img 
                       src={pendingBook.coverUrl} 
                       alt="Cover" 
                       className="w-full h-full object-cover" 
                     />
                   ) : (
                     <div className="flex flex-col items-center dark:text-[#444] text-gray-300">
                        <span className="text-4xl font-serif italic mb-2">?</span>
                        <span className="text-sm font-sans uppercase tracking-widest">No Cover</span>
                     </div>
                   )}
                </div>

                {/* Details */}
                <div className="flex flex-col justify-center">
                   <h2 className="text-3xl md:text-4xl font-serif dark:text-[#e5e5e5] text-[#1a1a1a] mb-2 leading-tight transition-colors">
                     {pendingBook.title}
                   </h2>
                   <div className="h-1 w-12 dark:bg-[#333] bg-gray-300 mb-6 transition-colors"></div>

                   <div className="space-y-6 mb-8">
                      <div>
                        <p className="dark:text-[#666] text-gray-500 text-xs uppercase tracking-widest font-sans mb-1 transition-colors">Word Count Estimate</p>
                        <p className="text-xl dark:text-[#ccc] text-gray-800 transition-colors">~{Math.round(stats.tokenCount * 0.75).toLocaleString()} words</p>
                      </div>
                      
                      <div>
                        <p className="dark:text-[#666] text-gray-500 text-xs uppercase tracking-widest font-sans mb-1 transition-colors">Token Load</p>
                        <p className="text-xl dark:text-[#ccc] text-gray-800 transition-colors">{stats.tokenCount.toLocaleString()} tokens</p>
                      </div>

                      <div className="dark:bg-[#222] bg-gray-50 p-4 border dark:border-[#333] border-gray-200 transition-colors">
                        <p className="dark:text-[#888] text-gray-500 text-xs uppercase tracking-widest font-sans mb-1 transition-colors">Estimated API Cost</p>
                        <p className="text-3xl font-serif dark:text-[#e5e5e5] text-[#111] transition-colors">${stats.estimatedCost.toFixed(4)}</p>
                        <p className="dark:text-[#555] text-gray-400 text-xs mt-1 italic transition-colors">Based on Gemini Flash pricing</p>
                      </div>
                   </div>

                   <div className="flex gap-4">
                      <button 
                        onClick={handleConfirmAnalysis}
                        className="flex-1 dark:bg-[#e5e5e5] bg-[#1a1a1a] dark:text-black text-white py-3 px-6 hover:opacity-90 transition-opacity flex items-center justify-center gap-2 font-semibold tracking-wide text-sm rounded-sm"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        START ANALYSIS
                      </button>
                      <button 
                         onClick={handleCancel}
                         className="px-6 py-3 border dark:border-[#444] border-gray-300 dark:text-[#888] text-gray-600 dark:hover:text-[#e5e5e5] hover:text-black dark:hover:border-[#666] hover:border-gray-400 transition-colors text-sm tracking-wide rounded-sm"
                      >
                        CANCEL
                      </button>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* State: ANALYZING */}
        {state === AppState.ANALYZING && (
          <div className="relative flex flex-col items-center justify-center h-full w-full dark:bg-[#111] bg-[#fdfbf7] transition-colors">
             {/* Background Scrolling Text */}
             {pendingBook && <AutoScrollingText text={pendingBook.text} theme={theme} />}
             
             {/* Foreground Loader */}
             <div className="z-10 flex flex-col items-center dark:bg-[#111]/80 bg-white/80 p-12 backdrop-blur-md border dark:border-[#222] border-gray-200 rounded-sm shadow-2xl transition-colors animate-scale-in">
               <div className="w-16 h-16 border-2 dark:border-[#333] border-gray-300 dark:border-t-[#e5e5e5] border-t-[#1a1a1a] rounded-full animate-spin mb-8" />
               <h2 className="text-2xl font-serif dark:text-[#e5e5e5] text-[#1a1a1a] mb-2 transition-colors">Analyzing Text</h2>
               <p className="dark:text-[#ccc] text-gray-600 font-serif italic max-w-md text-center animate-pulse transition-colors">
                 {statusMessage}
               </p>
             </div>
          </div>
        )}

        {/* State: VISUALIZING */}
        {state === AppState.VISUALIZING && (
          <>
            {/* Header / HUD */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-50 pointer-events-none">
               <div className="pointer-events-auto flex items-center gap-6">
                  <button 
                    onClick={handleReset}
                    className="flex items-center gap-3 px-4 py-2 dark:bg-[#1a1a1a] bg-white border dark:border-[#333] border-gray-200 hover:border-gray-400 dark:hover:border-[#555] transition-colors rounded-sm group shadow-sm"
                  >
                    <ArrowLeft className="w-4 h-4 dark:text-[#666] text-gray-500 group-hover:text-black dark:group-hover:text-[#e5e5e5]" />
                    <span className="text-sm tracking-wide dark:text-[#888] text-gray-600 group-hover:text-black dark:group-hover:text-[#e5e5e5]">BACK</span>
                  </button>
                  
                  {pendingBook && (
                    <div className="hidden md:flex items-center gap-4 border-l dark:border-[#333] border-gray-300 pl-6 transition-colors animate-fade-in">
                      {/* Cover Thumbnail */}
                      <div className="flex-shrink-0 shadow-sm rounded-sm overflow-hidden border dark:border-[#333] border-gray-200">
                        {pendingBook.coverUrl ? (
                          <img 
                            src={pendingBook.coverUrl} 
                            alt={pendingBook.title} 
                            className="w-8 h-12 object-cover"
                          />
                        ) : (
                          <div className="w-8 h-12 bg-gray-100 dark:bg-[#222] flex items-center justify-center">
                            <BookOpen size={14} className="dark:text-[#444] text-gray-300" />
                          </div>
                        )}
                      </div>
                      
                      {/* Title & Stats */}
                      <div className="flex flex-col">
                        <span className="text-sm font-serif font-medium dark:text-[#e5e5e5] text-[#1a1a1a] line-clamp-1 max-w-[200px]">
                          {pendingBook.title}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] md:text-xs dark:text-[#666] text-gray-500 font-sans tracking-wide mt-0.5">
                           {stats && (
                             <span>${stats.estimatedCost.toFixed(4)}</span>
                           )}
                           {graphData && (
                             <>
                               <span className="opacity-30">•</span>
                               <span>{graphData.nodes.length} chars</span>
                               <span className="opacity-30">•</span>
                               <span>{new Set(graphData.nodes.map(n => n.group || 'Unaffiliated')).size} groups</span>
                             </>
                           )}
                        </div>
                      </div>
                    </div>
                  )}
               </div>

               <div className="pointer-events-auto flex items-center gap-4">
                  {/* Theme toggle available here too */}
                  <ThemeSwitch theme={theme} onToggle={toggleTheme} />
                  
                  <button 
                    onClick={handleExport}
                    className="flex items-center gap-3 px-4 py-2 dark:bg-[#e5e5e5] bg-[#1a1a1a] dark:text-black text-white hover:opacity-90 transition-opacity rounded-sm shadow-lg"
                  >
                    <Download className="w-4 h-4" />
                    <span className="text-sm font-semibold tracking-wide">EXPORT JSON</span>
                  </button>
               </div>
            </div>

            {/* Main Viz */}
            <div className="w-full h-full cursor-move dark:bg-[#111111] bg-[#fdfbf7] transition-colors outline-none relative">
               {graphData && <GraphView data={graphData} theme={theme} />}
            </div>
            
          </>
        )}
      </div>
    </div>
  );
};

export default App;
