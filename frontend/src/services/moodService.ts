import api from './api';
import { MoodEntry } from '../types';

export interface CreateMoodPayload {
  mood: 'very_sad' | 'sad' | 'neutral' | 'happy' | 'very_happy';
  sleep_hours: number;
  energy_level?: 'low' | 'moderate' | 'high';
  journal_text?: string;
  entry_date?: string;
}

export interface MoodAnalyticsResponse {
  has_data: boolean;
  message?: string;
  average_mood_score: number;
  average_sleep_hours: number;
  entries_count: number;
  entries: MoodEntry[];
  common_themes?: { theme: string; count: number }[];
}

export const moodService = {
  async logMood(payload: CreateMoodPayload): Promise<{ message: string; entry: MoodEntry }> {
    const res = await api.post<{ message: string; entry: MoodEntry }>('/moods', payload);
    return res.data;
  },

  async getEntries(limit: number = 30): Promise<{ entries: MoodEntry[] }> {
    const res = await api.get<{ entries: MoodEntry[] }>(`/moods?limit=${limit}`);
    return res.data;
  },

  async getAnalytics(days: number = 14): Promise<MoodAnalyticsResponse> {
    const res = await api.get<MoodAnalyticsResponse>(`/moods/analytics?days=${days}`);
    return res.data;
  },

  async deleteEntry(entryId: number): Promise<{ message: string }> {
    const res = await api.delete<{ message: string }>(`/moods/${entryId}`);
    return res.data;
  }
};
