const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Store connected users
let users = [];

app.use(express.static('public'));  // Serve static files from the 'public' directory

// When a user connects
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Handle user joining (admin or member)
    socket.on('join', (user) => {
        users.push({ id: socket.id, role: user.role });
        console.log(`${user.role} joined: ${socket.id}`);
        io.emit('user-list', users);  // Broadcast user list
    });

    // Handle signaling (offer, answer, ice candidate)
    socket.on('signal', (data) => {
        io.to(data.to).emit('signal', {
            from: socket.id,
            signal: data.signal,
        });
    });

    // Handle user disconnect
    socket.on('disconnect', () => {
        users = users.filter(user => user.id !== socket.id);
        console.log('User disconnected:', socket.id);
        io.emit('user-list', users);  // Update user list
    });
});

server.listen(3000, () => {
    console.log('Signaling server running on http://localhost:3000');
});
