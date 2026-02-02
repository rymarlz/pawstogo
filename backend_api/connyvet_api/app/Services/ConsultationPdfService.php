<?php

namespace App\Services;

use App\Models\Consultation;
use Illuminate\Support\Facades\Log;

/**
 * Servicio para generación de HTML de PDFs de consultas (receta, exámenes, clínico).
 * Extrae la lógica de logo y plantilla del ConsultationController.
 */
class ConsultationPdfService
{
    public function getLogoDataUri(): ?string
    {
        $candidates = [
            public_path('brand/logo.png'),
            public_path('brand/logo.jpg'),
            public_path('brand/logo.jpeg'),
            public_path('brand/logo.webp'),
            public_path('brand/logo.avif'),
            public_path('branding/logo.png'),
            public_path('branding/logo.jpg'),
            public_path('branding/logo.jpeg'),
            public_path('branding/logo.webp'),
            public_path('logo.png'),
            public_path('logo.jpg'),
            public_path('logo.jpeg'),
            public_path('logo.webp'),
            public_path('images/logo.png'),
            public_path('images/logo.jpg'),
            public_path('images/logo.jpeg'),
            public_path('images/logo.webp'),
            storage_path('app/public/branding/logo.png'),
            storage_path('app/public/branding/logo.jpg'),
            storage_path('app/public/branding/logo.jpeg'),
            storage_path('app/public/branding/logo.webp'),
            storage_path('app/public/logo.png'),
            storage_path('app/public/logo.jpg'),
            storage_path('app/public/logo.jpeg'),
            storage_path('app/public/logo.webp'),
        ];

        $logoPath = null;
        foreach ($candidates as $p) {
            if (is_file($p)) {
                $logoPath = $p;
                break;
            }
        }

        if (config('app.debug') && $logoPath) {
            Log::debug('PDF logo', ['path' => $logoPath]);
        }

        if (!$logoPath) {
            return null;
        }

        $ext = strtolower(pathinfo($logoPath, PATHINFO_EXTENSION));
        $mime = match ($ext) {
            'png' => 'image/png',
            'jpg', 'jpeg' => 'image/jpeg',
            'webp' => 'image/webp',
            'avif' => 'image/avif',
            default => 'image/png',
        };

        return "data:{$mime};base64," . base64_encode(file_get_contents($logoPath));
    }

