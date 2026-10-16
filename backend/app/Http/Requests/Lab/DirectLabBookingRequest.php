<?php

namespace App\Http\Requests\Lab;

use Illuminate\Foundation\Http\FormRequest;

class DirectLabBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $input = $this->all();

        // If template_ids is provided but tests is missing, normalize so either works
        if (!empty($input['template_ids']) && empty($input['tests'])) {
            $input['tests'] = array_map(function ($id) {
                return [
                    'test_template_id' => (int) $id,
                    'test_name'        => 'Template #' . $id,
                ];
            }, (array) $input['template_ids']);
        } elseif (!empty($input['tests']) && empty($input['template_ids'])) {
            $templateIds = [];
            foreach ($input['tests'] as $t) {
                if (!empty($t['test_template_id'])) {
                    $templateIds[] = (int) $t['test_template_id'];
                } elseif (!empty($t['id'])) {
                    $templateIds[] = (int) $t['id'];
                }
            }
            if (!empty($templateIds)) {
                $input['template_ids'] = $templateIds;
            }
        }

        // If walkin_patient is provided, mirror to flat patient_name if not set
        if (!empty($input['walkin_patient']['name']) && empty($input['patient_name'])) {
            $input['patient_name'] = $input['walkin_patient']['name'];
        }

        $this->replace($input);
    }

    public function rules(): array
    {
        return [
            'patient_id'        => 'nullable|integer|exists:patients,id',
            'walkin_patient'    => 'nullable|array',
            'walkin_patient.title'    => 'nullable|string|max:50',
            'walkin_patient.name'     => 'required_without:patient_id|string|max:255',
            'walkin_patient.gender'   => 'nullable|string',
            'walkin_patient.age'      => 'nullable|numeric|min:0|max:130',
            'walkin_patient.age_unit' => 'nullable|string|in:Years,Months,Days,years,months,days',
            'walkin_patient.dob'      => 'nullable|date',
            'walkin_patient.mobile'   => 'nullable|string|max:25',
            'walkin_patient.address'  => 'nullable|string|max:500',

            'patient_name'      => 'required_without_all:patient_id,walkin_patient|string|max:255',
            'patient_gender'    => 'nullable|string|in:M,F,O,Male,Female,Other,male,female,other',
            'patient_age'       => 'nullable|numeric|min:0|max:130',
            'patient_age_unit'  => 'nullable|string|in:Years,Months,Days,years,months,days',
            'patient_dob'       => 'nullable|date',
            'patient_phone'     => 'nullable|string|max:25',

            'doctor_id'         => 'nullable|integer|exists:doctors,id',
            'referral_doctor'   => 'nullable|string|max:255',
            'urgency'           => 'nullable|string|in:Routine,Urgent,STAT,routine,urgent,stat',
            'notes'             => 'nullable|string|max:1000',

            'template_ids'      => 'nullable|array',
            'template_ids.*'    => 'integer|exists:lab_test_templates,id',
            'tests'             => 'required_without:template_ids|array|min:1',
            'tests.*.id'        => 'nullable|integer',
            'tests.*.test_template_id' => 'nullable|integer',
            'tests.*.test_name' => 'nullable|string|max:255',
            'tests.*.test_code' => 'nullable|string|max:100',
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

    public function messages(): array
    {
        return [
            'patient_name.required_without_all' => 'Patient name is required when selecting a walk-in patient.',
            'walkin_patient.name.required_without' => 'Patient name is required when registering a walk-in patient.',
            'tests.required_without'            => 'At least one pathology test must be selected for lab booking.',
            'tests.min'                         => 'Please add at least one test to proceed with booking.',
        ];
    }
}
