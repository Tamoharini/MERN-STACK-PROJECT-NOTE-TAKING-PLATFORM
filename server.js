import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables
const dotenvResult = dotenv.config();

// MongoDB setup
const MONGO_URI = process.env.MONGO_URI;
let isMongoConnected = false;

if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => {
      console.log("Connected to MongoDB successfully!");
      isMongoConnected = true;
    })
    .catch((err) => {
      console.error("MongoDB connection error, falling back to local file DB:", err);
    });
} else {
  console.log("No MONGO_URI env var detected. Running in local fallback mode (file-based DB).");
  if (dotenvResult.error) {
    console.log("👉 Troubleshooting local .env file:");
    console.log("   - Check if you have created a file named precisely '.env' in your project root directory.");
    console.log("   - Ensure it is not named '.env.txt' or '.env.example'. Windows file explorer sometimes hides file extensions.");
  } else if (dotenvResult.parsed) {
    console.log("👉 Troubleshooting local .env file:");
    console.log("   - A .env file WAS found, but MONGO_URI is missing or empty inside it.");
    console.log("   - Please check your .env file and ensure it contains: MONGO_URI=\"your_connection_string\"");
  }
}

// Mongoose Schemas & Models
const NoteSchema = new mongoose.Schema({
  title: { type: String, default: "Untitled Note" },
  content: { type: String, default: "" },
  category: { type: String, default: "Uncategorized" },
  color: { type: String, default: "#FFFFFF" },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() },
  userId: { type: String, default: "anonymous" },
  lastEditedBy: { type: String }
});

const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  color: { type: String, default: "#6B7280" },
  icon: { type: String, default: "Tag" }
});

const MongoNote = mongoose.model("Note", NoteSchema);
const MongoCategory = mongoose.model("Category", CategorySchema);

// Ensure data directory exists for JSON DB fallback
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_FILE = path.join(DATA_DIR, "db.json");

const DEFAULT_CATEGORIES = [
  { id: "1", name: "Personal", color: "#EC4899", icon: "User" },
  { id: "2", name: "Work", color: "#3B82F6", icon: "Briefcase" },
  { id: "3", name: "Ideas", color: "#10B981", icon: "Lightbulb" },
  { id: "4", name: "Todo", color: "#F59E0B", icon: "CheckSquare" }
];

const DEFAULT_NOTES = [
  {
    id: "note-1",
    title: "Welcome to Infinite Notes 📝",
    content: "This is a real-time collaborative note-taking application! Feel free to edit this note, create new ones, and share the app URL to collaborate with others live. All updates sync instantly across open tabs.\n\n### Key Features:\n- 🚀 **Real-time collaboration**: Open this app in another window to see live cursors, typing indicators, and edits!\n- 🎨 **Organization**: Assign categories with custom colors.\n- 🔍 **Search**: Instantly filter notes by categories or content.\n- 💎 **Elegant UI**: High-contrast, human-centered design for focused work.",
    category: "Personal",
    color: "#FEF3C7", // amber
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: "system"
  },
  {
    id: "note-2",
    title: "Project Brainstorming 💡",
    content: "Brainstorming for the new web design project.\n\n- Focus on responsive layouts\n- Clean typography (Inter for body, Space Grotesk for headers)\n- Dark mode support\n- Fast loading times with Vite",
    category: "Ideas",
    color: "#E0F2FE", // sky
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: "system"
  },
  {
    id: "note-3",
    title: "Weekly Tasks 📋",
    content: "Tasks to complete before Friday:\n- [x] Read system design docs\n- [ ] Review PRs from team\n- [ ] Update client note on project timeline\n- [ ] Refactor editor logic to use standard event-based messaging",
    category: "Todo",
    color: "#D1FAE5", // emerald
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: "system"
  }
];

function readDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Error reading database:", err);
  }
  const defaultDB = { notes: DEFAULT_NOTES, categories: DEFAULT_CATEGORIES };
  writeDB(defaultDB);
  return defaultDB;
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing database:", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use(express.json());

  // REST API Routes
  app.get("/api/notes", async (req, res) => {
    if (isMongoConnected) {
      try {
        const notes = await MongoNote.find().sort({ updatedAt: -1 });
        // Format to make sure frontend gets "id" field instead of "_id"
        const formattedNotes = notes.map(n => ({
          id: n._id.toString(),
          title: n.title,
          content: n.content,
          category: n.category,
          color: n.color,
          createdAt: n.createdAt,
          updatedAt: n.updatedAt,
          userId: n.userId,
          lastEditedBy: n.lastEditedBy
        }));
        res.json(formattedNotes);
      } catch (err) {
        res.status(500).json({ error: "Failed to fetch notes from MongoDB" });
      }
    } else {
      const db = readDB();
      res.json(db.notes);
    }
  });

  app.post("/api/notes", async (req, res) => {
    const noteData = {
      title: req.body.title || "Untitled Note",
      content: req.body.content || "",
      category: req.body.category || "Uncategorized",
      color: req.body.color || "#FFFFFF",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: req.body.userId || "anonymous"
    };

    if (isMongoConnected) {
      try {
        const newNote = new MongoNote(noteData);
        const savedNote = await newNote.save();
        const formatted = {
          id: savedNote._id.toString(),
          ...noteData
        };
        // Broadcast creation to WS clients
        broadcast({ type: "note-created", payload: formatted });
        res.status(201).json(formatted);
      } catch (err) {
        res.status(500).json({ error: "Failed to create note in MongoDB" });
      }
    } else {
      const db = readDB();
      const newNote = {
        id: "note-" + Math.random().toString(36).substr(2, 9),
        ...noteData
      };
      db.notes.unshift(newNote);
      writeDB(db);
      
      // Broadcast creation to WS clients
      broadcast({ type: "note-created", payload: newNote });
      res.status(201).json(newNote);
    }
  });

  app.put("/api/notes/:id", async (req, res) => {
    const updateFields = {
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    delete updateFields.id; // Avoid attempting to update Mongo _id field

    if (isMongoConnected) {
      try {
        const updated = await MongoNote.findByIdAndUpdate(
          req.params.id,
          { $set: updateFields },
          { new: true }
        );
        if (!updated) {
          res.status(404).json({ error: "Note not found" });
          return;
        }
        const formatted = {
          id: updated._id.toString(),
          title: updated.title,
          content: updated.content,
          category: updated.category,
          color: updated.color,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
          userId: updated.userId,
          lastEditedBy: updated.lastEditedBy
        };
        // Broadcast update to WS clients
        broadcast({ type: "note-updated", payload: formatted }, req.body.senderWsId);
        res.json(formatted);
      } catch (err) {
        res.status(500).json({ error: "Failed to update note in MongoDB" });
      }
    } else {
      const db = readDB();
      const index = db.notes.findIndex(n => n.id === req.params.id);
      if (index === -1) {
        res.status(404).json({ error: "Note not found" });
        return;
      }
      
      const updatedNote = {
        ...db.notes[index],
        ...req.body,
        updatedAt: new Date().toISOString()
      };
      db.notes[index] = updatedNote;
      writeDB(db);
      
      // Broadcast update to WS clients
      broadcast({ type: "note-updated", payload: updatedNote }, req.body.senderWsId);
      res.json(updatedNote);
    }
  });

  app.delete("/api/notes/:id", async (req, res) => {
    if (isMongoConnected) {
      try {
        const deleted = await MongoNote.findByIdAndDelete(req.params.id);
        if (!deleted) {
          res.status(404).json({ error: "Note not found" });
          return;
        }
        // Broadcast deletion to WS clients
        broadcast({ type: "note-deleted", payload: { id: req.params.id } });
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: "Failed to delete note in MongoDB" });
      }
    } else {
      const db = readDB();
      const index = db.notes.findIndex(n => n.id === req.params.id);
      if (index === -1) {
        res.status(404).json({ error: "Note not found" });
        return;
      }
      db.notes.splice(index, 1);
      writeDB(db);
      
      // Broadcast deletion to WS clients
      broadcast({ type: "note-deleted", payload: { id: req.params.id } });
      res.json({ success: true });
    }
  });

  // Category endpoints
  app.get("/api/categories", async (req, res) => {
    if (isMongoConnected) {
      try {
        const categories = await MongoCategory.find();
        if (categories.length === 0) {
          // Initialize categories if empty
          const inserted = await MongoCategory.insertMany(DEFAULT_CATEGORIES.map(c => ({
            name: c.name,
            color: c.color,
            icon: c.icon
          })));
          res.json(inserted.map(c => ({
            id: c._id.toString(),
            name: c.name,
            color: c.color,
            icon: c.icon
          })));
        } else {
          res.json(categories.map(c => ({
            id: c._id.toString(),
            name: c.name,
            color: c.color,
            icon: c.icon
          })));
        }
      } catch (err) {
        res.status(500).json({ error: "Failed to fetch categories" });
      }
    } else {
      const db = readDB();
      res.json(db.categories);
    }
  });

  app.post("/api/categories", async (req, res) => {
    const catData = {
      name: req.body.name,
      color: req.body.color || "#6B7280",
      icon: req.body.icon || "Tag"
    };

    if (isMongoConnected) {
      try {
        const newCategory = new MongoCategory(catData);
        const saved = await newCategory.save();
        res.status(201).json({
          id: saved._id.toString(),
          ...catData
        });
      } catch (err) {
        res.status(500).json({ error: "Failed to create category" });
      }
    } else {
      const db = readDB();
      const newCategory = {
        id: "cat-" + Math.random().toString(36).substr(2, 9),
        ...catData
      };
      db.categories.push(newCategory);
      writeDB(db);
      res.status(201).json(newCategory);
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    if (isMongoConnected) {
      try {
        const deleted = await MongoCategory.findByIdAndDelete(req.params.id);
        if (!deleted) {
          res.status(404).json({ error: "Category not found" });
          return;
        }
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: "Failed to delete category" });
      }
    } else {
      const db = readDB();
      const index = db.categories.findIndex(c => c.id === req.params.id);
      if (index === -1) {
        res.status(404).json({ error: "Category not found" });
        return;
      }
      db.categories.splice(index, 1);
      writeDB(db);
      res.json({ success: true });
    }
  });

  // Create standard HTTP server
  const server = http.createServer(app);

  // Setup WebSocket Server on the same server
  const wss = new WebSocketServer({ noServer: true });

  const clients = new Map();

  function getCollaboratorsList() {
    const users = [];
    clients.forEach((client, id) => {
      users.push({
        id,
        name: client.userName || "Collaborator",
        color: client.userColor || "#6B7280",
        activeNoteId: client.activeNoteId,
        cursorOffset: client.cursorOffset
      });
    });
    return users;
  }

  function broadcast(message, excludeId) {
    const payloadStr = JSON.stringify(message);
    clients.forEach((client, id) => {
      if (id !== excludeId && client.readyState === WebSocket.OPEN) {
        client.send(payloadStr);
      }
    });
  }

  wss.on("connection", (ws) => {
    const clientId = "client-" + Math.random().toString(36).substr(2, 9);
    ws.userName = "Anonymous User";
    ws.userColor = "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    clients.set(clientId, ws);

    // Send initial client info
    ws.send(JSON.stringify({
      type: "init",
      payload: {
        id: clientId,
        name: ws.userName,
        color: ws.userColor,
        users: getCollaboratorsList()
      }
    }));

    // Broadcast updated users list
    broadcast({
      type: "users-list",
      payload: getCollaboratorsList()
    });

    ws.on("message", (rawMessage) => {
      try {
        const message = JSON.parse(rawMessage.toString());
        
        switch (message.type) {
          case "join":
            ws.userName = message.payload.name || ws.userName;
            ws.userColor = message.payload.color || ws.userColor;
            ws.activeNoteId = message.payload.activeNoteId !== undefined ? message.payload.activeNoteId : ws.activeNoteId;
            broadcast({
              type: "users-list",
              payload: getCollaboratorsList()
            });
            break;
            
          case "cursor-moved":
            ws.cursorOffset = message.payload.cursorOffset;
            ws.activeNoteId = message.payload.activeNoteId;
            broadcast({
              type: "cursor-moved",
              payload: {
                userId: clientId,
                name: ws.userName,
                color: ws.userColor,
                activeNoteId: ws.activeNoteId,
                cursorOffset: ws.cursorOffset
              }
            }, clientId);
            break;

          case "note-updated":
            // Note edit via WebSocket
            if (isMongoConnected) {
              MongoNote.findByIdAndUpdate(
                message.payload.id,
                { $set: { content: message.payload.content, updatedAt: new Date().toISOString(), lastEditedBy: ws.userName } },
                { new: true }
              ).then((updated) => {
                if (updated) {
                  const formatted = {
                    id: updated._id.toString(),
                    title: updated.title,
                    content: updated.content,
                    category: updated.category,
                    color: updated.color,
                    createdAt: updated.createdAt,
                    updatedAt: updated.updatedAt,
                    userId: updated.userId,
                    lastEditedBy: updated.lastEditedBy
                  };
                  broadcast({
                    type: "note-updated",
                    payload: formatted
                  }, clientId);
                }
              }).catch(err => {
                console.error("Mongoose websocket note update error:", err);
              });
            } else {
              const db = readDB();
              const index = db.notes.findIndex(n => n.id === message.payload.id);
              if (index !== -1) {
                const updatedNote = {
                  ...db.notes[index],
                  ...message.payload,
                  updatedAt: new Date().toISOString(),
                  lastEditedBy: ws.userName
                };
                db.notes[index] = updatedNote;
                writeDB(db);
                
                broadcast({
                  type: "note-updated",
                  payload: updatedNote
                }, clientId);
              }
            }
            break;
        }
      } catch (err) {
        console.error("Failed to process WebSocket message:", err);
      }
    });

    ws.on("close", () => {
      clients.delete(clientId);
      broadcast({
        type: "users-list",
        payload: getCollaboratorsList()
      });
    });
  });

  // Handle server upgrade for WS on port 3000
  server.on("upgrade", (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  // Integrate Vite Dev Server Middleware or Static Build Delivery
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    // Explicit HTML fallback in dev to ensure index.html is served transformed by Vite
    app.get("*", async (req, res, next) => {
      if (req.originalUrl.startsWith("/api")) return next();
      try {
        const html = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
        const transformedHtml = await vite.transformIndexHtml(req.originalUrl, html);
        res.status(200).set({ "Content-Type": "text/html" }).end(transformedHtml);
      } catch (err) {
        next(err);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Note-Taking MERN Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
