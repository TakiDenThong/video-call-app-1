const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public')); // Serve frontend from /public

// Store connected users
let users = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Store user info
  socket.on('join', (user) => {
    users[socket.id] = { id: socket.id, role: user.role };
    console.log(`${user.role} joined: ${socket.id}`);

    // Notify the new user about existing users
    socket.emit('all-users', Object.values(users).filter(u => u.id !== socket.id));

    // Notify others about the new user
    socket.broadcast.emit('user-joined', users[socket.id]);
  });

  // Relay signaling data (offer, answer, ice)
  socket.on('signal', ({ to, signal }) => {
    io.to(to).emit('signal', {
      from: socket.id,
      signal
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    delete users[socket.id];
    io.emit('user-left', socket.id);
  });
});

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
