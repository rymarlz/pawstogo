<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePatientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $patientId = $this->route('patient')?->id ?? $this->route('patient');

        return [
            'tutor_id'    => ['nullable', 'integer', 'exists:tutors,id'],

            'name'        => ['sometimes', 'required', 'string', 'max:255'],
            'species'     => ['sometimes', 'required', 'string', 'max:50'],
            'breed'       => ['nullable', 'string', 'max:255'],
            'sex'         => ['sometimes', 'required', 'in:macho,hembra,desconocido'],
            'birth_date'  => ['nullable', 'date'],
            'color'       => ['nullable', 'string', 'max:255'],

            'photo'       => ['nullable', 'image', 'max:2048'], // 👈 NUEVO

            'microchip'   => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('patients', 'microchip')->ignore($patientId),
            ],
            'weight_kg'   => ['nullable', 'numeric', 'min:0'],
            'sterilized'  => ['boolean'],
            'notes'       => ['nullable', 'string'],

            'tutor_name'  => ['nullable', 'string', 'max:255'],
            'tutor_email' => ['nullable', 'email', 'max:255'],
            'tutor_phone' => ['nullable', 'string', 'max:50'],

            'active'      => ['sometimes', 'boolean'],
        ];
    }
}
