require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// ---------- Models ----------
const User = mongoose.model('User', new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true }
}));

const Task = mongoose.model('Task', new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  title: { type: String, required: true, trim: true, maxlength: 80 },
  desc: { type: String, default: '', maxlength: 300 },
  pri: { type: String, enum: ['high', 'med', 'low'], default: 'med' },
  status: { type: String, enum: ['todo', 'prog', 'done'], default: 'todo' },
  due: { type: String, default: '' }
}, { timestamps: true }));

const taskOut = t => ({ id: t._id, title: t.title, desc: t.desc, pri: t.pri, status: t.status, due: t.due });
const pick = b => {
  const o = {};
  for (const k of ['title', 'desc', 'pri', 'status', 'due']) if (b[k] !== undefined) o[k] = b[k];
  return o;
};
const wrap = fn => (req, res) => fn(req, res).catch(e => {
  console.error(e);
  res.status(e.name === 'ValidationError' || e.name === 'CastError' ? 400 : 500)
     .json({ error: e.name === 'ValidationError' ? 'Please check the task fields.' : 'Server error. Try again.' });
});

// ---------- Auth ----------
const sign = u => jwt.sign({ id: u._id }, SECRET, { expiresIn: '7d' });
const userOut = u => ({ id: u._id, name: u.name, email: u.email });

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  try {
    req.userId = jwt.verify(h.replace('Bearer ', ''), SECRET).id;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Please sign in again.' });
  }
}

app.post('/api/auth/register', wrap(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !/^\S+@\S+\.\S+$/.test(email || '')) return res.status(400).json({ error: 'Enter your name and a valid email.' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ error: 'This email is already registered. Sign in instead.' });
  const u = await User.create({ name, email, password: await bcrypt.hash(password, 10) });
  res.status(201).json({ token: sign(u), user: userOut(u) });
}));

app.post('/api/auth/login', wrap(async (req, res) => {
  const { email, password } = req.body;
  const u = await User.findOne({ email: (email || '').toLowerCase() });
  if (!u || !(await bcrypt.compare(password || '', u.password))) return res.status(400).json({ error: 'Email or password is incorrect.' });
  res.json({ token: sign(u), user: userOut(u) });
}));

app.get('/api/auth/me', auth, wrap(async (req, res) => {
  const u = await User.findById(req.userId);
  if (!u) return res.status(401).json({ error: 'Please sign in again.' });
  res.json(userOut(u));
}));

// ---------- Tasks (CRUD, only the owner can touch their tasks) ----------
app.get('/api/tasks', auth, wrap(async (req, res) => {
  res.json((await Task.find({ user: req.userId }).sort({ createdAt: -1 })).map(taskOut));
}));

app.post('/api/tasks', auth, wrap(async (req, res) => {
  res.status(201).json(taskOut(await Task.create({ ...pick(req.body), user: req.userId })));
}));

app.put('/api/tasks/:id', auth, wrap(async (req, res) => {
  const t = await Task.findOneAndUpdate({ _id: req.params.id, user: req.userId }, pick(req.body), { new: true, runValidators: true });
  if (!t) return res.status(404).json({ error: 'Task not found.' });
  res.json(taskOut(t));
}));

app.delete('/api/tasks/:id', auth, wrap(async (req, res) => {
  const t = await Task.findOneAndDelete({ _id: req.params.id, user: req.userId });
  if (!t) return res.status(404).json({ error: 'Task not found.' });
  res.json({ ok: true });
}));

// ---------- Start ----------
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log('Taskboard running on port ' + port));
  })
  .catch(e => { console.error('MongoDB connection failed:', e.message); process.exit(1); });
