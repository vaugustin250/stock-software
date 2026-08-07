require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make io accessible in routes
app.set('io', io);

// Basic health route
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Auth & Routes will go here
app.use('/auth', require('./routes/auth'));
app.use('/masters', require('./routes/masters'));
app.use('/po', require('./routes/po'));
app.use('/po', require('./routes/po'));
app.use('/purchase', require('./routes/purchase'));
app.use('/transfer', require('./routes/transfer'));
app.use('/receiving', require('./routes/receiving'));
app.use('/rates', require('./routes/rates'));
app.use('/reports', require('./routes/reports'));

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
