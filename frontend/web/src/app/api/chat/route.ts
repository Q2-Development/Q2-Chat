import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { message, model, chatId, openRouterApiKey } = await request.json();
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get('sb-access-token');

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (tokenCookie) {
      headers['Authorization'] = `Bearer ${tokenCookie.value}`;
    }

    const body = {
        model: model,
        prompt: message,
        chatId: chatId,
        key: openRouterApiKey 
    };

    const backendResponse = await fetch(`${process.env.FASTAPI_URL || 'http://localhost:8000'}/chat/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!backendResponse.ok) {
      const error = await backendResponse.json();
      throw new Error(error.detail || `Backend responded with status: ${backendResponse.status}`);
    }

    const stream = new ReadableStream({
      start(controller) {
        const reader = backendResponse.body?.getReader();
        
        function pump(): Promise<void> {
          return reader!.read().then(({ done, value }) => {
            if (done) {
              controller.close();
              return;
            }
            controller.enqueue(value);
            return pump();
          });
        }
        
        return pump();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });

  } catch (error) {
    console.error('Error processing chat message:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}