import React, { useState } from 'react';
import { User, ShieldAlert, Check, Key } from 'lucide-react';

const PRESET_COLORS = [
  '#EC4899', // Pink
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#64748B'  // Slate
];

export default function UserProfileModal({
  currentName,
  currentColor,
  onSave,
  onClose,
  isInitial = false
}) {
  const [name, setName] = useState(currentName || '');
  const [color, setColor] = useState(currentColor || PRESET_COLORS[0]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim(), color);
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-none flex items-center justify-center z-50 p-4 animate-fade-in" id="profile-modal-container">
      <div 
        className="bg-white rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-md border-[3px] border-black overflow-hidden"
        id="profile-modal-content"
      >
        <div className="p-6 bg-[#F0F0F0] border-b-[3px] border-black flex items-center gap-3">
          <div className="w-10 h-10 rounded-none bg-black border-2 border-black flex items-center justify-center text-white shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-xl text-black uppercase tracking-tight">
              {isInitial ? 'WELCOME TO NOTE(S)!' : 'COLLABORATOR SETTINGS'}
            </h3>
            <p className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">
              {isInitial ? 'SET YOUR DISPLAY NAME TO BEGIN.' : 'UPDATE HOW OTHERS SEE YOU LIVE.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-black block">DISPLAY NAME</label>
            <input
              type="text"
              required
              maxLength={25}
              placeholder="e.g. MARIE CURIE"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-none border-2 border-black focus:outline-none focus:ring-0 text-xs font-bold uppercase transition-all bg-white text-black"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-black block">PRESENCE AVATAR COLOR</label>
            <div className="grid grid-cols-8 gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className="w-8 h-8 rounded-none border-2 border-black flex items-center justify-center transition-transform hover:scale-110 focus:outline-none cursor-pointer"
                >
                  {color === c && (
                    <Check className="w-4 h-4 text-white drop-shadow" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t-2 border-black flex items-center justify-end gap-3">
            {!isInitial && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-black uppercase tracking-wider text-black border-2 border-transparent hover:border-black rounded-none cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-5 py-2.5 bg-black hover:bg-zinc-800 disabled:opacity-50 text-white rounded-none text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2"
            >
              <span>{isInitial ? 'ENTER APPLICATION' : 'SAVE CHANGES'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
