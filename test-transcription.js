import { openaiClient } from './packages/integrations/src/openai/index.js';
import { readFileSync } from 'fs';
import { join } from 'path';

async function testTranscription() {
  try {
    // Create a simple test buffer (you can replace with actual audio file)
    console.log('🔧 Testing Whisper transcription...');
    
    // For testing, let's create a minimal WebM buffer
    // In real usage, this would be the actual audio data from MediaRecorder
    const testBuffer = Buffer.from('test audio data');
    
    console.log('📤 Sending buffer to transcription service...');
    const result = await openaiClient.transcribeAudio(testBuffer);
    
    console.log('✅ Transcription result:', result);
    
  } catch (error) {
    console.error('❌ Transcription test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testTranscription();
