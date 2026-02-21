// Calls our own Next.js API route, which securely proxies to the Anthropic API.
// The API key never leaves the server.

export async function callClaude(prompt: string, maxTokens = 2000): Promise<string> {
  const response = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, maxTokens })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API failed: ${response.status}`);
  }

  const data = await response.json();
  return data.text;
}

export async function callClaudeWebSearch(prompt: string, domain: string, maxTokens = 2500): Promise<string> {
  const response = await fetch('/api/claude-web-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, domain, maxTokens })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API failed: ${response.status}`);
  }

  const data = await response.json();
  return data.text;
}
