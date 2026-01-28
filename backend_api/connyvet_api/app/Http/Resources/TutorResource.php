<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class TutorResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     */
    public function toArray($request): array
    {
        return [
            'id'                 => $this->id,
            'nombres'            => $this->nombres,
            'apellidos'          => $this->apellidos,
            'rut'                => $this->rut,
            'email'              => $this->email,
            'telefono_movil'     => $this->telefono_movil,
            'telefono_fijo'      => $this->telefono_fijo,

            // 👇 IMPORTANTE: campos planos, NO objeto
            'direccion'          => $this->direccion,
            'comuna'             => $this->comuna,
            'region'             => $this->region,

            'estado_civil'       => $this->estado_civil,
            'ocupacion'          => $this->ocupacion,
            'nacionalidad'       => $this->nacionalidad,
            'fecha_nacimiento'   => optional($this->fecha_nacimiento)->toDateString(),

            // Info bancaria (todo opcional, como definimos)
            'banco'              => $this->banco,
            'ejecutivo'          => $this->ejecutivo,
            'sucursal'           => $this->sucursal,
            'tipo_cuenta'        => $this->tipo_cuenta,
            'numero_cuenta'      => $this->numero_cuenta,
            'titular_cuenta'     => $this->titular_cuenta,
            'rut_titular'        => $this->rut_titular,
            'alias_transferencia'=> $this->alias_transferencia,
            'email_para_pagos'   => $this->email_para_pagos,
            'telefono_banco'     => $this->telefono_banco,

            'comentarios'        => $this->comentarios,
            'comentarios_generales' => $this->comentarios_generales,

            'created_at'         => optional($this->created_at)->toDateTimeString(),
            'updated_at'         => optional($this->updated_at)->toDateTimeString(),
        ];
    }
}
