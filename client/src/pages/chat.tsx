import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Send, Brain, Lightbulb, Edit3, Sparkles, Hash, List, Calculator } from "lucide-react";
import type { QueryResponse, TeachRequest, ImproveRequest, ChatContext, ConversationMessage } from "@shared/schema";

function isLogicResult(content: string): boolean {
  const trimmed = content.trim();
  if (/^\d+$/.test(trimmed)) return true;
  if (/^-?\d+\.?\d*$/.test(trimmed)) return true;
  if (/^\d+\s*\(from dataset\)$/.test(trimmed)) return true;
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) return true;
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return true;
  if (trimmed === '[]') return true;
  return false;
}

function formatLogicContent(content: string): { type: 'number' | 'array' | 'object' | 'text', value: unknown } {
  const trimmed = content.replace(/\s*\(from dataset\)\s*$/, '').trim();
  
  if (/^\d+$/.test(trimmed)) {
    return { type: 'number', value: parseInt(trimmed) };
  }
  if (/^-?\d+\.?\d*$/.test(trimmed)) {
    return { type: 'number', value: parseFloat(trimmed) };
  }
  
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return { type: 'array', value: parsed };
    }
    if (typeof parsed === 'object' && parsed !== null) {
      return { type: 'object', value: parsed };
    }
  } catch {
  }
  
  return { type: 'text', value: content };
}

