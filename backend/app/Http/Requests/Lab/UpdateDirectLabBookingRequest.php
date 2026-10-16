<?php

namespace App\Http\Requests\Lab;

use Illuminate\Foundation\Http\FormRequest;

class UpdateDirectLabBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $input = $this->all();
        if (!empty($input['template_ids']) && empty($input['tests'])) {
            $input['tests'] = array_map(function ($id) {
                return [
                    'test_template_id' => (int) $id,
                    'test_name'        => 'Template #' . $id,
                ];
            }, (array) $input['template_ids']);
        }
        $this->replace($input);
    }

    public function rules(): array
    {
        return [
            'walkin_patient'          => 'nullable|array',
            'walkin_patient.title'    => 'nullable|string|max:50',
            'walkin_patient.name'     => 'nullable|string|max:255',
            'walkin_patient.gender'   => 'nullable|string',
            'walkin_patient.age'      => 'nullable|numeric|min:0|max:130',
            'walkin_patient.age_unit' => 'nullable|string|in:Years,Months,Days,years,months,days',
            'walkin_patient.dob'      => 'nullable|date',
            'walkin_patient.mobile'   => 'nullable|string|max:25',
            'walkin_patient.address'  => 'nullable|string|max:500',

            'doctor_id'         => 'nullable|integer|exists:doctors,id',
            'referral_doctor'   => 'nullable|string|max:255',
            'urgency'           => 'nullable|string|in:Routine,Urgent,STAT,routine,urgent,stat',
            'notes'             => 'nullable|string|max:1000',
            
            'template_ids'      => 'nullable|array',
            'template_ids.*'    => 'integer|exists:lab_test_templates,id',
            'tests'             => 'nullable|array',
            'tests.*.id'        => 'nullable|integer',
            'tests.*.test_template_id' => 'nullable|integer',
            'tests.*.test_name' => 'nullable|string|max:255',
            'tests.*.rate'      => 'nullable|numeric|min:0',

            'discount_amount'   => 'nullable|numeric|min:0',
            'discount_reason'   => 'nullable|string|max:255',
            'paid_amount'             => 'nullable|numeric|min:0',
            'payment_method'          => 'nullable|string|in:cash,card,upi,split,bank_transfer,insurance,due,net_banking,other',
            'payment_breakdown'       => 'nullable|array',
            'payment_breakdown.*.method' => 'required_with:payment_breakdown|string|in:cash,upi,card,neft,other',
            'payment_breakdown.*.amount' => 'required_with:payment_breakdown|numeric|min:0',
            'payment_breakdown.*.ref'    => 'nullable|string|max:100',
            'utr_number'              => 'nullable|string|max:100',
            'transaction_reference'   => 'nullable|string|max:100',
            'transaction_ref'         => 'nullable|string|max:255',
        ];
    }
}
