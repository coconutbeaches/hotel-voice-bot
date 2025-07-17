/* eslint-env node */

import fs from 'fs/promises';
import path from 'path';

import fetch from 'node-fetch';

const TRANSCRIBE_URL = 'https://hotel-voice-bot.vercel.app/api/transcribe';

async function testTranscribe(audioFilePath) {
  try {
    // Read the audio file as binary buffer
    console.log(`📁 Reading audio file: ${audioFilePath}`);
    const audioBuffer = await fs.readFile(audioFilePath);
    console.log(`✅ Audio file size: ${audioBuffer.length} bytes`);

    // Determine content type based on file extension
    const ext = path.extname(audioFilePath).toLowerCase();
    const contentTypeMap = {
      '.webm': 'audio/webm',
      '.wav': 'audio/wav',
      '.mp3': 'audio/mpeg',
      '.ogg': 'audio/ogg',
      '.m4a': 'audio/mp4',
    };
    const contentType = contentTypeMap[ext] || 'audio/webm';

    console.log(`\n🚀 Sending request to: ${TRANSCRIBE_URL}`);
    console.log(`📤 Content-Type: ${contentType}`);
    console.log(`📤 Body: Raw binary buffer (${audioBuffer.length} bytes)`);

    // Send the request exactly as the voice widget would
    const response = await fetch(TRANSCRIBE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
      },
      body: audioBuffer, // Send raw binary data
    });

    console.log(
      `\n📥 Response status: ${response.status} ${response.statusText}`
    );
    console.log(
      `📥 Response headers:`,
      Object.fromEntries(response.headers.entries())
    );

    // Parse the JSON response
    const data = await response.json();

    if (response.ok) {
      console.log(`\n✅ Success! Transcription received:`);
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(`\n❌ Error response:`);
      console.log(JSON.stringify(data, null, 2));
    }

    return data;
  } catch (error) {
    console.error(`\n❌ Request failed:`, error.message);
    throw error;
  }
}

// Usage instructions
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
🎤 Voice Widget Audio Transcription Test

Usage:
  node test-transcribe.js <audio-file-path>

Examples:
  node test-transcribe.js sample.webm
  node test-transcribe.js test.wav
  node test-transcribe.js recording.mp3

Supported formats: .webm, .wav, .mp3, .ogg, .m4a
`);
    process.exit(1);
  }

  const audioFile = args[0];

  // Check if file exists
  try {
    await fs.access(audioFile);
  } catch (error) {
    console.error(`❌ Error: File not found: ${audioFile}`);
    process.exit(1);
  }

  // Run the test
  console.log('🎯 Testing voice widget transcription endpoint...\n');
  await testTranscribe(audioFile);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
