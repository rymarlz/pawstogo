<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PaymentController extends Controller
{
    /**
     * GET /api/v1/payments
     * Filtros:
     *  - patient_id
     *  - tutor_id
     *  - status (pending|paid|all)
     */
   public function index(Request $request)
    {
        $this->authorize('viewAny', Payment::class);

        $query = Payment::with(['patient', 'tutor'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('patient_id')) $query->where('patient_id', $request->patient_id);
        if ($request->filled('tutor_id')) $query->where('tutor_id', $request->tutor_id);

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->from);
        }
        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->to);
        }

        $perPage = (int)($request->per_page ?? 20);
        $perPage = ($perPage > 0 && $perPage <= 100) ? $perPage : 20;

        $paginator = $query->paginate($perPage);

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
                'last_page'    => $paginator->lastPage(),
            ],
        ]);
    }

    /**
     * POST /api/v1/payments
     */
 public function store(Request $request)
    {
        $this->authorize('create', Payment::class);

        $validated = $request->validate([
            'patient_id' => ['required','exists:patients,id'],
            'tutor_id'   => ['nullable','exists:tutors,id'],

            // ⚠️ si NO tienes consultation_id en DB, NO lo envíes desde el front
            // si lo tienes, deja esto:
            'consultation_id'        => ['nullable','exists:consultations,id'],
            'vaccine_application_id' => ['nullable','exists:vaccine_applications,id'],
            'hospitalization_id'     => ['nullable','exists:hospitalizations,id'],

            'concept' => ['required','string','max:255'],
            'amount'  => ['required','numeric','min:0'],

            'status'  => ['required', Rule::in(['pending','paid','cancelled'])],
            'method'  => ['nullable', Rule::in(['efectivo','debito','credito','transferencia'])],
            'notes'   => ['nullable','string'],
        ]);

        $validated['created_by'] = $request->user()?->id;

        // si se crea como paid, setea paid_at
        if (($validated['status'] ?? 'pending') === 'paid') {
            $validated['paid_at'] = now();
        }

        $payment = Payment::create($validated)->load(['patient', 'tutor']);

        return response()->json(['data' => $payment], 201);
    }

    /**
     * GET /api/v1/payments/{id}
     */
    public function show(int $id)
    {
        $payment = Payment::with(['patient', 'tutor'])->findOrFail($id);
        $this->authorize('view', $payment);

        return response()->json(['data' => $payment]);
    }


    /**
     * PUT/PATCH /api/v1/payments/{id}
     */
      public function update(Request $request, int $id)
    {
        $payment = Payment::findOrFail($id);
        $this->authorize('update', $payment);

        $validated = $request->validate([
            'concept' => ['required','string','max:255'],
            'amount'  => ['required','numeric','min:0'],
            'status'  => ['required', Rule::in(['pending','paid','cancelled'])],
            'method'  => ['nullable', Rule::in(['efectivo','debito','credito','transferencia'])],
            'notes'   => ['nullable','string'],
        ]);

        // Bloqueo extra (por seguridad)
        if (in_array($payment->status, ['paid','cancelled'], true)) {
            return response()->json(['message' => 'No se puede editar un pago pagado o anulado.'], 422);
        }

        $payment->update($validated);
        $payment->load(['patient', 'tutor']);

        return response()->json(['data' => $payment]);
    }

    public function markPaid(Request $request, int $id)
    {
        $payment = Payment::findOrFail($id);
        $this->authorize('markPaid', $payment);

        $validated = $request->validate([
            'method' => ['nullable', Rule::in(['efectivo','debito','credito','transferencia'])],
            'notes'  => ['nullable','string'],
        ]);

        $payment->update([
            'status' => 'paid',
            'method' => $validated['method'] ?? $payment->method,
            'notes'  => $validated['notes'] ?? $payment->notes,
            'paid_at' => now(),
        ]);

        $payment->load(['patient', 'tutor']);

        return response()->json(['data' => $payment]);
    }
   public function cancel(Request $request, int $id)
    {
        $payment = Payment::findOrFail($id);
        $this->authorize('cancel', $payment);

        $validated = $request->validate([
            'reason' => ['nullable','string','max:255'],
        ]);

        $payment->update([
            'status' => 'cancelled',
            'cancelled_at' => now(),
            'cancelled_reason' => $validated['reason'] ?? null,
        ]);

        $payment->load(['patient', 'tutor']);

        return response()->json(['data' => $payment]);
    }

    /**
     * DELETE /api/v1/payments/{id}
     */
    
       public function destroy(int $id)
    {
        $payment = Payment::findOrFail($id);
        $this->authorize('delete', $payment);

        $payment->delete();

        return response()->json(['message' => 'deleted'], 200);
    }



     public function summary(Request $request)
    {
        $this->authorize('viewAny', Payment::class);

        $from = $request->input('from');
        $to   = $request->input('to');

        $q = Payment::query();

        if ($from) $q->whereDate('created_at', '>=', $from);
        if ($to)   $q->whereDate('created_at', '<=', $to);

        $totalCount = (clone $q)->count();
        $pendingCount = (clone $q)->where('status', 'pending')->count();
        $paidCount = (clone $q)->where('status', 'paid')->count();
        $cancelledCount = (clone $q)->where('status', 'cancelled')->count();

        $paidSum = (clone $q)->where('status', 'paid')->sum('amount');
        $pendingSum = (clone $q)->where('status', 'pending')->sum('amount');

        $byMethod = (clone $q)
            ->where('status', 'paid')
            ->selectRaw('method, COUNT(*) as qty, SUM(amount) as total')
            ->groupBy('method')
            ->get();

        return response()->json([
            'data' => [
                'total_count' => $totalCount,
                'pending_count' => $pendingCount,
                'paid_count' => $paidCount,
                'cancelled_count' => $cancelledCount,
                'paid_sum' => (int)$paidSum,
                'pending_sum' => (int)$pendingSum,
                'by_method' => $byMethod,
            ],
        ]);
    }
}
