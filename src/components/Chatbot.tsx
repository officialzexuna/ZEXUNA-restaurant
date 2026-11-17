import React, { useState } from 'react';
import { Bot, Send, Sparkles, X } from 'lucide-react';
import { sendAssistantMessage, type ChatTurn } from '../services/gemini';

const SUGGESTED_QUESTIONS = [
  'What biryanis are on the menu and what are their prices?',
  'Which vegetarian dishes do you recommend?',
  'Tell me about The Great Biryani Price Drop offer.',
  'What are your opening hours and how do I reserve a table?',
];

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<ChatTurn[]>([
    {
      sender: 'ASSISTANT',
      content:
        'Welcome to ZEXUNA Restaurant. I am your ZEXUNA AI Restaurant Assistant. Ask me about our live menu prices, vegetarian dishes, active biryani offers, opening hours, WhatsApp ordering, or let me help reserve your table.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitPrompt(text: string) {
    const clean = text.trim();
    if (!clean || loading) return;
    setError(null);
    const nextHistory: ChatTurn[] = [...messages, { sender: 'USER', content: clean }];
    setMessages(nextHistory);
    setInput('');
    setLoading(true);

    try {
      const res = await sendAssistantMessage({
        conversationId,
        message: clean,
        history: messages,
      });
      setConversationId(res.conversationId);
      setMessages([...nextHistory, { sender: 'ASSISTANT', content: res.reply }]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to reach ZEXUNA AI Restaurant Assistant right now.'
      );
    } finally {
      setLoading(false);
    }
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    void submitPrompt(input);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? 'Close ZEXUNA AI Assistant' : 'Open ZEXUNA AI Assistant'}
        aria-expanded={open}
        className="fixed bottom-4 right-[64px] sm:right-[154px] z-40 inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 h-10 sm:h-11 bg-[#C9A45C] text-[#090909] text-xs font-semibold tracking-wider uppercase shadow-lg hover:bg-[#E6CC91] transition-colors"
      >
        <Sparkles className="w-4 h-4 shrink-0" />
        <span className="whitespace-nowrap">ZEXUNA AI</span>
      </button>

      {open && (
        <aside
          aria-label="ZEXUNA AI Restaurant Assistant"
          className="fixed bottom-20 right-4 sm:right-5 z-50 w-[calc(100vw-2rem)] sm:w-[400px] h-[540px] max-h-[75vh] bg-[#121212] border border-[#C9A45C]/50 shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="px-4 py-3.5 bg-[#090909] border-b border-[#C9A45C]/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Bot className="w-5 h-5 text-[#C9A45C]" />
              <div>
                <h2 className="font-display text-sm font-semibold text-white">
                  ZEXUNA AI Restaurant Assistant
                </h2>
                <p className="text-[11px] text-[#B8B8B8]">Live menu, offers & table booking</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat window"
              className="p-1.5 text-[#B8B8B8] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.sender === 'USER' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.sender === 'USER'
                      ? 'bg-[#C9A45C] text-[#090909] font-medium'
                      : 'bg-[#1C1C1C] text-white border border-white/10'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {messages.length === 1 && (
              <div className="pt-2 space-y-2">
                <p className="text-[11px] text-[#B8B8B8]">Suggested questions:</p>
                <div className="flex flex-col gap-1.5">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => void submitPrompt(q)}
                      className="text-left text-xs px-3 py-2 bg-[#090909] border border-[#C9A45C]/25 text-[#E6CC91] hover:border-[#C9A45C] transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="px-3.5 py-2 bg-[#1C1C1C] border border-white/10 text-xs text-[#E6CC91]">
                  Consulting live menu & tables...
                </div>
              </div>
            )}

            {error && (
              <div role="alert" className="p-3 bg-red-950/40 border border-red-500/40 text-xs text-red-300">
                {error}
              </div>
            )}
          </div>

          {/* Composer */}
          <form onSubmit={handleFormSubmit} className="p-3 bg-[#090909] border-t border-white/10 flex gap-2">
            <label htmlFor="chatbot-input" className="sr-only">
              Ask ZEXUNA AI Restaurant Assistant
            </label>
            <input
              id="chatbot-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about dishes, prices, or reservations..."
              className="flex-1 px-3 py-2 bg-[#121212] border border-white/15 text-xs text-white placeholder:text-[#B8B8B8]/50 focus:outline-none focus:border-[#C9A45C]"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="px-3.5 py-2 bg-[#C9A45C] text-[#090909] hover:bg-[#E6CC91] transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </aside>
      )}
    </>
  );
}
