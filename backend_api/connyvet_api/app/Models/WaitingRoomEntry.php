<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class WaitingRoomEntry extends Model
{
    use HasFactory;
    use SoftDeletes;

    public const STATUS_ESPERANDO = 'esperando';
    public const STATUS_EN_ATENCION = 'en_atencion';
    public const STATUS_ATENDIDO = 'atendido';
    public const STATUS_CANCELADO = 'cancelado';

    public const PRIORITY_NORMAL = 'normal';
    public const PRIORITY_URGENTE = 'urgente';

    public const STATUSES = [
        self::STATUS_ESPERANDO,
        self::STATUS_EN_ATENCION,
        self::STATUS_ATENDIDO,
        self::STATUS_CANCELADO,
    ];

    public const PRIORITIES = [
        self::PRIORITY_NORMAL,
        self::PRIORITY_URGENTE,
    ];

    protected $fillable = [
        'patient_id',
        'tutor_id',
        'consultation_id',
        'reason',
        'priority',
        'status',
        'notes',
        'arrived_at',
        'started_at',
        'attended_at',
        'cancelled_at',
        'created_by',
    ];

    protected $casts = [
        'arrived_at'   => 'datetime',
        'started_at'   => 'datetime',
        'attended_at'  => 'datetime',
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

    public function consultation()
    {
        return $this->belongsTo(Consultation::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function applyStatus(string $status): void
    {
        if (!in_array($status, self::STATUSES, true)) {
            return;
        }

        $now = now();

        if ($status === self::STATUS_EN_ATENCION && !$this->started_at) {
            $this->started_at = $now;
        }

        if ($status === self::STATUS_ATENDIDO && !$this->attended_at) {
            $this->attended_at = $now;
        }

        if ($status === self::STATUS_CANCELADO && !$this->cancelled_at) {
            $this->cancelled_at = $now;
        }

        $this->status = $status;
    }
}
