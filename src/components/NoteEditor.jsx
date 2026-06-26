import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Check, Palette, Tag, Eye, Edit2, Columns,
  Copy, CheckCheck
} from 'lucide-react';

const NOTE_COLORS = [
  { name: 'White', value: '#FFFFFF' },
  { name: 'Cream', value: '#FFF8E7' },
  { name: 'Peach', value: '#FFF0EA' },
  { name: 'Mint', value: '#EDF9F4' },
  { name: 'Sky Blue', value: '#E8F5FE' },
  { name: 'Lavender', value: '#F2EFFE' },
  { name: 'Sand', value: '#FAF5ED' }
];

export default function NoteEditor({
  note,
  categories,
  collaborators,
  currentUser,
  onSave,
  onClose,
  onLocalEdit
}) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [category, setCategory] = useState(note.category);
  const [color, setColor] = useState(note.color || '#FFFFFF');
  
  const [viewMode, setViewMode] = useState('split');
  const [copied, setCopied] = useState(false);

  const contentRef = useRef(null);

  // Sync internal states if note updates from other collaborators (while user is NOT focused or not editing)
  useEffect(() => {
    if (document.activeElement !== contentRef.current) {
      setContent(note.content);
    }
    // Always sync title if not active
    const activeEl = document.activeElement;
    if (activeEl?.id !== `editor-title-${note.id}`) {
      setTitle(note.title);
    }
    setCategory(note.category);
    setColor(note.color || '#FFFFFF');
  }, [note]);

  // Handle changes and propagate
  const handleTitleChange = (e) => {
    const val = e.target.value;
    setTitle(val);
    onSave({ id: note.id, title: val });
  };

  const handleContentChange = (e) => {
    const val = e.target.value;
    setContent(val);
    onLocalEdit(val); // Broadcasts cursor position / live updates via WS
    onSave({ id: note.id, content: val });
  };

  const handleCategoryChange = (e) => {
    const val = e.target.value;
    setCategory(val);
    onSave({ id: note.id, category: val });
  };

  const handleColorSelect = (colorVal) => {
    setColor(colorVal);
    onSave({ id: note.id, color: colorVal });
  };

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?noteId=${note.id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Custom parser to render basic markdown nicely
  const renderMarkdown = (text) => {
    if (!text) return <p className="text-slate-400 italic">No content yet. Start writing on the left!</p>;

    const lines = text.split('\n');
    return (
      <div className="space-y-3 font-sans text-sm text-slate-700 leading-relaxed max-w-none">
        {lines.map((line, idx) => {
          // Headers
          if (line.startsWith('### ')) {
            return <h5 key={idx} className="text-base font-semibold text-slate-800 mt-4 mb-2">{line.replace('### ', '')}</h5>;
          }
          if (line.startsWith('## ')) {
            return <h4 key={idx} className="text-lg font-bold text-slate-800 mt-5 mb-2">{line.replace('## ', '')}</h4>;
          }
          if (line.startsWith('# ')) {
            return <h3 key={idx} className="text-xl font-extrabold text-slate-900 mt-6 mb-3">{line.replace('# ', '')}</h3>;
          }

          // Bullet lists
          if (line.startsWith('- ') || line.startsWith('* ')) {
            const cleanLine = line.substring(2);
            // Checkbox
            if (cleanLine.startsWith('[ ] ')) {
              return (
                <div key={idx} className="flex items-start gap-2 pl-4">
                  <input type="checkbox" disabled className="mt-1 rounded text-indigo-600" />
                  <span>{cleanLine.replace('[ ] ', '')}</span>
                </div>
              );
            }
            if (cleanLine.startsWith('[x] ') || cleanLine.startsWith('[X] ')) {
              return (
                <div key={idx} className="flex items-start gap-2 pl-4 text-slate-400 line-through">
                  <input type="checkbox" defaultChecked disabled className="mt-1 rounded text-indigo-600" />
                  <span>{cleanLine.replace(/\[[xX]\]\s+/, '')}</span>
                </div>
              );
            }
            return <li key={idx} className="list-disc list-inside pl-4 text-slate-600">{cleanLine}</li>;
          }

          // Separator
          if (line.trim() === '---') {
            return <hr key={idx} className="my-4 border-t border-slate-200" />;
          }

          // Empty line
          if (!line.trim()) {
            return <div key={idx} className="h-2" />;
          }

          // Bold & italic basic highlight
          let renderedText = line;
          const boldRegex = /\*\*(.*?)\*\*/g;
          if (boldRegex.test(line)) {
            const parts = line.split(/\*\*/);
            renderedText = parts.map((part, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} className="font-bold text-slate-900">{part}</strong> : part);
          }

          return <p key={idx} className="min-h-[1.2em]">{renderedText}</p>;
        })}
      </div>
    );
  };

  // Find users active in this note
  const noteCollaborators = collaborators.filter(c => c.activeNoteId === note.id);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-none z-40 flex items-center justify-center p-4 md:p-6 animate-fade-in" id="note-editor-modal">
      <div
        style={{ backgroundColor: color }}
        className="w-full h-full max-w-5xl rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-[3px] border-black overflow-hidden flex flex-col transition-all duration-300 relative"
      >
        {/* Editor Header */}
        <div className="p-4 md:px-6 md:py-4 bg-white border-b-[3px] border-black flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            {/* Color Palette Selector */}
            <div className="relative group">
              <button 
                className="p-2 border-2 border-black bg-white hover:bg-black hover:text-white rounded-none cursor-pointer text-black"
                title="Change Note Color"
                style={{ boxShadow: '2px 2px 0px 0px #000' }}
              >
                <Palette className="w-5 h-5" />
              </button>
              <div className="absolute left-0 top-full mt-2 hidden group-hover:flex items-center gap-2 p-2 bg-white rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-black z-50">
                {NOTE_COLORS.map((nc) => (
                  <button
                    key={nc.value}
                    onClick={() => handleColorSelect(nc.value)}
                    style={{ backgroundColor: nc.value }}
                    title={nc.name}
                    className={`w-6 h-6 rounded-none border-2 border-black cursor-pointer hover:scale-110 transition-all ${
                      color === nc.value ? 'ring-2 ring-black ring-offset-1' : ''
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Category selection */}
            <div className="flex items-center gap-1.5 bg-white border-2 border-black px-3 py-1 rounded-none" style={{ boxShadow: '2px 2px 0px 0px #000' }}>
              <Tag className="w-3.5 h-3.5 text-black" />
              <select
                value={category}
                onChange={handleCategoryChange}
                className="bg-transparent text-xs font-black uppercase text-black focus:outline-none pr-1"
              >
                <option value="Uncategorized">UNCATEGORIZED</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Collaborator bubbles active in this note */}
          <div className="flex items-center gap-3 flex-wrap">
            {noteCollaborators.length > 0 && (
              <div className="flex items-center gap-1.5 bg-white border-2 border-black px-3 py-1 rounded-none" style={{ boxShadow: '2px 2px 0px 0px #000' }}>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-pulse absolute inline-flex h-full w-full bg-green-400"></span>
                  <span className="relative inline-flex h-2.5 w-2.5 bg-green-500 border border-black"></span>
                </span>
                <span className="font-black text-[10px] uppercase text-black">
                  {noteCollaborators.length} ACTIVE:
                </span>
                <div className="flex -space-x-1 items-center pl-1">
                  {noteCollaborators.map((c) => (
                    <div
                      key={c.id}
                      style={{ backgroundColor: c.color }}
                      title={`${c.name} is editing`}
                      className="w-6 h-6 border-2 border-black text-[10px] font-black text-white flex items-center justify-center uppercase"
                    >
                      {c.name.charAt(0)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* View switcher */}
            <div className="flex bg-white p-0.5 border-2 border-black rounded-none">
              <button
                onClick={() => setViewMode('edit')}
                className={`p-1.5 rounded-none text-xs font-black uppercase cursor-pointer flex items-center gap-1 transition-all ${
                  viewMode === 'edit' ? 'bg-black text-white' : 'text-black hover:bg-zinc-100'
                }`}
                title="Edit Markdown"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Write</span>
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={`p-1.5 rounded-none text-xs font-black uppercase cursor-pointer flex items-center gap-1 transition-all ${
                  viewMode === 'split' ? 'bg-black text-white' : 'text-black hover:bg-zinc-100'
                }`}
                title="Split Edit & Preview"
              >
                <Columns className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Split</span>
              </button>
              <button
                onClick={() => setViewMode('preview')}
                className={`p-1.5 rounded-none text-xs font-black uppercase cursor-pointer flex items-center gap-1 transition-all ${
                  viewMode === 'preview' ? 'bg-black text-white' : 'text-black hover:bg-zinc-100'
                }`}
                title="Read Mode"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Preview</span>
              </button>
            </div>

            {/* Copy Share Link */}
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 bg-white border-2 border-black hover:bg-black hover:text-white rounded-none transition-all cursor-pointer text-black flex items-center gap-1.5 text-xs font-black uppercase"
              title="Copy shareable link"
              style={{ boxShadow: '2px 2px 0px 0px #000' }}
            >
              {copied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'COPIED' : 'SHARE'}</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 border-2 border-black bg-white hover:bg-black hover:text-white text-black rounded-none transition-all cursor-pointer"
              title="Close Note"
              style={{ boxShadow: '2px 2px 0px 0px #000' }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Work Area */}
        <div className="flex-1 flex overflow-hidden p-6 gap-6">
          {/* Editor Side */}
          {(viewMode === 'edit' || viewMode === 'split') && (
            <div className="flex-1 flex flex-col min-w-0 bg-white rounded-none border-[3px] border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <input
                id={`editor-title-${note.id}`}
                type="text"
                placeholder="GIVE YOUR NOTE A TITLE..."
                value={title}
                onChange={handleTitleChange}
                className="w-full text-2xl font-black bg-transparent border-none text-black placeholder-zinc-400 focus:outline-none mb-4 py-1 uppercase tracking-tight"
              />
              <hr className="border-t-2 border-black mb-4" />
              <textarea
                ref={contentRef}
                placeholder="Start typing your note here... (Markdown tags like # Header, - list, **bold** are fully supported!)"
                value={content}
                onChange={handleContentChange}
                className="w-full flex-1 bg-transparent border-none text-black placeholder-zinc-400 focus:outline-none resize-none font-mono text-xs leading-relaxed"
              />
            </div>
          )}

          {/* Preview Side */}
          {(viewMode === 'preview' || viewMode === 'split') && (
            <div className="flex-1 flex flex-col min-w-0 bg-white rounded-none border-[3px] border-black p-6 overflow-y-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              {viewMode === 'split' && (
                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">
                  LIVE PREVIEW MODE
                </div>
              )}
              {/* Render simulated rendered titles */}
              {title && (
                <h1 className="text-3xl font-black text-black uppercase tracking-tight mb-4 border-b-2 border-black pb-2 leading-none italic">
                  {title}
                </h1>
              )}
              <div className="flex-1 font-mono">
                {renderMarkdown(content)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
