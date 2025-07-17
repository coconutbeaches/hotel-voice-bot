import fs from 'fs/promises';

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { IncomingForm } from 'formidable';

import { transcribeAudio } from '../packages/api/src/services/openaiClient.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    const form = new IncomingForm();

    form.parse(req, async (err, fields, files) => {
      if (err) {
        return res.status(500).json({ error: 'Error parsing form' });
      }

      const file = Array.isArray(files.audio) ? files.audio[0] : files.audio;
      if (!file) {
        return res.status(400).json({ error: 'No audio file provided' });
      }

      const filePath = file.filepath;

      try {
        const transcription = await transcribeAudio(filePath);
        res.json({ transcription });
      } catch (error) {
        console.error('Transcription error:', error);
        res.status(500).json({ error: 'Error processing audio file.' });
      } finally {
        await fs.unlink(filePath);
      }
    });
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: 'Method not allowed' });
  }
}
