/* eslint-env browser */
/* eslint-disable no-console */

class VoiceWidget extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.state = {
      recording: false,
      transcript: '',
      aiResponse: '',
      error: '',
      status: 'Ready to chat',
    };
    this.mediaRecorder = null;
    this.ws = null;
    this.audioContext = null;
    this.isModalOpen = false;
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  setupEventListeners() {
    const button = this.shadowRoot.querySelector('.widget-button');
    const modal = this.shadowRoot.querySelector('.modal');
    const closeBtn = this.shadowRoot.querySelector('.close-btn');
    const recordBtn = this.shadowRoot.querySelector('.record-btn');

    button.addEventListener('click', () => this.toggleModal());
    closeBtn.addEventListener('click', () => this.closeModal());
    recordBtn.addEventListener('click', () => this.toggleRecording());

    // Close modal when clicking outside
    modal.addEventListener('click', e => {
      if (e.target === modal) this.closeModal();
    });
  }

  toggleModal() {
    this.isModalOpen = !this.isModalOpen;
    this.render();
  }

  closeModal() {
    this.isModalOpen = false;
    if (this.state.recording) {
      this.stopRecording();
    }
    this.render();
  }

  async toggleRecording() {
    if (this.state.recording) {
      this.stopRecording();
      return;
    }

    try {
      this.state.recording = true;
      this.state.status = 'Starting recording...';
      this.state.error = '';
      this.render();

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Setup MediaRecorder
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      // Connect WebSocket - Use Fly.io backend for real-time voice processing
      // Production: wss://coconut-voice-socket.fly.dev/voice
      // Development: fallback to local if available
      const wsUrl =
        location.hostname === 'localhost' || location.hostname === '127.0.0.1'
          ? `${location.origin.replace(/^http/, 'ws')}/api/voice-socket`
          : 'wss://coconut-voice-socket.fly.dev/voice';

      console.log('Connecting to WebSocket:', wsUrl);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.state.status = 'Connected - Start speaking!';
        this.render();
      };

      this.ws.onmessage = e => {
        try {
          const msg = JSON.parse(e.data);
          console.log('Received message:', msg);

          if (msg.type === 'transcript') {
            this.state.transcript = msg.data;
            this.render();
          } else if (msg.type === 'ai_response') {
            this.state.aiResponse = msg.data;
            this.render();
          } else if (msg.type === 'audio') {
            this.playAudio(msg.data);
          } else if (msg.type === 'error') {
            this.state.error = msg.data;
            this.render();
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
          this.state.error = 'Error parsing server response';
          this.render();
        }
      };

      this.ws.onerror = err => {
        console.error('WebSocket error:', err);
        this.state.error = 'Connection error - please try again';
        this.render();
      };

      this.ws.onclose = () => {
        this.state.status = 'Connection closed';
        this.render();
      };

      // Setup audio streaming
      this.mediaRecorder.ondataavailable = e => {
        console.log('🎤 Frontend: Audio data available:', {
          type: e.data.type,
          size: e.data.size,
          timestamp: new Date().toISOString(),
        });

        if (
          e.data.size > 0 &&
          this.ws &&
          this.ws.readyState === WebSocket.OPEN
        ) {
          console.log('📤 Frontend: Sending audio chunk via WebSocket:', {
            chunkSize: e.data.size,
            mimeType: e.data.type,
            wsState: this.ws.readyState,
          });
          this.ws.send(e.data);
        } else {
          console.warn('⚠️ Frontend: Not sending audio chunk:', {
            dataSize: e.data.size,
            wsExists: !!this.ws,
            wsState: this.ws ? this.ws.readyState : 'N/A',
          });
        }
      };

      this.mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'stop' }));
        }
      };

      // Start recording in chunks for streaming
      this.mediaRecorder.start(1000); // Send 1-second chunks
    } catch (err) {
      console.error('Error starting recording:', err);
      this.state.error = 'Microphone access denied or not available';
      this.state.recording = false;
      this.render();
    }
  }

  stopRecording() {
    this.state.recording = false;
    this.state.status = 'Processing...';
    this.render();

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
  }

  async playAudio(audioData) {
    try {
      // Convert base64 to blob if needed
      let audioBlob;
      if (typeof audioData === 'string') {
        const binaryString = atob(audioData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
      } else {
        audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        this.state.status = 'Ready to chat';
        this.render();
      };

      audio.onerror = err => {
        console.error('Audio playback error:', err);
        this.state.error = 'Audio playback failed';
        this.render();
      };

      await audio.play();
    } catch (err) {
      console.error('Error playing audio:', err);
      this.state.error = 'Could not play audio response';
      this.render();
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: fixed;
          bottom: 30px;
          right: 30px;
          z-index: 9999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .widget-button {
          background: linear-gradient(135deg, #29c6c2 0%, #1e9a96 100%);
          color: white;
          border: none;
          border-radius: 50px;
          padding: 16px 24px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(41, 198, 194, 0.3);
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .widget-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 25px rgba(41, 198, 194, 0.4);
        }
        
        .modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: ${this.isModalOpen ? 'flex' : 'none'};
          align-items: center;
          justify-content: center;
          z-index: 10000;
        }
        
        .modal-content {
          background: white;
          border-radius: 20px;
          padding: 30px;
          width: 90%;
          max-width: 500px;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 10px 50px rgba(0, 0, 0, 0.2);
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .modal-title {
          font-size: 24px;
          font-weight: 700;
          color: #333;
          margin: 0;
        }
        
        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .close-btn:hover {
          color: #333;
        }
        
        .record-btn {
          width: 100%;
          background: ${this.state.recording ? '#ff4757' : '#29c6c2'};
          color: white;
          border: none;
          border-radius: 50px;
          padding: 20px;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          margin-bottom: 20px;
          transition: all 0.3s ease;
        }
        
        .record-btn:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        
        .status {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 10px;
          margin-bottom: 15px;
          font-size: 14px;
          color: #666;
          text-align: center;
        }
        
        .transcript, .ai-response {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 10px;
          margin-bottom: 15px;
          min-height: 50px;
          font-size: 14px;
          line-height: 1.5;
        }
        
        .transcript {
          border-left: 4px solid #29c6c2;
        }
        
        .ai-response {
          border-left: 4px solid #1e9a96;
        }
        
        .transcript:empty::before {
          content: "Your message will appear here...";
          color: #999;
          font-style: italic;
        }
        
        .ai-response:empty::before {
          content: "AI response will appear here...";
          color: #999;
          font-style: italic;
        }
        
        .error {
          background: #ffebee;
          color: #c62828;
          padding: 15px;
          border-radius: 10px;
          margin-bottom: 15px;
          font-size: 14px;
        }
        
        .label {
          font-weight: 600;
          color: #333;
          margin-bottom: 5px;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      </style>
      
      <button class="widget-button">
        🎤 Talk to Coconut Beach
      </button>
      
      <div class="modal">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">🥥 Coconut Beach Assistant</h3>
            <button class="close-btn">×</button>
          </div>
          
          <button class="record-btn">
            ${this.state.recording ? '⏹️ Stop Recording' : '🎤 Start Recording'}
          </button>
          
          <div class="status">${this.state.status}</div>
          
          ${this.state.error ? `<div class="error">${this.state.error}</div>` : ''}
          
          <div class="label">Your Message:</div>
          <div class="transcript">${this.state.transcript}</div>
          
          <div class="label">AI Response:</div>
          <div class="ai-response">${this.state.aiResponse}</div>
        </div>
      </div>
    `;

    // Re-setup event listeners after re-render
    if (this.shadowRoot) {
      this.setupEventListeners();
    }
  }
}

customElements.define('voice-widget', VoiceWidget);
