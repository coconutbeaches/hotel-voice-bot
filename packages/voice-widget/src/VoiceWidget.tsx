import axios from 'axios';
import React, { useState, useEffect, useRef, useCallback } from 'react';
// import RecordRTC from 'recordrtc';
import io, { Socket } from 'socket.io-client';
import './VoiceWidget.scss';

interface VoiceWidgetConfig {
  apiUrl?: string;
  wakeWord?: string;
  defaultVoice?: string;
  enableWakeWord?: boolean;
  theme?: 'light' | 'dark';
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  customStyles?: React.CSSProperties;
  onError?: (error: Error) => void;
  onSessionStart?: () => void;
  onSessionEnd?: () => void;
}

interface VoiceWidgetProps extends VoiceWidgetConfig {
  config?: VoiceWidgetConfig;
}

const VoiceWidget: React.FC<VoiceWidgetProps> = ({
  apiUrl = process.env.REACT_APP_API_URL ||
    'wss://coconut-voice-socket.fly.dev/voice',
  wakeWord = 'Hey Coconut',
  defaultVoice = 'cove',
  enableWakeWord = true,
  theme = 'light',
  position = 'bottom-right',
  customStyles = {},
  onError,
  onSessionStart,
  onSessionEnd,
  config = {},
}) => {
  // Merge props with config
  const finalConfig = {
    apiUrl,
    wakeWord,
    defaultVoice,
    enableWakeWord,
    theme,
    position,
    customStyles,
    onError,
    onSessionStart,
    onSessionEnd,
    ...config,
  };

  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'connecting' | 'disconnected'
  >('disconnected');
  const [fallbackToText, setFallbackToText] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [textInput, setTextInput] = useState('');

  const socketRef = useRef<Socket | null>(null);
const mediaRecorderRef = useRef<MediaRecorder | null>(null);
const mediaStreamRef = useRef<MediaStream | null>(null);
const recordedChunksRef = useRef<Blob[]>([]);
const audioRef = useRef<HTMLAudioElement | null>(null);
const wakeWordRecognizerRef = useRef<any>(null);
const isInterruptedRef = useRef(false);

  // Initialize WebSocket connection
  useEffect(() => {
    const socket = io(finalConfig.apiUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnectionStatus('connected');
      const newSessionId = socket.id || `session-${Date.now()}`;
      setSessionId(newSessionId);
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    socket.on('transcription', (data: { text: string; isFinal: boolean }) => {
      if (data.isFinal) {
        setTranscript(data.text);
      }
    });

    socket.on('response', (data: { text: string; audioUrl?: string }) => {
      setResponse(data.text);
      if (data.audioUrl && !fallbackToText) {
        playAudioResponse(data.audioUrl);
      }
    });

    socket.on('error', (error: any) => {
      console.error('Socket error:', error);
      finalConfig.onError?.(new Error(error.message || 'Socket error'));
    });

    socket.on(
      'connection-quality',
      (quality: { level: 'good' | 'poor' | 'bad' }) => {
        if (quality.level === 'bad' && !fallbackToText) {
          setFallbackToText(true);
          console.warn('Poor connection detected, falling back to text mode');
        }
      }
    );

    return () => {
      socket.disconnect();
    };
  }, [finalConfig.apiUrl, fallbackToText]);

  // Initialize wake word detection
  useEffect(() => {
    if (!finalConfig.enableWakeWord) return;

    // Initialize wake word recognition (placeholder - would use Porcupine or similar)
    // For now, we'll skip wake word and use button only
    console.log(
      'Wake word detection would be initialized here:',
      finalConfig.wakeWord
    );
  }, [finalConfig.enableWakeWord, finalConfig.wakeWord]);

const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      recordedChunksRef.current = [];
      const mediaRecorder = new window.MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorder.ondataavailable = async (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
          const arrayBuffer = await e.data.arrayBuffer();
          if (socketRef.current?.connected && !fallbackToText) {
            socketRef.current.emit('audio-chunk', {
              audio: arrayBuffer,
              mimeType: e.data.type,
              isLast: false,
              sessionId,
              language: 'auto',
            });
          }
        }
      };

      mediaRecorder.onstart = () => {
        setIsListening(true);
        finalConfig.onSessionStart?.();
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // 1s chunks
    } catch (error) {
      console.error('Error starting recording:', error);
      finalConfig.onError?.(error as Error);
    }
  }, [sessionId, fallbackToText, finalConfig]);

