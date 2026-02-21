#!/usr/bin/env python3
"""Transform the original Quantium JSX into the Crafti TSX component."""

import re

# Read the original file
with open('/workspace/comms-toolkit/Quantium_Communications_Toolkit__Final v2.jsx', 'r') as f:
    original = f.read()

# We'll work with the original content and apply transformations
content = original

# ============================================================
# 1. REMOVE inline definitions that are now imported
# ============================================================

# Remove the inline countWords helper (lines 8-11 approx)
content = re.sub(
    r"const MAX_CONTENT_WORDS = 2500;.*?// Word limit for uploads\n\n"
    r"// Helper function to count words\n"
    r"const countWords = \(text\) => \{.*?\};\n\n",
    "",
    content,
    flags=re.DOTALL
)

# Remove inline callClaude function (lines ~550-564)
content = re.sub(
    r"  // Call Claude API\n"
    r"  const callClaude = async \(prompt, maxTokens = 2000\) => \{\n"
    r"    const response = await fetch\('https://api\.anthropic\.com/v1/messages'.*?\};\n\n",
    "",
    content,
    flags=re.DOTALL
)

# Remove inline parseJSON (lines ~566-575)
content = re.sub(
    r"  // Parse JSON safely\n"
    r"  const parseJSON = \(text\) => \{.*?  \};\n\n",
    "",
    content,
    flags=re.DOTALL
)

# Remove inline typewriter (lines ~577-588)
content = re.sub(
    r"  // Typewriter\n"
    r"  const typewriter = \(text, callback, speed = 3\) => \{.*?  \};\n\n",
    "",
    content,
    flags=re.DOTALL
)

# Remove inline renderMarkdown (lines ~590-638)
content = re.sub(
    r"  // Render markdown\n"
    r"  const renderMarkdown = \(text\) => \{.*?    return elements;\n  \};\n\n",
    "",
    content,
    flags=re.DOTALL
)

# Remove inline detectIntent (lines ~1514-1557)
content = re.sub(
    r"  // Detect user intent: modification request vs question\n"
    r"  const detectIntent = \(message\) => \{.*?    return 'question';\n  \};\n\n",
    "",
    content,
    flags=re.DOTALL
)

# Remove inline scoreColor and scoreBorder (lines ~4004-4017)
content = re.sub(
    r"  // Score colors\n"
    r"  const scoreColor = \(score\) => \{.*?\};\n\n"
    r"  const scoreBorder = \(score\) => \{.*?\};\n\n",
    "",
    content,
    flags=re.DOTALL
)

# Remove inline sentimentColor (lines ~4019-4027)
content = re.sub(
    r"  // Sentiment color\n"
    r"  const sentimentColor = \(sentiment\) => \{.*?  \};\n\n",
    "",
    content,
    flags=re.DOTALL
)

# Remove inline extractDomain (lines ~1040-1048)
content = re.sub(
    r"  // Extract domain from URL\n"
    r"  const extractDomain = \(url\) => \{.*?  \};\n\n",
    "",
    content,
    flags=re.DOTALL
)

# Remove inline LoadingStages component (lines ~4029-4051)
content = re.sub(
    r"  // Loading stages component\n"
    r"  const LoadingStages = \(\) => \(\n.*?  \);\n\n",
    "",
    content,
    flags=re.DOTALL
)

# Remove inline extractTextFromPDF (lines ~856-893)
content = re.sub(
    r"  // Simple PDF text extraction\n"
    r"  const extractTextFromPDF = async \(arrayBuffer\) => \{.*?  \};\n\n",
    "",
    content,
    flags=re.DOTALL
)

# Remove inline buildStyleContext (lines ~3926-3939)
content = re.sub(
    r"  const buildStyleContext = \(\) => \{.*?  \};\n\n",
    "",
    content,
    flags=re.DOTALL
)

