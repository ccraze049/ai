/**
 * Language Detection System
 * Detects whether user input is in English, Hindi, Hinglish, or mixed
 * Uses character frequency analysis and vocabulary matching
 */

export type DetectedLanguage = 'english' | 'hindi' | 'hinglish' | 'mixed';

export interface LanguageDetectionResult {
  language: DetectedLanguage;
  confidence: number;
  isDevanagari: boolean;
  hasEnglishWords: boolean;
  hasHindiWords: boolean;
}

// Common Hindi/Hinglish words and phrases (Romanized)
const HINDI_VOCABULARY = new Set([
  // Question words
  'kya', 'kaise', 'kyu', 'kyun', 'kaun', 'kab', 'kahan', 'kidhar', 'kis', 'kaisa', 'kitna',
  // Common verbs
  'hai', 'ho', 'hoon', 'hain', 'tha', 'thi', 'the', 'kar', 'karo', 'kare', 'kiya', 'karna',
  'hai', 'hoga', 'ho', 'hun', 'hoon', 'hain', 'sakte', 'sakti', 'sakta', 'chahiye',
  'batao', 'bata', 'bolo', 'bol', 'sunao', 'suno', 'dekho', 'dekh', 'samjho', 'samajh',
  // Pronouns
  'main', 'mai', 'mein', 'tum', 'tu', 'aap', 'woh', 'wo', 'yeh', 'ye', 'inka', 'unka',
  'mera', 'tera', 'apna', 'tumhara', 'hamara', 'aapka', 'uska', 'iska',
  // Common words
  'haan', 'ha', 'nahi', 'nahin', 'na', 'ji', 'acha', 'achha', 'thik', 'theek', 'ok',
  'kuch', 'koi', 'sab', 'sabhi', 'bhi', 'hi', 'to', 'toh', 'ya', 'aur', 'par', 'lekin',
  'abhi', 'ab', 'phir', 'fir', 'jab', 'tab', 'agar', 'toh', 'matlab', 'kyunki', 'kyuki',
  // Actions
  'seekh', 'sikhao', 'sikha', 'yaad', 'samjhao', 'samajh', 'pata', 'malum', 'jaan',
  'jaanta', 'janti', 'jante', 'puchho', 'poochho', 'batana', 'batao', 'dikhao', 'dikha',
  // Negative/affirmative
  'nahi', 'nahin', 'bilkul', 'zaroor', 'definitely', 'obviously',
  // Common nouns
  'cheez', 'baat', 'kaam', 'jagah', 'log', 'loga', 'logun', 'din', 'pal', 'waqt', 'samay',
]);

// Common English function words
const ENGLISH_FUNCTION_WORDS = new Set([
  'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'should', 'could', 'can', 'may', 'might', 'must',
  'a', 'an', 'this', 'that', 'these', 'those',
  'what', 'which', 'who', 'whom', 'whose', 'where', 'when', 'why', 'how',
  'i', 'you', 'he', 'she', 'it', 'we', 'they',
  'my', 'your', 'his', 'her', 'its', 'our', 'their',
  'and', 'or', 'but', 'if', 'because', 'as', 'while', 'of', 'at', 'by', 'for', 'with',
  'from', 'to', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'then',
  'not', 'no', 'yes',
]);

// Common Hinglish transition words (used in code-switching)
const HINGLISH_MARKERS = new Set([
  'matlab', 'basically', 'actually', 'obviously', 'toh', 'bas', 'ok', 'okay',
  'obviously', 'seriously', 'yaar', 'na', 'bro', 'dude',
]);

/**
 * Detect if text contains Devanagari characters
 */
function hasDevanagariScript(text: string): boolean {
  // Devanagari Unicode range: U+0900 to U+097F
  const devanagariRegex = /[\u0900-\u097F]/;
  return devanagariRegex.test(text);
}

/**
 * Count words matching a vocabulary set
 */
function countVocabularyMatches(words: string[], vocabulary: Set<string>): number {
  return words.filter(word => vocabulary.has(word.toLowerCase())).length;
}

/**
 * Tokenize text into words
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0);
}

/**
 * Main language detection function
 */
export function detectLanguage(text: string): LanguageDetectionResult {
  if (!text || text.trim().length === 0) {
    return {
      language: 'english',
      confidence: 0,
      isDevanagari: false,
      hasEnglishWords: false,
      hasHindiWords: false,
    };
  }

  const isDevanagari = hasDevanagariScript(text);
  
  // If text is in Devanagari script, it's pure Hindi
  if (isDevanagari) {
    return {
      language: 'hindi',
      confidence: 1.0,
      isDevanagari: true,
      hasEnglishWords: false,
      hasHindiWords: true,
    };
  }

  // Tokenize for romanized text analysis
  const words = tokenize(text);
  const totalWords = words.length;

  if (totalWords === 0) {
    return {
      language: 'english',
      confidence: 0,
      isDevanagari: false,
      hasEnglishWords: false,
      hasHindiWords: false,
    };
  }

  // Count vocabulary matches
  const hindiWordCount = countVocabularyMatches(words, HINDI_VOCABULARY);
  const englishWordCount = countVocabularyMatches(words, ENGLISH_FUNCTION_WORDS);
  const hinglishMarkerCount = countVocabularyMatches(words, HINGLISH_MARKERS);

  const hasHindiWords = hindiWordCount > 0;
  const hasEnglishWords = englishWordCount > 0;

  // Calculate percentages
  const hindiPercentage = hindiWordCount / totalWords;
  const englishPercentage = englishWordCount / totalWords;

  // Determine language based on word distribution
  let language: DetectedLanguage;
  let confidence: number;

  if (hasHindiWords && hasEnglishWords) {
    // Mixed Hindi and English = Hinglish
    language = 'hinglish';
    confidence = Math.min(0.7 + (hinglishMarkerCount * 0.1), 1.0);
  } else if (hasHindiWords && !hasEnglishWords) {
    // Only Hindi words detected (Romanized Hindi)
    language = 'hindi';
    confidence = Math.min(0.6 + (hindiPercentage * 0.4), 1.0);
  } else if (hindiPercentage > 0.3) {
    // Significant Hindi presence = Hinglish
    language = 'hinglish';
    confidence = hindiPercentage;
  } else if (hindiPercentage > 0 && hindiPercentage <= 0.3) {
    // Some Hindi words but mostly English = Mixed
    language = 'mixed';
    confidence = 0.5 + (hindiPercentage * 0.5);
  } else {
    // Pure English
    language = 'english';
    confidence = Math.min(0.7 + (englishPercentage * 0.3), 1.0);
  }

  return {
    language,
    confidence,
    isDevanagari,
    hasEnglishWords,
    hasHindiWords,
  };
}

/**
 * Quick check if text is Hinglish (for simple use cases)
 */
export function isHinglish(text: string): boolean {
  const result = detectLanguage(text);
  return result.language === 'hinglish' || result.language === 'hindi' || result.language === 'mixed';
}

/**
 * Get simple language label
 */
export function getLanguageLabel(text: string): string {
  const result = detectLanguage(text);
  
  const labels: Record<DetectedLanguage, string> = {
    english: 'English',
    hindi: 'Hindi',
    hinglish: 'Hinglish',
    mixed: 'Mixed',
  };

  return labels[result.language];
}
