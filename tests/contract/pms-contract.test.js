const axios = require('axios');
const { expect } = require('@jest/globals');

// Sample configuration
const PMS_SANDBOX_URL = process.env.PMS_SANDBOX_URL || 'http://localhost:3002';
const PMS_SANDBOX_API_KEY = process.env.PMS_SANDBOX_API_KEY || 'test-pms-api-key';

// Test cases for PMS contracts

describe('PMS Sandbox Contract Tests', () => {
  
  test('Get availability contract', async () => {
    const roomType = 'Deluxe';
    const startDate = '2024-01-01';
    const endDate = '2024-01-07';
    
    const response = await axios.get(`${PMS_SANDBOX_URL}/availability`, {
      params: { roomType, startDate, endDate },
      headers: { 
        'Authorization': `Bearer ${PMS_SANDBOX_API_KEY}` 
      }
    });
    
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data).toHaveProperty('data');
    expect(response.data.data).toBeInstanceOf(Array);
  });

  test('Create reservation contract', async () => {
    const guestData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      checkInDate: '2024-01-01',
      checkOutDate: '2024-01-07',
      roomNumber: '101'
    };

    const reservationData = {
      roomId: '101',
      checkInDate: '2024-01-01',
      checkOutDate: '2024-01-07',
      status: 'confirmed',
      roomType: 'Deluxe',
      rateCode: 'BAR',
      totalAmount: 1000,
      currency: 'USD'
    };

    const response = await axios.post(`${PMS_SANDBOX_URL}/reservations`, {
      guest: guestData,
      reservation: reservationData,
    }, {
      headers: { 
        'Authorization': `Bearer ${PMS_SANDBOX_API_KEY}`
      }
    });

    expect(response.status).toBe(201);
    expect(response.data).toHaveProperty('data');
    expect(response.data.data).toHaveProperty('confirmationNumber');
  });

  test('Update reservation contract', async () => {
    const reservationId = 'res_001';
    const updates = {
      status: 'cancelled',
      specialRequests: ['Close to elevator']
    };

    const response = await axios.patch(`${PMS_SANDBOX_URL}/reservations/${reservationId}`, updates, {
      headers: { 
        'Authorization': `Bearer ${PMS_SANDBOX_API_KEY}`
      }
    });

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('data');
    expect(response.data.data.status).toBe('cancelled');
  });

  test('Get reservation contract', async () => {
    const reservationId = 'res_001';

    const response = await axios.get(`${PMS_SANDBOX_URL}/reservations/${reservationId}`, {
      headers: { 
        'Authorization': `Bearer ${PMS_SANDBOX_API_KEY}`
      }
    });

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('data');
    expect(response.data.data).toHaveProperty('roomNumber');
  });

  test('Health Check', async () => {
    const response = await axios.get(`${PMS_SANDBOX_URL}/health`);

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('status', 'healthy');
  });

  test('Guest Folio contract', async () => {
    const guestId = 'guest_001';

    const response = await axios.get(`${PMS_SANDBOX_URL}/guests/${guestId}/folio`, {
      headers: {
        'Authorization': `Bearer ${PMS_SANDBOX_API_KEY}`
      }
    });

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('data');
    expect(response.data.data).toHaveProperty('charges');
  });
  
});

