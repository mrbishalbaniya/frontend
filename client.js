const socket = io('https://webrtc-signaling-server-3za6.onrender.com');

// Get video elements
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

// Create a peer connection
const peerConnection = new RTCPeerConnection({
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' } // Free STUN server
    ]
});

// Set up media streams
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then((stream) => {
        localVideo.srcObject = stream;
        stream.getTracks().forEach((track) => {
            peerConnection.addTrack(track, stream);
        });
    })
    .catch((error) => {
        console.error('Error accessing media devices:', error);
    });

// Handle remote stream
peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
};

// Handle ICE candidates
peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
        socket.emit('signal', { type: 'candidate', candidate: event.candidate });
    }
};

// Handle signaling messages
socket.on('signal', (data) => {
    if (data.type === 'offer') {
        peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer))
            .then(() => peerConnection.createAnswer())
            .then((answer) => peerConnection.setLocalDescription(answer))
            .then(() => {
                socket.emit('signal', { type: 'answer', answer: peerConnection.localDescription });
            });
    } else if (data.type === 'answer') {
        peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    } else if (data.type === 'candidate') {
        peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
});

// Start the call
function startCall() {
    peerConnection.createOffer()
        .then((offer) => peerConnection.setLocalDescription(offer))
        .then(() => {
            socket.emit('signal', { type: 'offer', offer: peerConnection.localDescription });
        });
}

// Start the call when the page loads
startCall();