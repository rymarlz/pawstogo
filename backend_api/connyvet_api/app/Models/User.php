<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    public const ROLE_ADMIN     = 'admin';
    public const ROLE_DOCTOR    = 'doctor';
    public const ROLE_ASISTENTE = 'asistente';
    public const ROLE_TUTOR     = 'tutor';

    /**
     * Atributos asignables en masa.
     *
     * Nota:
     * - El campo real en DB es `is_active`.
     * - Se permite también `active` para compatibilidad (Flutter/web), y se mapea a `is_active`
     *   mediante el mutador setActiveAttribute().
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'locale',
        'timezone',
        'status',
        'preferences',
        'role',
        'is_active',
        'active',   // 👈 FIX: permite mass assignment sin error (mapea a is_active)
        'phone',
    ];

    /**
     * Atributos ocultos para arrays / JSON.
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Casts.
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'last_login_at'     => 'datetime',
        'preferences'       => 'array',
        'is_active'         => 'boolean',
    ];

    /**
     * Mutador para hashear la contraseña automáticamente.
     */
    protected function password(): Attribute
    {
        return Attribute::make(
            set: fn (?string $value) => $value ? bcrypt($value) : null
        );
    }

    /**
     * Accesor / mutador lógico "active" que mapea a is_active.
     * Esto permite usar $user->active en lugar de is_active.
     */
    public function getActiveAttribute(): bool
    {
        return (bool) $this->is_active;
    }

    public function setActiveAttribute($value): void
    {
        $this->is_active = (bool) $value;
    }
}
