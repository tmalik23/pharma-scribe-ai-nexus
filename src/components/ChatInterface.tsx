import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, User, Loader2, Lightbulb, TrendingUp, Search, Zap, HelpCircle, ChevronRight, Database, Brain, Target, ExternalLink, FileText, X, BookOpen, Tag, Calendar, Eye } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Paper {
  id: string;
  filename: string;
  title: string;
  pub_year: number | null;
  summary: string;
  findings: string;
  hypothesis: string;
  entities: string[];
}

const promptCategories = [
  {
    icon: Lightbulb,
    title: "Discover Insights",
    color: "from-amber-500 to-orange-500",
    prompts: [
      "Surprise me with an insight",
      "Find hidden connections between papers",
      "What's unexpected in this data?"
    ]
  },
  {
    icon: TrendingUp,
    title: "Analyze Trends",
    color: "from-blue-500 to-indigo-500",
    prompts: [
      "How has DNA research evolved?",
      "Show me ATP publication trends",
      "What topics are growing?"
    ]
  },
  {
    icon: Target,
    title: "Find Gaps",
    color: "from-green-500 to-teal-500",
    prompts: [
      "What areas are understudied?",
      "Find research opportunities",
      "Topics with few papers?"
    ]
  },
  {
    icon: Database,
    title: "Database Stats",
    color: "from-slate-500 to-slate-700",
    prompts: [
      "Show database overview",
      "Top 10 research topics?",
      "Papers from last 10 years?"
    ]
  }
];

