<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * Transforma el modelo User a la estructura JSON que consumirá React.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'        => $this->id,
            'name'      => $this->name,
            'email'     => $this->email,

            // En tu BD existe columna "role" (varchar)
            'role'      => $this->role,

            // En la BD la columna es is_active (tinyint 0/1)
            // La exponemos como boolean "active" para el front
            'active'    => (bool) $this->is_active,

            // Extras que tienes en la tabla y pueden servir
            'status'    => $this->status,      // enum('active','inactive','suspended')
            'locale'    => $this->locale,      // 'es'
            'timezone'  => $this->timezone,    // 'America/Santiago'

            // Pistas de auditoría
            'last_login_at' => $this->last_login_at
                ? $this->last_login_at->toIso8601String()
                : null,

            'created_at' => $this->created_at
                ? $this->created_at->toIso8601String()
                : null,

            'updated_at' => $this->updated_at
                ? $this->updated_at->toIso8601String()
                : null,
        ];
    }
}
