<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Payment extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'patient_id',
        'tutor_id',
        'consultation_id',
        'vaccine_application_id',
        'hospitalization_id',

        'concept',
        'amount',
        'status',
        'method',
        'notes',

        'paid_at',
        'cancelled_at',
        'cancelled_reason',
        'created_by',
    ];

    protected $casts = [
        'paid_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function tutor()
    {
        return $this->belongsTo(Tutor::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
