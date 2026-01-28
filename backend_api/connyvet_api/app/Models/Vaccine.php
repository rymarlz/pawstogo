<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Class Vaccine
 *
 * Representa una vacuna disponible en la clínica (catálogo).
 *
 * Campos esperados en la tabla `vaccines`:
 *  - id
 *  - name (string)
 *  - species (string|null)
 *  - manufacturer (string|null)
 *  - short_description (string|null)
 *  - description (text|null)
 *  - default_dose_ml (decimal(8,2)|float|null)
 *  - route (string|null)
 *  - min_age_weeks (int|null)
 *  - max_age_weeks (int|null)
 *  - default_interval_days (int|null)
 *  - is_core (bool)
 *  - active (bool)
 *  - extra_data (json|null)
 *  - created_at, updated_at, deleted_at
 */
class Vaccine extends Model
{
    use HasFactory;
    use SoftDeletes;

    /**
     * Nombre de la tabla (explícito por claridad).
     *
     * @var string
     */
    protected $table = 'vaccines';

    /**
     * Atributos asignables en masa.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'species',
        'manufacturer',
        'short_description',
        'description',
        'default_dose_ml',
        'route',
        'min_age_weeks',
        'max_age_weeks',
        'default_interval_days',
        'is_core',
        'active',
        'extra_data',
    ];

    /**
     * Casts de atributos.
     *
     * @var array<string, string>
     */
    protected $casts = [
        // si en BD es decimal(8,2) esto está bien; si es float, también puedes usar 'float'
        'default_dose_ml'       => 'decimal:2',
        'min_age_weeks'         => 'integer',
        'max_age_weeks'         => 'integer',
        'default_interval_days' => 'integer',
        'is_core'               => 'boolean',
        'active'                => 'boolean',
        'extra_data'            => 'array',
    ];

    /**
     * Relación con aplicaciones de vacuna (agenda / historial de dosis).
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function applications()
    {
        return $this->hasMany(VaccineApplication::class, 'vaccine_id');
    }

    /*
    |--------------------------------------------------------------------------
    | SCOPES ÚTILES
    |--------------------------------------------------------------------------
    */

    /**
     * Scope para filtrar solo vacunas activas.
     */
    public function scopeActive($query)
    {
        return $query->where('active', true);
    }

    /**
     * Scope para filtrar por especie.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @param  string|null  $species
     */
    public function scopeForSpecies($query, ?string $species)
    {
        if (!$species) {
            return $query;
        }

        return $query->where('species', $species);
    }

    /**
     * Scope de búsqueda simple por nombre / descripciones.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @param  string|null  $term
     */
    public function scopeSearch($query, ?string $term)
    {
        if (!$term || trim($term) === '') {
            return $query;
        }

        $term = trim($term);

        return $query->where(function ($q) use ($term) {
            $q->where('name', 'like', '%' . $term . '%')
                ->orWhere('short_description', 'like', '%' . $term . '%')
                ->orWhere('description', 'like', '%' . $term . '%');
        });
    }
}
