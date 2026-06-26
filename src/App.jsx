import React, { useState, useEffect, useRef, useMemo } from 'react';
import NoteCard from './components/NoteCard.jsx';
import NoteEditor from './components/NoteEditor.jsx';
import CategoryList from './components/CategoryList.jsx';
import Collaborators from './components/Collaborators.jsx';
import UserProfileModal from './components/UserProfileModal.jsx';
import { 
  Plus, Search, Grid, List, ArrowUpDown, Sparkles, 
  Wifi, WifiOff, FileText, User, PlusCircle, HelpCircle
} from 'lucide-react';

// A safe wrapper for localStorage to prevent security/access exceptions in sandbox iframes or private browsing
const safeStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('localStorage getItem blocked or unavailable:', e);
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('localStorage setItem blocked or unavailable:', e);
    }
  }
};

export default function App() {
  // Application Data States
  const [notes, setNotes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  
  // UX Filters / Layouts States
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('updated');
  const [viewLayout, setViewLayout] = useState('grid');
  
  // Selected note for editing modal
  const [selectedNoteId, setSelectedNoteId] = useState(null);

  // User details
  const [currentUser, setCurrentUser] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Collaboration States
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);

  // Load User profile from localStorage or generate defaults on startup
  useEffect(() => {
    const savedName = safeStorage.getItem('notes_user_name');
    const savedColor = safeStorage.getItem('notes_user_color');
    
    if (savedName && savedColor) {
      setCurrentUser({
        id: 'client-' + Math.random().toString(36).substr(2, 9), // ephemeral ID for session
        name: savedName,
        color: savedColor
      });
    } else {
      // Auto-generate a fun default name and color
      const names = [
        'Creative Owl', 'Fast Cheetah', 'Wise Penguin', 'Curious Koala', 
        'Bright Panda', 'Silent Tiger', 'Mindful Gazelle', 'Happy Fox'
      ];
      const colors = ['#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];
      const defaultUser = {
        id: 'client-' + Math.random().toString(36).substr(2, 9),
        name: names[Math.floor(Math.random() * names.length)],
        color: colors[Math.floor(Math.random() * colors.length)]
      };
      
      setCurrentUser(defaultUser);
      setShowProfileModal(true); // Open settings to let them customize immediately if they want
    }
  }, []);

  // Fetch Notes & Categories on Boot
  useEffect(() => {
    fetchNotes();
    fetchCategories();
  }, []);

  const fetchNotes = async () => {
    try {
      const res = await fetch('/api/notes');
      if (res.ok) {
        const data = await res.json();
        setNotes(data);
      }
    } catch (err) {
      console.error('Failed to load notes:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  // Check URL query parameters for collaborative shared note links (?noteId=xxxx)
  useEffect(() => {
    if (notes.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const sharedNoteId = params.get('noteId');
      if (sharedNoteId && notes.some(n => n.id === sharedNoteId)) {
        setSelectedNoteId(sharedNoteId);
        // Clear query param to avoid repeat popups
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [notes]);

  // Connect WebSockets for Real-Time Collaboration
  useEffect(() => {
    if (!currentUser) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    const connectWS = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        // Send initial details
        ws.send(JSON.stringify({
          type: 'join',
          payload: {
            name: currentUser.name,
            color: currentUser.color,
            activeNoteId: selectedNoteId
          }
        }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          switch (msg.type) {
            case 'init':
              // Setup user ID assigned by server
              if (msg.payload.users) {
                setOnlineUsers(msg.payload.users);
              }
              break;
            case 'users-list':
              setOnlineUsers(msg.payload);
              break;
            case 'note-created':
              setNotes(prev => {
                if (prev.some(n => n.id === msg.payload.id)) return prev;
                return [msg.payload, ...prev];
              });
              break;
            case 'note-updated':
              setNotes(prev => prev.map(n => n.id === msg.payload.id ? msg.payload : n));
              break;
            case 'note-deleted':
              setNotes(prev => prev.filter(n => n.id !== msg.payload.id));
              if (selectedNoteId === msg.payload.id) {
                setSelectedNoteId(null);
                alert('The note you were editing was deleted by another collaborator.');
              }
              break;
          }
        } catch (err) {
          console.error('WS parse error:', err);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        // Auto-reconnect after 3 seconds
        setTimeout(connectWS, 3000);
      };

      ws.onerror = (err) => {
        console.error('WS Error:', err);
        ws.close();
      };
    };

    connectWS();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [currentUser]);

  // Notify WebSocket server when active note changes
  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && currentUser) {
      wsRef.current.send(JSON.stringify({
        type: 'join',
        payload: {
          name: currentUser.name,
          color: currentUser.color,
          activeNoteId: selectedNoteId
        }
      }));
    }
  }, [selectedNoteId]);

  // Save/Update user profile details
  const handleSaveProfile = (name, color) => {
    safeStorage.setItem('notes_user_name', name);
    safeStorage.setItem('notes_user_color', color);
    
    if (currentUser) {
      const updatedUser = { ...currentUser, name, color };
      setCurrentUser(updatedUser);
      
      // Update WS state
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'join',
          payload: { name, color, activeNoteId: selectedNoteId }
        }));
      }
    }
  };

  // Create Note
  const handleCreateNote = async () => {
    try {
      const categoryName = selectedCategoryId 
        ? categories.find(c => c.id === selectedCategoryId)?.name || 'Personal'
        : 'Personal';

      const defaultColors = ['#E8F5FE', '#FFF8E7', '#EDF9F4', '#F2EFFE', '#FFF0EA'];
      const chosenColor = defaultColors[Math.floor(Math.random() * defaultColors.length)];

      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Collaborative Note',
          content: 'Start writing your collaborative thoughts here...',
          category: categoryName,
          color: chosenColor,
          userId: currentUser?.id || 'anonymous'
        })
      });

      if (res.ok) {
        const newNote = await res.json();
        setNotes(prev => [newNote, ...prev]);
        setSelectedNoteId(newNote.id); // open editor immediately
      }
    } catch (err) {
      console.error('Failed to create note:', err);
    }
  };

  // Update / Save Note Changes
  const handleUpdateNote = async (updatedFields) => {
    if (!updatedFields.id) return;
    
    // Optimistic Update
    setNotes(prev => prev.map(n => n.id === updatedFields.id ? { ...n, ...updatedFields, updatedAt: new Date().toISOString() } : n));

    // Send update via REST API (which saves and triggers broadcasts)
    try {
      await fetch(`/api/notes/${updatedFields.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updatedFields,
          senderWsId: currentUser?.id
        })
      });
    } catch (err) {
      console.error('Failed to save note update:', err);
    }
  };

  // Delete Note
  const handleDeleteNote = async (e, noteId) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this note? This action is instant and affects all collaborators.')) return;
    
    // Optimistic local update
    setNotes(prev => prev.filter(n => n.id !== noteId));
    if (selectedNoteId === noteId) {
      setSelectedNoteId(null);
    }

    try {
      await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  // Create Category
  const handleCreateCategory = async (name, color) => {
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color })
      });
      if (res.ok) {
        const newCat = await res.json();
        setCategories(prev => [...prev, newCat]);
      }
    } catch (err) {
      console.error('Failed to create category:', err);
    }
  };

  // Delete Category
  const handleDeleteCategory = async (catId) => {
    const catName = categories.find(c => c.id === catId)?.name;
    if (!catName) return;

    if (!confirm(`Are you sure you want to delete "${catName}"? Notes belonging to this category will become general notes.`)) return;

    try {
      const res = await fetch(`/api/categories/${catId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setCategories(prev => prev.filter(c => c.id !== catId));
        // Reset filter if deleting the filtered category
        if (selectedCategoryId === catId) {
          setSelectedCategoryId(null);
        }
        // Update all notes locally matching that category to uncategorized
        setNotes(prev => prev.map(n => n.category === catName ? { ...n, category: 'Uncategorized' } : n));
      }
    } catch (err) {
      console.error('Failed to delete category:', err);
    }
  };

  // Filter notes based on active category and search filter
  const filteredNotes = useMemo(() => {
    let result = [...notes];

    // Filter by Category
    if (selectedCategoryId !== null) {
      const catName = categories.find(c => c.id === selectedCategoryId)?.name;
      if (catName) {
        result = result.filter(n => n.category === catName);
      }
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        n => n.title.toLowerCase().includes(query) || 
             n.content.toLowerCase().includes(query) || 
             n.category.toLowerCase().includes(query)
      );
    }

    // Sort Notes
    result.sort((a, b) => {
      if (sortBy === 'created') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      // default: updated
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return result;
  }, [notes, selectedCategoryId, categories, searchQuery, sortBy]);

  // Active note object
  const activeNote = notes.find(n => n.id === selectedNoteId);

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans" id="app-root">
      {/* Top Navbar Header */}
      <header className="h-20 bg-white border-b-[3px] border-black sticky top-0 z-30 px-6 py-0 flex items-center justify-between gap-4">
        {/* Logo and Connection Indicator */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-black border-2 border-black flex items-center justify-center text-white font-black text-xl italic tracking-tighter">
            IN
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tighter uppercase italic text-black">
                NOTE(S)
              </h1>
              {connected ? (
                <span className="inline-flex items-center px-2 py-0.5 border-2 border-black bg-white text-[9px] font-black uppercase tracking-wider text-black gap-1" style={{ boxShadow: '1.5px 1.5px 0px 0px #000' }}>
                  <span className="w-2 h-2 rounded-full bg-green-500 border border-black" /> LIVE
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 border-2 border-black bg-zinc-100 text-[9px] font-black uppercase tracking-wider text-black gap-1" style={{ boxShadow: '1.5px 1.5px 0px 0px #000' }}>
                  <span className="w-2 h-2 rounded-full bg-red-500 border border-black animate-pulse" /> OFFLINE
                </span>
              )}
            </div>
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">COLLABORATIVE ROOM</p>
          </div>
        </div>

        {/* Global Search */}
        <div className="flex-1 max-w-md relative hidden sm:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
          <input
            type="text"
            placeholder="SEARCH ENTRIES..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs font-bold uppercase rounded-none border-2 border-black bg-white focus:outline-none focus:ring-0 placeholder-zinc-400 transition-all"
          />
        </div>

        {/* Action Controls & Settings */}
        <div className="flex items-center gap-3">
          {currentUser && (
            <button
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 border-2 border-black bg-white hover:bg-zinc-50 rounded-none transition-all cursor-pointer"
              title="Configure My Profile"
              style={{ boxShadow: '2px 2px 0px 0px #000' }}
            >
              <div
                style={{ backgroundColor: currentUser.color }}
                className="w-6 h-6 border border-black text-[10px] font-black text-white flex items-center justify-center uppercase"
              >
                {currentUser.name.charAt(0)}
              </div>
              <span className="text-xs font-black uppercase tracking-tight text-black hidden md:inline">
                {currentUser.name}
              </span>
            </button>
          )}

          <button
            onClick={handleCreateNote}
            className="px-5 py-2.5 bg-black hover:bg-zinc-800 text-white border-2 border-black rounded-none text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>NEW NOTE</span>
          </button>
        </div>
      </header>

      {/* Main Container Grid */}
      <div className="flex-1 flex flex-col md:flex-row p-6 gap-6 max-w-7xl w-full mx-auto">
        {/* Left Sidebar Layout */}
        <aside className="w-full md:w-60 shrink-0 space-y-6">
          {/* Categories Manager Panel */}
          <div className="bg-[#F8F8F8] rounded-none border-[3px] border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <CategoryList
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={setSelectedCategoryId}
              onCreateCategory={handleCreateCategory}
              onDeleteCategory={handleDeleteCategory}
            />
          </div>

          {/* Collaborators Active presence */}
          <Collaborators
            users={onlineUsers}
            notes={notes}
            currentUserId={currentUser?.id || ''}
            onOpenSettings={() => setShowProfileModal(true)}
          />
        </aside>

        {/* Content Board Dashboard */}
        <main className="flex-1 flex flex-col gap-6">
          {/* Controls Bar */}
          <div className="bg-[#F0F0F0] rounded-none border-[3px] border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black uppercase tracking-tight text-black">
                {selectedCategoryId === null 
                  ? 'All Documents' 
                  : categories.find(c => c.id === selectedCategoryId)?.name || 'Categorized Documents'}
              </h2>
              <span className="text-[10px] font-black uppercase text-black bg-white px-2.5 py-0.5 border border-black">
                {filteredNotes.length} notes
              </span>
            </div>

            {/* Sorting, Filtering, and layout toggle */}
            <div className="flex items-center gap-4 flex-wrap">
              {/* Search query input for mobile */}
              <div className="relative sm:hidden w-full max-w-[200px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black" />
                <input
                  type="text"
                  placeholder="SEARCH..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs font-bold uppercase rounded-none border-2 border-black bg-white focus:outline-none focus:ring-0"
                />
              </div>

              {/* Sort selector */}
              <div className="flex items-center gap-1.5 text-xs font-black uppercase text-black">
                <ArrowUpDown className="w-3.5 h-3.5 text-black" />
                <span>Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="font-black text-black underline underline-offset-2 decoration-2 bg-transparent focus:outline-none cursor-pointer uppercase"
                >
                  <option value="updated">Last Updated</option>
                  <option value="created">Date Created</option>
                  <option value="title">Alphabetical</option>
                </select>
              </div>

              {/* Grid / List Toggles */}
              <div className="flex bg-white p-0.5 border-2 border-black rounded-none">
                <button
                  onClick={() => setViewLayout('grid')}
                  className={`p-1.5 rounded-none transition-all cursor-pointer ${
                    viewLayout === 'grid' ? 'bg-black text-white' : 'text-black hover:bg-zinc-100'
                  }`}
                  title="Grid View"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewLayout('list')}
                  className={`p-1.5 rounded-none transition-all cursor-pointer ${
                    viewLayout === 'list' ? 'bg-black text-white' : 'text-black hover:bg-zinc-100'
                  }`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Notes Workspace */}
          {filteredNotes.length === 0 ? (
            <div className="flex-1 min-h-[320px] flex flex-col items-center justify-center p-8 bg-white border-[3px] border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center">
              <div className="w-16 h-16 rounded-none bg-[#FFFC00] border-[3px] border-black flex items-center justify-center text-black mb-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="font-black text-2xl uppercase tracking-tighter">No notes found</h3>
              <p className="text-xs font-medium text-zinc-500 max-w-sm mt-2 leading-relaxed">
                {searchQuery 
                  ? "WE COULD NOT FIND ANY ENTRIES MATCHING YOUR QUERY. TRY CHANGING THE SEARCH KEYS."
                  : "START CREATING RAW COLLABORATIVE IDEAS BY INVITING PEERS AND ASSOCIATES TO WORK WITH YOU LIVE."}
              </p>
              {!searchQuery && (
                <button
                  onClick={handleCreateNote}
                  className="mt-6 px-5 py-3 bg-black hover:bg-zinc-800 text-white border-2 border-black rounded-none text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                >
                  Create your first note
                </button>
              )}
            </div>
          ) : (
            <div
              className={`transition-all duration-300 ${
                viewLayout === 'grid' 
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6' 
                  : 'flex flex-col gap-4'
              }`}
            >
              {filteredNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  categories={categories}
                  activeCollaborators={onlineUsers.filter(u => u.activeNoteId === note.id)}
                  onSelect={setSelectedNoteId}
                  onDelete={handleDeleteNote}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Popups & Modals */}
      {showProfileModal && currentUser && (
        <UserProfileModal
          currentName={currentUser.name}
          currentColor={currentUser.color}
          onSave={handleSaveProfile}
          onClose={() => setShowProfileModal(false)}
          isInitial={safeStorage.getItem('notes_user_name') === null}
        />
      )}

      {/* Note Editor Drawer / Modal */}
      {activeNote && (
        <NoteEditor
          note={activeNote}
          categories={categories}
          collaborators={onlineUsers}
          currentUser={currentUser || { id: 'anon', name: 'Anonymous', color: '#6B7280' }}
          onSave={handleUpdateNote}
          onClose={() => setSelectedNoteId(null)}
          onLocalEdit={(content) => {
            // Broadcast live typing content updates to all WebSocket clients instantly
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({
                type: 'note-updated',
                payload: { id: activeNote.id, content }
              }));
            }
          }}
        />
      )}
    </div>
  );
}
