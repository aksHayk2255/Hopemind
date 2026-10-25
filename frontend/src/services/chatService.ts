import api from './api';

export interface ChatConversationItem {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  messages?: any[];
}

export interface ChatMessageResult {
  user_message: {
    id: number;
    message_text: string;
    created_at: string;
  };
  assistant_message: {
    id: number;
    message_text: string;
    created_at: string;
  };
  safety_intercepted: boolean;
  crisis_info?: {
    is_crisis: boolean;
    category: string;
    emergency_contacts: any[];
  };
}

export const chatService = {
  async getConversations(): Promise<{ conversations: ChatConversationItem[] }> {
    const res = await api.get<{ conversations: ChatConversationItem[] }>('/chat/conversations');
    return res.data;
  },

  async createConversation(title?: string): Promise<{ conversation: ChatConversationItem }> {
    const res = await api.post<{ conversation: ChatConversationItem }>('/chat/conversations', { title });
    return res.data;
  },

  async getConversation(id: number): Promise<{ conversation: ChatConversationItem }> {
    const res = await api.get<{ conversation: ChatConversationItem }>(`/chat/conversations/${id}`);
    return res.data;
  },

  async sendMessage(convId: number, message: string): Promise<ChatMessageResult> {
    const res = await api.post<ChatMessageResult>(`/chat/conversations/${convId}/messages`, { message });
    return res.data;
  },

  async deleteConversation(convId: number): Promise<{ message: string }> {
    const res = await api.delete<{ message: string }>(`/chat/conversations/${convId}`);
    return res.data;
  }
};
