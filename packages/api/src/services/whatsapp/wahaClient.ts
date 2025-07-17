import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '../../utils/logger.js';

export interface WAHAMessage {
  id: string;
  timestamp: number;
  from: string;
  body: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'contacts' | 'voice';
  fromMe: boolean;
  hasMedia: boolean;
  mediaUrl?: string;
  mimeType?: string;
  voice?: {
    id: string;
    mimetype: string;
    filename: string;
    duration: number;
  };
}

export interface WAHASession {
  name: string;
  status: 'STARTING' | 'SCAN_QR_CODE' | 'WORKING' | 'FAILED' | 'STOPPED';
  qr?: string;
  me?: {
    id: string;
    pushName: string;
  };
}

export class WAHAClient {
  private readonly client: AxiosInstance;
  private readonly sessionName: string;
  private readonly webhookToken: string;

  constructor() {
    this.sessionName = process.env.WAHA_SESSION_NAME || 'default';
    this.webhookToken = process.env.WAHA_WEBHOOK_TOKEN!;

    if (!this.webhookToken) {
      throw new Error('Missing WAHA_WEBHOOK_TOKEN configuration');
    }

    this.client = axios.create({
      baseURL: process.env.WAHA_API_URL || 'http://localhost:3000',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Add request/response interceptors for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.info('WAHA API Request', {
          method: config.method,
          url: config.url,
          data: config.data,
        });
        return config;
      },
      (error) => {
        logger.error('WAHA API Request Error', error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        logger.info('WAHA API Response', {
          status: response.status,
          data: response.data,
        });
        return response;
      },
      (error: AxiosError) => {
        logger.error('WAHA API Response Error', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Verify webhook token
   */
  verifyWebhookToken(token: string): boolean {
    return token === this.webhookToken;
  }

  /**
   * Start a WhatsApp session
   */
  async startSession(): Promise<WAHASession> {
    try {
      const response = await this.client.post('/api/sessions/start', {
        name: this.sessionName,
        config: {
          webhooks: [
            {
              url: process.env.WAHA_WEBHOOK_URL,
              events: ['message', 'message.any'],
              hmac: null,
              retries: 3,
            },
          ],
        },
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to start WAHA session', error);
      throw error;
    }
  }

  /**
   * Stop a WhatsApp session
   */
  async stopSession(): Promise<void> {
    try {
      await this.client.post('/api/sessions/stop', {
        name: this.sessionName,
      });
    } catch (error) {
      logger.error('Failed to stop WAHA session', error);
      throw error;
    }
  }

  /**
   * Get session status
   */
  async getSessionStatus(): Promise<WAHASession> {
    try {
      const response = await this.client.get(`/api/sessions/${this.sessionName}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to get session status', error);
      throw error;
    }
  }

  /**
   * Send a text message
   */
  async sendTextMessage(to: string, text: string): Promise<{ messageId: string }> {
    try {
      const response = await this.client.post('/api/sendText', {
        session: this.sessionName,
        chatId: this.formatPhoneNumber(to),
        text,
      });
      return {
        messageId: response.data.id,
      };
    } catch (error) {
      logger.error('Failed to send text message', error);
      throw error;
    }
  }

  /**
   * Send an image message
   */
  async sendImageMessage(
    to: string,
    imageUrl: string,
    caption?: string
  ): Promise<{ messageId: string }> {
    try {
      const response = await this.client.post('/api/sendImage', {
        session: this.sessionName,
        chatId: this.formatPhoneNumber(to),
        file: {
          url: imageUrl,
        },
        caption,
      });
      return {
        messageId: response.data.id,
      };
    } catch (error) {
      logger.error('Failed to send image message', error);
      throw error;
    }
  }

  /**
   * Send a document message
   */
  async sendDocumentMessage(
    to: string,
    documentUrl: string,
    filename: string,
    caption?: string
  ): Promise<{ messageId: string }> {
    try {
      const response = await this.client.post('/api/sendFile', {
        session: this.sessionName,
        chatId: this.formatPhoneNumber(to),
        file: {
          url: documentUrl,
        },
        filename,
        caption,
      });
      return {
        messageId: response.data.id,
      };
    } catch (error) {
      logger.error('Failed to send document message', error);
      throw error;
    }
  }

  /**
   * Send buttons message
   */
  async sendButtonsMessage(
    to: string,
    text: string,
    buttons: { id: string; text: string }[]
  ): Promise<{ messageId: string }> {
    try {
      const response = await this.client.post('/api/sendButtons', {
        session: this.sessionName,
        chatId: this.formatPhoneNumber(to),
        text,
        buttons: buttons.map(button => ({
          id: button.id,
          text: button.text,
        })),
      });
      return {
        messageId: response.data.id,
      };
    } catch (error) {
      logger.error('Failed to send buttons message', error);
      throw error;
    }
  }

  /**
   * Send location message
   */
  async sendLocationMessage(
    to: string,
    latitude: number,
    longitude: number,
    title?: string,
    address?: string
  ): Promise<{ messageId: string }> {
    try {
      const response = await this.client.post('/api/sendLocation', {
        session: this.sessionName,
        chatId: this.formatPhoneNumber(to),
        latitude,
        longitude,
        title,
        address,
      });
      return {
        messageId: response.data.id,
      };
    } catch (error) {
      logger.error('Failed to send location message', error);
      throw error;
    }
  }

  /**
   * Send voice message
   */
  async sendVoiceMessage(
    to: string,
    audioBuffer: Buffer,
    filename: string = 'voice.mp3'
  ): Promise<{ messageId: string }> {
    try {
      // For WAHA, send audio file as base64 encoded data
      const base64Audio = audioBuffer.toString('base64');
      
      const response = await this.client.post('/api/sendVoice', {
        session: this.sessionName,
        chatId: this.formatPhoneNumber(to),
        file: {
          data: base64Audio,
          mimetype: 'audio/mp3',
          filename: filename
        }
      });
      
      return {
        messageId: response.data.id,
      };
    } catch (error) {
      logger.error('Failed to send voice message', error);
      throw error;
    }
  }

  /**
   * Get chat messages
   */
  async getChatMessages(chatId: string, limit: number = 100): Promise<WAHAMessage[]> {
    try {
      const response = await this.client.get('/api/messages', {
        params: {
          session: this.sessionName,
          chatId: this.formatPhoneNumber(chatId),
          limit,
        },
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to get chat messages', error);
      throw error;
    }
  }

  /**
   * Get contact info
   */
  async getContactInfo(phoneNumber: string): Promise<any> {
    try {
      const response = await this.client.get('/api/contacts', {
        params: {
          session: this.sessionName,
          contactId: this.formatPhoneNumber(phoneNumber),
        },
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to get contact info', error);
      throw error;
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(chatId: string, messageId: string): Promise<void> {
    try {
      await this.client.post('/api/sendSeen', {
        session: this.sessionName,
        chatId: this.formatPhoneNumber(chatId),
        messageId,
      });
    } catch (error) {
      logger.error('Failed to mark message as read', error);
      throw error;
    }
  }

  /**
   * Set typing indicator
   */
  async setTyping(chatId: string, isTyping: boolean): Promise<void> {
    try {
      await this.client.post('/api/sendTyping', {
        session: this.sessionName,
        chatId: this.formatPhoneNumber(chatId),
        isTyping,
      });
    } catch (error) {
      logger.error('Failed to set typing indicator', error);
      throw error;
    }
  }

  /**
   * Format phone number for WAHA
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove any non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Add country code if not present
    if (!cleaned.startsWith('1') && cleaned.length === 10) {
      cleaned = '1' + cleaned;
    }
    
    return cleaned + '@c.us';
  }

  /**
   * Get media from message
   */
  async getMediaFromMessage(messageId: string): Promise<Buffer> {
    try {
      const response = await this.client.get(`/api/files/${messageId}`, {
        params: {
          session: this.sessionName,
        },
        responseType: 'arraybuffer',
      });
      return Buffer.from(response.data);
    } catch (error) {
      logger.error('Failed to get media from message', error);
      throw error;
    }
  }

  /**
   * Check if session is ready
   */
  async isSessionReady(): Promise<boolean> {
    try {
      const session = await this.getSessionStatus();
      return session.status === 'WORKING';
    } catch (error) {
      return false;
    }
  }

  /**
   * Get QR code for session
   */
  async getQRCode(): Promise<string | null> {
    try {
      const session = await this.getSessionStatus();
      return session.qr || null;
    } catch (error) {
      logger.error('Failed to get QR code', error);
      return null;
    }
  }
}

import { WAHAClientStub } from './wahaClientStub.js';

let wahaClient: WAHAClient | WAHAClientStub;

try {
  console.log('🔍 Attempting to initialize WAHAClient...');
  console.log('Available ENV keys:', Object.keys(process.env).filter(key => key.startsWith('WAHA') || key === 'NODE_ENV'));
  
  // Check if we should use stub mode
  const useStub = process.env.WAHA_USE_STUB === 'true' || process.env.NODE_ENV === 'development';
  
  if (useStub) {
    console.log('📌 Using WAHAClientStub for development');
    wahaClient = new WAHAClientStub();
  } else {
    wahaClient = new WAHAClient();
    console.log('✅ WAHAClient initialized successfully - Real client used in production');
  }
} catch (err) {
  console.error('❌ WAHAClient init failed:', err instanceof Error ? err.message : String(err));
  console.error('⚠️ Falling back to WAHAClientStub');
  // Fallback to stub instead of crashing
  wahaClient = new WAHAClientStub();
}

export { wahaClient };

