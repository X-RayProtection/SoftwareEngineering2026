require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from current directory
app.use(express.static(__dirname));

// Serve main.html at root (/)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'main.html'));
});

// MongoDB Connection (Serverless Optimized)
let cachedDb = null;

async function connectToDatabase() {
  if (mongoose.connection.readyState >= 1) {
    return;
  }
  
  if (cachedDb) return cachedDb;
  
  try {
    cachedDb = await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
  }
}

// 미들웨어로 DB 연결 보장 (모든 API 요청 전에 실행)
app.use(async (req, res, next) => {
  await connectToDatabase();
  next();
});

// Todo Schema & Model
const todoSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Todo = mongoose.model('Todo', todoSchema);

// --- REST API Routes ---

// 1. Get all todos
app.get('/api/todos', async (req, res) => {
  try {
    const todos = await Todo.find().sort({ createdAt: -1 }); // Newest first
    res.json(todos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. Add a new todo
app.post('/api/todos', async (req, res) => {
  const todo = new Todo({
    text: req.body.text
  });

  try {
    const newTodo = await todo.save();
    res.status(201).json(newTodo);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 3. Update (toggle) a todo
app.put('/api/todos/:id', async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id);
    if (!todo) return res.status(404).json({ message: 'Todo not found' });
    
    // Toggle completed status
    todo.completed = !todo.completed;
    const updatedTodo = await todo.save();
    res.json(updatedTodo);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 4. Delete a todo
app.delete('/api/todos/:id', async (req, res) => {
  try {
    const todo = await Todo.findByIdAndDelete(req.params.id);
    if (!todo) return res.status(404).json({ message: 'Todo not found' });
    res.json({ message: 'Todo deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Start Server (Only when testing locally, not on Vercel)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Local Server is running on http://localhost:${PORT}`);
  });
}

// Export for Vercel serverless
module.exports = app;
