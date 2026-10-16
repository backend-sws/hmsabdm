<?php

namespace App\Http\Requests\Lab;

use Illuminate\Foundation\Http\FormRequest;

class RejectSampleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'reason' => 'required|string|min:3|max:500',
        ];
    }

    public function messages(): array
    {
        return [
            'reason.required' => 'Please provide a clinical reason for sample rejection (e.g. Hemolyzed, Clotted, Insufficient quantity).',
            'reason.min'      => 'Rejection reason must be at least 3 characters long.',
        ];
    }
}
