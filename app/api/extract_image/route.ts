import { NextRequest, NextResponse } from 'next/server';

const HYPERBOLIC_API_KEY = process.env.HYPERBOLIC_API_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json();

    const url = 'https://api.hyperbolic.xyz/v1/chat/completions';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${HYPERBOLIC_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'meta-llama/Llama-3.2-90B-Vision-Instruct',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'What is this image?' },
              {
                type: 'image_url',
                image_url: {
                  url: 'https://i.natgeofe.com/n/4f5aaece-3300-41a4-b2a8-ed2708a0a27c/domestic-dog_thumb_square.jpg',
                },
              },
            ],
          },
        ],
        max_tokens: 2048,
        temperature: 0.7,
        top_p: 0.9,
        stream: false,
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch response from Hyperbolic API' },
        { status: response.status }
      );
    }

    const json = await response.json();
    const output = json.choices[0].message.content;

    return NextResponse.json({ output });
  } catch (error) {
    return NextResponse.json(
      { error: 'Something went wrong', details: error },
      { status: 500 }
    );
  }
}
