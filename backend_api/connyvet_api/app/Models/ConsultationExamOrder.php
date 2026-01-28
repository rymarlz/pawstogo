<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConsultationExamOrder extends Model
{
    protected $table = 'consultation_exam_orders';

    protected $fillable = [
        'consultation_id',
        'exam_name',
        'priority',
        'status',
        'notes',
        'sort_order',
    ];

    public function consultation()
    {
        return $this->belongsTo(Consultation::class);
    }
}
