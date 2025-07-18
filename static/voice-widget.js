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

      // Setup MediaRecorder with explicit MIME type for Whisper compatibility
      let options = { mimeType: 'audio/webm;codecs=opus' };

      // Safari detection - switch to WebM for better Whisper compatibility
      const isSafari = /^((?!chrome|android).)*safari/i.test(
        navigator.userAgent
      );
      if (isSafari) {
        console.log(
          '🎙️ Safari detected – using audio/webm for Whisper compatibility'
        );
        options.mimeType = 'audio/webm';
      } else {
        // Check if the preferred MIME type is supported
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          console.warn(
            '🚨 Preferred MIME type not supported, falling back to basic webm'
          );
          options.mimeType = 'audio/webm';
        }
      }

      console.log('🎤 Using MediaRecorder MIME type:', options.mimeType);
      this.mediaRecorder = new MediaRecorder(stream, options);

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
          console.log('📨 Received message:', {
            type: msg.type,
            data: msg.data,
            fullMessage: msg,
          });

          // Handle standardized WebSocket message types
          switch (msg.type) {
            case 'transcription':
              // Show transcription in UI
              this.updateTranscript(msg.text);
              break;

            case 'ai_response':
              // Show AI reply in UI
              this.updateAIResponse(msg.text);
              break;

            case 'tts_audio':
              // Play audio from msg.audio (base64 or URL)
              this.playTTS(msg.audio);
              break;

            case 'debug':
              // Log debug info if needed
              console.log('🔍 Debug message:', msg.step);
              break;

            case 'error':
              console.log('❌ Setting error:', msg.error || msg.data);
              this.state.error = msg.error || msg.data;
              this.render();
              break;

            case 'status':
              console.log('ℹ️ Status update:', msg.status || msg.data);
              this.state.status = msg.status || msg.data;
              this.render();
              break;

            case 'connected':
              console.log('🔗 Connected:', msg.data);
              break;

            case 'audio_received':
              console.log('🔈 Audio Received Acknowledgment:', msg.data);
              break;

            default:
              console.warn('Unknown message type:', msg.type, msg);
              break;
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

        // Log the MIME type to verify it's correct for Whisper
        console.log('🎧 Audio chunk MIME type:', e.data.type);

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
        console.log('🛑 Frontend: MediaRecorder stopped, cleaning up...');

        // Create final blob to verify MIME type - use the same type as MediaRecorder
        const finalAudioBlob = new Blob([], { type: options.mimeType });
        console.log('🎧 Final recording MIME type:', finalAudioBlob.type);

        stream.getTracks().forEach(track => track.stop());

        console.log('📶 Frontend: WebSocket state check:', {
          wsExists: !!this.ws,
          wsState: this.ws ? this.ws.readyState : 'N/A',
          wsStateText: this.ws
            ? ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][this.ws.readyState]
            : 'N/A',
        });

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          console.log('📱 Frontend: Sending stop message to backend...');
          this.ws.send(JSON.stringify({ type: 'stop' }));
        } else {
          console.warn(
            '⚠️ Frontend: Cannot send stop message, WebSocket not open'
          );
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
    console.log('🛑 Frontend: Stopping recording...');
    this.state.recording = false;
    this.state.status = 'Processing...';
    this.render();

    // Send stop message BEFORE closing WebSocket
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('📱 Frontend: Sending stop message immediately...');
      this.ws.send(JSON.stringify({ type: 'stop' }));
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    // Don't close WebSocket immediately - wait for processing to complete
    // The connection will be closed when we receive the final response or error
    this.connectionTimeout = setTimeout(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        console.log(
          '🔌 Frontend: Closing WebSocket connection after timeout...'
        );
        this.ws.close();
      }
    }, 30000); // 30 second timeout
  }

  updateTranscript(text) {
    console.log('📝 Updating transcript:', text);
    this.state.transcript = text;
    this.render();
  }

  updateAIResponse(text) {
    console.log('🤖 Updating AI response:', text);
    this.state.aiResponse = text;
    this.render();
  }

  playTTS(audioData) {
    console.log('🔊 Playing TTS audio');
    this.playAudio(audioData);
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

      try {
        await audio.play();
      } catch (err) {
        if (err.name === 'NotAllowedError') {
          console.warn(
            '🔊 Audio autoplay was blocked, showing Tap to Play button'
          );
          this.showTapToPlayButton(audio);
        } else {
          throw err;
        }
      }
    } catch (err) {
      console.error('Error playing audio:', err);
      this.state.error = 'Could not play audio response';
      this.render();
    }
  }

  showTapToPlayButton(audioElement) {
    const aiResponseEl = this.shadowRoot.querySelector('.ai-response');
    if (aiResponseEl) {
      // Remove any existing tap-to-play buttons
      const existingButtons = aiResponseEl.querySelectorAll('.tap-to-play-btn');
      existingButtons.forEach(btn => btn.remove());

      const button = document.createElement('button');
      button.textContent = '🔊 Tap to Play';
      button.className = 'tap-to-play-btn';
      button.style.marginTop = '10px';
      button.style.padding = '10px';
      button.style.border = 'none';
      button.style.borderRadius = '5px';
      button.style.background = '#29c6c2';
      button.style.color = 'white';
      button.style.cursor = 'pointer';
      button.style.fontSize = '14px';
      button.style.fontWeight = '600';
      button.style.transition = 'all 0.3s ease';
      button.onmouseover = () => {
        button.style.background = '#1e9a96';
      };
      button.onmouseout = () => {
        button.style.background = '#29c6c2';
      };
      button.onclick = async () => {
        try {
          await audioElement.play();
          button.remove();
          console.log('🔊 Audio played successfully after user interaction');
        } catch (err) {
          console.error('❌ Error playing audio on user interaction:', err);
        }
      };
      aiResponseEl.appendChild(button);
    }
  }

  render() {
    // If this is the first render, create the full HTML structure
    if (!this.shadowRoot.innerHTML) {
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
            display: none;
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
            background: #29c6c2;
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
          
          .record-btn.recording {
            background: #ff4757;
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
            white-space: pre-wrap;
            word-wrap: break-word;
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
            display: none;
          }
          
          .error.show {
            display: block;
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
              🎤 Start Recording
            </button>
            
            <div class="status">Ready to chat</div>
            
            <div class="error"></div>
            
            <div class="label">Your Message:</div>
            <div class="transcript"></div>
            
            <div class="label">AI Response:</div>
            <div class="ai-response"></div>
          </div>
        </div>
      `;

      // Set up event listeners only once
      this.setupEventListeners();
    }

    // Update the dynamic content without recreating the DOM
    this.updateContent();
  }

  updateContent() {
    if (!this.shadowRoot) return;

    // Update modal visibility
    const modal = this.shadowRoot.querySelector('.modal');
    if (modal) {
      modal.style.display = this.isModalOpen ? 'flex' : 'none';
    }

    // Update record button
    const recordBtn = this.shadowRoot.querySelector('.record-btn');
    if (recordBtn) {
      recordBtn.textContent = this.state.recording
        ? '⏹️ Stop Recording'
        : '🎤 Start Recording';
      recordBtn.classList.toggle('recording', this.state.recording);
    }

    // Update status
    const statusEl = this.shadowRoot.querySelector('.status');
    if (statusEl) {
      statusEl.textContent = this.state.status;
    }

    // Update error
    const errorEl = this.shadowRoot.querySelector('.error');
    if (errorEl) {
      errorEl.textContent = this.state.error;
      errorEl.classList.toggle('show', !!this.state.error);
    }

    // Update transcript
    const transcriptEl = this.shadowRoot.querySelector('.transcript');
    if (transcriptEl) {
      transcriptEl.textContent = this.state.transcript;
    }

    // Update AI response
    const aiResponseEl = this.shadowRoot.querySelector('.ai-response');
    if (aiResponseEl) {
      aiResponseEl.textContent = this.state.aiResponse;
      // Remove any existing tap-to-play buttons when response is updated
      const existingButtons = aiResponseEl.querySelectorAll('.tap-to-play-btn');
      existingButtons.forEach(btn => btn.remove());
    }
  }
}

customElements.define('voice-widget', VoiceWidget);
