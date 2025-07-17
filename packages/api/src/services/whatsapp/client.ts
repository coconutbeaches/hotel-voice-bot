import axios, { AxiosInstance, AxiosError } from 'axios';
import crypto from 'crypto';
import type {
  WhatsAppOutgoingMessage,
  WhatsAppTemplate,
  WhatsAppWebhookEntry,
  WhatsAppIncomingMessage,
  WhatsAppMessageStatus,
} from '@hotel-voice-bot/shared';
import { logger } from '../../utils/logger.js';

export class WhatsAppBusinessClient {
  private readonly client: AxiosInstance;
  private readonly accessToken: string;
  private readonly phoneNumberId: string;
  private readonly webhookVerifyToken: string;

  constructor() {
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN!;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
    this.webhookVerifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN!;

    if (!this.accessToken || !this.phoneNumberId || !this.webhookVerifyToken) {
      throw new Error('Missing required WhatsApp configuration');
    }

    this.client = axios.create({
      baseURL: 'https://graph.facebook.com/v18.0',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Add request/response interceptors for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.info('WhatsApp API Request', {
          method: config.method,
          url: config.url,
          data: config.data,
        });
        return config;
      },
      (error) => {
        logger.error('WhatsApp API Request Error', error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        logger.info('WhatsApp API Response', {
          status: response.status,
          data: response.data,
        });
        return response;
      },
      (error: AxiosError) => {
        logger.error('WhatsApp API Response Error', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(body: string, signature: string): boolean {
    const appSecret = process.env.WHATSAPP_APP_SECRET!;
    if (!appSecret) {
      throw new Error('WHATSAPP_APP_SECRET is required for webhook verification');
    }

    const expectedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(body)
      .digest('hex');

    const receivedSignature = signature.replace('sha256=', '');
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    );
  }

  /**
   * Verify webhook challenge
   */
  verifyWebhookChallenge(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.webhookVerifyToken) {
      return challenge;
    }
    return null;
  }

  /**
   * Send a message
   */
  async sendMessage(message: WhatsAppOutgoingMessage): Promise<{ messageId: string }> {
    try {
      const response = await this.client.post(
        `/${this.phoneNumberId}/messages`,
        message
      );

      return {
        messageId: response.data.messages[0].id,
      };
    } catch (error) {
      logger.error('Failed to send WhatsApp message', error);
      throw error;
    }
  }

  /**
   * Send a text message
   */
  async sendTextMessage(to: string, text: string): Promise<{ messageId: string }> {
    const message: WhatsAppOutgoingMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: {
        body: text,
      },
    };

    return this.sendMessage(message);
  }

  /**
   * Send a template message (HSM - Highly Structured Message)
   */
  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string,
    components?: any[]
  ): Promise<{ messageId: string }> {
    const message: WhatsAppOutgoingMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode,
        },
        components,
      },
    };

    return this.sendMessage(message);
  }

  /**
   * Send an interactive message with buttons
   */
  async sendInteractiveMessage(
    to: string,
    bodyText: string,
    buttons: { id: string; title: string }[]
  ): Promise<{ messageId: string }> {
    const message: WhatsAppOutgoingMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: bodyText,
        },
        action: {
          buttons: buttons.map(button => ({
            type: 'reply',
            reply: {
              id: button.id,
              title: button.title,
            },
          })),
        },
      },
    };

    return this.sendMessage(message);
  }

  /**
   * Send an interactive message with a list
   */
  async sendListMessage(
    to: string,
    bodyText: string,
    sections: {
      title: string;
      rows: { id: string; title: string; description: string }[];
    }[]
  ): Promise<{ messageId: string }> {
    const message: WhatsAppOutgoingMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: {
          text: bodyText,
        },
        action: {
          sections,
        },
      },
    };

    return this.sendMessage(message);
  }

  /**
   * Get media URL from media ID
   */
  async getMediaUrl(mediaId: string): Promise<string> {
    try {
      const response = await this.client.get(`/${mediaId}`);
      return response.data.url;
    } catch (error) {
      logger.error('Failed to get media URL', error);
      throw error;
    }
  }

  /**
   * Download media from URL
   */
  async downloadMedia(url: string): Promise<Buffer> {
    try {
      const response = await this.client.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });
      return Buffer.from(response.data);
    } catch (error) {
      logger.error('Failed to download media', error);
      throw error;
    }
  }

  /**
   * Get message templates
   */
  async getTemplates(): Promise<WhatsAppTemplate[]> {
    try {
      const response = await this.client.get('/message_templates');
      return response.data.data;
    } catch (error) {
      logger.error('Failed to get templates', error);
      throw error;
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    try {
      await this.client.post(`/${this.phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      });
    } catch (error) {
      logger.error('Failed to mark message as read', error);
      throw error;
    }
  }

  /**
   * Get phone number info
   */
  async getPhoneNumberInfo(): Promise<any> {
    try {
      const response = await this.client.get(`/${this.phoneNumberId}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to get phone number info', error);
      throw error;
    }
  }

  /**
   * Update phone number settings
   */
  async updatePhoneNumberSettings(settings: any): Promise<any> {
    try {
      const response = await this.client.post(`/${this.phoneNumberId}`, settings);
      return response.data;
    } catch (error) {
      logger.error('Failed to update phone number settings', error);
      throw error;
    }
  }
}

export const whatsappClient = new WhatsAppBusinessClient();