# Remove inline buildCompanyContext (lines ~951-964)
content = re.sub(
    r"  // Build company context for prompts\n"
    r"  const buildCompanyContext = \(\) => \{.*?  \};\n\n",
    "",
    content,
    flags=re.DOTALL
)

# Remove categories, contentTypesByCategory, audiences, focuses, tones, suggestedPrompts arrays
content = re.sub(
    r"  // Dropdowns - Category-based system\n"
    r"  const categories = \[.*?\];\n\n"
    r"  const contentTypesByCategory = \{.*?\};\n\n",
    "",
    content,
    flags=re.DOTALL
)
content = re.sub(
    r"  const audiences = \[.*?\];\n\n",
    "",
    content,
    flags=re.DOTALL
)
content = re.sub(
    r"  const focuses = \[.*?\];\n\n",
    "",
    content,
    flags=re.DOTALL
)
content = re.sub(
    r"  const tones = \[.*?\];\n\n",
    "",
    content,
    flags=re.DOTALL
)
content = re.sub(
    r"  const suggestedPrompts = \[.*?\];\n\n",
    "",
    content,
    flags=re.DOTALL
)

# Remove the file upload handlers that use mammoth/extractTextFromPDF inline
# Replace handleFileUpload with one that uses imported readFileContent/validateWordCount
content = re.sub(
    r"  // File upload\n"
    r"  const handleFileUpload = async \(e\) => \{.*?  \};\n\n",
    """  // File upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setUploadedFile(file);

    try {
      const { content: fileContent, error: fileError } = await readFileContent(file);
      if (fileError) {
        setError(fileError);
        setUploadedFile(null);
        e.target.value = '';
        return;
      }

      const wordError = validateWordCount(fileContent, MAX_CONTENT_WORDS);
      if (wordError) {
        setError(wordError);
        setUploadedFile(null);
        e.target.value = '';
        return;
      }

      setContent(fileContent);
      e.target.value = '';
    } catch (err) {
      console.error('File error:', err);
      setError('Failed to read file');
      setUploadedFile(null);
      e.target.value = '';
    }
  };

""",
    content,
    flags=re.DOTALL
)

# Replace handleRefFileUpload
content = re.sub(
    r"  // Reference file upload handler \(for Create mode\)\n"
    r"  const handleRefFileUpload = async \(event\) => \{.*?  \};\n\n",
    """  // Reference file upload handler (for Create mode)
  const handleRefFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (uploadedRefFiles.length >= 3) {
      setError('Maximum 3 reference files allowed. Please remove a file before uploading another.');
      event.target.value = '';
      return;
    }

    try {
      const { content: fileContent, error: fileError } = await readFileContent(file);
      if (fileError) {
        setError(fileError);
        event.target.value = '';
        return;
      }

      const wordCount = countWords(fileContent);
      const MAX_REF_WORDS = 20000;
      if (wordCount > MAX_REF_WORDS) {
        setError(`Document too long (${wordCount.toLocaleString()} words). Maximum 20,000 words per reference file.`);
        event.target.value = '';
        return;
      }

      setUploadedRefFiles(prev => [...prev, file]);
      setRefFileContents(prev => [...prev, { name: file.name, content: fileContent, wordCount }]);
      setError('');
      event.target.value = '';
    } catch (error) {
      console.error('Error reading reference file:', error);
      setError('Error reading file. Please try again or use a different file.');
      event.target.value = '';
    }
  };

""",
    content,
    flags=re.DOTALL
)

# Replace handleCompanyFileUpload
content = re.sub(
    r"  // Company context file upload handler\n"
    r"  const handleCompanyFileUpload = async \(event\) => \{.*?  \};\n\n",
    """  // Company context file upload handler
  const handleCompanyFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (companyContextFiles.length >= 3) {
      setError('Maximum 3 company context files allowed. Please remove a file before uploading another.');
      event.target.value = '';
      return;
    }

    try {
      const { content: fileContent, error: fileError } = await readFileContent(file);
      if (fileError) {
        setError(fileError);
        event.target.value = '';
        return;
      }

      setCompanyContextFiles(prev => [...prev, file]);
      setCompanyContextFileContents(prev => [...prev, { name: file.name, content: fileContent }]);
      setError('');
      event.target.value = '';
    } catch (error) {
      console.error('Error reading company file:', error);
      setError('Error reading file. Please try again or use a different file.');
      event.target.value = '';
    }
  };

""",
    content,
    flags=re.DOTALL
)

