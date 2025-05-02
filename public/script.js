const socket = io();
const videosContainer = document.getElementById('videos-container');
const joinButton = document.getElementById('join-btn');
const usernameInput = document.getElementById('username');

let localStream;
let peerConnections = {};
let role = '';

joinButton.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    if (username) {
        role = username === 'admin' ? 'admin' : 'member';
        socket.emit('join', { role });
        startVideoCall();
    }
});

function startVideoCall() {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
            localStream = stream;
            const videoElement = document.createElement('video');
            videoElement.srcObject = stream;
            videoElement.autoplay = true;
            videosContainer.appendChild(videoElement);
            
            if (role === 'admin') {
                // Admin initiates peer connections with members
                socket.on('user-list', (users) => {
                    users.forEach(user => {
                        if (user.role === 'member' && !peerConnections[user.id]) {
                            createPeerConnection(user.id);
                        }
                    });
                });
            } else {
                // Members listen for connections from admin
                socket.on('signal', (data) => {
                    if (data.from !== socket.id) {
                        handleSignal(data);
                    }
                });
            }
        })
        .catch(err => {
            console.error('Error accessing media devices:', err);
        });
}

function createPeerConnection(memberId) {
    const peerConnection = new RTCPeerConnection();
    peerConnection.addStream(localStream);
    peerConnections[memberId] = peerConnection;

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('signal', {
                to: memberId,
                signal: { iceCandidate: event.candidate },
            });
        }
    };

    peerConnection.createOffer()
        .then(offer => {
            return peerConnection.setLocalDescription(offer);
        })
        .then(() => {
            socket.emit('signal', {
                to: memberId,
                signal: { offer: peerConnection.localDescription },
            });
        })
        .catch(err => {
            console.error('Error creating offer:', err);
        });
}

function handleSignal(data) {
    const { signal, from } = data;

    if (signal.offer) {
        const peerConnection = peerConnections[from] || new RTCPeerConnection();
        peerConnections[from] = peerConnection;

        peerConnection.setRemoteDescription(new RTCSessionDescription(signal.offer))
            .then(() => {
                return peerConnection.createAnswer();
            })
            .then(answer => {
                return peerConnection.setLocalDescription(answer);
            })
            .then(() => {
                socket.emit('signal', {
                    to: from,
                    signal: { answer: peerConnection.localDescription },
                });
            })
            .catch(err => {
                console.error('Error handling offer:', err);
            });
    } else if (signal.answer) {
        const peerConnection = peerConnections[from];
        peerConnection.setRemoteDescription(new RTCSessionDescription(signal.answer));
    } else if (signal.iceCandidate) {
        const peerConnection = peerConnections[from];
        peerConnection.addIceCandidate(new RTCIceCandidate(signal.iceCandidate));
    }
}
