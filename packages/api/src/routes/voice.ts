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
    
    let transcript;
    try {
      // Transcribe audio
      transcript = await openaiClient.transcribeAudio(req.file.buffer);
      if (!transcript) {
        return res.status(500).json({ error: 'Failed to transcribe audio.' });
      }
    } catch (error) {
      console.error('Error transcribing audio:', error);
      return res.status(500).json({ error: 'Failed to transcribe audio.', details: error.message });
    }

    // Generate response using GPT
    let textResponse;
    try {
      textResponse = await openaiClient.generateResponse(transcript);
      if (!textResponse) {
        return res.status(500).json({ error: 'Failed to generate text response.' });
      }
    } catch (error) {
      console.error('Error generating response:', error);
      return res.status(500).json({ error: 'Failed to generate text response.', details: error.message });
    }

    // Convert text response to speech
    let audioResponse;
    try {
      audioResponse = await openaiClient.textToSpeech(textResponse);
      if (!audioResponse) {
        return res.status(500).json({ error: 'Failed to convert text to speech.' });
      }
    } catch (error) {
      console.error('Error converting text to speech:', error);
      return res.status(500).json({ error: 'Failed to convert text to speech.', details: error.message });
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

