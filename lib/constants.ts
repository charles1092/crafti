export const MAX_CONTENT_WORDS = 2500;

export const DEFAULT_CRAFTI_STYLE = {
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

export const categories = [
  "Internal",
  "Corporate & regulatory",
  "Marketing",
  "Customer",
  "Thought leadership",
  "Personal"
];

export const contentTypesByCategory: Record<string, string[]> = {
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

export const audiences = [
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

export const focuses = [
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

export const tones = [
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

export const suggestedPrompts = [
  "What key risks should we address?",
  "How can we make this more transparent?",
  "What information is missing?",
  "How would this be received?",
  "Is the tone appropriate for the audience?"
];
