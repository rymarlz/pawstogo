<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class PatientResource extends JsonResource
{
    public function toArray($request): array
    {
        $tutor = $this->whenLoaded('tutor');

        return [
            'id'         => $this->id,
            'tutor_id'   => $this->tutor_id,

            'name'       => $this->name,
            'species'    => $this->species,
            'breed'      => $this->breed,
            'sex'        => $this->sex,

            // 👇 SIEMPRE en formato YYYY-MM-DD para el input date
            'birth_date' => $this->birth_date
                ? $this->birth_date->format('Y-m-d')
                : null,

            'color'      => $this->color,
            'microchip'  => $this->microchip,

            'weight_kg'  => $this->weight_kg,
            'sterilized' => $this->sterilized,
            'notes'      => $this->notes,

            'tutor_name'  => $this->tutor_name,
            'tutor_email' => $this->tutor_email,
            'tutor_phone' => $this->tutor_phone,

            'tutor' => $this->when($tutor, function () use ($tutor) {
                return [
                    'id'    => $tutor->id,
                    'name'  => $tutor->name,
                    'email' => $tutor->email,
                    'phone' => $tutor->phone,
                ];
            }),

            'active'     => $this->active,

            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
