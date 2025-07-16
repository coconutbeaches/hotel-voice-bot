import express from 'express';
import request from 'supertest';

import healthRouter from '../health.js';

const app = express();
app.use('/api/health', healthRouter);

describe('GET /api/health', () => {
  it('should return health status', async () => {
    const response = await request(app).get('/api/health').expect(200);

    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('uptime');
    expect(typeof response.body.uptime).toBe('number');
  });
});
