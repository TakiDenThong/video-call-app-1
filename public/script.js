const socket = io();
const peers = {};
const localVideo = document.getElementById('localVideo');
const remoteVideos = document.getElementById('remoteVideos');
let localStream = null;

// Try to get camera/mic
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localStream = stream;
    localVideo.srcObject = stream;
    socket.emit('join', { role: 'member' });
  })
  .catch(error => {
    console.warn('No camera or mic access:', error);
    socket.emit('join', { role: 'member' });
  });

// On joining, get all users
socket.on('all-users', users => {
  users.forEach(user => createPeer(user.id, true));
});

// When new user joins
socket.on('user-joined', user => {
  createPeer(user.id, false);
});

// Handle signal (offer/answer/ice)
socket.on('signal', async ({ from, signal }) => {
  if (peers[from]) {
    peers[from].signal(signal);
  }
});

// Handle user disconnect
socket.on('user-left', id => {
  if (peers[id]) {
    peers[id].destroy();
    delete peers[id];
    const video = document.getElementById(id);
    if (video) video.remove();
  }
});

// Create peer connection
function createPeer(id, initiator) {
  const peer = new SimplePeer({
    initiator,
    trickle: false,
    stream: localStream || undefined
  });

  peer.on('signal', signal => {
    socket.emit('signal', { to: id, signal });
  });

  peer.on('stream', stream => {
    const video = document.createElement('video');
    video.id = id;
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    remoteVideos.appendChild(video);
  });

  peers[id] = peer;
}