    /**
     * @param  'rx'|'exams'|'clinical'  $mode
     */
    public function renderPdfHtml(Consultation $c, ?string $logoDataUri, string $mode): string
    {
        $patientName = $c->patient?->name ?? ("Paciente #{$c->patient_id}");
        $doctorName  = $c->doctor?->name ?? '—';
        $dateStr = $c->date ? $c->date->format('d/m/Y H:i') : '—';

        $rx = $c->prescription;
        $rxItems = $rx?->items ?? collect([]);
        $exams = $c->examOrders ?? collect([]);

        $sectionRx = '';
        if ($mode === 'rx' || $mode === 'clinical') {
            $rows = '';
            foreach ($rxItems as $it) {
                $rows .= '<tr>
                    <td>' . e($it->drug_name) . '</td>
                    <td>' . e($it->dose ?? '—') . '</td>
                    <td>' . e($it->frequency ?? '—') . '</td>
                    <td>' . e($it->duration_days ?? '—') . '</td>
                    <td>' . e($it->route ?? '—') . '</td>
                    <td>' . e($it->instructions ?? '—') . '</td>
                </tr>';
            }
            if ($rows === '') {
                $rows = '<tr><td colspan="6" class="muted">Sin fármacos indicados.</td></tr>';
            }
            $notes = trim((string)($rx?->notes ?? ''));
            $notesHtml = $notes !== '' ? '<p class="note"><strong>Notas:</strong> ' . e($notes) . '</p>' : '';
            $sectionRx = '
              <h2>Receta</h2>
              <table class="table">
                <thead>
                  <tr>
                    <th>Fármaco</th>
                    <th>Dosis</th>
                    <th>Frecuencia</th>
                    <th>Duración</th>
                    <th>Vía</th>
                    <th>Indicaciones</th>
                  </tr>
                </thead>
                <tbody>' . $rows . '</tbody>
              </table>
              ' . $notesHtml . '
            ';
        }

        $sectionExams = '';
        if ($mode === 'exams' || $mode === 'clinical') {
            $rows = '';
            foreach ($exams as $ex) {
                $rows .= '<tr>
                  <td>' . e($ex->exam_name) . '</td>
                  <td>' . e($ex->priority ?? 'normal') . '</td>
                  <td>' . e($ex->status ?? 'requested') . '</td>
                  <td>' . e($ex->notes ?? '—') . '</td>
                </tr>';
            }
            if ($rows === '') {
                $rows = '<tr><td colspan="4" class="muted">Sin exámenes solicitados.</td></tr>';
            }
            $sectionExams = '
              <h2>Exámenes complementarios</h2>
              <table class="table">
                <thead>
                  <tr>
                    <th>Examen</th>
                    <th>Prioridad</th>
                    <th>Estado</th>
                    <th>Notas</th>
                  </tr>
                </thead>
                <tbody>' . $rows . '</tbody>
              </table>
            ';
        }

        $sectionClinical = '';
        if ($mode === 'clinical') {
            $sectionClinical = '
              <h2>Resumen clínico</h2>
              <div class="box">
                <p><strong>Motivo:</strong> ' . e($c->reason ?? '—') . '</p>
                <p><strong>Anamnesis:</strong><br>' . nl2br(e($c->anamnesis ?? '—')) . '</p>
                <p><strong>Examen físico:</strong><br>' . nl2br(e($c->physical_exam ?? '—')) . '</p>
                <p><strong>Diagnóstico:</strong> ' . e($c->diagnosis_primary ?? '—') . '</p>
                <p><strong>Tratamiento:</strong><br>' . nl2br(e($c->treatment ?? '—')) . '</p>
                <p><strong>Recomendaciones:</strong><br>' . nl2br(e($c->recommendations ?? '—')) . '</p>
              </div>
            ';
        }

        $title = $mode === 'rx' ? 'Receta' : ($mode === 'exams' ? 'Orden de exámenes' : 'Consulta completa');
        $logoHtml = $logoDataUri
            ? '<img class="logo" src="' . $logoDataUri . '" alt="ConnyVet" />'
            : '';

        return '
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<style>
  body { font-family: DejaVu Sans, Arial, sans-serif; color:#0f172a; font-size:12px; }
.header { border-bottom:1px solid #e2e8f0; padding-bottom:10px; margin-bottom:12px; }
.header-table { width:100%; border-collapse:collapse; }
.header-table td { vertical-align:middle; }
  .title { font-size:16px; font-weight:700; margin:0; }
  .muted { color:#64748b; }
  .meta { margin:0; line-height:1.4; }
  h2 { font-size:13px; margin:14px 0 6px; }
  .box { border:1px solid #e2e8f0; border-radius:8px; padding:10px; background:#f8fafc; }
  .table { width:100%; border-collapse:collapse; }
  .table th { text-align:left; font-size:11px; color:#475569; border-bottom:1px solid #e2e8f0; padding:8px 6px; }
  .table td { border-bottom:1px solid #eef2f7; padding:8px 6px; vertical-align:top; }
  .note { margin-top:8px; }
  .footer { margin-top:18px; font-size:10px; color:#64748b; border-top:1px solid #e2e8f0; padding-top:10px; }

@page { margin: 22px 22px; }

.logo {
  max-width: 120px;
  max-height: 80px;
  width: auto;
  height: auto;
  object-fit: contain;
  display: block;
  margin-bottom: 6px;
}
.brand-name { font-size: 18px; font-weight: 700; margin: 0; color:#111827; }
.brand-sub { margin-top: 2px; font-size: 10px; color:#6b7280; }


</style>
</head>
<body>
<div class="header">
  <table class="header-table">
    <tr>
    <td style="width:55%; vertical-align:top;">
  <div style="display:inline-block; vertical-align:top;">
    ' . $logoHtml . '
    <div class="brand-sub">Consultas veterinarias · Atención clínica</div>
  </div>
</td>

      <td style="width:45%; text-align:right;">
        <p class="title">' . e($title) . '</p>
        <p class="meta muted">Consulta #' . e((string)$c->id) . ' · ' . e($dateStr) . '</p>
      </td>
    </tr>
  </table>
</div>


  <div class="box">
    <p class="meta"><strong>Paciente:</strong> ' . e($patientName) . '</p>
    <p class="meta"><strong>Médico:</strong> ' . e($doctorName) . '</p>
  </div>

  ' . $sectionClinical . '
  ' . $sectionRx . '
  ' . $sectionExams . '

  <div class="footer">
    Documento generado por ConnyVet · ' . e(now()->format('d/m/Y H:i')) . '
  </div>
</body>

</html>';
    }
}
