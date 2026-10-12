<?php

namespace App\Http\Requests\Lab;

use Illuminate\Foundation\Http\FormRequest;

class CollectSampleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'sample_type'             => 'nullable|string|max:100',
            'container_color'         => 'nullable|string|max:100',
            'sample_accession_number' => 'nullable|string|max:100',
            'sample_collected_at'     => 'nullable|date',
            'notes'                   => 'nullable|string|max:500',
        ];
    }
}