# Replace handleStyleFileUpload to use readFileContent
content = re.sub(
    r"  const handleStyleFileUpload = async \(e\) => \{.*?  \};\n\n",
    """  const handleStyleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingStyle(true);
    try {
      if (file.name.endsWith('.pdf')) {
        setError('PDF files are not yet supported for style guides. Please use .docx, .txt, or .md files.');
        setIsUploadingStyle(false);
        return;
      }

      const { content: text, error: fileError } = await readFileContent(file);
      if (fileError) {
        setError(fileError);
        setIsUploadingStyle(false);
        return;
      }

      setNewStyleContent(text);
      if (!newStyleName) {
        const nameWithoutExt = file.name.replace(/\\.[^/.]+$/, '');
        setNewStyleName(nameWithoutExt);
      }
    } catch (err) {
      console.error('Error reading style file:', err);
      setError('Failed to read style guide file');
    } finally {
      setIsUploadingStyle(false);
      e.target.value = '';
    }
  };

""",
    content,
    flags=re.DOTALL
)

# ============================================================
# 2. Replace buildCompanyContext() calls with explicit params
# ============================================================
content = content.replace(
    '${buildCompanyContext()}',
    '${buildCompanyContext(companyName, websiteContext, companyContext, companyContextFileContents)}'
)

# ============================================================
# 3. Replace buildStyleContext() calls with explicit params
# ============================================================
content = content.replace(
    '${buildStyleContext()}',
    '${buildStyleContext(getSelectedStyle())}'
)

# ============================================================
# 4. Replace <LoadingStages /> with <LoadingStages stages={loadingStages} currentStage={currentStage} />
# ============================================================
content = content.replace(
    '<LoadingStages />',
    '<LoadingStages stages={loadingStages} currentStage={currentStage} />'
)

# ============================================================
# 5. Replace DEFAULT_QUANTIUM_STYLE with DEFAULT_CRAFTI_STYLE
# ============================================================
content = content.replace('DEFAULT_QUANTIUM_STYLE', 'DEFAULT_CRAFTI_STYLE')

# ============================================================
# 6. Replace storage keys and patterns
# ============================================================

# Replace all window.storage patterns with synchronous storage calls
# Load styles
content = re.sub(
    r"  // Load styles from persistent storage.*?\n  \}, \[\]\);",
    """  // Load styles from localStorage on mount (always include default style)
  useEffect(() => {
    try {
      const stored = storage.get('styles');
      if (stored) {
        const parsed = JSON.parse(stored);
        const hasDefault = parsed.some((s: { id: string }) => s.id === 'crafti-default');
        if (hasDefault) {
          setStyles(parsed.map((s: { id: string }) => s.id === 'crafti-default' ? DEFAULT_CRAFTI_STYLE : s));
        } else {
          setStyles([DEFAULT_CRAFTI_STYLE, ...parsed]);
        }
      }
    } catch {
      // No styles stored yet, use defaults
    }
  }, []);""",
    content,
    flags=re.DOTALL
)

# Save styles
content = re.sub(
    r"  // Save styles to persistent storage.*?\n  \}, \[styles, isInitialLoad\]\);",
    """  // Save styles to localStorage whenever they change (skip during initial load)
  useEffect(() => {
    if (isInitialLoad) return;
    storage.set('styles', JSON.stringify(styles));
  }, [styles, isInitialLoad]);""",
    content,
    flags=re.DOTALL
)

