import request from 'supertest';
import express from 'express';
import whatsappRouter from '../whatsapp';
import { wahaClient } from '../../services/whatsapp/wahaClient';

jest.mock('../../services/whatsapp/wahaClient');

const app = express();
app.use(express.json());
app.use('/api/whatsapp', whatsappRouter);

describe('WhatsApp Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /webhook', () => {
    it('should verify webhook token successfully', async () => {
      (wahaClient.verifyWebhookToken as jest.Mock).mockReturnValue(true);

      const response = await request(app)
        .get('/api/whatsapp/webhook')
        .query({ token: 'valid-token' });

      expect(response.status).toBe(200);
      expect(response.text).toBe('Token verified');
    });

    it('should reject invalid webhook token', async () => {
      (wahaClient.verifyWebhookToken as jest.Mock).mockReturnValue(false);

      const response = await request(app)
        .get('/api/whatsapp/webhook')
        .query({ token: 'invalid-token' });

      expect(response.status).toBe(403);
      expect(response.text).toBe('Verification failed');
    });
  });

  describe('POST /webhook', () => {
    it('should process incoming message successfully', async () => {
      (wahaClient.verifyWebhookToken as jest.Mock).mockReturnValue(true);
      (wahaClient.sendTextMessage as jest.Mock).mockResolvedValue({ messageId: 'test-id' });

      const messagePayload = {
        id: 'msg-123',
        from: '1234567890@c.us',
        body: 'Hello',
        type: 'text',
        timestamp: Date.now(),
        fromMe: false,
        hasMedia: false,
      };

      const response = await request(app)
        .post('/api/whatsapp/webhook')
        .query({ token: 'valid-token' })
        .send(messagePayload);

      expect(response.status).toBe(200);
      expect(response.text).toBe('EVENT_RECEIVED');
      expect(wahaClient.sendTextMessage).toHaveBeenCalledWith('1234567890@c.us', 'You said: Hello');
    });

    it('should reject invalid webhook token', async () => {
      (wahaClient.verifyWebhookToken as jest.Mock).mockReturnValue(false);

      const response = await request(app)
        .post('/api/whatsapp/webhook')
        .query({ token: 'invalid-token' })
        .send({});

      expect(response.status).toBe(403);
      expect(response.text).toBe('Invalid token');
    });
  });
});
