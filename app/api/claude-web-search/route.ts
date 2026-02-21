import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Anthropic API key not configured. Add ANTHROPIC_API_KEY to your environment variables.' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { prompt, domain, maxTokens = 2500 } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    const clampedTokens = Math.min(Math.max(Number(maxTokens) || 2500, 50), 4096);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: clampedTokens,
        tools: [{
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 5,
          ...(domain ? { allowed_domains: [domain] } : {})
        }],
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', response.status, errorText);
      return NextResponse.json(
        { error: `Claude API returned ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const textContent = data.content
      ?.filter((block: { type: string }) => block.type === 'text')
      .map((block: { text: string }) => block.text)
      .join('\n') || '';

    return NextResponse.json({ text: textContent });
  } catch (error) {
    console.error('Web search API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
