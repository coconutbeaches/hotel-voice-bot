import { createReadStream, writeFileSync, unlinkSync, existsSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';

// Test the exact flow that will be used in production
async function testWhisperFlow() {
  console.log('🔧 Testing Whisper API flow...');
  
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not found in environment');
    return;
  }
  
  // Create a test WebM file (minimal content for testing)
  const testBuffer = Buffer.from([
    0x1A, 0x45, 0xDF, 0xA3, // WebM signature
    0x00, 0x00, 0x00, 0x20, // Some minimal WebM data
    0x42, 0x86, 0x81, 0x01, // Just enough to pass basic WebM validation
  ]);
  
  const tempFilePath = join(tmpdir(), `test_audio_${Date.now()}.webm`);
  
  try {
    console.log(`📝 Creating test file: ${tempFilePath}`);
    writeFileSync(tempFilePath, testBuffer);
    
    const fileStats = statSync(tempFilePath);
    console.log(`✅ File created: ${fileStats.size} bytes`);
    
    // Test form creation
    const form = new FormData();
    form.append('file', createReadStream(tempFilePath), {
      filename: 'audio.webm',
      contentType: 'audio/webm'
    });
    form.append('model', 'whisper-1');
    form.append('response_format', 'json');
    form.append('language', 'en');
    
    console.log('📤 Sending request to OpenAI Whisper API...');
    
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        ...form.getHeaders()
      },
      body: form
    });
    
    console.log(`📥 Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`❌ OpenAI API error: ${errorBody}`);
      return;
    }
    
    const result = await response.json();
    console.log('✅ API Response:', result);
    
    if (result.text) {
      console.log('🎉 Transcription successful:', result.text);
    } else {
      console.warn('⚠️ No text field in response');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (existsSync(tempFilePath)) {
      unlinkSync(tempFilePath);
      console.log('🧹 Cleaned up test file');
    }
  }
}

// Run the test
testWhisperFlow();
