import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch(`${process.env.FASTAPI_URL || 'http://localhost:8000'}/models`, {
      headers: {
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error(`FastAPI responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching models from FastAPI:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}