import api from './api';
import { UserPrivacyPreference, EmergencyContact, NotificationItem } from '../types';

export const userService = {
  async getProfile(): Promise<any> {
    const res = await api.get('/user/profile');
    return res.data;
  },

  async updateProfile(data: Record<string, any>): Promise<any> {
    const res = await api.put('/user/profile', data);
    return res.data;
  },

  async getPrivacy(): Promise<{ privacy_preferences: UserPrivacyPreference }> {
    const res = await api.get<{ privacy_preferences: UserPrivacyPreference }>('/user/privacy');
    return res.data;
  },

  async updatePrivacy(preferences: Partial<UserPrivacyPreference>): Promise<{ message: string; privacy_preferences: UserPrivacyPreference }> {
    const res = await api.put<{ message: string; privacy_preferences: UserPrivacyPreference }>('/user/privacy', preferences);
    return res.data;
  },

  async getEmergencyContacts(): Promise<{ contacts: EmergencyContact[]; disclaimer: string }> {
    const res = await api.get<{ contacts: EmergencyContact[]; disclaimer: string }>('/user/emergency-contacts');
    return res.data;
  },

  async getNotifications(): Promise<{ notifications: NotificationItem[] }> {
    const res = await api.get<{ notifications: NotificationItem[] }>('/notifications');
    return res.data;
  },

  async markNotificationRead(id: number): Promise<{ message: string }> {
    const res = await api.put<{ message: string }>(`/notifications/${id}/read`);
    return res.data;
  }
};