const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'recording') {
      recorder.onstop = async () => {
        const chunks = recordedChunksRef.current;
        const blob = new Blob(chunks, { type: 'audio/webm' });
        if (socketRef.current?.connected) {
          setIsProcessing(true);
          // Send final assembled chunk with isLast = true
          const arrayBuffer = await blob.arrayBuffer();
          socketRef.current.emit('audio-chunk', {
            audio: arrayBuffer,
            mimeType: blob.type,
            isLast: true,
            sessionId,
            language: 'auto',
          });
        }
        // Cleanup tracks and refs
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
        }
        mediaRecorderRef.current = null;
        setIsListening(false);
        setIsProcessing(false);
        finalConfig.onSessionEnd?.();
      };
      recorder.stop();
    }
  }, [sessionId, finalConfig]);

  const playAudioResponse = async (audioUrl: string) => {
    try {
      setIsSpeaking(true);

      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      audioRef.current.src = audioUrl;
      audioRef.current.onended = () => {
        setIsSpeaking(false);
      };

      audioRef.current.onerror = error => {
        console.error('Audio playback error:', error);
        setIsSpeaking(false);
      };

      // Handle interruption
      audioRef.current.onpause = () => {
        if (isInterruptedRef.current) {
          setIsSpeaking(false);
          isInterruptedRef.current = false;
        }
      };

      await audioRef.current.play();
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsSpeaking(false);
    }
  };

  const handleInterrupt = () => {
    if (audioRef.current && !audioRef.current.paused) {
      isInterruptedRef.current = true;
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (isSpeaking) {
      setIsSpeaking(false);
    }
  };

  const toggleRecording = () => {
    if (isListening) {
      stopRecording();
    } else {
      handleInterrupt();
      startRecording();
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim() && socketRef.current?.connected) {
      socketRef.current.emit('text-message', {
        text: textInput,
        sessionId,
        language: 'auto',
      });
      setTextInput('');
      setIsProcessing(true);
    }
  };

  const getPositionClasses = () => {
    const positions = {
      'bottom-right': 'vw-bottom-right',
      'bottom-left': 'vw-bottom-left',
      'top-right': 'vw-top-right',
      'top-left': 'vw-top-left',
    };
    return positions[finalConfig.position];
  };

  return (
    <div
      className={`voice-widget ${finalConfig.theme} ${getPositionClasses()}`}
      style={finalConfig.customStyles}
    >
      {/* Main button */}
      <button
        className={`vw-main-button ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''}`}
        onClick={toggleRecording}
        disabled={isProcessing || connectionStatus !== 'connected'}
      >
        {isListening ? (
          <svg className="vw-icon vw-stop-icon" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" />
          </svg>
        ) : (
          <svg className="vw-icon vw-mic-icon" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M19 11c0 3.53-2.61 6.43-6 6.92V21h-2v-3.08c-3.39-.49-6-3.39-6-6.92h1.72c0 3.1 2.52 5.62 5.62 5.62s5.62-2.52 5.62-5.62H19z" />
          </svg>
        )}
        {isProcessing && <div className="vw-spinner" />}
      </button>

      {/* Connection status */}
      <div className={`vw-status vw-status-${connectionStatus}`}>
        <span className="vw-status-dot" />
      </div>

      {/* Transcript display */}
      {(transcript || response) && (
        <div className="vw-transcript-bubble">
          {transcript && (
            <div className="vw-user-message">
              <span className="vw-message-label">You:</span>
              <p>{transcript}</p>
            </div>
          )}
          {response && (
            <div className="vw-bot-message">
              <span className="vw-message-label">Assistant:</span>
              <p>{response}</p>
            </div>
          )}
        </div>
      )}

      {/* Text fallback mode */}
      {fallbackToText && (
        <div className="vw-text-fallback">
          <p className="vw-fallback-notice">
            Voice unavailable - using text mode
          </p>
          <form onSubmit={handleTextSubmit} className="vw-text-form">
            <input
              type="text"
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              placeholder="Type your message..."
              className="vw-text-input"
              disabled={isProcessing}
            />
            <button type="submit" disabled={isProcessing || !textInput.trim()}>
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default VoiceWidget;
