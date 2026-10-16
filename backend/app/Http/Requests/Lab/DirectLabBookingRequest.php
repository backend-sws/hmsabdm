<?php

namespace App\Http\Requests\Lab;

use Illuminate\Foundation\Http\FormRequest;

class DirectLabBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'patient_id'        => 'nullable|integer|exists:patients,id',
            'patient_name'      => 'required_without:patient_id|string|max:255',
            'patient_gender'    => 'nullable|string|in:M,F,O,Male,Female,Other',
            'patient_age'       => 'nullable|numeric|min:0|max:130',
            'patient_phone'     => 'nullable|string|max:20',
            'doctor_id'         => 'nullable|integer|exists:doctors,id',
            'referral_doctor'   => 'nullable|string|max:255',
            'urgency'           => 'nullable|string|in:Routine,Urgent,STAT',
            'notes'             => 'nullable|string|max:1000',
            'tests'             => 'required|array|min:1',
            'tests.*.id'        => 'nullable|integer',
            'tests.*.test_template_id' => 'nullable|integer',
            'tests.*.test_name' => 'required|string|max:255',
            'tests.*.test_code' => 'nullable|string|max:100',
            'tests.*.rate'      => 'nullable|numeric|min:0',
            'discount_amount'   => 'nullable|numeric|min:0',
            'paid_amount'       => 'nullable|numeric|min:0',
            'payment_method'    => 'nullable|string|in:cash,card,upi,bank_transfer,insurance,due',
            'transaction_ref'   => 'nullable|string|max:255',
        ];
    }

    public function messages(): array
    {
        return [
            'patient_name.required_without' => 'Patient name is required when selecting a walk-in patient.',
            'tests.required'                => 'At least one pathology test must be selected for lab booking.',
            'tests.min'                     => 'Please add at least one test to proceed with booking.',
            'tests.*.test_name.required'    => 'Every selected test must have a valid test name.',
        ];
    }
}
