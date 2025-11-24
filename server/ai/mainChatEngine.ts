/**
 * Main Chat Engine
 * Orchestrates all AI modules to process user queries and generate responses
 */

import { detectLanguage, isHinglish, type LanguageDetectionResult } from './languageDetector';
import { autoConvert, convert } from './converter';
import { searchKnowledge, getBestMatch } from './knowledgeBase';
import {
  detectLearningIntent,
  getTeachingPrompt,
  parseTeachingInput,
  learnNew,
  improveKnowledge,
  getNoKnowledgeResponse,
  getLearningConfirmation,
  getLearningSuccessMessage,
  type LearningContext,
} from './learningManager';
import type { QueryResponse } from '@shared/schema';

export interface ChatContext {
  conversationHistory?: ConversationMessage[];
  awaitingLearningInput?: {
    type: 'question_answer' | 'confirmation';
    data?: any;
  };
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  language?: string;
}

export interface ChatEngineOptions {
  enableLearning?: boolean;
  maxHistoryLength?: number;
  casualTone?: boolean;
}

const DEFAULT_OPTIONS: ChatEngineOptions = {
  enableLearning: true,
  maxHistoryLength: 10,
  casualTone: true,
};

/**
 * Main function to process user query and generate response
 */
export async function processQuery(
  userQuery: string,
  context: ChatContext = {},
  options: ChatEngineOptions = {}
): Promise<QueryResponse & { context?: ChatContext; languageDetection?: LanguageDetectionResult }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Detect user's language
  const languageDetection = detectLanguage(userQuery);

  // Check if user wants to teach something
  if (opts.enableLearning) {
    const learningIntent = detectLearningIntent(userQuery);

    // Handle learning mode
    if (learningIntent.intent === 'teach_new') {
      // Try to parse teaching input
      const parsed = parseTeachingInput(userQuery);

      if (parsed) {
        // User provided question and answer
        const result = await learnNew(parsed.question, parsed.answer);

        if (result.success) {
          return {
            answer: autoConvert(getLearningSuccessMessage(userQuery), userQuery),
            confidence: 'high',
            languageDetection,
          };
        } else if (result.hasSimilar) {
          return {
            answer: autoConvert(
              `I already know something similar:\n\n"${result.similar?.[0]?.question}"\nAnswer: "${result.similar?.[0]?.answer}"\n\nWould you like to improve this answer instead?`,
              userQuery
            ),
            confidence: 'low',
            entryId: result.similar?.[0]?.id,
            context: {
              awaitingLearningInput: {
                type: 'confirmation',
                data: { entryId: result.similar?.[0]?.id },
              },
            },
            languageDetection,
          };
        }
      } else {
        // User wants to teach but didn't provide format
        return {
          answer: getTeachingPrompt(userQuery),
          confidence: 'none',
          context: {
            awaitingLearningInput: {
              type: 'question_answer',
            },
          },
          languageDetection,
        };
      }
    }

    // Handle awaiting learning input
    if (context.awaitingLearningInput) {
      if (context.awaitingLearningInput.type === 'question_answer') {
        const parsed = parseTeachingInput(userQuery);

        if (parsed) {
          const result = await learnNew(parsed.question, parsed.answer);

          if (result.success) {
            return {
              answer: autoConvert(getLearningSuccessMessage(userQuery), userQuery),
              confidence: 'high',
              languageDetection,
            };
          }
        } else {
          return {
            answer: autoConvert(
              "I need both a question and answer. Please use this format:\nQuestion: [your question]\nAnswer: [the answer]",
              userQuery
            ),
            confidence: 'none',
            context: {
              awaitingLearningInput: {
                type: 'question_answer',
              },
            },
            languageDetection,
          };
        }
      }

      if (context.awaitingLearningInput.type === 'confirmation') {
        const isConfirming = ['yes', 'haan', 'ha', 'ok', 'okay', 'theek', 'correct', 'right', 'sahi'].some(
          keyword => userQuery.toLowerCase().includes(keyword)
        );

        if (isConfirming && context.awaitingLearningInput.data?.entryId) {
          // User wants to improve existing entry - ask for new answer
          return {
            answer: autoConvert("Great! What's the improved answer?", userQuery),
            confidence: 'none',
            context: {
              awaitingLearningInput: {
                type: 'confirmation',
                data: {
                  ...context.awaitingLearningInput.data,
                  waitingForAnswer: true,
                },
              },
            },
            languageDetection,
          };
        } else if (context.awaitingLearningInput.data?.waitingForAnswer) {
          // User provided improved answer
          const result = await improveKnowledge(
            context.awaitingLearningInput.data.entryId,
            userQuery
          );

          if (result.success) {
            return {
              answer: autoConvert(getLearningSuccessMessage(userQuery), userQuery),
              confidence: 'high',
              languageDetection,
            };
          }
        }
      }
    }
  }

  // Normal query processing - search knowledge base
  const bestMatch = await getBestMatch(userQuery);

  if (!bestMatch || bestMatch.relevance === 'low') {
    // No good answer found
    return {
      answer: getNoKnowledgeResponse(userQuery),
      confidence: 'none',
      languageDetection,
    };
  }

  // Found a good answer - convert to user's language
  const englishAnswer = bestMatch.entry.answer;
  const convertedAnswer = autoConvert(englishAnswer, userQuery, {
    casualTone: opts.casualTone,
  });

  // Determine confidence based on search relevance
  const confidence = bestMatch.relevance === 'high' ? 'high' : 'low';

  return {
    answer: convertedAnswer,
    confidence,
    entryId: bestMatch.entry.id,
    languageDetection,
  };
}

/**
 * Process query with conversation history
 */
export async function processWithHistory(
  userQuery: string,
  conversationHistory: ConversationMessage[] = [],
  options: ChatEngineOptions = {}
): Promise<QueryResponse & { context?: ChatContext; languageDetection?: LanguageDetectionResult }> {
  // Add user message to history
  const updatedHistory: ConversationMessage[] = [
    ...conversationHistory.slice(-(options.maxHistoryLength || 10)),
    {
      role: 'user',
      content: userQuery,
      timestamp: Date.now(),
      language: detectLanguage(userQuery).language,
    },
  ];

  // Process query
  const response = await processQuery(userQuery, { conversationHistory: updatedHistory }, options);

  // Add assistant response to history
  updatedHistory.push({
    role: 'assistant',
    content: response.answer,
    timestamp: Date.now(),
  });

  return {
    ...response,
    context: {
      ...response.context,
      conversationHistory: updatedHistory,
    },
  };
}

/**
 * Quick helper to check if BrainBox has knowledge about a topic
 */
export async function hasKnowledgeAbout(topic: string): Promise<boolean> {
  const match = await getBestMatch(topic);
  return match !== null && match.relevance !== 'low';
}

/**
 * Get suggested questions based on current knowledge
 */
export async function getSuggestedQuestions(
  userLanguage: string = 'english'
): Promise<string[]> {
  // This could be enhanced to suggest questions based on available knowledge
  // For now, return some generic suggestions
  
  const suggestions = {
    english: [
      "What is BrainBox Agent?",
      "How does learning work?",
    ],
    hinglish: [
      "BrainBox Agent kya hai?",
      "Learning kaise kaam karta hai?",
    ],
  };

  return isHinglish(userLanguage) ? suggestions.hinglish : suggestions.english;
}
