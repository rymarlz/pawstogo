<?php

namespace App\Http\Requests;

use App\Models\Patient;
use App\Models\WaitingRoomEntry;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreWaitingRoomEntryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'patient_id' => ['required', 'integer', 'exists:patients,id'],
            'tutor_id' => [
                'required',
                'integer',
                'exists:tutors,id',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    $patientId = $this->input('patient_id');
                    if (!$patientId) {
                        return;
                    }

                    $patient = Patient::query()->find($patientId);
                    if ($patient && (int) $patient->tutor_id !== (int) $value) {
                        $fail('El paciente seleccionado no pertenece al tutor indicado.');
                    }
                },
            ],
            'reason' => ['required', 'string', 'max:500'],
            'priority' => ['nullable', 'string', Rule::in(WaitingRoomEntry::PRIORITIES)],
            'notes' => ['nullable', 'string'],
        ];
    }
}
