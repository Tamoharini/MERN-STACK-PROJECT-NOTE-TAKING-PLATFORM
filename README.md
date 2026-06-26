# 📝 Collaborative Note-Taking Web Application

A modern, real-time, full-stack collaborative note-taking application. This platform enables teams and individuals to create, organize, search, and co-edit notes simultaneously in real-time, backed by a Node.js/Express server and MongoDB.

---

## ✨ Features

- **👥 Real-Time Collaboration**: Edit notes concurrently with other users. Live cursors/presence indicators show who is currently editing.
- **📂 Categorized Organization**: Organize notes into custom folders or tags. Easily create and delete categories on the fly.
- **⚡ Collaborative Presence**: Interactive sidebar showing online contributors with custom avatars and profile colors.
- **✏️ Interactive Note Editor**: Rich workspace featuring title adjustments, body content editing, category tags, and responsive save states.
- **🔒 Safe Storage Adapter**: Resilient localStorage management wrapped to gracefully avoid permissions or sandbox iframe blockages in restricted environments.
- **🔌 Offline/Online Sync State**: Real-time indicators of connection quality (online/offline visual markers) powered by WebSockets.
- **🎨 Modern Visuals**: High-contrast, polished interface built with Tailwind CSS, utilizing clean typography, elegant shadows, and smooth motion transitions.

---

## 🛠️ Architecture & Tech Stack

### Frontend
- **Framework**: React 19 (Single Page Application)
- **Bundler**: Vite
- **Styling**: Tailwind CSS & Modern CSS Variable themes
- **Icons**: Lucide React
- **Animations**: Motion (`motion/react`)

### Backend
- **Server**: Node.js & Express
- **Real-Time Communication**: WebSocket Protocol (`ws`)
- **Database ORM**: Mongoose / MongoDB (supports full persistence with an automated fallback system)

---

## 📁 File Structure

```text
├── assets/                  # Public static assets & images
├── data/                    # Local storage fallback directory
├── src/
│   ├── components/
│   │   ├── CategoryList.jsx     # Side navigation and categories list
│   │   ├── NoteCard.jsx         # Card component for note summaries
│   │   ├── NoteEditor.jsx       # Workspace editor for real-time co-authoring
│   │   ├── UserProfileModal.jsx # Avatar & username customization modal
│   │   └── Collaborators.jsx    # Live list of online contributors
│   ├── App.jsx              # Core client dashboard, network sync, & state controller
│   ├── index.css            # Tailwind theme configurations and custom global transitions
│   └── main.jsx             # React client entry point
├── server.js                # Express REST API, HTTP & WebSocket server instance
├── vite.config.js           # Vite development and build settings
├── package.json             # App dependencies and run scripts
└── README.md                # Project documentation