# Load saved comms
content = re.sub(
    r"  // Load saved communications from persistent storage.*?\n  \}, \[\]\);",
    """  // Load saved communications from localStorage on mount
  useEffect(() => {
    try {
      const stored = storage.get('saved-comms');
      if (stored) {
        setSavedComms(JSON.parse(stored));
      }
    } catch {
      // No saved communications yet
    }
  }, []);""",
    content,
    flags=re.DOTALL
)

# Save saved comms
content = re.sub(
    r"  // Save communications to persistent storage.*?\n  \}, \[savedComms, isInitialLoad\]\);",
    """  // Save communications to localStorage whenever they change (skip during initial load)
  useEffect(() => {
    if (isInitialLoad) return;
    storage.set('saved-comms', JSON.stringify(savedComms));
  }, [savedComms, isInitialLoad]);""",
    content,
    flags=re.DOTALL
)

# Load company data
content = re.sub(
    r"  // Load company name and validation state.*?\n  \}, \[\]\);",
    """  // Load company data from localStorage on mount
  useEffect(() => {
    let loadedCompanyName = '';
    let loadedValidated = false;
    let loadedWebsiteContext = '';
    let loadedCompanyDescription = '';

    const cn = storage.get('company-name');
    if (cn) loadedCompanyName = cn;

    const cv = storage.get('company-validated');
    if (cv === 'true') loadedValidated = true;

    const wc = storage.get('website-context');
    if (wc) loadedWebsiteContext = wc;

    const cd = storage.get('company-description');
    if (cd) loadedCompanyDescription = cd;

    if (loadedCompanyName) {
      setCompanyName(loadedCompanyName);
      if (loadedWebsiteContext) setWebsiteContext(loadedWebsiteContext);
      if (loadedCompanyDescription) setCompanyDescription(loadedCompanyDescription);
      if (loadedValidated) {
        setCompanyKnowledgeValidated(true);
        setKnowledgeCheckResult('confident');
      }
    }

    setTimeout(() => {
      setIsInitialLoad(false);
    }, 100);
  }, []);""",
    content,
    flags=re.DOTALL
)

# Save company data
content = re.sub(
    r"  // Save company name, validation state.*?\n  \}, \[companyName, companyKnowledgeValidated, websiteContext, companyDescription, isInitialLoad\]\);",
    """  // Save company data to localStorage whenever it changes (skip during initial load)
  useEffect(() => {
    if (isInitialLoad) return;
    if (!companyName) return;
    storage.set('company-name', companyName);
    storage.set('company-validated', companyKnowledgeValidated ? 'true' : 'false');
    storage.set('website-context', websiteContext || '');
    storage.set('company-description', companyDescription || '');
  }, [companyName, companyKnowledgeValidated, websiteContext, companyDescription, isInitialLoad]);""",
    content,
    flags=re.DOTALL
)

# ============================================================
# 7. Replace searchCompanyWebsite to use callClaudeWebSearch
# ============================================================
content = re.sub(
    r"  // Search company website using web search API\n"
    r"  const searchCompanyWebsite = async \(\) => \{.*?"
    r"    } finally \{\n"
    r"      setIsSearchingWebsite\(false\);\n"
    r"    \}\n  \};",
    """  // Search company website using web search API
  const searchCompanyWebsite = async () => {
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
      const prompt = `Search and gather comprehensive information about the company from their website: ${companyWebsiteUrl}

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
1. The SUMMARY section must be plain text only. No headers, no "##", no "PART 1", no "Based on my search results". Start directly with "[Company name] is..." or "[Company name] provides..."
2. Use British English spelling throughout (e.g., "specialises" not "specializes", "organised" not "organized", "colour" not "color").`;

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
          const sentences = textContent.split(/[.!?]+/).filter((s: string) => s.trim());
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
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 20 && !s.match(/^(Based on|I can|Let me|Here)/i));
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
      setError(`Failed to search website. You can try again or add context manually below.`);
      setWebSearchStatus('');
    } finally {
      setIsSearchingWebsite(false);
    }
  };""",
    content,
    flags=re.DOTALL
)

