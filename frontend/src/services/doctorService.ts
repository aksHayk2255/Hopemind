import api from './api';

export interface DoctorPatientItem {
  assignment_id: number;
  mother_id: number;
  user_id: number;
  full_name: string;
  email: string;
  phone?: string;
  weeks_postpartum: number;
  infant_name?: string;
  delivery_date?: string;
  latest_assessment?: {
    id: number;
    score: number;
    category: 'low' | 'moderate' | 'high';
    question_10_flag: boolean;
    created_at: string;
  };
  clinical_status: 'stable' | 'review_required' | 'follow_up_scheduled' | 'monitor';
  pending_followups: number;
  assigned_at: string;
}

export interface DoctorPatientDetailResponse {
  patient: {
    mother_id: number;
    user_id: number;
    full_name: string;
    email: string;
    phone?: string;
    delivery_date?: string;
    weeks_postpartum: number;
    infant_name?: string;
    infant_gender?: string;
    parity?: number;
    delivery_type?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    journal_sharing_enabled: boolean;
  };
  assessments: any[];
  mood_history: any[];
  follow_ups: any[];
}

export const doctorService = {
  async getPatients(search?: string, category?: string): Promise<{ patients: DoctorPatientItem[]; total_assigned: number }> {
    const params = new URLSearchParams();
    if (search) params.append('q', search);
    if (category) params.append('category', category);
    const res = await api.get<{ patients: DoctorPatientItem[]; total_assigned: number }>(`/doctor/patients?${params.toString()}`);
    return res.data;
  },

  async getPatientDetail(motherId: number): Promise<DoctorPatientDetailResponse> {
    const res = await api.get<DoctorPatientDetailResponse>(`/doctor/patients/${motherId}`);
    return res.data;
  },

  async scheduleFollowUp(payload: {
    mother_id: number;
    scheduled_date: string;
    reason: string;
    clinical_notes?: string;
  }): Promise<{ message: string; follow_up: any }> {
    const res = await api.post<{ message: string; follow_up: any }>('/doctor/follow-ups', payload);
    return res.data;
  },

  async updateFollowUp(followUpId: number, payload: {
    status?: 'scheduled' | 'completed' | 'cancelled';
    clinical_notes?: string;
    scheduled_date?: string;
  }): Promise<{ message: string; follow_up: any }> {
    const res = await api.put<{ message: string; follow_up: any }>(`/doctor/follow-ups/${followUpId}`, payload);
    return res.data;
  },

  async listFollowUps(): Promise<{ follow_ups: any[] }> {
    const res = await api.get<{ follow_ups: any[] }>('/doctor/follow-ups');
    return res.data;
  }
};
