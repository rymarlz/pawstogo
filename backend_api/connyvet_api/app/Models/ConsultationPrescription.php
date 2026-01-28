<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConsultationPrescription extends Model
{
    protected $table = 'consultation_prescriptions';

    protected $fillable = [
        'consultation_id',
        'notes',
        'created_by',
        'updated_by',
    ];

    public function consultation()
    {
        return $this->belongsTo(Consultation::class);
    }

    public function items()
    {
        return $this->hasMany(ConsultationPrescriptionItem::class, 'prescription_id')
            ->orderBy('sort_order')
            ->orderBy('id');
    }
}
