import React, { useCallback, useState } from 'react';
import { Upload, BookOpen, Fingerprint, Network } from 'lucide-react';
import { motion, Variants } from 'motion/react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
  statusMessage?: string;
  error?: string;
}

const containerVariants: Variants = {
  initial: { 
    y: 100, 
    opacity: 0,
    scale: 0.9,
  },
  hover: { 
    y: 0, 
    opacity: 1,
    scale: 1,
    transition: { 
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
      // Allow children to animate simultaneously for fluid "rise and open"
      staggerChildren: 0.05
    }
  }
};

const leftPageVariants: Variants = {
  initial: { 
    rotateY: -90, 
    opacity: 0 
  },
  hover: { 
    rotateY: 0, 
    opacity: 1,
    transition: { 
      duration: 0.6, 
      ease: [0.16, 1, 0.3, 1] 
    } 
  }
};

const rightPageVariants: Variants = {
  initial: { 
    rotateY: 90, 
    opacity: 0 
  },
  hover: { 
    rotateY: 0, 
    opacity: 1,
    transition: { 
      duration: 0.6, 
      ease: [0.16, 1, 0.3, 1] 
    } 
  }
};

const contentVariants: Variants = {
  initial: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    filter: "blur(0px)"
  },
  hover: { 
    opacity: 0, 
    y: -20,
    scale: 0.9,
    filter: "blur(4px)",
    transition: { 
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1]
    }
  }
};

const FloatingBookSVG = () => (
  <motion.div
    className="absolute w-72 h-64 pointer-events-none z-0 flex items-center justify-center"
    variants={containerVariants}
    style={{ perspective: "1000px" }}
  >
    <svg viewBox="0 0 200 160" className="w-full h-full overflow-visible">
      
      {/* Left Page Group */}
      <motion.g 
        variants={leftPageVariants}
        // Pivot at the right edge of the bounding box (the spine at x=100)
        style={{ originX: 1, originY: 0.5 }}
      >
        {/* Page Outline */}
        <path 
          d="M 20 140 Q 60 150 100 145 L 100 25 Q 60 30 20 20 Z" 
          className="fill-none stroke-ink dark:stroke-[#e5e5e5]" 
          strokeWidth="1.5" 
          strokeLinejoin="round"
        />
      </motion.g>

      {/* Right Page Group */}
      <motion.g 
        variants={rightPageVariants}
        // Pivot at the left edge of the bounding box (the spine at x=100)
        style={{ originX: 0, originY: 0.5 }}
      >
        {/* Page Outline */}
        <path 
          d="M 100 145 Q 140 150 180 140 L 180 20 Q 140 30 100 25 Z" 
          className="fill-none stroke-ink dark:stroke-[#e5e5e5]" 
          strokeWidth="1.5" 
          strokeLinejoin="round"
        />
        {/* Text Lines Right */}
        <g className="stroke-gray-400 dark:stroke-gray-600" strokeWidth="1" strokeLinecap="round">
          <path d="M 115 42 Q 140 45 170 40" />
          <path d="M 110 57 Q 140 60 170 55" />
          <path d="M 120 72 Q 140 75 170 70" />
          <path d="M 115 87 Q 140 90 160 85" />
          <path d="M 110 102 Q 140 105 170 100" />
          <path d="M 125 117 Q 140 120 170 115" />
        </g>
      </motion.g>

    </svg>
  </motion.div>
);

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isProcessing, statusMessage, error }) => {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/epub+zip" || file.name.endsWith('.epub')) {
        onFileSelect(file);
      }
    }
  }, [onFileSelect]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 bg-transparent transition-colors duration-500">
      <motion.div 
        initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
        whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="text-center mb-16 max-w-2xl"
      >
        <div className="w-16 h-1 dark:bg-[#333] bg-[#ccc] mx-auto mb-8 transition-colors"></div>
        <h1 className="text-5xl md:text-7xl font-light dark:text-[#e5e5e5] text-[#1a1a1a] mb-6 tracking-tight font-serif italic transition-colors">
          Literary Graph
        </h1>
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 1 }}
          className="dark:text-[#888] text-[#555] text-xl font-serif leading-relaxed"
        >
          Uncover the hidden social structures within your library. <br/>
          Upload an EPUB to generate a 3D character network.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 1 }}
          className="mt-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border dark:border-[#333] border-gray-300 text-xs font-sans dark:text-[#888] text-gray-500 shadow-sm"
        >
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
          Powered by Andrej Karpathy's LLM Knowledge Base pattern
        </motion.div>
      </motion.div>

      <motion.div 
        initial="initial"
        whileHover="hover"
        whileInView={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        viewport={{ once: true }}
        className={`
          relative w-full max-w-lg p-12 border border-dashed transition-all duration-500 ease-out
          flex flex-col items-center justify-center gap-6 group cursor-pointer border-flow-hover overflow-hidden
          ${dragActive ? 'border-flow-active dark:bg-[#1a1a1a] bg-gray-50' : 'dark:border-[#444] border-gray-300 dark:hover:bg-[#161616] hover:bg-white'}
          ${isProcessing ? 'pointer-events-none opacity-50' : ''}
        `}
        style={{ minHeight: '300px' }}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-upload')?.click()}
      >
        {/* Animated Background Book */}
        {!isProcessing && <FloatingBookSVG />}

        <input 
          id="file-upload" 
          type="file" 
          className="hidden" 
          accept=".epub,application/epub+zip" 
          onChange={handleChange} 
        />
        
        <div className="relative z-10 flex flex-col items-center">
            {isProcessing ? (
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 border-2 dark:border-[#333] border-gray-200 dark:border-t-[#e5e5e5] border-t-[#1a1a1a] rounded-full animate-spin mb-6" />
                <p className="text-xl dark:text-[#e5e5e5] text-[#1a1a1a] font-serif italic">{statusMessage || 'Reading book...'}</p>
              </div>
            ) : (
              <motion.div variants={contentVariants} className="flex flex-col items-center">
                <Upload className="w-8 h-8 dark:text-[#666] text-[#999] transition-colors duration-300 mb-4" />
                <div className="text-center">
                  <p className="text-2xl font-serif dark:text-[#e5e5e5] text-[#1a1a1a] mb-2 transition-colors">Open Book</p>
                  <p className="dark:text-[#666] text-[#888] font-serif italic transition-colors">Drop EPUB file here</p>
                </div>
              </motion.div>
            )}
        </div>
      </motion.div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 px-6 py-4 border border-red-900/50 text-red-400 font-serif bg-red-900/10 rounded-sm"
        >
          <p>{error}</p>
        </motion.div>
      )}

      <div 
        className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl px-4"
      >
         <FeatureItem 
           index={1}
           icon={<BookOpen className="w-5 h-5" />}
           title="Incremental Ingestion"
           desc="We parse the raw book and incrementally build a persistent knowledge base of entities and relationships, updating the graph as we read."
           delay={0}
         />
         <FeatureItem 
           index={2}
           icon={<Fingerprint className="w-5 h-5" />}
           title="Entity Resolution"
           desc="Advanced AI merges aliases into single identities and constantly updates relationships, building a clean, compounding dataset."
           delay={0.1}
         />
         <FeatureItem 
           index={3}
           icon={<Network className="w-5 h-5" />}
           title="Spatial Network"
           desc="The relationships are visualized as an interactive 3D constellation, revealing the hidden social structures of the story."
           delay={0.2}
         />
      </div>
    </div>
  );
};

