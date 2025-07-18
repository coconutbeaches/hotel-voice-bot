// /apps/web/app/api/transcribe/route.ts

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge'; // Optional: remove if using Node.js runtime

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('audio/webm')) {
      return NextResponse.json(
        { error: 'Unsupported content type' },
        { status: 400 }
      );
    }

    const audioBuffer = await req.arrayBuffer();

    const formData = new FormData();
    formData.append(
      'file',
      new Blob([audioBuffer], { type: 'audio/webm' }),
      'audio.webm'
    );
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');

    const openaiRes = await fetch(
      'https://api.openai.com/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
        },
        body: formData,
      }
    );

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error('[OpenAI Whisper error]', openaiRes.status, errText);
      return NextResponse.json(
        { error: 'Transcription failed', details: errText },
        { status: 500 }
      );
    }

    const data = await openaiRes.json();
    return NextResponse.json({ transcription: data.text });
  } catch (err: any) {
    console.error('[Transcription error]', err);
    return NextResponse.json(
      { error: 'Internal error', message: err.message },
      { status: 500 }
    );
  }
}
