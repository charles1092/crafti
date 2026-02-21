// Build company context for all AI prompts
export function buildCompanyContext(
  companyName: string,
  websiteContext: string,
  companyContext: string,
  companyContextFileContents: { name: string; content: string }[]
): string {
  let context = `COMPANY: ${companyName}\n`;
  if (websiteContext) {
    context += `\nCOMPANY INFORMATION (from website):\n${websiteContext}\n`;
  }
  if (companyContext) {
    context += `\nADDITIONAL CONTEXT: ${companyContext}\n`;
  }
  if (companyContextFileContents.length > 0) {
    context += `\nCOMPANY BACKGROUND DOCUMENTS:\n${companyContextFileContents.map((f, i) => `\n--- Document ${i + 1}: ${f.name} ---\n${f.content.slice(0, 3000)}`).join('\n\n')}\n\n`;
  }
  return context;
}

// Build style context
export function buildStyleContext(
  selectedStyle: { content: string } | null
): string {
  if (!selectedStyle) return '';
  return `
WRITING STYLE GUIDE:
The following style guide should be applied to the content. Follow its guidelines for tone, voice, formatting, and any specific conventions it specifies:

---
${selectedStyle.content}
---

Apply these style guidelines throughout the content while maintaining the other requirements specified.
`;
}
