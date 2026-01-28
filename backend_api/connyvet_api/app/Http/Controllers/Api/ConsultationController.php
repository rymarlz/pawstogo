<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Consultation;
use App\Models\ConsultationExamOrder;
use App\Models\ConsultationPrescription;
use App\Models\ConsultationPrescriptionItem;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ConsultationController extends Controller
{
    /**
     * GET /api/v1/consultations
     */
    public function index(Request $request)
    {
        $perPage = (int) $request->get('per_page', 20);
        $perPage = ($perPage > 0 && $perPage <= 100) ? $perPage : 20;

        $query = Consultation::query()
            ->with(['patient', 'tutor', 'doctor'])
            ->orderBy('date', 'desc');

        if ($patientId = $request->get('patient_id')) $query->where('patient_id', $patientId);
        if ($tutorId   = $request->get('tutor_id'))   $query->where('tutor_id', $tutorId);
        if ($doctorId  = $request->get('doctor_id'))  $query->where('doctor_id', $doctorId);

        // status=all => no filtra
        if (($status = $request->get('status')) && $status !== 'all') {
            $query->where('status', $status);
        }

        if ($visitType = $request->get('visit_type')) $query->where('visit_type', $visitType);

        if ($dateFrom = $request->get('date_from')) $query->whereDate('date', '>=', $dateFrom);
        if ($dateTo   = $request->get('date_to'))   $query->whereDate('date', '<=', $dateTo);

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('reason', 'like', "%{$search}%")
                    ->orWhere('diagnosis_primary', 'like', "%{$search}%")
                    ->orWhere('diagnosis_secondary', 'like', "%{$search}%")
                    ->orWhere('anamnesis', 'like', "%{$search}%")
                    ->orWhereHas('patient', function ($q2) use ($search) {
                        $q2->where('name', 'like', "%{$search}%");
                    })
                    ->orWhereHas('tutor', function ($q3) use ($search) {
                        $q3->whereRaw(
                            "CONCAT(COALESCE(nombres, ''), ' ', COALESCE(apellidos, '')) LIKE ?",
                            ["%{$search}%"]
                        )->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        $consultations = $query->paginate($perPage);

        return response()->json([
            'data' => $consultations->items(),
            'meta' => [
                'current_page' => $consultations->currentPage(),
                'last_page'    => $consultations->lastPage(),
                'per_page'     => $consultations->perPage(),
                'total'        => $consultations->total(),
            ],
        ]);
    }
    private function getLogoDataUri(): ?string
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
        if (is_file($p)) { $logoPath = $p; break; }
    }

    logger()->info('PDF LOGO DEBUG', [
        'found' => (bool) $logoPath,
        'path'  => $logoPath,
        'size'  => $logoPath ? @filesize($logoPath) : null,
    ]);

    if (!$logoPath) return null;

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
     * POST /api/v1/consultations
     */
    public function store(Request $request)
    {
        $userId = optional($request->user())->id;

        $validated = $request->validate([
            'patient_id' => ['required', 'integer', 'exists:patients,id'],
            'tutor_id'   => ['nullable', 'integer', 'exists:tutors,id'],
            'doctor_id'  => ['nullable', 'integer', 'exists:users,id'],

            'date'       => ['required', 'date'],
            'visit_type' => ['nullable', 'string', 'max:50'],
            'reason'     => ['nullable', 'string', 'max:191'],

            'anamnesis'           => ['nullable', 'string'],
            'physical_exam'       => ['nullable', 'string'],
            'diagnosis_primary'   => ['nullable', 'string'],
            'diagnosis_secondary' => ['nullable', 'string'],
            'treatment'           => ['nullable', 'string'],
            'recommendations'     => ['nullable', 'string'],

            'weight_kg'            => ['nullable', 'numeric', 'min:0', 'max:999'],
            'temperature_c'        => ['nullable', 'numeric', 'min:1', 'max:45'],
            'heart_rate'           => ['nullable', 'integer', 'min:0', 'max:400'],
            'respiratory_rate'     => ['nullable', 'integer', 'min:0', 'max:300'],
            'body_condition_score' => ['nullable', 'integer', 'min:1', 'max:9'],

            'next_control_date' => ['nullable', 'date'],

            'status' => ['nullable', Rule::in(['abierta', 'cerrada', 'anulada'])],
            'active' => ['nullable', 'boolean'],

            'attachments_meta' => ['nullable', 'array'],
            'extra_data'       => ['nullable', 'array'],

            // receta + examenes
            'prescription' => ['nullable', 'array'],
            'prescription.notes' => ['nullable', 'string'],
            'prescription.items' => ['nullable', 'array'],
            'prescription.items.*.drug_name' => ['required_with:prescription.items', 'string', 'max:191'],
            'prescription.items.*.presentation' => ['nullable', 'string', 'max:191'],
            'prescription.items.*.dose' => ['nullable', 'string', 'max:191'],
            'prescription.items.*.frequency' => ['nullable', 'string', 'max:191'],
            'prescription.items.*.duration_days' => ['nullable', 'integer', 'min:0', 'max:3650'],
            'prescription.items.*.route' => ['nullable', 'string', 'max:50'],
            'prescription.items.*.instructions' => ['nullable', 'string'],

            'exam_orders' => ['nullable', 'array'],
            'exam_orders.*.exam_name' => ['required_with:exam_orders', 'string', 'max:191'],
            'exam_orders.*.priority' => ['nullable', Rule::in(['normal', 'urgente'])],
            'exam_orders.*.status' => ['nullable', Rule::in(['requested', 'done', 'cancelled'])],
            'exam_orders.*.notes' => ['nullable', 'string'],
        ]);

        $validated['status'] = $validated['status'] ?? 'cerrada';
        $validated['active'] = $validated['active'] ?? true;

        $validated['created_by'] = $userId;
        $validated['updated_by'] = $userId;

        $prescription = $validated['prescription'] ?? null;
        $examOrders   = $validated['exam_orders'] ?? null;

        unset($validated['prescription'], $validated['exam_orders']);

        $consultation = null;

        DB::transaction(function () use ($validated, $prescription, $examOrders, $userId, &$consultation, $request) {
            $consultation = Consultation::create($validated);

            // si venían keys, sincronizamos
            if (array_key_exists('prescription', $request->all())) {
                $this->syncPrescription($consultation, $prescription, $userId);
            }
            if (array_key_exists('exam_orders', $request->all())) {
                $this->syncExamOrders($consultation, $examOrders);
            }
        });

        if (!$consultation) {
            return response()->json(['message' => 'Error al crear la consulta'], 500);
        }

        $consultation->load(['patient', 'tutor', 'doctor', 'prescription.items', 'examOrders']);

        return response()->json([
            'message' => 'Consulta creada correctamente',
            'data'    => $consultation,
        ], 201);
    }

    /**
     * GET /api/v1/consultations/{consultation}
     */
    public function show(Consultation $consultation)
    {
        $consultation->load(['patient', 'tutor', 'doctor', 'prescription.items', 'examOrders']);

        // Normaliza para el front: exam_orders (snake)
        $data = $consultation->toArray();
        $data['exam_orders'] = $consultation->examOrders ? $consultation->examOrders->toArray() : [];

        return response()->json(['data' => $data]);
    }

    /**
     * PUT/PATCH /api/v1/consultations/{consultation}
     */
    public function update(Request $request, Consultation $consultation)
    {
        $userId = optional($request->user())->id;

        $validated = $request->validate([
            'patient_id' => ['sometimes', 'required', 'integer', 'exists:patients,id'],
            'tutor_id'   => ['nullable', 'integer', 'exists:tutors,id'],
            'doctor_id'  => ['nullable', 'integer', 'exists:users,id'],

            'date'       => ['sometimes', 'required', 'date'],
            'visit_type' => ['nullable', 'string', 'max:50'],
            'reason'     => ['nullable', 'string', 'max:191'],

            'anamnesis'           => ['nullable', 'string'],
            'physical_exam'       => ['nullable', 'string'],
            'diagnosis_primary'   => ['nullable', 'string'],
            'diagnosis_secondary' => ['nullable', 'string'],
            'treatment'           => ['nullable', 'string'],
            'recommendations'     => ['nullable', 'string'],

            'weight_kg'            => ['nullable', 'numeric', 'min:0', 'max:999'],
            'temperature_c'        => ['nullable', 'numeric', 'min:20', 'max:45'],
            'heart_rate'           => ['nullable', 'integer', 'min:0', 'max:400'],
            'respiratory_rate'     => ['nullable', 'integer', 'min:0', 'max:300'],
            'body_condition_score' => ['nullable', 'integer', 'min:1', 'max:9'],

            'next_control_date' => ['nullable', 'date'],

            'status' => ['nullable', Rule::in(['abierta', 'cerrada', 'anulada'])],
            'active' => ['nullable', 'boolean'],

            'attachments_meta' => ['nullable', 'array'],
            'extra_data'       => ['nullable', 'array'],

            // receta + examenes
            'prescription' => ['nullable', 'array'],
            'prescription.notes' => ['nullable', 'string'],
            'prescription.items' => ['nullable', 'array'],
            'prescription.items.*.drug_name' => ['required_with:prescription.items', 'string', 'max:191'],
            'prescription.items.*.presentation' => ['nullable', 'string', 'max:191'],
            'prescription.items.*.dose' => ['nullable', 'string', 'max:191'],
            'prescription.items.*.frequency' => ['nullable', 'string', 'max:191'],
            'prescription.items.*.duration_days' => ['nullable', 'integer', 'min:0', 'max:3650'],
            'prescription.items.*.route' => ['nullable', 'string', 'max:50'],
            'prescription.items.*.instructions' => ['nullable', 'string'],

            'exam_orders' => ['nullable', 'array'],
            'exam_orders.*.exam_name' => ['required_with:exam_orders', 'string', 'max:191'],
            'exam_orders.*.priority' => ['nullable', Rule::in(['normal', 'urgente'])],
            'exam_orders.*.status' => ['nullable', Rule::in(['requested', 'done', 'cancelled'])],
            'exam_orders.*.notes' => ['nullable', 'string'],
        ]);

        $validated['updated_by'] = $userId;

        $prescription = $validated['prescription'] ?? null;
        $examOrders   = $validated['exam_orders'] ?? null;

        $touchRx = array_key_exists('prescription', $request->all());
        $touchEx = array_key_exists('exam_orders', $request->all());

        unset($validated['prescription'], $validated['exam_orders']);

        DB::transaction(function () use ($consultation, $validated, $touchRx, $touchEx, $prescription, $examOrders, $userId) {
            $consultation->update($validated);

            if ($touchRx) $this->syncPrescription($consultation, $prescription, $userId);
            if ($touchEx) $this->syncExamOrders($consultation, $examOrders);
        });

        $consultation->load(['patient', 'tutor', 'doctor', 'prescription.items', 'examOrders']);

        $data = $consultation->toArray();
        $data['exam_orders'] = $consultation->examOrders ? $consultation->examOrders->toArray() : [];

        return response()->json([
            'message' => 'Consulta actualizada correctamente',
            'data'    => $data,
        ]);
    }

    /**
     * DELETE /api/v1/consultations/{consultation}
     */
    public function destroy(Consultation $consultation)
    {
        $consultation->delete();

        return response()->json([
            'message' => 'Consulta eliminada correctamente',
        ], 200);
    }

    // ==========================================================
    // PDFS
    // ==========================================================

    public function pdfRx(Consultation $consultation)
    {
        $consultation->load(['patient', 'tutor', 'doctor', 'prescription.items']);

        $logoDataUri = $this->getLogoDataUri();


        $html = $this->renderPdfHtml($consultation, $logoDataUri, 'rx');

        return Pdf::loadHTML($html)
            ->setPaper('a4')
            ->download("receta-consulta-{$consultation->id}.pdf");
    }

    public function pdfExams(Consultation $consultation)
    {
        $consultation->load(['patient', 'tutor', 'doctor', 'examOrders']);
    
        $logoDataUri = $this->getLogoDataUri();
    
        $html = $this->renderPdfHtml($consultation, $logoDataUri, 'exams');
    
        return Pdf::loadHTML($html)
            ->setPaper('a4')
            ->download("examenes-consulta-{$consultation->id}.pdf");
    }
    
    public function pdfClinical(Consultation $consultation)
    {
        $consultation->load(['patient', 'tutor', 'doctor', 'prescription.items', 'examOrders']);
    
        $logoDataUri = $this->getLogoDataUri();
    
        $html = $this->renderPdfHtml($consultation, $logoDataUri, 'clinical');
    
        return Pdf::loadHTML($html)
            ->setPaper('a4')
            ->download("consulta-completa-{$consultation->id}.pdf");
    }
    

    private function renderPdfHtml(Consultation $c, ?string $logoDataUri, string $mode): string
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
    <div class="brand-name">Pawstogo</div>
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

    // ==========================================================
    // Sync helpers
    // ==========================================================

    private function syncPrescription(Consultation $consultation, ?array $prescription, ?int $userId = null): void
    {
        if ($prescription === null) {
            $consultation->prescription()?->delete();
            return;
        }

        $rx = $consultation->prescription()->first();

        if (!$rx) {
            $rx = ConsultationPrescription::create([
                'consultation_id' => $consultation->id,
                'notes' => $prescription['notes'] ?? null,
                'created_by' => $userId,
                'updated_by' => $userId,
            ]);
        } else {
            $rx->update([
                'notes' => $prescription['notes'] ?? $rx->notes,
                'updated_by' => $userId,
            ]);
        }

        $items = $prescription['items'] ?? [];
        $rx->items()->delete();

        $rows = [];
        foreach ($items as $idx => $it) {
            if (!is_array($it)) continue;
            if (empty($it['drug_name'])) continue;

            $rows[] = [
                'prescription_id' => $rx->id,
                'drug_name' => (string) $it['drug_name'],
                'presentation' => $it['presentation'] ?? null,
                'dose' => $it['dose'] ?? null,
                'frequency' => $it['frequency'] ?? null,
                'duration_days' => isset($it['duration_days']) ? (int)$it['duration_days'] : null,
                'route' => $it['route'] ?? null,
                'instructions' => $it['instructions'] ?? null,
                'sort_order' => $it['sort_order'] ?? $idx,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        if (!empty($rows)) {
            ConsultationPrescriptionItem::insert($rows);
        }
    }

    private function syncExamOrders(Consultation $consultation, ?array $examOrders): void
    {
        if ($examOrders === null) {
            $consultation->examOrders()->delete();
            return;
        }

        $consultation->examOrders()->delete();

        $rows = [];
        foreach ($examOrders as $idx => $ex) {
            if (!is_array($ex)) continue;
            if (empty($ex['exam_name'])) continue;

            $rows[] = [
                'consultation_id' => $consultation->id,
                'exam_name' => (string) $ex['exam_name'],
                'priority' => $ex['priority'] ?? 'normal',
                'status' => $ex['status'] ?? 'requested',
                'notes' => $ex['notes'] ?? null,
                'sort_order' => $ex['sort_order'] ?? $idx,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        if (!empty($rows)) {
            ConsultationExamOrder::insert($rows);
        }
    }

    // ==========================================================
    // Attachments
    // ==========================================================

    /**
     * POST /api/v1/consultations/{consultation}/attachments
     * Form-data:
     *  - files[] (required)
     *  - notes[] (optional) nombre/detalle por archivo
     */
    public function uploadAttachments(Request $request, Consultation $consultation)
    {


	 logger()->info('UPLOAD DEBUG', [
	        'content_type' => $request->header('content-type'),
	        'has_files' => $request->hasFile('files'),
	        'files_keys' => array_keys($request->allFiles() ?? []),
	        'files_type' => gettype($request->file('files')),
	        'files_count' => is_array($request->file('files')) ? count($request->file('files')) : null,
	        'raw_keys' => array_keys($request->all() ?? []),
	    ]);
        $userId = optional($request->user())->id;

        $request->validate([
            'files'   => ['required', 'array', 'min:1'],
            'files.*' => ['file', 'max:10240'], // 10MB por archivo (ajusta)
            'notes'   => ['nullable', 'array'],
            'notes.*' => ['nullable', 'string', 'max:191'],
        ]);

        $files = $request->file('files', []);
        $notes = $request->input('notes', []);

        $meta = $consultation->attachments_meta ?? [];
        if (!is_array($meta)) $meta = [];

        foreach ($files as $i => $file) {
            if (!$file) continue;

            $note = null;
            if (is_array($notes) && array_key_exists($i, $notes)) {
                $note = trim((string)$notes[$i]);
                if ($note === '') $note = null;
            }

            $dir = "consultations/{$consultation->id}";
            $ext = $file->getClientOriginalExtension();
            $original = $file->getClientOriginalName();

            $base = $note ?: pathinfo($original, PATHINFO_FILENAME);
            $safe = Str::slug($base);
            if ($safe === '') $safe = 'archivo';

            $filename = $safe . '-' . Str::random(8) . ($ext ? ".{$ext}" : '');
            $path = $file->storeAs($dir, $filename, 'public');

            $meta[] = [
                'note'          => $note,
                'original_name' => $original,
                'path'          => $path,
                'size'          => $file->getSize(),
                'mime'          => $file->getClientMimeType(),
                'uploaded_at'   => now()->toDateTimeString(),
                'uploaded_by'   => $userId,
                'url'           => asset('storage/' . $path),
            ];
        }

        $consultation->update([
            'attachments_meta' => array_values($meta),
            'updated_by' => $userId,
        ]);

        return response()->json([
            'message' => 'Archivos subidos correctamente.',
            'data' => [
                'id' => $consultation->id,
                'attachments_meta' => $consultation->attachments_meta ?? [],
            ],
        ]);
    }

    /**
     * DELETE /api/v1/consultations/{consultation}/attachments/{index}
     */
    public function deleteAttachment(Request $request, Consultation $consultation, int $index)
    {
        $userId = optional($request->user())->id;

        $meta = $consultation->attachments_meta ?? [];
        if (!is_array($meta)) $meta = [];

        if (!isset($meta[$index])) {
            return response()->json(['message' => 'Archivo no encontrado.'], 404);
        }

        $item = $meta[$index];
        $path = $item['path'] ?? null;

        if ($path && Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }

        array_splice($meta, $index, 1);

        $consultation->update([
            'attachments_meta' => array_values($meta),
            'updated_by' => $userId,
        ]);

        return response()->json([
            'message' => 'Archivo eliminado.',
            'data' => [
                'id' => $consultation->id,
                'attachments_meta' => $consultation->attachments_meta ?? [],
            ],
        ]);
    }


    public function downloadAttachment(Request $request, Consultation $consultation, int $index)
{
    $meta = $consultation->attachments_meta ?? [];
    if (!is_array($meta) || !isset($meta[$index])) {
        return response()->json(['message' => 'Adjunto no encontrado.'], 404);
    }

    $att = $meta[$index];
    $path = $att['path'] ?? null;

    if (!$path || !Storage::disk('public')->exists($path)) {
        return response()->json(['message' => 'Archivo no disponible.'], 404);
    }

    $filename = $att['original_name'] ?? basename($path);
    $mime = $att['mime'] ?? null;

    $filePath = Storage::disk('public')->path($path);
    
    $headers = [];
    if ($mime) {
        $headers['Content-Type'] = $mime;
    }

    return response()->download($filePath, $filename, $headers);
}
}
