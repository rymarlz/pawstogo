<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Presupuesto {{ $budget->code }}</title>
  <style>
    @page { margin: 22px 22px; }
    * { font-family: DejaVu Sans, Arial, sans-serif; }
    body { font-size: 12px; color: #111827; }

    .header {
      width: 100%;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }

    .header-table {
      width: 100%;
      border-collapse: collapse;
    }

    .brand {
      vertical-align: top;
    }

    .brand-box {
      display: inline-block;
      vertical-align: top;
    }

    /* ✅ Logo grande y proporcional */
    .logo {
      width: 210px;     /* <-- aquí lo haces grande */
      height: 160px;     /* alto controlado */
      object-fit: contain;
      display: block;
      margin-bottom: 6px;
    }

    .brand-name {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 0.2px;
      margin: 0;
      padding: 0;
      color: #111827;
    }

    .brand-sub {
      margin-top: 2px;
      font-size: 10px;
      color: #6b7280;
    }

    .doc-meta {
      text-align: right;
      vertical-align: top;
    }

    .doc-title {
      font-size: 16px;
      font-weight: 700;
      margin: 0;
    }

    .meta-row {
      margin-top: 4px;
      font-size: 10.5px;
      color: #374151;
    }

    .muted { color: #6b7280; }

    .section {
      margin-top: 12px;
      margin-bottom: 10px;
    }

    .box {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 10px;
      background: #fafafa;
    }

    .grid {
      width: 100%;
      border-collapse: collapse;
    }

    .grid td {
      padding: 4px 0;
      vertical-align: top;
      font-size: 11px;
    }

    .items {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }

    .items th {
      text-align: left;
      font-size: 10px;
      color: #6b7280;
      border-bottom: 1px solid #e5e7eb;
      padding: 8px 6px;
    }

    .items td {
      padding: 8px 6px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 11px;
    }

    .right { text-align: right; }
    .totals {
      width: 100%;
      margin-top: 10px;
      border-collapse: collapse;
    }

    .totals td {
      padding: 4px 0;
      font-size: 11px;
    }

    .total-strong {
      font-size: 13px;
      font-weight: 700;
      color: #111827;
    }

    .footer {
      margin-top: 14px;
      font-size: 10px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
      padding-top: 10px;
    }
  </style>
</head>

<body>
  <!-- HEADER -->
  <div class="header">
    <table class="header-table">
      <tr>
        <td class="brand">
          <div class="brand-box">
            @if(!empty($logoBase64))
              <img class="logo" src="{{ $logoBase64 }}" alt="{{ $brandName }}" />
            @endif

            <div class="brand-name">{{ $brandName }}</div>
            <div class="brand-sub">Presupuestos veterinarios · Atención clínica</div>
          </div>
        </td>

        <td class="doc-meta">
          <div class="doc-title">Presupuesto</div>
          <div class="meta-row"><span class="muted">Código:</span> {{ $budget->code }}</div>
          <div class="meta-row"><span class="muted">Fecha:</span> {{ optional($budget->created_at)->format('d-m-Y') }}</div>
          <div class="meta-row"><span class="muted">Válido hasta:</span> {{ $budget->valid_until ? \Carbon\Carbon::parse($budget->valid_until)->format('d-m-Y') : '—' }}</div>
          <div class="meta-row"><span class="muted">Estado:</span> {{ $budget->status }}</div>
        </td>
      </tr>
    </table>
  </div>

  <!-- DATOS -->
  <div class="section">
    <div class="box">
      <table class="grid">
        <tr>
          <td style="width: 50%;">
            <div><strong>Paciente:</strong>
              {{ optional($budget->patient)->name ?? '—' }}
            </div>
            <div class="muted">
              {{ optional($budget->patient)->species ?? '' }}
              {{ optional($budget->patient)->breed ? '· '.optional($budget->patient)->breed : '' }}
            </div>
          </td>
          <td style="width: 50%;">
            <div><strong>Tutor:</strong>
              {{ optional($budget->tutor)->name ?? '—' }}
            </div>
            <div class="muted">
              {{ optional($budget->tutor)->email ?? '' }}
              {{ optional($budget->tutor)->phone ? '· '.optional($budget->tutor)->phone : '' }}
            </div>
          </td>
        </tr>
      </table>

      @if(!empty($budget->title) || !empty($budget->notes))
        <div style="margin-top:8px;">
          @if(!empty($budget->title))
            <div><strong>Título:</strong> {{ $budget->title }}</div>
          @endif
          @if(!empty($budget->notes))
            <div class="muted" style="margin-top:4px;">
              <strong>Notas:</strong> {{ $budget->notes }}
            </div>
          @endif
        </div>
      @endif
    </div>
  </div>

  <!-- ITEMS -->
  <table class="items">
    <thead>
      <tr>
        <th style="width: 50%;">Detalle</th>
        <th style="width: 12%;" class="right">Cant.</th>
        <th style="width: 18%;" class="right">Precio</th>
        <th style="width: 20%;" class="right">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      @forelse($budget->items ?? [] as $it)
        <tr>
          <td>
            <strong>{{ $it->name ?? 'Ítem' }}</strong>
            @if(!empty($it->description))
              <div class="muted" style="font-size:10px;">{{ $it->description }}</div>
            @endif
          </td>
          <td class="right">{{ $it->quantity ?? 1 }}</td>
          <td class="right">{{ number_format((float)($it->unit_price ?? 0), 0, ',', '.') }}</td>
          <td class="right">{{ number_format((float)($it->total ?? 0), 0, ',', '.') }}</td>
        </tr>
      @empty
        <tr>
          <td colspan="4" class="muted">No hay ítems en este presupuesto.</td>
        </tr>
      @endforelse
    </tbody>
  </table>

  <!-- TOTALES -->
  <table class="totals">
    <tr>
      <td class="right muted" style="width: 80%;">Subtotal</td>
      <td class="right" style="width: 20%;">{{ number_format((float)($budget->subtotal ?? 0), 0, ',', '.') }}</td>
    </tr>
    <tr>
      <td class="right muted">Descuento</td>
      <td class="right">{{ number_format((float)($budget->discount_total ?? 0), 0, ',', '.') }}</td>
    </tr>
    <tr>
      <td class="right muted">Impuestos</td>
      <td class="right">{{ number_format((float)($budget->tax_total ?? 0), 0, ',', '.') }}</td>
    </tr>
    <tr>
      <td class="right total-strong">TOTAL</td>
      <td class="right total-strong">{{ number_format((float)($budget->total ?? 0), 0, ',', '.') }} {{ $budget->currency ?? 'CLP' }}</td>
    </tr>
  </table>

  <!-- FOOTER -->
  <div class="footer">
    Documento generado automáticamente. Si necesitas modificar el presupuesto, solicita una nueva versión.
  </div>
</body>
</html>