const FeatureItem = ({ icon, title, desc, delay, index }: { icon: React.ReactNode, title: string, desc: string, delay: number, index: number }) => (
  <motion.div 
    initial={{ opacity: 0, y: 80, filter: 'blur(10px)' }}
    whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
    whileHover="hover"
    viewport={{ once: true }}
    transition={{ delay, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    className="group relative flex flex-col items-start p-8 border dark:border-[#222] border-gray-200 dark:hover:border-[#444] hover:border-gray-300 dark:bg-[#161616]/30 bg-white/50 rounded-sm transition-all duration-500 hover:shadow-2xl"
  >
    <div className="absolute top-6 right-6 text-4xl font-serif italic dark:text-[#222] text-gray-100 group-hover:text-gray-200 dark:group-hover:text-[#333] transition-colors duration-500 select-none">
      0{index}
    </div>
    
    <motion.div
      variants={{
        hover: {
          scale: 1.1,
          rotate: [0, -5, 5, -5, 5, 0],
          transition: { duration: 0.5, ease: "easeInOut" }
        }
      }}
      className="mb-6 p-3 rounded-full dark:bg-[#1a1a1a] bg-white border dark:border-[#333] border-gray-100 dark:text-[#888] text-gray-400 group-hover:text-black dark:group-hover:text-white shadow-sm transition-colors duration-300"
    >
      {icon}
    </motion.div>
    
    <h3 className="text-xl font-medium dark:text-[#e5e5e5] text-[#1a1a1a] mb-3 font-serif tracking-wide group-hover:translate-x-1 transition-transform duration-300">
      {title}
    </h3>
    
    <p className="dark:text-[#666] text-gray-500 text-sm leading-relaxed font-sans group-hover:text-gray-600 dark:group-hover:text-[#888] transition-colors">
      {desc}
    </p>
  </motion.div>
);