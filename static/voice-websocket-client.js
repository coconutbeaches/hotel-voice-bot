/**
 * Enhanced WebSocket Client for Voice Chat
 * Manages connection lifecycle, heartbeat, and message handling
 */
class VoiceWebSocketClient {
  constructor(url, options = {}) {
    this.url = url;
    this.options = {
      heartbeatInterval: 30000, // 30 seconds
      connectionTimeout: 10000, // 10 seconds
      maxReconnectAttempts: 3,
      reconnectDelay: 2000, // 2 seconds
      messageTimeout: 60000, // 60 seconds for complete conversation
      ...options
    };
    
    this.socket = null;
    this.isConnected = false;
    this.connectionId = null;
    this.heartbeatTimer = null;
    this.messageTimeoutTimer = null;
    this.reconnectAttempts = 0;
    
    // Message tracking for lifecycle management
    this.pendingMessages = new Set();
    this.receivedMessages = new Set();
    this.sessionComplete = false;
    
    // Event handlers
    this.eventHandlers = {
      onOpen: [],
      onMessage: [],
      onClose: [],
      onError: [],
      onTranscript: [],
      onAiResponse: [],
      onAudio: [],
      onStatus: [],
      onSessionComplete: []
    };
  }
  
  /**
   * Add event listener
   */
  on(event, handler) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].push(handler);
    }
  }
  
  /**
   * Remove event listener
   */
  off(event, handler) {
    if (this.eventHandlers[event]) {
      const index = this.eventHandlers[event].indexOf(handler);
      if (index > -1) {
        this.eventHandlers[event].splice(index, 1);
      }
    }
  }
  
  /**
   * Emit event to all handlers
   */
  emit(event, ...args) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
        }
      });
    }
  }
  
  /**
   * Connect to WebSocket server
   */
  async connect() {
    return new Promise((resolve, reject) => {
      try {
        console.log('🔌 Connecting to WebSocket:', this.url);
        
        this.socket = new WebSocket(this.url);
        
        // Connection timeout
        const timeoutId = setTimeout(() => {
          if (this.socket.readyState === WebSocket.CONNECTING) {
            this.socket.close();
            reject(new Error('Connection timeout'));
          }
        }, this.options.connectionTimeout);
        
        this.socket.onopen = (event) => {
          clearTimeout(timeoutId);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          console.log('✅ WebSocket connected');
          this.startHeartbeat();
          this.emit('onOpen', event);
          resolve();
        };
        
        this.socket.onmessage = (event) => {
          this.handleMessage(event);
        };
        
        this.socket.onclose = (event) => {
          clearTimeout(timeoutId);
          this.handleClose(event);
        };
        
        this.socket.onerror = (error) => {
          clearTimeout(timeoutId);
          this.handleError(error);
          reject(error);
        };
        
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(event) {
    try {
      const message = JSON.parse(event.data);
      console.log('📥 Received message:', message);
      
      this.emit('onMessage', message);
      
      // Handle different message types
      switch (message.type) {
        case 'connected':
          console.log('🟢 Connection confirmed:', message.data);
          break;
          
        case 'transcript':
          console.log('📝 Received transcript:', message.data);
          this.receivedMessages.add('transcript');
          this.emit('onTranscript', message.data);
          this.checkSessionComplete();
          break;
          
        case 'ai_response':
          console.log('🤖 Received AI response:', message.data);
          this.receivedMessages.add('ai_response');
          this.emit('onAiResponse', message.data);
          this.checkSessionComplete();
          break;
          
        case 'audio':
          console.log('🔊 Received audio data');
          this.receivedMessages.add('audio');
          this.emit('onAudio', message.data);
          break;
          
        case 'status':
          console.log('ℹ️ Status update:', message.data);
          this.emit('onStatus', message.data);
          break;
          
        case 'error':
          console.error('❌ Server error:', message.data);
          this.emit('onError', new Error(message.data));
          this.handleSessionError();
          break;
          
        case 'audio_received':
          console.log('✅ Audio chunk acknowledged');
          break;
          
        default:
          console.warn('🔸 Unknown message type:', message.type);
      }
      
    } catch (error) {
      console.error('❌ Error parsing message:', error);
      this.emit('onError', error);
    }
  }
  
  /**
   * Check if session is complete (both transcript and ai_response received)
   */
  checkSessionComplete() {
    const requiredMessages = ['transcript', 'ai_response'];
    const hasAllRequired = requiredMessages.every(msg => this.receivedMessages.has(msg));
    
    if (hasAllRequired && !this.sessionComplete) {
      this.sessionComplete = true;
      console.log('✅ Session complete - received all required messages');
      this.clearMessageTimeout();
      this.emit('onSessionComplete');
      
      // Close connection gracefully after a brief delay
      setTimeout(() => {
        this.closeGracefully();
      }, 1000);
    }
  }
  
  /**
   * Handle session error
   */
  handleSessionError() {
    this.sessionComplete = true;
    this.clearMessageTimeout();
    this.emit('onSessionComplete');
    
    // Close connection after error
    setTimeout(() => {
      this.closeGracefully();
    }, 2000);
  }
  
  /**
   * Start heartbeat to keep connection alive
   */
  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        console.log('💗 Heartbeat sent');
      }
    }, this.options.heartbeatInterval);
  }
  
  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
  
  /**
   * Start message timeout
   */
  startMessageTimeout() {
    this.messageTimeoutTimer = setTimeout(() => {
      if (!this.sessionComplete) {
        console.warn('⏰ Message timeout - session taking too long');
        this.emit('onError', new Error('Session timeout'));
        this.handleSessionError();
      }
    }, this.options.messageTimeout);
  }
  
  /**
   * Clear message timeout
   */
  clearMessageTimeout() {
    if (this.messageTimeoutTimer) {
      clearTimeout(this.messageTimeoutTimer);
      this.messageTimeoutTimer = null;
    }
  }
  
  /**
   * Send audio data to server
   */
  sendAudio(audioData) {
    if (!this.isConnected || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }
    
    // Reset session state for new conversation
    this.receivedMessages.clear();
    this.sessionComplete = false;
    this.startMessageTimeout();
    
    console.log('📤 Sending audio data:', audioData.byteLength || audioData.size || 'unknown size');
    this.socket.send(audioData);
  }
  
  /**
   * Send stop signal to server
   */
  sendStop() {
    if (!this.isConnected || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }
    
    console.log('🛑 Sending stop signal');
    this.socket.send(JSON.stringify({ type: 'stop' }));
  }
  
  /**
   * Send text message to server
   */
  sendText(text) {
    if (!this.isConnected || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }
    
    // Reset session state for new conversation
    this.receivedMessages.clear();
    this.sessionComplete = false;
    this.startMessageTimeout();
    
    console.log('📤 Sending text message:', text);
    this.socket.send(JSON.stringify({ type: 'text', data: text }));
  }
  
  /**
   * Handle WebSocket close
   */
  handleClose(event) {
    console.log('🔌 WebSocket closed:', event.code, event.reason);
    
    this.isConnected = false;
    this.stopHeartbeat();
    this.clearMessageTimeout();
    
    this.emit('onClose', event);
    
    // Attempt reconnection if not a graceful close
    if (event.code !== 1000 && this.reconnectAttempts < this.options.maxReconnectAttempts) {
      this.attemptReconnect();
    }
  }
  
  /**
   * Handle WebSocket error
   */
  handleError(error) {
    console.error('❌ WebSocket error:', error);
    this.emit('onError', error);
  }
  
  /**
   * Attempt to reconnect
   */
  async attemptReconnect() {
    this.reconnectAttempts++;
    console.log(`🔄 Attempting reconnect ${this.reconnectAttempts}/${this.options.maxReconnectAttempts}`);
    
    setTimeout(async () => {
      try {
        await this.connect();
        console.log('✅ Reconnected successfully');
      } catch (error) {
        console.error('❌ Reconnection failed:', error);
        
        if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
          console.error('❌ Max reconnection attempts reached');
          this.emit('onError', new Error('Failed to reconnect after maximum attempts'));
        }
      }
    }, this.options.reconnectDelay);
  }
  
  /**
   * Close connection gracefully
   */
  closeGracefully() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('🔌 Closing WebSocket gracefully');
      this.socket.close(1000, 'Session complete');
    }
  }
  
  /**
   * Force close connection
   */
  forceClose() {
    if (this.socket) {
      console.log('🔌 Force closing WebSocket');
      this.stopHeartbeat();
      this.clearMessageTimeout();
      this.socket.close();
      this.socket = null;
      this.isConnected = false;
    }
  }
  
  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      connectionId: this.connectionId,
      readyState: this.socket?.readyState,
      reconnectAttempts: this.reconnectAttempts,
      sessionComplete: this.sessionComplete,
      receivedMessages: Array.from(this.receivedMessages)
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VoiceWebSocketClient;
}
