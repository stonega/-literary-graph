import React from 'react';
import { Clock, ChevronRight, FileText } from 'lucide-react';
import { SavedGraph } from '../types';
import { motion } from 'framer-motion';

interface RecentFilesProps {
  recentGraphs: SavedGraph[];
  onLoad: (graph: SavedGraph) => void;
  onViewAll: () => void;
}

export const RecentFiles: React.FC<RecentFilesProps> = ({ recentGraphs, onLoad, onViewAll }) => {
  if (recentGraphs.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay: 0.6 }}
      className="w-full max-w-lg mt-12"
    >
      <div className="flex items-center justify-between mb-4 border-b dark:border-[#333] border-gray-300 pb-2 transition-colors">
        <h3 className="text-sm font-sans uppercase tracking-widest dark:text-[#666] text-gray-500 transition-colors">Recent Manuscripts</h3>
        <button 
          onClick={onViewAll}
          className="text-xs dark:text-[#888] text-gray-500 hover:text-black dark:hover:text-[#e5e5e5] flex items-center gap-1 transition-colors"
        >
          VIEW ALL <ChevronRight size={12} />
        </button>
      </div>

      <div className="space-y-3">
        {recentGraphs.map((graph, index) => (
          <motion.div 
            key={graph.id}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.7 + (index * 0.1), duration: 0.5 }}
            onClick={() => onLoad(graph)}
            className={`
              group flex items-center justify-between p-4 cursor-pointer transition-all duration-500 rounded-sm
              dark:bg-[#1a1a1a] bg-white border dark:border-[#333] border-gray-200 
              dark:hover:border-[#666] hover:border-gray-400 dark:hover:bg-[#222] hover:bg-gray-50
            `}
          >
            <div className="flex items-center gap-4">
              <div className="p-2 dark:bg-[#111] bg-gray-100 border dark:border-[#333] border-gray-200 group-hover:border-gray-300 dark:group-hover:border-[#555] rounded-sm dark:text-[#666] text-gray-400 group-hover:text-gray-600 dark:group-hover:text-[#ccc] transition-colors">
                <FileText size={18} />
              </div>
              <div>
                <h4 className="dark:text-[#e5e5e5] text-[#1a1a1a] font-serif text-lg leading-tight group-hover:text-black dark:group-hover:text-white transition-colors">{graph.title}</h4>
                <div className="flex items-center gap-3 mt-1">
                   <span className="text-xs dark:text-[#666] text-gray-500 flex items-center gap-1 transition-colors">
                     <Clock size={10} />
                     {new Date(graph.timestamp).toLocaleDateString()}
                   </span>
                   <span className="text-xs dark:text-[#444] text-gray-400 transition-colors">•</span>
                   <span className="text-xs dark:text-[#666] text-gray-500 transition-colors">{graph.data.nodes.length} Characters</span>
                </div>
              </div>
            </div>
            <ChevronRight size={16} className="dark:text-[#444] text-gray-400 group-hover:text-black dark:group-hover:text-[#e5e5e5] transition-colors" />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
