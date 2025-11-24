import type { Express } from "express";
import { createServer, type Server } from "http";
import type { QueryResponse, TeachRequest, ImproveRequest } from "@shared/schema";
import { processQuery } from "./ai/mainChatEngine";
import { buildSearchIndex, addKnowledge, updateKnowledge, getKnowledgeCount } from "./ai/knowledgeBase";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize search index on startup
  await buildSearchIndex();

  // Query endpoint - Process user query using main chat engine
  app.post("/api/query", async (req, res) => {
    try {
      const { query } = req.body;

      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Query is required" });
      }

      // Use the new chat engine to process the query
      const response = await processQuery(query, {}, {
        enableLearning: true,
        casualTone: true,
      });

      // Return only the QueryResponse fields (exclude extra fields like languageDetection)
      const queryResponse: QueryResponse = {
        answer: response.answer,
        confidence: response.confidence,
        entryId: response.entryId,
      };

      res.json(queryResponse);
    } catch (error) {
      console.error("Query error:", error);
      res.status(500).json({ error: "Failed to process query" });
    }
  });

  // Teach endpoint - Add new knowledge (stores in English)
  app.post("/api/knowledge/teach", async (req, res) => {
    try {
      const teachRequest = req.body as TeachRequest;

      if (!teachRequest.question || !teachRequest.answer) {
        return res.status(400).json({ error: "Question and answer are required" });
      }

      // Use knowledge base module to add knowledge (auto-converts to English)
      const newEntry = await addKnowledge(
        teachRequest.question,
        teachRequest.answer
      );

      res.json(newEntry);
    } catch (error) {
      console.error("Teach error:", error);
      res.status(500).json({ error: "Failed to save knowledge" });
    }
  });

  // Improve endpoint - Update existing knowledge
  app.post("/api/knowledge/improve", async (req, res) => {
    try {
      const improveRequest = req.body as ImproveRequest;

      if (!improveRequest.id || !improveRequest.answer) {
        return res.status(400).json({ error: "ID and answer are required" });
      }

      // Use knowledge base module to update knowledge (auto-converts to English)
      const updatedEntry = await updateKnowledge(
        improveRequest.id,
        improveRequest.answer
      );

      res.json(updatedEntry);
    } catch (error) {
      console.error("Improve error:", error);
      res.status(500).json({ error: "Failed to improve knowledge" });
    }
  });

  // Knowledge count endpoint
  app.get("/api/knowledge/count", async (req, res) => {
    try {
      const count = await getKnowledgeCount();
      res.json(count);
    } catch (error) {
      console.error("Count error:", error);
      res.status(500).json({ error: "Failed to get knowledge count" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
