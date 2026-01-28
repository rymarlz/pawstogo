<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Receta y Exámenes</title>
  <style>
    * { font-family: DejaVu Sans, sans-serif; }
    body { font-size: 12px; color: #0f172a; }
    .muted { color: #64748b; }
    .h1 { font-size: 16px; font-weight: 700; margin: 0; }
    .h2 { font-size: 13px; font-weight: 700; margin: 0; }
    .row { width: 100%; }
    .card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; margin-top: 10px; }
    .table { width: 100%; border-collapse: collapse; }
    .table th { background: #f8fafc; text-align: left; font-size: 11px; color: #475569; padding: 8px; border-bottom: 1px solid #e2e8f0; }
    .table td { padding: 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    .pill { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; border: 1px solid #e2e8f0; color: #475569; }
    .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 10px; }
    .logoWrap { display: inline-block; vertical-align: middle; }
    .brandWrap { display: inline-block; vertical-align: middle; margin-left: 10px; }
    .logo { height: 52px; } /* ✅ más grande y profesional */
    .right { text-align: right; }
    .grid2 { width: 100%; }
    .grid2 td { width: 50%; vertical-align: top; }
  </style>
</head>
<body>

  <div class="header">
    <div class="row">
      <div style="width:70%; display:inline-block;">
        <div class="logoWrap">
          @if(!empty($logoBase64))
            <img class="logo" src="{{ $logoBase64 }}" alt="Logo">
          @endif
        </div>
        <div class="brandWrap">
          <p class="h1">{{ $brandName ?? 'Paws to Go' }}</p>
          <p class="muted" style="margin:2px 0 0 0;">Receta + Exámenes complementarios</p>
        </div>
      </div>

      <div style="width:29%; display:inline-block;" class="right">
        <div class="pill">Consulta #{{ $consultation->id }}</div><br>
        <span class="muted">Fecha:</span>
        <strong>
          {{ optional($consultation->date)->format('d-m-Y H:i') ?? '—' }}
        </strong>
      </div>
    </div>
  </div>

  <table class="grid2">
    <tr>
      <td>
        <div class="card">
          <p class="h2">Paciente</p>
          <p style="margin:6px 0 0 0;">
            <strong>{{ $consultation->patient->name ?? '—' }}</strong>
            <span class="muted">
              @if(!empty($consultation->patient?->species)) · {{ $consultation->patient->species }} @endif
              @if(!empty($consultation->patient?->breed)) · {{ $consultation->patient->breed }} @endif
            </span>
          </p>
        </div>
      </td>
      <td>
        <div class="card">
          <p class="h2">Tutor</p>
          <p style="margin:6px 0 0 0;">
            <strong>{{ $consultation->tutor?->name ?? $consultation->patient?->tutor_name ?? '—' }}</strong><br>
            <span class="muted">{{ $consultation->tutor?->email ?? $consultation->patient?->tutor_email ?? '' }}</span><br>
            <span class="muted">{{ $consultation->tutor?->phone ?? $consultation->patient?->tutor_phone ?? '' }}</span>
          </p>
        </div>
      </td>
    </tr>
  </table>

  <div class="card">
    <p class="h2">Resumen clínico</p>
    <p style="margin:6px 0 0 0;"><span class="muted">Motivo:</span> {{ $consultation->reason ?? '—' }}</p>
    <p style="margin:6px 0 0 0;"><span class="muted">Diagnóstico:</span> {{ $consultation->diagnosis_primary ?? '—' }}</p>
    @if(!empty($consultation->diagnosis_secondary))
      <p style="margin:6px 0 0 0;"><span class="muted">Dx secundario:</span> {{ $consultation->diagnosis_secondary }}</p>
    @endif
  </div>

  {{-- ===================== --}}
  {{-- RECETA --}}
  {{-- ===================== --}}
  <div class="card">
    <p class="h2">Receta</p>

    @if(!empty($consultation->prescription?->notes))
      <p style="margin:6px 0 10px 0;"><span class="muted">Indicaciones generales:</span> {{ $consultation->prescription->notes }}</p>
    @endif

    @php $items = $consultation->prescription?->items ?? []; @endphp

    @if(count($items) === 0)
      <p class="muted" style="margin:6px 0 0 0;">No hay fármacos registrados.</p>
    @else
      <table class="table">
        <thead>
          <tr>
            <th>Fármaco</th>
            <th>Presentación</th>
            <th>Dosis</th>
            <th>Frecuencia</th>
            <th>Duración</th>
            <th>Vía</th>
            <th>Indicaciones</th>
          </tr>
        </thead>
        <tbody>
          @foreach($items as $it)
            <tr>
              <td><strong>{{ $it->drug_name }}</strong></td>
              <td>{{ $it->presentation ?? '—' }}</td>
              <td>{{ $it->dose ?? '—' }}</td>
              <td>{{ $it->frequency ?? '—' }}</td>
              <td>{{ $it->duration_days != null ? ($it->duration_days . ' días') : '—' }}</td>
              <td>{{ $it->route ?? '—' }}</td>
              <td>{{ $it->instructions ?? '—' }}</td>
            </tr>
          @endforeach
        </tbody>
      </table>
    @endif
  </div>

  {{-- ===================== --}}
  {{-- EXÁMENES --}}
  {{-- ===================== --}}
  <div class="card">
    <p class="h2">Exámenes complementarios</p>

    @php $exams = $consultation->examOrders ?? []; @endphp

    @if(count($exams) === 0)
      <p class="muted" style="margin:6px 0 0 0;">No hay exámenes solicitados.</p>
    @else
      <table class="table">
        <thead>
          <tr>
            <th>Examen</th>
            <th>Prioridad</th>
            <th>Estado</th>
            <th>Observaciones</th>
          </tr>
        </thead>
        <tbody>
          @foreach($exams as $ex)
            <tr>
              <td><strong>{{ $ex->exam_name }}</strong></td>
              <td>{{ $ex->priority ?? 'normal' }}</td>
              <td>{{ $ex->status ?? 'requested' }}</td>
              <td>{{ $ex->notes ?? '—' }}</td>
            </tr>
          @endforeach
        </tbody>
      </table>
    @endif
  </div>

  <p class="muted" style="margin-top:10px; font-size:10px;">
    Documento generado por {{ $brandName ?? 'Paws to Go' }} · ConnyVet
  </p>

</body>
</html>
