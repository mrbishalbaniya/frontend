const socket = io('https://webrtc-signaling-server-3za6.onrender.com'); // Replace with your backend URL

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
        console.log('Got local stream:', stream);
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
    console.log('Received remote stream:', event.streams[0]);
    remoteVideo.srcObject = event.streams[0];
};

// Handle ICE candidates
peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
        console.log('Sending ICE candidate:', event.candidate);
        socket.emit('signal', { type: 'candidate', candidate: event.candidate });
    }
};

// Handle signaling messages
socket.on('signal', (data) => {
    if (data.type === 'offer') {
        console.log('Received offer:', data.offer);
        peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer))
            .then(() => peerConnection.createAnswer())
            .then((answer) => peerConnection.setLocalDescription(answer))
            .then(() => {
                console.log('Sending answer:', peerConnection.localDescription);
                socket.emit('signal', { type: 'answer', answer: peerConnection.localDescription });
            })
            .catch((error) => {
                console.error('Error handling offer:', error);
            });
    } else if (data.type === 'answer') {
        console.log('Received answer:', data.answer);
        peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer))
            .catch((error) => {
                console.error('Error handling answer:', error);
            });
    } else if (data.type === 'candidate') {
        console.log('Received ICE candidate:', data.candidate);
        peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate))
            .catch((error) => {
                console.error('Error adding ICE candidate:', error);
            });
    }
});

// Start the call
function startCall() {
    peerConnection.createOffer()
        .then((offer) => peerConnection.setLocalDescription(offer))
        .then(() => {
            console.log('Sending offer:', peerConnection.localDescription);
            socket.emit('signal', { type: 'offer', offer: peerConnection.localDescription });
        })
        .catch((error) => {
            console.error('Error creating offer:', error);
        });
}

// Start the call when the page loads
startCall();
