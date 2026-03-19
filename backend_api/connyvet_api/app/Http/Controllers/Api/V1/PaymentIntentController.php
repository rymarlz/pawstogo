<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePaymentIntentRequest;
use App\Http\Requests\MarkPaymentManualPaidRequest;
use App\Models\PaymentIntent;
use App\Models\PaymentTransaction;
use App\Services\Payments\PaymentProviderFactory;
use Illuminate\Http\Request;

class PaymentIntentController extends Controller
{
  public function index(Request $request)
  {
    $this->authorize('viewAny', PaymentIntent::class);
    $q = PaymentIntent::query()->latest();

    if ($request->filled('patient_id')) $q->where('patient_id', (int)$request->patient_id);
    if ($request->filled('tutor_id')) $q->where('tutor_id', (int)$request->tutor_id);
    if ($request->filled('consultation_id')) $q->where('consultation_id', (int)$request->consultation_id);
    if ($request->filled('status')) $q->where('status', $request->status);

    $perPage = (int)($request->get('per_page', 15));
    $perPage = ($perPage > 0 && $perPage <= 100) ? $perPage : 15;
    $paginator = $q->paginate($perPage);

    return response()->json([
      'data' => $paginator->items(),
      'meta' => [
        'current_page' => $paginator->currentPage(),
        'per_page' => $paginator->perPage(),
        'total' => $paginator->total(),
        'last_page' => $paginator->lastPage(),
      ],
    ]);
  }

  public function show(int $id)
  {
    $intent = PaymentIntent::with(['transactions', 'payment'])->findOrFail($id);
    $this->authorize('view', $intent);
    $data = $intent->toArray();
    if ($intent->payment) {
      $data['payment_id'] = $intent->payment->id;
    }
    return response()->json(['data' => $data]);
  }

  public function store(StorePaymentIntentRequest $request)
  {
    $this->authorize('create', PaymentIntent::class);
    $data = $request->validated();
    $data['currency'] = $data['currency'] ?? 'CLP';
    $data['provider'] = $data['provider'] ?? 'manual';
    $data['status'] = 'draft';

    $intent = PaymentIntent::create($data);

    // Si viene provider webpay_plus, podemos crear transacción “start”
    if ($intent->provider !== 'manual') {
      $provider = PaymentProviderFactory::make($intent->provider);
      $tx = $provider->start($intent, [
        'return_url' => $request->input('meta.return_url'),
        'redirect_url' => $request->input('meta.redirect_url'),
      ]);

      return response()->json(['data' => $intent->fresh('transactions'), 'transaction' => $tx], 201);
    }

    return response()->json(['data' => $intent], 201);
  }

  public function start(int $id, Request $request)
  {
    $intent = PaymentIntent::findOrFail($id);
    $this->authorize('view', $intent);

    if ($intent->status === 'paid') {
      return response()->json(['message' => 'Este pago ya está pagado.'], 409);
    }
    if ($intent->status === 'cancelled') {
      return response()->json(['message' => 'No se puede iniciar un pago cancelado.'], 409);
    }

    $providerName = $request->input('provider', $intent->provider ?? 'manual');
    $intent->provider = $providerName;
    $intent->status = 'pending';
    $intent->save();

    $provider = PaymentProviderFactory::make($providerName);

    $tx = $provider->start($intent, [
      'return_url' => $request->input('return_url'),
      'redirect_url' => $request->input('redirect_url'),
      'origin' => $request->input('origin'),
    ]);

    return response()->json([
      'data' => $intent->fresh('transactions'),
      'transaction' => $tx,
    ]);
  }

  public function markManualPaid(int $id, MarkPaymentManualPaidRequest $request)
  {
    $intent = PaymentIntent::findOrFail($id);
    $this->authorize('view', $intent);

    if ($intent->status === 'paid') {
      return response()->json(['message' => 'Este pago ya está pagado.'], 409);
    }

    $amount = (int)$request->validated()['amount'];

    $tx = PaymentTransaction::create([
      'payment_intent_id' => $intent->id,
      'provider' => 'manual',
      'status' => 'paid',
      'amount' => $amount,
      'currency' => $intent->currency,
      'external_id' => $request->input('reference'),
      'response_payload' => [
        'note' => $request->input('note'),
        'reference' => $request->input('reference'),
      ],
    ]);

    $intent->provider = 'manual';
    $intent->markPaid($amount, [
      'manual_paid_at' => now()->toISOString(),
    ]);

    return response()->json([
      'data' => $intent->fresh('transactions'),
      'transaction' => $tx,
    ]);
  }

  public function cancel(int $id, Request $request)
  {
    $intent = PaymentIntent::findOrFail($id);
    $this->authorize('view', $intent);

    if ($intent->status === 'paid') {
      return response()->json(['message' => 'No se puede cancelar un pago pagado.'], 409);
    }

    $intent->markCancelled([
      'cancel_note' => $request->input('note'),
    ]);

    return response()->json(['data' => $intent]);
  }
}
