'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  X,
  Minimize2,
  Maximize2,
  MessageSquare,
  FileText,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { Button, Spinner } from '@/components/ui';
import { useChatStore } from '@/lib/store';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Array<{
    source: string;
    page?: number;
  }>;
  timestamp: Date;
}

interface MissionBotWidgetProps {
  contextHint?: string; // Provide context about current page/section
}

export function MissionBotWidget({ contextHint }: MissionBotWidgetProps) {
  const { isOpen, setOpen, isLoading, setLoading } = useChatStore();
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hi! I'm Mission-Bot. I can help you with:
- ACCJC accreditation standards
- ISMP strategic goals
- Program review guidance

What would you like to know?`,
      timestamp: new Date(),
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Simulate API response
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Generate contextual response
      let responseContent = '';
      let citations: Message['citations'] = [];
      const lowerInput = input.toLowerCase();

      if (lowerInput.includes('equity') || lowerInput.includes('gap')) {
        responseContent = `For equity gaps, refer to:

**ACCJC Standard I.B.6** - Requires analysis of disaggregated data and action on identified gaps.

**ISMP Goal 3.3** - Specifically targets reducing equity gaps for disproportionately impacted students.

Your action plans should link to Goal 3.3 when addressing equity concerns.`;
        citations = [
          { source: 'ACCJC Standards', page: 23 },
          { source: 'CCC ISMP', page: 45 },
        ];
      } else if (lowerInput.includes('accjc') || lowerInput.includes('standard')) {
        responseContent = `ACCJC Standards are organized into 4 areas:

**I** - Mission & Effectiveness
**II** - Student Programs & Services
**III** - Resources
**IV** - Leadership & Governance

Which standard would you like details on?`;
        citations = [{ source: 'ACCJC Standards', page: 1 }];
      } else if (lowerInput.includes('ismp') || lowerInput.includes('goal')) {
        responseContent = `CCC's 5 ISMP Strategic Goals:

1. **Expand Access**
2. **Student-Centered Institution**
3. **Student Success & Equity**
4. **Organizational Effectiveness**
5. **Financial Stability**

All program goals must link to one of these (the Golden Thread).`;
        citations = [{ source: 'CCC ISMP', page: 12 }];
      } else {
        responseContent = `I can help with ACCJC standards and ISMP goals. Try asking:
- "What does ACCJC Standard I.B.6 require?"
- "Which ISMP goal relates to equity?"
- "How do I address equity gaps?"`;
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseContent,
        citations,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Floating button when closed
  if (!isOpen) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-lamc-blue text-white rounded-full shadow-lg hover:bg-blue-800 transition-all hover:scale-105 flex items-center justify-center z-50 group"
        title="Open Mission-Bot"
      >
        <Bot className="w-7 h-7" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-lamc-gold rounded-full animate-pulse" />
        <span className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Ask Mission-Bot
        </span>
      </button>
    );
  }

  // Minimized state
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 bg-lamc-blue text-white rounded-full shadow-lg px-4 py-2 flex items-center gap-3 z-50">
        <Bot className="w-5 h-5" />
        <span className="text-sm font-medium">Mission-Bot</span>
        <button
          onClick={() => setIsMinimized(false)}
          className="p-1 hover:bg-white/20 rounded transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => setOpen(false)}
          className="p-1 hover:bg-white/20 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Full chat widget
  return (
    <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="bg-lamc-blue text-white p-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Mission-Bot</h3>
            <p className="text-xs text-blue-200">Compliance Copilot</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 hover:bg-white/20 rounded transition-colors"
            title="Minimize"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 hover:bg-white/20 rounded transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Context hint */}
      {contextHint && (
        <div className="bg-blue-50 px-3 py-2 text-xs text-blue-700 border-b border-blue-100 flex items-center gap-2 flex-shrink-0">
          <Sparkles className="w-3 h-3" />
          Context: {contextHint}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 ${
                message.role === 'user'
                  ? 'bg-lamc-blue text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-900 rounded-bl-sm'
              }`}
            >
              <div className="text-sm whitespace-pre-wrap">
                {message.content.split('**').map((part, i) =>
                  i % 2 === 1 ? (
                    <strong key={i}>{part}</strong>
                  ) : (
                    <span key={i}>{part}</span>
                  )
                )}
              </div>
              {message.citations && message.citations.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200/50 flex flex-wrap gap-1">
                  {message.citations.map((citation, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-xs bg-white/80 px-2 py-0.5 rounded text-gray-600"
                    >
                      <FileText className="w-3 h-3" />
                      {citation.source}
                      {citation.page && ` p.${citation.page}`}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-xl rounded-bl-sm px-3 py-2">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Spinner size="sm" />
                <span>Thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length <= 2 && (
        <div className="px-3 pb-2 flex gap-1 flex-wrap flex-shrink-0">
          {[
            'What is ACCJC I.B.6?',
            'ISMP Goal 3',
            'Equity gaps',
          ].map((q) => (
            <button
              key={q}
              onClick={() => setInput(q)}
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-gray-200 flex-shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about standards, goals..."
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lamc-blue focus:border-transparent"
            disabled={isLoading}
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default MissionBotWidget;
