import { logger } from '../../utils/logger.js';
import type { WAHAMessage, WAHASession } from './wahaClient.js';

/**
 * Stub implementation of WAHAClient for development/testing
 * This allows the app to run without a real WAHA service
 */
export class WAHAClientStub {
  private readonly sessionName: string;
  private readonly webhookToken: string;

  constructor() {
    this.sessionName = process.env.WAHA_SESSION_NAME || 'default';
    this.webhookToken = process.env.WAHA_WEBHOOK_TOKEN || 'stub-token';
    logger.warn('Using WAHAClientStub - WhatsApp functionality will not work');
  }

  verifyWebhookToken(token: string): boolean {
    return token === this.webhookToken;
  }

  async startSession(): Promise<WAHASession> {
    logger.info('[STUB] startSession called');
    return {
      name: this.sessionName,
      status: 'WORKING',
      me: {
        id: 'stub-id',
        pushName: 'Stub WhatsApp'
      }
    };
  }

  async stopSession(): Promise<void> {
    logger.info('[STUB] stopSession called');
  }

  async getSessionStatus(): Promise<WAHASession> {
    logger.info('[STUB] getSessionStatus called');
    return {
      name: this.sessionName,
      status: 'WORKING',
      me: {
        id: 'stub-id',
        pushName: 'Stub WhatsApp'
      }
    };
  }

  async sendTextMessage(to: string, text: string): Promise<{ messageId: string }> {
    logger.info('[STUB] sendTextMessage called', { to, text });
    return { messageId: `stub-${Date.now()}` };
  }

  async sendImageMessage(to: string, imageUrl: string, caption?: string): Promise<{ messageId: string }> {
    logger.info('[STUB] sendImageMessage called', { to, imageUrl, caption });
    return { messageId: `stub-${Date.now()}` };
  }

  async sendDocumentMessage(to: string, documentUrl: string, filename: string, caption?: string): Promise<{ messageId: string }> {
    logger.info('[STUB] sendDocumentMessage called', { to, documentUrl, filename, caption });
    return { messageId: `stub-${Date.now()}` };
  }

  async sendButtonsMessage(to: string, text: string, buttons: { id: string; text: string }[]): Promise<{ messageId: string }> {
    logger.info('[STUB] sendButtonsMessage called', { to, text, buttons });
    return { messageId: `stub-${Date.now()}` };
  }

  async sendLocationMessage(to: string, latitude: number, longitude: number, title?: string, address?: string): Promise<{ messageId: string }> {
    logger.info('[STUB] sendLocationMessage called', { to, latitude, longitude, title, address });
    return { messageId: `stub-${Date.now()}` };
  }

  async sendVoiceMessage(to: string, audioBuffer: Buffer, filename: string = 'voice.mp3'): Promise<{ messageId: string }> {
    logger.info('[STUB] sendVoiceMessage called', { to, filename, bufferSize: audioBuffer.length });
    return { messageId: `stub-${Date.now()}` };
  }

  async getChatMessages(chatId: string, limit: number = 100): Promise<WAHAMessage[]> {
    logger.info('[STUB] getChatMessages called', { chatId, limit });
    return [];
  }

  async getContactInfo(phoneNumber: string): Promise<any> {
    logger.info('[STUB] getContactInfo called', { phoneNumber });
    return {
      id: this.formatPhoneNumber(phoneNumber),
      name: 'Stub Contact',
      isMyContact: false
    };
  }

  async markAsRead(chatId: string, messageId: string): Promise<void> {
    logger.info('[STUB] markAsRead called', { chatId, messageId });
  }

  async setTyping(chatId: string, isTyping: boolean): Promise<void> {
    logger.info('[STUB] setTyping called', { chatId, isTyping });
  }

  private formatPhoneNumber(phoneNumber: string): string {
    let cleaned = phoneNumber.replace(/\D/g, '');
    if (!cleaned.startsWith('1') && cleaned.length === 10) {
      cleaned = '1' + cleaned;
    }
    return cleaned + '@c.us';
  }

  async getMediaFromMessage(messageId: string): Promise<Buffer> {
    logger.info('[STUB] getMediaFromMessage called', { messageId });
    return Buffer.from('stub-media-content');
  }

  async isSessionReady(): Promise<boolean> {
    logger.info('[STUB] isSessionReady called');
    return true;
  }

  async getQRCode(): Promise<string | null> {
    logger.info('[STUB] getQRCode called');
    return null;
  }
}
