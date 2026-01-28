<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTutorRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Si más adelante manejas policies, cámbialo.
        return true;
    }

    public function rules(): array
    {
        return [
            // Identidad
            'nombres'            => ['required','string','max:255'],
            'apellidos'          => ['nullable','string','max:255'],
            'rut'                => ['nullable','string','max:255','unique:tutors,rut'],
            'email'             => ['nullable','email','max:255','unique:tutors,email'],

            // Contacto
            'telefono_movil'     => ['nullable','string','max:50'],
            'telefono_fijo'      => ['nullable','string','max:50'],
            'direccion'          => ['nullable','string','max:255'],
            'comuna'             => ['nullable','string','max:255'],
            'region'             => ['nullable','string','max:255'],

            // Perfil
            'estado_civil'       => ['nullable','string','max:100'],
            'ocupacion'          => ['nullable','string','max:150'],
            'nacionalidad'       => ['nullable','string','max:100'],
            'fecha_nacimiento'   => ['nullable','date'],

            // Bancaria (opcional)
            'banco'              => ['nullable','string','max:150'],
            'ejecutivo'          => ['nullable','string','max:150'],
            'sucursal'           => ['nullable','string','max:150'],
            'tipo_cuenta'        => ['nullable','string','max:50'],
            'numero_cuenta'      => ['nullable','string','max:100'],
            'titular_cuenta'     => ['nullable','string','max:255'],
            'rut_titular'        => ['nullable','string','max:255'],
            'alias_transferencia'=> ['nullable','string','max:150'],
            'email_para_pagos'   => ['nullable','email','max:255'],
            'telefono_banco'     => ['nullable','string','max:50'],

            'comentarios'        => ['nullable','string'],
            'comentarios_generales' => ['nullable','string'],
        ];
    }

    public function messages(): array
    {
        return [
            'nombres.required' => 'El nombre del tutor es obligatorio.',
            'rut.unique'       => 'Ya existe un tutor registrado con este RUT.',
            'email.unique'     => 'Ya existe un tutor registrado con este correo.',
        ];
    }
}
