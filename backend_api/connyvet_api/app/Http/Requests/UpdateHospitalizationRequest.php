<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateHospitalizationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'patient_id'     => ['sometimes', 'integer', 'exists:patients,id'],
            'tutor_id'       => ['nullable', 'integer', 'exists:tutors,id'],
            'admission_date' => ['nullable', 'date'],
            'discharge_date' => ['nullable', 'date', 'after_or_equal:admission_date'],
            'status'         => ['sometimes', 'string', 'in:active,discharged,cancelled'],
            'bed_number'     => ['nullable', 'string', 'max:50'],
            'notes'          => ['nullable', 'string'],
        ];
    }
}
