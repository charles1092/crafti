import React from 'react';

// Count words in text
export function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

// Parse JSON safely from Claude responses
export function parseJSON(text: string) {
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('JSON parse error:', e, text);
    throw new Error('Failed to parse response');
  }
}

// Typewriter effect
export function typewriter(
  text: string,
  callback: (text: string) => void,
  speed = 3
): void {
  let idx = 0;
  const type = () => {
    if (idx < text.length) {
      callback(text.slice(0, idx + 3));
      idx += 3;
      setTimeout(type, speed);
    }
  };
  type();
}

// Render markdown to React elements
export function renderMarkdown(text: string): React.ReactNode[] | null {
  if (!text) return null;

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentParagraph: string[] = [];

  const formatLine = (line: string) => {
    return line
      .replace(/\[Insert([^\]]+)\]/g, '<span class="bg-yellow-200 px-2 py-1 rounded font-semibold text-yellow-900">[Insert$1]</span>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
  };

  lines.forEach((line) => {
    if (line.startsWith('### ')) {
      if (currentParagraph.length > 0) {
        elements.push(React.createElement('p', { key: `p-${elements.length}`, className: 'mb-4', dangerouslySetInnerHTML: { __html: formatLine(currentParagraph.join('\n')).replace(/\n/g, '<br />') } }));
        currentParagraph = [];
      }
      elements.push(React.createElement('h3', { key: `h3-${elements.length}`, className: 'text-lg font-bold text-gray-900 mt-4 mb-2', dangerouslySetInnerHTML: { __html: formatLine(line.replace('### ', '')) } }));
    } else if (line.startsWith('## ')) {
      if (currentParagraph.length > 0) {
        elements.push(React.createElement('p', { key: `p-${elements.length}`, className: 'mb-4', dangerouslySetInnerHTML: { __html: formatLine(currentParagraph.join('\n')).replace(/\n/g, '<br />') } }));
        currentParagraph = [];
      }
      elements.push(React.createElement('h2', { key: `h2-${elements.length}`, className: 'text-xl font-bold text-gray-900 mt-5 mb-3', dangerouslySetInnerHTML: { __html: formatLine(line.replace('## ', '')) } }));
    } else if (line.startsWith('# ')) {
      if (currentParagraph.length > 0) {
        elements.push(React.createElement('p', { key: `p-${elements.length}`, className: 'mb-4', dangerouslySetInnerHTML: { __html: formatLine(currentParagraph.join('\n')).replace(/\n/g, '<br />') } }));
        currentParagraph = [];
      }
      elements.push(React.createElement('h1', { key: `h1-${elements.length}`, className: 'text-2xl font-bold text-gray-900 mt-6 mb-3', dangerouslySetInnerHTML: { __html: formatLine(line.replace('# ', '')) } }));
    } else if (line.trim() === '') {
      if (currentParagraph.length > 0) {
        elements.push(React.createElement('p', { key: `p-${elements.length}`, className: 'mb-4', dangerouslySetInnerHTML: { __html: formatLine(currentParagraph.join('\n')).replace(/\n/g, '<br />') } }));
        currentParagraph = [];
      }
    } else {
      currentParagraph.push(line);
    }
  });

  if (currentParagraph.length > 0) {
    elements.push(React.createElement('p', { key: `p-${elements.length}`, className: 'mb-4', dangerouslySetInnerHTML: { __html: formatLine(currentParagraph.join('\n')).replace(/\n/g, '<br />') } }));
  }

  return elements;
}

