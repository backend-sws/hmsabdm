<?php

namespace App\Http\Requests\Lab;

use Illuminate\Foundation\Http\FormRequest;

class ApproveOrderItemsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'item_ids'   => 'required|array|min:1',
            'item_ids.*' => 'integer',
            'notes'      => 'nullable|string|max:1000',
        ];
    }

    public function messages(): array
    {
        return [
            'item_ids.required' => 'Please select at least one test panel to approve.',
            'item_ids.min'      => 'At least one test panel must be specified.',
        ];
    }
}
