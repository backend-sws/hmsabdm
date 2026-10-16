<?php

namespace App\Http\Requests\Lab;

use Illuminate\Foundation\Http\FormRequest;

class RecordLabResultsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'results'                       => 'required|array',
            'results.*.order_item_id'       => 'required|integer',
            'results.*.parameter_id'        => 'nullable|integer',
            'results.*.parameter_name'      => 'nullable|string|max:255',
            'results.*.short_code'          => 'nullable|string|max:100',
            'results.*.unit'                => 'nullable|string|max:50',
            'results.*.method'              => 'nullable|string|max:150',
            'results.*.observed_value'      => 'nullable|string|max:50000',
            'results.*.is_calculated'       => 'nullable|boolean',
            'results.*.formula'             => 'nullable|string|max:255',
            'item_remarks'                  => 'nullable|array',
            'item_remarks.*.pathologist_remarks' => 'nullable|string',
            'item_remarks.*.technician_remarks'  => 'nullable|string',
            'item_remarks.*.interpretation'      => 'nullable|string',
            'technician_remarks'            => 'nullable|string|max:2000',
            'clinical_notes'                => 'nullable|string|max:2000',
            'action'                        => 'nullable|string|in:draft,approve',
            'approved_item_ids'             => 'nullable|array',
            'approved_item_ids.*'           => 'integer',
        ];
    }

    public function messages(): array
    {
        return [
            'results.required'                 => 'Results payload is required.',
            'results.*.order_item_id.required' => 'Each result entry must be associated with an order item.',
        ];
    }
}
