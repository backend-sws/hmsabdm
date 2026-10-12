<?php

namespace App\Http\Requests\Lab;

use Illuminate\Foundation\Http\FormRequest;

class StoreLabTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'test_name'        => 'required|string|max:255',
            'test_code'        => 'required|string|max:100',
            'category'         => 'nullable|string|max:100',
            'department_id'    => 'nullable|integer|exists:lab_departments,id',
            'sample_type'      => 'nullable|string|max:100',
            'container_color'  => 'nullable|string|max:100',
            'method'           => 'nullable|string|max:150',
            'tat_hours'        => 'nullable|integer|min:0',
            'standard_price'   => 'nullable|numeric|min:0',
            'description'      => 'nullable|string|max:2000',
            'interpretation'   => 'nullable|string',
            'parameters'       => 'nullable|array',
            'parameters.*.name' => 'required_with:parameters|string|max:255',
            'parameters.*.short_code' => 'nullable|string|max:50',
            'parameters.*.unit' => 'nullable|string|max:50',
            'parameters.*.input_type' => 'nullable|string|in:numeric,text,dropdown,selection,calculated,culture_sensitivity',
            'parameters.*.formula' => 'nullable|string|max:255',
        ];
    }

    public function messages(): array
    {
        return [
            'test_name.required' => 'Test template name is required.',
            'test_code.required' => 'Test template unique code is required.',
        ];
    }
}
