import React from 'react';
import { Users, Settings, Circle, MessageSquare } from 'lucide-react';

export default function Collaborators({
  users,
  notes,
  currentUserId,
  onOpenSettings
}) {
  // Find which notes people are active in
  const getNoteTitle = (noteId) => {
    if (!noteId) return null;
    const found = notes.find(n => n.id === noteId);
    return found ? found.title : 'a note';
  };

  return (
    <div className="bg-[#F8F8F8] rounded-none border-[3px] border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4" id="collaborators-sidebar-panel">
      <div className="flex items-center justify-between pb-2 border-b-2 border-black">
        <div className="flex items-center gap-2 text-black">
          <Users className="w-4.5 h-4.5 text-black" />
          <h3 className="font-black text-xs uppercase tracking-wider">COLLABORATORS</h3>
        </div>
        
        {/* Profile Settings Config */}
        <button
          onClick={onOpenSettings}
          className="p-1 border-2 border-transparent hover:border-black hover:bg-white text-black rounded-none cursor-pointer transition-colors"
          title="Change Profile Settings"
          id="profile-settings-btn"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1" id="collaborators-list-container">
        {users.length === 0 ? (
          <div className="text-[10px] text-zinc-500 text-center py-4 font-bold uppercase tracking-wider">
            CONNECTING TO ROOM...
          </div>
        ) : (
          users.map((u) => {
            const isMe = u.id === currentUserId;
            const activeNoteTitle = getNoteTitle(u.activeNoteId);
            
            return (
              <div
                key={u.id}
                className="flex items-start gap-2.5 p-2 bg-white border-2 border-black rounded-none text-xs"
                style={{ boxShadow: '2px 2px 0px 0px #000' }}
              >
                {/* Avatar with dot */}
                <div className="relative shrink-0 mt-0.5">
                  <div
                    style={{ backgroundColor: u.color }}
                    className="w-8 h-8 rounded-none text-white font-black uppercase flex items-center justify-center border-2 border-black"
                  >
                    {u.name.charAt(0)}
                  </div>
                  <span className="absolute -bottom-1 -right-1 block h-2.5 w-2.5 rounded-none border border-black bg-green-400" />
                </div>

                {/* User details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black uppercase tracking-tight text-black truncate">
                      {u.name}
                    </span>
                    {isMe && (
                      <span className="px-1.5 py-0.2 bg-black text-[8px] font-black uppercase tracking-wider text-white">
                        YOU
                      </span>
                    )}
                  </div>
                  
                  {/* Active document indicator */}
                  {u.activeNoteId ? (
                    <p className="text-[10px] text-black font-medium mt-0.5 truncate">
                      📖 VIEWING <span className="font-bold underline decoration-black decoration-1">"{activeNoteTitle}"</span>
                    </p>
                  ) : (
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
                      DASHBOARD
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Helpful Hint */}
      <div className="bg-white p-3 border-2 border-black rounded-none text-[10px] font-bold uppercase text-zinc-600 flex items-start gap-2 leading-tight shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        <MessageSquare className="w-3.5 h-3.5 text-black shrink-0 mt-0.5" />
        <p>
          OPEN THIS APP IN <strong className="text-black underline decoration-black underline-offset-2">ANOTHER TAB</strong> OR SHARE THE NOTE URL TO START LIVE SYNC!
        </p>
      </div>
    </div>
  );
}
