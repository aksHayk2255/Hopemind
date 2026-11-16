import api from './api';
import { WeeklyReportPreviewResponse } from '../types';

export const reportService = {
  /**
   * Fetches JSON preview for the selected weekly period.
   */
  async getWeeklyPreview(
    startDate?: string,
    endDate?: string,
    motherId?: number
  ): Promise<WeeklyReportPreviewResponse> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (motherId) params.append('mother_id', motherId.toString());

    const res = await api.get<WeeklyReportPreviewResponse>(`/reports/weekly/preview?${params.toString()}`);
    return res.data;
  },

  /**
   * Downloads the generated Weekly Wellness Report PDF.
   */
  async downloadWeeklyReportPdf(
    startDate?: string,
    endDate?: string,
    motherId?: number
  ): Promise<void> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (motherId) params.append('mother_id', motherId.toString());

    const res = await api.get(`/reports/weekly?${params.toString()}`, {
      responseType: 'blob',
    });

    // Create a temporary anchor element to trigger download
    const blob = new Blob([res.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    const startFormatted = startDate ? startDate.replace(/-/g, '') : 'start';
    const endFormatted = endDate ? endDate.replace(/-/g, '') : 'end';
    link.download = `HopeMind_Weekly_Wellness_Report_${startFormatted}_${endFormatted}.pdf`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /**
   * Explicitly shares the Weekly Wellness Report with the assigned doctor.
   */
  async shareReportWithDoctor(
    startDate: string,
    endDate: string,
    doctorId?: number
  ): Promise<{ message: string; shared_at: string; doctor?: any }> {
    const res = await api.post('/reports/share', {
      start_date: startDate,
      end_date: endDate,
      doctor_id: doctorId,
    });
    return res.data;
  },
};

