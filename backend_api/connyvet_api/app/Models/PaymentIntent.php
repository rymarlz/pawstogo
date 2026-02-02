<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PaymentIntent extends Model
{
  protected $fillable = [
    'patient_id', 'tutor_id', 'consultation_id',
    'currency', 'amount_total', 'amount_paid', 'amount_refunded',
    'status', 'provider', 'title', 'description', 'meta'
  ];

  protected $casts = [
    'meta' => 'array',
  ];

  public function transactions(): HasMany
  {
    return $this->hasMany(PaymentTransaction::class);
  }

  public function patient()
  {
    return $this->belongsTo(Patient::class);
  }

  public function tutor()
  {
    return $this->belongsTo(Tutor::class);
  }

  public function consultation()
  {
    return $this->belongsTo(Consultation::class);
  }

  public function markPaid(int $amount, array $meta = []): void
  {
    $this->amount_paid = min($this->amount_total, ($this->amount_paid ?? 0) + $amount);
    $this->status = ($this->amount_paid >= $this->amount_total) ? 'paid' : 'pending';
    if (!empty($meta)) {
      $this->meta = array_merge($this->meta ?? [], $meta);
    }
    $this->save();
  }

  public function markFailed(array $meta = []): void
  {
    $this->status = 'failed';
    if (!empty($meta)) {
      $this->meta = array_merge($this->meta ?? [], $meta);
    }
    $this->save();
  }

  public function markCancelled(array $meta = []): void
  {
    $this->status = 'cancelled';
    if (!empty($meta)) {
      $this->meta = array_merge($this->meta ?? [], $meta);
    }
    $this->save();
  }
}