# ============================================================
# 8. Replace hardReset and factoryReset storage calls
# ============================================================
content = re.sub(
    r"  // Hard reset - clears all persistent storage.*?  \};\n\n  // Factory reset",
    """  // Hard reset - clears all persistent storage and resets component
  const hardReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    storage.set('styles', JSON.stringify([DEFAULT_CRAFTI_STYLE]));
    storage.set('saved-comms', '[]');
    storage.set('company-name', '');
    storage.set('company-validated', 'false');
    storage.set('website-context', '');
    storage.set('company-description', '');
    setStyles([DEFAULT_CRAFTI_STYLE]);
    setSavedComms([]);
    setShowStyleManager(false);
    setEditingStyle(null);
    setNewStyleName('');
    setNewStyleContent('');
    setShowAddStyleForm(false);
    setSelectedStyleId(null);
    setConfirmReset(false);
    setEditingCommId(null);
    setCompanyName('');
    setCompanyKnowledgeValidated(false);
    setKnowledgeCheckResult(null);
    setCompanyContext('');
    setCompanyContextFiles([]);
    setCompanyContextFileContents([]);
    setProbableCompanyInfo(null);
    setCompanyWebsiteUrl('');
    setWebsiteContext('');
    setCompanyDescription('');
  };

  // Factory reset""",
    content,
    flags=re.DOTALL
)

content = re.sub(
    r"  // Factory reset - clears ALL persistent storage data\n"
    r"  const factoryReset = async \(\) => \{.*?  \};\n",
    """  // Factory reset - clears ALL persistent storage data
  const factoryReset = () => {
    storage.set('styles', JSON.stringify([DEFAULT_CRAFTI_STYLE]));
    storage.set('saved-comms', '[]');
    storage.set('company-name', '');
    storage.set('company-validated', 'false');
    storage.set('website-context', '');
    storage.set('company-description', '');
    setStyles([DEFAULT_CRAFTI_STYLE]);
    setSavedComms([]);
    setSelectedStyleId(null);
    setMode('landing');
    setContent('');
    setWorkspaceContent('');
    setGeneratedContent('');
    setCompanyName('');
    setCategory('');
    setContentType('');
    setAnalyseCategory('');
    setAnalyseContentType('auto');
    setEditingCommId(null);
    setCompanyKnowledgeValidated(false);
    setKnowledgeCheckResult(null);
    setCompanyContext('');
    setCompanyContextFiles([]);
    setCompanyContextFileContents([]);
    setProbableCompanyInfo(null);
    setCompanyWebsiteUrl('');
    setWebsiteContext('');
    setCompanyDescription('');
  };
""",
    content,
    flags=re.DOTALL
)

# ============================================================
# 9. Replace "Change company" button's inline storage calls
# ============================================================
content = re.sub(
    r"                  onClick=\{async \(\) => \{\n"
    r"                    setCompanyKnowledgeValidated\(false\);\n"
    r"                    setKnowledgeCheckResult\(null\);\n"
    r"                    setCompanyName\(''\);\n"
    r"                    setCompanyContext\(''\);\n"
    r"                    setCompanyContextFiles\(\[\]\);\n"
    r"                    setCompanyContextFileContents\(\[\]\);\n"
    r"                    // Clear new state\n"
    r"                    setProbableCompanyInfo\(null\);\n"
    r"                    setCompanyWebsiteUrl\(''\);\n"
    r"                    setWebsiteContext\(''\);\n"
    r"                    setCompanyDescription\(''\);\n"
    r"                    // Clear company data from persistent storage\n"
    r"                    if \(window\.storage\) \{.*?\}.*?\}",
    """                  onClick={() => {
                    setCompanyKnowledgeValidated(false);
                    setKnowledgeCheckResult(null);
                    setCompanyName('');
                    setCompanyContext('');
                    setCompanyContextFiles([]);
                    setCompanyContextFileContents([]);
                    setProbableCompanyInfo(null);
                    setCompanyWebsiteUrl('');
                    setWebsiteContext('');
                    setCompanyDescription('');
                    storage.set('company-name', '');
                    storage.set('company-validated', 'false');
                    storage.set('website-context', '');
                    storage.set('company-description', '');
                  }""",
    content,
    flags=re.DOTALL
)

