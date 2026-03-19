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
        'payment_intent_id',

        'concept',
        'amount',
        'status',
        'method',
        'notes',

        'payment_link',
        'mp_preference_id',
        'external_reference',

        'email_sent_at',
        'email_error',
        'mercadopago_status',
        'mercadopago_status_detail',

        'paid_at',
        'cancelled_at',
        'cancelled_reason',
        'created_by',
    ];

    protected $casts = [
        'paid_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'email_sent_at' => 'datetime',
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

    public function paymentIntent()
    {
        return $this->belongsTo(PaymentIntent::class);
    }
}
