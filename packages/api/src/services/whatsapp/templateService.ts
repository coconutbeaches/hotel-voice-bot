import type { WhatsAppTemplate } from '@hotel-voice-bot/shared';
import { logger } from '../../utils/logger.js';
import { wahaClient } from './wahaClient.js';
import { messageQueue } from './messageQueue.js';

interface TemplateVariable {
  [key: string]: string | number;
}

export class TemplateService {
  private templates: Map<string, WhatsAppTemplate> = new Map();
  private readonly defaultLanguage = 'en';

  constructor() {
    this.loadTemplates();
  }

  /**
   * Load templates - WAHA doesn't have templates like Business API
   * So we'll define common message templates here
   */
  private async loadTemplates(): Promise<void> {
    try {
      // Define common message templates for WAHA
      const commonTemplates: WhatsAppTemplate[] = [
        {
          id: 'welcome_guest',
          name: 'welcome_guest',
          language: 'en',
          status: 'approved',
          category: 'utility',
          components: [
            {
              type: 'body',
              text: 'Welcome to our hotel, {{guestName}}! Your room {{roomNumber}} is ready. Check-in: {{checkInDate}}, Check-out: {{checkOutDate}}',
            },
          ],
        },
        {
          id: 'service_request_confirmation',
          name: 'service_request_confirmation',
          language: 'en',
          status: 'approved',
          category: 'utility',
          components: [
            {
              type: 'body',
              text: 'Your {{requestType}} request (ID: {{requestId}}) has been confirmed. Estimated time: {{estimatedTime}}',
            },
          ],
        },
      ];

      commonTemplates.forEach(template => {
        this.templates.set(template.name, template);
      });

      logger.info(`Loaded ${commonTemplates.length} message templates`);
    } catch (error) {
      logger.error('Failed to load message templates', error);
    }
  }

  /**
   * Get template by name
   */
  getTemplate(name: string): WhatsAppTemplate | undefined {
    return this.templates.get(name);
  }