# ============================================================
# 10. Replace copyToClipboard and copyWorkspaceContent with imported util
# ============================================================
content = re.sub(
    r"  // Copy to clipboard for Word\n"
    r"  const copyToClipboard = async \(\) => \{.*?  \};\n\n",
    """  // Copy to clipboard for Word
  const copyToClipboard = () => {
    if (!generatedContent) return;
    copyToClipboardRich(generatedContent, contentType, setIsCopied);
  };

""",
    content,
    flags=re.DOTALL
)

content = re.sub(
    r"  // Copy workspace content to clipboard for Word\n"
    r"  const copyWorkspaceContent = async \(\) => \{.*?  \};\n\n",
    """  // Copy workspace content to clipboard for Word
  const copyWorkspaceContent = () => {
    if (!workspaceContent) return;
    copyToClipboardRich(workspaceContent, 'Corporate Communication', setIsWorkspaceCopied);
  };

""",
    content,
    flags=re.DOTALL
)

# ============================================================
# 11. Replace the deleteStyle check for 'quantium-default' with 'crafti-default'
# ============================================================
content = content.replace(
    "if (id === 'quantium-default') return;",
    "if (id === 'crafti-default') return;"
)

# ============================================================
# 12. BRANDING: Replace colors and text
# ============================================================

# Landing hero icon: bg black -> bg #6C5CE7
content = content.replace(
    "style={{backgroundColor: '#000000', borderColor: '#000000'}}",
    "style={{backgroundColor: '#6C5CE7', borderColor: '#6C5CE7'}}"
)

# Get Started buttons: bg #4a4a4e -> bg #6C5CE7
content = content.replace(
    "style={{backgroundColor: '#4a4a4e'}}",
    "style={{backgroundColor: '#6C5CE7'}}"
)
content = content.replace(
    "style={{backgroundColor: '#4A4A4E'}}",
    "style={{backgroundColor: '#6C5CE7'}}"
)

# Main buttons: bg-gray-900 -> bg-[#6C5CE7], hover:bg-gray-800 -> hover:bg-[#5A4BD1]
content = content.replace('bg-gray-900 hover:bg-gray-800', 'bg-[#6C5CE7] hover:bg-[#5A4BD1]')

# Focus ring color
content = content.replace('focus:ring-gray-700', 'focus:ring-[#6C5CE7]')

# CheckCircle icons with style={{color: '#000006'}}
content = content.replace("style={{color: '#000006'}}", "style={{color: '#6C5CE7'}}")

# Placeholder text in company name input
content = content.replace(
    'placeholder="e.g., Quantium, Microsoft, Woolworths"',
    'placeholder="e.g., Acme Corp, Microsoft, Woolworths"'
)

# ============================================================
# 13. Replace expert persona competitor restriction
# ============================================================
content = re.sub(
    r"CRITICAL - EXPERT SELECTION RESTRICTIONS:\n"
    r"This is a Quantium tool\. DO NOT select experts.*?"
    r"- Media or journalism \(if relevant to the content type\)\n",
    """EXPERT SELECTION:
Select the most appropriate expert for reviewing this communication. Choose from:
- Academic institutions (professors, researchers)
- Industry-specific roles (former executives, chief officers)
- Specialist practitioners (communications directors, investor relations heads)
- Government or regulatory bodies (if relevant)
- Media or journalism (if relevant to the content type)
""",
    content,
    flags=re.DOTALL
)

