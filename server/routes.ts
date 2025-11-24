import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import lunr from "lunr";
import type { QueryResponse, TeachRequest, ImproveRequest } from "@shared/schema";

// Lunr.js search index
let searchIndex: lunr.Index | null = null;

// Hindi/Hinglish detection keywords
const hindiKeywords = [
  "kya", "kaise", "kyu", "kyun", "ha", "haan", "nahi", "nahin", "kidar", "kahan",
  "kya ho", "kya hai", "mera", "tera", "apna", "tum", "tumhara", "main", "maine",
  "hum", "hamara", "aap", "aapka", "woh", "yeh", "ye", "wo", "inhe", "unhe",
  "kyu", "kyun", "kitna", "kaisa", "kaun", "kis", "kab", "kahan", "kidhar",
  "samaj", "suna", "dekha", "jaanta", "janti", "samajhta", "kar", "karo",
  "sakte", "sakti", "seekh", "sikhao", "batao", "bata", "sunao", "suno"
];

// Detect if input contains Hindi/Hinglish
function detectHinglish(text: string): boolean {
  const lowerText = text.toLowerCase();
  return hindiKeywords.some(keyword => lowerText.includes(keyword));
}

// Convert English text to simple Hinglish
function convertToHinglish(englishText: string): string {
  let hinglish = englishText;
  
  // Word replacements (order matters - longer phrases first)
  const replacements: [string, string][] = [
    [/\byou are\b/gi, "tum ho"],
    [/\byour\b/gi, "tumhara"],
    [/\byou\b/gi, "tum"],
    [/\bcan\b/gi, "kar sakte ho"],
    [/\bcannot\b/gi, "nahi kar sakte"],
    [/\bcan't\b/gi, "nahi kar sakte"],
    [/\bwill\b/gi, "hoga"],
    [/\bwon't\b/gi, "nahi hoga"],
    [/\bare\b/gi, "ho"],
    [/\bis\b/gi, "hai"],
    [/\bthe\b/gi, ""],
    [/\bit\b/gi, "yeh"],
    [/\bthis\b/gi, "yeh"],
    [/\bthat\b/gi, "woh"],
    [/\bsame\b/gi, "ek jaisa"],
    [/\bdifferent\b/gi, "alag"],
    [/\bmeans\b/gi, "matlab"],
    [/\bhelp\b/gi, "madad"],
    [/\bdo\b/gi, "karo"],
    [/\bdoes\b/gi, "karta hai"],
    [/\bwhat\b/gi, "kya"],
    [/\bwhere\b/gi, "kahan"],
    [/\bwhen\b/gi, "kab"],
    [/\bwhy\b/gi, "kyu"],
    [/\bhow\b/gi, "kaise"],
    [/\bwhich\b/gi, "kaun sa"],
    [/\byes\b/gi, "haan"],
    [/\bno\b/gi, "nahi"],
    [/\balso\b/gi, "bhi"],
    [/\bjust\b/gi, "bas"],
    [/\bonly\b/gi, "sirf"],
    [/\buse\b/gi, "use karo"],
    [/\bmake\b/gi, "banao"],
    [/\bwalk\b/gi, "chal"],
    [/\bkeep\b/gi, "rakho"],
    [/\bget\b/gi, "lo"],
    [/\btake\b/gi, "lo"],
    [/\bgive\b/gi, "do"],
    [/\bwrite\b/gi, "likho"],
    [/\bread\b/gi, "padho"],
    [/\bthink\b/gi, "soch"],
    [/\bknow\b/gi, "jaanta ho"],
    [/\bunderstand\b/gi, "samajhta ho"],
    [/\bgo\b/gi, "jao"],
    [/\bcome\b/gi, "aao"],
    [/\bstart\b/gi, "shuru karo"],
    [/\bstop\b/gi, "ruko"],
    [/\blast\b/gi, "pichla"],
    [/\bnext\b/gi, "agle"],
    [/\bfirst\b/gi, "pehla"],
    [/\bend\b/gi, "ant"],
    [/\bbegin\b/gi, "shuru"],
  ];

  replacements.forEach(([pattern, replacement]) => {
    hinglish = hinglish.replace(pattern, replacement);
  });

  // Clean up extra spaces and remove leading/trailing spaces
  hinglish = hinglish.replace(/\s+/g, " ").trim();
  
  return hinglish;
}

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
  // Detect if user is asking in Hindi/Hinglish
  const isHinglish = detectHinglish(query);
  
  let answer = "";
  let noAnswer = isHinglish 
    ? "Mujhe iska jawab nahi pata. Kya tum mujhe sikhana chaho?"
    : "I don't know the answer to that yet. Would you like to teach me?";

  if (results.length === 0) {
    return {
      answer: noAnswer,
      confidence: "none",
    };
  }

  const bestMatch = results[0];
  const entry = knowledge.find(k => k.id === bestMatch.ref);

  if (!entry) {
    return {
      answer: noAnswer,
      confidence: "none",
    };
  }

  // Get the English answer
  answer = entry.answer;
  
  // Convert to Hinglish if user asked in Hindi/Hinglish
  if (isHinglish) {
    answer = convertToHinglish(answer);
  }

  // Determine confidence based on score
  const confidence = bestMatch.score > 2 ? "high" : "low";

  return {
    answer,
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
