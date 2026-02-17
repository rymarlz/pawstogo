<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

// 👇 relaciones nuevas que usaremos en la ficha clínica
use App\Models\Tutor;
use App\Models\Consultation;
use App\Models\VaccineApplication;
use App\Models\Hospitalization;

class Patient extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $table = 'patients';

    protected $fillable = [
        'tutor_id',
        'name',
        'species',
        'breed',
        'sex',
        'birth_date',
        'color',
        'photo_path',
        'microchip',
        'weight_kg',
        'sterilized',
        'notes',
        'tutor_name',
        'tutor_email',
        'tutor_phone',
        'active',
    ];

    protected $casts = [
        'birth_date' => 'date',
        'weight_kg'  => 'decimal:2',
        'sterilized' => 'boolean',
        'active'     => 'boolean',
    ];

    // Para que se incluya automáticamente en el JSON (web + mobile)
    protected $appends = [
        'photo_url',
        'file_number',
        'sex_display',
        'species_display',
    ];

    // ==========================
    // RELACIONES
    // ==========================

    public function tutor()
    {
        return $this->belongsTo(Tutor::class);
    }

    /**
     * Consultas clínicas del paciente.
     */
    public function consultations()
    {
        return $this->hasMany(Consultation::class);
    }

    /**
     * Aplicaciones de vacunas (agenda + historial).
     */
    public function vaccineApplications()
    {
        return $this->hasMany(VaccineApplication::class);
    }

    /**
     * Internaciones / hospitalizaciones del paciente.
     */
    public function hospitalizations()
    {
        return $this->hasMany(Hospitalization::class);
    }

    // ==========================
    // ACCESSORS
    // ==========================

    public function getPhotoUrlAttribute(): ?string
    {
        if (!$this->photo_path) {
            return null;
        }

        return Storage::disk('public')->url($this->photo_path);
    }

    /**
     * N° de ficha: ID del paciente (o file_number si existiera en el futuro).
     * Documentado para web y mobile.
     */
    public function getFileNumberAttribute(): int
    {
        return (int) $this->id;
    }

    /**
     * Sexo para mostrar: Hembra/Macho normalizado.
     */
    public function getSexDisplayAttribute(): string
    {
        $s = strtolower(trim((string) ($this->sex ?? '')));
        if ($s === 'h' || $s === 'hembra') {
            return 'Hembra';
        }
        if ($s === 'm' || $s === 'macho') {
            return 'Macho';
        }
        return $s !== '' ? $this->sex : '—';
    }

    /**
     * Especie para mostrar (capitalizada).
     */
    public function getSpeciesDisplayAttribute(): string
    {
        $s = trim((string) ($this->species ?? ''));
        if ($s === '') {
            return '—';
        }
        return mb_convert_case($s, MB_CASE_TITLE, 'UTF-8');
    }
}
