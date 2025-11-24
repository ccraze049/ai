/**
 * Learning Manager System
 * Handles teaching mode, user feedback, and knowledge improvement
 */

import { detectLanguage } from './languageDetector';
import { convert } from './converter';
import { addKnowledge, updateKnowledge, findSimilarQuestions } from './knowledgeBase';
import type { KnowledgeEntry } from '@shared/schema';

export type LearningIntent = 
  | 'teach_new'
  | 'improve_existing'
  | 'ask_question'
  | 'confirm_learning'
  | 'none';

export interface LearningContext {
  intent: LearningIntent;
  confidence: number;
  awaitingInput?: {
    type: 'question' | 'answer' | 'confirmation';
    relatedEntryId?: string;
  };
}

// Keywords that indicate learning mode
const LEARNING_KEYWORDS = {
  teach: ['teach', 'sikhao', 'sikha', 'seekh', 'learn', 'add', 'store', 'save', 'yaad karo', 'yaad kar', 'remember'],
  improve: ['improve', 'better', 'sudhar', 'sudharo', 'badal', 'change', 'update', 'edit'],
  confirm: ['yes', 'haan', 'ha', 'ok', 'okay', 'theek', 'correct', 'right', 'sahi'],
  deny: ['no', 'nahi', 'na', 'wrong', 'galat', 'cancel', 'cancel karo'],
};

/**
 * Detect if user wants to teach something new
 */
export function detectLearningIntent(userMessage: string): LearningContext {
  const lowerMessage = userMessage.toLowerCase();
  
  // Check for teaching keywords
  const wantsToTeach = LEARNING_KEYWORDS.teach.some(keyword => 
    lowerMessage.includes(keyword)
  );

  // Check for improvement keywords
  const wantsToImprove = LEARNING_KEYWORDS.improve.some(keyword => 
    lowerMessage.includes(keyword)
  );

  // Check for confirmation
  const isConfirming = LEARNING_KEYWORDS.confirm.some(keyword => 
    lowerMessage === keyword || lowerMessage.startsWith(keyword + ' ')
  );

  // Determine intent
  if (wantsToTeach) {
    return {
      intent: 'teach_new',
      confidence: 0.8,
    };
  }

  if (wantsToImprove) {
    return {
      intent: 'improve_existing',
      confidence: 0.7,
    };
  }

  if (isConfirming) {
    return {
      intent: 'confirm_learning',
      confidence: 0.9,
    };
  }

  return {
    intent: 'none',
    confidence: 0,
  };
}

/**
 * Generate teaching prompt based on user's language
 */
export function getTeachingPrompt(userQuery: string): string {
  const detection = detectLanguage(userQuery);
  
  const prompts = {
    english: "I'd love to learn! Please tell me what you want to teach me. You can say:\n\"Question: [your question]\nAnswer: [the answer]\"",
    hindi: "Main seekhna chahta hoon! Mujhe batao kya sikhana hai. Tum keh sakte ho:\n\"Sawal: [tumhara sawal]\nJawab: [jawab]\"",
    hinglish: "Main seekhna chahta hoon! Batao kya sikhana hai. Tum aise keh sakte ho:\n\"Question: [tumhara question]\nAnswer: [answer]\"",
    mixed: "Main seekhna chahta hoon! Batao kya sikhana hai. Tum aise keh sakte ho:\n\"Question: [tumhara question]\nAnswer: [answer]\"",
  };

  return prompts[detection.language];
}

/**
 * Parse teaching input (extract question and answer)
 */
export function parseTeachingInput(input: string): { question: string; answer: string } | null {
  // Try different formats
  const patterns = [
    // Format: "Question: ... Answer: ..."
    /(?:question|sawal|q):\s*(.+?)(?:answer|jawab|a):\s*(.+)/i,
    // Format: "Q: ... A: ..."
    /q:\s*(.+?)a:\s*(.+)/i,
    // Format with line breaks
    /(?:question|sawal):\s*(.+)\n(?:answer|jawab):\s*(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match && match[1] && match[2]) {
      return {
        question: match[1].trim(),
        answer: match[2].trim(),
      };
    }
  }

  return null;
}

