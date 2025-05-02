const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const PORT = process.env.PORT || 3000;

// Track connected sockets
const sockets = new Set();

io.on('connection', socket => {
  sockets.add(socket);

  // Notify the new user about all current peers (just socket IDs internally)
  const otherSockets = Array.from(sockets).filter(s => s !== socket);
  socket.emit('all-users', otherSockets.map(s => ({ id: s.id })));

  // Notify existing users about new peer
  socket.broadcast.emit('user-joined', { id: socket.id });

  // Relay signaling data (offers, answers, ice)
  socket.on('signal', ({ to, signal }) => {
    io.to(to).emit('signal', { from: socket.id, signal });
  });

  // On disconnect, remove socket and notify others
  socket.on('disconnect', () => {
    sockets.delete(socket);
    socket.broadcast.emit('user-left', socket.id);
  });
});

app.use(express.static('public'));

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