const quickPrompts = [
  "🔮 Surprise me",
  "📊 Database overview",
  "🔗 Find connections",
  "📈 Top trends"
];

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [loadingPaper, setLoadingPaper] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const streamingContentRef = useRef('');
  const updateIntervalRef = useRef<number | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const prevMessagesLengthRef = useRef(0);

  const r2BucketUrl = import.meta.env.VITE_R2_BUCKET_URL || '';

  const isNearBottom = () => {
    const container = chatContainerRef.current;
    if (!container) return true;
    return container.scrollHeight - container.scrollTop - container.clientHeight < 100;
  };

  const scrollToBottom = (force = false) => {
    if (force || shouldAutoScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleScroll = () => {
    shouldAutoScrollRef.current = isNearBottom();
  };

  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.role === 'user') {
        shouldAutoScrollRef.current = true;
        scrollToBottom(true);
      } else if (shouldAutoScrollRef.current) {
        scrollToBottom();
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length]);

  useEffect(() => {
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, []);

  // Fetch paper details when clicking View Paper
  const handleViewPaper = async (paperId: string) => {
    setLoadingPaper(true);
    try {
      const { data, error } = await supabase
        .from('papers')
        .select('*')
        .eq('id', paperId)
        .single();

      if (error) throw error;
      setSelectedPaper(data);
    } catch (err) {
      console.error('Error fetching paper:', err);
      alert('Could not load paper details');
    } finally {
      setLoadingPaper(false);
    }
  };

  const handleSend = async (promptText?: string) => {
    const messageText = promptText || input;
    if (!messageText.trim()) return;

    setShowOnboarding(false);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const aiMessageId = (Date.now() + 1).toString();
    streamingContentRef.current = '';

    setMessages(prev => [...prev, {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    }]);

    updateIntervalRef.current = window.setInterval(() => {
      if (streamingContentRef.current) {
        setMessages(prev => prev.map(msg =>
          msg.id === aiMessageId ? { ...msg, content: streamingContentRef.current } : msg
        ));
      }
    }, 100);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Configuration missing. Check .env file.");
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/chat-with-deepseek`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Error ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed === '' || trimmed === 'data: [DONE]') continue;

            if (trimmed.startsWith('data: ')) {
              try {
                const jsonStr = trimmed.slice(6);
                const json = JSON.parse(jsonStr);
                const content = json.choices?.[0]?.delta?.content;
                if (content) {
                  streamingContentRef.current += content;
                }
              } catch (e) { }
            }
          }
        }
      }

      setMessages(prev => prev.map(msg =>
        msg.id === aiMessageId ? { ...msg, content: streamingContentRef.current } : msg
      ));

    } catch (error: any) {
      console.error('Chat error:', error);
      streamingContentRef.current = `❌ Error: ${error?.message || 'Connection failed'}`;
      setMessages(prev => prev.map(msg =>
        msg.id === aiMessageId ? { ...msg, content: streamingContentRef.current } : msg
      ));
    } finally {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
      setIsLoading(false);
    }
  };

  const renderContent = (content: string) => {
    // Convert ALL paper link formats to code blocks to prevent browser navigation
    let processedContent = content;

    // Format 1: [📄 Title](paper:uuid) -> `[[PAPER:uuid:Title]]`
    processedContent = processedContent.replace(
      /\[📄\s*([^\]]+)\]\(paper:([^)]+)\)/g,
      '`[[PAPER:$2:$1]]`'
    );

    // Format 2: [Any Text](paper:uuid) -> `[[PAPER:uuid:Any Text]]`
    processedContent = processedContent.replace(
      /\[([^\]]+)\]\(paper:([^)]+)\)/g,
      '`[[PAPER:$2:$1]]`'
    );

    // Format 3: Just (paper:uuid) remaining -> `[[PAPER:uuid:View]]`
    processedContent = processedContent.replace(
      /\(paper:([^)]+)\)/g,
      '`[[PAPER:$1:Open Paper]]`'
    );

    return (
      <div className="prose prose-sm max-w-none">
        <ReactMarkdown
          components={{
            code: ({ children }) => {
              const text = String(children);
              // Match [[PAPER:uuid:Title]]
              const match = text.match(/\[\[PAPER:([^:]+):([^\]]+)\]\]/);
              if (match) {
                const paperId = match[1];
                const paperTitle = match[2].trim();
                return (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleViewPaper(paperId);
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded text-xs font-medium transition-colors max-w-xs"
                  >
                    <FileText className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{paperTitle}</span>
                  </button>
                );
              }
              return <code className="bg-slate-100 px-1 py-0.5 rounded text-sm">{children}</code>;
            },
            h2: ({ children }) => <h2 className="text-lg font-semibold text-slate-800 mt-3 mb-2">{children}</h2>,
            ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>,
            li: ({ children }) => <li className="text-slate-600">{children}</li>,
            p: ({ children }) => <p className="text-slate-600 my-2 leading-relaxed">{children}</p>,
            strong: ({ children }) => <strong className="font-semibold text-slate-800">{children}</strong>,
            blockquote: ({ children }) => <blockquote className="border-l-2 border-indigo-300 pl-3 italic text-slate-500 my-2">{children}</blockquote>,
            a: ({ href, children }) => {
              // Handle paper links that didn't get converted
              if (href?.startsWith('paper:')) {
                const paperId = href.replace('paper:', '');
                return (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleViewPaper(paperId);
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded text-xs font-medium transition-colors"
                  >
                    <FileText className="w-3 h-3" />
                    <span className="truncate max-w-[200px]">{children}</span>
                  </button>
                );
              }
              return <a href={href} className="text-indigo-600 hover:underline">{children}</a>;
            },
          }}
        >
          {processedContent}
        </ReactMarkdown>
      </div>
    );
  };

  // Paper Detail Panel
  const PaperPanel = () => (
    <div className="w-96 border-l border-slate-200 bg-white flex flex-col h-full overflow-hidden">
      <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex items-center justify-between z-10">
        <h3 className="font-semibold text-slate-800">Paper Details</h3>
        <Button variant="ghost" size="sm" onClick={() => setSelectedPaper(null)}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {loadingPaper ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : selectedPaper && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">{selectedPaper.title}</h2>
            <div className="flex items-center gap-2 mt-2">
              {selectedPaper.pub_year && (
                <Badge className="bg-indigo-100 text-indigo-700">
                  <Calendar className="w-3 h-3 mr-1" />
                  {selectedPaper.pub_year}
                </Badge>
              )}
            </div>
          </div>

          {selectedPaper.filename && r2BucketUrl && (
            <a
              href={`${r2BucketUrl}/${selectedPaper.filename}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
            >
              <Eye className="w-4 h-4" />
              View Original PDF
            </a>
          )}

          {selectedPaper.summary && (
            <div>
              <h4 className="flex items-center gap-2 font-semibold text-slate-700 mb-1 text-sm">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                Summary
              </h4>
              <p className="text-slate-600 text-sm leading-relaxed">{selectedPaper.summary}</p>
            </div>
          )}

          {selectedPaper.findings && (
            <div>
              <h4 className="flex items-center gap-2 font-semibold text-slate-700 mb-1 text-sm">
                <TrendingUp className="w-4 h-4 text-green-500" />
                Key Findings
              </h4>
              <p className="text-slate-600 text-sm leading-relaxed">{selectedPaper.findings}</p>
            </div>
          )}

          {selectedPaper.hypothesis && (
            <div>
              <h4 className="flex items-center gap-2 font-semibold text-slate-700 mb-1 text-sm">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                Hypothesis
              </h4>
              <p className="text-slate-600 text-sm leading-relaxed">{selectedPaper.hypothesis}</p>
            </div>
          )}

          {selectedPaper.entities?.length > 0 && (
            <div>
              <h4 className="flex items-center gap-2 font-semibold text-slate-700 mb-1 text-sm">
                <Tag className="w-4 h-4 text-purple-500" />
                Topics
              </h4>
              <div className="flex flex-wrap gap-1">
                {selectedPaper.entities.map((e, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{e}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const ChatView = () => (
    <div
      ref={chatContainerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4"
    >
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex items-start gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
        >
          <Avatar className={`w-8 h-8 flex-shrink-0 ${message.role === 'assistant' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-blue-600'}`}>
            <AvatarFallback className="text-white">
              {message.role === 'assistant' ? <Brain size={16} /> : <User size={16} />}
            </AvatarFallback>
          </Avatar>

          <Card className={`max-w-[80%] p-3 shadow-sm ${message.role === 'user'
            ? 'bg-blue-600 text-white rounded-tr-none'
            : 'bg-white border-slate-200 rounded-tl-none'
            }`}>
            {message.role === 'user' ? (
              <p className="text-white text-sm">{message.content}</p>
            ) : (
              <div className="min-h-[20px]">
                {message.content ? renderContent(message.content) : (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );

  const OnboardingView = () => (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-4">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Research Oracle</h1>
          <p className="text-slate-500">Ask about your research database</p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {quickPrompts.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSend(prompt.replace(/^[^\s]+\s/, ''))}
              className="px-4 py-2 bg-white border border-slate-200 rounded-full text-sm text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 transition-all"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {promptCategories.map((cat, i) => (
            <Card key={i} className="p-4 border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${cat.color} text-white`}>
                  <cat.icon className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-slate-800 text-sm">{cat.title}</h3>
              </div>
              <div className="space-y-1">
                {cat.prompts.map((prompt, j) => (
                  <button
                    key={j}
                    onClick={() => handleSend(prompt)}
                    className="w-full text-left px-3 py-2 text-xs text-slate-600 bg-slate-50 rounded hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center gap-2"
                  >
                    <ChevronRight className="w-3 h-3 opacity-50" />
                    {prompt}
                  </button>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full bg-slate-50 font-sans">
      {/* Main Chat Area */}
      <div className={`flex flex-col ${selectedPaper ? 'flex-1' : 'w-full'} transition-all duration-300`}>
        {!showOnboarding && messages.length > 0 && (
          <div className="px-4 py-2 bg-white border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-indigo-600" />
              <span className="font-semibold text-slate-800">Research Oracle</span>
            </div>
            <button
              onClick={() => { setMessages([]); setShowOnboarding(true); setSelectedPaper(null); }}
              className="text-sm text-slate-500 hover:text-indigo-600"
            >
              ← New Session
            </button>
          </div>
        )}

        {showOnboarding && messages.length === 0 ? <OnboardingView /> : <ChatView />}

        <div className="p-3 bg-white border-t border-slate-200">
          <div className="max-w-3xl mx-auto flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask about papers, trends, or insights..."
              className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              disabled={isLoading}
            />
            <Button
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Paper Detail Panel */}
      {selectedPaper && <PaperPanel />}
    </div>
  );
};

export default ChatInterface;
