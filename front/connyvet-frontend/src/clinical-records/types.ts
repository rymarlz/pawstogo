// src/clinical-records/types.ts
import type { Patient } from '../clinic/types';
import type { Tutor } from '../tutores/types';
import type { Consultation } from '../consultations/types';
import type { VaccineApplication } from '../vaccines/types';
import type { Hospitalization } from '../hospitalizations/types';

export interface ClinicalRecord {
  patient: Patient;
  tutor: Tutor | null;
  consultations: Consultation[];
  vaccine_applications: VaccineApplication[];
  hospitalizations: Hospitalization[];
}
