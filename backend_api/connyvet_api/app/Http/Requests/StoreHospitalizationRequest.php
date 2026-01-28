<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreHospitalizationRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Aquí podrías controlar roles: admin/doctor/etc.
        return true;
    }

    public function rules(): array
    {
        return [
            'patient_id'     => ['required', 'integer', 'exists:patients,id'],
            'tutor_id'       => ['nullable', 'integer', 'exists:tutors,id'],
            'admission_date' => ['nullable', 'date'],
            'discharge_date' => ['nullable', 'date', 'after_or_equal:admission_date'],
            'status'         => ['required', 'string', 'in:active,discharged,cancelled'],
            'bed_number'     => ['nullable', 'string', 'max:50'],
            'notes'          => ['nullable', 'string'],
        ];
    }
}
