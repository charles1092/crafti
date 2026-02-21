// Script to transform the original Quantium JSX into the Crafti Next.js component
import { readFileSync, writeFileSync } from 'fs';

const src = readFileSync('/workspace/comms-toolkit/Quantium_Communications_Toolkit__Final v2.jsx', 'utf-8');

// Start building the new file
let lines = src.split('\n');

// 1. Replace the import header and add 'use client'
const newHeader = `'use client';

import React, { useState, useEffect } from 'react';
import { Upload, Loader2, CheckCircle, AlertCircle, TrendingUp, Send, Download, RotateCcw, FileText, X, Sparkles, Eye, EyeOff, PenTool, Users, Shield, Newspaper, Lightbulb, MessageSquare, Copy, Trash2, Award, List, Target, Search, Layout, UserCheck, Settings, ChevronDown, Edit3, Plus, Home } from 'lucide-react';
import { callClaude, callClaudeWebSearch } from '@/lib/api';
import { storage } from '@/lib/storage';
import { readFileContent, validateWordCount } from '@/lib/file-handlers';
`;

// Find where the function starts (line 13 in original: export default function...)
let funcStartIdx = lines.findIndex(l => l.includes('export default function'));

// Take the body from funcStartIdx onwards
let body = lines.slice(funcStartIdx).join('\n');

// 2. Rename the component
body = body.replace('export default function QuantiumCommunicationsTool()', 'export default function CraftiApp()');

// 3. Replace DEFAULT_QUANTIUM_STYLE
body = body.replace(/DEFAULT_QUANTIUM_STYLE/g, 'DEFAULT_CRAFTI_STYLE');
body = body.replace(
  /const DEFAULT_CRAFTI_STYLE = \{[\s\S]*?isDefault: true\n\s*\};/,
  `const DEFAULT_CRAFTI_STYLE = {
    id: 'crafti-default',
    name: 'Professional',
    content: \`Tone & Style:
- Write in a simple, accessible manner, avoid jargon and make content clear, direct, and concise to all audiences
- Be humble and personable rather than boastful - focus on possibilities rather than bragging
- Keep content robust and commercially applicable with real-world outcomes

Formatting & Grammar:
- Use sentence case for all headings (capitalise only the first word and proper nouns)
- Use complete sentences (write "and" not "&")
- Use spaces before and after slashes (e.g. "and / or")
- Single quotes for emphasis, double quotes for actual quotations
- Keep decimals to maximum 2 decimal places (9.66% or 9.7%)

Australian English spelling and conventions should be used throughout.\`,
    createdAt: 0,
    isDefault: true
  };`
);

// 4. Replace all window.storage usage with localStorage storage helper
// Pattern: await window.storage.get('quantium-comms-XXX', false) -> storage.get('XXX')
// Pattern: await window.storage.set('quantium-comms-XXX', value, false) -> storage.set('XXX', value)
// Also: typeof window.storage === 'undefined' || !window.storage checks

