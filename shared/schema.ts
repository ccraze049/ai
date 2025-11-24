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

// API response types
export type QueryResponse = {
  answer: string;
  confidence: "high" | "low" | "none";
  entryId?: string;
};

export type TeachRequest = {
  question: string;
  answer: string;
};

export type ImproveRequest = {
  id: string;
  answer: string;
};
