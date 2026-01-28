<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePatientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'tutor_id'    => ['nullable', 'integer', 'exists:tutors,id'],

            'name'        => ['required', 'string', 'max:255'],
            'species'     => ['required', 'string', 'max:50'],
            'breed'       => ['nullable', 'string', 'max:255'],
            'sex'         => ['required', 'in:macho,hembra,desconocido'],
            'birth_date'  => ['nullable', 'date'],
            'color'       => ['nullable', 'string', 'max:255'],

            'photo'       => ['nullable', 'image', 'max:2048'], // 👈 NUEVO

            'microchip'   => ['nullable', 'string', 'max:255', 'unique:patients,microchip'],
            'weight_kg'   => ['nullable', 'numeric', 'min:0'],
            'sterilized'  => ['boolean'],
            'notes'       => ['nullable', 'string'],

            'tutor_name'  => ['required_without:tutor_id', 'string', 'max:255'],
            'tutor_email' => ['nullable', 'email', 'max:255'],
            'tutor_phone' => ['nullable', 'string', 'max:50'],

            'active'      => ['sometimes', 'boolean'],
        ];
    }
}