// Replace storage availability checks - they become always-available
body = body.replace(/if \(typeof window\.storage === 'undefined' \|\| !window\.storage\) \{[\s\S]*?return;\s*\}/g, '// localStorage is always available in browser');
body = body.replace(/if \(typeof window\.storage !== 'undefined' && window\.storage\) \{/g, 'if (typeof window !== "undefined") {');
body = body.replace(/if \(window\.storage\) \{/g, 'if (typeof window !== "undefined") {');

// Replace get operations
body = body.replace(/const (\w+) = await window\.storage\.get\('quantium-comms-(\w+(?:-\w+)*)'\s*,\s*false\);/g, (match, varName, key) => {
  const newKey = key.replace('quantium-comms-', '');
  return `const ${varName} = storage.get('${newKey}');`;
});
body = body.replace(/await window\.storage\.get\('quantium-comms-(\w+(?:-\w+)*)'\s*,\s*false\)/g, (match, key) => {
  const newKey = key.replace('quantium-comms-', '');
  return `storage.get('${newKey}')`;
});

// Replace set operations
body = body.replace(/await window\.storage\.set\('quantium-comms-(\w+(?:-\w+)*)'\s*,\s*(.*?)\s*,\s*false\)/g, (match, key, value) => {
  const newKey = key.replace('quantium-comms-', '');
  return `storage.set('${newKey}', ${value})`;
});

// Handle the storage loading patterns - make them synchronous
// The load patterns check result && result.value - but our storage.get returns string directly
body = body.replace(/if \((\w+) && \1\.value\) \{/g, 'if ($1) {');
body = body.replace(/(\w+)\.value/g, (match, varName) => {
  // Only replace if it looks like a storage result, not a mammoth result or other
  if (['result', 'companyResult', 'validationResult', 'websiteContextResult', 'descriptionResult'].includes(varName)) {
    return varName;
  }
  return match;
});

// Fix the JSON parse of storage results - they're already strings, not {value: string}
// Pattern: JSON.parse(result.value) should become JSON.parse(result)
// But we already replaced result.value with result above

// 5. Replace direct API calls with our proxy
// The callClaude function is already defined - replace the inline one
body = body.replace(
  /\/\/ Call Claude API[\s\S]*?return data\.content\[0\]\.text;\s*\};/,
  '// callClaude is imported from @/lib/api'
);

// Replace the web search API call
body = body.replace(
  /const response = await fetch\('https:\/\/api\.anthropic\.com\/v1\/messages'[\s\S]*?'Content-Type': 'application\/json',[\s\S]*?tools: \[\{[\s\S]*?type: 'web_search/,
  (match) => {
    // This is the searchCompanyWebsite function - we need to rewrite it
    return match; // We'll handle this differently
  }
);

// 6. Replace the searchCompanyWebsite function to use callClaudeWebSearch
const searchFuncStart = body.indexOf('const searchCompanyWebsite = async ()');
const searchFuncEnd = body.indexOf('setIsSearchingWebsite(false);\n    }\n  };', searchFuncStart);
if (searchFuncStart > -1 && searchFuncEnd > -1) {
  const beforeSearch = body.slice(0, searchFuncStart);
  const afterSearch = body.slice(searchFuncEnd + 'setIsSearchingWebsite(false);\n    }\n  };'.length);

  const newSearchFunc = `const searchCompanyWebsite = async () => {
    if (!companyWebsiteUrl.trim()) {
      setError('Please enter a company website URL');
      return;
    }

    const domain = extractDomain(companyWebsiteUrl);
    if (!domain) {
      setError('Please enter a valid URL (e.g., https://www.example.com)');
      return;
    }

    setError('');
    setIsSearchingWebsite(true);
    setWebSearchStatus('Connecting to website...');

    const statusMessages = [
      'Connecting to website...',
      'Searching for company information...',
      'Gathering details from multiple pages...',
      'Extracting key information...',
      'Compiling company profile...',
      'Almost there...'
    ];
    let statusIndex = 0;
    const statusInterval = setInterval(() => {
      statusIndex = (statusIndex + 1) % statusMessages.length;
      setWebSearchStatus(statusMessages[statusIndex]);
    }, 4000);

    try {
      const prompt = \`Search and gather comprehensive information about the company from their website: \${companyWebsiteUrl}

Please search their website and extract the following information:
1. Official company name
2. What the company does (products/services)
3. Industry/sector
4. Target customers/market
5. Company mission or values (if available)
6. Key leadership (CEO, executives - if available)
7. Headquarters location
8. Any other notable facts (size, history, achievements)

Format your response in TWO parts:

SUMMARY:
Write exactly 2-3 sentences describing what the company does. Start directly with the company name - no preamble, no "Based on my search", no headers, no markdown. Just plain sentences.

---DETAILED---

Then provide a comprehensive structured summary for context.

CRITICAL RULES:
1. The SUMMARY section must be plain text only. No headers, no "##", no "PART 1", no "Based on my search". Start directly with "[Company name] is..." or "[Company name] provides..."
2. Use British English spelling throughout (e.g., "specialises" not "specializes", "organised" not "organized", "colour" not "color").\`;

      const textContent = await callClaudeWebSearch(prompt, domain, 2500);

      clearInterval(statusInterval);
      setWebSearchStatus('Processing results...');

      if (textContent) {
        let summary = '';
        let fullContext = textContent;

        if (textContent.includes('---DETAILED---')) {
          const parts = textContent.split('---DETAILED---');
          summary = parts[0].trim();
          fullContext = parts[1]?.trim() || textContent;
        } else {
          const sentences = textContent.split(/[.!?]+/).filter(s => s.trim());
          summary = sentences.slice(0, 2).join('. ').trim();
          if (summary && !summary.endsWith('.')) summary += '.';
        }

        summary = summary
          .replace(/^#+\\s*/gm, '')
          .replace(/^\\*+\\s*/gm, '')
          .replace(/^PART\\s*\\d+[:\\-\\s]*/gi, '')
          .replace(/^SUMMARY[:\\-\\s]*/gi, '')
          .replace(/^BRIEF SUMMARY[:\\-\\s]*/gi, '')
          .replace(/^Based on (my |the )?search results?,?\\s*/gi, '')
          .replace(/^I can provide (comprehensive )?information about [^.]+\\.\\s*/gi, '')
          .replace(/^Let me organiz?e this[^.]*\\.\\s*/gi, '')
          .replace(/^Here'?s? (is )?(the |a )?(comprehensive )?(summary|information)[^.]*\\.\\s*/gi, '')
          .trim();

        if (!summary || summary.length < 20) {
          const cleanSentences = fullContext
            .split(/[.!?]+/)
            .map(s => s.trim())
            .filter(s => s.length > 20 && !s.match(/^(Based on|I can|Let me|Here)/i));
          summary = cleanSentences.slice(0, 2).join('. ');
          if (summary && !summary.endsWith('.')) summary += '.';
        }

        setWebsiteContext(fullContext);
        setCompanyDescription(summary);
        setCompanyKnowledgeValidated(true);
        setKnowledgeCheckResult('confident');
        setCompanyWebsiteUrl('');
        setWebSearchStatus('');
      } else {
        setError('Could not extract company information from the website. Please try a different URL or add context manually.');
        setWebSearchStatus('');
      }

    } catch (err) {
      clearInterval(statusInterval);
      console.error('Website search error:', err);
      setError(\`Failed to search website: \${err.message}. You can try again or add context manually.\`);
      setWebSearchStatus('');
    } finally {
      setIsSearchingWebsite(false);
    }
  };`;

  body = beforeSearch + newSearchFunc + afterSearch;
}

// 7. Remove the mammoth import (handled by file-handlers)
// Already removed by our header replacement

// 8. Remove MAX_CONTENT_WORDS const (use from import or re-declare)
body = body.replace(/const MAX_CONTENT_WORDS = \d+;.*\n/, '');

// 9. Remove utility functions that are now imported
// countWords, parseJSON, typewriter, renderMarkdown are already imported
body = body.replace(/\/\/ Helper function to count words[\s\S]*?return text\.trim\(\)\.split\(\/\\s\+\/\)\.length;\s*\};/, '');

// 10. Replace Quantium branding in UI
body = body.replace(/quantium-default/g, 'crafti-default');

// Replace the SVG logo in the header
const svgStart = body.indexOf('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 396 100"');
const svgEnd = body.indexOf('</svg>', svgStart);
if (svgStart > -1 && svgEnd > -1) {
  const beforeSvg = body.slice(0, body.lastIndexOf('<div className="w-44', svgStart));
  const afterSvg = body.slice(svgEnd + '</svg>'.length);
  // Find closing </div> for the logo container
  const closingDivIdx = afterSvg.indexOf('</div>');
  const afterLogoDiv = afterSvg.slice(closingDivIdx + '</div>'.length);

  body = beforeSvg + `<div>
                <h1 className="text-2xl font-bold" style={{color: '#6C5CE7'}}>Crafti</h1>
              </div>` + afterLogoDiv;
}

// Replace the divider and subtitle in header
body = body.replace(
  /<div className="border-l-2 border-gray-300 pl-6 h-12 flex flex-col justify-center">\s*<h1 className="text-xl font-bold text-gray-900 leading-tight">Communications Toolkit<\/h1>\s*<p className="text-sm text-gray-600 leading-tight">\s*AI-powered communications for enterprise clients\s*<\/p>\s*<\/div>/,
  `<div className="border-l-2 border-gray-300 pl-6 h-12 flex flex-col justify-center">
                <p className="text-sm text-gray-500 leading-tight">
                  AI Communications Toolkit
                </p>
              </div>`
);

// Replace hero section
body = body.replace(
  /style=\{\{backgroundColor: '#000000', borderColor: '#000000'\}\}/g,
  "style={{backgroundColor: '#6C5CE7', borderColor: '#6C5CE7'}}"
);
body = body.replace(
  '<h1 className="text-4xl font-bold text-gray-900 mb-4">Communications Toolkit</h1>',
  '<h1 className="text-4xl font-bold text-gray-900 mb-4">Crafti</h1>'
);

// Replace "Get Started" buttons
body = body.replace(/style=\{\{backgroundColor: '#4a4a4e'\}\}/g, "style={{backgroundColor: '#6C5CE7'}}");
body = body.replace(/style=\{\{backgroundColor: '#4A4A4E'\}\}/g, "style={{backgroundColor: '#6C5CE7'}}");

// Replace gray-900 buttons with purple for primary actions
body = body.replace(/bg-gray-900 hover:bg-gray-800/g, 'bg-[#6C5CE7] hover:bg-[#5A4BD1]');

// Replace gray-700 accents
body = body.replace(/style=\{\{color: '#000006'\}\}/g, "style={{color: '#6C5CE7'}}");

// Replace the Home button color
body = body.replace(/style=\{\{ backgroundColor: '#4A4A4E' \}\}/g, "style={{ backgroundColor: '#6C5CE7' }}");

// Replace footer text
body = body.replace(/Generated by Quantium AI Communications Toolkit/g, 'Generated by Crafti');

// Replace placeholder text
body = body.replace(/e\.g\., Quantium, Microsoft, Woolworths/g, 'e.g., Acme Corp, Microsoft, Woolworths');

// Replace the Quantium competitor restriction in expert persona
body = body.replace(
  /CRITICAL - EXPERT SELECTION RESTRICTIONS:[\s\S]*?- Media or journalism \(if relevant to the content type\)/,
  `CRITICAL - EXPERT SELECTION:
Select experts from appropriate backgrounds:
- Academic institutions (professors, researchers)
- Industry-specific roles (former executives, chief officers)
- Specialist practitioners (communications directors, investor relations heads)
- Government or regulatory bodies (if relevant)
- Major consulting firms
- Media or journalism (if relevant to the content type)`
);

// Replace "This is a Quantium tool" text
body = body.replace(/This is a Quantium tool\. DO NOT select experts from the following competitor organisations:[\s\S]*?- Any data analytics or consulting firms that directly compete with Quantium\n/g, '');

// 11. Fix the "Change company" button to use localStorage
body = body.replace(
  /if \(window\.storage\) \{\s*try \{\s*await window\.storage\.set\('quantium-comms-company', '', false\);\s*await window\.storage\.set\('quantium-comms-company-validated', 'false', false\);\s*await window\.storage\.set\('quantium-comms-website-context', '', false\);\s*await window\.storage\.set\('quantium-comms-company-description', '', false\);\s*\} catch \(error\) \{\s*console\.error\('Error clearing company data:', error\);\s*\}\s*\}/g,
  `storage.set('company-name', '');
                    storage.set('company-validated', 'false');
                    storage.set('website-context', '');
                    storage.set('company-description', '');`
);

// 12. Fix the storage loading hooks to be synchronous
// The initial load useEffect needs to become synchronous
body = body.replace(/const loadStyles = async \(\) => \{/g, 'const loadStyles = () => {');
body = body.replace(/const loadComms = async \(\) => \{/g, 'const loadComms = () => {');
body = body.replace(/const loadCompanyData = async \(\) => \{/g, 'const loadCompanyData = () => {');
body = body.replace(/const saveStyles = async \(\) => \{/g, 'const saveStyles = () => {');
body = body.replace(/const saveComms = async \(\) => \{/g, 'const saveComms = () => {');
body = body.replace(/const saveCompanyData = async \(\) => \{/g, 'const saveCompanyData = () => {');

// Fix storage result access - storage.get returns string|null directly
// Pattern: const result = storage.get('X'); if (result) { setParsed(JSON.parse(result)); }
// These need "result" not "result.value" -- already handled above

// 13. Fix the extractDomain function to not conflict with import
body = body.replace(
  /\/\/ Extract domain from URL\s*const extractDomain = \(url\) => \{[\s\S]*?\};/,
  `// extractDomain helper
  const extractDomain = (url) => {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : \`https://\${url}\`);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return null;
    }
  };`
);

// 14. Fix remaining file upload handlers to use readFileContent
// Actually, the file handlers are complex enough to keep inline for now
// The mammoth import is needed by the inline handlers

// 15. Remove the storageError state warning about Claude artifacts
body = body.replace(
  /setStorageError\('This artifact must be published to use persistent storage\. Please publish the artifact first\.'\);/,
  '// localStorage is always available'
);

// 16. Remove 'window.storage not available - artifact must be published' warning
body = body.replace(/console\.warn\('window\.storage not available - artifact must be published'\);/g, '');

// Add mammoth import after our header (since file handlers are still inline)
const finalFile = newHeader + `import mammoth from 'mammoth';

const MAX_CONTENT_WORDS = 2500;

// Helper function to count words
const countWords = (text) => {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\\s+/).length;
};

// Parse JSON safely
const parseJSON = (text) => {
  try {
    const cleaned = text.replace(/\\\`\\\`\\\`json\\n?/g, '').replace(/\\\`\\\`\\\`\\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('JSON parse error:', e, text);
    throw new Error('Failed to parse response');
  }
};

// Typewriter
const typewriter = (text, callback, speed = 3) => {
  let idx = 0;
  const type = () => {
    if (idx < text.length) {
      callback(text.slice(0, idx + 3));
      idx += 3;
      setTimeout(type, speed);
    }
  };
  type();
};

` + body;

writeFileSync('/workspace/comms-toolkit/crafti/components/CraftiApp.tsx', finalFile);

console.log('Transform complete!');
console.log('Lines:', finalFile.split('\n').length);
