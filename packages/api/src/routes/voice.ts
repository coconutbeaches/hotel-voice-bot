import express, { Router } from 'express';
import multer from 'multer';
import { openaiClient } from '../services/openaiClient.js';

const router: express.Router = Router();
const upload = multer();

router.post('/', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded.' });
    }

    // Transcribe audio
    const transcript = await openaiClient.transcribeAudio(req.file.buffer);
    if (!transcript) {
      return res.status(500).json({ error: 'Failed to transcribe audio.' });
    }

    // Generate response using GPT
    const textResponse = await openaiClient.generateResponse(transcript);
    if (!textResponse) {
      return res.status(500).json({ error: 'Failed to generate text response.' });
    }

    // Convert text response to speech
    const audioResponse = await openaiClient.textToSpeech(textResponse);
    if (!audioResponse) {
      return res.status(500).json({ error: 'Failed to convert text to speech.' });
    }

    // Return audio response
    res.set('Content-Type', 'audio/mp3');
    res.send(audioResponse);
  } catch (error) {
    console.error('Error handling /api/voice request:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;

