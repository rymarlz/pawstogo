<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Budget extends Model
{
  use SoftDeletes;

  protected $fillable = [
    'code','title',
    'patient_id','tutor_id','consultation_id',
    'status','currency','valid_until',
    'notes','terms',
    'subtotal','discount_total','tax_total','total',
    'sent_at',
    'created_by','updated_by',
  ];

  protected $casts = [
    'valid_until' => 'date',
    'sent_at' => 'datetime',
    'subtotal' => 'decimal:2',
    'discount_total' => 'decimal:2',
    'tax_total' => 'decimal:2',
    'total' => 'decimal:2',
  ];

  public function items()
  {
    return $this->hasMany(BudgetItem::class)->orderBy('sort_order')->orderBy('id');
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

  public function creator()
  {
    return $this->belongsTo(User::class, 'created_by');
  }
}
