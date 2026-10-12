<?php

namespace App\Http\Requests\Lab;

use Illuminate\Foundation\Http\FormRequest;

class UpdateDirectLabBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'doctor_id'         => 'nullable|integer|exists:doctors,id',
            'referral_doctor'   => 'nullable|string|max:255',
            'urgency'           => 'nullable|string|in:Routine,Urgent,STAT',
            'notes'             => 'nullable|string|max:1000',
            'tests'             => 'nullable|array',
            'tests.*.id'        => 'nullable|integer',
            'tests.*.test_template_id' => 'nullable|integer',
            'tests.*.test_name' => 'required_with:tests|string|max:255',
            'tests.*.rate'      => 'nullable|numeric|min:0',
            'discount_amount'   => 'nullable|numeric|min:0',
            'paid_amount'       => 'nullable|numeric|min:0',
            'payment_method'    => 'nullable|string|in:cash,card,upi,bank_transfer,insurance,due',
            'transaction_ref'   => 'nullable|string|max:255',
        ];
    }
}
