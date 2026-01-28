<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePaymentIntentRequest extends FormRequest
{
  public function authorize(): bool { return true; }

  public function rules(): array
  {
    return [
      'patient_id' => ['nullable','integer'],
      'tutor_id' => ['nullable','integer'],
      'consultation_id' => ['nullable','integer'],

      'amount_total' => ['required','integer','min:1'],
      'currency' => ['nullable','string','size:3'],

      'provider' => ['nullable','in:manual,webpay_plus'],
      'title' => ['nullable','string','max:255'],
      'description' => ['nullable','string','max:5000'],
      'meta' => ['nullable','array'],
    ];
  }
}
