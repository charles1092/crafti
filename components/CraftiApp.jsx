'use client';

import React, { useState, useEffect } from 'react';
import { Upload, Loader2, CheckCircle, AlertCircle, TrendingUp, Send, Download, RotateCcw, FileText, X, Sparkles, Eye, EyeOff, PenTool, Users, Shield, Newspaper, Lightbulb, MessageSquare, Copy, Trash2, Award, List, Target, Search, Layout, UserCheck, Settings, ChevronDown, Edit3, Plus, Home } from 'lucide-react';
import { callClaude, callClaudeWebSearch } from '@/lib/api';
import { storage } from '@/lib/storage';
import { readFileContent, validateWordCount } from '@/lib/file-handlers';
import mammoth from 'mammoth';

const MAX_CONTENT_WORDS = 2500;

// Helper function to count words
const countWords = (text) => {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).length;
};

// Parse JSON safely
const parseJSON = (text) => {
  try {
    const cleaned = text.replace(/\`\`\`json\n?/g, '').replace(/\`\`\`\n?/g, '').trim();
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

export default function CraftiApp() {
  // Main navigation
  const [mode, setMode] = useState('landing'); // landing | create | analyse

  // Scroll to top when mode changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [mode]);

  // Default Crafti style (permanent, cannot be deleted)
  const DEFAULT_CRAFTI_STYLE = {
    id: 'crafti-default',
    name: 'Professional',
    content: `Tone & Style:
- Write in a simple, accessible manner, avoid jargon and make content clear, direct, and concise to all audiences
- Be humble and personable rather than boastful - focus on possibilities rather than bragging
- Keep content robust and commercially applicable with real-world outcomes

Formatting & Grammar:
- Use sentence case for all headings (capitalise only the first word and proper nouns)
- Use complete sentences (write "and" not "&")
- Use spaces before and after slashes (e.g. "and / or")
- Single quotes for emphasis, double quotes for actual quotations
- Keep decimals to maximum 2 decimal places (9.66% or 9.7%)

Australian English spelling and conventions should be used throughout.`,
    createdAt: 0,
    isDefault: true
  };

  // Style management state (persisted to localStorage)
  const [styles, setStyles] = useState([DEFAULT_CRAFTI_STYLE]);
  const [selectedStyleId, setSelectedStyleId] = useState(null);
  const [showStyleManager, setShowStyleManager] = useState(false);
  const [editingStyle, setEditingStyle] = useState(null);
  const [newStyleName, setNewStyleName] = useState('');
  const [newStyleContent, setNewStyleContent] = useState('');
  const [isUploadingStyle, setIsUploadingStyle] = useState(false);
  const [showAddStyleForm, setShowAddStyleForm] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Saved communications state (persisted to localStorage)
  const [savedComms, setSavedComms] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveModalName, setSaveModalName] = useState('');
  const [savingFromMode, setSavingFromMode] = useState(null); // 'create' or 'analyse'
  const [editingCommId, setEditingCommId] = useState(null); // Track if we're editing an existing saved comm
  const [confirmClearSaved, setConfirmClearSaved] = useState(false);
  const [isGeneratingSuggestedName, setIsGeneratingSuggestedName] = useState(false);

  // AI-powered chat suggestions
  const [createChatSuggestions, setCreateChatSuggestions] = useState([]);
  const [isGeneratingCreateSuggestions, setIsGeneratingCreateSuggestions] = useState(false);
  const [analyseChatSuggestions, setAnalyseChatSuggestions] = useState([]);
  const [isGeneratingAnalyseSuggestions, setIsGeneratingAnalyseSuggestions] = useState(false);

  // Storage state - must be declared before useEffects that reference it
  const [storageError, setStorageError] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Load styles from persistent storage on mount (always include default Crafti style)
  useEffect(() => {
    const loadStyles = () => {
      // localStorage is always available in browser
      
      try {
        const result = storage.get('styles');
        if (result) {
          const parsed = JSON.parse(result);
          // Ensure Crafti default is always present
          const hasCraftiDefault = parsed.some(s => s.id === 'crafti-default');
          if (hasCraftiDefault) {
            // Update the Crafti style to latest version
            setStyles(parsed.map(s => s.id === 'crafti-default' ? DEFAULT_CRAFTI_STYLE : s));
          } else {
            setStyles([DEFAULT_CRAFTI_STYLE, ...parsed]);
          }
          console.log('Styles loaded from persistent storage');
        }
      } catch (error) {
        // Key doesn't exist yet, that's fine - use defaults
        console.log('No styles stored yet, using defaults');
      }
    };
    
    loadStyles();
  }, []);

  // Save styles to persistent storage whenever they change (skip during initial load)
  useEffect(() => {
    const saveStyles = () => {
      if (isInitialLoad) {
        return;
      }
      
      // localStorage is always available in browser
      
      try {
        storage.set('styles', JSON.stringify(styles));
        console.log('Styles saved to persistent storage');
      } catch (error) {
        console.error('Error saving styles:', error);
      }
    };
    
    saveStyles();
  }, [styles, isInitialLoad]);

  // Load saved communications from persistent storage on mount
  useEffect(() => {
    const loadComms = () => {
      // localStorage is always available in browser
      
      try {
        const result = storage.get('saved');
        if (result) {
          setSavedComms(JSON.parse(result));
          console.log('Saved communications loaded from persistent storage');
        }
      } catch (error) {
        // Key doesn't exist yet, that's fine
        console.log('No saved communications stored yet');
      }
    };
    
    loadComms();
  }, []);

  // Save communications to persistent storage whenever they change (skip during initial load)
  useEffect(() => {
    const saveComms = () => {
      if (isInitialLoad) {
        return;
      }
      
      // localStorage is always available in browser
      
      try {
        storage.set('saved', JSON.stringify(savedComms));
        console.log('Saved communications saved to persistent storage');
      } catch (error) {
        console.error('Error saving communications:', error);
      }
    };
    
    saveComms();
  }, [savedComms, isInitialLoad]);

  // Content state
  const [content, setContent] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [error, setError] = useState('');

  // Create mode state
  const [category, setCategory] = useState('');
  const [contentType, setContentType] = useState('');
  const [audience, setAudience] = useState('');
  const [focus, setFocus] = useState('');
  const [tone, setTone] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegeneratingWithStyle, setIsRegeneratingWithStyle] = useState(false);
  const [createChatMessages, setCreateChatMessages] = useState([]);
  const [createChatInput, setCreateChatInput] = useState('');
  const [isRefiningCreate, setIsRefiningCreate] = useState(false);
  const [createSuggestions, setCreateSuggestions] = useState([]);
  const [isAnalysingCreate, setIsAnalysingCreate] = useState(false);
  const [showCreateSuggestions, setShowCreateSuggestions] = useState(false);
  const [selectedCreateSuggestions, setSelectedCreateSuggestions] = useState([]);
  const [isApplyingCreateSuggestions, setIsApplyingCreateSuggestions] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isWorkspaceCopied, setIsWorkspaceCopied] = useState(false);
  const [uploadedRefFiles, setUploadedRefFiles] = useState([]);
  const [refFileContents, setRefFileContents] = useState([]);

  // Version history state - Create mode
  const [createVersionHistory, setCreateVersionHistory] = useState([]);
  const [createCurrentVersion, setCreateCurrentVersion] = useState(0);

  // Version history state - Analyse mode
  const [analyseVersionHistory, setAnalyseVersionHistory] = useState([]);
  const [analyseCurrentVersion, setAnalyseCurrentVersion] = useState(0);

  // Analyse mode state
  const [analyseCategory, setAnalyseCategory] = useState('');
  const [analyseContentType, setAnalyseContentType] = useState('auto');
  const [analyseContext, setAnalyseContext] = useState('');
  const [workspaceContent, setWorkspaceContent] = useState('');
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [isContentLoaded, setIsContentLoaded] = useState(false);
  const [showContentInput, setShowContentInput] = useState(true);
  
  // Analysis results with ordering
  const [analysisResults, setAnalysisResults] = useState([]); // Array of {type, data, timestamp, selected items}
  
  const [isAnalysingTrust, setIsAnalysingTrust] = useState(false);
  const [isAnalysingStakeholders, setIsAnalysingStakeholders] = useState(false);
  const [isGeneratingAFR, setIsGeneratingAFR] = useState(false);
  const [isAnalysingStrengths, setIsAnalysingStrengths] = useState(false);
  const [isGeneratingImprovements, setIsGeneratingImprovements] = useState(false);
  const [isAnalysingQuoteRisks, setIsAnalysingQuoteRisks] = useState(false);
  const [isAnalysingAssumptions, setIsAnalysingAssumptions] = useState(false);
  const [isAnalysingAudienceTone, setIsAnalysingAudienceTone] = useState(false);
  const [isAnalysingStructure, setIsAnalysingStructure] = useState(false);
  const [isAnalysingExpertPersona, setIsAnalysingExpertPersona] = useState(false);
  const [isGeneratingFAQ, setIsGeneratingFAQ] = useState(false);
  const [isAnalysingCompliance, setIsAnalysingCompliance] = useState(false);
  const [isSuggestingTools, setIsSuggestingTools] = useState(false);
  const [suggestedTools, setSuggestedTools] = useState(null);
  const [loadingStages, setLoadingStages] = useState([]);
  const [currentStage, setCurrentStage] = useState(0);

  // Chatbot state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChattingAnalyse, setIsChattingAnalyse] = useState(false);
  const [isApplyingActionItems, setIsApplyingActionItems] = useState(false);
  const [isModifyingContent, setIsModifyingContent] = useState(false); // Track if current operation will modify content
  const [isApplyingStyleToWorkspace, setIsApplyingStyleToWorkspace] = useState(false);

  // Company knowledge check state
  const [companyName, setCompanyName] = useState('');
  const [companyContext, setCompanyContext] = useState('');
  const [companyContextFiles, setCompanyContextFiles] = useState([]);
  const [companyContextFileContents, setCompanyContextFileContents] = useState([]);
  const [isCheckingKnowledge, setIsCheckingKnowledge] = useState(false);
  const [knowledgeCheckResult, setKnowledgeCheckResult] = useState(null); // null | 'confident' | 'probable' | 'unknown'
  const [companyKnowledgeValidated, setCompanyKnowledgeValidated] = useState(false);
  
  // New state for three-tier knowledge check
  const [probableCompanyInfo, setProbableCompanyInfo] = useState(null); // { suggestedName, description }
  const [companyWebsiteUrl, setCompanyWebsiteUrl] = useState('');
  const [isSearchingWebsite, setIsSearchingWebsite] = useState(false);
  const [webSearchStatus, setWebSearchStatus] = useState(''); // Progress status message
  const [websiteContext, setWebsiteContext] = useState(''); // Extracted info from web search (persisted)
  const [companyDescription, setCompanyDescription] = useState(''); // Brief summary for display (persisted)

  // Load company name and validation state from persistent storage on mount
  useEffect(() => {
    const loadCompanyData = () => {
      // Check if localStorage API is available
      console.log('Checking localStorage availability:', typeof localStorage);
      
      // localStorage is always available in browser
      
      console.log('localStorage is available, loading company data...');
      
      let loadedCompanyName = '';
      let loadedValidated = false;
      let loadedWebsiteContext = '';
      
      try {
        const companyResult = storage.get('company');
        console.log('Loaded company data:', companyResult);
        if (companyResult) {
          loadedCompanyName = companyResult;
        }
      } catch (error) {
        console.log('No company name stored yet:', error.message);
      }
      
      try {
        const validationResult = storage.get('company-validated');
        console.log('Loaded validation state:', validationResult);
        if (validationResult && validationResult === 'true') {
          loadedValidated = true;
        }
      } catch (error) {
        console.log('No validation state stored yet');
      }
      
      try {
        const websiteContextResult = storage.get('website-context');
        console.log('Loaded website context:', websiteContextResult);
        if (websiteContextResult) {
          loadedWebsiteContext = websiteContextResult;
        }
      } catch (error) {
        console.log('No website context stored yet');
      }
      
      let loadedCompanyDescription = '';
      try {
        const descriptionResult = storage.get('company-description');
        if (descriptionResult) {
          loadedCompanyDescription = descriptionResult;
        }
      } catch (error) {
        console.log('No company description stored yet');
      }
      
      // Set all states together, then mark initial load complete
      if (loadedCompanyName) {
        setCompanyName(loadedCompanyName);
        if (loadedWebsiteContext) {
          setWebsiteContext(loadedWebsiteContext);
        }
        if (loadedCompanyDescription) {
          setCompanyDescription(loadedCompanyDescription);
        }
        if (loadedValidated) {
          setCompanyKnowledgeValidated(true);
          setKnowledgeCheckResult('confident');
        }
      }
      
      // Mark initial load complete after a short delay to let state settle
      setTimeout(() => {
        setIsInitialLoad(false);
        console.log('Initial load complete');
      }, 100);
    };
    
    loadCompanyData();
  }, []);

  // Save company name, validation state, and website context to persistent storage whenever they change
  useEffect(() => {
    const saveCompanyData = () => {
      // Skip during initial load to prevent overwriting
      if (isInitialLoad) {
        console.log('Skipping save during initial load');
        return;
      }
      
      // Skip if no company name (nothing to save)
      if (!companyName) {
        return;
      }
      
      // Check if storage is available
      // localStorage is always available in browser
      
      try {
        console.log('Saving company data:', companyName, companyKnowledgeValidated, websiteContext ? 'with website context' : 'no website context');
        storage.set('company', companyName);
        storage.set('company-validated', companyKnowledgeValidated ? 'true' : 'false');
        storage.set('website-context', websiteContext || '');
        storage.set('company-description', companyDescription || '');
        console.log('Company data saved successfully');
      } catch (error) {
        console.error('Error saving company data:', error);
      }
    };
    
    saveCompanyData();
  }, [companyName, companyKnowledgeValidated, websiteContext, companyDescription, isInitialLoad]);

  // Dropdowns - Category-based system
  const categories = [
    "Internal",
    "Corporate & regulatory",
    "Marketing",
    "Customer",
    "Thought leadership",
    "Personal"
  ];

  const contentTypesByCategory = {
    "Internal": [
      "Leadership announcement",
      "Company-wide update",
      "Organisational change",
      "Policy update",
      "Team communication",
      "Internal newsletter",
      "Onboarding material",
      "Change management"
    ],
    "Corporate & regulatory": [
      "Media release",
      "ASX announcement",
      "Investor update",
      "Shareholder communication",
      "Board communication",
      "Annual report narrative",
      "Crisis communication",
      "AGM material"
    ],
    "Marketing": [
      "Campaign messaging",
      "Brand announcement",
      "Product launch",
      "Website copy",
      "Social media content",
      "Event promotion",
      "External newsletter",
      "Advertising copy",
      "Sales enablement"
    ],
    "Customer": [
      "Service update",
      "Account communication",
      "Customer onboarding",
      "Feature update",
      "Contract communication",
      "Support communication"
    ],
    "Thought leadership": [
      "Blog post",
      "Whitepaper",
      "Opinion piece",
      "Industry insight",
      "Case study",
      "LinkedIn article",
      "Speaking notes"
    ],
    "Personal": [
      "Professional email",
      "Follow-up message",
      "Networking outreach",
      "Thank you note",
      "Introduction",
      "Meeting request",
      "Recommendation"
    ]
  };

  // Get content types for selected category (create mode)
  const getContentTypes = () => {
    if (!category) return [];
    return contentTypesByCategory[category] || [];
  };

  // Get content types for analyse mode
  const getAnalyseContentTypes = () => {
    if (!analyseCategory) return [];
    return contentTypesByCategory[analyseCategory] || [];
  };

  const audiences = [
    "External stakeholders",
    "Customers and clients",
    "Employees and teams",
    "Partners and suppliers",
    "Industry and peers",
    "General public",
    "Executive leadership",
    "Regulatory and government",
    "Media and journalists"
  ];

  const focuses = [
    "Product or service update",
    "Strategic initiative",
    "Operational change",
    "Performance and results",
    "Leadership or people",
    "Partnership or collaboration",
    "Risk or compliance",
    "Innovation or capability",
    "Market or industry insight",
    "Sustainability and ESG"
  ];

  const tones = [
    "Confident and assertive",
    "Transparent and open",
    "Measured and balanced",
    "Urgent and direct",
    "Reassuring and stable",
    "Forward-looking",
    "Technical and detailed",
    "Conversational and accessible",
    "Inspirational and energetic"
  ];

  const suggestedPrompts = [
    "What key risks should we address?",
    "How can we make this more transparent?",
    "What information is missing?",
    "How would this be received?",
    "Is the tone appropriate for the audience?"
  ];

  // Update workspace when content changes
  // Load content into workspace
  const loadContent = () => {
    if (!content.trim()) {
      setError('Please enter or upload content first');
      return;
    }
    setWorkspaceContent(content);
    setShowWorkspace(true);
    setIsContentLoaded(true);
    setShowContentInput(false);
    setError('');
    // Initialize version history with loaded content
    setAnalyseVersionHistory([content]);
    setAnalyseCurrentVersion(0);
    // Generate AI-powered chat suggestions
    generateAnalyseChatSuggestions(content);
  };

  // Version management helpers
  const saveCreateVersion = (newContent) => {
    setCreateVersionHistory(prev => [...prev, newContent]);
    setCreateCurrentVersion(prev => prev + 1);
  };

  const saveAnalyseVersion = (newContent) => {
    setAnalyseVersionHistory(prev => [...prev, newContent]);
    setAnalyseCurrentVersion(prev => prev + 1);
  };

  const switchCreateVersion = (versionIndex) => {
    setCreateCurrentVersion(versionIndex);
    setGeneratedContent(createVersionHistory[versionIndex]);
    setIsCopied(false); // Reset copy state when switching versions
  };

  const switchAnalyseVersion = (versionIndex) => {
    setAnalyseCurrentVersion(versionIndex);
    setWorkspaceContent(analyseVersionHistory[versionIndex]);
    setIsWorkspaceCopied(false); // Reset copy state when switching versions
  };

  // callClaude is imported from @/lib/api

  // Parse JSON safely
  const parseJSON = (text) => {
    try {
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
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

  // Render markdown
  const renderMarkdown = (text) => {
    if (!text) return null;
    
    const lines = text.split('\n');
    const elements = [];
    let currentParagraph = [];
    
    const formatLine = (line) => {
      return line
        .replace(/\[Insert([^\]]+)\]/g, '<span class="bg-yellow-200 px-2 py-1 rounded font-semibold text-yellow-900">[Insert$1]</span>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>');
    };
    
    lines.forEach((line) => {
      if (line.startsWith('### ')) {
        if (currentParagraph.length > 0) {
          elements.push(<p key={`p-${elements.length}`} className="mb-4" dangerouslySetInnerHTML={{ __html: formatLine(currentParagraph.join('\n')).replace(/\n/g, '<br />') }} />);
          currentParagraph = [];
        }
        elements.push(<h3 key={`h3-${elements.length}`} className="text-lg font-bold text-gray-900 mt-4 mb-2" dangerouslySetInnerHTML={{ __html: formatLine(line.replace('### ', '')) }} />);
      } else if (line.startsWith('## ')) {
        if (currentParagraph.length > 0) {
          elements.push(<p key={`p-${elements.length}`} className="mb-4" dangerouslySetInnerHTML={{ __html: formatLine(currentParagraph.join('\n')).replace(/\n/g, '<br />') }} />);
          currentParagraph = [];
        }
        elements.push(<h2 key={`h2-${elements.length}`} className="text-xl font-bold text-gray-900 mt-5 mb-3" dangerouslySetInnerHTML={{ __html: formatLine(line.replace('## ', '')) }} />);
      } else if (line.startsWith('# ')) {
        if (currentParagraph.length > 0) {
          elements.push(<p key={`p-${elements.length}`} className="mb-4" dangerouslySetInnerHTML={{ __html: formatLine(currentParagraph.join('\n')).replace(/\n/g, '<br />') }} />);
          currentParagraph = [];
        }
        elements.push(<h1 key={`h1-${elements.length}`} className="text-2xl font-bold text-gray-900 mt-6 mb-3" dangerouslySetInnerHTML={{ __html: formatLine(line.replace('# ', '')) }} />);
      } else if (line.trim() === '') {
        if (currentParagraph.length > 0) {
          elements.push(<p key={`p-${elements.length}`} className="mb-4" dangerouslySetInnerHTML={{ __html: formatLine(currentParagraph.join('\n')).replace(/\n/g, '<br />') }} />);
          currentParagraph = [];
        }
      } else {
        currentParagraph.push(line);
      }
    });
    
    if (currentParagraph.length > 0) {
      elements.push(<p key={`p-${elements.length}`} className="mb-4" dangerouslySetInnerHTML={{ __html: formatLine(currentParagraph.join('\n')).replace(/\n/g, '<br />') }} />);
    }
    
    return elements;
  };

  // Copy to clipboard for Word
  const copyToClipboard = async () => {
    if (!generatedContent) return;

    try {
      const lines = generatedContent.split('\n');
      let html = `<div style="font-family: 'Calibri', 'Arial', sans-serif;">`;
      
      html += `<h2 style="color: #000006; font-size: 20px; margin-bottom: 20px;">${contentType.toUpperCase()}</h2>`;
      html += `<hr style="border: 1px solid #4A4A4E; margin-bottom: 20px;" />`;
      
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
      
      html += `<hr style="border: 1px solid #4A4A4E; margin-top: 30px; margin-bottom: 10px;" />`;
      html += `<p style="font-style: italic; color: #666; font-size: 12px;">Generated by Crafti</p>`;
      html += `</div>`;

      const plainText = generatedContent.replace(/\*\*/g, '').replace(/\*/g, '').replace(/^#+\s/gm, '');

      const clipboardItem = new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plainText], { type: 'text/plain' })
      });
      
      await navigator.clipboard.write([clipboardItem]);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Copy error:', err);
      // Fallback
      try {
        const plainText = generatedContent.replace(/\*\*/g, '').replace(/\*/g, '').replace(/^#+\s/gm, '');
        await navigator.clipboard.writeText(plainText);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch {
        alert('Failed to copy');
      }
    }
  };

  // Copy workspace content to clipboard for Word
  const copyWorkspaceContent = async () => {
    if (!workspaceContent) return;

    try {
      const lines = workspaceContent.split('\n');
      let html = `<div style="font-family: 'Calibri', 'Arial', sans-serif;">`;
      
      html += `<h2 style="color: #000006; font-size: 20px; margin-bottom: 20px;">CORPORATE COMMUNICATION</h2>`;
      html += `<hr style="border: 1px solid #4A4A4E; margin-bottom: 20px;" />`;
      
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
      
      html += `<hr style="border: 1px solid #4A4A4E; margin-top: 30px; margin-bottom: 10px;" />`;
      html += `<p style="font-style: italic; color: #666; font-size: 12px;">Generated by Crafti</p>`;
      html += `</div>`;

      const plainText = workspaceContent.replace(/\*\*/g, '').replace(/\*/g, '').replace(/^#+\s/gm, '');

      const clipboardItem = new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plainText], { type: 'text/plain' })
      });
      
      await navigator.clipboard.write([clipboardItem]);
      setIsWorkspaceCopied(true);
      setTimeout(() => setIsWorkspaceCopied(false), 2000);
    } catch (err) {
      console.error('Copy error:', err);
      try {
        const plainText = workspaceContent.replace(/\*\*/g, '').replace(/\*/g, '').replace(/^#+\s/gm, '');
        await navigator.clipboard.writeText(plainText);
        setIsWorkspaceCopied(true);
        setTimeout(() => setIsWorkspaceCopied(false), 2000);
      } catch {
        alert('Failed to copy');
      }
    }
  };

  // File upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError('');
    setUploadedFile(file);

    try {
      let fileContent = '';
      const fileName = file.name.toLowerCase();
      
      if (fileName.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        fileContent = result;
      } else if (fileName.endsWith('.txt')) {
        fileContent = await file.text();
      } else if (fileName.endsWith('.pdf')) {
        const arrayBuffer = await file.arrayBuffer();
        fileContent = await extractTextFromPDF(arrayBuffer);
      } else {
        setError('Please upload .docx, .txt, or .pdf files');
        setUploadedFile(null);
        e.target.value = '';
        return;
      }

      // Check word count
      const wordCount = countWords(fileContent);
      if (wordCount > MAX_CONTENT_WORDS) {
        setError(`Content too long. Maximum ${MAX_CONTENT_WORDS.toLocaleString()} words (file has ${wordCount.toLocaleString()}). Please upload a shorter document.`);
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

  // Reference file upload handler (for Create mode)
  const handleRefFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check if we already have 3 files
    if (uploadedRefFiles.length >= 3) {
      setError('Maximum 3 reference files allowed. Please remove a file before uploading another.');
      event.target.value = '';
      return;
    }

    try {
      const fileName = file.name.toLowerCase();
      let content = '';
      
      if (fileName.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        content = result;
      } else if (fileName.endsWith('.txt')) {
        content = await file.text();
      } else if (fileName.endsWith('.pdf')) {
        // For PDFs, we'll extract text using a simple approach
        // Note: This is basic text extraction - complex PDFs may not work perfectly
        const arrayBuffer = await file.arrayBuffer();
        const text = await extractTextFromPDF(arrayBuffer);
        content = text;
      } else {
        setError('Please upload .docx, .txt, or .pdf files');
        event.target.value = '';
        return;
      }
      
      // Check word count - max 20,000 words per reference file
      const wordCount = countWords(content);
      const MAX_REF_WORDS = 20000;
      
      if (wordCount > MAX_REF_WORDS) {
        setError(`Document too long (${wordCount.toLocaleString()} words). Maximum 20,000 words per reference file.`);
        event.target.value = '';
        return;
      }
      
      // Add to arrays with word count
      setUploadedRefFiles(prev => [...prev, file]);
      setRefFileContents(prev => [...prev, { name: file.name, content, wordCount }]);
      setError(''); // Clear any previous errors
      
      // Clear input so same file can be uploaded again
      event.target.value = '';
      
    } catch (error) {
      console.error('Error reading reference file:', error);
      setError('Error reading file. Please try again or use a different file.');
      event.target.value = '';
    }
  };

  // Simple PDF text extraction
  const extractTextFromPDF = async (arrayBuffer) => {
    try {
      // Dynamically load pdf.js if not already loaded
      if (!window.pdfjsLib) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          script.onload = () => {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            resolve();
          };
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      
      // Load the PDF document
      const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      // Extract text from all pages
      let fullText = '';
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map(item => item.str)
          .join(' ');
        fullText += pageText + '\n\n';
      }
      
      return fullText.trim() || 'PDF content could not be extracted. Please try a different file.';
    } catch (err) {
      console.error('PDF extraction error:', err);
      return 'PDF extraction failed. Please try uploading a Word document or text file instead.';
    }
  };

  const removeRefFile = (index) => {
    setUploadedRefFiles(prev => prev.filter((_, i) => i !== index));
    setRefFileContents(prev => prev.filter((_, i) => i !== index));
  };

  // Company context file upload handler
  const handleCompanyFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check if we already have 3 files
    if (companyContextFiles.length >= 3) {
      setError('Maximum 3 company context files allowed. Please remove a file before uploading another.');
      event.target.value = '';
      return;
    }

    try {
      const fileName = file.name.toLowerCase();
      let content = '';
      
      if (fileName.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        content = result;
      } else if (fileName.endsWith('.txt')) {
        content = await file.text();
      } else if (fileName.endsWith('.pdf')) {
        const arrayBuffer = await file.arrayBuffer();
        const text = await extractTextFromPDF(arrayBuffer);
        content = text;
      } else {
        setError('Please upload .docx, .txt, or .pdf files');
        event.target.value = '';
        return;
      }
      
      // Add to company context arrays
      setCompanyContextFiles(prev => [...prev, file]);
      setCompanyContextFileContents(prev => [...prev, { name: file.name, content }]);
      setError('');
      
      event.target.value = '';
      
    } catch (error) {
      console.error('Error reading company file:', error);
      setError('Error reading file. Please try again or use a different file.');
      event.target.value = '';
    }
  };

  const removeCompanyFile = (index) => {
    setCompanyContextFiles(prev => prev.filter((_, i) => i !== index));
    setCompanyContextFileContents(prev => prev.filter((_, i) => i !== index));
  };

  // Build company context for prompts
  const buildCompanyContext = () => {
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
  };

  // Check company knowledge - three-tier system
  const checkCompanyKnowledge = async () => {
    if (!companyName.trim()) {
      setError('Please enter a company name');
      return;
    }

    setError('');
    setIsCheckingKnowledge(true);
    setKnowledgeCheckResult(null);
    setProbableCompanyInfo(null);

    try {
      const prompt = `You are assessing whether you have sufficient knowledge about a company to create professional communications for them.

COMPANY NAME: ${companyName}

Evaluate your knowledge about this company across these criteria:
- Business operations and what they do
- Industry and key products/services  
- Market position and competitors
- Corporate structure and leadership (if a large/public company)

Respond with ONLY a JSON object in this exact format:
{
  "confidence": "confident" or "probable" or "unknown",
  "officialName": "The official/full company name if you know it",
  "description": "Brief 1-2 sentence description of the company",
  "reasoning": "Brief explanation of your confidence level"
}

CONFIDENCE LEVELS:
- "confident": You are certain about this company. Major well-known companies like Fortune 500, ASX200, Big 4 banks, major retailers, multinationals. Examples: Microsoft, Woolworths Group, Commonwealth Bank, NAB, Telstra, BHP, Qantas.
- "probable": You think you know this company but the name is ambiguous or you want to confirm. For example, "Woolworths" could be Woolworths Group (Australia) or Woolworths Holdings (South Africa). Or acronyms like "CBA" where you're fairly sure but want to confirm.
- "unknown": You genuinely don't have enough information about this company. Small businesses, regional companies, startups, or niche organisations you haven't encountered.

Be MORE willing to say "confident" for well-known Australian and international companies. If in doubt between confident and probable, lean toward "confident" for major brands.`;

      const result = await callClaude(prompt, 500);
      const assessment = parseJSON(result);
      
      if (assessment.confidence === 'confident') {
        setKnowledgeCheckResult('confident');
        setCompanyKnowledgeValidated(true);
      } else if (assessment.confidence === 'probable') {
        setKnowledgeCheckResult('probable');
        setProbableCompanyInfo({
          suggestedName: assessment.officialName || companyName,
          description: assessment.description || 'A company I believe I have information about.'
        });
      } else {
        setKnowledgeCheckResult('unknown');
      }
    } catch (err) {
      console.error('Knowledge check error:', err);
      setError('Failed to check company knowledge');
    } finally {
      setIsCheckingKnowledge(false);
    }
  };

  // Confirm probable company match
  const confirmProbableCompany = (confirmed) => {
    if (confirmed) {
      // User confirmed - proceed with the company (keep their original name, don't change it)
      setCompanyKnowledgeValidated(true);
      setKnowledgeCheckResult('confident');
    } else {
      // User said no - show URL input
      setKnowledgeCheckResult('unknown');
    }
    setProbableCompanyInfo(null);
  };

  // extractDomain helper
  const extractDomain = (url) => {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return null;
    }
  };

  // Search company website using web search API
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
1. The SUMMARY section must be plain text only. No headers, no "##", no "PART 1", no "Based on my search". Start directly with "[Company name] is..." or "[Company name] provides..."
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
          const sentences = textContent.split(/[.!?]+/).filter(s => s.trim());
          summary = sentences.slice(0, 2).join('. ').trim();
          if (summary && !summary.endsWith('.')) summary += '.';
        }

        const stripMarkdown = (text) => text
          .replace(/^#{1,6}\s*/gm, '')
          .replace(/\*\*([^*]+)\*\*/g, '$1')
          .replace(/\*([^*]+)\*/g, '$1')
          .replace(/^\s*[-*+]\s+/gm, '')
          .replace(/^\s*\d+\.\s+/gm, '')
          .replace(/`([^`]+)`/g, '$1')
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
          .replace(/^PART\s*\d+[:\-\s]*/gi, '')
          .replace(/^SUMMARY[:\-\s]*/gi, '')
          .replace(/^BRIEF SUMMARY[:\-\s]*/gi, '')
          .replace(/^Based on (my |the )?search results?,?\s*/gi, '')
          .replace(/^I can provide (comprehensive )?information about [^.]+\.\s*/gi, '')
          .replace(/^Let me organiz?e this[^.]*\.\s*/gi, '')
          .replace(/^Here'?s? (is )?(the |a )?(comprehensive )?(summary|information)[^.]*\.\s*/gi, '')
          .replace(/\n{3,}/g, '\n\n')
          .trim();

        summary = stripMarkdown(summary);
        fullContext = stripMarkdown(fullContext);

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
      setError(`Failed to search website: ${err.message}. You can try again or add context manually.`);
      setWebSearchStatus('');
    } finally {
      setIsSearchingWebsite(false);
    }
  };

  // Proceed with company context
  const proceedWithCompanyContext = () => {
    if (!companyContext.trim() && companyContextFiles.length === 0) {
      setError('Please provide company context (text or upload documents)');
      return;
    }
    setCompanyKnowledgeValidated(true);
    setKnowledgeCheckResult('confident');
    setError('');
  };

  // Generate content
  const generateContent = async () => {
    if (!category) {
      setError('Please select a communication category');
      return;
    }
    if (!contentType) {
      setError('Please select a content type');
      return;
    }

    setError('');
    setIsGenerating(true);
    setGeneratedContent('');
    setCreateSuggestions([]);
    setShowCreateSuggestions(false);
    
    // Scroll down to show loading stages
    setTimeout(() => {
      window.scrollBy({ top: 300, behavior: 'smooth' });
    }, 100);

    const stages = [
      "Understanding requirements and parameters...",
      "Considering organisation context and tone...",
      "Drafting core message and structure...",
      "Refining language and formatting...",
      "Finalising content..."
    ];

    const cleanup = animateStages(stages);

    try {
      const prompt = `You are a professional communications specialist.

${buildCompanyContext()}

Create a ${contentType} for ${companyName} with these parameters:

AUDIENCE: ${audience || 'General stakeholders'}
FOCUS: ${focus || 'General corporate update'}
TONE: ${tone || 'Professional and balanced'}

${customInput ? `ADDITIONAL CONTEXT:\n${customInput}\n\n` : ''}
${refFileContents.length > 0 ? `REFERENCE MATERIAL:\n${refFileContents.map((f, i) => `\n--- Document ${i + 1}: ${f.name} ---\n${f.content}`).join('\n\n')}\n\n` : ''}

Write professional corporate communication that:
1. Is appropriate for ${companyName} considering their business, industry, and context
2. Maintains credibility and transparency
3. Uses British English spelling (analyse, organise, etc.)
4. Is appropriate length for ${contentType}

${contentType === 'Media release' ? `
MEDIA RELEASE STYLE REQUIREMENTS:
- Write in third person (the company writes about itself in third person for journalistic use)
- Use FACTUAL, news-focused language - avoid promotional adjectives like "renowned", "leading", "premier" in body text
- Keep body text neutral and newsworthy - save personality and promotional language for QUOTES
- Focus on facts: what happened, who is involved, when, why it matters, what the impact is
- Quotes should contain the company's voice, enthusiasm, and strategic messaging
- Follow standard media release structure: headline, dateline, lead paragraph, body, boilerplate, contact info
` : ''}

${category === 'Internal' ? `
INTERNAL COMMUNICATION REQUIREMENTS:
- This is an INTERNAL communication to employees/team members, NOT external stakeholders
- Use appropriate internal salutations: "Dear Team", "Dear Colleagues", "Team", or "Hello everyone" - NEVER "Dear Stakeholders"
- Write in a direct, authentic voice as if leadership is speaking directly to their team
- Focus on transparency, clarity, and building connection with employees
- Use "we", "our team", "our people" language to create inclusion
- Address employee-specific concerns and perspectives
` : ''}

CRITICAL INSTRUCTIONS ABOUT PLACEHOLDERS:
- DO NOT invent specific names, dates, figures, or details you don't have
- If you need a person's name: **[Insert name]**
- If you need a date: **[Insert date]**  
- If you need figures/data: **[Insert specific data]**
- Make placeholders clear and obvious

${buildStyleContext()}
Write ONLY the content itself - no preamble.`;

      const result = await callClaude(prompt, 2000);
      cleanup();
      // Save to version history (first version)
      setCreateVersionHistory([result]);
      setCreateCurrentVersion(0);
      typewriter(result, setGeneratedContent);
      // Generate AI-powered chat suggestions
      generateCreateChatSuggestions(result);
    } catch (err) {
      cleanup();
      console.error('Generation error:', err);
      setError('Failed to generate content');
    } finally {
      setIsGenerating(false);
      setLoadingStages([]);
    }
  };

  // Regenerate with style (uses chat-like loading stages)
  const regenerateWithStyle = async () => {
    if (!generatedContent.trim() || !selectedStyleId) return;

    setError('');
    setIsRegeneratingWithStyle(true);

    const stages = [
      "Understanding your request...",
      "Reviewing current content...",
      "Applying style guide...",
      "Refining language and tone..."
    ];

    const cleanup = animateStages(stages);

    try {
      const prompt = `Rewrite this communication for ${companyName} applying the specified style guide.

${buildCompanyContext()}

CURRENT CONTENT:
${generatedContent}

${buildStyleContext()}
INSTRUCTIONS:
- Apply the style guide to the existing content
- Maintain the same structure and key messages
- Adjust tone, voice, and language to match the style
- Keep all placeholder tags like **[Insert ...]** intact
- Use British English spelling

Return ONLY the rewritten content with no preamble.`;

      const result = await callClaude(prompt, 2500);
      cleanup();
      
      // Save to version history
      saveCreateVersion(result);
      typewriter(result, setGeneratedContent);
    } catch (err) {
      cleanup();
      console.error('Regenerate with style error:', err);
      setError('Failed to regenerate with style');
    } finally {
      setIsRegeneratingWithStyle(false);
      setLoadingStages([]);
    }
  };

  // Apply style to workspace content (Analyse mode)
  const applyStyleToWorkspace = async () => {
    if (!workspaceContent.trim() || !selectedStyleId) return;

    setError('');
    setIsApplyingStyleToWorkspace(true);
    setIsModifyingContent(true);

    const stages = [
      "Understanding your content...",
      "Reviewing style guide...",
      "Applying style guidelines...",
      "Refining language and tone..."
    ];

    const cleanup = animateStages(stages);

    try {
      const prompt = `Rewrite this communication for ${companyName} applying the specified style guide.

${buildCompanyContext()}

CURRENT CONTENT:
${workspaceContent}

${buildStyleContext()}
INSTRUCTIONS:
- Apply the style guide to the existing content
- Maintain the same structure and key messages
- Adjust tone, voice, and language to match the style
- Keep all placeholder tags like **[Insert ...]** intact
- Use British English spelling

Return ONLY the rewritten content with no preamble.`;

      const result = await callClaude(prompt, 2500);
      cleanup();
      
      // Save to version history
      saveAnalyseVersion(result);
      typewriter(result, setWorkspaceContent);
    } catch (err) {
      cleanup();
      console.error('Apply style to workspace error:', err);
      setError('Failed to apply style');
    } finally {
      setIsApplyingStyleToWorkspace(false);
      setIsModifyingContent(false);
      setLoadingStages([]);
    }
  };

  // Analyse for improvements (create mode)
  const analyseCreateForImprovements = async () => {
    setIsAnalysingCreate(true);
    setShowCreateSuggestions(false);
    setError('');

    try {
      const prompt = `Analyse this communication for ${companyName} and provide exactly 5 specific improvement suggestions.

${buildCompanyContext()}

CONTENT:
${generatedContent}

Each suggestion:
- title: Brief (5-8 words)
- description: Detailed (20-30 words)
- impact: "High", "Medium", or "Low"

Return ONLY JSON array:
[{"title": "...", "description": "...", "impact": "High"}]`;

      const response = await callClaude(prompt, 1500);
      const suggestions = parseJSON(response);
      
      if (!Array.isArray(suggestions)) throw new Error('Invalid format');
      
      setCreateSuggestions(suggestions);
      setShowCreateSuggestions(true);
      setSelectedCreateSuggestions([]);
    } catch (error) {
      console.error('Analysis error:', error);
      setError('Failed to analyse content');
    } finally {
      setIsAnalysingCreate(false);
    }
  };

  // Apply selected suggestions (create mode)
  const applyCreateSuggestions = async () => {
    if (selectedCreateSuggestions.length === 0) {
      setError('Please select at least one suggestion');
      return;
    }

    setError('');
    setIsApplyingCreateSuggestions(true);

    const stages = [
      "Analysing selected improvements...",
      "Reviewing current content...",
      "Incorporating suggestions...",
      "Refining language and tone..."
    ];

    const cleanup = animateStages(stages);

    try {
      const selected = selectedCreateSuggestions
        .map(idx => `${idx + 1}. ${createSuggestions[idx].title}: ${createSuggestions[idx].description}`)
        .join('\n');

      const prompt = `Refine this communication for ${companyName} applying these improvements:

${buildCompanyContext()}

CURRENT:
${generatedContent}

IMPROVEMENTS:
${selected}

CRITICAL: DO NOT invent names, dates, or details. Use **[Insert ...]** placeholders.
Use British English spelling.

Return ONLY refined content, no preamble.`;

      const refined = await callClaude(prompt, 2500);
      cleanup();
      // Save new version to history
      saveCreateVersion(refined);
      setGeneratedContent('');
      typewriter(refined, setGeneratedContent);
      
      setShowCreateSuggestions(false);
      setCreateSuggestions([]);
      setSelectedCreateSuggestions([]);
      setIsCopied(false);
    } catch (error) {
      cleanup();
      console.error('Apply error:', error);
      setError('Failed to apply suggestions');
    } finally {
      setIsApplyingCreateSuggestions(false);
      setLoadingStages([]);
    }
  };

  // Detect user intent: modification request vs question
  const detectIntent = (message) => {
    const lowerMsg = message.toLowerCase().trim();
    
    // Strong modification indicators
    const modificationKeywords = [
      'make', 'change', 'rewrite', 'add', 'remove', 'delete', 'improve', 
      'shorten', 'expand', 'strengthen', 'weaken', 'rephrase', 'revise',
      'edit', 'update', 'modify', 'adjust', 'fix', 'enhance', 'reduce',
      'increase', 'clarify', 'simplify', 'elaborate', 'insert', 'replace',
      'more concise', 'less formal', 'more formal', 'less technical',
      'more detail', 'cut', 'trim'
    ];
    
    // Strong question indicators
    const questionKeywords = [
      'what', 'how', 'why', 'when', 'where', 'who', 'which',
      'should we', 'could we', 'would', 'can you', 'do you think',
      'is there', 'are there', 'does this', 'will this',
      'tell me', 'explain', 'list', 'identify', 'analyse', 'analyze'
    ];
    
    // Check for question marks
    if (lowerMsg.includes('?')) {
      return 'question';
    }
    
    // Check for modification keywords
    for (const keyword of modificationKeywords) {
      if (lowerMsg.includes(keyword)) {
        return 'modification';
      }
    }
    
    // Check for question patterns at start
    for (const keyword of questionKeywords) {
      if (lowerMsg.startsWith(keyword)) {
        return 'question';
      }
    }
    
    // Default to question when uncertain (safer - won't accidentally overwrite)
    return 'question';
  };

  // Refine created content
  const refineCreatedContent = async (messageOverride = null) => {
    const msg = messageOverride || createChatInput;
    if (!msg.trim()) return;

    const intent = detectIntent(msg);
    
    setCreateChatInput('');
    setCreateChatMessages(prev => [...prev, { role: 'user', content: msg }]);
    setIsRefiningCreate(true);
    
    // Clear suggestions when user sends a message
    setCreateChatSuggestions([]);

    // Only show loading stages on content area for modifications
    let cleanup = () => {};
    if (intent === 'modification') {
      // Scroll up immediately so user sees the thought process
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
      const stages = [
        "Understanding your request...",
        "Reviewing current content...",
        "Incorporating changes...",
        "Refining language and tone..."
      ];
      cleanup = animateStages(stages);
    }

    try {
      const history = createChatMessages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}:\n${m.content}`).join('\n\n');
      
      let prompt;
      
      if (intent === 'modification') {
        // User wants to change the content
        prompt = `Refine this communication for ${companyName}.

${buildCompanyContext()}

CURRENT:
${generatedContent}

${history ? `HISTORY:\n${history}\n\n` : ''}

USER REQUEST:
${msg}

CRITICAL: DO NOT invent names, dates, or details. Use **[Insert ...]** placeholders.
Use British English spelling.

Return ONLY refined content, no preamble.`;
      } else {
        // User is asking a question
        prompt = `You are advising on this communication for ${companyName}.

${buildCompanyContext()}

CURRENT CONTENT:
${generatedContent}

${history ? `CONVERSATION HISTORY:\n${history}\n\n` : ''}

USER QUESTION:
${msg}

Provide helpful, specific advice about the content. Be concise (50-150 words). Do NOT rewrite the content unless explicitly asked.

Use British English spelling.`;
      }

      const result = await callClaude(prompt, 2500);
      cleanup();
      
      if (intent === 'modification') {
        // Save new version to history
        saveCreateVersion(result);
        // Update the working draft
        setGeneratedContent('');
        typewriter(result, setGeneratedContent);
        setCreateChatMessages(prev => [...prev, { role: 'assistant', content: 'Working draft updated.' }]);
      } else {
        // Just add the advice to chat
        setCreateChatMessages(prev => [...prev, { role: 'assistant', content: result }]);
      }
      
      setIsCopied(false);
    } catch (err) {
      cleanup();
      setError('Failed to process request');
    } finally {
      setIsRefiningCreate(false);
      setLoadingStages([]);
    }
  };

  // Generate AI-powered chat suggestions for Create mode
  const generateCreateChatSuggestions = async (content) => {
    if (!content.trim()) return;
    
    setIsGeneratingCreateSuggestions(true);
    try {
      const prompt = `Based on this communication draft, suggest exactly 4 short prompts a user might want to ask or request. Mix of questions and actions.

CONTENT:
${content.slice(0, 1500)}

Return a JSON array of 4 strings. Each should be 3-8 words. Examples:
["Make the opening more compelling", "Is the tone appropriate?", "Add more specific data points", "Shorten the conclusion"]

Return ONLY the JSON array, nothing else.`;

      const result = await callClaude(prompt, 200);
      const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const suggestions = JSON.parse(cleaned);
      setCreateChatSuggestions(Array.isArray(suggestions) ? suggestions.slice(0, 4) : []);
    } catch (error) {
      console.error('Error generating create suggestions:', error);
      setCreateChatSuggestions([]);
    } finally {
      setIsGeneratingCreateSuggestions(false);
    }
  };

  // Generate AI-powered chat suggestions for Analyse mode
  const generateAnalyseChatSuggestions = async (content) => {
    if (!content.trim()) return;
    
    setIsGeneratingAnalyseSuggestions(true);
    try {
      const prompt = `Based on this communication, suggest exactly 4 short prompts a user might want to ask or request for refinement. Mix of questions and actions.

CONTENT:
${content.slice(0, 1500)}

Return a JSON array of 4 strings. Each should be 3-8 words. Examples:
["Strengthen the key message", "Is anything missing?", "Make it more concise", "Check for inconsistencies"]

Return ONLY the JSON array, nothing else.`;

      const result = await callClaude(prompt, 200);
      const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const suggestions = JSON.parse(cleaned);
      setAnalyseChatSuggestions(Array.isArray(suggestions) ? suggestions.slice(0, 4) : []);
    } catch (error) {
      console.error('Error generating analyse suggestions:', error);
      setAnalyseChatSuggestions([]);
    } finally {
      setIsGeneratingAnalyseSuggestions(false);
    }
  };

  // Multi-stage loading
  const animateStages = (stages, duration = 12000) => {
    setLoadingStages(stages);
    setCurrentStage(0);
    
    const timePerStage = duration / stages.length;
    let stageIndex = 0;
    
    const interval = setInterval(() => {
      stageIndex++;
      if (stageIndex < stages.length) {
        setCurrentStage(stageIndex);
      } else {
        clearInterval(interval);
      }
    }, timePerStage);
    
    return () => clearInterval(interval);
  };

  // Check if a tool is recommended
  const isToolRecommended = (toolName) => {
    if (!suggestedTools || !suggestedTools.recommendations) return false;
    return suggestedTools.recommendations.some(rec => 
      rec.tool.toLowerCase().includes(toolName.toLowerCase()) ||
      toolName.toLowerCase().includes(rec.tool.toLowerCase().split(' ').slice(0, 3).join(' '))
    );
  };

  // Add or update analysis result
  const addOrUpdateResult = (type, data) => {
    setAnalysisResults(prev => {
      const existing = prev.filter(r => r.type !== type);
      return [{ type, data, timestamp: Date.now(), selected: [], analysedVersion: analyseCurrentVersion }, ...existing];
    });
  };

  // Toggle item selection in result
  const toggleResultSelection = (resultType, itemId) => {
    setAnalysisResults(prev => prev.map(r => {
      if (r.type !== resultType) return r;
      const selected = r.selected || [];
      return {
        ...r,
        selected: selected.includes(itemId) 
          ? selected.filter(id => id !== itemId)
          : [...selected, itemId]
      };
    }));
  };

  // Get consolidated feedback dynamically - returns objects with text and scope
  const getConsolidatedFeedback = () => {
    const feedback = [];
    
    analysisResults.forEach(result => {
      if (!result.selected || result.selected.length === 0 || !result.data) return;
      
      if (result.type === 'trust') {
        result.selected.forEach(idx => {
          const score = result.data.scores?.[idx];
          if (score) {
            feedback.push({
              text: `Address ${score.dimension}: ${score.reasoning}`,
              scope: 'thematic',
              source: 'Trust framework'
            });
          }
        });
      } else if (result.type === 'stakeholders') {
        result.selected.forEach(idx => {
          const group = result.data[idx];
          if (group) {
            const reactionSummary = group.reaction ? group.reaction.join('; ') : (group.concerns ? group.concerns.join('; ') : 'Review stakeholder perspective');
            feedback.push({
              text: `${group.name} (${group.sentiment}): ${reactionSummary}`,
              scope: 'thematic',
              source: 'Stakeholder lens'
            });
          }
        });
      } else if (result.type === 'improvements') {
        result.selected.forEach(idx => {
          const imp = result.data[idx];
          if (imp) {
            feedback.push({
              text: `${imp.title}: ${imp.description}`,
              scope: imp.scope || 'thematic',
              source: 'Improvements'
            });
          }
        });
      } else if (result.type === 'strengths') {
        result.selected.forEach(idx => {
          const strength = result.data[idx];
          if (strength) {
            feedback.push({
              text: `Maintain: ${strength.title} - ${strength.description}`,
              scope: 'thematic',
              source: 'Strengths'
            });
          }
        });
      } else if (result.type === 'afr') {
        result.selected.forEach(idx => {
          const theme = result.data.themes?.[idx];
          if (theme) {
            feedback.push({
              text: theme,
              scope: 'thematic',
              source: 'AFR test'
            });
          }
        });
      } else if (result.type === 'quoteRisks') {
        result.selected.forEach(idx => {
          const risk = result.data[idx];
          if (risk) {
            feedback.push({
              text: `"${risk.quote}" - ${risk.risk}`,
              scope: 'surgical',
              source: 'Quote risks'
            });
          }
        });
      } else if (result.type === 'assumptions') {
        result.selected.forEach(idx => {
          const assumption = result.data[idx];
          if (assumption) {
            feedback.push({
              text: `${assumption.assumption} - ${assumption.risk}`,
              scope: 'surgical',
              source: 'Assumed knowledge'
            });
          }
        });
      } else if (result.type === 'audienceTone') {
        result.selected.forEach(idx => {
          if (typeof idx === 'string' && idx.startsWith('theme-')) {
            const themeIdx = parseInt(idx.replace('theme-', ''), 10);
            const theme = result.data.themes?.[themeIdx];
            if (theme) {
              feedback.push({
                text: `${theme.theme} - ${theme.rationale}`,
                scope: 'thematic',
                source: 'Audience & tone'
              });
            }
          } else {
            const issue = result.data.issues?.[idx];
            if (issue) {
              feedback.push({
                text: `${issue.issue} - ${issue.suggestion}${issue.example ? ` (Example: "${issue.example}")` : ''}`,
                scope: 'surgical',
                source: 'Audience & tone'
              });
            }
          }
        });
      } else if (result.type === 'structure') {
        result.selected.forEach(idx => {
          const issue = result.data.issues?.[idx];
          if (issue) {
            feedback.push({
              text: `(${issue.location}): ${issue.issue} - ${issue.fix}`,
              scope: issue.scope || 'surgical',
              source: 'Structure & clarity'
            });
          }
        });
      } else if (result.type === 'expertPersona') {
        result.selected.forEach(idx => {
          const improvement = result.data.feedback?.improvements?.[idx];
          if (improvement) {
            feedback.push({
              text: `${improvement.point} - ${improvement.detail}`,
              scope: improvement.scope || 'thematic',
              source: 'Expert persona'
            });
          }
        });
      } else if (result.type === 'faq') {
        result.selected.forEach(idx => {
          const faq = result.data[idx];
          if (faq) {
            feedback.push({
              text: `"${faq.question}" (${faq.audience})`,
              scope: 'thematic',
              source: 'FAQ preparation'
            });
          }
        });
      } else if (result.type === 'compliance') {
        result.selected.forEach(idx => {
          const issue = result.data.issues?.[idx];
          if (issue) {
            feedback.push({
              text: `(${issue.regulation}): ${issue.issue} - ${issue.recommendation}`,
              scope: 'surgical',
              source: 'Compliance check'
            });
          }
        });
      }
    });
    
    return feedback;
  };

  // Copy action items to clipboard
  const copyActionItems = async () => {
    const feedback = getConsolidatedFeedback();
    if (feedback.length === 0) return;

    const text = `COMMUNICATIONS ANALYSIS - ACTION ITEMS\n\n${feedback.map((item, idx) => `${idx + 1}. [${item.source}] [${item.scope === 'thematic' ? 'APPLIES THROUGHOUT' : 'SPECIFIC FIX'}]\n   ${item.text}`).join('\n\n')}\n\nGenerated: ${new Date().toLocaleString('en-AU')}`;
    
    try {
      await navigator.clipboard.writeText(text);
      // Could add a copied state here if needed
    } catch (err) {
      alert('Failed to copy');
    }
  };

  // Apply action items to create improved version
  const applyActionItems = async () => {
    const feedback = getConsolidatedFeedback();
    if (feedback.length === 0) {
      setError('No action items selected');
      return;
    }

    setError('');
    setIsApplyingActionItems(true);
    
    // Scroll up to show the working draft
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);

    const stages = [
      "Understanding requested changes...",
      "Analysing current content structure...",
      "Incorporating improvements...",
      "Refining language and tone...",
      "Finalising updated content..."
    ];

    const cleanup = animateStages(stages);

    // Separate items by scope
    const thematicItems = feedback.filter(f => f.scope === 'thematic');
    const surgicalItems = feedback.filter(f => f.scope === 'surgical');

    try {
      let prompt = `You are editing a communication for ${companyName}. You must implement the action items below with precision.

${buildCompanyContext()}

CURRENT CONTENT:
${workspaceContent}

`;

      // Add thematic items if any
      if (thematicItems.length > 0) {
        prompt += `THEMATIC CHANGES (apply throughout the entire document):
These changes should be reflected consistently across the whole communication. Review every paragraph and apply these principles where relevant.

${thematicItems.map((item, idx) => `${idx + 1}. [From: ${item.source}] ${item.text}`).join('\n')}

`;
      }

      // Add surgical items if any
      if (surgicalItems.length > 0) {
        prompt += `SURGICAL FIXES (targeted changes only):
These are specific fixes. Change ONLY the exact text or issue mentioned. Do NOT modify surrounding content.

${surgicalItems.map((item, idx) => `${idx + 1}. [From: ${item.source}] ${item.text}`).join('\n')}

`;
      }

      prompt += `CRITICAL RULES:
1. For THEMATIC changes: Apply the principle consistently throughout, touching multiple sections as needed
2. For SURGICAL fixes: Make the minimal change required - do NOT rephrase, restructure, or "improve" any text that isn't directly addressed by that specific fix
3. Preserve the original structure, flow, and wording of content that isn't being changed
4. Maintain professional corporate tone
5. Use British English spelling
6. If you need specific information not provided (names, dates, figures), use **[Insert ...]** placeholders
7. DO NOT invent details or add content that wasn't requested

Your goal is precision: implement exactly what's requested, nothing more, nothing less.

Return ONLY the improved communication, no preamble or explanation.`;

      const improved = await callClaude(prompt, 3000);
      cleanup();
      
      // Save new version to history
      saveAnalyseVersion(improved);
      
      // Update workspace with improved version
      setWorkspaceContent(improved);
      
      // Clear selections after applying
      setAnalysisResults(prev => prev.map(r => ({ ...r, selected: [] })));
      
    } catch (err) {
      cleanup();
      console.error('Apply error:', err);
      setError('Failed to apply action items');
    } finally {
      setIsApplyingActionItems(false);
      setLoadingStages([]);
    }
  };

  // Check if any items selected
  const hasSelectedItems = analysisResults.some(r => r.selected && r.selected.length > 0);

  // Trust framework
  const analyseTrust = async () => {
    if (!workspaceContent.trim()) {
      setError('Please load content to analyse');
      return;
    }

    setError('');
    
    // Add empty result immediately so loading appears at top
    addOrUpdateResult('trust', null);
    setIsAnalysingTrust(true);
    
    // Scroll down to show loading stages
    setTimeout(() => {
      window.scrollBy({ top: 300, behavior: 'smooth' });
    }, 100);

    const stages = [
      "Reading communication content...",
      "Evaluating trust and credibility indicators...",
      "Assessing clarity and messaging...",
      "Analysing transparency and openness...",
      "Scoring reputation and risk factors...",
      "Finalising analysis..."
    ];

    const cleanup = animateStages(stages);

    try {
      const prompt = `Analyse this communication for ${companyName}. BE BRUTALLY HONEST.

${buildCompanyContext()}

SCORING:
0-2: Gibberish/incomprehensible/inappropriate
3-4: Very poor, major issues
5-6: Below standard, needs work
7-8: Good, minor improvements
9-10: Excellent, professional

CONTENT:
${workspaceContent.slice(0, 2500)}

${analyseContext ? `CONTEXT: ${analyseContext}\n\n` : ''}
${analyseCategory ? `COMMUNICATION CATEGORY: ${analyseCategory}\n\n` : ''}
${analyseContentType !== 'auto' ? `TYPE: ${analyseContentType}\n\n` : ''}

CRITICAL - PLACEHOLDER HANDLING:
You MUST completely ignore and exclude ANY content in **[Insert ...]** format from your analysis.
DO NOT let placeholders influence your scoring in any way.
DO NOT mention placeholders in your reasoning.
DO NOT score lower because placeholders exist.
Analyse ONLY the actual written content that is present, treating placeholders as if they don't exist.
Assume placeholders will be filled appropriately in the final version.

Score on 6 dimensions (0-10). If gibberish (like "sdsd"), score 0-1.

1. Trust/Credibility
2. Clarity
3. Transparency
4. Reputation Impact
5. Risk Mitigation
6. Action-Driving

For each:
- dimension: Name
- score: 0-10 (HARSH if poor)
- reasoning: 1-2 sentences

Calculate overall average.

IF NONSENSE: ALL scores 0-2.

Return ONLY JSON:
{"scores": [{"dimension": "...", "score": 0, "reasoning": "..."}], "overall": 0.0}`;

      const result = await callClaude(prompt, 1500);
      cleanup();
      const scores = parseJSON(result);
      addOrUpdateResult('trust', scores);
    } catch (err) {
      cleanup();
      console.error('Trust error:', err);
      setError('Failed to analyse trust framework');
    } finally {
      setIsAnalysingTrust(false);
      setLoadingStages([]);
    }
  };

  // Stakeholder analysis
  const analyseStakeholders = async () => {
    if (!workspaceContent.trim()) {
      setError('Please load content to analyse');
      return;
    }

    setError('');
    
    // Add empty result immediately so loading appears at top
    addOrUpdateResult('stakeholders', null);
    setIsAnalysingStakeholders(true);
    
    // Scroll down to show loading stages
    setTimeout(() => {
      window.scrollBy({ top: 300, behavior: 'smooth' });
    }, 100);

    const stages = [
      "Creating 500+ relevant stakeholder profiles...",
      "Analysing individual stakeholder reactions...",
      "Detecting common concern patterns...",
      "Grouping stakeholders by perspective...",
      "Synthesising key stakeholder groups..."
    ];

    const cleanup = animateStages(stages);

    try {
      const prompt = `Analyse stakeholder reactions to this communication for ${companyName}. BE HONEST.

${buildCompanyContext()}

CONTENT:
${workspaceContent.slice(0, 2500)}

${analyseContext ? `CONTEXT: ${analyseContext}\n\n` : ''}
${analyseContentType !== 'auto' ? `TYPE: ${analyseContentType}\n\n` : ''}

CRITICAL - PLACEHOLDER HANDLING:
You MUST completely ignore and exclude ANY content in **[Insert ...]** format from your analysis.
DO NOT let placeholders influence stakeholder sentiment or reactions.
DO NOT mention placeholders in the reaction points.
Analyse ONLY the actual written content, messaging approach, and structure that is present.
Assume placeholders will be filled appropriately in the final version.

STAKEHOLDER IDENTIFICATION - CRITICAL:
You must identify stakeholders who would ACTUALLY receive, read, or be impacted by THIS SPECIFIC communication.

${analyseCategory === 'Internal' ? `
THIS IS INTERNAL COMMUNICATION - Focus ONLY on internal stakeholders:
- Current employees (by department, level, or function)
- Leadership teams
- HR/People teams
- Union representatives (if relevant)
- Future employees (if recruitment-focused)
DO NOT include: customers, investors, media, competitors, or external parties - they would not receive internal communications.
` : ''}

${analyseCategory === 'Corporate & regulatory' ? `
THIS IS CORPORATE/REGULATORY COMMUNICATION - Focus on:
- Investors and shareholders
- Board members
- Regulatory bodies
- Media and analysts
- Industry watchers
External audiences who care about corporate governance and performance.
` : ''}

${analyseCategory === 'Marketing' ? `
THIS IS MARKETING COMMUNICATION - Focus on:
- Target audience segments
- Prospective customers
- Brand followers and advocates
- Industry influencers
- Competitors watching the market
- Internal marketing and sales teams
Those who would see and respond to marketing and brand messaging.
` : ''}

${analyseCategory === 'Customer' ? `
THIS IS CUSTOMER COMMUNICATION - Focus on:
- Current customers (by segment if relevant)
- Account managers
- Customer success teams
- Support teams
- Partner organisations
Those directly involved in ongoing customer relationships.
` : ''}

${analyseCategory === 'Thought leadership' ? `
THIS IS THOUGHT LEADERSHIP CONTENT - Focus on:
- Industry peers and professionals
- Potential clients or customers
- Media and journalists
- Academic or research community
- General public interested in the topic
Audiences consuming content for information and insight.
` : ''}

${analyseCategory === 'Personal' ? `
THIS IS PERSONAL/PROFESSIONAL CORRESPONDENCE - Focus on:
- The direct recipient(s)
- Their colleagues who may see it
- Decision makers involved
- Gatekeepers (assistants, etc.)
Individual stakeholders in a professional relationship context.
` : ''}

Identify 5-7 key stakeholder groups WHO WOULD ACTUALLY ENCOUNTER THIS COMMUNICATION.

For each group you MUST provide ALL of these fields:
- name: Specific group (REQUIRED)
- size: Percentage between 10-20% (REQUIRED)
- sentiment: ABSOLUTELY REQUIRED - MUST be exactly one of: "Very Positive", "Positive", "Neutral", "Concerned", or "Very Concerned". NEVER leave this field blank or omit it.
- reaction: Array of exactly 3 specific points about how they would react (REQUIRED)

CRITICAL REQUIREMENT: Every single stakeholder group MUST include a sentiment value. If you're uncertain about sentiment, use "Neutral" rather than omitting the field.

IF CONTENT IS GIBBERISH: sentiment should be "Very Concerned" and reaction points should include "Content is incomprehensible", "No clear message"

YOU MUST RETURN VALID JSON WHERE EVERY SINGLE OBJECT HAS ALL FOUR FIELDS. Here is the EXACT format you must follow:

[
  {
    "name": "Current Employees",
    "size": 18,
    "sentiment": "Positive",
    "reaction": ["First reaction point", "Second reaction point", "Third reaction point"]
  },
  {
    "name": "Senior Leadership",  
    "size": 12,
    "sentiment": "Neutral",
    "reaction": ["First reaction point", "Second reaction point", "Third reaction point"]
  }
]

Return ONLY this JSON array format with NO markdown, NO code blocks, NO additional text. Every object MUST have name, size, sentiment, and reaction fields.`;

      const result = await callClaude(prompt, 1500);
      cleanup();
      let groups = parseJSON(result);
      
      console.log('Raw stakeholder groups received:', groups);
      
      // Helper function to infer sentiment from reaction text
      const inferSentimentFromReactions = (reactions) => {
        if (!reactions || !Array.isArray(reactions)) return 'Mixed';
        const reactionText = reactions.join(' ').toLowerCase();
        
        // Check for positive indicators
        const positiveWords = ['excited', 'pleased', 'happy', 'welcome', 'support', 'appreciate', 'positive', 'encouraged', 'optimistic', 'confident', 'reassured', 'satisfied'];
        const negativeWords = ['concerned', 'worried', 'anxious', 'skeptical', 'frustrated', 'disappointed', 'uncertain', 'confused', 'alarmed', 'critical', 'question', 'doubt'];
        
        let positiveCount = positiveWords.filter(word => reactionText.includes(word)).length;
        let negativeCount = negativeWords.filter(word => reactionText.includes(word)).length;
        
        if (positiveCount > negativeCount + 1) return 'Positive';
        if (positiveCount > negativeCount) return 'Positive';
        if (negativeCount > positiveCount + 1) return 'Concerned';
        if (negativeCount > positiveCount) return 'Concerned';
        return 'Mixed';
      };
      
      // Validate that ALL groups have sentiment - infer from reactions if missing
      groups = groups.map((g, idx) => {
        let sentiment = g.sentiment;
        
        // Check if sentiment is missing or invalid
        if (!sentiment || sentiment.trim() === '' || sentiment === 'undefined' || sentiment === 'null') {
          console.warn(`Group ${idx} "${g.name}" missing sentiment - inferring from reactions`);
          sentiment = inferSentimentFromReactions(g.reaction);
        }
        
        // Normalize sentiment values
        const normalizedSentiment = sentiment.trim();
        const validSentiments = ['Very Positive', 'Positive', 'Mixed', 'Concerned', 'Very Concerned', 'Neutral'];
        if (!validSentiments.some(v => normalizedSentiment.toLowerCase().includes(v.toLowerCase()))) {
          console.warn(`Group ${idx} "${g.name}" has invalid sentiment "${sentiment}" - inferring from reactions`);
          sentiment = inferSentimentFromReactions(g.reaction);
        }
        
        return {
          ...g,
          sentiment: sentiment
        };
      });
      
      console.log('Validated stakeholder groups:', groups);
      
      addOrUpdateResult('stakeholders', groups);
    } catch (err) {
      cleanup();
      console.error('Stakeholder error:', err);
      setError('Failed to analyse stakeholders');
    } finally {
      setIsAnalysingStakeholders(false);
      setLoadingStages([]);
    }
  };

  // AFR article
  const generateAFR = async () => {
    if (!workspaceContent.trim()) {
      setError('Please load content to analyse');
      return;
    }

    setError('');
    
    // Add empty result immediately so loading appears at top
    addOrUpdateResult('afr', null);
    setIsGeneratingAFR(true);
    
    // Scroll down to show loading stages
    setTimeout(() => {
      window.scrollBy({ top: 300, behavior: 'smooth' });
    }, 100);

    const stages = [
      "Selecting appropriate publication...",
      "Reviewing communication critically...",
      "Identifying weak arguments...",
      "Writing critical article..."
    ];

    const cleanup = animateStages(stages);

    try {
      const prompt = `You are a senior journalist writing a critical article about this communication from ${companyName}.

${buildCompanyContext()}

CONTENT:
${workspaceContent.slice(0, 2500)}

${analyseContext ? `CONTEXT: ${analyseContext}\n\n` : ''}
${analyseCategory ? `COMMUNICATION CATEGORY: ${analyseCategory}\n\n` : ''}
${analyseContentType !== 'auto' ? `TYPE: ${analyseContentType}\n\n` : ''}

STEP 1 - SELECT PUBLICATION:
Choose the most appropriate publication for critiquing this type of content. Consider:
- For corporate/financial content: Australian Financial Review, The Australian, Financial Times
- For technology/innovation content: WIRED, MIT Technology Review, The Guardian Tech
- For workplace/HR content: ABC News, The Guardian Australia, SmartCompany
- For consumer/retail content: The Australian, Sydney Morning Herald, news.com.au
- For international/major news: Financial Times, The New York Times, The Economist

Pick ONE publication that would be most likely to run a critical piece on this specific content.

STEP 2 - WRITE THE ARTICLE:
Write a 200-250 word critical article in that publication's style.

IMPORTANT: Ignore any **[Insert ...]** placeholders - assume they will be filled appropriately. Focus critique on substance, structure, and messaging approach.

If content is gibberish, say so harshly.

Use British English spelling.

Return ONLY valid JSON in this exact format:
{
  "publication": "Australian Financial Review",
  "headline": "Sharp, critical headline here",
  "journalist": "Sarah Mitchell",
  "role": "Senior Business Writer",
  "date": "27 November 2025",
  "article": "The full article body text here, written in multiple paragraphs...",
  "themes": [
    "First key criticism in 8-12 words",
    "Second key criticism in 8-12 words",
    "Third key criticism in 8-12 words"
  ]
}`;

      const result = await callClaude(prompt, 2000);
      cleanup();
      
      let articleData;
      try {
        articleData = parseJSON(result);
        if (!articleData.publication || !articleData.headline || !articleData.article) {
          throw new Error('Invalid format');
        }
      } catch (parseErr) {
        // Fallback parsing for non-JSON response
        const headlineMatch = result.match(/HEADLINE:\s*(.+)/i);
        const bylineMatch = result.match(/BY:\s*(.+)/i);
        const themeMatch = result.match(/KEY THEMES:([\s\S]+?)$/);
        let themes = [];
        if (themeMatch) {
          themes = themeMatch[1].trim().split('\n')
            .map(line => line.trim())
            .filter(line => line.startsWith('•'))
            .map(line => line.replace(/^•\s*/, ''));
        }
        articleData = {
          publication: "Australian Financial Review",
          headline: headlineMatch ? headlineMatch[1].trim() : "Critical Analysis",
          journalist: "Senior Correspondent",
          role: "Business Writer",
          date: new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }),
          article: result.replace(/HEADLINE:.+\n/i, '').replace(/BY:.+\n/i, '').replace(/KEY THEMES:[\s\S]+$/, '').trim(),
          themes: themes.length > 0 ? themes : ["Analysis pending"]
        };
      }
      
      addOrUpdateResult('afr', articleData);
    } catch (err) {
      cleanup();
      console.error('AFR error:', err);
      setError('Failed to generate critical media article');
    } finally {
      setIsGeneratingAFR(false);
      setLoadingStages([]);
    }
  };

  // Strengths
  const analyseStrengths = async () => {
    if (!workspaceContent.trim()) {
      setError('Please load content to analyse');
      return;
    }

    setError('');
    
    // Add empty result immediately so loading appears at top
    addOrUpdateResult('strengths', null);
    setIsAnalysingStrengths(true);
    
    // Scroll down to show loading stages
    setTimeout(() => {
      window.scrollBy({ top: 300, behavior: 'smooth' });
    }, 100);

    const stages = [
      "Identifying effective messaging...",
      "Analysing strong arguments...",
      "Detecting stakeholder resonance...",
      "Synthesising key strengths..."
    ];

    const cleanup = animateStages(stages);

    try {
      const prompt = `Identify strengths in this communication from ${companyName}. BE HONEST - if content is poor quality, acknowledge that.

${buildCompanyContext()}

CONTENT:
${workspaceContent.slice(0, 2500)}

${analyseContext ? `CONTEXT: ${analyseContext}\n\n` : ''}
${analyseCategory ? `COMMUNICATION CATEGORY: ${analyseCategory}\n\n` : ''}
${analyseContentType !== 'auto' ? `TYPE: ${analyseContentType}\n\n` : ''}

Provide 4-6 specific strengths. If the content has very few strengths (e.g., it's gibberish or very poor), provide fewer items and be honest.

For each strength provide:
- title: Brief description (5-8 words)
- description: What's done well and why it's effective (15-25 words)

Use British English spelling (analyse, recognise, etc.).

Return ONLY a valid JSON array with no other text or markdown formatting:
[{"title": "Clear headline structure", "description": "Opening immediately establishes the key message in an accessible way that captures attention."}]

Provide between 2-6 strength objects.`;

      const result = await callClaude(prompt, 1500);
      cleanup();
      
      let strengths;
      try {
        strengths = parseJSON(result);
        if (!Array.isArray(strengths)) {
          console.error('Not an array:', result);
          throw new Error('Response is not an array');
        }
        if (strengths.length === 0) {
          // If no strengths, create a default one
          strengths = [{ title: "Analysis complete", description: "Content reviewed. Consider focusing on fundamental improvements to messaging and structure." }];
        }
      } catch (parseErr) {
        console.error('Parse error:', parseErr, result);
        // Fallback: create generic strength
        strengths = [
          { title: "Content provided for review", description: "Communication has been submitted for analysis. Focus on implementing recommended improvements." }
        ];
      }
      
      addOrUpdateResult('strengths', strengths);
    } catch (err) {
      cleanup();
      console.error('Strengths error:', err);
      setError('Failed to analyse strengths. Please try again.');
    } finally {
      setIsAnalysingStrengths(false);
      setLoadingStages([]);
    }
  };

  // Improvements
  const suggestImprovements = async () => {
    if (!workspaceContent.trim()) {
      setError('Please load content to analyse');
      return;
    }

    setError('');
    
    // Add empty result immediately so loading appears at top
    addOrUpdateResult('improvements', null);
    setIsGeneratingImprovements(true);

    const stages = [
      "Identifying weak points...",
      "Analysing stakeholder gaps...",
      "Formulating specific improvements...",
      "Prioritising recommendations..."
    ];

    const cleanup = animateStages(stages);

    try {
      const prompt = `Provide 5-6 improvements for this communication from ${companyName}.

${buildCompanyContext()}

CONTENT:
${workspaceContent.slice(0, 2500)}

${analyseContext ? `CONTEXT: ${analyseContext}\n\n` : ''}

CRITICAL - PLACEHOLDER HANDLING:
You MUST completely ignore and exclude ANY content in **[Insert ...]** format from your analysis.
DO NOT suggest replacing or filling in placeholders as improvements.
DO NOT mention placeholders in improvement descriptions.
Focus ONLY on improving the actual structure, messaging, tone, and approach of the written content.
Assume placeholders will be filled appropriately in the final version.

For each improvement provide:
- title: Brief (5-8 words)
- description: Specific change (15-30 words)
- priority: "Critical", "High Impact", or "Low Impact"
- scope: "thematic" if the change applies throughout the document (e.g., "add more evidence", "simplify language"), or "surgical" if it's a specific fix to a particular section (e.g., "fix the opening paragraph", "clarify the third bullet point")

IF GIBBERISH: improvements should address FUNDAMENTAL issues.

Use British English spelling.

Return ONLY JSON array:
[{"title": "...", "description": "...", "priority": "High Impact", "scope": "thematic"}]`;

      const result = await callClaude(prompt, 1500);
      cleanup();
      const imps = parseJSON(result);
      addOrUpdateResult('improvements', imps);
    } catch (err) {
      cleanup();
      console.error('Improvements error:', err);
      setError('Failed to generate improvements');
    } finally {
      setIsGeneratingImprovements(false);
      setLoadingStages([]);
    }
  };

  // Quote Risks
  const analyseQuoteRisks = async () => {
    if (!workspaceContent.trim()) {
      setError('Please load content to analyse');
      return;
    }

    setError('');
    
    // Add empty result immediately so loading appears at top
    addOrUpdateResult('quoteRisks', null);
    setIsAnalysingQuoteRisks(true);
    
    // Scroll down to show loading stages
    setTimeout(() => {
      window.scrollBy({ top: 300, behavior: 'smooth' });
    }, 100);

    const stages = [
      "Scanning for quotable statements...",
      "Analysing out-of-context risks...",
      "Identifying misinterpretation potential...",
      "Synthesising quote risk assessment..."
    ];

    const cleanup = animateStages(stages);

    try {
      const prompt = `You are analysing a corporate communication from ${companyName} to identify quote risks.

${buildCompanyContext()}

CONTENT TO ANALYSE:
${workspaceContent.slice(0, 2500)}

${analyseContext ? `CONTEXT: ${analyseContext}\n\n` : ''}
${analyseCategory ? `COMMUNICATION CATEGORY: ${analyseCategory}\n\n` : ''}
${analyseContentType !== 'auto' ? `TYPE: ${analyseContentType}\n\n` : ''}

Your task: Find 4-6 actual statements FROM THE CONTENT ABOVE that could be risky if quoted by media.

CRITICAL RULES:
1. ONLY extract quotes that ACTUALLY APPEAR VERBATIM in the content above
2. Copy the EXACT text - do not paraphrase, summarise, or invent quotes
3. COMPLETELY IGNORE any **[Insert ...]** placeholders
4. If you cannot find 4+ real risky quotes, return fewer (even just 1-2 is fine)
5. DO NOT make up quotes or create generic placeholders like "Review content..."
6. Each quote must be a real sentence or phrase from the content

For each risk provide:
{
  "quote": "EXACT text copied from content (10-20 words)",
  "risk": "why this could be misinterpreted or problematic (15-25 words)",
  "severity": "High Risk" or "Medium Risk" or "Low Risk"
}

Use British English spelling (analyse, recognise, etc.).

Return ONLY a valid JSON array with absolutely NO markdown formatting or code blocks:
[{"quote": "...", "risk": "...", "severity": "Medium Risk"}]`;

      console.log('Quote risks analysing content:', workspaceContent.slice(0, 500));
      const result = await callClaude(prompt, 2000);
      cleanup();
      let risks;
      try {
        risks = parseJSON(result);
        if (!Array.isArray(risks) || risks.length === 0) {
          throw new Error('Invalid format');
        }
        
        // Validate that quotes actually exist in the content
        const contentLower = workspaceContent.toLowerCase();
        risks = risks.filter(risk => {
          if (!risk.quote || typeof risk.quote !== 'string') return false;
          // Check if quote (or a significant portion of it) exists in content
          const quoteLower = risk.quote.toLowerCase().trim();
          // Allow some flexibility - check if at least first 30 chars match
          const searchText = quoteLower.slice(0, 30);
          return contentLower.includes(searchText) || 
                 // Also try without quotes in case of minor formatting differences
                 contentLower.includes(quoteLower.replace(/['"]/g, ''));
        });
        
        if (risks.length === 0) {
          throw new Error('No valid quotes found');
        }
        
      } catch (parseErr) {
        console.error('Quote risks parse error:', parseErr);
        console.error('Raw result:', result);
        // Show an error state rather than fake quotes
        setError('Could not identify specific quote risks in this content. The content may not contain quotable statements that require risk analysis.');
        setAnalysisResults(prev => prev.filter(r => r.type !== 'quoteRisks'));
        return;
      }
      addOrUpdateResult('quoteRisks', risks);
    } catch (err) {
      cleanup();
      console.error('Quote risks error:', err);
      setError('Failed to analyse quote risks');
      // Remove the null result if we failed
      setAnalysisResults(prev => prev.filter(r => r.type !== 'quoteRisks'));
    } finally {
      setIsAnalysingQuoteRisks(false);
      setLoadingStages([]);
    }
  };

  // Surface Assumed Knowledge
  const analyseAssumptions = async () => {
    if (!workspaceContent.trim()) {
      setError('Please load content to analyse');
      return;
    }

    setError('');
    
    // Add empty result immediately so loading appears at top
    addOrUpdateResult('assumptions', null);
    setIsAnalysingAssumptions(true);
    
    // Scroll down to show loading stages
    setTimeout(() => {
      window.scrollBy({ top: 300, behavior: 'smooth' });
    }, 100);

    const stages = [
      "Reading communication content...",
      "Identifying implicit assumptions...",
      "Analysing required background knowledge...",
      "Categorising assumption types...",
      "Assessing audience knowledge gaps..."
    ];

    const cleanup = animateStages(stages);

    try {
      const prompt = `Analyse this communication from ${companyName} to identify assumed knowledge - things the writer assumes readers already know.

${buildCompanyContext()}

CONTENT:
${workspaceContent.slice(0, 2500)}

${analyseContext ? `CONTEXT: ${analyseContext}\n\n` : ''}
${analyseCategory ? `COMMUNICATION CATEGORY: ${analyseCategory}\n\n` : ''}
${analyseContentType !== 'auto' ? `CONTENT TYPE: ${analyseContentType}\n\n` : ''}

CRITICAL - PLACEHOLDER HANDLING:
You MUST completely ignore and exclude ANY content in **[Insert ...]** format from your analysis.
DO NOT flag placeholders as assumptions.
Focus ONLY on actual written content and what knowledge it assumes.

Identify 5-7 assumptions the content makes about what readers already know. Consider:
- Industry/technical knowledge assumed
- Company-specific context assumed
- Prior events or announcements assumed
- Acronyms or jargon used without explanation
- Relationships or hierarchies assumed
- Cultural or regional knowledge assumed

For each assumption:
- assumption: What specific knowledge is assumed (10-20 words)
- risk: Why this could be a problem if readers don't have this knowledge (15-25 words)
- severity: "High Risk" (critical to understanding), "Medium Risk" (helpful context), or "Low Risk" (minor detail)

Use British English spelling.

Return ONLY a valid JSON array:
[{"assumption": "...", "risk": "...", "severity": "Medium Risk"}]`;

      const result = await callClaude(prompt, 1500);
      cleanup();
      let assumptions;
      try {
        assumptions = parseJSON(result);
        if (!Array.isArray(assumptions) || assumptions.length === 0) {
          throw new Error('Invalid format');
        }
      } catch (parseErr) {
        console.error('Assumptions parse error:', parseErr);
        assumptions = [
          { assumption: "Review content for assumed knowledge", risk: "Manual review recommended to identify knowledge gaps for your audience.", severity: "Medium Risk" }
        ];
      }
      addOrUpdateResult('assumptions', assumptions);
    } catch (err) {
      cleanup();
      console.error('Assumptions error:', err);
      setError('Failed to analyse assumptions');
      setAnalysisResults(prev => prev.filter(r => r.type !== 'assumptions'));
    } finally {
      setIsAnalysingAssumptions(false);
      setLoadingStages([]);
    }
  };

  // Audience & Tone Fit
  const analyseAudienceTone = async () => {
    if (!workspaceContent.trim()) {
      setError('Please load content to analyse');
      return;
    }

    setError('');
    
    // Add empty result immediately so loading appears at top
    addOrUpdateResult('audienceTone', null);
    setIsAnalysingAudienceTone(true);
    
    // Scroll down to show loading stages
    setTimeout(() => {
      window.scrollBy({ top: 300, behavior: 'smooth' });
    }, 100);

    const stages = [
      "Analysing writing style...",
      "Evaluating tone consistency...",
      "Assessing readability level...",
      "Checking audience alignment...",
      "Identifying tone issues..."
    ];

    const cleanup = animateStages(stages);

    try {
      const prompt = `Analyse the tone and audience fit of this communication from ${companyName}.

${buildCompanyContext()}

CONTENT:
${workspaceContent.slice(0, 2500)}

${analyseContext ? `CONTEXT: ${analyseContext}\n\n` : ''}
${analyseCategory ? `COMMUNICATION CATEGORY: ${analyseCategory}\n\n` : ''}
${analyseContentType !== 'auto' ? `CONTENT TYPE: ${analyseContentType}\n\n` : ''}

CRITICAL - PLACEHOLDER HANDLING:
You MUST completely ignore and exclude ANY content in **[Insert ...]** format from your analysis.
Analyse ONLY the actual written content for tone and style.

Provide a comprehensive tone and audience analysis. You MUST return valid JSON.

1. OVERALL ASSESSMENT (all fields required):
- toneDescription: Describe the overall tone in 2-4 words (e.g., "Corporate and promotional", "Warm and conversational", "Formal and authoritative")
- formalityLevel: One of "Very Formal", "Formal", "Professional", "Conversational", or "Casual"
- formalityFit: One of "Appropriate", "Too formal", or "Too casual" - whether the formality level suits the content type and audience
- readabilityLevel: One of "Executive", "Professional", "General public", or "Technical specialist"
- audienceFitScore: 1-10 score for how well the tone and style matches the intended audience (10 = perfect fit)

2. OVERALL THEMES (provide 2-3):
These are broad improvements that would apply across the ENTIRE document, not specific sentences.
Each theme should be a recommendation that would change the overall tone/approach.
Examples: "Reduce corporate jargon throughout", "Adopt a warmer, more conversational voice", "Simplify language for broader accessibility"
- theme: The overall recommendation (6-12 words)
- rationale: Why this matters and what it would improve (15-25 words)

3. SPECIFIC ISSUES (provide 3-5 issues):
These are specific examples from the text that demonstrate the broader themes.
- issue: What the specific tone/style issue is (10-15 words)
- example: A brief quote from the content showing this issue (use actual text)
- suggestion: How to fix this specific instance (15-25 words)
- impact: "High" (undermines message), "Medium" (noticeable), or "Low" (minor polish)

Use British English spelling.

Return ONLY this exact JSON structure with no additional text:
{
  "overall": {
    "toneDescription": "Corporate and promotional",
    "formalityLevel": "Formal",
    "formalityFit": "Appropriate",
    "readabilityLevel": "Executive",
    "audienceFitScore": 7
  },
  "themes": [
    {"theme": "Reduce corporate jargon throughout", "rationale": "Would make content more accessible and less distancing for readers"}
  ],
  "issues": [
    {"issue": "Description of issue", "example": "quoted text from content", "suggestion": "How to improve this", "impact": "Medium"}
  ]
}`;

      const result = await callClaude(prompt, 2000);
      cleanup();
      let analysis;
      try {
        analysis = parseJSON(result);
        // Validate required fields exist
        if (!analysis.overall || !analysis.issues) {
          throw new Error('Missing required fields');
        }
        // Ensure all overall fields have values
        if (!analysis.overall.toneDescription) analysis.overall.toneDescription = "Professional";
        if (!analysis.overall.formalityLevel) analysis.overall.formalityLevel = "Professional";
        if (!analysis.overall.formalityFit) analysis.overall.formalityFit = "Appropriate";
        if (!analysis.overall.readabilityLevel) analysis.overall.readabilityLevel = "Professional";
        if (!analysis.overall.audienceFitScore) analysis.overall.audienceFitScore = 5;
        // Ensure issues is an array
        if (!Array.isArray(analysis.issues)) analysis.issues = [];
      } catch (parseErr) {
        console.error('Audience tone parse error:', parseErr);
        // Retry with simpler prompt
        try {
          const retryPrompt = `Analyse the tone of this content and return JSON only:

CONTENT: ${workspaceContent.slice(0, 1500)}

Return exactly this JSON format:
{"overall":{"toneDescription":"describe tone","formalityLevel":"Formal","formalityFit":"Appropriate","readabilityLevel":"Professional","audienceFitScore":7},"issues":[{"issue":"main issue","example":"quote","suggestion":"fix","impact":"Medium"}]}`;
          
          const retryResult = await callClaude(retryPrompt, 1000);
          analysis = parseJSON(retryResult);
        } catch (retryErr) {
          analysis = {
            overall: {
              toneDescription: "Analysis incomplete",
              formalityLevel: "Professional",
              formalityFit: "Review needed",
              readabilityLevel: "Professional",
              audienceFitScore: 5
            },
            issues: [
              { issue: "Manual review recommended", example: "Complex content structure", suggestion: "Review content manually for tone and audience fit.", impact: "Medium" }
            ]
          };
        }
      }
      addOrUpdateResult('audienceTone', analysis);
    } catch (err) {
      cleanup();
      console.error('Audience tone error:', err);
      setError('Failed to analyse audience and tone');
      setAnalysisResults(prev => prev.filter(r => r.type !== 'audienceTone'));
    } finally {
      setIsAnalysingAudienceTone(false);
      setLoadingStages([]);
    }
  };

  // Test Structure and Clarity
  const analyseStructure = async () => {
    if (!workspaceContent.trim()) {
      setError('Please load content to analyse');
      return;
    }

    setError('');
    
    // Add empty result immediately so loading appears at top
    addOrUpdateResult('structure', null);
    setIsAnalysingStructure(true);
    
    // Scroll down to show loading stages
    setTimeout(() => {
      window.scrollBy({ top: 300, behavior: 'smooth' });
    }, 100);

    const stages = [
      "Mapping document structure...",
      "Analysing narrative flow...",
      "Identifying key messages...",
      "Testing reader comprehension...",
      "Evaluating takeaways at different read depths..."
    ];

    const cleanup = animateStages(stages);

    try {
      const prompt = `Analyse the structure and message clarity of this communication from ${companyName}.

${buildCompanyContext()}

CONTENT:
${workspaceContent.slice(0, 2500)}

${analyseContext ? `CONTEXT: ${analyseContext}\n\n` : ''}
${analyseCategory ? `COMMUNICATION CATEGORY: ${analyseCategory}\n\n` : ''}
${analyseContentType !== 'auto' ? `CONTENT TYPE: ${analyseContentType}\n\n` : ''}

CRITICAL - PLACEHOLDER HANDLING:
You MUST completely ignore and exclude ANY content in **[Insert ...]** format from your analysis.
Analyse ONLY the actual written structure and messaging.

Provide a comprehensive structure and clarity analysis:

1. TAKEAWAYS AT DIFFERENT READ LEVELS (required):
- headline: What readers understand from just the headline/subject (10-15 words)
- skimRead: What readers take away from a 30-second skim - headers, bold text, first sentences (20-30 words)
- fullRead: The complete message a thorough reader understands (30-40 words)

2. STRUCTURE ASSESSMENT (required):
- flowScore: 1-10 (how well ideas progress logically)
- clarityScore: 1-10 (how clear the main message is)
- structureType: Describe the structure pattern (e.g., "Problem-solution", "Chronological", "Inverted pyramid")
- structureVerdict: "Strong", "Adequate", or "Needs work"

3. SPECIFIC ISSUES (provide 3-5):
For each structural or clarity issue:
- issue: The specific problem (10-15 words)
- location: Where in the document (e.g., "Opening paragraph", "Middle section", "Conclusion")
- fix: How to address it (15-25 words)
- priority: "High", "Medium", or "Low"
- scope: "thematic" if the fix affects the whole document (e.g., "improve overall flow", "add transitions throughout"), or "surgical" if it's a specific fix to a particular section (e.g., "rewrite the opening", "move this paragraph")

Use British English spelling.

Return ONLY valid JSON:
{
  "takeaways": {
    "headline": "...",
    "skimRead": "...",
    "fullRead": "..."
  },
  "assessment": {
    "flowScore": 7,
    "clarityScore": 8,
    "structureType": "...",
    "structureVerdict": "..."
  },
  "issues": [
    {"issue": "...", "location": "...", "fix": "...", "priority": "High", "scope": "surgical"}
  ]
}`;

      const result = await callClaude(prompt, 2000);
      cleanup();
      let analysis;
      try {
        analysis = parseJSON(result);
        if (!analysis.takeaways || !analysis.assessment) {
          throw new Error('Invalid format');
        }
      } catch (parseErr) {
        console.error('Structure parse error:', parseErr);
        analysis = {
          takeaways: {
            headline: "Unable to analyse headline takeaway",
            skimRead: "Unable to analyse skim read takeaway",
            fullRead: "Unable to analyse full read takeaway"
          },
          assessment: {
            flowScore: 5,
            clarityScore: 5,
            structureType: "Unknown",
            structureVerdict: "Needs work"
          },
          issues: [
            { issue: "Manual review recommended", location: "Throughout", fix: "Review document structure and clarity manually.", priority: "Medium" }
          ]
        };
      }
      addOrUpdateResult('structure', analysis);
    } catch (err) {
      cleanup();
      console.error('Structure error:', err);
      setError('Failed to analyse structure and clarity');
      setAnalysisResults(prev => prev.filter(r => r.type !== 'structure'));
    } finally {
      setIsAnalysingStructure(false);
      setLoadingStages([]);
    }
  };

  // Simulate Expert Persona Feedback
  const analyseExpertPersona = async () => {
    if (!workspaceContent.trim()) {
      setError('Please load content to analyse');
      return;
    }

    setError('');
    
    // Add empty result immediately so loading appears at top
    addOrUpdateResult('expertPersona', null);
    setIsAnalysingExpertPersona(true);
    
    // Scroll down to show loading stages
    setTimeout(() => {
      window.scrollBy({ top: 300, behavior: 'smooth' });
    }, 100);

    const stages = [
      "Analysing communication context...",
      "Identifying ideal expert profile...",
      "Constructing expert persona...",
      "Generating expert perspective...",
      "Formulating candid feedback..."
    ];

    const cleanup = animateStages(stages);

    try {
      const prompt = `You are helping review a communication from ${companyName}. Your task is to:
1. Identify the IDEAL expert who should review this specific communication
2. Create a detailed persona for that expert
3. Provide their candid, expert feedback

${buildCompanyContext()}

CONTENT TO REVIEW:
${workspaceContent.slice(0, 2500)}

${analyseContext ? `CONTEXT: ${analyseContext}\n\n` : ''}
${analyseCategory ? `COMMUNICATION CATEGORY: ${analyseCategory}\n\n` : ''}
${analyseContentType !== 'auto' ? `CONTENT TYPE: ${analyseContentType}\n\n` : ''}

CRITICAL - PLACEHOLDER HANDLING:
You MUST completely ignore and exclude ANY content in **[Insert ...]** format.
Focus ONLY on reviewing the actual written content.

CRITICAL - EXPERT SELECTION:
Select experts from appropriate backgrounds:
- Academic institutions (professors, researchers)
- Industry-specific roles (former executives, chief officers)
- Specialist practitioners (communications directors, investor relations heads)
- Government or regulatory bodies (if relevant)
- Major consulting firms
- Media or journalism (if relevant to the content type)

STEP 1: Determine the ideal expert. Consider:
- The subject matter of the communication
- The audience it's intended for
- The organisation context (${companyName})
- What expertise would be most valuable for improving this

STEP 2: Create a specific, named expert persona with:
- A realistic name
- Their title and organisation (following the restrictions above)
- 2-3 sentences on their background
- Their specific expertise relevant to reviewing THIS communication
- Their communication philosophy/approach

STEP 3: Provide their feedback as if they are directly speaking. Include:
- Their overall impression (2-3 sentences, candid and direct)
- 3-4 specific pieces of feedback (what they'd change or improve), each tagged with scope
- What they think works well (1-2 points)

For each improvement, include a "scope" field:
- "thematic" if the change applies throughout the document (e.g., "strengthen the evidence", "adjust tone throughout")
- "surgical" if it's a specific fix to a particular section (e.g., "rewrite the opening paragraph", "clarify this specific claim")

The expert should be candid, constructive, and speak in first person as if giving direct feedback.

Use British English spelling.

Return ONLY valid JSON:
{
  "expert": {
    "name": "Dr. Sarah Chen",
    "title": "Chief Communications Officer, Major Bank",
    "background": "20 years in financial services communications...",
    "relevantExpertise": "Why they're perfect for reviewing this specific content...",
    "philosophy": "Their approach to communications..."
  },
  "feedback": {
    "overallImpression": "Their candid 2-3 sentence take on the communication...",
    "improvements": [
      {"point": "Specific feedback point", "detail": "Explanation of why and how to fix", "scope": "thematic"},
      {"point": "Another point", "detail": "More detail", "scope": "surgical"}
    ],
    "strengths": [
      {"point": "What works well", "detail": "Why it's effective"}
    ]
  }
}`;

      const result = await callClaude(prompt, 2500);
      cleanup();
      let analysis;
      try {
        analysis = parseJSON(result);
        if (!analysis.expert || !analysis.feedback) {
          throw new Error('Invalid format');
        }
      } catch (parseErr) {
        console.error('Expert persona parse error:', parseErr);
        analysis = {
          expert: {
            name: "Communications Expert",
            title: "Senior Advisor",
            background: "Extensive experience in corporate communications.",
            relevantExpertise: "General communications review and improvement.",
            philosophy: "Clear, audience-focused messaging."
          },
          feedback: {
            overallImpression: "Manual review recommended for detailed expert feedback.",
            improvements: [
              { point: "Review structure", detail: "Consider reviewing the overall document structure for clarity." }
            ],
            strengths: [
              { point: "Content present", detail: "The communication contains substantive content to work with." }
            ]
          }
        };
      }
      addOrUpdateResult('expertPersona', analysis);
    } catch (err) {
      cleanup();
      console.error('Expert persona error:', err);
      setError('Failed to generate expert persona feedback');
      setAnalysisResults(prev => prev.filter(r => r.type !== 'expertPersona'));
    } finally {
      setIsAnalysingExpertPersona(false);
      setLoadingStages([]);
    }
  };

  // Draft FAQ & Responses
  const generateFAQ = async () => {
    if (!workspaceContent.trim()) {
      setError('Please load content to analyse');
      return;
    }

    setError('');
    
    // Add empty result immediately so loading appears at top
    addOrUpdateResult('faq', null);
    setIsGeneratingFAQ(true);
    
    // Scroll down to show loading stages
    setTimeout(() => {
      window.scrollBy({ top: 300, behavior: 'smooth' });
    }, 100);

    const stages = [
      "Analysing communication content...",
      "Identifying likely questions...",
      "Considering stakeholder perspectives...",
      "Drafting recommended responses...",
      "Prioritising by likelihood..."
    ];

    const cleanup = animateStages(stages);

    try {
      const prompt = `Generate likely FAQ questions and suggested responses for this communication from ${companyName}.

${buildCompanyContext()}

CONTENT:
${workspaceContent.slice(0, 2500)}

${analyseContext ? `CONTEXT: ${analyseContext}\n\n` : ''}
${analyseCategory ? `COMMUNICATION CATEGORY: ${analyseCategory}\n\n` : ''}
${analyseContentType !== 'auto' ? `CONTENT TYPE: ${analyseContentType}\n\n` : ''}

CRITICAL - PLACEHOLDER HANDLING:
You MUST completely ignore and exclude ANY content in **[Insert ...]** format.
Focus ONLY on actual written content when anticipating questions.

Generate 6-8 likely questions that stakeholders might ask after reading this communication. Consider:
- Questions from employees
- Questions from customers/clients
- Questions from media
- Questions from investors/board (if relevant)
- Clarification questions about specifics
- Challenging or skeptical questions

For each FAQ:
- question: The likely question (natural phrasing, 10-20 words)
- audience: Who is most likely to ask this ("Employees", "Media", "Customers", "Investors", "General")
- tone: The tone behind the question ("Curious", "Concerned", "Skeptical", "Supportive", "Confused")
- suggestedResponse: A recommended response (40-60 words, professional and helpful)
- priority: "High" (very likely to be asked), "Medium" (possible), or "Low" (less common but should prepare)

Order by priority (High first).

Use British English spelling.

Return ONLY valid JSON array:
[{"question": "...", "audience": "Employees", "tone": "Concerned", "suggestedResponse": "...", "priority": "High"}]`;

      const result = await callClaude(prompt, 2500);
      cleanup();
      let faqs;
      try {
        faqs = parseJSON(result);
        if (!Array.isArray(faqs) || faqs.length === 0) {
          throw new Error('Invalid format');
        }
      } catch (parseErr) {
        console.error('FAQ parse error:', parseErr);
        faqs = [
          { question: "Manual review recommended", audience: "General", tone: "Curious", suggestedResponse: "Please review the content manually to anticipate likely questions.", priority: "Medium" }
        ];
      }
      addOrUpdateResult('faq', faqs);
    } catch (err) {
      cleanup();
      console.error('FAQ error:', err);
      setError('Failed to generate FAQ');
      setAnalysisResults(prev => prev.filter(r => r.type !== 'faq'));
    } finally {
      setIsGeneratingFAQ(false);
      setLoadingStages([]);
    }
  };

  // Check Regulatory Compliance
  const analyseCompliance = async () => {
    if (!workspaceContent.trim()) {
      setError('Please load content to analyse');
      return;
    }

    setError('');
    
    // Add empty result immediately so loading appears at top
    addOrUpdateResult('compliance', null);
    setIsAnalysingCompliance(true);
    
    // Scroll down to show loading stages
    setTimeout(() => {
      window.scrollBy({ top: 300, behavior: 'smooth' });
    }, 100);

    const stages = [
      "Identifying relevant regulations...",
      "Scanning for compliance triggers...",
      "Checking disclosure requirements...",
      "Reviewing compliance language...",
      "Assessing potential risks..."
    ];

    const cleanup = animateStages(stages);

    try {
      const prompt = `Review this communication from ${companyName} for potential regulatory and compliance considerations.

${buildCompanyContext()}

CONTENT:
${workspaceContent.slice(0, 2500)}

${analyseContext ? `CONTEXT: ${analyseContext}\n\n` : ''}
${analyseCategory ? `COMMUNICATION CATEGORY: ${analyseCategory}\n\n` : ''}
${analyseContentType !== 'auto' ? `CONTENT TYPE: ${analyseContentType}\n\n` : ''}

CRITICAL - PLACEHOLDER HANDLING:
You MUST completely ignore and exclude ANY content in **[Insert ...]** format.
Focus ONLY on actual written content for compliance review.

IMPORTANT DISCLAIMER: This is an AI-assisted preliminary review only, not legal advice. All communications should be reviewed by qualified legal and compliance professionals before release.

STEP 1 - IDENTIFY RELEVANT COMPLIANCE AREAS:
Based on the content type and subject matter, identify which regulatory areas are ACTUALLY RELEVANT to review. Only check areas that genuinely apply to this specific content.

Consider these categories (select only what's relevant):
- For financial/investor content: Continuous disclosure, forward-looking statements, market-sensitive information
- For marketing/promotional content: Consumer law (ACL), advertising standards, fair trading
- For customer communications: Privacy Act, data protection, consumer rights
- For HR/workplace content: Workplace relations, anti-discrimination, privacy
- For health/safety content: WHS regulations, health claims
- For data/analytics content: Privacy, data protection, industry-specific regulations
- For general corporate: General misleading conduct, accuracy of claims

DO NOT include ASX disclosure requirements unless the content is clearly investor-facing or market-sensitive.

Provide a compliance assessment:

1. OVERALL RISK ASSESSMENT (required):
- riskLevel: "Low", "Medium", "High", or "Critical"
- summary: 2-3 sentence overview of compliance posture (20-40 words)

2. COMPLIANCE AREAS REVIEWED (2-5 areas only - those ACTUALLY RELEVANT):
For each relevant area only:
- area: The compliance area in plain language (e.g., "Consumer protection", "Privacy requirements", "Advertising standards", "Workplace regulations", "Financial disclosure")
- status: "Clear", "Caution", or "Review Required"
- notes: Brief explanation (15-25 words)

3. SPECIFIC ISSUES (provide 2-5 if any exist, or fewer/none if content is low-risk):
For each potential issue:
- issue: The specific compliance concern (10-20 words)
- regulation: Which regulation or requirement it relates to (in plain language)
- severity: "High", "Medium", or "Low"
- recommendation: How to address it (20-30 words)

If the content appears to be low-risk internal communication with no regulatory triggers, say so and provide minimal issues.

Use British English spelling.

Return ONLY valid JSON:
{
  "overall": {
    "riskLevel": "Low",
    "summary": "..."
  },
  "areasChecked": [
    {"area": "Consumer protection", "status": "Clear", "notes": "..."}
  ],
  "issues": [
    {"issue": "...", "regulation": "...", "severity": "Medium", "recommendation": "..."}
  ]
}`;

      const result = await callClaude(prompt, 2000);
      cleanup();
      let analysis;
      try {
        analysis = parseJSON(result);
        if (!analysis.overall || !analysis.areasChecked) {
          throw new Error('Invalid format');
        }
      } catch (parseErr) {
        console.error('Compliance parse error:', parseErr);
        analysis = {
          overall: {
            riskLevel: "Medium",
            summary: "Unable to complete automated compliance review. Manual review by legal/compliance team recommended."
          },
          areasChecked: [
            { area: "General Compliance", status: "Review Required", notes: "Automated review could not be completed." }
          ],
          issues: [
            { issue: "Manual review recommended", regulation: "Various", severity: "Medium", recommendation: "Have qualified legal and compliance professionals review this communication." }
          ]
        };
      }
      addOrUpdateResult('compliance', analysis);
    } catch (err) {
      cleanup();
      console.error('Compliance error:', err);
      setError('Failed to analyse compliance');
      setAnalysisResults(prev => prev.filter(r => r.type !== 'compliance'));
    } finally {
      setIsAnalysingCompliance(false);
      setLoadingStages([]);
    }
  };

  // Suggest Best Tools
  const suggestBestTools = async () => {
    if (!workspaceContent.trim()) {
      setError('Please load content first');
      return;
    }

    setError('');
    setIsSuggestingTools(true);
    setSuggestedTools(null);

    try {
      const prompt = `Analyse this communication and recommend which analysis tools would be most valuable to run.

COMPANY: ${companyName}
${buildCompanyContext()}

CONTENT:
${workspaceContent.slice(0, 2000)}

${analyseContext ? `CONTEXT: ${analyseContext}\n\n` : ''}
${analyseContentType !== 'auto' ? `CONTENT TYPE: ${analyseContentType}\n\n` : ''}

AVAILABLE TOOLS:
1. Test against key stakeholders - Predict how different groups will react
2. Draft critical media article - Simulate a tough journalist review
3. Simulate expert persona feedback - Get feedback from the ideal expert
4. Draft FAQ & responses - Anticipate likely stakeholder questions
5. Identify communication strengths - Discover what's working well
6. Analyse for improvements - Get specific, actionable recommendations
7. Test structure and clarity - Check narrative flow and key takeaways
8. Assess audience and tone fit - Check tone and readability for your audience
9. Evaluate against trust framework - Score credibility, clarity, and transparency
10. Surface assumed knowledge - Find what you're assuming readers already know
11. Identify quote risks - Flag statements that could be misinterpreted
12. Check regulatory compliance - Review for regulatory and compliance considerations

Based on the content type, audience, context, and purpose of this communication, recommend 3-5 tools that would be most valuable. Consider:
- Is this internal or external communication?
- What's at stake? (reputation, legal, operational)
- Who is the audience?
- What stage is this communication at?

For each recommended tool, explain briefly why it's relevant for THIS specific communication.

Return ONLY valid JSON:
{
  "contentType": "Brief description of what this communication is (e.g., 'Press release about acquisition')",
  "audience": "Who this appears to be for",
  "recommendations": [
    {"tool": "Exact tool name from list", "reason": "Why this tool is valuable for this content (15-25 words)"}
  ],
  "skip": [
    {"tool": "Tool name", "reason": "Brief reason why not needed (10-15 words)"}
  ]
}`;

      const result = await callClaude(prompt, 1500);
      let suggestions;
      try {
        suggestions = parseJSON(result);
        if (!suggestions.recommendations) {
          throw new Error('Invalid format');
        }
      } catch (parseErr) {
        console.error('Tool suggestion parse error:', parseErr);
        suggestions = {
          contentType: "Unable to determine",
          audience: "Unknown",
          recommendations: [
            { tool: "Analyse for improvements", reason: "General improvement suggestions are always valuable." },
            { tool: "Test structure and clarity", reason: "Ensures message is clear and well-organised." }
          ],
          skip: []
        };
      }
      setSuggestedTools(suggestions);
    } catch (err) {
      console.error('Tool suggestion error:', err);
      setError('Failed to analyse content for tool suggestions');
    } finally {
      setIsSuggestingTools(false);
    }
  };

  // Chatbot
  const sendChatMessage = async (message = null) => {
    const msg = message || chatInput;
    if (!msg.trim() || isChattingAnalyse) return;

    const intent = detectIntent(msg);
    
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: msg }]);
    setIsChattingAnalyse(true);
    setIsModifyingContent(intent === 'modification'); // Track if we're modifying
    setError('');
    
    // Clear suggestions when user sends a message
    setAnalyseChatSuggestions([]);
    
    // Scroll up immediately when modifying content so user sees the thought process
    if (intent === 'modification') {
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }

    const stages = intent === 'modification'
      ? [
          "Understanding your request...",
          "Reviewing current content...",
          "Incorporating changes...",
          "Finalising updates..."
        ]
      : [
          "Understanding your question...",
          "Analysing current content...",
          "Formulating response..."
        ];

    const cleanup = animateStages(stages);

    try {
      const history = chatMessages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}:\n${m.content}`).join('\n\n');
      
      let prompt;
      
      if (intent === 'modification') {
        // User wants to change the content
        prompt = `Rewrite this communication for ${companyName} implementing the requested changes.

${buildCompanyContext()}

CURRENT CONTENT:
${workspaceContent.slice(0, 2500)}

${analyseContext ? `CONTEXT: ${analyseContext}\n\n` : ''}
${buildStyleContext()}
${history ? `CONVERSATION:\n${history}\n\n` : ''}

USER REQUEST:
${msg}

CRITICAL: If you need specific information not provided, use **[Insert ...]** placeholders. DO NOT invent names, dates, or figures.
Use British English spelling.

Return ONLY the updated content with no preamble.`;
      } else {
        // User is asking a question
        prompt = `You are advising on this communication for ${companyName}.

${buildCompanyContext()}

CURRENT CONTENT:
${workspaceContent.slice(0, 2500)}

${analyseContext ? `CONTEXT: ${analyseContext}\n\n` : ''}

${history ? `CONVERSATION:\n${history}\n\n` : ''}

USER QUESTION:
${msg}

Provide helpful, specific advice about the content. Be concise (50-150 words). Do NOT rewrite the content unless explicitly asked.

Use British English spelling.`;
      }

      const result = await callClaude(prompt, 2500);
      cleanup();
      
      if (intent === 'modification') {
        // Save new version to history
        saveAnalyseVersion(result);
        // Update workspace content
        setWorkspaceContent('');
        typewriter(result, setWorkspaceContent);
        setChatMessages(prev => [...prev, { role: 'assistant', content: 'Working draft updated.' }]);
        setIsWorkspaceCopied(false);
      } else {
        // Just provide advice in chat
        setChatMessages(prev => [...prev, { role: 'assistant', content: result }]);
      }
    } catch (err) {
      cleanup();
      setError('Chat failed');
    } finally {
      setIsChattingAnalyse(false);
      setIsModifyingContent(false); // Reset
      setLoadingStages([]);
    }
  };

  // Delete result
  const deleteResult = (type) => {
    setAnalysisResults(prev => prev.filter(r => r.type !== type));
  };

  // Style management functions
  const getSelectedStyle = () => {
    if (!selectedStyleId) return null;
    return styles.find(s => s.id === selectedStyleId) || null;
  };

  const addStyle = (name, content) => {
    const newStyle = {
      id: Date.now().toString(),
      name: name.trim(),
      content: content,
      createdAt: Date.now()
    };
    setStyles(prev => [...prev, newStyle]);
    setNewStyleName('');
    setNewStyleContent('');
    return newStyle;
  };

  const updateStyle = (id, name, content) => {
    setStyles(prev => prev.map(s => 
      s.id === id ? { ...s, name: name.trim(), content: content } : s
    ));
    setEditingStyle(null);
  };

  const deleteStyle = (id) => {
    // Prevent deleting the default Crafti style
    if (id === 'crafti-default') return;
    
    setStyles(prev => prev.filter(s => s.id !== id));
    if (selectedStyleId === id) {
      setSelectedStyleId(null);
    }
  };

  // Hard reset - clears all persistent storage and resets component
  const hardReset = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    // Clear all data from persistent storage
    if (typeof window !== "undefined") {
      try {
        storage.set('styles', JSON.stringify([DEFAULT_CRAFTI_STYLE]));
        storage.set('saved', '[]');
        storage.set('company', '');
        storage.set('company-validated', 'false');
        storage.set('website-context', '');
        storage.set('company-description', '');
        console.log('All data cleared from persistent storage');
      } catch (error) {
        console.error('Error clearing data from storage:', error);
      }
    }
    // Reset styles to just the default
    setStyles([DEFAULT_CRAFTI_STYLE]);
    setSavedComms([]);
    // Close modal and reset modal state
    setShowStyleManager(false);
    setEditingStyle(null);
    setNewStyleName('');
    setNewStyleContent('');
    setShowAddStyleForm(false);
    setSelectedStyleId(null);
    setConfirmReset(false);
    setEditingCommId(null);
    // Reset company
    setCompanyName('');
    setCompanyKnowledgeValidated(false);
    setKnowledgeCheckResult(null);
    setCompanyContext('');
    setCompanyContextFiles([]);
    setCompanyContextFileContents([]);
    // Reset new company state
    setProbableCompanyInfo(null);
    setCompanyWebsiteUrl('');
    setWebsiteContext('');
    setCompanyDescription('');
  };

  // Factory reset - clears ALL persistent storage data
  const factoryReset = async () => {
    // Clear all data from persistent storage
    if (typeof window !== "undefined") {
      try {
        storage.set('styles', JSON.stringify([DEFAULT_CRAFTI_STYLE]));
        storage.set('saved', '[]');
        storage.set('company', '');
        storage.set('company-validated', 'false');
        storage.set('website-context', '');
        storage.set('company-description', '');
        console.log('Factory reset - all data cleared from persistent storage');
      } catch (error) {
        console.error('Error clearing data from storage:', error);
      }
    }
    setStyles([DEFAULT_CRAFTI_STYLE]);
    setSavedComms([]);
    setSelectedStyleId(null);
    setMode('landing');
    // Reset all content state
    setContent('');
    setWorkspaceContent('');
    setGeneratedContent('');
    setCompanyName('');
    setCategory('');
    setContentType('');
    setAnalyseCategory('');
    setAnalyseContentType('auto');
    setEditingCommId(null);
    // Reset company validation
    setCompanyKnowledgeValidated(false);
    setKnowledgeCheckResult(null);
    setCompanyContext('');
    setCompanyContextFiles([]);
    setCompanyContextFileContents([]);
    // Reset new company state
    setProbableCompanyInfo(null);
    setCompanyWebsiteUrl('');
    setWebsiteContext('');
    setCompanyDescription('');
  };

  // Generate a suggested name for saved communication using AI
  const generateSuggestedName = async (contentToName) => {
    try {
      const prompt = `Generate a short, descriptive title (5-8 words max) for this communication. Return ONLY the title, nothing else.

CONTENT:
${contentToName.slice(0, 1500)}

Examples of good titles:
- "Q3 Earnings Announcement - Record Growth"
- "New CEO Appointment Press Release"
- "Customer Data Breach Notification"
- "Annual General Meeting Invitation"

Return only the title:`;

      const result = await callClaude(prompt, 50);
      // Clean up the result - remove quotes, extra whitespace
      return result.replace(/^["']|["']$/g, '').trim().slice(0, 60);
    } catch (error) {
      console.error('Error generating name:', error);
      // Fallback to simple name
      const company = companyName || 'Communication';
      const date = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
      return `${company} - Draft (${date})`;
    }
  };

  // Open save modal
  const openSaveModal = async (fromMode) => {
    setSavingFromMode(fromMode);
    setShowSaveModal(true);
    setIsGeneratingSuggestedName(true);
    
    // Set a temporary placeholder
    const company = companyName || 'Communication';
    const date = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
    setSaveModalName(`${company} - Draft (${date})`);
    
    // Generate AI-powered name
    const contentToName = fromMode === 'create' ? generatedContent : workspaceContent;
    if (contentToName.trim()) {
      const suggestedName = await generateSuggestedName(contentToName);
      setSaveModalName(suggestedName);
    }
    setIsGeneratingSuggestedName(false);
  };

  // Save communication
  const saveComm = () => {
    if (!saveModalName.trim()) return;
    
    const contentToSave = savingFromMode === 'create' ? generatedContent : workspaceContent;
    if (!contentToSave.trim()) return;

    const now = Date.now();
    
    // Check if we're updating an existing saved comm
    if (editingCommId) {
      setSavedComms(prev => prev.map(comm => 
        comm.id === editingCommId 
          ? {
              ...comm,
              name: saveModalName.trim(),
              content: contentToSave,
              companyName: companyName || '',
              category: savingFromMode === 'create' ? category : analyseCategory,
              contentType: savingFromMode === 'create' ? contentType : analyseContentType,
              updatedAt: now
            }
          : comm
      ));
    } else {
      // Create new saved comm
      const newComm = {
        id: `comm-${now}`,
        name: saveModalName.trim(),
        content: contentToSave,
        companyName: companyName || '',
        category: savingFromMode === 'create' ? category : analyseCategory,
        contentType: savingFromMode === 'create' ? contentType : analyseContentType,
        createdAt: now,
        updatedAt: now
      };
      
      setSavedComms(prev => [newComm, ...prev]);
      setEditingCommId(newComm.id); // Now we're editing this saved comm
    }
    
    setShowSaveModal(false);
    setSaveModalName('');
  };

  // Load a saved communication into Analyse mode
  const loadComm = (comm) => {
    setCompanyName(comm.companyName || '');
    setAnalyseCategory(comm.category || '');
    setAnalyseContentType(comm.contentType || 'auto');
    setContent(comm.content);
    setWorkspaceContent(comm.content);
    setIsContentLoaded(true);
    setShowWorkspace(true);
    setShowContentInput(false);
    setEditingCommId(comm.id);
    setAnalyseVersionHistory([comm.content]);
    setAnalyseCurrentVersion(0);
    setChatMessages([]); // Clear previous chat
    setMode('analyse');
    // Generate AI-powered chat suggestions
    generateAnalyseChatSuggestions(comm.content);
  };

  // Delete a saved communication
  const deleteComm = (id) => {
    setSavedComms(prev => prev.filter(comm => comm.id !== id));
    if (editingCommId === id) {
      setEditingCommId(null);
    }
  };

  // Rename a saved communication
  const renameComm = (id, newName) => {
    if (!newName.trim()) return;
    setSavedComms(prev => prev.map(comm => 
      comm.id === id 
        ? { ...comm, name: newName.trim(), updatedAt: Date.now() }
        : comm
    ));
  };

  const handleStyleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingStyle(true);
    try {
      let text = '';
      
      if (file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result;
      } else if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        text = await file.text();
      } else if (file.name.endsWith('.pdf')) {
        // For PDF, we'd need a PDF parser - for now just notify
        setError('PDF files are not yet supported for style guides. Please use .docx, .txt, or .md files.');
        setIsUploadingStyle(false);
        return;
      } else {
        text = await file.text();
      }

      // Set the content for the new style
      setNewStyleContent(text);
      
      // Auto-fill name from filename if empty
      if (!newStyleName) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setNewStyleName(nameWithoutExt);
      }
    } catch (err) {
      console.error('Error reading style file:', err);
      setError('Failed to read style guide file');
    } finally {
      setIsUploadingStyle(false);
      e.target.value = ''; // Reset file input
    }
  };

  const buildStyleContext = () => {
    const style = getSelectedStyle();
    if (!style) return '';
    return `
WRITING STYLE GUIDE:
The following style guide should be applied to the content. Follow its guidelines for tone, voice, formatting, and any specific conventions it specifies:

---
${style.content}
---

Apply these style guidelines throughout the content while maintaining the other requirements specified.
`;
  };

  // Reset
  const reset = () => {
    // Go back to landing, keep company info
    setMode('landing');
    setContent('');
    setUploadedFile(null);
    setCategory('');
    setContentType('');
    setAudience('');
    setFocus('');
    setTone('');
    setCustomInput('');
    setGeneratedContent('');
    setAnalyseCategory('');
    setAnalyseContentType('auto');
    setAnalyseContext('');
    setWorkspaceContent('');
    setShowWorkspace(false);
    setIsContentLoaded(false);
    setShowContentInput(true);
    setAnalysisResults([]);
    setSuggestedTools(null);
    setChatMessages([]);
    setError('');
    setCreateChatMessages([]);
    setCreateSuggestions([]);
    setShowCreateSuggestions(false);
    setIsCopied(false);
    setIsWorkspaceCopied(false);
    setUploadedRefFiles([]);
    setRefFileContents([]);
    // Keep company info - don't reset these:
    // setCompanyName('');
    // setCompanyContext('');
    // setCompanyContextFiles([]);
    // setCompanyContextFileContents([]);
    // setKnowledgeCheckResult(null);
    // setCompanyKnowledgeValidated(false);
    // Reset version history
    setCreateVersionHistory([]);
    setCreateCurrentVersion(0);
    setAnalyseVersionHistory([]);
    setAnalyseCurrentVersion(0);
    // Reset style selection (but NOT saved styles - those persist)
    setSelectedStyleId(null);
    setShowStyleManager(false);
    setEditingStyle(null);
    setNewStyleName('');
    setNewStyleContent('');
    setShowAddStyleForm(false);
    // Clear editing comm ID so next save creates new
    setEditingCommId(null);
  };

  // Send generated content to full analysis suite
  const sendToAnalyse = () => {
    setContent(generatedContent);  // Copy generated content to analyse section
    setAnalyseCategory(category);  // Pre-select the category from create mode
    setAnalyseContentType(contentType);  // Pre-select the content type from create mode
    setMode('analyse');  // Switch to analyse mode
    // Don't auto-load - let them click "Load Content" to see the full flow
  };

  // Score colors
  const scoreColor = (score) => {
    if (score >= 8) return 'bg-gray-700';
    if (score >= 6) return 'bg-yellow-600';
    if (score >= 4) return 'bg-orange-600';
    return 'bg-red-600';
  };

  const scoreBorder = (score) => {
    if (score >= 8) return 'border-gray-300 bg-gray-100';
    if (score >= 6) return 'border-yellow-200 bg-yellow-50';
    if (score >= 4) return 'border-orange-200 bg-orange-50';
    return 'border-red-200 bg-red-50';
  };

  // Sentiment color
  const sentimentColor = (sentiment) => {
    if (sentiment === 'Very Positive') return 'bg-green-600';
    if (sentiment === 'Positive') return 'bg-green-500';
    if (sentiment === 'Mixed') return 'bg-yellow-500';
    if (sentiment === 'Neutral') return 'bg-gray-500';
    if (sentiment === 'Concerned') return 'bg-orange-500';
    return 'bg-red-600'; // Very Concerned
  };

  // Loading stages component
  const LoadingStages = () => (
    <div className="space-y-3">
      {loadingStages.map((stage, idx) => (
        <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
          idx === currentStage ? 'bg-gray-50 border-2 border-gray-400' :
          idx < currentStage ? 'bg-gray-100 border-2 border-gray-300' :
          'bg-gray-50 border-2 border-gray-100'
        }`}>
          {idx < currentStage ? (
            <CheckCircle className="w-5 h-5 text-gray-900 flex-shrink-0" />
          ) : idx === currentStage ? (
            <Loader2 className="w-5 h-5 text-gray-900 animate-spin flex-shrink-0" />
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
          )}
          <span className={`text-sm ${idx <= currentStage ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
            {stage}
          </span>
        </div>
      ))}
    </div>
  );

  // Get result by type
  const getResult = (type) => analysisResults.find(r => r.type === type);

  // Render landing
  const renderLanding = () => (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-4 mb-6">
          <img src="/logo.png" alt="Crafti" className="w-14 h-14" />
          <h1 className="text-4xl" style={{color: '#1B2541', fontFamily: "'Nunito', sans-serif", fontWeight: 700}}>crafti</h1>
        </div>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          Create and analyse professional communications with AI-powered stakeholder insights and critical perspectives
        </p>
      </div>

      {/* Company Knowledge Check */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Company information</h2>
        <p className="text-sm text-gray-600 mb-4">Specify the company for which communications will be created</p>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1.5">
              Company name
            </label>
            <div className="relative">
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g., Acme Corp, Microsoft, Woolworths"
                disabled={companyKnowledgeValidated}
                className="w-full px-3 py-2 pr-52 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              {!companyKnowledgeValidated && (
                <button
                  onClick={checkCompanyKnowledge}
                  disabled={!companyName.trim() || isCheckingKnowledge}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-[#1B2541] hover:bg-[#131C33] disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-3 py-1.5 text-xs rounded-md font-medium transition-colors flex items-center gap-1.5"
                >
                  {isCheckingKnowledge ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      Check knowledge
                    </>
                  )}
                </button>
              )}
            </div>
            {!companyKnowledgeValidated && (
              <p className="text-xs text-gray-500 mt-1.5">Verify Claude has enough context about this organisation</p>
            )}
          </div>

          {knowledgeCheckResult === 'confident' && !companyKnowledgeValidated && (
            <div className="bg-gray-100 border-l-4 border-gray-700 p-3 rounded">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{color: '#1B2541'}} />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Knowledge Confirmed</p>
                  <p className="text-xs text-gray-700 mt-0.5">I have sufficient context about {companyName} to create professional communications.</p>
                </div>
              </div>
            </div>
          )}

          {/* Tier 2: Probable Match - Confirmation UI */}
          {knowledgeCheckResult === 'probable' && probableCompanyInfo && (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
              <div className="flex items-start gap-2">
                <Search className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">Please confirm</p>
                  <p className="text-sm text-gray-700 mt-1">
                    Do you mean <strong>{probableCompanyInfo.suggestedName}</strong>?
                  </p>
                  <p className="text-xs text-gray-600 mt-1">{probableCompanyInfo.description}</p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => confirmProbableCompany(true)}
                      className="bg-[#1B2541] hover:bg-[#131C33] text-white px-4 py-1.5 text-sm rounded-lg font-medium transition-colors"
                    >
                      Yes, that's correct
                    </button>
                    <button
                      onClick={() => confirmProbableCompany(false)}
                      className="bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 px-4 py-1.5 text-sm rounded-lg font-medium transition-colors"
                    >
                      No, different company
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tier 3: Unknown - Web Search + Manual Context */}
          {knowledgeCheckResult === 'unknown' && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Additional context needed</p>
                    <p className="text-xs text-gray-700 mt-0.5">I don't have enough information about {companyName}. You can provide their website URL for automatic lookup, or add context manually.</p>
                  </div>
                </div>
              </div>

              {/* Web Search Option */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Option 1: Search company website
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={companyWebsiteUrl}
                    onChange={(e) => setCompanyWebsiteUrl(e.target.value)}
                    placeholder="https://www.company.com"
                    disabled={isSearchingWebsite}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-transparent disabled:bg-gray-100"
                  />
                  <button
                    onClick={searchCompanyWebsite}
                    disabled={!companyWebsiteUrl.trim() || isSearchingWebsite}
                    className="bg-[#1B2541] hover:bg-[#131C33] disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 text-sm rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
                  >
                    {isSearchingWebsite ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        Search Website
                      </>
                    )}
                  </button>
                </div>
                {isSearchingWebsite && webSearchStatus && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span className="text-sm text-blue-800 font-medium">{webSearchStatus}</span>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">This may take 1-2 minutes as we search multiple pages...</p>
                  </div>
                )}
                {!isSearchingWebsite && (
                  <p className="text-xs text-gray-500 mt-1.5">We'll search their website to gather company information automatically</p>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-gray-200"></div>
                <span className="text-xs text-gray-400 font-medium">OR</span>
                <div className="flex-1 border-t border-gray-200"></div>
              </div>

              {/* Manual Context Option */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Option 2: Add context manually
                </label>
                <textarea
                  value={companyContext}
                  onChange={(e) => setCompanyContext(e.target.value)}
                  placeholder="What does the company do? Industry? Key products/services? Recent news?"
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-transparent resize-none"
                />

                {/* Upload Context Documents */}
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Or upload documents
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center hover:border-gray-400 transition-colors">
                    <input
                      type="file"
                      accept=".docx,.txt,.pdf"
                      onChange={handleCompanyFileUpload}
                      className="hidden"
                      id="company-file-upload"
                      multiple
                    />
                    <label htmlFor="company-file-upload" className="cursor-pointer">
                      <Upload className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                      <p className="text-xs text-gray-600">Upload company background documents</p>
                      <p className="text-xs text-gray-500">.docx, .txt, .pdf</p>
                    </label>
                  </div>
                  
                  {companyContextFiles.length > 0 && (
                    <div className="space-y-1.5 mt-2">
                      {companyContextFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 border border-gray-300 rounded-lg">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileText className="w-4 h-4 text-gray-600 flex-shrink-0" />
                            <span className="text-xs text-gray-900 truncate">{file.name}</span>
                          </div>
                          <button
                            onClick={() => removeCompanyFile(index)}
                            className="text-gray-400 hover:text-red-600 flex-shrink-0 ml-2"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={proceedWithCompanyContext}
                  disabled={!companyContext.trim() && companyContextFiles.length === 0}
                  className="mt-3 bg-[#1B2541] hover:bg-[#131C33] disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-5 py-2 text-sm rounded-lg font-semibold transition-colors"
                >
                  Proceed with Manual Context
                </button>
              </div>
            </div>
          )}

          {companyKnowledgeValidated && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-700">
                  <CheckCircle className="w-4 h-4" style={{color: '#1B2541'}} />
                  <span className="text-sm font-medium">Company: {companyName}</span>
                  {websiteContext && (
                    <span className="text-xs text-gray-500 ml-2">(via web search)</span>
                  )}
                </div>
                <button
                  onClick={async () => {
                    setCompanyKnowledgeValidated(false);
                    setKnowledgeCheckResult(null);
                    setCompanyName('');
                    setCompanyContext('');
                    setCompanyContextFiles([]);
                    setCompanyContextFileContents([]);
                    // Clear new state
                    setProbableCompanyInfo(null);
                    setCompanyWebsiteUrl('');
                    setWebsiteContext('');
                    setCompanyDescription('');
                    // Clear company data from persistent storage
                    if (typeof window !== "undefined") {
                      try {
                        storage.set('company', '');
                        storage.set('company-validated', 'false');
                        storage.set('website-context', '');
                        storage.set('company-description', '');
                      } catch (error) {
                        console.error('Error clearing company data:', error);
                      }
                    }
                  }}
                  className="text-xs text-gray-600 hover:text-gray-900 font-medium underline"
                >
                  Change company
                </button>
              </div>
              {companyDescription && (
                <p className="text-xs text-gray-600 mt-2 pl-6">{companyDescription}</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-8 mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Capabilities</h2>
        <div className="grid grid-cols-2 gap-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{color: '#1B2541'}} />
            <div>
              <p className="font-medium text-gray-900">Create professional communications</p>
              <p className="text-sm text-gray-600">Generate drafts for media releases, announcements, internal updates and more</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{color: '#1B2541'}} />
            <div>
              <p className="font-medium text-gray-900">Refine and strengthen content</p>
              <p className="text-sm text-gray-600">Analyse existing drafts for clarity, tone, structure and stakeholder impact</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{color: '#1B2541'}} />
            <div>
              <p className="font-medium text-gray-900">Apply custom writing styles</p>
              <p className="text-sm text-gray-600">Upload style guides and apply consistent tone across all communications</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{color: '#1B2541'}} />
            <div>
              <p className="font-medium text-gray-900">Save and manage drafts</p>
              <p className="text-sm text-gray-600">Keep work in progress and return to refine later</p>
            </div>
          </div>
        </div>
      </div>

      {/* Saved Communications Section - Always visible */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">Saved communications</h2>
            {savedComms.length > 0 && (
              <span className="text-sm text-gray-500">({savedComms.length})</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs text-gray-500">🔒 Only visible to you</p>
            {savedComms.length > 0 && (
              <button
                onClick={() => {
                  if (!confirmClearSaved) {
                    setConfirmClearSaved(true);
                    return;
                  }
                  setSavedComms([]);
                  setEditingCommId(null);
                  setConfirmClearSaved(false);
                }}
                onMouseLeave={() => setConfirmClearSaved(false)}
                className={`text-xs transition-colors ${confirmClearSaved ? 'text-red-600 font-medium' : 'text-gray-500 hover:text-red-500'}`}
              >
                {confirmClearSaved ? 'Click to confirm' : 'Clear all'}
              </button>
            )}
          </div>
        </div>
        {savedComms.length > 0 ? (
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
            {savedComms.map((comm) => (
              <div
                key={comm.id}
                className="group flex items-center justify-between bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    onClick={() => loadComm(comm)}
                    className="text-sm font-medium text-gray-900 hover:text-gray-700 text-left truncate"
                  >
                    {comm.name}
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-400">
                    {new Date(comm.updatedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteComm(comm.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all"
                    title="Delete"
                  >
                    <X className="w-3 h-3 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            <p className="text-sm">No saved communications yet</p>
            <p className="text-xs mt-1">Create or analyse content, then save it to access later</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div 
          onClick={() => companyKnowledgeValidated && setMode('create')}
          className={`bg-white rounded-lg border-2 p-8 transition-all ${
            companyKnowledgeValidated 
              ? 'border-gray-200 hover:border-gray-700 cursor-pointer hover:shadow-lg' 
              : 'border-gray-200 opacity-50 cursor-not-allowed'
          } group`}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-50 rounded-full mb-4 group-hover:bg-gray-100 transition-colors border-2 border-black">
            <PenTool className="w-8 h-8 text-gray-900" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Create content</h3>
          <p className="text-gray-600 mb-6">
            Generate professional communications tailored to your client's audience and objectives
          </p>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 bg-gray-900 rounded-full"></div>
              <span>Configure content parameters</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 bg-gray-900 rounded-full"></div>
              <span>AI generates professional content</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 bg-gray-900 rounded-full"></div>
              <span>Refine and optimise with AI</span>
            </div>
          </div>
          <div className="mt-6">
            <div style={{backgroundColor: '#1B2541'}} className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white group-hover:gap-3 transition-all">
              Get Started <span>→</span>
            </div>
          </div>
        </div>

        <div 
          onClick={() => companyKnowledgeValidated && setMode('analyse')}
          className={`bg-white rounded-lg border-2 p-8 transition-all ${
            companyKnowledgeValidated 
              ? 'border-gray-200 hover:border-gray-700 cursor-pointer hover:shadow-lg' 
              : 'border-gray-200 opacity-50 cursor-not-allowed'
          } group`}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-50 rounded-full mb-4 group-hover:bg-gray-100 transition-colors border-2 border-black">
            <Shield className="w-8 h-8 text-gray-900" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Refine & analyse content</h3>
          <p className="text-gray-600 mb-6">
            Test existing communications against frameworks, stakeholders, and media perspectives
          </p>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 bg-gray-900 rounded-full"></div>
              <span>Trust and credibility scoring</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 bg-gray-900 rounded-full"></div>
              <span>Stakeholder reaction testing</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 bg-gray-900 rounded-full"></div>
              <span>Media and expert perspectives</span>
            </div>
          </div>
          <div className="mt-6">
            <div style={{backgroundColor: '#1B2541'}} className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white group-hover:gap-3 transition-all">
              Get Started <span>→</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render create mode
  const renderCreate = () => (
    <div className="max-w-6xl mx-auto">
      {!generatedContent ? (
        <div className="space-y-6">
          {/* Input Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Create communication</h2>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Communication category <span className="text-red-600">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setContentType(''); // Reset content type when category changes
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-transparent"
              >
                <option value="">Select category</option>
                {categories.map((c, i) => <option key={i} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Content type <span className="text-red-600">*</span>
              </label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                disabled={!category}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">{category ? 'Select type' : 'Select category first'}</option>
                {getContentTypes().map((t, i) => <option key={i} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Target audience</label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-transparent"
              >
                <option value="">Select audience</option>
                {audiences.map((a, i) => <option key={i} value={a}>{a}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Primary focus</label>
              <select
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-transparent"
              >
                <option value="">Select focus</option>
                {focuses.map((f, i) => <option key={i} value={f}>{f}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-transparent"
              >
                <option value="">Select tone</option>
                {tones.map((t, i) => <option key={i} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Writing style
                {styles.length > 0 && <span className="text-gray-400 font-normal ml-1">({styles.length} saved)</span>}
              </label>
              <div className="relative">
                <select
                  value={selectedStyleId || ''}
                  onChange={(e) => {
                    if (e.target.value === 'manage') {
                      setShowStyleManager(true);
                    } else {
                      setSelectedStyleId(e.target.value || null);
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-transparent appearance-none"
                >
                  <option value="">None (default)</option>
                  {styles.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                  <option value="manage">⚙ Manage styles</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Additional context
            </label>
            <textarea
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Add specific details, key messages, or requirements..."
              className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-transparent resize-none"
            />
          </div>

          {/* Reference Material Upload */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Upload reference material (optional - up to 3 files)
            </label>
            
            {/* Show uploaded files */}
            {uploadedRefFiles.length > 0 && (
              <div className="space-y-2 mb-3">
                {uploadedRefFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-300 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-900" />
                      <div>
                        <span className="text-sm font-medium text-gray-900">{file.name}</span>
                        {refFileContents[index] && (
                          <p className="text-xs text-gray-900 mt-1">
                            ✓ Content extracted ({refFileContents[index].wordCount?.toLocaleString() || countWords(refFileContents[index].content).toLocaleString()} words)
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeRefFile(index)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Upload button - only show if less than 3 files */}
            {uploadedRefFiles.length < 3 && (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:border-gray-700 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">Word documents (.docx), text files (.txt), or PDFs (.pdf)</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {uploadedRefFiles.length} of 3 files uploaded
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleRefFileUpload}
                  accept=".txt,.docx,.pdf"
                />
              </label>
            )}
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-600 p-4 rounded">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <button
            onClick={generateContent}
            disabled={!contentType || isGenerating}
            className="w-full bg-[#1B2541] hover:bg-[#131C33] disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-4 px-6 rounded-lg font-semibold text-lg transition-colors flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate content
              </>
            )}
          </button>
        </div>

        {/* Loading Stages - Appears Below Form */}
        {isGenerating && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <h3 className="font-semibold text-gray-900 mb-6 text-center">Generating Content</h3>
            <div className="max-w-md mx-auto">
              <LoadingStages />
            </div>
          </div>
        )}
      </div>
      ) : (
        <div className="space-y-6">
          {/* Generated Content */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-gray-900">Generated Content</h3>
                  {createVersionHistory.length > 1 && (
                    <select
                      value={createCurrentVersion}
                      onChange={(e) => switchCreateVersion(Number(e.target.value))}
                      className="text-sm border border-gray-300 rounded px-2 py-1 bg-white focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                    >
                      {createVersionHistory.map((_, idx) => (
                        <option key={idx} value={idx}>
                          v{idx + 1}{idx === createVersionHistory.length - 1 ? ' (latest)' : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={copyToClipboard}
                    disabled={isCopied}
                    className={`text-sm ${
                      isCopied ? 'bg-gray-700' : 'bg-gray-600 hover:bg-gray-700'
                    } text-white px-3 py-1.5 rounded font-medium transition-colors flex items-center gap-1`}
                  >
                    {isCopied ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => openSaveModal('create')}
                    className="text-sm bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded font-medium transition-colors flex items-center gap-1"
                  >
                    <Download className="w-4 h-4" />
                    Save to toolkit
                  </button>
                  <button
                    onClick={sendToAnalyse}
                    className="text-sm bg-[#1B2541] hover:bg-[#131C33] text-white px-3 py-1.5 rounded font-medium transition-colors flex items-center gap-1"
                  >
                    <TrendingUp className="w-4 h-4" />
                    Open in refine and analyse
                  </button>
                </div>
              </div>
              {/* Style indicator */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Style:</span>
                <select
                  value={selectedStyleId || ''}
                  onChange={(e) => {
                    if (e.target.value === 'manage') {
                      setShowStyleManager(true);
                    } else {
                      setSelectedStyleId(e.target.value || null);
                    }
                  }}
                  className="text-sm border border-gray-300 rounded px-2 py-1 bg-white focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                >
                  <option value="">None (default)</option>
                  {styles.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                  <option value="manage">⚙ Manage</option>
                </select>
                {selectedStyleId && (
                  <button
                    onClick={regenerateWithStyle}
                    disabled={isRegeneratingWithStyle}
                    className="text-sm px-2 py-1 rounded font-medium transition-colors flex items-center gap-1"
                    style={{ backgroundColor: '#3f69ae', color: 'white' }}
                  >
                    {isRegeneratingWithStyle ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                    Regenerate with style
                  </button>
                )}
              </div>
            </div>
            <div className="p-6">
              {(isGenerating || isRegeneratingWithStyle || (isRefiningCreate && loadingStages.length > 0) || isApplyingCreateSuggestions) ? (
                <LoadingStages />
              ) : (
                <>
                  {generatedContent.includes('[Insert') && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                      <div className="flex">
                        <AlertCircle className="h-5 w-5 text-yellow-400 mr-3" />
                        <p className="text-sm text-yellow-700">
                          <strong>Placeholders detected:</strong> Replace <strong>[Insert...]</strong> tags with actual information before use.
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="prose prose-sm max-w-none text-gray-900">
                    {renderMarkdown(generatedContent)}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Refine with AI */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900">Refine with AI</h3>
              <p className="text-sm text-gray-600 mt-1">Chat with AI for specific changes</p>
            </div>
            {createChatMessages.length > 0 && (
              <div className="p-4 space-y-3 border-b border-gray-200 max-h-64 overflow-y-auto">
                {createChatMessages.map((m, i) => (
                  <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg p-3 ${m.role === 'user' ? 'text-white' : 'bg-gray-100 text-gray-900'}`} style={m.role === 'user' ? {backgroundColor: '#4A4A4E'} : {}}>
                      {m.role === 'user' ? (
                        <p className="text-sm">{m.content}</p>
                      ) : m.content === 'Working draft updated.' ? (
                        <p className="text-sm">{m.content}</p>
                      ) : (
                        <div className="text-sm prose prose-sm max-w-none">
                          {renderMarkdown(m.content)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="p-4">
              {/* AI-powered suggestion chips */}
              {(createChatSuggestions.length > 0 || isGeneratingCreateSuggestions) && (
                <div className="mb-3">
                  {isGeneratingCreateSuggestions ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Generating suggestions...</span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {createChatSuggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => refineCreatedContent(suggestion)}
                          disabled={isRefiningCreate}
                          className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 rounded-full transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={createChatInput}
                  onChange={(e) => setCreateChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !isRefiningCreate && refineCreatedContent()}
                  placeholder="Request changes (e.g., 'Make it more concise')"
                  disabled={isRefiningCreate || isApplyingCreateSuggestions}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-transparent disabled:bg-gray-100 text-sm"
                />
                <button
                  onClick={refineCreatedContent}
                  disabled={!createChatInput.trim() || isRefiningCreate || isApplyingCreateSuggestions}
                  className="bg-[#1B2541] hover:bg-[#131C33] disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  {isRefiningCreate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Check if content has placeholders
  const hasPlaceholders = (text) => {
    return text && text.includes('[Insert');
  };

  // Render analysis result based on type
  const renderAnalysisResult = (result, isLoading) => {
    // Check if this analysis is from an older version
    const isStale = result.analysedVersion !== undefined && result.analysedVersion !== analyseCurrentVersion;
    
    // Stale warning badge - small inline indicator
    const StaleBadge = () => isStale ? (
      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        Analysed on earlier draft
      </span>
    ) : null;
    
    if (result.type === 'trust') {
      return (
        <div key="trust" className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">Evaluate against trust framework</h3>
              <StaleBadge />
            </div>
            {result.data && (
              <button onClick={() => deleteResult('trust')} className="text-gray-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="p-6">
            {isLoading ? (
              <LoadingStages />
            ) : result.data && (
              <>
                {hasPlaceholders(workspaceContent) && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4">
                    <p className="text-sm text-yellow-800 font-semibold">
                      ⚠️ Placeholder content excluded from analysis but needs to be addressed in final version
                    </p>
                  </div>
                )}
                <div className="mb-6 text-center">
                  <div className="inline-flex items-center gap-2">
                    <span className="text-sm text-gray-600">Overall Score:</span>
                    <span className="text-4xl font-bold text-gray-900">{result.data.overall}</span>
                    <span className="text-xl text-gray-500">/10</span>
                  </div>
                </div>
                <p className="text-sm text-gray-900 font-bold italic mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                  Click on scores to add to consolidated action items
                </p>
                <div className="space-y-3">
                  {result.data.scores.map((s, i) => (
                    <div
                      key={i}
                      onClick={() => toggleResultSelection('trust', i)}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                        result.selected?.includes(i)
                          ? 'border-gray-700 bg-gray-50'
                          : `border-gray-200 hover:border-gray-400 ${scoreBorder(s.score)}`
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">{s.dimension}</h4>
                        <span className="font-bold text-gray-900">{s.score}/10</span>
                      </div>
                      <p className="text-sm text-gray-700">{s.reasoning}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      );
    } else if (result.type === 'stakeholders') {
      return (
        <div key="stakeholders" className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">Test against key stakeholders</h3>
                <StaleBadge />
              </div>
              {result.data && <p className="text-sm text-gray-600 mt-1">{result.data.length} groups from 500+ perspectives</p>}
            </div>
            {result.data && (
              <button onClick={() => deleteResult('stakeholders')} className="text-gray-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="p-6">
            {isLoading ? (
              <LoadingStages />
            ) : result.data && (
              <>
                {hasPlaceholders(workspaceContent) && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4">
                    <p className="text-sm text-yellow-800 font-semibold">
                      ⚠️ Placeholder content excluded from analysis but needs to be addressed in final version
                    </p>
                  </div>
                )}
                <p className="text-sm text-gray-900 font-bold italic mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                  Click on a group to add to consolidated action items
                </p>
                <div className="space-y-3">
                  {result.data.map((g, i) => {
                    const reactionPoints = g.reaction || g.concerns || [];
                    return (
                      <div
                        key={i}
                        onClick={() => toggleResultSelection('stakeholders', i)}
                        className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                          result.selected?.includes(i)
                            ? 'border-gray-700 bg-gray-50'
                            : 'border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">{g.name}</h4>
                            <p className="text-sm text-gray-500">~{g.size}% of stakeholders</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-600 mb-1">Sentiment:</p>
                            <div className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${sentimentColor(g.sentiment && g.sentiment.trim() !== '' ? g.sentiment : 'Mixed')}`}>
                              {g.sentiment && g.sentiment.trim() !== '' ? g.sentiment : 'Mixed'}
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 mb-2">Stakeholder Reaction:</p>
                          <div className="space-y-1">
                            {reactionPoints.map((point, ci) => (
                              <div key={ci} className="flex items-start gap-2 text-sm text-gray-700">
                                <span className="text-gray-900">•</span>
                                <span>{point}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      );
    } else if (result.type === 'afr') {
      return (
        <div key="afr" className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">Draft critical media article</h3>
                <StaleBadge />
              </div>
              {result.data && <p className="text-sm text-gray-600 mt-1">{result.data.publication}</p>}
            </div>
            {result.data && (
              <button onClick={() => deleteResult('afr')} className="text-gray-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="p-6">
            {isLoading ? (
              <LoadingStages />
            ) : result.data && (
              <>
                {/* Newspaper-style article */}
                <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
                  {/* Publication masthead */}
                  <div className="bg-gray-900 text-white px-4 py-2 flex items-center justify-between">
                    <span className="font-serif text-lg font-bold tracking-wide">{result.data.publication || 'Australian Financial Review'}</span>
                    <span className="text-xs text-gray-400">{result.data.date || 'Today'}</span>
                  </div>
                  
                  {/* Article content */}
                  <div className="p-5 bg-gray-50">
                    {/* Headline */}
                    <h2 className="font-serif text-2xl font-bold text-gray-900 leading-tight mb-3">
                      {result.data.headline || 'Critical Analysis'}
                    </h2>
                    
                    {/* Byline */}
                    <p className="text-sm text-gray-600 mb-4 pb-3 border-b border-gray-200">
                      By <span className="font-medium">{result.data.journalist || 'Senior Correspondent'}</span>, {result.data.role || 'Business Writer'}
                    </p>
                    
                    {/* Article body */}
                    <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                      {(result.data.article || '').split('\n\n').map((para, idx) => (
                        <p key={idx} className="mb-3">{para}</p>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Key Themes */}
                {result.data.themes && result.data.themes.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-900 font-bold italic mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                      </svg>
                      Key criticisms — click to add to action items
                    </p>
                    <div className="space-y-2">
                      {result.data.themes.map((theme, idx) => (
                        <div
                          key={idx}
                          onClick={() => toggleResultSelection('afr', idx)}
                          className={`border-2 rounded-lg p-3 cursor-pointer transition-all hover:shadow-md ${
                            result.selected?.includes(idx)
                              ? 'border-gray-700 bg-gray-50'
                              : 'border-gray-200 hover:border-gray-400'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                            <span className="text-sm text-gray-900">{theme}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      );
    } else if (result.type === 'strengths') {
      return (
        <div key="strengths" className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">Identify communication strengths</h3>
                <StaleBadge />
              </div>
              {result.data && <p className="text-sm text-gray-600 mt-1">{result.data.length} strengths identified</p>}
            </div>
            {result.data && (
              <button onClick={() => deleteResult('strengths')} className="text-gray-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="p-6">
            {isLoading ? (
              <LoadingStages />
            ) : result.data && (
              <>
                <div className="space-y-3">
                  {result.data.map((s, i) => (
                    <div
                      key={i}
                      onClick={() => toggleResultSelection('strengths', i)}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                        result.selected?.includes(i)
                          ? 'border-gray-700 bg-gray-100'
                          : 'border-gray-300 bg-gray-100 hover:border-gray-400'
                      }`}
                    >
                      <h4 className="font-semibold text-gray-900 mb-1">{s.title}</h4>
                      <p className="text-sm text-gray-700">{s.description}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      );
    } else if (result.type === 'improvements') {
      return (
        <div key="improvements" className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">Analyse for improvements</h3>
                <StaleBadge />
              </div>
              {result.data && <p className="text-sm text-gray-600 mt-1">{result.data.length} suggestions</p>}
            </div>
            {result.data && (
              <button onClick={() => deleteResult('improvements')} className="text-gray-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="p-6">
            {isLoading ? (
              <LoadingStages />
            ) : result.data && (
              <>
                {hasPlaceholders(workspaceContent) && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4">
                    <p className="text-sm text-yellow-800 font-semibold">
                      ⚠️ Placeholder content excluded from analysis but needs to be addressed in final version
                    </p>
                  </div>
                )}
                <p className="text-sm text-gray-900 font-bold italic mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                  Click on improvements to add to consolidated action items
                </p>
                <div className="space-y-3">
                  {result.data.map((imp, i) => (
                    <div
                      key={i}
                      onClick={() => toggleResultSelection('improvements', i)}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                        result.selected?.includes(i)
                          ? 'border-gray-700 bg-gray-50'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900">{imp.title}</h4>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          imp.priority === 'Critical' ? 'bg-red-100 text-red-800' :
                          imp.priority === 'High Impact' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {imp.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{imp.description}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      );
    } else if (result.type === 'quoteRisks') {
      return (
        <div key="quoteRisks" className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">Identify quote risks</h3>
                <StaleBadge />
              </div>
              {result.data && <p className="text-sm text-gray-600 mt-1">{result.data.length} risks identified</p>}
            </div>
            {result.data && (
              <button onClick={() => deleteResult('quoteRisks')} className="text-gray-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="p-6">
            {isLoading ? (
              <LoadingStages />
            ) : result.data && (
              <>
                {hasPlaceholders(workspaceContent) && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4">
                    <p className="text-sm text-yellow-800 font-semibold">
                      ⚠️ Placeholder content excluded from analysis but needs to be addressed in final version
                    </p>
                  </div>
                )}
                <p className="text-sm text-gray-900 font-bold italic mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                  Click on risks to add to consolidated action items
                </p>
                <div className="space-y-3">
                  {result.data.map((risk, i) => (
                    <div
                      key={i}
                      onClick={() => toggleResultSelection('quoteRisks', i)}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                        result.selected?.includes(i)
                          ? 'border-gray-700 bg-gray-50'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900">Quote:</h4>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          risk.severity === 'High Risk' ? 'bg-red-100 text-red-800' :
                          risk.severity === 'Medium Risk' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {risk.severity}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 italic mb-2">"{risk.quote}"</p>
                      <p className="text-sm text-gray-700"><strong>Risk:</strong> {risk.risk}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      );
    } else if (result.type === 'assumptions') {
      return (
        <div key="assumptions" className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">Surface assumed knowledge</h3>
                <StaleBadge />
              </div>
              {result.data && <p className="text-sm text-gray-600 mt-1">{result.data.length} assumptions identified</p>}
            </div>
            {result.data && (
              <button onClick={() => deleteResult('assumptions')} className="text-gray-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="p-6">
            {isLoading ? (
              <LoadingStages />
            ) : result.data && (
              <>
                {hasPlaceholders(workspaceContent) && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4">
                    <p className="text-sm text-yellow-800 font-semibold">
                      ⚠️ Placeholder content excluded from analysis but needs to be addressed in final version
                    </p>
                  </div>
                )}
                <p className="text-sm text-gray-900 font-bold italic mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                  Click on assumptions to add to consolidated action items
                </p>
                <div className="space-y-3">
                  {result.data.map((assumption, i) => (
                    <div
                      key={i}
                      onClick={() => toggleResultSelection('assumptions', i)}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                        result.selected?.includes(i)
                          ? 'border-gray-700 bg-gray-50'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Search className="w-4 h-4 text-gray-600" />
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          assumption.severity === 'High Risk' ? 'bg-red-100 text-red-800' :
                          assumption.severity === 'Medium Risk' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {assumption.severity}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 font-medium mb-2">{assumption.assumption}</p>
                      <p className="text-sm text-gray-600"><strong>Risk:</strong> {assumption.risk}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      );
    } else if (result.type === 'audienceTone') {
      return (
        <div key="audienceTone" className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">Assess audience and tone fit</h3>
                <StaleBadge />
              </div>
              {result.data && <p className="text-sm text-gray-600 mt-1">{result.data.issues?.length || 0} issues identified</p>}
            </div>
            {result.data && (
              <button onClick={() => deleteResult('audienceTone')} className="text-gray-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="p-6">
            {isLoading ? (
              <LoadingStages />
            ) : result.data && (
              <>
                {hasPlaceholders(workspaceContent) && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4">
                    <p className="text-sm text-yellow-800 font-semibold">
                      ⚠️ Placeholder content excluded from analysis but needs to be addressed in final version
                    </p>
                  </div>
                )}
                {/* Overall Assessment */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Overall Assessment</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Tone</p>
                      <p className="text-sm font-medium text-gray-900">{result.data.overall.toneDescription}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Formality</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{result.data.overall.formalityLevel || 'Professional'}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          result.data.overall.formalityFit === 'Appropriate' ? 'bg-green-100 text-green-800' :
                          result.data.overall.formalityFit === 'Too formal' ? 'bg-yellow-100 text-yellow-800' :
                          result.data.overall.formalityFit === 'Too casual' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {result.data.overall.formalityFit || 'Review needed'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Readability Level</p>
                      <p className="text-sm font-medium text-gray-900">{result.data.overall.readabilityLevel}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Audience Fit</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              (result.data.overall.audienceFitScore || 5) >= 7 ? 'bg-green-500' :
                              (result.data.overall.audienceFitScore || 5) >= 5 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${(result.data.overall.audienceFitScore || 5) * 10}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900">{result.data.overall.audienceFitScore || 5}/10</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Overall Themes */}
                {result.data.themes && result.data.themes.length > 0 && (
                  <div className="mb-6">
                    <p className="text-sm text-gray-900 font-bold italic mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                      </svg>
                      Overall themes — click to apply across entire document
                    </p>
                    <div className="space-y-2">
                      {result.data.themes.map((theme, idx) => (
                        <div
                          key={idx}
                          onClick={() => toggleResultSelection('audienceTone', `theme-${idx}`)}
                          className={`border-2 rounded-lg p-3 cursor-pointer transition-all hover:shadow-md ${
                            result.selected?.includes(`theme-${idx}`)
                              ? 'border-gray-700 bg-gray-50'
                              : 'border-gray-200 hover:border-gray-400'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-gray-700 mt-1.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{theme.theme}</p>
                              <p className="text-sm text-gray-600 mt-1">{theme.rationale}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Specific Issues */}
                {result.data.issues && result.data.issues.length > 0 && (
                  <>
                    <p className="text-sm text-gray-900 font-bold italic mb-4 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                      </svg>
                      Specific examples — click to add to action items
                    </p>
                    <div className="space-y-3">
                      {result.data.issues.map((issue, i) => (
                        <div
                          key={i}
                          onClick={() => toggleResultSelection('audienceTone', i)}
                          className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                            result.selected?.includes(i)
                              ? 'border-gray-700 bg-gray-50'
                              : 'border-gray-200 hover:border-gray-400'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Target className="w-4 h-4 text-gray-600" />
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              issue.impact === 'High' ? 'bg-red-100 text-red-800' :
                              issue.impact === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {issue.impact} impact
                            </span>
                          </div>
                          <p className="text-sm text-gray-900 font-medium mb-2">{issue.issue}</p>
                          {issue.example && issue.example !== "N/A" && (
                            <p className="text-sm text-gray-500 italic mb-2">"{issue.example}"</p>
                          )}
                          <p className="text-sm text-gray-600"><strong>Suggestion:</strong> {issue.suggestion}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      );
    } else if (result.type === 'structure') {
      return (
        <div key="structure" className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">Test structure and clarity</h3>
                <StaleBadge />
              </div>
              {result.data && <p className="text-sm text-gray-600 mt-1">{result.data.issues?.length || 0} issues identified</p>}
            </div>
            {result.data && (
              <button onClick={() => deleteResult('structure')} className="text-gray-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="p-6">
            {isLoading ? (
              <LoadingStages />
            ) : result.data && (
              <>
                {hasPlaceholders(workspaceContent) && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4">
                    <p className="text-sm text-yellow-800 font-semibold">
                      ⚠️ Placeholder content excluded from analysis but needs to be addressed in final version
                    </p>
                  </div>
                )}
                
                {/* Takeaways at Different Read Levels */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-gray-900 mb-4">What Readers Take Away</h4>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-24 flex-shrink-0">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Headline only</span>
                      </div>
                      <p className="text-sm text-gray-900">{result.data.takeaways.headline}</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-24 flex-shrink-0">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">30-sec skim</span>
                      </div>
                      <p className="text-sm text-gray-900">{result.data.takeaways.skimRead}</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-24 flex-shrink-0">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Full read</span>
                      </div>
                      <p className="text-sm text-gray-900">{result.data.takeaways.fullRead}</p>
                    </div>
                  </div>
                </div>

                {/* Structure Assessment */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Structure Assessment</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Flow</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gray-700 rounded-full" 
                            style={{ width: `${result.data.assessment.flowScore * 10}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900">{result.data.assessment.flowScore}/10</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Clarity</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gray-700 rounded-full" 
                            style={{ width: `${result.data.assessment.clarityScore * 10}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900">{result.data.assessment.clarityScore}/10</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Structure Type</p>
                      <p className="text-sm font-medium text-gray-900">{result.data.assessment.structureType}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Verdict</p>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        result.data.assessment.structureVerdict === 'Strong' ? 'bg-green-100 text-green-800' :
                        result.data.assessment.structureVerdict === 'Adequate' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {result.data.assessment.structureVerdict}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Issues */}
                {result.data.issues && result.data.issues.length > 0 && (
                  <>
                    <p className="text-sm text-gray-900 font-bold italic mb-4 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                      </svg>
                      Click on issues to add to consolidated action items
                    </p>
                    <div className="space-y-3">
                      {result.data.issues.map((issue, i) => (
                        <div
                          key={i}
                          onClick={() => toggleResultSelection('structure', i)}
                          className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                            result.selected?.includes(i)
                              ? 'border-gray-700 bg-gray-50'
                              : 'border-gray-200 hover:border-gray-400'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Layout className="w-4 h-4 text-gray-600" />
                            <span className="text-xs text-gray-500">{issue.location}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              issue.priority === 'High' ? 'bg-red-100 text-red-800' :
                              issue.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {issue.priority} impact
                            </span>
                          </div>
                          <p className="text-sm text-gray-900 font-medium mb-2">{issue.issue}</p>
                          <p className="text-sm text-gray-600"><strong>Fix:</strong> {issue.fix}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      );
    } else if (result.type === 'expertPersona') {
      return (
        <div key="expertPersona" className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">Simulate expert persona feedback</h3>
                <StaleBadge />
              </div>
              {result.data && <p className="text-sm text-gray-600 mt-1">Feedback from {result.data.expert?.name}</p>}
            </div>
            {result.data && (
              <button onClick={() => deleteResult('expertPersona')} className="text-gray-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="p-6">
            {isLoading ? (
              <LoadingStages />
            ) : result.data && (
              <>
                {hasPlaceholders(workspaceContent) && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4">
                    <p className="text-sm text-yellow-800 font-semibold">
                      ⚠️ Placeholder content excluded from analysis but needs to be addressed in final version
                    </p>
                  </div>
                )}
                
                {/* Expert Profile */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 mb-6 border border-gray-200">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                      <UserCheck className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg">{result.data.expert.name}</h4>
                      <p className="text-sm text-gray-600 font-medium">{result.data.expert.title}</p>
                      <p className="text-sm text-gray-600 mt-2">{result.data.expert.background}</p>
                      <p className="text-sm text-gray-500 mt-2 italic">"{result.data.expert.philosophy}"</p>
                    </div>
                  </div>
                </div>

                {/* Overall Impression */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-gray-900 mb-2">Overall Impression</h4>
                  <p className="text-sm text-gray-700 italic">"{result.data.feedback.overallImpression}"</p>
                </div>

                {/* Strengths */}
                {result.data.feedback.strengths && result.data.feedback.strengths.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Award className="w-4 h-4 text-green-600" />
                      What Works Well
                    </h4>
                    <div className="space-y-2">
                      {result.data.feedback.strengths.map((strength, i) => (
                        <div key={i} className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-sm text-green-900 font-medium">{strength.point}</p>
                          <p className="text-sm text-green-700 mt-1">{strength.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Improvements */}
                {result.data.feedback.improvements && result.data.feedback.improvements.length > 0 && (
                  <>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-600" />
                      Suggested Improvements
                    </h4>
                    <p className="text-sm text-gray-900 font-bold italic mb-4 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                      </svg>
                      Click on improvements to add to consolidated action items
                    </p>
                    <div className="space-y-3">
                      {result.data.feedback.improvements.map((improvement, i) => (
                        <div
                          key={i}
                          onClick={() => toggleResultSelection('expertPersona', i)}
                          className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                            result.selected?.includes(i)
                              ? 'border-gray-700 bg-gray-50'
                              : 'border-gray-200 hover:border-gray-400'
                          }`}
                        >
                          <p className="text-sm text-gray-900 font-medium mb-2">{improvement.point}</p>
                          <p className="text-sm text-gray-600">{improvement.detail}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      );
    } else if (result.type === 'faq') {
      return (
        <div key="faq" className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">Draft FAQ & responses</h3>
                <StaleBadge />
              </div>
              {result.data && <p className="text-sm text-gray-600 mt-1">{result.data.length} questions anticipated</p>}
            </div>
            {result.data && (
              <button onClick={() => deleteResult('faq')} className="text-gray-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="p-6">
            {isLoading ? (
              <LoadingStages />
            ) : result.data && (
              <>
                {hasPlaceholders(workspaceContent) && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4">
                    <p className="text-sm text-yellow-800 font-semibold">
                      ⚠️ Placeholder content excluded from analysis but needs to be addressed in final version
                    </p>
                  </div>
                )}
                <p className="text-sm text-gray-900 font-bold italic mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                  Click on questions to add to consolidated action items
                </p>
                <div className="space-y-4">
                  {result.data.map((faq, i) => (
                    <div
                      key={i}
                      onClick={() => toggleResultSelection('faq', i)}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                        result.selected?.includes(i)
                          ? 'border-gray-700 bg-gray-50'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <MessageSquare className="w-4 h-4 text-gray-600" />
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          faq.priority === 'High' ? 'bg-red-100 text-red-800' :
                          faq.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {faq.priority} priority
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {faq.audience}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                          {faq.tone}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 font-semibold mb-3">"{faq.question}"</p>
                      <div className="bg-gray-50 rounded p-3 border border-gray-200">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Suggested response</p>
                        <p className="text-sm text-gray-700">{faq.suggestedResponse}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      );
    } else if (result.type === 'compliance') {
      return (
        <div key="compliance" className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">Check regulatory compliance</h3>
                <StaleBadge />
              </div>
              {result.data && <p className="text-sm text-gray-600 mt-1">{result.data.issues?.length || 0} potential issues identified</p>}
            </div>
            {result.data && (
              <button onClick={() => deleteResult('compliance')} className="text-gray-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="p-6">
            {isLoading ? (
              <LoadingStages />
            ) : result.data && (
              <>
                {/* Disclaimer */}
                <div className="bg-amber-50 border-l-4 border-amber-500 p-3 mb-4">
                  <p className="text-sm text-amber-800">
                    <strong>Disclaimer:</strong> This is an AI-assisted preliminary review only, not legal advice. All communications should be reviewed by qualified legal and compliance professionals before release.
                  </p>
                </div>

                {hasPlaceholders(workspaceContent) && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4">
                    <p className="text-sm text-yellow-800 font-semibold">
                      ⚠️ Placeholder content excluded from analysis but needs to be addressed in final version
                    </p>
                  </div>
                )}
                
                {/* Overall Risk Assessment */}
                <div className={`rounded-lg p-4 mb-6 border ${
                  result.data.overall.riskLevel === 'Critical' ? 'bg-red-50 border-red-300' :
                  result.data.overall.riskLevel === 'High' ? 'bg-orange-50 border-orange-300' :
                  result.data.overall.riskLevel === 'Medium' ? 'bg-yellow-50 border-yellow-300' :
                  'bg-green-50 border-green-300'
                }`}>
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-gray-900">Overall Risk Level</h4>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      result.data.overall.riskLevel === 'Critical' ? 'bg-red-600 text-white' :
                      result.data.overall.riskLevel === 'High' ? 'bg-orange-500 text-white' :
                      result.data.overall.riskLevel === 'Medium' ? 'bg-yellow-500 text-white' :
                      'bg-green-500 text-white'
                    }`}>
                      {result.data.overall.riskLevel}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{result.data.overall.summary}</p>
                </div>

                {/* Areas Checked */}
                {result.data.areasChecked && result.data.areasChecked.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-3">Compliance Areas Reviewed</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {result.data.areasChecked.map((area, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                            area.status === 'Clear' ? 'bg-green-500' :
                            area.status === 'Caution' ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">{area.area}</span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                area.status === 'Clear' ? 'bg-green-100 text-green-800' :
                                area.status === 'Caution' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {area.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{area.notes}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Specific Issues */}
                {result.data.issues && result.data.issues.length > 0 && (
                  <>
                    <h4 className="font-semibold text-gray-900 mb-3">Specific Issues</h4>
                    <p className="text-sm text-gray-900 font-bold italic mb-4 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                      </svg>
                      Click on issues to add to consolidated action items
                    </p>
                    <div className="space-y-3">
                      {result.data.issues.map((issue, i) => (
                        <div
                          key={i}
                          onClick={() => toggleResultSelection('compliance', i)}
                          className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                            result.selected?.includes(i)
                              ? 'border-gray-700 bg-gray-50'
                              : 'border-gray-200 hover:border-gray-400'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Shield className="w-4 h-4 text-gray-600" />
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              issue.severity === 'High' ? 'bg-red-100 text-red-800' :
                              issue.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {issue.severity}
                            </span>
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {issue.regulation}
                            </span>
                          </div>
                          <p className="text-sm text-gray-900 font-medium mb-2">{issue.issue}</p>
                          <p className="text-sm text-gray-600"><strong>Recommendation:</strong> {issue.recommendation}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Render analyse mode
  const renderAnalyse = () => {
    // Get results sorted by most recent first
    const sortedResults = [...analysisResults].sort((a, b) => b.timestamp - a.timestamp);
    const trustResult = sortedResults.find(r => r.type === 'trust');
    const stakeholdersResult = sortedResults.find(r => r.type === 'stakeholders');
    const afrResult = sortedResults.find(r => r.type === 'afr');
    const strengthsResult = sortedResults.find(r => r.type === 'strengths');
    const improvementsResult = sortedResults.find(r => r.type === 'improvements');
    const quoteRisksResult = sortedResults.find(r => r.type === 'quoteRisks');

    // Determine render order based on timestamps
    const renderOrder = sortedResults.map(r => r.type);

    return (
      <div className="grid grid-cols-12 gap-6">
        {/* Left: Workspace */}
        <div className={`transition-all ${showWorkspace ? 'col-span-5' : 'col-span-12'}`}>
          <div className="space-y-6">
            {/* Content Input */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Content to refine</h2>
                {isContentLoaded && (
                  <button
                    onClick={() => setShowContentInput(!showContentInput)}
                    className="text-sm text-gray-900 hover:text-gray-700 font-medium flex items-center gap-1"
                  >
                    {showContentInput ? (
                      <>
                        <EyeOff className="w-4 h-4" />
                        Hide
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4" />
                        Show
                      </>
                    )}
                  </button>
                )}
              </div>
              
              {showContentInput && (
                <>
                  {/* Config */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Communication category</label>
                      <select
                        value={analyseCategory}
                        onChange={(e) => {
                          setAnalyseCategory(e.target.value);
                          setAnalyseContentType('auto'); // Reset to auto when category changes
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-transparent text-sm"
                      >
                        <option value="">Auto-detect</option>
                        {categories.map((c, i) => <option key={i} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Content type</label>
                      <select
                        value={analyseContentType}
                        onChange={(e) => setAnalyseContentType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-transparent text-sm"
                      >
                        <option value="auto">Auto-detect</option>
                        {analyseCategory && getAnalyseContentTypes().map((t, i) => <option key={i} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Context (Optional)</label>
                      <input
                        type="text"
                        value={analyseContext}
                        onChange={(e) => setAnalyseContext(e.target.value)}
                        placeholder="e.g., 'FY25 results'"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-transparent text-sm"
                      />
                    </div>

                  {/* Style Selector for Analyse Mode */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Writing style
                      {styles.length > 0 && <span className="text-gray-400 font-normal ml-1">({styles.length} saved)</span>}
                    </label>
                    <div className="relative">
                      <select
                        value={selectedStyleId || ''}
                        onChange={(e) => {
                          if (e.target.value === 'manage') {
                            setShowStyleManager(true);
                          } else {
                            setSelectedStyleId(e.target.value || null);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-transparent text-sm appearance-none"
                      >
                        <option value="">None (default)</option>
                        {styles.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                        <option value="manage">⚙ Manage styles</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* File Upload */}
                  {uploadedFile ? (
                    <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-300 rounded-lg mb-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-900" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{uploadedFile.name}</p>
                          <p className="text-xs text-gray-900">✓ {countWords(content).toLocaleString()} words</p>
                        </div>
                      </div>
                      <button onClick={() => { setUploadedFile(null); setContent(''); setWorkspaceContent(''); setIsContentLoaded(false); }} className="text-gray-400 hover:text-red-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:border-gray-700 hover:bg-gray-50 transition-colors mb-3">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">Word documents (.docx), text files (.txt), or PDFs (.pdf)</p>
                      </div>
                      <input type="file" className="hidden" onChange={handleFileUpload} accept=".txt,.docx,.pdf" />
                    </label>
                  )}

                  {/* Text Input */}
                  {(!uploadedFile || content.length < 500) && (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-semibold text-gray-700">
                          Or paste text directly
                        </label>
                        <button
                          onClick={() => {
                            setContent(`Subject: Important Update: New Hybrid Working Arrangements

Dear Team,

Following extensive consultation with leadership and feedback from across the business, I'm writing to share important updates to our working arrangements that will take effect from the beginning of next month.

After careful consideration, we have decided to implement a structured hybrid working model that requires all team members to be in the office for a minimum of three days per week. This decision reflects our commitment to maintaining the collaborative culture that has been central to ${companyName}'s success, while still offering flexibility that supports work-life balance.

We recognise that in-person collaboration strengthens team connections, accelerates problem-solving, and supports the mentoring and development opportunities that are harder to replicate in a fully remote environment. At the same time, we understand that flexibility remains important to our people.

On a lighter note, we're also pleased to announce the introduction of Casual Fridays. Starting immediately, team members are welcome to dress casually on Fridays, whether you're in the office or joining meetings remotely. We hope this small change brings a positive end to each week.

Department heads will be in touch over the coming weeks to discuss how these arrangements will work within each team. If you have questions or concerns, please don't hesitate to reach out to your manager or the People & Culture team.

Thank you for your continued dedication to ${companyName}.

Warm regards,

The Leadership Team`);
                            setAnalyseCategory('Internal');
                            setAnalyseContentType('Company-wide update');
                          }}
                          className="text-sm text-gray-900 hover:text-gray-700 font-medium underline"
                        >
                          Use sample content
                        </button>
                      </div>
                      <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Or paste your communication here..."
                        className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-transparent resize-none font-mono text-sm mb-3"
                      />
                    </>
                  )}
                  
                  {content && !isContentLoaded && (
                    <p className={`text-xs mb-3 ${countWords(content) > MAX_CONTENT_WORDS ? 'text-red-500' : 'text-gray-500'}`}>
                      {countWords(content).toLocaleString()} / {MAX_CONTENT_WORDS.toLocaleString()} words
                      {countWords(content) > MAX_CONTENT_WORDS && ' (exceeds limit)'}
                    </p>
                  )}

                  {/* Load Content Button */}
                  {!isContentLoaded && (
                    <button
                      onClick={loadContent}
                      disabled={!content.trim() || countWords(content) > MAX_CONTENT_WORDS}
                      className="w-full bg-[#1B2541] hover:bg-[#131C33] disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 px-6 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-5 h-5" />
                      Load content
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Workspace Preview */}
            {showWorkspace && workspaceContent && (
              <div className="bg-white rounded-lg shadow-md border-2 border-gray-700 mt-6">
                <div className="p-4 border-b-2 border-gray-700 bg-gray-900">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-white">Working draft</h3>
                      {analyseVersionHistory.length > 1 && (
                        <select
                          value={analyseCurrentVersion}
                          onChange={(e) => switchAnalyseVersion(Number(e.target.value))}
                          className="text-sm border border-gray-600 rounded px-2 py-1 bg-gray-800 text-white focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                        >
                          {analyseVersionHistory.map((_, idx) => (
                            <option key={idx} value={idx}>
                              v{idx + 1}{idx === analyseVersionHistory.length - 1 ? ' (latest)' : ''}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={copyWorkspaceContent}
                        disabled={isWorkspaceCopied}
                        className={`text-sm ${
                          isWorkspaceCopied ? 'bg-gray-700' : 'bg-white hover:bg-gray-50 text-gray-900'
                        } ${isWorkspaceCopied ? 'text-white' : ''} px-3 py-1.5 rounded font-medium transition-colors flex items-center gap-1`}
                      >
                        {isWorkspaceCopied ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => openSaveModal('analyse')}
                        className="text-sm bg-white hover:bg-gray-50 text-gray-900 px-3 py-1.5 rounded font-medium transition-colors flex items-center gap-1"
                      >
                        <Download className="w-4 h-4" />
                        {editingCommId ? 'Update' : 'Save to toolkit'}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-700">
                    <span className="text-sm text-gray-400">Apply style:</span>
                    <select
                      value={selectedStyleId || ''}
                      onChange={(e) => {
                        if (e.target.value === 'manage') {
                          setShowStyleManager(true);
                        } else {
                          setSelectedStyleId(e.target.value || null);
                        }
                      }}
                      className="text-sm border border-gray-600 rounded px-2 py-1 bg-gray-800 text-white focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    >
                      <option value="">None</option>
                      {styles.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                      <option value="manage">⚙ Manage</option>
                    </select>
                    {selectedStyleId && (
                      <button
                        onClick={applyStyleToWorkspace}
                        disabled={isApplyingStyleToWorkspace}
                        className="text-sm px-3 py-1 rounded font-medium transition-colors flex items-center gap-1"
                        style={{ backgroundColor: '#3f69ae', color: 'white' }}
                      >
                        {isApplyingStyleToWorkspace ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                        Apply style
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-6 max-h-[48rem] overflow-y-auto">
                  {(isApplyingActionItems || isModifyingContent) ? (
                    <LoadingStages />
                  ) : (
                    <>
                      {workspaceContent.includes('[Insert') && (
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                          <div className="flex">
                            <AlertCircle className="h-5 w-5 text-yellow-400 mr-3" />
                            <p className="text-sm text-yellow-700">
                              <strong>Placeholders detected:</strong> Replace <strong>[Insert...]</strong> tags with actual information.
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="prose prose-sm max-w-none text-gray-900 leading-relaxed">
                        {renderMarkdown(workspaceContent)}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Consolidated action items */}
            {showWorkspace && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
                <div className="p-4 border-b border-gray-200 bg-gray-100">
                  <h3 className="font-semibold text-gray-900">Consolidated action items</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {hasSelectedItems ? `${getConsolidatedFeedback().length} items selected` : 'Click items in analyses to build action list'}
                  </p>
                </div>
                <div className={hasSelectedItems ? "p-6" : "p-3"}>
                  {hasSelectedItems ? (
                    <>
                      <div className="space-y-2 mb-4">
                        {getConsolidatedFeedback().map((item, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded border border-gray-200">
                            <span className="font-semibold text-gray-900 flex-shrink-0">{idx + 1}.</span>
                            <div className="flex-1">
                              <p className="text-xs text-gray-500 italic mb-1">{item.source}</p>
                              <p className="text-sm text-gray-900">{item.text}</p>
                              <span className={`text-xs mt-2 inline-block px-1.5 py-0.5 rounded ${item.scope === 'thematic' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}`}>
                                {item.scope === 'thematic' ? 'Applies throughout' : 'Specific fix'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={applyActionItems}
                          disabled={isApplyingActionItems}
                          className="flex-1 bg-[#1B2541] hover:bg-[#131C33] disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          {isApplyingActionItems ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Applying...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              Apply Changes
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-3 text-gray-400">
                      <p className="text-sm">No items selected</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Chatbot - Ask questions and make changes */}
            {showWorkspace && workspaceContent && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
                <div className="p-4 border-b border-gray-200 bg-gray-100">
                  <h3 className="font-semibold text-gray-900">Ask questions and make changes</h3>
                  <p className="text-sm text-gray-600 mt-1">Chat with AI to get advice or edit the content directly</p>
                </div>
                
                {chatMessages.length === 0 && (
                  <div className="p-4 border-b border-gray-200">
                    <p className="text-sm text-gray-600 mb-3">Try asking:</p>
                    {isGeneratingAnalyseSuggestions ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Generating suggestions...</span>
                      </div>
                    ) : analyseChatSuggestions.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {analyseChatSuggestions.map((prompt, idx) => (
                          <button
                            key={idx}
                            onClick={() => sendChatMessage(prompt)}
                            disabled={isChattingAnalyse}
                            className="text-xs bg-gray-100 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 text-gray-700 px-3 py-2 rounded-full border border-gray-200 transition-colors"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => sendChatMessage('What key messages are missing?')}
                          disabled={isChattingAnalyse}
                          className="text-xs bg-gray-100 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 text-gray-700 px-3 py-2 rounded-full border border-gray-200 transition-colors"
                        >
                          What key messages are missing?
                        </button>
                        <button
                          onClick={() => sendChatMessage('Make this more concise')}
                          disabled={isChattingAnalyse}
                          className="text-xs bg-gray-100 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 text-gray-700 px-3 py-2 rounded-full border border-gray-200 transition-colors"
                        >
                          Make this more concise
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {chatMessages.length > 0 && (
                  <div className="p-4 space-y-3 max-h-64 overflow-y-auto border-b border-gray-200">
                    {chatMessages.map((m, i) => (
                      <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-lg p-3 ${m.role === 'user' ? 'text-white' : 'bg-gray-100 text-gray-900'}`} style={m.role === 'user' ? {backgroundColor: '#4A4A4E'} : {}}>
                          {m.role === 'user' ? (
                            <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                          ) : m.content === 'Working draft updated.' ? (
                            <p className="text-sm">{m.content}</p>
                          ) : (
                            <div className="text-sm prose prose-sm max-w-none">
                              {renderMarkdown(m.content)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !isChattingAnalyse && sendChatMessage()}
                      placeholder="Ask questions or request changes (e.g., 'Make it more concise')..."
                      disabled={isChattingAnalyse}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-transparent disabled:bg-gray-100 text-sm"
                    />
                    <button
                      onClick={() => sendChatMessage()}
                      disabled={!chatInput.trim() || isChattingAnalyse}
                      className="bg-[#1B2541] hover:bg-[#131C33] disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      {isChattingAnalyse ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Refine & Analyse Tools & Results */}
        <div className={`transition-all ${showWorkspace ? 'col-span-7' : 'col-span-12'}`}>
          {error && (
            <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded mb-6">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Refine & Analyse Tools */}
          <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 ${!workspaceContent.trim() ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between mb-2">
              <h2 className="text-xl font-bold text-gray-900">Refine and analyse tools</h2>
              <button
                onClick={suggestBestTools}
                disabled={!workspaceContent.trim() || isSuggestingTools}
                className="bg-[#1B2541] hover:bg-[#131C33] disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                {isSuggestingTools ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Analysing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Suggest best tools
                  </>
                )}
              </button>
            </div>
            <p className="text-gray-600 mb-4 text-sm">
              {!workspaceContent.trim() 
                ? 'Load content to enable analysis tools' 
                : 'Run analyses on your content. Click any tool to begin - results appear below and can be actioned.'}
            </p>

            {/* Subtle recommendation indicator */}
            {suggestedTools && (
              <div className="flex items-center justify-between mb-4 pb-3 border-b-2" style={{ borderColor: '#3f69ae' }}>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" style={{ color: '#3f69ae' }} />
                  <span className="text-sm" style={{ color: '#3f69ae' }}>
                    <span className="font-medium">Recommended tools highlighted</span>
                    <span className="text-gray-500 ml-2">• {suggestedTools.contentType}</span>
                  </span>
                </div>
                <button 
                  onClick={() => setSuggestedTools(null)}
                  className="text-gray-400 hover:text-gray-600 text-xs"
                >
                  Clear
                </button>
              </div>
            )}

            {/* Persona Perspectives */}
            <div className="mb-5">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                <Users className="w-3.5 h-3.5" />
                Persona Perspectives
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={analyseStakeholders}
                  disabled={!workspaceContent.trim() || isAnalysingStakeholders}
                  className={`bg-white hover:bg-gray-50 disabled:bg-gray-100 border hover:border-gray-700 disabled:border-gray-200 text-left px-3 py-2.5 rounded-lg transition-all ${
                    isToolRecommended('stakeholders') ? 'border-l-4' : 'border'
                  } border-gray-200`}
                  style={isToolRecommended('stakeholders') ? { borderLeftColor: '#3f69ae' } : {}}
                >
                  <div className="flex items-start gap-2.5">
                    <Users className="w-4 h-4 text-gray-700 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 text-sm">Test against key stakeholders</h3>
                        {isToolRecommended('stakeholders') && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#3f69ae20', color: '#3f69ae' }}>Recommended</span>}
                      </div>
                      <p className="text-xs text-gray-500 italic">Predict how different groups will react</p>
                    </div>
                    {isAnalysingStakeholders && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-900 flex-shrink-0 mt-0.5" />}
                  </div>
                </button>

                <button
                  onClick={generateAFR}
                  disabled={!workspaceContent.trim() || isGeneratingAFR}
                  className={`bg-white hover:bg-gray-50 disabled:bg-gray-100 border hover:border-gray-700 disabled:border-gray-200 text-left px-3 py-2.5 rounded-lg transition-all ${
                    isToolRecommended('media article') ? 'border-l-4' : 'border'
                  } border-gray-200`}
                  style={isToolRecommended('media article') ? { borderLeftColor: '#3f69ae' } : {}}
                >
                  <div className="flex items-start gap-2.5">
                    <Newspaper className="w-4 h-4 text-gray-700 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 text-sm">Draft critical media article</h3>
                        {isToolRecommended('media article') && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#3f69ae20', color: '#3f69ae' }}>Recommended</span>}
                      </div>
                      <p className="text-xs text-gray-500 italic">Simulate a tough journalist review</p>
                    </div>
                    {isGeneratingAFR && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-900 flex-shrink-0 mt-0.5" />}
                  </div>
                </button>

                <button
                  onClick={analyseExpertPersona}
                  disabled={!workspaceContent.trim() || isAnalysingExpertPersona}
                  className={`bg-white hover:bg-gray-50 disabled:bg-gray-100 border hover:border-gray-700 disabled:border-gray-200 text-left px-3 py-2.5 rounded-lg transition-all ${
                    isToolRecommended('expert persona') ? 'border-l-4' : 'border'
                  } border-gray-200`}
                  style={isToolRecommended('expert persona') ? { borderLeftColor: '#3f69ae' } : {}}
                >
                  <div className="flex items-start gap-2.5">
                    <UserCheck className="w-4 h-4 text-gray-700 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 text-sm">Simulate expert persona feedback</h3>
                        {isToolRecommended('expert persona') && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#3f69ae20', color: '#3f69ae' }}>Recommended</span>}
                      </div>
                      <p className="text-xs text-gray-500 italic">Get feedback from the ideal expert</p>
                    </div>
                    {isAnalysingExpertPersona && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-900 flex-shrink-0 mt-0.5" />}
                  </div>
                </button>

                <button
                  onClick={generateFAQ}
                  disabled={!workspaceContent.trim() || isGeneratingFAQ}
                  className={`bg-white hover:bg-gray-50 disabled:bg-gray-100 border hover:border-gray-700 disabled:border-gray-200 text-left px-3 py-2.5 rounded-lg transition-all ${
                    isToolRecommended('FAQ') ? 'border-l-4' : 'border'
                  } border-gray-200`}
                  style={isToolRecommended('FAQ') ? { borderLeftColor: '#3f69ae' } : {}}
                >
                  <div className="flex items-start gap-2.5">
                    <MessageSquare className="w-4 h-4 text-gray-700 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 text-sm">Draft FAQ & responses</h3>
                        {isToolRecommended('FAQ') && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#3f69ae20', color: '#3f69ae' }}>Recommended</span>}
                      </div>
                      <p className="text-xs text-gray-500 italic">Anticipate likely stakeholder questions</p>
                    </div>
                    {isGeneratingFAQ && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-900 flex-shrink-0 mt-0.5" />}
                  </div>
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 my-4"></div>

            {/* Quality & Structure */}
            <div className="mb-5">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                <Award className="w-3.5 h-3.5" />
                Quality & Structure
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={analyseStrengths}
                  disabled={!workspaceContent.trim() || isAnalysingStrengths}
                  className={`bg-white hover:bg-gray-50 disabled:bg-gray-100 border hover:border-gray-700 disabled:border-gray-200 text-left px-3 py-2.5 rounded-lg transition-all ${
                    isToolRecommended('strengths') ? 'border-l-4' : 'border'
                  } border-gray-200`}
                  style={isToolRecommended('strengths') ? { borderLeftColor: '#3f69ae' } : {}}
                >
                  <div className="flex items-start gap-2.5">
                    <Award className="w-4 h-4 text-gray-700 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 text-sm">Identify communication strengths</h3>
                        {isToolRecommended('strengths') && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#3f69ae20', color: '#3f69ae' }}>Recommended</span>}
                      </div>
                      <p className="text-xs text-gray-500 italic">Discover what's working well</p>
                    </div>
                    {isAnalysingStrengths && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-900 flex-shrink-0 mt-0.5" />}
                  </div>
                </button>

                <button
                  onClick={suggestImprovements}
                  disabled={!workspaceContent.trim() || isGeneratingImprovements}
                  className={`bg-white hover:bg-gray-50 disabled:bg-gray-100 border hover:border-gray-700 disabled:border-gray-200 text-left px-3 py-2.5 rounded-lg transition-all ${
                    isToolRecommended('improvements') ? 'border-l-4' : 'border'
                  } border-gray-200`}
                  style={isToolRecommended('improvements') ? { borderLeftColor: '#3f69ae' } : {}}
                >
                  <div className="flex items-start gap-2.5">
                    <Lightbulb className="w-4 h-4 text-gray-700 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 text-sm">Analyse for improvements</h3>
                        {isToolRecommended('improvements') && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#3f69ae20', color: '#3f69ae' }}>Recommended</span>}
                      </div>
                      <p className="text-xs text-gray-500 italic">Get specific, actionable recommendations</p>
                    </div>
                    {isGeneratingImprovements && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-900 flex-shrink-0 mt-0.5" />}
                  </div>
                </button>

                <button
                  onClick={analyseStructure}
                  disabled={!workspaceContent.trim() || isAnalysingStructure}
                  className={`bg-white hover:bg-gray-50 disabled:bg-gray-100 border hover:border-gray-700 disabled:border-gray-200 text-left px-3 py-2.5 rounded-lg transition-all ${
                    isToolRecommended('structure') ? 'border-l-4' : 'border'
                  } border-gray-200`}
                  style={isToolRecommended('structure') ? { borderLeftColor: '#3f69ae' } : {}}>
                  <div className="flex items-start gap-2.5">
                    <Layout className="w-4 h-4 text-gray-700 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 text-sm">Test structure and clarity</h3>
                        {isToolRecommended('structure') && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#3f69ae20', color: '#3f69ae' }}>Recommended</span>}
                      </div>
                      <p className="text-xs text-gray-500 italic">Check narrative flow and key takeaways</p>
                    </div>
                    {isAnalysingStructure && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-900 flex-shrink-0 mt-0.5" />}
                  </div>
                </button>

                <button
                  onClick={analyseAudienceTone}
                  disabled={!workspaceContent.trim() || isAnalysingAudienceTone}
                  className={`bg-white hover:bg-gray-50 disabled:bg-gray-100 border hover:border-gray-700 disabled:border-gray-200 text-left px-3 py-2.5 rounded-lg transition-all ${
                    isToolRecommended('audience') || isToolRecommended('tone') ? 'border-l-4' : 'border'
                  } border-gray-200`}
                  style={isToolRecommended('audience') || isToolRecommended('tone') ? { borderLeftColor: '#3f69ae' } : {}}
                >
                  <div className="flex items-start gap-2.5">
                    <Target className="w-4 h-4 text-gray-700 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 text-sm">Assess audience and tone fit</h3>
                        {(isToolRecommended('audience') || isToolRecommended('tone')) && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#3f69ae20', color: '#3f69ae' }}>Recommended</span>}
                      </div>
                      <p className="text-xs text-gray-500 italic">Check tone and readability for your audience</p>
                    </div>
                    {isAnalysingAudienceTone && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-900 flex-shrink-0 mt-0.5" />}
                  </div>
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 my-4"></div>

            {/* Risk & Trust */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5" />
                Risk & Trust
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={analyseTrust}
                  disabled={!workspaceContent.trim() || isAnalysingTrust}
                  className={`bg-white hover:bg-gray-50 disabled:bg-gray-100 border hover:border-gray-700 disabled:border-gray-200 text-left px-3 py-2.5 rounded-lg transition-all ${
                    isToolRecommended('trust') ? 'border-l-4' : 'border'
                  } border-gray-200`}
                  style={isToolRecommended('trust') ? { borderLeftColor: '#3f69ae' } : {}}
                >
                  <div className="flex items-start gap-2.5">
                    <Shield className="w-4 h-4 text-gray-700 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 text-sm">Evaluate against trust framework</h3>
                        {isToolRecommended('trust') && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#3f69ae20', color: '#3f69ae' }}>Recommended</span>}
                      </div>
                      <p className="text-xs text-gray-500 italic">Score credibility, clarity, and transparency</p>
                    </div>
                    {isAnalysingTrust && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-900 flex-shrink-0 mt-0.5" />}
                  </div>
                </button>

                <button
                  onClick={analyseAssumptions}
                  disabled={!workspaceContent.trim() || isAnalysingAssumptions}
                  className={`bg-white hover:bg-gray-50 disabled:bg-gray-100 border hover:border-gray-700 disabled:border-gray-200 text-left px-3 py-2.5 rounded-lg transition-all ${
                    isToolRecommended('assumed knowledge') ? 'border-l-4' : 'border'
                  } border-gray-200`}
                  style={isToolRecommended('assumed knowledge') ? { borderLeftColor: '#3f69ae' } : {}}
                >
                  <div className="flex items-start gap-2.5">
                    <Search className="w-4 h-4 text-gray-700 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 text-sm">Surface assumed knowledge</h3>
                        {isToolRecommended('assumed knowledge') && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#3f69ae20', color: '#3f69ae' }}>Recommended</span>}
                      </div>
                      <p className="text-xs text-gray-500 italic">Find what you're assuming readers already know</p>
                    </div>
                    {isAnalysingAssumptions && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-900 flex-shrink-0 mt-0.5" />}
                  </div>
                </button>

                <button
                  onClick={analyseQuoteRisks}
                  disabled={!workspaceContent.trim() || isAnalysingQuoteRisks}
                  className={`bg-white hover:bg-gray-50 disabled:bg-gray-100 border hover:border-gray-700 disabled:border-gray-200 text-left px-3 py-2.5 rounded-lg transition-all ${
                    isToolRecommended('quote risk') ? 'border-l-4' : 'border'
                  } border-gray-200`}
                  style={isToolRecommended('quote risk') ? { borderLeftColor: '#3f69ae' } : {}}
                >
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-gray-700 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 text-sm">Identify quote risks</h3>
                        {isToolRecommended('quote risk') && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#3f69ae20', color: '#3f69ae' }}>Recommended</span>}
                      </div>
                      <p className="text-xs text-gray-500 italic">Flag statements that could be misinterpreted</p>
                    </div>
                    {isAnalysingQuoteRisks && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-900 flex-shrink-0 mt-0.5" />}
                  </div>
                </button>

                <button
                  onClick={analyseCompliance}
                  disabled={!workspaceContent.trim() || isAnalysingCompliance}
                  className={`bg-white hover:bg-gray-50 disabled:bg-gray-100 border hover:border-gray-700 disabled:border-gray-200 text-left px-3 py-2.5 rounded-lg transition-all ${
                    isToolRecommended('compliance') || isToolRecommended('regulatory') ? 'border-l-4' : 'border'
                  } border-gray-200`}
                  style={isToolRecommended('compliance') || isToolRecommended('regulatory') ? { borderLeftColor: '#3f69ae' } : {}}
                >
                  <div className="flex items-start gap-2.5">
                    <Shield className="w-4 h-4 text-gray-700 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 text-sm">Check regulatory compliance</h3>
                        {(isToolRecommended('compliance') || isToolRecommended('regulatory')) && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#3f69ae20', color: '#3f69ae' }}>Recommended</span>}
                      </div>
                      <p className="text-xs text-gray-500 italic">Review for regulatory and compliance considerations</p>
                    </div>
                    {isAnalysingCompliance && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-900 flex-shrink-0 mt-0.5" />}
                  </div>
                </button>
              </div>
            </div>
          </div>


          {/* Analysis Results */}
          <div className="space-y-6">
            {sortedResults.map(result => {
              const isLoading = 
                (result.type === 'trust' && isAnalysingTrust) ||
                (result.type === 'stakeholders' && isAnalysingStakeholders) ||
                (result.type === 'afr' && isGeneratingAFR) ||
                (result.type === 'strengths' && isAnalysingStrengths) ||
                (result.type === 'improvements' && isGeneratingImprovements) ||
                (result.type === 'quoteRisks' && isAnalysingQuoteRisks) ||
                (result.type === 'assumptions' && isAnalysingAssumptions) ||
                (result.type === 'audienceTone' && isAnalysingAudienceTone) ||
                (result.type === 'structure' && isAnalysingStructure) ||
                (result.type === 'expertPersona' && isAnalysingExpertPersona) ||
                (result.type === 'faq' && isGeneratingFAQ) ||
                (result.type === 'compliance' && isAnalysingCompliance);
              
              return renderAnalysisResult(result, isLoading);
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Storage Error Banner */}
      {storageError && (
        <div className="bg-red-100 border-b-2 border-red-300 px-6 py-4">
          <div className="container mx-auto flex items-start gap-3 text-red-800">
            <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{storageError}</p>
              <p className="text-sm mt-1 text-red-700">Company selection will not persist between sessions until the artifact is published.</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Crafti" className="w-10 h-10" />
              <h1 className="text-2xl" style={{color: '#1B2541', fontFamily: "'Nunito', sans-serif", fontWeight: 800}}>crafti</h1>
              <span className="text-lg ml-1" style={{color: '#1B2541', fontFamily: "'Nunito', sans-serif", fontWeight: 300}}>
                |
              </span>
              <span className="text-lg" style={{color: '#1B2541', fontFamily: "'Nunito', sans-serif", fontWeight: 300}}>
                AI Communications Toolkit
              </span>
            </div>

            {mode !== 'landing' && (
              <button
                onClick={reset}
                style={{ backgroundColor: '#1B2541' }}
                className="hover:opacity-90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Home
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {mode === 'landing' && renderLanding()}
        {mode === 'create' && renderCreate()}
        {mode === 'analyse' && renderAnalyse()}
      </div>

      {/* Style Manager Modal */}
      {showStyleManager && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <PenTool className="w-5 h-5 text-gray-600" />
                  Manage writing styles
                </h2>
                <p className="text-sm text-gray-500">Upload style guides or create custom writing styles</p>
              </div>
              <button
                onClick={() => {
                  setShowStyleManager(false);
                  setEditingStyle(null);
                  setNewStyleName('');
                  setNewStyleContent('');
                  setShowAddStyleForm(false);
                }}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {/* Editing/Viewing an existing style */}
              {editingStyle ? (
                <div className="space-y-4">
                  <button
                    onClick={() => setEditingStyle(null)}
                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    ← Back to list
                  </button>
                  {editingStyle.viewOnly && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded-lg">
                      <Eye className="w-4 h-4" />
                      Viewing default style (read-only)
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Style Name</label>
                    <input
                      type="text"
                      value={editingStyle.name}
                      onChange={(e) => !editingStyle.viewOnly && setEditingStyle({ ...editingStyle, name: e.target.value })}
                      readOnly={editingStyle.viewOnly}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${editingStyle.viewOnly ? 'bg-gray-50 text-gray-600' : 'focus:ring-2 focus:ring-gray-700 focus:border-transparent'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Style Content</label>
                    <textarea
                      value={editingStyle.content}
                      onChange={(e) => !editingStyle.viewOnly && setEditingStyle({ ...editingStyle, content: e.target.value })}
                      readOnly={editingStyle.viewOnly}
                      rows={10}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg resize-none font-mono text-sm ${editingStyle.viewOnly ? 'bg-gray-50 text-gray-600' : 'focus:ring-2 focus:ring-gray-700 focus:border-transparent'}`}
                    />
                    <p className="text-xs text-gray-500 mt-1">{editingStyle.content.length.toLocaleString()} characters</p>
                  </div>
                  {editingStyle.viewOnly ? (
                    <button
                      onClick={() => setEditingStyle(null)}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      Close
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStyle(editingStyle.id, editingStyle.name, editingStyle.content)}
                        disabled={!editingStyle.name.trim()}
                        className="bg-[#1B2541] hover:bg-[#131C33] disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={() => setEditingStyle(null)}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Saved Styles List */}
                  {styles.length > 0 ? (
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">Saved Styles ({styles.length})</h3>
                      <div className="space-y-2">
                        {styles.map((style) => (
                          <div
                            key={style.id}
                            className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex-1 min-w-0 mr-4">
                              <p className="font-medium text-gray-900 truncate">{style.name}</p>
                              <p className="text-xs text-gray-500">{style.content.length.toLocaleString()} characters</p>
                            </div>
                            <div className="flex items-center gap-1">
                              {style.isDefault ? (
                                <button
                                  onClick={() => setEditingStyle({ ...style, viewOnly: true })}
                                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                                  title="View style"
                                >
                                  <Eye className="w-4 h-4 text-gray-600" />
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() => setEditingStyle({ ...style })}
                                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                                    title="Edit style"
                                  >
                                    <Edit3 className="w-4 h-4 text-gray-600" />
                                  </button>
                                  <button
                                    onClick={() => deleteStyle(style.id)}
                                    className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                                    title="Delete style"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500 mb-4">
                      <p className="text-sm">No styles saved yet</p>
                      <p className="text-xs mt-1">Add a style guide to get started</p>
                    </div>
                  )}

                  {/* Add New Style - Collapsible */}
                  {!showAddStyleForm ? (
                    <button
                      onClick={() => setShowAddStyleForm(true)}
                      className="w-full border-2 border-dashed border-gray-300 hover:border-gray-400 rounded-lg p-3 text-sm font-medium text-gray-600 hover:text-gray-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add New Style
                    </button>
                  ) : (
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Plus className="w-4 h-4" />
                          Add New Style
                        </h3>
                        <button
                          onClick={() => {
                            setShowAddStyleForm(false);
                            setNewStyleName('');
                            setNewStyleContent('');
                          }}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Style Name</label>
                          <input
                            type="text"
                            value={newStyleName}
                            onChange={(e) => setNewStyleName(e.target.value)}
                            placeholder="e.g., Brand Voice Guide, Formal Tone"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-transparent text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Upload Style Guide</label>
                          <div className="flex items-center gap-3">
                            <label className="cursor-pointer bg-white hover:bg-gray-100 border border-gray-300 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 transition-colors flex items-center gap-2">
                              <Upload className="w-4 h-4" />
                              {isUploadingStyle ? 'Processing...' : 'Choose file'}
                              <input
                                type="file"
                                accept=".docx,.txt,.md"
                                onChange={handleStyleFileUpload}
                                className="hidden"
                                disabled={isUploadingStyle}
                              />
                            </label>
                            <span className="text-xs text-gray-500">.docx, .txt, .md</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Or paste content directly
                          </label>
                          <textarea
                            value={newStyleContent}
                            onChange={(e) => setNewStyleContent(e.target.value)}
                            placeholder="Paste your style guide content here..."
                            rows={6}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-transparent resize-none font-mono text-sm"
                          />
                          {newStyleContent && (
                            <p className="text-xs text-gray-500 mt-1">{newStyleContent.length.toLocaleString()} characters</p>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            if (newStyleName.trim() && newStyleContent.trim()) {
                              addStyle(newStyleName, newStyleContent);
                              setShowAddStyleForm(false);
                            }
                          }}
                          disabled={!newStyleName.trim() || !newStyleContent.trim()}
                          className="w-full bg-[#1B2541] hover:bg-[#131C33] disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                        >
                          <Plus className="w-4 h-4" />
                          Add Style
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <p className="text-xs text-gray-500 flex items-center gap-1.5">
                <span>💾</span>
                Styles sync across your devices
              </p>
              <button
                onClick={hardReset}
                onMouseLeave={() => setConfirmReset(false)}
                className={`text-xs transition-colors ${confirmReset ? 'text-red-600 font-medium' : 'text-red-500 hover:text-red-700 hover:underline'}`}
              >
                {confirmReset ? 'Click again to confirm' : 'Reset all data'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Communication Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Download className="w-5 h-5 text-gray-600" />
                {editingCommId ? 'Update communication' : 'Save to toolkit'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {editingCommId ? 'Update this saved communication' : 'Keep this draft for later'}
              </p>
            </div>
            <div className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
              <div className="relative">
                <input
                  type="text"
                  value={saveModalName}
                  onChange={(e) => setSaveModalName(e.target.value)}
                  placeholder="Enter a name for this communication"
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-transparent text-sm ${isGeneratingSuggestedName ? 'pr-10' : ''}`}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && saveModalName.trim() && !isGeneratingSuggestedName) {
                      saveComm();
                    }
                  }}
                />
                {isGeneratingSuggestedName && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  </div>
                )}
              </div>
              {isGeneratingSuggestedName && (
                <p className="text-xs text-gray-400 mt-1">Generating suggested name...</p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                🔒 Private — synced across your devices
              </p>
            </div>
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  setSaveModalName('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveComm}
                disabled={!saveModalName.trim() || isGeneratingSuggestedName}
                className="px-4 py-2 text-sm font-medium text-white bg-[#1B2541] hover:bg-[#131C33] disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {editingCommId ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}