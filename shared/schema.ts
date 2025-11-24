import { z } from "zod";

// Knowledge entry schema for the self-learning AI database
export const knowledgeEntrySchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
});

export const insertKnowledgeEntrySchema = knowledgeEntrySchema.omit({ id: true });

export type KnowledgeEntry = z.infer<typeof knowledgeEntrySchema>;
export type InsertKnowledgeEntry = z.infer<typeof insertKnowledgeEntrySchema>;

// Chat context for multi-turn conversations
export type ChatContext = {
  awaitingLearningInput?: {
    type: 'question_answer' | 'confirmation';
    data?: any;
  };
};

// API response types
export type QueryResponse = {
  answer: string;
  confidence: "high" | "low" | "none";
  entryId?: string;
  context?: ChatContext;
};

export type QueryRequest = {
  query: string;
  context?: ChatContext;
};

export type TeachRequest = {
  question: string;
  answer: string;
};

export type ImproveRequest = {
  id: string;
  answer: string;
};
