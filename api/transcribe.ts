import fs from 'fs/promises';

import { IncomingForm } from 'formidable';
import multer from 'multer';

import { transcribeAudio } from '../packages/api/src/services/openaiClient';

const upload = multer({ dest: 'uploads/' });

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const form = new IncomingForm();

    form.parse(req, async (err, fields, files) => {
      if (err) {
        return res.status(500).json({ error: 'Error parsing form' });
      }

      const filePath = files.audio.filepath;

      try {
        const transcription = await transcribeAudio(filePath);
        res.json({ transcription });
      } catch (error) {
        res.status(500).json({ error: 'Error processing audio file.' });
      } finally {
        await fs.unlink(filePath);
      }
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
