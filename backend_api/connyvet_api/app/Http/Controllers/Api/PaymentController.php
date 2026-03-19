<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\PaymentLinkMail;
use App\Models\Payment;
use App\Services\PaymentLinkService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
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
     *
     * Flujo: crear pago pendiente → generar link Mercado Pago → enviar email al tutor.
     * Si tutor sin email: se guarda el pago igual, se registra warning.
     */
    public function store(Request $request)
    {
        $this->authorize('create', Payment::class);

        Log::info('PaymentController@store: payload recibido', [
            'request_all' => $request->all(),
            'content_type' => $request->header('Content-Type'),
        ]);

        $validated = $request->validate([
            'patient_id' => ['required', 'exists:patients,id'],
            'tutor_id'   => ['nullable', 'exists:tutors,id'],
            'consultation_id'        => ['nullable', 'exists:consultations,id'],
            'vaccine_application_id' => ['nullable', 'exists:vaccine_applications,id'],
            'hospitalization_id'     => ['nullable', 'exists:hospitalizations,id'],
            'concept' => ['required', 'string', 'max:255'],
            'amount'  => ['required', 'numeric', 'min:0'],
            'status'  => ['required', Rule::in(['pending', 'paid', 'cancelled'])],
            'method'  => ['nullable', Rule::in(['efectivo', 'debito', 'credito', 'transferencia', 'mercadopago'])],
            'notes'   => ['nullable', 'string'],
        ]);

        $validated['created_by'] = $request->user()?->id;

        if (($validated['status'] ?? 'pending') === 'paid') {
            $validated['paid_at'] = now();
        }

        $payment = Payment::create($validated)->load(['patient', 'tutor']);

        $emailSent = false;
        $linkGenerated = false;

        // Generar link para pagos pendientes. Defensa: si no es paid ni cancelled, tratar como pending.
        $statusNormalized = strtolower(trim((string) ($payment->status ?? 'pending')));
        $shouldGenerateLink = ($statusNormalized !== 'paid' && $statusNormalized !== 'cancelled');

        Log::info('PaymentController@store: condición para generar link', [
            'payment_id' => $payment->id,
            'status_raw' => $payment->status,
            'status_normalized' => $statusNormalized,
            'should_generate_link' => $shouldGenerateLink,
        ]);

        if ($shouldGenerateLink) {
            try {
                Log::info('PaymentController@store: llamando PaymentLinkService', ['payment_id' => $payment->id]);
                $linkService = app(PaymentLinkService::class);
                $result = $linkService->createPreferenceForPayment($payment);

                Log::info('PaymentController@store: Mercado Pago OK', [
                    'payment_id' => $payment->id,
                    'has_checkout_url' => !empty($result['checkout_url'] ?? null),
                ]);

                $payment->update([
                    'payment_link'       => $result['checkout_url'],
                    'mp_preference_id'   => $result['preference_id'],
                    'external_reference' => $result['external_reference'],
                ]);
                $payment->refresh();
                $linkGenerated = true;
            } catch (\Throwable $e) {
                Log::error('PaymentController@store: Error al generar link de Mercado Pago', [
                    'payment_id' => $payment->id,
                    'error'      => $e->getMessage(),
                    'trace'      => $e->getTraceAsString(),
                ]);
                $payment->update([
                    'email_error' => 'Link MP: ' . $e->getMessage(),
                ]);
                $payment->refresh();
                $response = [
                    'data' => $payment,
                    'message' => 'Pago creado. No se pudo generar el link de Mercado Pago: ' . $e->getMessage(),
                ];
                return response()->json($response, 201);
            }

            $tutorEmail = $this->getTutorEmail($payment);
            if ($tutorEmail) {
                try {
                    Mail::to($tutorEmail)->send(new PaymentLinkMail($payment, $payment->payment_link));
                    $emailSent = true;
                    $payment->update([
                        'email_sent_at' => now(),
                        'email_error'   => null,
                    ]);
                    $payment->refresh();
                    Log::info('PaymentLinkMail enviado', ['payment_id' => $payment->id, 'email' => $tutorEmail]);
                } catch (\Exception $e) {
                    $errMsg = $e->getMessage();
                    $payment->update([
                        'email_sent_at' => null,
                        'email_error'   => $errMsg,
                    ]);
                    $payment->refresh();
                    Log::warning('Error al enviar email de pago (pago guardado)', [
                        'payment_id' => $payment->id,
                        'error'      => $errMsg,
                    ]);
                }
            } else {
                $payment->update([
                    'email_sent_at' => null,
                    'email_error'   => 'Tutor sin correo configurado',
                ]);
                $payment->refresh();
                Log::warning('PaymentController@store: tutor sin email', [
                    'payment_id' => $payment->id,
                    'tutor_id'   => $payment->tutor_id,
                ]);
            }
            Log::info('PaymentController@store: resultado email', [
                'payment_id' => $payment->id,
                'email_sent' => $emailSent,
                'link_generated' => $linkGenerated,
            ]);
        } else {
            Log::info('PaymentController@store: NO se genera link (status no es pending)', [
                'payment_id' => $payment->id,
                'status' => $payment->status,
            ]);
        }

        $response = ['data' => $payment];
        if ($linkGenerated && !$emailSent) {
            $response['message'] = 'Pago creado. Link generado. No se envió email: el tutor no tiene correo configurado.';
        } elseif ($linkGenerated && $emailSent) {
            $response['message'] = 'Pago creado. Link enviado al tutor por correo.';
        }

        return response()->json($response, 201);
    }

    private function getTutorEmail(Payment $payment): ?string
    {
        if ($payment->tutor_id && $payment->tutor) {
            return $payment->tutor->email ?? $payment->tutor->email_para_pagos ?? null;
        }
        if ($payment->patient_id && $payment->patient) {
            return $payment->patient->tutor_email ?? null;
        }
        return null;
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
            'method'  => ['nullable', Rule::in(['efectivo','debito','credito','transferencia','mercadopago'])],
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

    public function markPaid(Request $request, Payment $payment)
    {
        $this->authorize('markPaid', $payment);

        $validated = $request->validate([
            'method' => ['nullable', Rule::in(['efectivo','debito','credito','transferencia','mercadopago'])],
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
    /**
     * POST /api/v1/payments/{payment}/resend-link
     * Reenvía el link de pago por email al tutor.
     */
    public function resendLink(Request $request, Payment $payment)
    {
        $this->authorize('view', $payment);

        if ($payment->status !== 'pending') {
            return response()->json(['message' => 'Solo se puede reenviar el link de pagos pendientes.'], 422);
        }

        if (empty($payment->payment_link)) {
            return response()->json(['message' => 'Este pago no tiene link de Mercado Pago. Cree uno nuevo.'], 422);
        }

        $tutorEmail = $this->getTutorEmail($payment);
        if (!$tutorEmail) {
            return response()->json([
                'message' => 'El tutor no tiene correo configurado. No se puede reenviar.',
            ], 422);
        }

        try {
            Mail::to($tutorEmail)->send(new PaymentLinkMail($payment, $payment->payment_link));
            $payment->update([
                'email_sent_at' => now(),
                'email_error'   => null,
            ]);
            Log::info('PaymentLinkMail reenviado', ['payment_id' => $payment->id, 'email' => $tutorEmail]);
            return response()->json([
                'message' => 'Link de pago reenviado correctamente.',
                'data'    => $payment->fresh(['patient', 'tutor']),
            ]);
        } catch (\Exception $e) {
            $errMsg = $e->getMessage();
            $payment->update([
                'email_sent_at' => null,
                'email_error'   => $errMsg,
            ]);
            Log::error('Error al reenviar email de pago', [
                'payment_id' => $payment->id,
                'error'      => $errMsg,
            ]);
            return response()->json([
                'message' => 'No se pudo enviar el correo: ' . $errMsg,
            ], 500);
        }
    }

    public function cancel(Request $request, Payment $payment)
    {
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
