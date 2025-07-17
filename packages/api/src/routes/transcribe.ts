import fs from 'fs/promises';

import { Router } from 'express';
import multer from 'multer';

import { transcribeAudio } from '../services/openaiClient';

const router = Router();
const upload = multer({ dest: 'uploads/' });

router.post('/', upload.single('audio'), async (req, res) => {
  const filePath = req.file.path;

  try {
    const transcription = await transcribeAudio(filePath);
    res.json({ transcription });
  } catch (error) {
    res.status(500).send('Error processing audio file.');
  } finally {
    await fs.unlink(filePath);
  }
});

export default router;
