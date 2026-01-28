<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HospitalizationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'patient_id'     => $this->patient_id,
            'tutor_id'       => $this->tutor_id,
            'admission_date' => optional($this->admission_date)->toDateString(),
            'discharge_date' => optional($this->discharge_date)->toDateString(),
            'status'         => $this->status,
            'bed_number'     => $this->bed_number,
            'notes'          => $this->notes,
            'created_at'     => $this->created_at?->toISOString(),
            'updated_at'     => $this->updated_at?->toISOString(),

            // Relaciones
            'patient' => $this->whenLoaded('patient', function () {
                return [
                    'id'   => $this->patient->id,
                    'name' => $this->patient->name ?? null,
                ];
            }),

            'tutor' => $this->whenLoaded('tutor', function () {
                return [
                    'id'   => $this->tutor->id,
                    'name' => $this->tutor->name ?? null,
                ];
            }),
        ];
    }
}
