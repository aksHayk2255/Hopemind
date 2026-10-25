import api from './api';

export interface PlatformStatistics {
  total_users: number;
  mothers: number;
  doctors: number;
  admins: number;
  total_assessments: number;
  high_risk_screenings: number;
  total_mood_entries: number;
  total_chat_conversations: number;
  total_follow_ups: number;
}

export interface SystemUser {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface AuditLogEntry {
  id: number;
  user_id: number;
  action: string;
  resource_type: string;
  resource_id?: number;
  details?: string;
  ip_address?: string;
  created_at: string;
}

export const adminService = {
  async getStats(): Promise<{ platform_statistics: PlatformStatistics }> {
    const res = await api.get<{ platform_statistics: PlatformStatistics }>('/admin/stats');
    return res.data;
  },

  async getUsers(search?: string, role?: string): Promise<{ users: SystemUser[]; total_users: number }> {
    const params = new URLSearchParams();
    if (search) params.append('q', search);
    if (role) params.append('role', role);
    const res = await api.get<{ users: SystemUser[]; total_users: number }>(`/admin/users?${params.toString()}`);
    return res.data;
  },

  async toggleUserStatus(userId: number, isActive?: boolean): Promise<{ message: string; user: SystemUser }> {
    const res = await api.put<{ message: string; user: SystemUser }>(`/admin/users/${userId}/status`, { is_active: isActive });
    return res.data;
  },

  async updateUserRole(userId: number, role: 'mother' | 'doctor' | 'admin'): Promise<{ message: string; user: SystemUser }> {
    const res = await api.put<{ message: string; user: SystemUser }>(`/admin/users/${userId}/role`, { role });
    return res.data;
  },

  async getAuditLogs(limit: number = 50): Promise<{ audit_logs: AuditLogEntry[] }> {
    const res = await api.get<{ audit_logs: AuditLogEntry[] }>(`/admin/audit-logs?limit=${limit}`);
    return res.data;
  },

  async getModelInfo(): Promise<any> {
    const res = await api.get('/ml/model-info');
    return res.data;
  }
};
