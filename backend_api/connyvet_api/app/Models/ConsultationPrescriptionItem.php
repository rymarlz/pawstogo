<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConsultationPrescriptionItem extends Model
{
    protected $table = 'consultation_prescription_items';

    protected $fillable = [
        'prescription_id',
        'drug_name',
        'presentation',
        'dose',
        'frequency',
        'duration_days',
        'route',
        'instructions',
        'sort_order',
    ];

    public function prescription()
    {
        return $this->belongsTo(ConsultationPrescription::class, 'prescription_id');
    }
}
