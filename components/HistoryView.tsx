
import React from 'react';
import { ArrowLeft, Trash2, Calendar, Users, Network } from 'lucide-react';
import { SavedGraph } from '../types';

interface HistoryViewProps {
  graphs: SavedGraph[];
  onLoad: (graph: SavedGraph) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ graphs, onLoad, onDelete, onBack }) => {
  return (
    <div className="w-full h-full bg-transparent overflow-y-auto custom-scrollbar p-8 transition-colors duration-500">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-6 mb-12">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-black/5 dark:hover:bg-[#222] rounded-full dark:text-[#666] text-gray-400 hover:text-black dark:hover:text-[#e5e5e5] transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-4xl font-serif dark:text-[#e5e5e5] text-[#1a1a1a] italic transition-colors">The Archives</h1>
            <p className="dark:text-[#666] text-gray-500 mt-1 text-sm font-sans uppercase tracking-widest transition-colors">Saved Collections</p>
          </div>
        </div>

        {graphs.length === 0 ? (
          <div className="text-center py-20 border border-dashed dark:border-[#333] border-gray-300 rounded-sm">
            <p className="dark:text-[#666] text-gray-400 font-serif italic text-xl transition-colors">No books found in the archives.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {graphs.map((graph) => (
              <div 
                key={graph.id}
                className="group relative dark:bg-[#1a1a1a] bg-white border dark:border-[#333] border-gray-200 dark:hover:border-[#666] hover:border-gray-400 transition-all duration-300 flex flex-col rounded-sm overflow-hidden shadow-sm hover:shadow-md"
              >
                {/* Card Top / Preview Area */}
                <div 
                  onClick={() => onLoad(graph)}
                  className="h-32 dark:bg-[#161616] bg-gray-50 border-b dark:border-[#333] border-gray-200 flex items-center justify-center cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-black to-transparent dark:from-white dark:to-transparent" />
                  <Network className="dark:text-[#333] text-gray-300 group-hover:text-gray-400 dark:group-hover:text-[#555] w-16 h-16 transition-colors" />
                </div>

                {/* Card Content */}
                <div className="p-6 flex-1 flex flex-col cursor-pointer" onClick={() => onLoad(graph)}>
                   <h3 className="text-xl font-serif dark:text-[#e5e5e5] text-[#1a1a1a] mb-2 line-clamp-1 group-hover:text-black dark:group-hover:text-white transition-colors">
                     {graph.title}
                   </h3>
                   <div className="space-y-2 mt-auto">
                     <div className="flex items-center gap-2 text-sm dark:text-[#888] text-gray-500 transition-colors">
                       <Calendar size={14} />
                       <span>{new Date(graph.timestamp).toLocaleDateString()}</span>
                     </div>
                     <div className="flex items-center gap-2 text-sm dark:text-[#888] text-gray-500 transition-colors">
                       <Users size={14} />
                       <span>{graph.data.nodes.length} Characters</span>
                     </div>
                     <div className="flex items-center gap-2 text-sm dark:text-[#888] text-gray-500 transition-colors">
                       <span className="font-mono text-xs dark:text-[#555] text-gray-400">ID: {graph.id.slice(0, 8)}</span>
                     </div>
                   </div>
                </div>

                {/* Actions */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button 
                     onClick={(e) => {
                       e.stopPropagation();
                       onDelete(graph.id);
                     }}
                     className="p-2 dark:bg-[#222] bg-white hover:bg-red-50 dark:hover:bg-red-900/30 dark:text-[#666] text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-full transition-colors border dark:border-[#333] border-gray-200 shadow-sm"
                     title="Delete"
                   >
                     <Trash2 size={16} />
                   </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
