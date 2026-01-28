<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * Class VaccineApplication
 *
 * @property int $id
 * @property int|null $patient_id
 * @property int|null $tutor_id
 * @property int|null $doctor_id
 * @property int|null $consultation_id
 * @property int|null $vaccine_id
 *
 * @property string|null $vaccine_name
 * @property string|null $vaccine_code
 * @property int|null $dose_number
 *
 * @property Carbon|null $due_date
 * @property Carbon|null $applied_at
 * @property Carbon|null $expiration_date
 * @property Carbon|null $planned_date
 * @property Carbon|null $next_due_date
 *
 * @property float|null $dose_ml
 * @property float|null $weight_kg
 * @property string|null $batch_number
 * @property string|null $serial_number
 * @property string|null $application_site
 *
 * @property string|null $status
 *
 * @property string|null $notes
 * @property string|null $reactions
 * @property string|null $recommendations
 * @property string|null $observations
 * @property string|null $adverse_reactions
 *
 * @property bool $reminder_sent
 * @property Carbon|null $reminder_sent_at
 *
 * @property bool $active
 * @property array|null $attachments_meta
 * @property array|null $extra_data
 *
 * @property-read string $status_label
 * @property-read bool $is_overdue
 */
class VaccineApplication extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $table = 'vaccine_applications';

    protected $fillable = [
        // Identificación / relaciones base
        'patient_id',
        'tutor_id',
        'doctor_id',
        'consultation_id',
        'vaccine_id',
        'created_by',
        'updated_by',

        // Datos “antiguos” del modelo
        'vaccine_name',
        'vaccine_code',
        'dose_number',

        // Fechas “antiguas”
        'due_date',
        'applied_at',
        'expiration_date',

        // Fechas nuevas
        'planned_date',
        'next_due_date',

        // Datos clínicos extra
        'dose_ml',
        'weight_kg',
        'batch_number',
        'serial_number',
        'application_site',

        // Estado
        'status', // pendiente, aplicada, omitida, vencida

        // Notas / textos
        'notes',
        'reactions',
        'recommendations',
        'observations',
        'adverse_reactions',

        // Recordatorios
        'reminder_sent',
        'reminder_sent_at',

        // Otros
        'active',
        'attachments_meta',
        'extra_data',
    ];

    protected $casts = [
        // Fechas principales
        'due_date'         => 'date',
        'applied_at'       => 'datetime',
        'expiration_date'  => 'date',

        // Fechas nuevas
        'planned_date'     => 'date',
        'next_due_date'    => 'date',

        // Datos numéricos
        'dose_ml'          => 'decimal:2',
        'weight_kg'        => 'decimal:2',

        // Recordatorios
        'reminder_sent'    => 'boolean',
        'reminder_sent_at' => 'datetime',

        // Arrays / JSON
        'attachments_meta' => 'array',
        'extra_data'       => 'array',

        'active'           => 'boolean',
    ];

    /*
     |--------------------------------------------------------------------------
     | Relaciones
     |--------------------------------------------------------------------------
     */

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

    public function vaccine()
    {
        return $this->belongsTo(Vaccine::class, 'vaccine_id');
    }

    public function consultation()
    {
        return $this->belongsTo(Consultation::class, 'consultation_id');
    }

    /*
     |--------------------------------------------------------------------------
     | Accessors / Helpers
     |--------------------------------------------------------------------------
     */

    // Estado legible
    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'pendiente' => 'Pendiente',
            'aplicada'  => 'Aplicada',
            'omitida'   => 'Omitida',
            'vencida'   => 'Vencida',
            default     => ucfirst($this->status ?? 'Pendiente'),
        };
    }

    // ¿Está vencida según planned_date / due_date?
    public function getIsOverdueAttribute(): bool
    {
        /** @var Carbon|null $date */
        $date = $this->planned_date ?? $this->due_date;

        if (! $date instanceof Carbon) {
            return false;
        }

        // vencida si la fecha ya pasó y no está marcada como aplicada
        return $date->lt(now()) && $this->status !== 'aplicada';
    }
}
