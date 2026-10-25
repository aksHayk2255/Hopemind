import api from './api';

export interface Professional {
  doctor_id: number;
  user_id: number;
  full_name: string;
  specialization: string;
  qualifications?: string;
  hospital_affiliation?: string;
  biography?: string;
  verification: { is_verified: boolean; consultation_modes: string[] };
}

export interface CareConnection {
  id: number;
  doctor_id: number;
  doctor_name: string;
  specialization?: string;
  status: 'pending' | 'accepted' | 'declined' | 'revoked';
}

export interface Consent {
  id: number;
  doctor_id: number;
  category: 'assessments' | 'mood' | 'reports';
  status: 'granted' | 'withdrawn';
  purpose: string;
}

export interface Appointment {
  id: number;
  doctor_id: number;
  doctor_name?: string;
  mother_name?: string;
  start_time: string;
  end_time: string;
  consultation_mode: string;
  status: 'requested' | 'confirmed' | 'declined' | 'cancelled' | 'completed';
  reason?: string;
}

export const collaborationService = {
  async getProfessionals(specialization?: string) {
    const res = await api.get<{ professionals: Professional[] }>('/collaboration/professionals', {
      params: specialization ? { specialization } : undefined,
    });
    return res.data;
  },
  async getConnections() {
    const res = await api.get<{ connections: CareConnection[] }>('/collaboration/connections');
    return res.data;
  },
  async requestConnection(doctorId: number) {
    const res = await api.post<{ connection: CareConnection }>('/collaboration/connections', { doctor_id: doctorId });
    return res.data;
  },
  async updateConnection(id: number, action: 'accept' | 'decline' | 'revoke' | 'cancel') {
    const res = await api.patch<{ connection: CareConnection }>(`/collaboration/connections/${id}`, { action });
    return res.data;
  },
  async getConsents() {
    const res = await api.get<{ consents: Consent[] }>('/collaboration/consents');
    return res.data;
  },
  async updateConsent(doctorId: number, category: Consent['category'], grant: boolean) {
    const res = await api.put<{ consent: Consent }>('/collaboration/consents', { doctor_id: doctorId, category, grant });
    return res.data;
  },
  async getAppointments() {
    const res = await api.get<{ appointments: Appointment[] }>('/collaboration/appointments');
    return res.data;
  },
  async requestAppointment(payload: { doctor_id: number; start_time: string; end_time: string; consultation_mode: string; reason?: string }) {
    const res = await api.post<{ appointment: Appointment }>('/collaboration/appointments', payload);
    return res.data;
  },
  async updateAppointment(id: number, action: 'confirm' | 'decline' | 'cancel' | 'complete') {
    const res = await api.patch<{ appointment: Appointment }>(`/collaboration/appointments/${id}`, { action });
    return res.data;
  },
};
