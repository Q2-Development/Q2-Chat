import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    // TODO: We need to replace this with the actual backend URL
    const reply = `I received your message: "${message}". This is a mock response.`;

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Error processing chat message:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
} 