function LogicResultDisplay({ content }: { content: string }) {
  const result = formatLogicContent(content);
  const isFromDataset = content.includes('(from dataset)');
  
  if (result.type === 'object') {
    const obj = result.value as Record<string, unknown>;
    if ('message' in obj && 'words' in obj && 'lines' in obj) {
      return (
        <div className="space-y-2">
          <p className="text-base font-medium text-foreground">{String(obj.message)}</p>
          <div className="flex gap-4">
            <Badge variant="secondary">{String(obj.words)} words</Badge>
            <Badge variant="secondary">{String(obj.lines)} lines</Badge>
          </div>
        </div>
      );
    }
  }
  
  return (
    <div className="space-y-2">
      {result.type === 'number' && (
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Hash className="w-5 h-5 text-primary" />
          </div>
          <span className="text-3xl font-bold text-foreground">{String(result.value)}</span>
        </div>
      )}
      
      {result.type === 'array' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <List className="w-4 h-4" />
            <span>{(result.value as unknown[]).length} items</span>
          </div>
          {(result.value as unknown[]).length === 0 ? (
            <p className="text-sm text-muted-foreground">None found</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(result.value as unknown[]).map((item, i) => (
                <Badge key={i} variant="secondary" className="text-sm">
                  {String(item)}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
      
      {result.type === 'object' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calculator className="w-4 h-4" />
            <span>Word Frequency</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(result.value as Record<string, number>).slice(0, 20).map(([word, count]) => (
              <div key={word} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-background/50">
                <span className="text-sm truncate">{word}</span>
                <Badge variant="outline" className="ml-2">{String(count)}</Badge>
              </div>
            ))}
          </div>
          {Object.keys(result.value as object).length > 20 && (
            <p className="text-xs text-muted-foreground">...and {Object.keys(result.value as object).length - 20} more</p>
          )}
        </div>
      )}
      
      {result.type === 'text' && (
        <p className="text-base leading-relaxed whitespace-pre-wrap break-words">{content}</p>
      )}
      
      {isFromDataset && (
        <Badge variant="outline" className="text-xs">From Dataset</Badge>
      )}
    </div>
  );
}

type Message = {
  id: string;
  type: "user" | "ai";
  content: string;
  confidence?: "high" | "low" | "none";
  entryId?: string;
  timestamp: Date;
  userQuestion?: string;
};

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [chatContext, setChatContext] = useState<ChatContext>({});
  const [teachModalOpen, setTeachModalOpen] = useState(false);
  const [improveModalOpen, setImproveModalOpen] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [currentEntryId, setCurrentEntryId] = useState("");
  const [teachAnswer, setTeachAnswer] = useState("");
  const [improveAnswer, setImproveAnswer] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch knowledge count
  const { data: knowledgeCount = 1 } = useQuery<number>({
    queryKey: ["/api/knowledge/count"],
  });

  // Build conversation history from messages
  const buildConversationHistory = (): ConversationMessage[] => {
    return messages.map(msg => ({
      role: msg.type === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.content,
      timestamp: msg.timestamp.getTime(),
    }));
  };

  // Query mutation
  const queryMutation = useMutation({
    mutationFn: async (query: string) => {
      const conversationHistory = buildConversationHistory();
      const contextWithHistory: ChatContext = {
        ...chatContext,
        conversationHistory,
      };
      const response = await apiRequest("POST", "/api/query", { 
        query, 
        context: contextWithHistory 
      });
      const data = await response.json() as QueryResponse;
      return { data, query };
    },
    onSuccess: ({ data, query }) => {
      setIsTyping(false);
      
      // Update chat context if returned
      if (data.context) {
        setChatContext(data.context);
      } else {
        setChatContext({});
      }
      
      const aiMessage: Message = {
        id: Date.now().toString(),
        type: "ai",
        content: data.answer,
        confidence: data.confidence,
        entryId: data.entryId,
        timestamp: new Date(),
        userQuestion: query,
      };
      setMessages(prev => [...prev, aiMessage]);
    },
    onError: () => {
      setIsTyping(false);
      toast({
        title: "Error",
        description: "Failed to get response. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Teach mutation
  const teachMutation = useMutation({
    mutationFn: async (data: TeachRequest) => {
      const response = await apiRequest("POST", "/api/knowledge/teach", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge/count"] });
      setTeachModalOpen(false);
      setTeachAnswer("");
      toast({
        title: "Learned!",
        description: "I've successfully learned this new information.",
      });
      const confirmMessage: Message = {
        id: Date.now().toString(),
        type: "ai",
        content: "Thanks! I've learned this and will remember it for future conversations.",
        confidence: "high",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, confirmMessage]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save knowledge. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Improve mutation
  const improveMutation = useMutation({
    mutationFn: async (data: ImproveRequest) => {
      const response = await apiRequest("POST", "/api/knowledge/improve", data);
      return await response.json();
    },
    onSuccess: () => {
      setImproveModalOpen(false);
      setImproveAnswer("");
      toast({
        title: "Improved!",
        description: "I've updated my knowledge with your correction.",
      });
      const confirmMessage: Message = {
        id: Date.now().toString(),
        type: "ai",
        content: "Thanks for the correction! I've updated my knowledge.",
        confidence: "high",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, confirmMessage]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to improve knowledge. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const question = inputValue;
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: question,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);
    queryMutation.mutate(question);
  };

  const handleTeachClick = (question: string) => {
    setCurrentQuestion(question);
    setTeachModalOpen(true);
  };

  const handleImproveClick = (question: string, entryId: string) => {
    setCurrentQuestion(question);
    setCurrentEntryId(entryId);
    setImproveModalOpen(true);
  };

  const handleTeachSubmit = () => {
    if (!teachAnswer.trim()) return;
    teachMutation.mutate({
      question: currentQuestion,
      answer: teachAnswer,
    });
  };

  const handleImproveSubmit = () => {
    if (!improveAnswer.trim()) return;
    improveMutation.mutate({
      id: currentEntryId,
      answer: improveAnswer,
    });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 border-b bg-background">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">BrainBox Agent</h1>
        </div>
        <Badge variant="secondary" className="gap-2" data-testid="badge-knowledge-count">
          <Sparkles className="w-3 h-3" />
          <span>Learning: {knowledgeCount} {knowledgeCount === 1 ? 'topic' : 'topics'}</span>
        </Badge>
      </header>

      {/* Chat Container */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {messages.length === 0 ? (
            // Empty State
            <div className="flex flex-col items-center justify-center gap-6 min-h-[60vh]">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                <Brain className="w-10 h-10 text-primary" />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-semibold text-foreground">Hi! I'm BrainBox Agent</h2>
                <p className="text-muted-foreground">Ask me anything. If I don't know, you can teach me!</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInputValue("What is BrainBox Agent?")}
                  data-testid="button-example-1"
                >
                  What is BrainBox Agent?
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInputValue("How does learning work?")}
                  data-testid="button-example-2"
                >
                  How does learning work?
                </Button>
              </div>
            </div>
          ) : (
            // Messages
            <div className="space-y-6">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`flex gap-3 max-w-[85%] md:max-w-lg ${message.type === "user" ? "flex-row-reverse" : "flex-row"}`}>
                    {message.type === "ai" && (
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 flex-shrink-0">
                        <Brain className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <div className="flex flex-col gap-2 flex-1">
                      <div
                        className={`px-6 py-3 ${
                          message.type === "user"
                            ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm"
                            : "bg-muted text-foreground rounded-2xl rounded-tl-sm"
                        }`}
                        data-testid={`message-${message.type}-${message.id}`}
                      >
                        {message.type === "ai" && isLogicResult(message.content) ? (
                          <LogicResultDisplay content={message.content} />
                        ) : (
                          <p className="text-base leading-relaxed whitespace-pre-wrap break-words" data-testid={`text-message-content-${message.id}`}>
                            {message.content}
                          </p>
                        )}
                      </div>
                      {message.type === "ai" && message.confidence === "low" && (
                        <Badge variant="outline" className="self-start text-xs" data-testid={`badge-confidence-low-${message.id}`}>
                          Low Confidence
                        </Badge>
                      )}
                      {message.type === "ai" && (message.confidence === "none" || message.confidence === "low") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTeachClick(message.userQuestion || "")}
                          className="self-start gap-2"
                          data-testid={`button-teach-${message.id}`}
                        >
                          <Lightbulb className="w-4 h-4" />
                          Teach Me This
                        </Button>
                      )}
                      {message.type === "ai" && message.confidence === "high" && message.entryId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleImproveClick(message.userQuestion || "", message.entryId || "")}
                          className="self-start gap-2 opacity-70 hover:opacity-100"
                          data-testid={`button-improve-${message.id}`}
                        >
                          <Edit3 className="w-3 h-3" />
                          Improve This Answer
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex gap-3 max-w-[85%] md:max-w-lg">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 flex-shrink-0">
                      <Brain className="w-4 h-4 text-primary" />
                    </div>
                    <div className="px-6 py-3 bg-muted text-foreground rounded-2xl rounded-tl-sm">
                      <div className="flex gap-1" data-testid="typing-indicator">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="sticky bottom-0 border-t bg-background shadow-lg">
        <div className="max-w-3xl mx-auto p-4">
          <div className="flex gap-3">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Ask me anything..."
              className="flex-1 rounded-full px-6 py-4 h-12"
              data-testid="input-message"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping}
              size="icon"
              className="w-12 h-12 rounded-full flex-shrink-0"
              data-testid="button-send"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Teach Modal */}
      <Dialog open={teachModalOpen} onOpenChange={setTeachModalOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Teach BrainBox Agent</DialogTitle>
            <DialogDescription>
              Help me learn by providing the correct answer to this question.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-xl bg-muted">
              <p className="text-sm font-medium text-muted-foreground mb-1">Question:</p>
              <p className="text-base text-foreground">{currentQuestion}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Your Answer:</label>
              <Textarea
                value={teachAnswer}
                onChange={(e) => setTeachAnswer(e.target.value)}
                placeholder="Type the correct answer here..."
                className="h-32 rounded-xl resize-none"
                data-testid="textarea-teach-answer"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-3">
            <Button variant="outline" onClick={() => setTeachModalOpen(false)} data-testid="button-cancel-teach">
              Cancel
            </Button>
            <Button onClick={handleTeachSubmit} disabled={!teachAnswer.trim() || teachMutation.isPending} data-testid="button-save-teach">
              {teachMutation.isPending ? "Saving..." : "Save Knowledge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Improve Modal */}
      <Dialog open={improveModalOpen} onOpenChange={setImproveModalOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Improve Answer</DialogTitle>
            <DialogDescription>
              Help me get better by providing an improved or corrected answer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-xl bg-muted">
              <p className="text-sm font-medium text-muted-foreground mb-1">Question:</p>
              <p className="text-base text-foreground">{currentQuestion}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Improved Answer:</label>
              <Textarea
                value={improveAnswer}
                onChange={(e) => setImproveAnswer(e.target.value)}
                placeholder="Type the improved answer here..."
                className="h-32 rounded-xl resize-none"
                data-testid="textarea-improve-answer"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-3">
            <Button variant="outline" onClick={() => setImproveModalOpen(false)} data-testid="button-cancel-improve">
              Cancel
            </Button>
            <Button onClick={handleImproveSubmit} disabled={!improveAnswer.trim() || improveMutation.isPending} data-testid="button-save-improve">
              {improveMutation.isPending ? "Updating..." : "Update Knowledge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
