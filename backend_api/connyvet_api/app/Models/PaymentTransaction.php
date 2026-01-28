<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentTransaction extends Model
{
  protected $fillable = [
    'payment_intent_id',
    'provider', 'status',
    'amount', 'currency',
    'external_id', 'authorization_code', 'response_code',
    'redirect_url', 'return_url',
    'request_payload', 'response_payload',
  ];

  protected $casts = [
    'request_payload' => 'array',
    'response_payload' => 'array',
  ];

  public function intent(): BelongsTo
  {
    return $this->belongsTo(PaymentIntent::class, 'payment_intent_id');
  }
}
