import React, { useState } from 'react';
import { Plus, Trash2, Folder, Check, Tag } from 'lucide-react';

const PALETTE = [
  '#3B82F6', // Blue
  '#EC4899', // Pink
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#64748B'  // Slate
];

export default function CategoryList({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onCreateCategory,
  onDeleteCategory
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(PALETTE[0]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    onCreateCategory(newCatName.trim(), newCatColor);
    setNewCatName('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6" id="category-sidebar-section">
      <div className="flex items-center justify-between pb-2 border-b-2 border-black">
        <h3 className="text-[10px] font-black uppercase text-black tracking-widest">
          COLLECTIONS
        </h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-black hover:bg-black hover:text-white transition-colors p-1 border-2 border-transparent hover:border-black rounded-none cursor-pointer"
          title="Add Category"
          id="add-category-btn"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {showAddForm && (
        <form 
          onSubmit={handleSubmit} 
          className="p-4 bg-white border-2 border-black rounded-none space-y-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] animate-fade-in"
          id="category-add-form"
        >
          <input
            type="text"
            required
            placeholder="CATEGORY NAME"
            maxLength={18}
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            className="w-full px-3 py-1.5 text-xs font-bold uppercase rounded-none border-2 border-black bg-white focus:outline-none focus:ring-0"
          />
          <div className="flex flex-col gap-3">
            <span className="text-[9px] font-black uppercase text-zinc-400">CHOOSE COLOR</span>
            <div className="flex flex-wrap gap-1.5">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewCatColor(c)}
                  style={{ backgroundColor: c }}
                  className="w-5 h-5 border-2 border-black cursor-pointer hover:scale-110 transition-transform flex items-center justify-center rounded-none"
                >
                  {newCatColor === c && (
                    <div className="w-1.5 h-1.5 bg-black" />
                  )}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-2 py-1 text-[10px] font-black uppercase text-black border-2 border-transparent hover:border-black rounded-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 bg-black text-white text-[10px] font-black uppercase border-2 border-black hover:bg-zinc-800 rounded-none cursor-pointer"
              >
                Create
              </button>
            </div>
          </div>
        </form>
      )}

      <ul className="space-y-2" id="category-items-list">
        <li>
          <button
            onClick={() => onSelectCategory(null)}
            className={`w-full flex items-center justify-between px-3 py-2 border-2 rounded-none text-xs font-black uppercase transition-all cursor-pointer ${
              selectedCategoryId === null
                ? 'bg-black text-white border-black'
                : 'text-black border-transparent hover:border-black hover:bg-zinc-50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Folder className="w-4 h-4 shrink-0" />
              <span>01 All Notes</span>
            </div>
          </button>
        </li>

        {categories.map((cat, idx) => {
          const isSelected = selectedCategoryId === cat.id;
          const prefix = String(idx + 2).padStart(2, '0');
          return (
            <li key={cat.id} className="group relative">
              <button
                onClick={() => onSelectCategory(cat.id)}
                className={`w-full flex items-center justify-between px-3 py-2 border-2 rounded-none text-xs font-black uppercase transition-all cursor-pointer pr-8 ${
                  isSelected
                    ? 'bg-black text-white border-black'
                    : 'text-zinc-600 border-transparent hover:text-black hover:border-black hover:bg-[#F8F8F8]'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span
                    className="w-2.5 h-2.5 border border-black shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="truncate">{prefix} {cat.name}</span>
                </div>
              </button>
              
              <button
                onClick={() => onDeleteCategory(cat.id)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-zinc-400 hover:text-white hover:bg-black border border-transparent hover:border-black rounded-none cursor-pointer"
                title={`Delete ${cat.name}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
