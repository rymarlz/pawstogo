/**
 * Etiquetas centralizadas para ficha clínica y consultas (web + referencia App/mobile).
 * No hardcodear strings repetidas.
 */

export const LABELS_CLINICAL = {
  reason: 'Motivo de consulta',
  anamnesis: 'Anamnesis',
  anamnesisActual: 'Anamnesis actual',
  diagnosis: 'Diagnóstico',
  treatment: 'Tratamiento',
  procedure: 'Procedimiento',
  recommendations: 'Recomendaciones',
  indications: 'Indicaciones',
  physicalExam: 'Exámenes',
  physicalExamFull: 'Examen clínico',
  species: 'Especie',
  typePatient: 'Especie', // reemplazo de "Tipo de paciente"
} as const;

/**
 * Normaliza sexo para mostrar: Hembra / Macho / —
 */
export function sexDisplay(sex: string | null | undefined): string {
  if (sex == null || sex === '') return '—';
  const s = String(sex).trim().toLowerCase();
  if (s === 'h' || s === 'hembra') return 'Hembra';
  if (s === 'm' || s === 'macho') return 'Macho';
  return sex;
}

/**
 * Especie para mostrar (capitalizada). Si viene species_display del API, usarla.
 */
export function speciesDisplay(
  species: string | null | undefined,
  speciesDisplayFromApi?: string | null
): string {
  if (speciesDisplayFromApi != null && speciesDisplayFromApi !== '')
    return speciesDisplayFromApi;
  if (species == null || species === '') return '—';
  const s = String(species).trim();
  if (s === '') return '—';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
