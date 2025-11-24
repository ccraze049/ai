import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import lunr from "lunr";
import type { QueryResponse, TeachRequest, ImproveRequest } from "@shared/schema";

// Lunr.js search index
let searchIndex: lunr.Index | null = null;

// Build or rebuild the search index
async function buildSearchIndex() {
  const knowledge = await storage.getAllKnowledge();
  
  searchIndex = lunr(function () {
    this.ref("id");
    this.field("question", { boost: 10 });
    this.field("answer", { boost: 5 });

    knowledge.forEach((entry) => {
      this.add({
        id: entry.id,
        question: entry.question,
        answer: entry.answer,
      });
    });
  });
}

// Generate a natural language response from search results
function generateResponse(query: string, results: lunr.Index.Result[], knowledge: any[]): QueryResponse {
  if (results.length === 0) {
    return {
      answer: "I don't know the answer to that yet. Would you like to teach me?",
      confidence: "none",
    };
  }

  const bestMatch = results[0];
  const entry = knowledge.find(k => k.id === bestMatch.ref);

  if (!entry) {
    return {
      answer: "I don't know the answer to that yet. Would you like to teach me?",
      confidence: "none",
    };
  }

  // Determine confidence based on score
  const confidence = bestMatch.score > 2 ? "high" : "low";

  return {
    answer: entry.answer,
    confidence,
    entryId: entry.id,
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize search index on startup
  await buildSearchIndex();

  // Query endpoint - Search knowledge and return answer
  app.post("/api/query", async (req, res) => {
    try {
      const { query } = req.body;

      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Query is required" });
      }

      if (!searchIndex) {
        await buildSearchIndex();
      }

      const results = searchIndex!.search(query);
      const knowledge = await storage.getAllKnowledge();
      const response = generateResponse(query, results, knowledge);

      res.json(response);
    } catch (error) {
      console.error("Query error:", error);
      res.status(500).json({ error: "Failed to process query" });
    }
  });

  // Teach endpoint - Add new knowledge
  app.post("/api/knowledge/teach", async (req, res) => {
    try {
      const teachRequest = req.body as TeachRequest;

      if (!teachRequest.question || !teachRequest.answer) {
        return res.status(400).json({ error: "Question and answer are required" });
      }

      const newEntry = await storage.addKnowledge({
        question: teachRequest.question,
        answer: teachRequest.answer,
      });

      // Rebuild search index with new knowledge
      await buildSearchIndex();

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

      const updatedEntry = await storage.updateKnowledge(
        improveRequest.id,
        improveRequest.answer
      );

      // Rebuild search index with updated knowledge
      await buildSearchIndex();

      res.json(updatedEntry);
    } catch (error) {
      console.error("Improve error:", error);
      res.status(500).json({ error: "Failed to improve knowledge" });
    }
  });

  // Knowledge count endpoint
  app.get("/api/knowledge/count", async (req, res) => {
    try {
      const count = await storage.getKnowledgeCount();
      res.json(count);
    } catch (error) {
      console.error("Count error:", error);
      res.status(500).json({ error: "Failed to get knowledge count" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
