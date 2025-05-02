const socket = io();
const peers = {};
const localVideo = document.getElementById('localVideo');
const remoteVideos = document.getElementById('remoteVideos');
let localStream;

// Get media and join room
navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
  localStream = stream;
  localVideo.srcObject = stream;

  socket.emit('join', { role: 'member' });

  socket.on('all-users', users => {
    users.forEach(user => createPeer(user.id, true));
  });

  socket.on('user-joined', user => {
    createPeer(user.id, false);
  });

  socket.on('signal', async ({ from, signal }) => {
    if (peers[from]) {
      await peers[from].signal(signal);
    }
  });

  socket.on('user-left', id => {
    if (peers[id]) {
      peers[id].destroy();
      delete peers[id];
      const video = document.getElementById(id);
      if (video) video.remove();
    }
  });
});

// Peer connection setup (using simple-peer)
function createPeer(id, initiator) {
  const peer = new SimplePeer({
    initiator,
    trickle: false,
    stream: localStream
  });

  peer.on('signal', signal => {
    socket.emit('signal', { to: id, signal });
  });

  peer.on('stream', stream => {
    const video = document.createElement('video');
    video.id = id;
    video.srcObject = stream;
    video.autoplay = true;
    remoteVideos.appendChild(video);
  });

  peers[id] = peer;
}
