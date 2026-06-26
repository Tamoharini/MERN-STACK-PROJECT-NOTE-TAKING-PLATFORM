import React from 'react';
import { Trash2, Calendar, FileText, User } from 'lucide-react';

export default function NoteCard({
  note,
  categories,
  activeCollaborators,
  onSelect,
  onDelete
}) {
  // Find category metadata
  const catObj = categories.find(c => c.name === note.category || c.id === note.category);

  // Format date elegantly
  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Recent';
    }
  };

  // Truncate content for preview
  const getPreview = (text) => {
    if (!text) return 'Empty note...';
    const cleanText = text.replace(/[#*`_\[\]]/g, ''); // strip markdown chars
    return cleanText.length > 140 ? cleanText.substring(0, 140) + '...' : cleanText;
  };

  return (
    <div
      onClick={() => onSelect(note.id)}
      id={`note-card-${note.id}`}
      style={{ backgroundColor: note.color || '#FFFFFF' }}
      className="group relative border-[3px] border-black rounded-none p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all cursor-pointer flex flex-col justify-between min-h-[190px] bg-white"
    >
      <div className="space-y-4">
        {/* Category & Collaborators Tag */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {catObj ? (
            <span
              className="inline-flex items-center px-2.5 py-0.5 border-2 border-black font-black text-[9px] uppercase tracking-wider text-black bg-white"
              style={{ boxShadow: '2px 2px 0px 0px #000' }}
            >
              {catObj.name}
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 border-2 border-black font-black text-[9px] uppercase tracking-wider text-black bg-zinc-100">
              {note.category || 'General'}
            </span>
          )}

          {/* Real-time active collaborators indicators on this specific note! */}
          {activeCollaborators.length > 0 && (
            <div className="flex -space-x-1 items-center" title={`${activeCollaborators.length} active on this note`}>
              <span className="w-2.5 h-2.5 bg-green-400 border border-black rounded-full animate-pulse mr-1.5" />
              {activeCollaborators.map((user) => (
                <div
                  key={user.id}
                  style={{ backgroundColor: user.color }}
                  className="w-6 h-6 border-2 border-black text-[10px] font-black text-white flex items-center justify-center uppercase shadow-sm"
                  title={`${user.name} is reading/editing`}
                >
                  {user.name.charAt(0)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Note Title */}
        <h4 className="font-black text-xl text-black leading-tight uppercase tracking-tight group-hover:underline decoration-3 decoration-black underline-offset-2">
          {note.title || 'Untitled Note'}
        </h4>

        {/* Note Content Preview */}
        <p className="text-zinc-800 text-xs font-medium leading-relaxed line-clamp-3 whitespace-pre-wrap">
          {getPreview(note.content)}
        </p>
      </div>

      {/* Note Footer */}
      <div className="mt-5 pt-3 border-t-2 border-black flex items-center justify-between text-[10px] font-black uppercase text-zinc-500">
        <div className="flex items-center gap-1 text-black">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formatDate(note.updatedAt)}</span>
        </div>

        {note.lastEditedBy && (
          <div className="flex items-center gap-1 text-black bg-[#00D1FF] px-1.5 py-0.5 border-2 border-black max-w-[110px] truncate" style={{ boxShadow: '1.5px 1.5px 0px 0px #000' }}>
            <span className="truncate" title={`Last edited by ${note.lastEditedBy}`}>
              ED: {note.lastEditedBy}
            </span>
          </div>
        )}

        {/* Delete button (hidden by default, shows on hover) */}
        <button
          onClick={(e) => onDelete(e, note.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-black hover:text-white border-2 border-transparent hover:border-black rounded-none cursor-pointer text-black"
          title="Delete Note"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
