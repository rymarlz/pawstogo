<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PatientResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'tutor_id'    => $this->tutor_id,

            'name'        => $this->name,
            'species'     => $this->species,
            'breed'       => $this->breed,
            'sex'         => $this->sex,
            'birth_date'  => $this->birth_date
                ? $this->birth_date->toDateString()
                : null,
            'color'       => $this->color,

            'photo_url'   => $this->photo_url, // 👈 desde el accessor

            'microchip'   => $this->microchip,
            'weight_kg'   => $this->weight_kg,
            'sterilized'  => (bool) $this->sterilized,
            'notes'       => $this->notes,

            'tutor_name'  => $this->tutor_name,
            'tutor_email' => $this->tutor_email,
            'tutor_phone' => $this->tutor_phone,
            'active'      => (bool) $this->active,

            // ... resto igual ...
        ];
    }
}
