<?php

namespace App\Http\Requests\Lab;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLabTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'test_name'        => 'sometimes|required|string|max:255',
            'test_code'        => 'sometimes|required|string|max:100',
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
        ];
    }
}
