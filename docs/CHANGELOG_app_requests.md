# Changelog – Solicitudes Software y App (ConnyVet)

Cambios implementados según requerimientos del cliente: Software (web), App (mobile) y contrato API para consumo desde la app móvil.

---

## 1. N.º de ficha del paciente

- **Definición:** El “N.º de ficha” se define como el **ID del paciente** (`patient.id`). No existe campo `file_number`/`record_number` en BD; se expone como `file_number` en la API (valor = id) para compatibilidad futura.
- **Backend:**
  - Modelo `Patient`: accessor `file_number` (devuelve `id`).
  - Respuestas de pacientes (index/show) y ficha clínica incluyen `file_number`.
- **Front web:**
  - Detalle de paciente y ficha clínica muestran “N.º de ficha: {file_number}”.
- **Mobile:** La API devuelve `file_number` en `GET /patients`, `GET /patients/{id}` y en la ficha clínica; la app puede mostrarlo en resúmenes.

---

## 2. Próximas citas (bug corregido)

- **Problema:** Las citas creadas en BD no aparecían en “próximas citas” / “citas de hoy”.
- **Causas abordadas:**
  - Timezone: el backend usaba UTC. Ahora usa **America/Santiago** (`APP_TIMEZONE` en `.env`).
  - Filtro “upcoming”: no existía. Ahora existe.
- **Backend:**
  - `config/app.php`: `timezone` = `env('APP_TIMEZONE', 'America/Santiago')`.
  - `.env.example`: añadido `APP_TIMEZONE=America/Santiago`.
  - `ConsultationController::index`:
    - Filtros `date_from` / `date_to` siguen usando la timezone de la app.
    - Nuevo parámetro **`upcoming=1`**: devuelve citas con `date >= now() - 5 min`, `status != anulada`, `active = true`, orden ascendente por fecha.
  - Tests: `tests/Feature/ConsultationFiltersTest.php` (upcoming incluye cita futura; filtro `patient_id`).
- **Front web:**
  - Tipos y API de consultas admiten `upcoming?: boolean` en filtros.
  - Dashboard “Citas de hoy” sigue usando `date_from` y `date_to` con la fecha local; el backend interpreta fechas en America/Santiago.

---

## 3. Contexto de mascota (filtrar por paciente)

- **Requerimiento:** Al entrar a una mascota (por foto/perfil), en Citas, Vacunas y Ficha clínica debe mostrarse solo la info de esa mascota.
- **Backend (ya soportado):**
  - `GET /consultations?patient_id=` — filtro por paciente.
  - `GET /vaccine-applications?patient_id=` — filtro por paciente.
  - Ficha clínica: `GET /patients/{patient}/clinical-record` — ya es por paciente.
- **Front web:**
  - Detalle de paciente: bloque “Ver solo esta mascota” con enlaces a:
    - **Citas:** `/dashboard/consultas?patient_id={id}`
    - **Vacunas:** `/dashboard/vacunas?patient_id={id}`
    - **Ficha clínica:** `/dashboard/fichas/{id}`
  - `ConsultationListPage` lee `patient_id` de la query y lo envía en los filtros a la API.
  - `VaccineApplicationListPage` ya leía `patient_id` de la URL.
- **Mobile:** Los mismos endpoints aceptan `patient_id`; la app puede abrir Citas/Vacunas/Ficha filtrando por `patient_id`.

---

## 4. Normalización sexo, especie y dirección del tutor

- **Sexo:** Mostrar “Hembra” / “Macho” aunque en BD venga “h”/“H”/“m”/“M”.
  - Backend: accessor `Patient::sex_display` (Hembra/Macho/—).
  - Front: `lib/labels.ts` → `sexDisplay()` y uso de `sex_display` cuando viene de la API.
- **Especie:** Donde decía “Tipo de paciente” se renombra a **“Especie”**.
  - Backend: accessor `Patient::species_display` (capitalizada).
  - Front: etiqueta “Especie” y `speciesDisplay()` / `species_display`.
- **Dirección del tutor:** Mostrar dirección cuando exista (no “no disponible” si hay dato).
  - Backend: `Tutor::address` (accessor sobre `direccion`; si está vacío devuelve “No disponible”). En respuestas de pacientes y ficha clínica se incluye `tutor.address`.
  - Front: se muestra “Dirección: {address}” cuando hay valor útil.

---

## 5. Etiquetas ficha clínica (web)

En la vista de **ficha clínica** y en **detalle de consulta** se usan estas etiquetas:

| Campo API        | Etiqueta en UI        |
|------------------|------------------------|
| reason           | Motivo de consulta     |
| anamnesis        | Anamnesis              |
| physical_exam    | Exámenes               |
| diagnosis_*      | Diagnóstico            |
| treatment        | Tratamiento            |
| recommendations  | Recomendaciones        |

Centralizadas en `front/connyvet-frontend/src/lib/labels.ts` (`LABELS_CLINICAL`).

---

## 6. Unificación de títulos Web y Mobile (contrato común)

**Objetivo:** La app móvil debe mostrar **los mismos títulos que el sistema web**. Se eliminó la nomenclatura “App style” distinta.

