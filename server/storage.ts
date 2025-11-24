import { type KnowledgeEntry, type InsertKnowledgeEntry } from "@shared/schema";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

const KNOWLEDGE_FILE = path.join(process.cwd(), "knowledge.json");

export interface IStorage {
  // Knowledge management methods
  getAllKnowledge(): Promise<KnowledgeEntry[]>;
  getKnowledgeById(id: string): Promise<KnowledgeEntry | undefined>;
  addKnowledge(entry: InsertKnowledgeEntry): Promise<KnowledgeEntry>;
  updateKnowledge(id: string, answer: string): Promise<KnowledgeEntry>;
  getKnowledgeCount(): Promise<number>;
}

export class KnowledgeStorage implements IStorage {
  private knowledgeCache: KnowledgeEntry[] | null = null;

  constructor() {
    // Initialize cache on startup
    this.loadKnowledge().catch(console.error);
  }

  private async loadKnowledge(): Promise<KnowledgeEntry[]> {
    try {
      const data = await fs.readFile(KNOWLEDGE_FILE, "utf-8");
      this.knowledgeCache = JSON.parse(data);
      return this.knowledgeCache!;
    } catch (error) {
      // If file doesn't exist, create it with initial data
      const initialData: KnowledgeEntry[] = [
        {
          id: "1",
          question: "What is BrainBox Agent?",
          answer: "BrainBox Agent is a self-learning, API-free AI that uses its local database to answer and learn from conversations. I work completely offline without requiring any external API keys."
        }
      ];
      await this.saveKnowledge(initialData);
      return initialData;
    }
  }

  private async saveKnowledge(data: KnowledgeEntry[]): Promise<void> {
    this.knowledgeCache = data;
    await fs.writeFile(KNOWLEDGE_FILE, JSON.stringify(data, null, 2), "utf-8");
  }

  async getAllKnowledge(): Promise<KnowledgeEntry[]> {
    if (!this.knowledgeCache) {
      return await this.loadKnowledge();
    }
    return this.knowledgeCache;
  }

  async getKnowledgeById(id: string): Promise<KnowledgeEntry | undefined> {
    const knowledge = await this.getAllKnowledge();
    return knowledge.find(entry => entry.id === id);
  }

  async addKnowledge(insertEntry: InsertKnowledgeEntry): Promise<KnowledgeEntry> {
    const knowledge = await this.getAllKnowledge();
    const newEntry: KnowledgeEntry = {
      id: randomUUID(),
      ...insertEntry,
    };
    knowledge.push(newEntry);
    await this.saveKnowledge(knowledge);
    return newEntry;
  }

  async updateKnowledge(id: string, answer: string): Promise<KnowledgeEntry> {
    const knowledge = await this.getAllKnowledge();
    const index = knowledge.findIndex(entry => entry.id === id);
    
    if (index === -1) {
      throw new Error("Knowledge entry not found");
    }

    knowledge[index].answer = answer;
    await this.saveKnowledge(knowledge);
    return knowledge[index];
  }

  async getKnowledgeCount(): Promise<number> {
    const knowledge = await this.getAllKnowledge();
    return knowledge.length;
  }
}

export const storage = new KnowledgeStorage();