# ============================================================
# 14. Replace the header (SVG logo -> text "Crafti")
# ============================================================
content = re.sub(
    r"            <div className=\"flex items-center gap-4\">\n"
    r"              <div className=\"w-44 flex-shrink-0\">\n"
    r"                <svg.*?</svg>\n"
    r"              </div>\n"
    r"              <div className=\"border-l-2 border-gray-300 pl-6 h-12 flex flex-col justify-center\">\n"
    r"                <h1 className=\"text-xl font-bold text-gray-900 leading-tight\">Communications Toolkit</h1>\n"
    r"                <p className=\"text-sm text-gray-600 leading-tight\">\n"
    r"                  AI-powered communications for enterprise clients\n"
    r"                </p>\n"
    r"              </div>",
    """            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold" style={{color: '#6C5CE7'}}>Crafti</h1>
              <div className="border-l-2 border-gray-300 pl-4 h-10 flex flex-col justify-center">
                <p className="text-sm text-gray-600 leading-tight">
                  AI-powered communications toolkit
                </p>
              </div>""",
    content,
    flags=re.DOTALL
)

# ============================================================
# 15. Remove the original imports and export, replace with Crafti
# ============================================================
content = re.sub(
    r"import React, \{ useState, useEffect \} from 'react';\n"
    r"import \{ Upload.*? \} from 'lucide-react';\n"
    r"import \* as mammoth from 'mammoth';\n\n",
    "",
    content,
    flags=re.DOTALL
)

content = content.replace(
    "export default function QuantiumCommunicationsTool() {",
    "export default function CraftiApp() {"
)

# ============================================================
# 16. Remove storageError state and banner (not needed with localStorage)
# ============================================================
content = content.replace(
    "  // Storage state - must be declared before useEffects that reference it\n"
    "  const [storageError, setStorageError] = useState(null);\n",
    ""
)

# Remove storage error banner from JSX
content = re.sub(
    r"      \{/\* Storage Error Banner \*/\}\n"
    r"      \{storageError && \(.*?\)\}\n\s*\n",
    "",
    content,
    flags=re.DOTALL
)

# Remove the "artifact must be published" note
content = content.replace(
    "              <p className=\"text-sm mt-1 text-red-700\">Company selection will not persist between sessions until the artifact is published.</p>\n",
    ""
)

# ============================================================
# 17. Add 'use client' and proper imports at top
# ============================================================
imports = """'use client';

import React, { useState, useEffect } from 'react';
import { Upload, Loader2, CheckCircle, AlertCircle, TrendingUp, Send, Download, RotateCcw, FileText, X, Sparkles, Eye, EyeOff, PenTool, Users, Shield, Newspaper, Lightbulb, MessageSquare, Copy, Trash2, Award, List, Target, Search, Layout, UserCheck, Settings, ChevronDown, Edit3, Plus, Home } from 'lucide-react';

import { storage } from '../lib/storage';
import { callClaude, callClaudeWebSearch } from '../lib/api';
import { MAX_CONTENT_WORDS, DEFAULT_CRAFTI_STYLE, categories, contentTypesByCategory, audiences, focuses, tones, suggestedPrompts } from '../lib/constants';
import { countWords, parseJSON, typewriter, renderMarkdown, copyToClipboardRich, detectIntent, scoreColor, scoreBorder, sentimentColor, extractDomain } from '../lib/utils';
import { readFileContent, validateWordCount } from '../lib/file-handlers';
import { buildCompanyContext, buildStyleContext } from '../lib/prompts';
import LoadingStages from './LoadingStages';

"""

content = imports + content

# ============================================================
# 18. Fix some TypeScript type annotations for state
# ============================================================

# Add eslint-disable for any types since this is a big port
content = content.replace(
    "'use client';",
    "'use client';\n\n/* eslint-disable @typescript-eslint/no-explicit-any */",
    1
)

# Write the output
with open('/workspace/comms-toolkit/crafti/components/CraftiApp.tsx', 'w') as f:
    f.write(content)

print(f"Done! Output file written. Size: {len(content)} characters, {content.count(chr(10))} lines")
