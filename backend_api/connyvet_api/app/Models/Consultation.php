<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Consultation extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $table = 'consultations';

    protected $fillable = [
        'patient_id',
        'tutor_id',
        'doctor_id',
        'created_by',
        'updated_by',
        // 'clinic_id',

        'date',
        'visit_type',
        'reason',

        'anamnesis',
        'physical_exam',
        'diagnosis_primary',
        'diagnosis_secondary',
        'treatment',
        'recommendations',

        'weight_kg',
        'temperature_c',
        'heart_rate',
        'respiratory_rate',
        'body_condition_score',

        'next_control_date',

        'status',
        'active',

        'attachments_meta',
        'extra_data',
    ];

    protected $casts = [
        'date'              => 'datetime',
        'next_control_date' => 'date',

        'weight_kg'         => 'decimal:2',
        'temperature_c'     => 'decimal:1',

        'heart_rate'        => 'integer',
        'respiratory_rate'  => 'integer',
        'body_condition_score' => 'integer',

        'active'           => 'boolean',
        'attachments_meta' => 'array',
        'extra_data'       => 'array',
    ];

    // Relaciones
    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function tutor()
    {
        return $this->belongsTo(Tutor::class);
    }

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    // Ejemplo: etiqueta corta de estado
    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'abierta' => 'Abierta',
            'anulada' => 'Anulada',
            default   => 'Cerrada',
        };
    }

    public function prescription()
{
    return $this->hasOne(ConsultationPrescription::class, 'consultation_id');
}

public function examOrders()
{
    return $this->hasMany(ConsultationExamOrder::class, 'consultation_id')
        ->orderBy('sort_order')
        ->orderBy('id');
}


public function attachments()
{
  return $this->hasMany(\App\Models\ConsultationAttachment::class);
}
}
