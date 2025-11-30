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
import { processLogicQuery, formatLogicResult, storeDataset, hasDataset, isPreviousMessageQuery, countWords, isMultiplicationTableQuery, generateMultiplicationTable } from './textAnalyzer';
import type { QueryResponse } from '@shared/schema';

export interface ChatContext {
  conversationHistory?: ConversationMessage[];
  awaitingLearningInput?: {
    type: 'question_answer' | 'confirmation';
    data?: any;
  };
  sessionId?: string;
  datasetText?: string;
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

const GREETING_PATTERNS = [
  /^hi+$/i,
  /^hello+$/i,
  /^hey+$/i,
  /^hii+$/i,
  /^hola$/i,
  /^namaste$/i,
  /^namaskar$/i,
  /^good\s+(morning|afternoon|evening|night)$/i,
  /^(kya|kaise)\s+(ho|haal|hai)$/i,
  /^(sup|wassup|whatsup)$/i,
];

const GREETING_RESPONSES = {
  english: [
    "Hello! I'm BrainBox Agent. Ask me anything, and if I don't know, you can teach me!",
    "Hi there! How can I help you today? Feel free to ask questions or teach me new things.",
    "Hey! I'm ready to help. What would you like to know?",
  ],
  hinglish: [
    "Namaste! Main BrainBox Agent hoon. Kuch bhi pucho, aur agar main nahi jaanta toh mujhe sikha do!",
    "Hello! Aaj main aapki kaise help kar sakta hoon?",
    "Hi! Main ready hoon. Kya jaanna chahte ho?",
  ],
};

function isGreeting(query: string): boolean {
  const normalized = query.trim().toLowerCase();
  return GREETING_PATTERNS.some(p => p.test(normalized));
}

function getGreetingResponse(language: string): string {
  const responses = language === 'hinglish' || language === 'hindi' 
    ? GREETING_RESPONSES.hinglish 
    : GREETING_RESPONSES.english;
  return responses[Math.floor(Math.random() * responses.length)];
}

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

  // Generate session ID for dataset storage
  const sessionId = context.sessionId || `session_${Date.now()}`;

  // Handle greetings FIRST
  if (isGreeting(userQuery)) {
    return {
      answer: getGreetingResponse(languageDetection.language),
      confidence: 'high',
      context: { ...context, sessionId },
      languageDetection,
    };
  }

  // Check if user is asking for multiplication table
  const multiplicationQuery = isMultiplicationTableQuery(userQuery);
  if (multiplicationQuery.isMatch && multiplicationQuery.number !== null) {
    const table = generateMultiplicationTable(multiplicationQuery.number);
    const header = languageDetection.language === 'english'
      ? `Here's the multiplication table of ${multiplicationQuery.number}:`
      : `${multiplicationQuery.number} ka table:`;
    
    return {
      answer: `${header}\n\n${table}`,
      confidence: 'high',
      context: { ...context, sessionId },
      languageDetection,
    };
  }

  // Check if user is asking about previous message word count
  if (isPreviousMessageQuery(userQuery)) {
    const history = context.conversationHistory || [];
    // Find user messages from history
    const userMessages = history.filter(msg => msg.role === 'user');
    
    // The last user message in history is the current query itself,
    // so we need the second-to-last one (index -2) for the "previous" message
    if (userMessages.length >= 2) {
      const previousUserMessage = userMessages[userMessages.length - 2];
      const wordCount = countWords(previousUserMessage.content);
      
      const response = languageDetection.language === 'english' 
        ? `Your previous message had ${wordCount} word${wordCount !== 1 ? 's' : ''}.`
        : `Aapke pichle message mein ${wordCount} word${wordCount !== 1 ? 's' : ''} the.`;
      
      return {
        answer: response,
        confidence: 'high',
        context: { ...context, sessionId },
        languageDetection,
      };
    } else {
      const response = languageDetection.language === 'english'
        ? "I don't see any previous message to count. Please send some text first."
        : "Mujhe koi pichla message nahi dikh raha. Pehle kuch text bhejiye.";
      
      return {
        answer: response,
        confidence: 'low',
        context: { ...context, sessionId },
        languageDetection,
      };
    }
  }

  // Check for logic/text analysis queries
  const logicResult = processLogicQuery(userQuery, sessionId, context.datasetText);
  
  if (logicResult.isLogicQuery) {
    if (logicResult.error) {
      return {
        answer: logicResult.error,
        confidence: 'low',
        context: { ...context, sessionId },
        languageDetection,
      };
    }
    
    if (logicResult.result) {
      const formattedResult = formatLogicResult(logicResult.result);
      return {
        answer: formattedResult,
        confidence: 'high',
        context: { ...context, sessionId },
        languageDetection,
      };
    }
  }

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

  if (!bestMatch) {
    // No answer found
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