### Títulos únicos (Web = Mobile)

- Motivo de consulta  
- Anamnesis  
- Diagnóstico  
- Tratamiento  
- Recomendaciones  

### Contrato en API: `labels` + `clinical_sections`

En **`GET /api/v1/consultations`** (cada ítem del array `data`) y en **`GET /api/v1/consultations/{id}`** la respuesta incluye:

- **`labels`**: objeto con los títulos oficiales (para no hardcodear en cliente):

```json
{
  "labels": {
    "reason": "Motivo de consulta",
    "anamnesis": "Anamnesis",
    "diagnosis": "Diagnóstico",
    "treatment": "Tratamiento",
    "recommendations": "Recomendaciones"
  }
}
```

- **`clinical_sections`**: objeto con los contenidos ya mapeados (mismos 5 campos):

```json
{
  "clinical_sections": {
    "reason": "...",
    "anamnesis": "...",
    "diagnosis": "...",
    "treatment": "...",
    "recommendations": "..."
  }
}
```

**Mapeo interno (backend):**

- `reason` → campo `reason`
- `anamnesis` → `anamnesis_actual` si existe en el modelo, si no `anamnesis`
- `diagnosis` → concatenación de `diagnosis_primary` y `diagnosis_secondary`
- `treatment` → campo `treatment`
- `recommendations` → campo `recommendations`

Los campos originales (`reason`, `anamnesis`, `diagnosis_primary`, etc.) se mantienen en la respuesta; **no se rompe compatibilidad**. Mobile puede usar solo `labels` + `clinical_sections` para mostrar la ficha con los mismos títulos que la web.

---

## 7. Color de citas realizadas

- **Requerimiento:** Citas realizadas en verde (no rojo).
- **Front web:**
  - Listado de consultas y agenda:
    - **Cerrada (realizada):** verde (`bg-emerald-50`, `text-emerald-700`).
    - **Anulada:** rojo (`bg-rose-50`, `text-rose-700`).
    - **Abierta:** azul (`bg-sky-50`, `text-sky-700`).

---

## Endpoints utilizados (resumen)

| Recurso              | Filtros relevantes           | Notas                              |
|----------------------|-----------------------------|------------------------------------|
| GET /consultations   | patient_id, tutor_id, date_from, date_to, status, **upcoming=1** | Cada ítem incluye `labels` y `clinical_sections` |
| GET /consultations/{id} | — | Incluye `labels` y `clinical_sections` (contrato Web/Mobile) |
| GET /patients        | search, species, active, tutor_id | Incluye file_number, sex_display, species_display, tutor.address |
| GET /patients/{id}   | —                           | Incluye file_number, tutor.address |
| GET /patients/{id}/clinical-record | —                  | Incluye file_number, sex_display, species_display, tutor.address |
| GET /vaccine-applications | patient_id, tutor_id, status, date_from, date_to | Ya existía patient_id             |

---

## Guía rápida para Mobile

1. **N.º de ficha:** Usar `patient.file_number` o `patient.id` en resúmenes y ficha.
2. **Sexo / especie:** Preferir `sex_display` y `species_display`; si no vienen, normalizar en app (Hembra/Macho, especie capitalizada).
3. **Tutor:** Incluir `tutor.address` donde se muestre datos del tutor.
4. **Contexto mascota:** En Citas, Vacunas y Ficha, enviar `patient_id` en los GET para filtrar por esa mascota.
5. **Próximas citas:** `GET /consultations?upcoming=1`.
6. **Ficha clínica / detalle de consulta (mismos títulos que Web):**
   - Usar **`data.labels`** para los títulos (Motivo de consulta, Anamnesis, Diagnóstico, Tratamiento, Recomendaciones).
   - Usar **`data.clinical_sections`** para los contenidos ya mapeados (reason, anamnesis, diagnosis, treatment, recommendations).
   - No hardcodear textos: leer siempre de `labels` y contenidos de `clinical_sections`.

---

## QA Checklist

- [ ] Creo una cita en BD → aparece en “citas de hoy” / próximas citas (con timezone America/Santiago).
- [ ] Entro a una mascota X → en “Ver solo esta mascota” abro Citas / Vacunas / Ficha clínica → solo se muestra información de la mascota X.
- [ ] Sexo se muestra como “Hembra” o “Macho” aunque en BD esté “h”/“H”/“m”/“M”.
- [ ] En ficha clínica y detalle de consulta se ven las etiquetas web: Motivo de consulta, Anamnesis, Diagnóstico, Tratamiento, Recomendaciones (y Exámenes donde aplique).
- [ ] Mobile puede mostrar los mismos títulos (usando `labels`) y los mismos contenidos (usando `clinical_sections`) que la web.
- [ ] Citas realizadas (cerrada) se ven en verde; anuladas en rojo.
- [ ] Tutor muestra dirección cuando existe (no “No disponible” si hay dato).
- [ ] N.º de ficha visible en detalle de paciente y en ficha clínica.
- [ ] “Especie” aparece en lugar de “Tipo de paciente” donde corresponda.
