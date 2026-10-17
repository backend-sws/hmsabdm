<?php

namespace App\Http\Requests\Lab;

use Illuminate\Foundation\Http\FormRequest;

class CollectLabPaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'amount'                => 'required|numeric|min:0.01',
            'payment_method'        => 'required|string|in:cash,card,upi,split,bank_transfer,insurance,cheque,neft',
            'transaction_ref'       => 'nullable|string|max:255',
            'transaction_reference' => 'nullable|string|max:255',
            'utr_number'            => 'nullable|string|max:255',
            'payment_breakdown'     => 'nullable|array',
            'payment_breakdown.*.method' => 'nullable|string',
            'payment_breakdown.*.amount' => 'nullable|numeric|min:0',
            'payment_breakdown.*.ref'    => 'nullable|string|max:255',
            'notes'                 => 'nullable|string|max:500',
        ];
    }

    public function messages(): array
    {
        return [
            'amount.required'         => 'Payment collection amount is required.',
            'amount.min'              => 'Payment amount must be greater than zero.',
            'payment_method.required' => 'Payment mode (cash, card, upi, etc.) must be specified.',
        ];
    }
}
