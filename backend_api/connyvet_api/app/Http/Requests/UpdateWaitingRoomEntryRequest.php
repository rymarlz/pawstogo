<?php

namespace App\Http\Requests;

use App\Models\WaitingRoomEntry;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateWaitingRoomEntryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'reason' => ['sometimes', 'string', 'max:500'],
            'priority' => ['sometimes', 'string', Rule::in(WaitingRoomEntry::PRIORITIES)],
            'status' => ['sometimes', 'string', Rule::in(WaitingRoomEntry::STATUSES)],
            'notes' => ['sometimes', 'nullable', 'string'],
            'consultation_id' => ['sometimes', 'nullable', 'integer', 'exists:consultations,id'],
        ];
    }
}