/**
 * Learn new knowledge from user
 */
export async function learnNew(question: string, answer: string): Promise<{
  success: boolean;
  entry?: KnowledgeEntry;
  message: string;
  hasSimilar?: boolean;
  similar?: any[];
}> {
  // Check for similar existing questions
  const similar = await findSimilarQuestions(question);

  if (similar.length > 0 && similar[0].relevance === 'high') {
    return {
      success: false,
      message: "I already know something similar to this. Would you like to improve that answer instead?",
      hasSimilar: true,
      similar: similar.map(s => ({
        id: s.entry.id,
        question: s.entry.question,
        answer: s.entry.answer,
      })),
    };
  }

  // Add new knowledge
  const entry = await addKnowledge(question, answer);

  return {
    success: true,
    entry,
    message: "Thank you for teaching me! I've learned something new.",
    hasSimilar: false,
  };
}

/**
 * Improve existing knowledge
 */
export async function improveKnowledge(entryId: string, newAnswer: string): Promise<{
  success: boolean;
  entry?: KnowledgeEntry;
  message: string;
}> {
  try {
    const entry = await updateKnowledge(entryId, newAnswer);

    return {
      success: true,
      entry,
      message: "Thank you! I've updated my knowledge with the better answer.",
    };
  } catch (error) {
    return {
      success: false,
      message: "Sorry, I couldn't update that knowledge entry.",
    };
  }
}

/**
 * Generate learning confirmation message
 */
export function getLearningConfirmation(
  userQuery: string,
  question: string,
  answer: string
): string {
  const detection = detectLanguage(userQuery);
  
  const templates = {
    english: `Got it! Let me confirm:\n\nQuestion: "${question}"\nAnswer: "${answer}"\n\nIs this correct?`,
    hindi: `Samjha! Confirm karo:\n\nSawal: "${question}"\nJawab: "${answer}"\n\nKya yeh sahi hai?`,
    hinglish: `Samjha! Confirm karo:\n\nQuestion: "${question}"\nAnswer: "${answer}"\n\nKya yeh correct hai?`,
    mixed: `Samjha! Confirm karo:\n\nQuestion: "${question}"\nAnswer: "${answer}"\n\nKya yeh correct hai?`,
  };

  return templates[detection.language];
}

/**
 * Generate "I don't know" message with teaching prompt
 */
export function getNoKnowledgeResponse(userQuery: string): string {
  const detection = detectLanguage(userQuery);
  
  const responses = {
    english: "I don't know the answer to that yet. Would you like to teach me?",
    hindi: "Mujhe iska jawab nahi pata. Kya tum mujhe sikhana chaho?",
    hinglish: "Mujhe iska answer nahi pata. Kya tum mujhe sikhana chaho?",
    mixed: "Mujhe iska answer nahi pata. Kya tum mujhe sikhana chaho?",
  };

  return responses[detection.language];
}

/**
 * Generate learning success message
 */
export function getLearningSuccessMessage(userQuery: string): string {
  const detection = detectLanguage(userQuery);
  
  const messages = {
    english: "Thanks for teaching me! I've stored this knowledge and will remember it.",
    hindi: "Sikhane ke liye shukriya! Maine yeh yaad kar liya hai.",
    hinglish: "Sikhane ke liye thanks! Maine yeh yaad kar liya hai.",
    mixed: "Sikhane ke liye thanks! Maine yeh yaad kar liya hai.",
  };

  return messages[detection.language];
}

/**
 * Generate improvement success message
 */
export function getImprovementSuccessMessage(userQuery: string): string {
  const detection = detectLanguage(userQuery);
  
  const messages = {
    english: "Thank you! I've updated my answer with this better information.",
    hindi: "Shukriya! Maine apna jawab update kar liya hai.",
    hinglish: "Thanks! Maine apna answer update kar liya hai.",
    mixed: "Thanks! Maine apna answer update kar liya hai.",
  };

  return messages[detection.language];
}
