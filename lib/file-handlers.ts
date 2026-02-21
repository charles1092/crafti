import mammoth from 'mammoth';
import { countWords } from './utils';

// Extract text from PDF using pdf.js (loaded dynamically)
async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    // Dynamically load pdf.js
    if (!(window as unknown as Record<string, unknown>).pdfjsLib) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          resolve();
        };
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfjsLib = (window as any).pdfjsLib;
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let fullText = '';
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n\n';
    }

    return fullText.trim() || 'PDF content could not be extracted. Please try a different file.';
  } catch (err) {
    console.error('PDF extraction error:', err);
    return 'PDF extraction failed. Please try uploading a Word document or text file instead.';
  }
}

// Read file content from an uploaded file
export async function readFileContent(file: File): Promise<{ content: string; error?: string }> {
  const fileName = file.name.toLowerCase();

  try {
    if (fileName.endsWith('.docx')) {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return { content: result.value };
    } else if (fileName.endsWith('.txt')) {
      const content = await file.text();
      return { content };
    } else if (fileName.endsWith('.pdf')) {
      const arrayBuffer = await file.arrayBuffer();
      const content = await extractTextFromPDF(arrayBuffer);
      return { content };
    } else {
      return { content: '', error: 'Please upload .docx, .txt, or .pdf files' };
    }
  } catch (err) {
    console.error('File read error:', err);
    return { content: '', error: 'Failed to read file' };
  }
}

// Validate file content against word limit
export function validateWordCount(content: string, maxWords: number): string | null {
  const wordCount = countWords(content);
  if (wordCount > maxWords) {
    return `Content too long. Maximum ${maxWords.toLocaleString()} words (file has ${wordCount.toLocaleString()}). Please upload a shorter document.`;
  }
  return null;
}
