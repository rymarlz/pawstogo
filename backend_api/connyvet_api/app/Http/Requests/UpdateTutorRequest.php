<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTutorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // El modelo viene por route model binding: /tutores/{tutor}
        $tutor = $this->route('tutor');

        return [
            'nombres'            => ['sometimes','required','string','max:255'],
            'apellidos'          => ['sometimes','nullable','string','max:255'],

            'rut' => [
                'sometimes','nullable','string','max:255',
                Rule::unique('tutors', 'rut')->ignore($tutor?->id),
            ],

            'email' => [
                'sometimes','nullable','email','max:255',
                Rule::unique('tutors', 'email')->ignore($tutor?->id),
            ],

            'telefono_movil'     => ['sometimes','nullable','string','max:50'],
            'telefono_fijo'      => ['sometimes','nullable','string','max:50'],
            'direccion'          => ['sometimes','nullable','string','max:255'],
            'comuna'             => ['sometimes','nullable','string','max:255'],
            'region'             => ['sometimes','nullable','string','max:255'],

            'estado_civil'       => ['sometimes','nullable','string','max:100'],
            'ocupacion'          => ['sometimes','nullable','string','max:150'],
            'nacionalidad'       => ['sometimes','nullable','string','max:100'],
            'fecha_nacimiento'   => ['sometimes','nullable','date'],

            'banco'              => ['sometimes','nullable','string','max:150'],
            'ejecutivo'          => ['sometimes','nullable','string','max:150'],
            'sucursal'           => ['sometimes','nullable','string','max:150'],
            'tipo_cuenta'        => ['sometimes','nullable','string','max:50'],
            'numero_cuenta'      => ['sometimes','nullable','string','max:100'],
            'titular_cuenta'     => ['sometimes','nullable','string','max:255'],
            'rut_titular'        => ['sometimes','nullable','string','max:255'],
            'alias_transferencia'=> ['sometimes','nullable','string','max:150'],
            'email_para_pagos'   => ['sometimes','nullable','email','max:255'],
            'telefono_banco'     => ['sometimes','nullable','string','max:50'],

            'comentarios'        => ['sometimes','nullable','string'],
            'comentarios_generales' => ['sometimes','nullable','string'],
        ];
    }

    public function messages(): array
    {
        return [
            'rut.unique'   => 'Ya existe un tutor registrado con este RUT.',
            'email.unique' => 'Ya existe un tutor registrado con este correo.',
        ];
    }
}