// Copy rich HTML to clipboard (Word-compatible)
export async function copyToClipboardRich(
  content: string,
  contentType: string,
  setIsCopied: (v: boolean) => void
): Promise<void> {
  try {
    const lines = content.split('\n');
    let html = `<div style="font-family: 'Calibri', 'Arial', sans-serif;">`;
    html += `<h2 style="color: #000006; font-size: 20px; margin-bottom: 20px;">${contentType.toUpperCase()}</h2>`;
    html += `<hr style="border: 1px solid #6C5CE7; margin-bottom: 20px;" />`;

    lines.forEach(line => {
      if (line.startsWith('# ')) {
        html += `<h1 style="color: #000006; font-size: 22px; margin-top: 20px; margin-bottom: 12px;">${line.replace('# ', '')}</h1>`;
      } else if (line.startsWith('## ')) {
        html += `<h2 style="color: #000006; font-size: 20px; margin-top: 18px; margin-bottom: 10px;">${line.replace('## ', '')}</h2>`;
      } else if (line.startsWith('### ')) {
        html += `<h3 style="color: #000006; font-size: 18px; margin-top: 16px; margin-bottom: 8px;">${line.replace('### ', '')}</h3>`;
      } else if (line.trim().length > 0) {
        const formatted = line
          .replace(/\[Insert([^\]]+)\]/g, '<span style="background-color: #FFF3CD; padding: 2px 6px; border-radius: 3px; font-weight: 600;">[Insert$1]</span>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*([^*]+)\*/g, '<em>$1</em>');
        html += `<p style="margin-bottom: 10px; line-height: 1.6;">${formatted}</p>`;
      }
    });

    html += `<hr style="border: 1px solid #6C5CE7; margin-top: 30px; margin-bottom: 10px;" />`;
    html += `<p style="font-style: italic; color: #666; font-size: 12px;">Generated by Crafti</p>`;
    html += `</div>`;

    const plainText = content.replace(/\*\*/g, '').replace(/\*/g, '').replace(/^#+\s/gm, '');

    const clipboardItem = new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([plainText], { type: 'text/plain' })
    });

    await navigator.clipboard.write([clipboardItem]);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  } catch {
    try {
      const plainText = content.replace(/\*\*/g, '').replace(/\*/g, '').replace(/^#+\s/gm, '');
      await navigator.clipboard.writeText(plainText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      alert('Failed to copy');
    }
  }
}

// Detect if user message is a question or a modification request
export function detectIntent(message: string): 'modification' | 'question' {
  const lowerMsg = message.toLowerCase().trim();

  const modificationKeywords = [
    'make', 'change', 'rewrite', 'add', 'remove', 'delete', 'improve',
    'shorten', 'expand', 'strengthen', 'weaken', 'rephrase', 'revise',
    'edit', 'update', 'modify', 'adjust', 'fix', 'enhance', 'reduce',
    'increase', 'clarify', 'simplify', 'elaborate', 'insert', 'replace',
    'more concise', 'less formal', 'more formal', 'less technical',
    'more detail', 'cut', 'trim'
  ];

  const questionKeywords = [
    'what', 'how', 'why', 'when', 'where', 'who', 'which',
    'should we', 'could we', 'would', 'can you', 'do you think',
    'is there', 'are there', 'does this', 'will this',
    'tell me', 'explain', 'list', 'identify', 'analyse', 'analyze'
  ];

  if (lowerMsg.includes('?')) return 'question';

  for (const keyword of modificationKeywords) {
    if (lowerMsg.includes(keyword)) return 'modification';
  }

  for (const keyword of questionKeywords) {
    if (lowerMsg.startsWith(keyword)) return 'question';
  }

  return 'question';
}

// Score colours
export function scoreColor(score: number): string {
  if (score >= 8) return 'bg-[#6C5CE7]';
  if (score >= 6) return 'bg-yellow-600';
  if (score >= 4) return 'bg-orange-600';
  return 'bg-red-600';
}

export function scoreBorder(score: number): string {
  if (score >= 8) return 'border-[#A29BFE] bg-purple-50';
  if (score >= 6) return 'border-yellow-200 bg-yellow-50';
  if (score >= 4) return 'border-orange-200 bg-orange-50';
  return 'border-red-200 bg-red-50';
}

export function sentimentColor(sentiment: string): string {
  if (sentiment === 'Very Positive') return 'bg-green-600';
  if (sentiment === 'Positive') return 'bg-green-500';
  if (sentiment === 'Mixed') return 'bg-yellow-500';
  if (sentiment === 'Neutral') return 'bg-gray-500';
  if (sentiment === 'Concerned') return 'bg-orange-500';
  return 'bg-red-600';
}

// Extract domain from URL
export function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return null;
  }
}
