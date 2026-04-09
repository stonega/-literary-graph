import React, { useState } from 'react';
import { Key, X } from 'lucide-react';

interface ApiKeyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
  initialKey: string;
}

export const ApiKeyDialog: React.FC<ApiKeyDialogProps> = ({ isOpen, onClose, onSave, initialKey }) => {
  const [key, setKey] = useState(initialKey);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] p-6 rounded-sm shadow-2xl w-full max-w-md relative animate-scale-in">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-black dark:hover:text-white transition-colors">
          <X size={20} />
        </button>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full">
            <Key size={24} />
          </div>
          <h2 className="text-xl font-serif dark:text-[#e5e5e5] text-[#1a1a1a]">Gemini API Key</h2>
        </div>
        <p className="text-sm dark:text-[#888] text-gray-600 mb-6 font-sans">
          Please enter your Gemini API key to use the gemini-3-flash-preview model. Your key is stored locally in your browser.
        </p>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="AIzaSy..."
          className="w-full bg-gray-50 dark:bg-[#111] border border-gray-300 dark:border-[#444] rounded-sm px-4 py-2 mb-6 text-[#1a1a1a] dark:text-[#e5e5e5] focus:outline-none focus:border-indigo-500 transition-colors font-mono text-sm"
        />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium dark:text-[#888] text-gray-600 hover:text-black dark:hover:text-white transition-colors">
            Cancel
          </button>
          <button onClick={() => { onSave(key); onClose(); }} className="px-4 py-2 bg-[#1a1a1a] dark:bg-[#e5e5e5] text-white dark:text-black text-sm font-medium rounded-sm hover:opacity-90 transition-opacity">
            Save Key
          </button>
        </div>
      </div>
    </div>
  );
};
