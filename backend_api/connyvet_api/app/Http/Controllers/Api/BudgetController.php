<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\BudgetPdfMail;
use App\Models\Budget;
use App\Models\BudgetItem;
use App\Services\BudgetCalculator;
use App\Services\BudgetPdfService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

class BudgetController extends Controller
{
  public function index(Request $request)
  {
    $this->authorize('viewAny', Budget::class);

    $perPage = (int) $request->query('per_page', 20);
    $perPage = $perPage > 0 ? min($perPage, 100) : 20;

    $q = Budget::query()
      ->with(['patient', 'tutor'])
      ->orderByDesc('created_at');

    if ($request->filled('status') && $request->status !== 'all') {
      $q->where('status', $request->status);
    }
    if ($request->filled('patient_id')) $q->where('patient_id', $request->patient_id);
    if ($request->filled('tutor_id')) $q->where('tutor_id', $request->tutor_id);

    if ($request->filled('from')) $q->whereDate('created_at', '>=', $request->from);
    if ($request->filled('to')) $q->whereDate('created_at', '<=', $request->to);

    if ($search = $request->query('search')) {
      $term = trim($search);
      $q->where(function ($qq) use ($term) {
        $qq->where('code', 'like', "%{$term}%")
          ->orWhere('title', 'like', "%{$term}%")
          ->orWhereHas('patient', fn($p) => $p->where('name', 'like', "%{$term}%"));
      });
    }

    $p = $q->paginate($perPage);

    return response()->json([
      'data' => $p->items(),
      'meta' => [
        'current_page' => $p->currentPage(),
        'last_page' => $p->lastPage(),
        'per_page' => $p->perPage(),
        'total' => $p->total(),
      ],
    ]);
  }

  public function store(Request $request, BudgetCalculator $calc)
  {
    $this->authorize('create', Budget::class);

    $userId = optional($request->user())->id;

    $data = $request->validate([
      'patient_id' => ['nullable','integer','exists:patients,id'],
      'tutor_id' => ['nullable','integer','exists:tutors,id'],
      'consultation_id' => ['nullable','integer','exists:consultations,id'],

      'title' => ['nullable','string','max:255'],
      'status' => ['nullable', Rule::in(['draft','sent','accepted','rejected','expired'])],
      'currency' => ['nullable','string','max:10'],
      'valid_until' => ['nullable','date'],
      'notes' => ['nullable','string'],
      'terms' => ['nullable','string'],

      'items' => ['required','array','min:1'],
      'items.*.sort_order' => ['nullable','integer','min:0'],
      'items.*.name' => ['required','string','max:255'],
      'items.*.description' => ['nullable','string','max:255'],
      'items.*.qty' => ['required','numeric','min:0.01'],
      'items.*.unit_price' => ['required','numeric','min:0'],
      'items.*.discount' => ['nullable','numeric','min:0'],
      'items.*.tax_rate' => ['nullable','numeric','min:0','max:100'],
    ]);

    $computed = $calc->compute($data['items']);

    return DB::transaction(function () use ($data, $computed, $userId) {
      $budget = new Budget();
      $budget->code = $this->nextCode();
      $budget->patient_id = $data['patient_id'] ?? null;
      $budget->tutor_id = $data['tutor_id'] ?? null;
      $budget->consultation_id = $data['consultation_id'] ?? null;

      $budget->title = $data['title'] ?? null;
      $budget->status = $data['status'] ?? 'draft';
      $budget->currency = $data['currency'] ?? 'CLP';
      $budget->valid_until = $data['valid_until'] ?? null;

      $budget->notes = $data['notes'] ?? null;
      $budget->terms = $data['terms'] ?? null;

      $budget->subtotal = $computed['subtotal'];
      $budget->discount_total = $computed['discount_total'];
      $budget->tax_total = $computed['tax_total'];
      $budget->total = $computed['total'];

      if ($budget->status === 'sent') {
        $budget->sent_at = now();
      }

      $budget->created_by = $userId;
      $budget->updated_by = $userId;

      $budget->save();

      foreach ($computed['items'] as $it) {
        BudgetItem::create([
          'budget_id' => $budget->id,
          'sort_order' => (int)($it['sort_order'] ?? 0),
          'name' => $it['name'],
          'description' => $it['description'] ?? null,
          'qty' => $it['qty'],
          'unit_price' => $it['unit_price'],
          'discount' => $it['discount'] ?? 0,
          'tax_rate' => $it['tax_rate'] ?? 0,
          'line_subtotal' => $it['line_subtotal'],
          'line_tax' => $it['line_tax'],
          'line_total' => $it['line_total'],
        ]);
      }

      $budget->load(['items','patient','tutor','consultation']);

      return response()->json([
        'message' => 'Presupuesto creado correctamente',
        'data' => $budget,
      ], 201);
    });
  }

  public function show(Budget $budget)
  {
    $this->authorize('view', $budget);
    $budget->load(['items','patient','tutor','consultation']);
    return response()->json(['data' => $budget]);
  }

