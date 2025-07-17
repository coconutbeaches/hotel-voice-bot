import nock from 'nock';
import { wahaClient } from '../wahaClient';

beforeAll(() => {
  nock.disableNetConnect();
});

afterAll(() => {
  nock.enableNetConnect();
  nock.cleanAll();
});

describe('WAHA API Client', () => {
  const baseUrl = process.env.WAHA_API_URL || 'http://localhost:3000';

  it('should send a text message successfully', async () => {
    const phoneNumber = '1234567890';
    const text = 'Hello World';
    
    nock(baseUrl)
      .post('/api/sendText')
      .reply(200, { id: 'message-id-1' });

    const response = await wahaClient.sendTextMessage(phoneNumber, text);
    expect(response.messageId).toEqual('message-id-1');
  });

  it('should start a session successfully', async () => {
    nock(baseUrl)
      .post('/api/sessions/start')
      .reply(200, { name: 'default', status: 'WORKING' });

    const session = await wahaClient.startSession();
    expect(session.status).toEqual('WORKING');
  });

  it('should handle errors when sending a message', async () => {
    nock(baseUrl)
      .post('/api/sendText')
      .reply(500, { message: 'Internal Server Error' });

    await expect(wahaClient.sendTextMessage('1234567890', 'Oops')).rejects.toThrow('Failed to send text message');
  });
});

