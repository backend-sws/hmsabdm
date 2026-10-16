<?php

namespace App\Http\Requests\Lab;

use Illuminate\Foundation\Http\FormRequest;

class AuthorizeLabOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'doctor_id'           => 'nullable|integer|exists:doctors,id',
            'notes'               => 'nullable|string|max:2000',
            'pathologist_remarks' => 'nullable|string|max:5000',
        ];
    }
}