  public function update(Request $request, Budget $budget, BudgetCalculator $calc)
  {
    $this->authorize('update', $budget);
    $userId = optional($request->user())->id;

    $data = $request->validate([
      'patient_id' => ['nullable','integer','exists:patients,id'],
      'tutor_id' => ['nullable','integer','exists:tutors,id'],
      'consultation_id' => ['nullable','integer','exists:consultations,id'],

      'title' => ['nullable','string','max:255'],
      'status' => ['nullable', Rule::in(['draft','sent','accepted','rejected','expired'])],
      'currency' => ['nullable','string','max:10'],
      'valid_until' => ['nullable','date'],
      'notes' => ['nullable','string'],
      'terms' => ['nullable','string'],

      'items' => ['required','array','min:1'],
      'items.*.sort_order' => ['nullable','integer','min:0'],
      'items.*.name' => ['required','string','max:255'],
      'items.*.description' => ['nullable','string','max:255'],
      'items.*.qty' => ['required','numeric','min:0.01'],
      'items.*.unit_price' => ['required','numeric','min:0'],
      'items.*.discount' => ['nullable','numeric','min:0'],
      'items.*.tax_rate' => ['nullable','numeric','min:0','max:100'],
    ]);

    $computed = $calc->compute($data['items']);

    return DB::transaction(function () use ($budget, $data, $computed, $userId) {
      $budget->patient_id = $data['patient_id'] ?? $budget->patient_id;
      $budget->tutor_id = $data['tutor_id'] ?? $budget->tutor_id;
      $budget->consultation_id = $data['consultation_id'] ?? $budget->consultation_id;

      $budget->title = $data['title'] ?? $budget->title;
      $budget->currency = $data['currency'] ?? $budget->currency;
      $budget->valid_until = $data['valid_until'] ?? $budget->valid_until;

      $oldStatus = $budget->status;
      if (isset($data['status'])) $budget->status = $data['status'];

      if ($oldStatus !== 'sent' && $budget->status === 'sent') {
        $budget->sent_at = now();
      }

      $budget->notes = $data['notes'] ?? $budget->notes;
      $budget->terms = $data['terms'] ?? $budget->terms;

      $budget->subtotal = $computed['subtotal'];
      $budget->discount_total = $computed['discount_total'];
      $budget->tax_total = $computed['tax_total'];
      $budget->total = $computed['total'];

      $budget->updated_by = $userId;
      $budget->save();

      // reemplazamos items (simple y seguro)
      $budget->items()->delete();
      foreach ($computed['items'] as $it) {
        BudgetItem::create([
          'budget_id' => $budget->id,
          'sort_order' => (int)($it['sort_order'] ?? 0),
          'name' => $it['name'],
          'description' => $it['description'] ?? null,
          'qty' => $it['qty'],
          'unit_price' => $it['unit_price'],
          'discount' => $it['discount'] ?? 0,
          'tax_rate' => $it['tax_rate'] ?? 0,
          'line_subtotal' => $it['line_subtotal'],
          'line_tax' => $it['line_tax'],
          'line_total' => $it['line_total'],
        ]);
      }

      $budget->load(['items','patient','tutor','consultation']);

      return response()->json([
        'message' => 'Presupuesto actualizado correctamente',
        'data' => $budget,
      ]);
    });
  }

  public function destroy(Budget $budget)
  {
    $this->authorize('delete', $budget);
    $budget->delete();
    return response()->json(['message' => 'Presupuesto eliminado'], 200);
  }

 // App\Http\Controllers\Api\BudgetController.php

public function pdf(\Illuminate\Http\Request $request, \App\Models\Budget $budget)
{
    // Si usas policies, descomenta:
    // $this->authorize('view', $budget);

    $budget->load(['items', 'patient', 'tutor', 'consultation']);

    // ✅ Logo: intenta PNG, luego SVG
    $logoBase64 = null;

    $pngPath = public_path('brand/logo.png'); // <-- pon tu logo aquí
    $svgPath = public_path('brand/logo.svg'); // opcional

    if (file_exists($pngPath)) {
        $logoBase64 = 'data:image/png;base64,' . base64_encode(file_get_contents($pngPath));
    } elseif (file_exists($svgPath)) {
        // dompdf soporta svg en muchos casos, pero base64 svg suele funcionar mejor así:
        $logoBase64 = 'data:image/svg+xml;base64,' . base64_encode(file_get_contents($svgPath));
    }

    $html = view('pdf.budget', [
        'budget' => $budget,
        'brandName' => 'Paws to Go',
        'logoBase64' => $logoBase64,
    ])->render();

    $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadHTML($html)->setPaper('a4');

    return $pdf->download("presupuesto-{$budget->code}.pdf");
}



  public function email(Request $request, Budget $budget, BudgetPdfService $pdf)
  {
    $this->authorize('email', $budget);

    $data = $request->validate([
      'to' => ['required','email','max:191'],
      'message' => ['nullable','string'],
    ]);

    $bin = $pdf->render($budget);

    Mail::to($data['to'])->send(new BudgetPdfMail($budget, $bin, $data['message'] ?? null));

    return response()->json(['message' => 'Presupuesto enviado correctamente']);
  }

  private function nextCode(): string
  {
    // B-YYYYMMDD-000001 (por día)
    $prefix = 'B-'.now()->format('Ymd').'-';
    $last = Budget::withTrashed()
      ->where('code', 'like', $prefix.'%')
      ->orderByDesc('id')
      ->value('code');

    $n = 1;
    if ($last) {
      $parts = explode('-', $last);
      $seq = (int) end($parts);
      $n = $seq + 1;
    }
    return $prefix . str_pad((string)$n, 6, '0', STR_PAD_LEFT);
  }
}
