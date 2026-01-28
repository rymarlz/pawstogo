<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Tutor extends Model
{
    use HasFactory;

    protected $table = 'tutors';

    protected $fillable = [
        'nombres',
        'apellidos',
        'rut',
        'email',
        'telefono_movil',
        'telefono_fijo',
        'direccion',
        'comuna',
        'region',
        'estado_civil',
        'ocupacion',
        'nacionalidad',
        'fecha_nacimiento',
        'banco',
        'ejecutivo',
        'sucursal',
        'tipo_cuenta',
        'numero_cuenta',
        'titular_cuenta',
        'rut_titular',
        'alias_transferencia',
        'email_para_pagos',
        'telefono_banco',
        'comentarios',
        'comentarios_generales',
        'active',
    ];

    protected $casts = [
        'active'           => 'boolean',
        'fecha_nacimiento' => 'date',
    ];

    /**
     * Atributos calculados que se agregan al array / JSON.
     */
    protected $appends = [
        'name',
        'phone',
    ];

    /**
     * Accessor para "name" → nombre completo.
     */
    public function getNameAttribute(): string
    {
        $nombres   = $this->attributes['nombres']   ?? '';
        $apellidos = $this->attributes['apellidos'] ?? '';

        $full = trim($nombres . ' ' . $apellidos);

        if ($full !== '') {
            return $full;
        }

        return $nombres !== '' ? $nombres : $apellidos;
    }

    /**
     * Accessor para "phone" → teléfono principal de contacto.
     */
    public function getPhoneAttribute(): ?string
    {
        // Prioridad: móvil > fijo > null
        if (!empty($this->attributes['telefono_movil'])) {
            return $this->attributes['telefono_movil'];
        }

        if (!empty($this->attributes['telefono_fijo'])) {
            return $this->attributes['telefono_fijo'];
        }

        return null;
    }

    /**
     * Relación: un tutor tiene muchos pacientes.
     */
    public function patients()
    {
        return $this->hasMany(Patient::class);
    }

    /**
     * Scope: solo tutores activos.
     */
    public function scopeActive($query)
    {
        return $query->where('active', true);
    }

    /**
     * Scope: tutores inactivos / archivados.
     */
    public function scopeInactive($query)
    {
        return $query->where('active', false);
    }


    public function vaccineApplications()
{
    return $this->hasMany(VaccineApplication::class);
}

}
