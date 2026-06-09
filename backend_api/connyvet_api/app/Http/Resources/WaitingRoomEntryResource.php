<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WaitingRoomEntryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'patient_id' => $this->patient_id,
            'tutor_id' => $this->tutor_id,
            'consultation_id' => $this->consultation_id,
            'reason' => $this->reason,
            'priority' => $this->priority,
            'status' => $this->status,
            'notes' => $this->notes,
            'arrived_at' => $this->arrived_at?->toIso8601String(),
            'started_at' => $this->started_at?->toIso8601String(),
            'attended_at' => $this->attended_at?->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'created_by' => $this->created_by,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),

            'patient' => $this->whenLoaded('patient', function () {
                return [
                    'id' => $this->patient->id,
                    'name' => $this->patient->name,
                    'species' => $this->patient->species,
                    'species_display' => $this->patient->species_display ?? null,
                    'breed' => $this->patient->breed,
                    'file_number' => $this->patient->file_number ?? $this->patient->id,
                ];
            }),

            'tutor' => $this->whenLoaded('tutor', function () {
                return [
                    'id' => $this->tutor->id,
                    'name' => $this->tutor->name ?? null,
                    'rut' => $this->tutor->rut ?? null,
                ];
            }),

            'consultation' => $this->whenLoaded('consultation', function () {
                return [
                    'id' => $this->consultation->id,
                    'status' => $this->consultation->status,
                ];
            }),
        ];
    }
}
