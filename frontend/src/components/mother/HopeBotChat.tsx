import React, { useState, useEffect, useRef } from 'react';
import {
  MessageCircleHeart,
  Send,
  Sparkles,
  ShieldAlert,
  Phone,
  Heart,
  Plus,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { chatService, ChatConversationItem } from '../../services/chatService';

interface HopeBotChatProps {
  onOpenEmergency: () => void;
}

export const HopeBotChat: React.FC<HopeBotChatProps> = ({ onOpenEmergency }) => {
  const [conversations, setConversations] = useState<ChatConversationItem[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [crisisAlert, setCrisisAlert] = useState<any | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const normalizeMessage = (message: any) => ({
    ...message,
    sender: message.sender || message.sender_type || 'assistant',
    message_text: message.message_text || message.text || '',
  });

  const suggestedPrompts = [
    'I feel completely exhausted and keep crying',
    'Is it normal to feel disconnected from my baby?',
    'How do I handle sleep deprivation without breaking down?',
    'I feel guilty for wanting a break from nursing'
  ];

  // Fetch conversations
  useEffect(() => {
    const fetchConvs = async () => {
      try {
        const res = await chatService.getConversations();
        if (res && res.conversations && res.conversations.length > 0) {
          setConversations(res.conversations);
          setActiveConvId(res.conversations[0].id);
        } else {
          // Create initial conversation
          const newConv = await chatService.createConversation('Emotional Support Space');
          setConversations([newConv.conversation]);
          setActiveConvId(newConv.conversation.id);
        }
      } catch (err) {
        console.error('Error fetching conversations:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchConvs();
  }, []);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (!activeConvId) return;
    const fetchActiveConv = async () => {
      try {
        const res = await chatService.getConversation(activeConvId);
        if (res && res.conversation && res.conversation.messages) {
          setMessages(res.conversation.messages.map(normalizeMessage));
        }
      } catch (e) {
        console.error('Error fetching messages:', e);
      }
    };
    fetchActiveConv();
  }, [activeConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleSendMessage = async (textToSend?: string) => {
    const msg = (textToSend || inputText).trim();
    if (!msg || !activeConvId || sending) return;

    setInputText('');
    setSending(true);

    // Optimistically add user message
    const tempUserMsg = {
      id: Date.now(),
      sender: 'user',
      message_text: msg,
      created_at: new Date().toISOString()
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await chatService.sendMessage(activeConvId, msg);

      setMessages((prev) => {
        const withoutTemporaryMessage = prev.filter((message) => message.id !== tempUserMsg.id);
        const serverUserMessage = normalizeMessage(res.user_message || tempUserMsg);
        const assistantMessage = res.assistant_message
          ? normalizeMessage(res.assistant_message)
          : null;
        return [...withoutTemporaryMessage, serverUserMessage, ...(assistantMessage ? [assistantMessage] : [])];
      });

      if (res.safety_intercepted) {
        setCrisisAlert(res.crisis_info);
      } else {
        setCrisisAlert(null);
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setMessages((prev) => prev.map((message) => (
        message.id === tempUserMsg.id
          ? { ...message, sendFailed: true }
          : message
      )));
    } finally {
      setSending(false);
    }
  };

  const handleNewConversation = async () => {
    try {
      const res = await chatService.createConversation('New Support Chat');
      setConversations((prev) => [res.conversation, ...prev]);
      setActiveConvId(res.conversation.id);
      setCrisisAlert(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteConversation = async (convId: number) => {
    try {
      await chatService.deleteConversation(convId);
      const remaining = conversations.filter((c) => c.id !== convId);
      setConversations(remaining);
      if (activeConvId === convId) {
        setActiveConvId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <MessageCircleHeart className="w-8 h-8 text-lavender-500 animate-pulse mx-auto mb-2" />
        <p className="text-sm text-slate-500">Connecting to HopeBot AI...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card overflow-hidden grid grid-cols-1 md:grid-cols-4 min-h-[620px]">
        {/* Left Conversations Sidebar */}
        <div className="md:col-span-1 border-r border-slate-100 bg-slate-50/60 p-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Conversations
              </span>
              <button
                onClick={handleNewConversation}
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-lavender-700 hover:border-lavender-300 shadow-xs transition-colors"
                title="Start New Conversation"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1.5 max-h-[460px] overflow-y-auto">
              {conversations.map((c) => {
                const isActive = c.id === activeConvId;
                return (
                  <div
                    key={c.id}
                    className={`group flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-lavender-100 text-lavender-900 border border-lavender-200 shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                    onClick={() => setActiveConvId(c.id)}
                  >
                    <span className="truncate pr-2">{c.title}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConversation(c.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-rose-600 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200/60">
            <button
              onClick={onOpenEmergency}
              className="w-full py-2 px-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              <Phone className="w-3.5 h-3.5" />
              Emergency Help
            </button>
          </div>
        </div>

        {/* Right Active Chat Panel */}
        <div className="md:col-span-3 flex flex-col justify-between h-[640px]">
          {/* Chat Header */}
          <div className="p-4 border-b border-slate-100 bg-white/80 backdrop-blur-md flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-lavender-600 to-teal-400 flex items-center justify-center text-white shadow-soft">
                <Heart className="w-4 h-4 fill-white/20" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">HopeBot Maternal AI</h2>
                <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active Empathy Listening
                </p>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 hidden sm:block">
              Free, Confidential Emotional Support
            </div>
          </div>

          {/* Crisis Interception Alert Banner */}
          {crisisAlert && (
            <div className="p-3 bg-rose-600 text-white text-xs flex items-center justify-between gap-3 px-6 animate-pulse">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>
                  Safety Flag Triggered: Please reach out immediately to <strong>Tele-MANAS (14416)</strong> or <strong>KIRAN (1800-599-0019)</strong>.
                </span>
              </div>
              <button
                onClick={onOpenEmergency}
                className="px-3 py-1 rounded-lg bg-white text-rose-700 font-bold text-[11px] shrink-0"
              >
                Call Lines
              </button>
            </div>
          )}

          {/* Messages Feed */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-warm-50/40">
            {messages.map((m, idx) => {
              const isAssistant = (m.sender || m.sender_type) === 'assistant';
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-2.5 ${isAssistant ? 'justify-start' : 'justify-end'}`}
                >
                  {isAssistant && (
                    <div className="w-7 h-7 rounded-xl bg-lavender-200 text-lavender-800 flex items-center justify-center shrink-0 mt-0.5 text-xs">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-md p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      isAssistant
                        ? 'chat-message-assistant text-slate-800 rounded-tl-none'
                        : 'chat-message-user text-white rounded-tr-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.message_text}</p>
                    <span
                      className={`text-[9px] mt-1.5 block text-right ${
                        isAssistant ? 'text-slate-400' : 'text-lavender-200'
                      }`}
                    >
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {m.sendFailed && (
                      <span className="mt-1 block text-right text-[9px] text-rose-200">
                        Could not send. Please try again.
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {sending && (
              <div className="flex items-center gap-2 text-slate-400 text-xs italic">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-lavender-500" />
                HopeBot is thinking compassionately...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Quick Prompt Chips */}
          <div className="px-6 py-2 border-t border-slate-100 bg-white flex items-center gap-2 overflow-x-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
              Suggestions:
            </span>
            {suggestedPrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(p)}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 hover:bg-lavender-50 hover:text-lavender-800 text-slate-600 border border-slate-200 shrink-0 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Message Input Box */}
          <div className="p-4 border-t border-slate-100 bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Share how you are feeling... (I'm listening with care)"
                className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm focus:border-lavender-500 focus:ring-2 focus:ring-lavender-200 outline-none transition-all"
              />

              <button
                type="submit"
                disabled={sending || !inputText.trim()}
                className="p-2.5 rounded-2xl bg-lavender-600 hover:bg-lavender-700 active:scale-95 text-white disabled:opacity-40 shadow-soft transition-all"
                title="Send Message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
