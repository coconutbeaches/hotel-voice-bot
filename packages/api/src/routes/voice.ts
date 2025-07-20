import express, { Router } from 'express';
import multer from 'multer';
import { openaiClient } from '../services/openaiClient.js';
import FileType from 'file-type';

const router: express.Router = Router();
const upload = multer();

const SUPPORTED_MIME = [
  'audio/mp4',
  'audio/webm',
  'audio/ogg',
  'audio/wav',
  'audio/mpeg',
  'audio/mp3',
];

function isSupported(mime: string) {
  return SUPPORTED_MIME.includes(mime);
}

router.post('/', upload.single('audio'), async (req, res) => {
  try {
    let audioBuffer: Buffer | undefined;
    let mimeType: string | undefined;

    // Accept multipart/form-data (req.file) or raw/base64 (req.body.audio)
    if (req.file) {
      audioBuffer = req.file.buffer;
      mimeType = req.file.mimetype;
    } else if (typeof req.body === 'object' && req.body.audio) {
      // Base64 payload support (e.g. { audio: "..." })
      const base64 = req.body.audio.replace(/^data:.*;base64,/, '');
      audioBuffer = Buffer.from(base64, 'base64');
      mimeType = req.body.mimeType; // allow client to optionally provide
    }

    // No audio upload
    if (!audioBuffer || audioBuffer.length === 0) {
      return res.status(400).json({ error: 'No audio provided. Send as multipart/form-data or base64.' });
    }

    // Try to detect type from content
    let detectedType;
    try {
      detectedType = await FileType.fromBuffer(audioBuffer);
    } catch (e) {
      detectedType = undefined;
    }
    const finalMime = mimeType || (detectedType ? detectedType.mime : undefined);
    if (!finalMime || !isSupported(finalMime)) {
      return res.status(415).json({ error: `Unsupported or unknown audio format: ${finalMime ?? 'unknown'}. Supported: ${SUPPORTED_MIME.join(', ')}` });
    }

    let transcriptResult;
    try {
      transcriptResult = await openaiClient.transcribeAudio(audioBuffer, finalMime);
      if (!transcriptResult) {
        return res.status(500).json({ error: 'Failed to transcribe audio.' });
      }
    } catch (error: any) {
      console.error('Error transcribing audio:', error);
      return res.status(500).json({ error: 'Failed to transcribe audio.', details: error.message });
    }
    // Return just transcription details JSON (no TTS pipeline)
    // To keep endpoint one-shot and strictly return {text, language, words}
    return res.status(200).json(transcriptResult);
  } catch (error: any) {
    console.error('Error handling /api/voice request:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;

