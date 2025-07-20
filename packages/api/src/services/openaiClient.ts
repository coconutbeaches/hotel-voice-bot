import { createReadStream, writeFileSync, unlinkSync, existsSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { execSync } from 'child_process';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { logger } from '../utils/logger.js';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is missing from environment variables');
}

interface OpenAITranscriptionResult {
  text: string;
  language?: string;
  words?: Array<{ word: string; start: number; end: number }>;
  // ...other Whisper fields if needed
}

export const openaiClient = {
  async transcribeAudio(audioBuffer: Buffer, originalMime?: string): Promise<string> {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    // Detect extension and mimetype
    let fileExtension = 'webm';
    let mimeType = 'audio/webm';
    if (originalMime?.includes('mp4')) { fileExtension = 'mp4'; mimeType = 'audio/mp4'; }
    if (originalMime?.includes('wav')) { fileExtension = 'wav'; mimeType = 'audio/wav'; }
    if (originalMime?.includes('webm')) { fileExtension = 'webm'; mimeType = 'audio/webm'; }
    // Header check as fallback
    const header = audioBuffer.slice(0, 12).toString('hex');
    if (header.startsWith('1a45dfa3')) { fileExtension = 'webm'; mimeType = 'audio/webm'; }
    else if (header.startsWith('52494646')) { fileExtension = 'wav'; mimeType = 'audio/wav'; }
    else if (header.includes('667479706d703434') || header.includes('667479706d703432')) { fileExtension = 'mp4'; mimeType = 'audio/mp4'; }
    const origPath = join(tmpdir(), `incoming_${timestamp}_${randomId}.${fileExtension}`);
    writeFileSync(origPath, audioBuffer);
    let finalPath = origPath;
    let finalMime = mimeType;
    // Convert webm/wav/mp4 to wav for maximum Safari/iOS compatibility
    if (fileExtension === 'mp4' || mimeType === 'audio/mp4' || fileExtension === 'webm' || mimeType === 'audio/webm' || fileExtension === 'wav' || mimeType === 'audio/wav') {
      const wavPath = origPath.replace(/\.(mp4|webm|wav)$/, '.wav');
      try {
        execSync(`ffmpeg -y -i "${origPath}" -ar 16000 -acodec pcm_s16le -ac 1 "${wavPath}"`);
        finalPath = wavPath;
        finalMime = 'audio/wav';
        logger.info('[transcribeAudio] Converted input to wav via ffmpeg', { origPath, finalPath });
      } catch (err) {
        logger.error('[transcribeAudio] ffmpeg conversion failed', err);
        throw err;
      }
    }
    // Debug logging
    const debugBytes = audioBuffer.slice(0, 100).toString('base64');

    // Start timer for Whisper latency tracking
    const whisperStart = Date.now();

    logger.info('[transcribeAudio] Ready to upload', {
      uuid: randomId,
      origPath,
      finalPath,
      origMime: mimeType,
      uploadMime: finalMime,
      origSize: audioBuffer.length,
      debugBytes
    });
    // Whisper upload
    const form = new FormData();
    form.append('file', createReadStream(finalPath), {
      filename: `speech.${finalMime === 'audio/wav' ? 'wav' : fileExtension}`,
      contentType: finalMime,
    });
    form.append('model', 'whisper-1');
    form.append('language', 'en');
    form.append('response_format', 'json');
    form.append('timestamp_granularities', JSON.stringify(['word']));
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, ...form.getHeaders() },
      body: form,
    });
    const whisperLatencyMs = Date.now() - whisperStart;
    const resultBody = await response.text();
    let requestSuccess = true;
    let errorMsg = undefined;

    if (!response.ok) {
      requestSuccess = false;
      errorMsg = `Whisper API error: ${resultBody}`;
      logger.error('[transcribeAudio] Whisper error', { uuid: randomId, status: response.status, body: resultBody });
    }
    let result: OpenAITranscriptionResult;
    try {
      result = JSON.parse(resultBody);
    } catch (err) {
      requestSuccess = false;
      errorMsg = 'Whisper non-JSON response: ' + resultBody;
      logger.error('[transcribeAudio] Non-JSON response', { uuid: randomId, resultBody });
      throw new Error(errorMsg);
    }

    // Success/failure log for analytics SQL + downstream views
    logger.info('[whisper-transcription-log]', {
      uuid: randomId,
      userId: (typeof global !== 'undefined' && global.userId) || null, // Attach user if available
      fileType: finalMime,
      fileSize: audioBuffer.length,
      conversionTimeMs: Date.now() - timestamp, // inclusive of prep & ffmpeg
      whisperLatencyMs,
      success: requestSuccess,
      error: errorMsg,
      created_at: new Date().toISOString()
    });
    // Cleanup
    if (existsSync(origPath)) unlinkSync(origPath);
    if (finalPath !== origPath && existsSync(finalPath)) unlinkSync(finalPath);
    return result;
  },

  // ... (leave other methods unchanged) ...
};
