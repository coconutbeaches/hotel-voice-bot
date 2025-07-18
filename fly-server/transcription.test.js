const request = require('supertest');
const app = require('../app'); // Adjust the path to point to your app

describe('POST /transcribe', () => {
    it('should respond with a JSON transcript for WAV/MP3 file', async () => {
        const response = await request(app)
            .post('/transcribe')
            .attach('file', 'path/to/sample.wav'); // Specify path to your sample file

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('transcript');
    });
});
