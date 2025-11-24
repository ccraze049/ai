/**
 * Language Converter System
 * Converts English text to Hindi/Hinglish using dictionary-based approach
 * No external APIs - completely offline
 */

import dictionary from './hindiDictionary.json';
import { detectLanguage, type DetectedLanguage } from './languageDetector';

export type ConversionMode = 'hinglish' | 'hindi' | 'english' | 'auto';

export interface ConversionOptions {
  mode?: ConversionMode;
  preserveTechnicalTerms?: boolean;
  casualTone?: boolean;
}

/**
 * Convert English text to Hinglish (natural mix of Hindi and English)
 */
export function convertToHinglish(englishText: string, options: ConversionOptions = {}): string {
  if (!englishText || englishText.trim().length === 0) {
    return englishText;
  }

  const { preserveTechnicalTerms = true, casualTone = true } = options;

  let result = englishText;

  // First, handle common multi-word phrases (longer matches first)
  const phrases = Object.entries(dictionary.commonPhrases);
  phrases.sort((a, b) => b[0].length - a[0].length);

  for (const [english, hindi] of phrases) {
    const regex = new RegExp(`\\b${english}\\b`, 'gi');
    result = result.replace(regex, hindi);
  }

  // Then handle individual words
  const words = Object.entries(dictionary.englishToHindi);
  words.sort((a, b) => b[0].length - a[0].length);

  for (const [english, hindi] of words) {
    // Skip very common technical terms if preserveTechnicalTerms is true
    if (preserveTechnicalTerms) {
      const technicalTerms = ['computer', 'phone', 'internet', 'email', 'app', 
                               'website', 'software', 'system', 'program', 'data',
                               'api', 'database', 'server', 'network', 'online'];
      if (technicalTerms.some(term => english.toLowerCase().includes(term))) {
        continue;
      }
    }

    // Use word boundaries to avoid partial matches
    const regex = new RegExp(`\\b${english}\\b`, 'gi');
    result = result.replace(regex, hindi);
  }

  // Clean up extra spaces
  result = result.replace(/\s+/g, ' ').trim();

  // Add casual markers if casualTone is enabled
  if (casualTone) {
    result = makeCasual(result);
  }

  return result;
}

/**
 * Convert English to pure Romanized Hindi
 */
export function convertToHindi(englishText: string): string {
  if (!englishText || englishText.trim().length === 0) {
    return englishText;
  }

  let result = englishText;

  // Replace all English words with Hindi equivalents
  // Start with phrases
  const phrases = Object.entries(dictionary.commonPhrases);
  phrases.sort((a, b) => b[0].length - a[0].length);

  for (const [english, hindi] of phrases) {
    const regex = new RegExp(`\\b${english}\\b`, 'gi');
    result = result.replace(regex, hindi);
  }

  // Then individual words
  const words = Object.entries(dictionary.englishToHindi);
  words.sort((a, b) => b[0].length - a[0].length);

  for (const [english, hindi] of words) {
    const regex = new RegExp(`\\b${english}\\b`, 'gi');
    result = result.replace(regex, hindi);
  }

  // Clean up
  result = result.replace(/\s+/g, ' ').trim();

  return result;
}

/**
 * Convert Hindi/Hinglish back to English
 */
export function convertToEnglish(hindiText: string): string {
  if (!hindiText || hindiText.trim().length === 0) {
    return hindiText;
  }

  let result = hindiText;

  // Reverse conversion - Hindi to English
  const words = Object.entries(dictionary.hindiToEnglish);
  words.sort((a, b) => b[0].length - a[0].length);

  for (const [hindi, english] of words) {
    const regex = new RegExp(`\\b${hindi}\\b`, 'gi');
    result = result.replace(regex, english);
  }

  // Clean up
  result = result.replace(/\s+/g, ' ').trim();

  return result;
}

/**
 * Auto-convert based on detected input language
 * If user writes in Hindi/Hinglish, respond in same style
 * If user writes in English, keep English
 */
export function autoConvert(
  englishAnswer: string,
  userQuery: string,
  options: ConversionOptions = {}
): string {
  // Detect user's language
  const detection = detectLanguage(userQuery);

  // If user spoke in English, reply in English
  if (detection.language === 'english') {
    return englishAnswer;
  }

  // If user spoke in pure Hindi, reply in Hindi
  if (detection.language === 'hindi' && detection.isDevanagari) {
    // For Devanagari input, we can't convert to Devanagari output
    // So we'll use Romanized Hindi
    return convertToHindi(englishAnswer);
  }

  // If user spoke in Hindi (Romanized) or Hinglish, reply in Hinglish
  if (detection.language === 'hindi' || detection.language === 'hinglish' || detection.language === 'mixed') {
    return convertToHinglish(englishAnswer, options);
  }

  // Default: return English
  return englishAnswer;
}

/**
 * Make text more casual and conversational (for Hinglish)
 */
function makeCasual(text: string): string {
  let casual = text;

  // Add casual particles at appropriate places
  // These make the text feel more natural in Hinglish

  // Replace formal punctuation with casual markers
  casual = casual.replace(/\. /g, '. ');
  
  // Add "na" at the end of questions for casual tone
  casual = casual.replace(/kya hai\?/gi, 'kya hai na?');
  casual = casual.replace(/kaise/gi, 'kaise');
  
  return casual;
}

/**
 * Main conversion function with all options
 */
export function convert(
  englishText: string,
  targetLanguage: ConversionMode,
  userQuery?: string,
  options: ConversionOptions = {}
): string {
  if (!englishText || englishText.trim().length === 0) {
    return englishText;
  }

  switch (targetLanguage) {
    case 'english':
      return englishText;
    
    case 'hindi':
      return convertToHindi(englishText);
    
    case 'hinglish':
      return convertToHinglish(englishText, options);
    
    case 'auto':
      if (userQuery) {
        return autoConvert(englishText, userQuery, options);
      }
      return englishText;
    
    default:
      return englishText;
  }
}

/**
 * Normalize input to English (for storage)
 * Converts Hindi/Hinglish input to English for consistent database storage
 */
export function normalizeToEnglish(text: string): string {
  const detection = detectLanguage(text);
  
  // If already English, return as-is
  if (detection.language === 'english') {
    return text;
  }

  // Convert Hindi/Hinglish to English
  return convertToEnglish(text);
}
