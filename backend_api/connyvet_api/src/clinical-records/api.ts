// src/clinical-records/api.ts
import { apiFetch } from '../api';
import type { ClinicalRecord } from './types';

export async function fetchClinicalRecord(
  token: string,
  patientId: number,
): Promise<ClinicalRecord> {
  return apiFetch(`/patients/${patientId}/clinical-record`, {
    method: 'GET',
    token,
  });
}
