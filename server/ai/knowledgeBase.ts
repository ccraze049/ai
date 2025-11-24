/**
 * Knowledge Base System
 * Manages knowledge storage and retrieval in English
 * Provides search and matching capabilities
 */

import lunr from 'lunr';
import { storage } from '../storage';
import type { KnowledgeEntry, InsertKnowledgeEntry } from '@shared/schema';
import { normalizeToEnglish } from './converter';

export interface SearchResult {
  entry: KnowledgeEntry;
  score: number;
  relevance: 'high' | 'medium' | 'low';
}

export interface KnowledgeSearchOptions {
  limit?: number;
  minScore?: number;
}

let searchIndex: lunr.Index | null = null;
let lastIndexBuild: number = 0;
const INDEX_CACHE_TIME = 5000; // 5 seconds

/**
 * Build or rebuild the search index
 */
export async function buildSearchIndex(): Promise<void> {
  const knowledge = await storage.getAllKnowledge();
  
  searchIndex = lunr(function () {
    this.ref('id');
    this.field('question', { boost: 10 });
    this.field('answer', { boost: 5 });

    knowledge.forEach((entry) => {
      this.add({
        id: entry.id,
        question: entry.question,
        answer: entry.answer,
      });
    });
  });

  lastIndexBuild = Date.now();
}

/**
 * Ensure search index is built and up to date
 */
async function ensureIndexReady(): Promise<void> {
  const now = Date.now();
  
  if (!searchIndex || (now - lastIndexBuild) > INDEX_CACHE_TIME) {
    await buildSearchIndex();
  }
}

/**
 * Simple keyword-based fallback search when Lunr doesn't find results
 */
function keywordSearch(query: string, knowledge: KnowledgeEntry[], limit: number = 5): SearchResult[] {
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  
  const scored = knowledge.map(entry => {
    const questionLower = entry.question.toLowerCase();
    const questionWords = questionLower.split(/\s+/);
    const answerLower = entry.answer.toLowerCase();
    
    // Count matching keywords
    let score = 0;
    let exactMatches = 0;
    
    queryWords.forEach(qWord => {
      // Exact word match in question (strongest signal)
      if (questionWords.some(w => w === qWord)) {
        score += 10;
        exactMatches += 1;
      }
      // Partial word match in question
      else if (questionWords.some(w => w.includes(qWord) || qWord.includes(w))) {
        score += 3;
      }
      // Match anywhere in question or answer
      else if (questionLower.includes(qWord) || answerLower.includes(qWord)) {
        score += 1;
      }
    });
    
    return { entry, score, exactMatches };
  })
    .filter(r => r.score > 0)
    .sort((a, b) => {
      // Sort by exact matches first, then by total score
      if (b.exactMatches !== a.exactMatches) {
        return b.exactMatches - a.exactMatches;
      }
      return b.score - a.score;
    })
    .slice(0, limit)
    .map(({ entry, score }) => {
      let relevance: 'high' | 'medium' | 'low';
      if (score >= 10) {
        relevance = 'high';
      } else if (score >= 3) {
        relevance = 'medium';
      } else {
        relevance = 'low';
      }
      return {
        entry,
        score,
        relevance,
      };
    });
  
  return scored;
}

/**
 * Search knowledge base for relevant entries
 */
export async function searchKnowledge(
  query: string,
  options: KnowledgeSearchOptions = {}
): Promise<SearchResult[]> {
  const { limit = 10, minScore = 0 } = options;

  // Normalize query to English for consistent searching
  const normalizedQuery = normalizeToEnglish(query);

  // Ensure index is ready
  await ensureIndexReady();

  const knowledge = await storage.getAllKnowledge();

  if (!searchIndex) {
    // Fallback to keyword search if index not available
    return keywordSearch(normalizedQuery, knowledge, limit);
  }

  // Search the index
  const results = searchIndex.search(normalizedQuery);

  // Map results to entries with relevance scores
  let searchResults: SearchResult[] = results
    .filter(result => result.score >= minScore)
    .slice(0, limit)
    .map(result => {
      const entry = knowledge.find(k => k.id === result.ref);
      
      if (!entry) {
        return null;
      }

      // Determine relevance based on score
      let relevance: 'high' | 'medium' | 'low';
      if (result.score > 3) {
        relevance = 'high';
      } else if (result.score > 1) {
        relevance = 'medium';
      } else {
        relevance = 'low';
      }

      return {
        entry,
        score: result.score,
        relevance,
      };
    })
    .filter((result): result is SearchResult => result !== null);

  // If Lunr found no results or very few, use keyword fallback
  if (searchResults.length === 0 && results.length === 0) {
    return keywordSearch(normalizedQuery, knowledge, limit);
  }

  return searchResults;
}

/**
 * Get best matching entry for a query
 */
export async function getBestMatch(query: string): Promise<SearchResult | null> {
  const results = await searchKnowledge(query, { limit: 1, minScore: 0.1 });
  return results.length > 0 ? results[0] : null;
}

/**
 * Add new knowledge entry (always store in English)
 */
export async function addKnowledge(
  question: string,
  answer: string
): Promise<KnowledgeEntry> {
  // Normalize both question and answer to English
  const normalizedQuestion = normalizeToEnglish(question);
  const normalizedAnswer = normalizeToEnglish(answer);

  const entry = await storage.addKnowledge({
    question: normalizedQuestion,
    answer: normalizedAnswer,
  });

  // Rebuild index to include new entry
  await buildSearchIndex();

  return entry;
}

/**
 * Update existing knowledge entry
 */
export async function updateKnowledge(
  id: string,
  answer: string
): Promise<KnowledgeEntry> {
  // Normalize answer to English
  const normalizedAnswer = normalizeToEnglish(answer);

  const entry = await storage.updateKnowledge(id, normalizedAnswer);

  // Rebuild index with updated entry
  await buildSearchIndex();

  return entry;
}

/**
 * Get all knowledge entries
 */
export async function getAllKnowledge(): Promise<KnowledgeEntry[]> {
  return await storage.getAllKnowledge();
}

/**
 * Get knowledge entry by ID
 */
export async function getKnowledgeById(id: string): Promise<KnowledgeEntry | undefined> {
  return await storage.getKnowledgeById(id);
}

/**
 * Get knowledge count
 */
export async function getKnowledgeCount(): Promise<number> {
  return await storage.getKnowledgeCount();
}

/**
 * Find similar questions to avoid duplicates
 */
export async function findSimilarQuestions(question: string): Promise<SearchResult[]> {
  const normalizedQuestion = normalizeToEnglish(question);
  return await searchKnowledge(normalizedQuestion, { limit: 5, minScore: 2 });
}

/**
 * Check if knowledge exists for a topic
 */
export async function hasKnowledgeAbout(topic: string): Promise<boolean> {
  const results = await searchKnowledge(topic, { limit: 1, minScore: 1 });
  return results.length > 0;
}
