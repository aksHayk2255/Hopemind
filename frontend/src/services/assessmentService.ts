import api from './api';
import { EPDSQuestion, AssessmentRecord } from '../types';

export interface AssessmentQuestionsResponse {
  instrument: string;
  source: string;
  instructions: string;
  disclaimer: string;
  questions: EPDSQuestion[];
}

export interface AssessmentSubmitResponse {
  message: string;
  assessment_id: number;
  total_score: number;
  screening_category: 'low' | 'moderate' | 'high';
  question_10_flag: boolean;
  clinical_recommendation: string;
  breakdown: any[];
  ml_prediction?: {
    predicted_risk_score?: number;
    probability?: number;
    predicted_category?: string;
    category?: string;
    clinical_guidance?: string;
    guidance?: string;
    top_features?: Array<{ feature: string; impact?: string; clinical_relevance?: string }>;
    disclaimer?: string;
    model_version?: string;
  };
  emergency_contacts?: any[];
}

export const assessmentService = {
  async getQuestions(): Promise<AssessmentQuestionsResponse> {
    const res = await api.get<AssessmentQuestionsResponse>('/assessments/questions');
    return res.data;
  },

  async submitAssessment(responses: number[], completionTimeSeconds: number = 60, notes?: string): Promise<AssessmentSubmitResponse> {
    const res = await api.post<{
      assessment: AssessmentRecord & {
        screening_category?: AssessmentRecord['risk_category'];
        question_10_flag?: boolean;
        clinical_action_recommended?: string;
      };
      ml_risk_assessment?: AssessmentSubmitResponse['ml_prediction'] & { risk_percentage?: string };
      critical_alert?: boolean;
    }>('/assessments/submit', {
      responses,
      completion_time_seconds: completionTimeSeconds,
      notes
    });
    const payload = res.data;
    const assessment = payload.assessment;
    const prediction = payload.ml_risk_assessment;
    return {
      message: 'Assessment submitted successfully',
      assessment_id: assessment.id,
      total_score: assessment.total_score,
      screening_category: assessment.screening_category || 'low',
      question_10_flag: payload.critical_alert ?? assessment.question_10_flag ?? false,
      clinical_recommendation: assessment.clinical_action_recommended || '',
      breakdown: assessment.responses || [],
      ml_prediction: prediction ? {
        ...prediction,
        predicted_risk_score: prediction.predicted_risk_score,
        predicted_category: prediction.category,
        clinical_guidance: prediction.guidance,
      } : undefined,
      emergency_contacts: [],
    };
  },

  async getHistory(): Promise<{ assessments: AssessmentRecord[] }> {
    const res = await api.get<{ assessments: AssessmentRecord[] }>('/assessments/history');
    return {
      assessments: res.data.assessments.map((assessment) => ({
        ...assessment,
        risk_category: assessment.risk_category || (assessment as AssessmentRecord & { screening_category?: AssessmentRecord['risk_category'] }).screening_category || 'low',
        q10_positive: assessment.q10_positive ?? (assessment as AssessmentRecord & { question_10_flag?: boolean }).question_10_flag ?? false,
        clinical_recommendation: assessment.clinical_recommendation || (assessment as AssessmentRecord & { clinical_action_recommended?: string }).clinical_action_recommended || '',
      })),
    };
  },

  async getById(id: number): Promise<{ assessment: AssessmentRecord }> {
    const res = await api.get<{ assessment: AssessmentRecord }>(`/assessments/${id}`);
    return res.data;
  }
};
