
import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your AI research assistant. I can help you search through pharmaceutical research papers, find relevant studies, and analyze research trends. What would you like to explore today?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Send to Supabase Edge Function
    try {
      const response = await supabase.functions.invoke('chat-with-deepseek', {
        body: { messages: [...messages, userMessage] },
      });

      if (response.error) throw response.error;

      // Handle streaming response (simplified for now, assumes text response)
      // Note: For true streaming, we'd need to use a reader. 
      // Current Supabase JS client handles basic invoke well, but for streaming verify support.
      // Let's implement a basic non-streaming handled first or manual fetch if needed.

      // Actually, let's implement the reader for the stream:
      // Since supabase-js invoke returns a JSON object usually, for streaming we might need raw fetch or 
      // set responseType option.

      // Let's rely on standard fetch to the function URL for streaming if ease is key, 
      // BUT supabase.functions.invoke DOES support responseType: 'stream'.

      // For this first pass, let's just get the text back to ensure connection works.
      const { data, error } = await supabase.functions.invoke('chat-with-deepseek', {
        body: { messages: [...messages, userMessage] },
      });

      if (error) throw error;

      // The Edge Function returns a stream, but invoke might buffer if not handled.
      // Let's assume standard JSON response for safety in first iteration, 
      // OR handle the text directly. The function returns `new Response(body, ...)` so it IS a stream.

      // Let's use the text directly for now.
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '', // Will stream in
        timestamp: new Date()
      };

      // Temporary solution: Non-streaming wait (safe)
      // To Stream properly we need to parse the ReadableStream.
      // Let's just set the final content for now to minimize complexity in step 1.
      const reader = data.body?.getReader();
      // ... simplified for reliability ...

      // WAIT! accessing data.body directly on invoke output might be tricky depending on version.
      // Let's assume we get the full text for now to match the user's "Implement this" request simply.
      // Wait, the edge function returns `response.body` which is a stream.

      // Let's do a robust non-streaming fetch first to prove connectivity.
      const aiContent = await new Response(data).text(); // If data is the body stream/blob

      // Actually, let's look at `supabase.ts`. We need to import `supabase` client.
      // We haven't imported it in this file yet!
    } catch (error) {
      console.error("Error calling AI:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I encountered an error connecting to the AI.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="p-6 border-b bg-white">
        <h2 className="text-2xl font-bold text-gray-900">AI Research Assistant</h2>
        <p className="text-gray-600 mt-1">Ask questions about pharmaceutical research papers</p>
      </div>

      <ScrollArea ref={scrollAreaRef} className="flex-1 p-6">
        <div className="space-y-6 max-w-4xl mx-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start space-x-4 ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
            >
              <div className={`p-2 rounded-full ${message.role === 'user' ? 'bg-blue-100' : 'bg-green-100'
                }`}>
                {message.role === 'user' ? <User size={20} /> : <Bot size={20} />}
              </div>
              <div className={`flex-1 p-4 rounded-lg ${message.role === 'user'
                ? 'bg-blue-600 text-white ml-auto max-w-md'
                : 'bg-white border border-gray-200'
                }`}>
                <p className="text-sm">{message.content}</p>
                <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start space-x-4">
              <div className="p-2 rounded-full bg-green-100">
                <Bot size={20} />
              </div>
              <div className="flex-1 p-4 rounded-lg bg-white border border-gray-200">
                <div className="flex items-center space-x-2">
                  <Loader2 className="animate-spin" size={16} />
                  <p className="text-sm text-gray-600">AI is thinking...</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-6 border-t bg-white">
        <div className="flex space-x-4 max-w-4xl mx-auto">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about pharmaceutical research papers..."
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
            <Send size={20} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