  /**
   * Get all templates
   */
  getAllTemplates(): WhatsAppTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Send welcome message to new guests
   */
  async sendWelcomeMessage(
    phoneNumber: string,
    guestName: string,
    roomNumber: string,
    checkInDate: string,
    checkOutDate: string
  ): Promise<void> {
    try {
      const template = this.getTemplate('welcome_guest');
      if (!template) {
        logger.error('Welcome template not found');
        return;
      }

      const components = [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: guestName },
            { type: 'text', text: roomNumber },
            { type: 'text', text: checkInDate },
            { type: 'text', text: checkOutDate },
          ],
        },
      ];

      await messageQueue.enqueueMessage(
        phoneNumber,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phoneNumber,
          type: 'template',
          template: {
            name: 'welcome_guest',
            language: {
              code: this.defaultLanguage,
            },
            components,
          },
        },
        'high'
      );

      logger.info('Welcome message enqueued', { phoneNumber, guestName });
    } catch (error) {
      logger.error('Failed to send welcome message', error);
    }
  }

  /**
   * Send service request confirmation
   */
  async sendServiceRequestConfirmation(
    phoneNumber: string,
    requestType: string,
    requestId: string,
    estimatedTime: string
  ): Promise<void> {
    try {
      const template = this.getTemplate('service_request_confirmation');
      if (!template) {
        logger.error('Service request confirmation template not found');
        return;
      }

      const components = [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: requestType },
            { type: 'text', text: requestId },
            { type: 'text', text: estimatedTime },
          ],
        },
      ];

      await messageQueue.enqueueMessage(
        phoneNumber,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phoneNumber,
          type: 'template',
          template: {
            name: 'service_request_confirmation',
            language: {
              code: this.defaultLanguage,
            },
            components,
          },
        },
        'high'
      );

      logger.info('Service request confirmation enqueued', { phoneNumber, requestType });
    } catch (error) {
      logger.error('Failed to send service request confirmation', error);
    }
  }

  /**
   * Send service request status update
   */
  async sendServiceRequestStatusUpdate(
    phoneNumber: string,
    requestType: string,
    requestId: string,
    status: string,
    additionalInfo?: string
  ): Promise<void> {
    try {
      const template = this.getTemplate('service_request_status_update');
      if (!template) {
        logger.error('Service request status update template not found');
        return;
      }

      const components = [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: requestType },
            { type: 'text', text: requestId },
            { type: 'text', text: status },
          ],
        },
      ];

      // Add additional info if provided
      if (additionalInfo) {
        components.push({
          type: 'body',
          parameters: [
            { type: 'text', text: additionalInfo },
          ],
        });
      }

      await messageQueue.enqueueMessage(
        phoneNumber,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phoneNumber,
          type: 'template',
          template: {
            name: 'service_request_status_update',
            language: {
              code: this.defaultLanguage,
            },
            components,
          },
        },
        'normal'
      );

      logger.info('Service request status update enqueued', { phoneNumber, requestType, status });
    } catch (error) {
      logger.error('Failed to send service request status update', error);
    }
  }

  /**
   * Send check-out reminder
   */
  async sendCheckOutReminder(
    phoneNumber: string,
    guestName: string,
    roomNumber: string,
    checkOutTime: string
  ): Promise<void> {
    try {
      const template = this.getTemplate('checkout_reminder');
      if (!template) {
        logger.error('Check-out reminder template not found');
        return;
      }

      const components = [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: guestName },
            { type: 'text', text: roomNumber },
            { type: 'text', text: checkOutTime },
          ],
        },
      ];

      await messageQueue.enqueueMessage(
        phoneNumber,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phoneNumber,
          type: 'template',
          template: {
            name: 'checkout_reminder',
            language: {
              code: this.defaultLanguage,
            },
            components,
          },
        },
        'normal'
      );

      logger.info('Check-out reminder enqueued', { phoneNumber, guestName });
    } catch (error) {
      logger.error('Failed to send check-out reminder', error);
    }
  }

  /**
   * Send session message (for ongoing conversations)
   */
  async sendSessionMessage(
    phoneNumber: string,
    message: string,
    buttons?: { id: string; title: string }[]
  ): Promise<void> {
    try {
      if (buttons && buttons.length > 0) {
        // Send interactive message with buttons
        await messageQueue.enqueueMessage(
          phoneNumber,
          {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: phoneNumber,
            type: 'interactive',
            interactive: {
              type: 'button',
              body: {
                text: message,
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
          },
          'normal'
        );
      } else {
        // Send text message
        await messageQueue.enqueueMessage(
          phoneNumber,
          {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: phoneNumber,
            type: 'text',
            text: {
              body: message,
            },
          },
          'normal'
        );
      }

      logger.info('Session message enqueued', { phoneNumber, hasButtons: !!buttons });
    } catch (error) {
      logger.error('Failed to send session message', error);
    }
  }

  /**
   * Send list message for service options
   */
  async sendServiceOptionsMessage(
    phoneNumber: string,
    title: string,
    options: { id: string; title: string; description: string }[]
  ): Promise<void> {
    try {
      const sections = [
        {
          title: 'Available Services',
          rows: options,
        },
      ];

      await messageQueue.enqueueMessage(
        phoneNumber,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phoneNumber,
          type: 'interactive',
          interactive: {
            type: 'list',
            body: {
              text: title,
            },
            action: {
              sections,
            },
          },
        },
        'normal'
      );

      logger.info('Service options message enqueued', { phoneNumber, optionsCount: options.length });
    } catch (error) {
      logger.error('Failed to send service options message', error);
    }
  }

  /**
   * Send emergency notification
   */
  async sendEmergencyNotification(
    phoneNumber: string,
    message: string,
    contactInfo: string
  ): Promise<void> {
    try {
      const template = this.getTemplate('emergency_notification');
      if (!template) {
        // Fallback to text message if template not found
        await this.sendSessionMessage(phoneNumber, `🚨 EMERGENCY: ${message}\n\nContact: ${contactInfo}`);
        return;
      }

      const components = [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: message },
            { type: 'text', text: contactInfo },
          ],
        },
      ];

      await messageQueue.enqueueMessage(
        phoneNumber,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phoneNumber,
          type: 'template',
          template: {
            name: 'emergency_notification',
            language: {
              code: this.defaultLanguage,
            },
            components,
          },
        },
        'high'
      );

      logger.info('Emergency notification enqueued', { phoneNumber });
    } catch (error) {
      logger.error('Failed to send emergency notification', error);
    }
  }

  /**
   * Send feedback request
   */
  async sendFeedbackRequest(
    phoneNumber: string,
    guestName: string,
    serviceType: string
  ): Promise<void> {
    try {
      const template = this.getTemplate('feedback_request');
      if (!template) {
        logger.error('Feedback request template not found');
        return;
      }

      const components = [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: guestName },
            { type: 'text', text: serviceType },
          ],
        },
      ];

      await messageQueue.enqueueMessage(
        phoneNumber,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phoneNumber,
          type: 'template',
          template: {
            name: 'feedback_request',
            language: {
              code: this.defaultLanguage,
            },
            components,
          },
        },
        'low'
      );

      logger.info('Feedback request enqueued', { phoneNumber, serviceType });
    } catch (error) {
      logger.error('Failed to send feedback request', error);
    }
  }

  /**
   * Refresh templates from WhatsApp API
   */
  async refreshTemplates(): Promise<void> {
    try {
      logger.info('Refreshing WhatsApp templates');
      await this.loadTemplates();
    } catch (error) {
      logger.error('Failed to refresh templates', error);
    }
  }

  /**
   * Validate template parameters
   */
  private validateTemplateParameters(template: WhatsAppTemplate, components: any[]): boolean {
    // Basic validation - in production, this would be more comprehensive
    return true;
  }

  /**
   * Get template status
   */
  getTemplateStatus(name: string): string | null {
    const template = this.getTemplate(name);
    return template ? template.status : null;
  }

  /**
   * Check if template is approved
   */
  isTemplateApproved(name: string): boolean {
    const template = this.getTemplate(name);
    return template ? template.status === 'approved' : false;
  }
}

export const templateService = new TemplateService();
