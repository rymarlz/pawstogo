<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class MarkPaymentManualPaidRequest extends FormRequest
{
  public function authorize(): bool { return true; }

  public function rules(): array
  {
    return [
      'amount' => ['required','integer','min:1'],
      'note' => ['nullable','string','max:500'],
      'reference' => ['nullable','string','max:120'], // ej: nro transferencia/boleta
    ];
  }
}
