<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Hospitalization extends Model
{
    use HasFactory;

    protected $table = 'hospitalizations';

    protected $fillable = [
        'patient_id',
        'tutor_id',
        'admission_date',
        'discharge_date',
        'status',
        'bed_number',
        'notes',
    ];

    protected $casts = [
        'admission_date' => 'date',
        'discharge_date' => 'date',
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
}
