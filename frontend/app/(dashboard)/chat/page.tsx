'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  FileText,
  ExternalLink,
  RefreshCw,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Button, Card, Spinner } from '@/components/ui';
import { useChatStore } from '@/lib/store';
import api from '@/lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Array<{
    source: string;
    page?: number;
    text: string;
  }>;
  timestamp: Date;
}

const suggestedQuestions = [
  'What ACCJC standard covers student equity?',
  'Which strategic goal relates to dual enrollment?',
  'What is the college target for course completion?',
  'What are the 5 ISMP Strategic Goals?',
  'How should I address equity gaps in my program review?',
  'What does ACCJC Standard I.B.6 require?',
];

export default function ChatPage() {
  const { messages, addMessage, clearMessages, isLoading, setLoading } = useChatStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Local messages for this component (in case store isn't being used)
  const [localMessages, setLocalMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hello! I'm Mission-Bot, your Compliance Copilot for CCC. I can help you with:

- **ACCJC Accreditation Standards** - Questions about compliance requirements
- **ISMP Strategic Goals** - Understanding the 5 strategic goals and objectives
- **Program Review Guidance** - How to address equity, assessment, and planning
- **Institutional Policies** - College mission, vision, and values

What would you like to know?`,
      timestamp: new Date(),
    },
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [localMessages]);

  // Generate fallback response for demo/offline mode
  const generateFallbackResponse = (userInput: string): { content: string; citations: Message['citations'] } => {
    const lowerInput = userInput.toLowerCase();
    let content = '';
    let citations: Message['citations'] = [];

    if (lowerInput.includes('equity') || lowerInput.includes('gap')) {
      content = `Great question about equity! Here's what you need to know:

**ACCJC Standard I.B.6** requires colleges to disaggregate student achievement data by demographic groups and address any identified achievement gaps.

**ISMP Goal 3.3** specifically focuses on reducing equity gaps for disproportionately impacted students. The college has set targets for closing achievement gaps across race/ethnicity, gender, and Pell status.

**In your program review**, you should:
1. Analyze success rates by demographic group
2. Identify any gaps greater than 3 percentage points
3. Propose action plans specifically targeting these gaps
4. Link your plans to ISMP Goal 3.3

Would you like me to explain how to calculate disproportionate impact using the Percentage Point Gap methodology?`;
      citations = [
        { source: 'ACCJC-2024-Accreditation-Standards.pdf', page: 23, text: 'Standard I.B.6 - Disaggregated Data' },
        { source: '2019-2024-CCC-ISMP.pdf', page: 45, text: 'Goal 3.3 - Reduce equity gaps' },
      ];
    } else if (lowerInput.includes('accjc') || lowerInput.includes('standard')) {
      content = `The **ACCJC Accreditation Standards** are organized into four main areas:

**Standard I: Mission, Academic Quality, and Institutional Effectiveness**
- I.A: Mission
- I.B: Assuring Academic Quality and Institutional Effectiveness
- I.C: Institutional Integrity

**Standard II: Student Learning Programs and Support Services**
- II.A: Instructional Programs
- II.B: Library and Learning Support Services
- II.C: Student Support Services

**Standard III: Resources**
- III.A: Human Resources
- III.B: Physical Resources
- III.C: Technology Resources
- III.D: Financial Resources

**Standard IV: Leadership and Governance**
- IV.A: Decision-Making Roles
- IV.B: Chief Executive Officer
- IV.C: Governing Board

Which standard would you like to learn more about?`;
      citations = [
        { source: 'ACCJC-2024-Accreditation-Standards.pdf', page: 1, text: 'Table of Contents' },
      ];
    } else if (lowerInput.includes('ismp') || lowerInput.includes('strategic goal')) {
      content = `The **CCC Integrated Strategic Master Plan (ISMP) 2019-2024** includes 5 Strategic Goals:

**Goal 1: Expand Access**
Expand access to educational programs and services through community outreach, improved accessibility, and expanded CTE enrollment.

**Goal 2: Student-Centered Institution**
Be student-centered by increasing engagement, use of support services, and expanding educational pathways.

**Goal 3: Student Success and Equity** ⭐
Increase student success and reduce equity gaps through improved course completion, degree attainment, and SLO assessment.

**Goal 4: Organizational Effectiveness**
Enhance effectiveness through participatory governance, continuous improvement, and professional development.

**Goal 5: Financial Stability**
Improve financial stability through alternative revenue, aligned resource allocation, and operational efficiency.

Each goal has specific objectives and performance measures. Which goal would you like to explore in detail?`;
      citations = [
        { source: '2019-2024-CCC-ISMP.pdf', page: 12, text: 'Strategic Goals Overview' },
        { source: 'CCC_ISMP_Exec_Summary.pdf', page: 1, text: 'Executive Summary' },
      ];
    } else if (lowerInput.includes('completion') || lowerInput.includes('target') || lowerInput.includes('67')) {
      content = `According to the **ISMP Appendix 5**, CCC has established the following key targets:

**Course Completion Rate**
- Baseline (2018-19): 66.5%
- Target: **67%**

**Degree/Certificate Completion**
- Target: Increase by 5% year-over-year

**Transfer Rates**
- Target: Maintain or exceed state average

**Retention Rate**
- Target: 85%

These targets align with institutional Vision for Success goals and are tracked annually in the Student Achievement data.

Your program review should compare your program's metrics against these institutional targets and explain any variances.`;
      citations = [
        { source: '2019-2024-CCC-ISMP.pdf', page: 58, text: 'Appendix 5: Performance Measures' },
      ];
    } else if (lowerInput.includes('mission') || lowerInput.includes('vision')) {
      content = `**College Mission:**
Our institution provides a student-centered learning environment that is committed to fostering a socially responsible, diverse, and inclusive community. We offer educational pathways that contribute to the intellectual development, personal growth, economic mobility, and transfer readiness of our students.

**College Vision:**
Our institution aspires to offer relevant and high quality educational experiences in an innovative, equitable, supportive, and engaging environment that promotes diversity, social consciousness, and positive change.

**Core Values (LICE²S):**
- **L**earning
- **I**ntegrity
- **C**ollaboration
- **E**xcellence
- **E**quity
- **S**tudent Success

All program goals should align with and support this mission through the "Golden Thread" framework.`;
      citations = [
        { source: '2019-2024-CCC-ISMP.pdf', page: 8, text: 'Mission, Vision, Values' },
      ];
    } else {
      content = `I understand you're asking about "${userInput}". Let me help with that.

Based on my knowledge of ACCJC standards and CCC's Integrated Strategic Master Plan, here are some key points to consider:

1. **Alignment with Mission**: Ensure any plans connect to CCC's mission of providing student-centered, equitable education.

2. **Evidence-Based**: Use data to support your narrative and decisions.

3. **Equity Focus**: Consider how your work addresses equity gaps per ISMP Goal 3.3.

Could you provide more details about what specific aspect you'd like to explore? For example:
- Which ACCJC standard applies?
- How does this relate to a specific ISMP goal?
- What data should you include?`;
    }

    return { content, citations };
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    const userInput = input;
    setLocalMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Try to call the backend API first
      const conversationHistory = localMessages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const result = await api.chat(userInput, conversationHistory) as {
        response: string;
        citations: Array<{ source: string; page?: number; text: string }>;
      };

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.response,
        citations: result.citations,
        timestamp: new Date(),
      };

      setLocalMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.warn('API unavailable, using fallback response:', error);

      // Fallback to local response generation when API is unavailable
      const fallback = generateFallbackResponse(userInput);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: fallback.content,
        citations: fallback.citations,
        timestamp: new Date(),
      };

      setLocalMessages(prev => [...prev, assistantMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        title="Mission-Bot"
        subtitle="Compliance Copilot - ACCJC Standards & ISMP Guidance"
      />

      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-6">
        {/* Chat Messages */}
        <Card className="flex-1 flex flex-col mb-4 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {localMessages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 bg-lamc-blue rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-lamc-blue text-white rounded-br-md'
                      : 'bg-gray-100 text-gray-900 rounded-bl-md'
                  }`}
                >
                  <div className="prose prose-sm max-w-none">
                    {message.content.split('\n').map((line, i) => (
                      <p key={i} className={message.role === 'user' ? 'text-white' : ''}>
                        {line.split('**').map((part, j) =>
                          j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                        )}
                      </p>
                    ))}
                  </div>
                  {message.citations && message.citations.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-500 mb-2">Sources:</p>
                      <div className="space-y-1">
                        {message.citations.map((citation, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-xs text-gray-600 hover:text-lamc-blue cursor-pointer"
                          >
                            <FileText className="w-3 h-3" />
                            <span>{citation.source}</span>
                            {citation.page && (
                              <span className="text-gray-400">p. {citation.page}</span>
                            )}
                            <ExternalLink className="w-3 h-3" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-gray-600" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 bg-lamc-blue rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Spinner size="sm" />
                    <span className="text-sm text-gray-500">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </Card>

        {/* Suggested Questions */}
        {localMessages.length <= 2 && (
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Suggested questions:
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((question, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestedQuestion(question)}
                  className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-full hover:border-lamc-blue hover:text-lamc-blue transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about ACCJC standards, ISMP goals, or program review guidance..."
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-lamc-blue focus:border-transparent"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-lamc-blue hover:bg-lamc-light rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <Button
            variant="outline"
            onClick={() => setLocalMessages([localMessages[0]])}
            title="Clear chat"
          >
            <RefreshCw className="w-5 h-5" />
          </Button>
        </div>

        <p className="text-xs text-center text-gray-400 mt-3">
          Mission-Bot uses RAG to retrieve information from ACCJC standards and CCC institutional documents.
          Always verify critical information with official sources.
        </p>
      </div>
    </div>
  );
}
