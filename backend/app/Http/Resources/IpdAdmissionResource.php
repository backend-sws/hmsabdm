<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class IpdAdmissionResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $patient = $this->patient;

        // Calculate age
        $age = null;
        if ($patient && $patient->dob) {
            $dob = $patient->dob instanceof \DateTimeInterface ? $patient->dob : new \DateTime($patient->dob);
            $age = $dob->diff(new \DateTime())->y . ' Y';
        }

        return [
            'id'                => $this->id,
            'ipd_number'        => $this->ipd_number,
            'admission_type'    => $this->admission_type,
            'admission_reason'  => $this->admission_reason,
            'is_mlc'            => (bool) $this->is_mlc,
            'mlc_details'       => $this->mlc_details,
            'status'            => $this->status,
            'admission_date'    => $this->admission_date instanceof \DateTimeInterface ? $this->admission_date->format('Y-m-d H:i:s') : $this->admission_date,
            'discharge_date'    => $this->discharge_date instanceof \DateTimeInterface ? $this->discharge_date->format('Y-m-d H:i:s') : $this->discharge_date,
            'patient'           => $patient ? [
                'id'                => $patient->id,
                'uhid'              => $patient->uhid,
                'name'              => $patient->name,
                'age'               => $age,
                'gender'            => $patient->gender,
                'mobile'            => $patient->mobile,
                'guardian_name'     => $patient->guardian_name,
                'guardian_relation' => $patient->guardian_relation,
                'guardian_phone'    => $patient->guardian_phone,
                'abha_number'       => $patient->abha_number,
                'abha_address'      => $patient->abha_address,
                'id_proof_type'     => $patient->id_proof_type,
                'id_proof_number'   => $patient->id_proof_number,
                'blood_group'       => $patient->blood_group,
                'address'           => $patient->address,
                'city'              => $patient->city,
                'district'          => $patient->district,
                'state'             => $patient->state,
                'pincode'           => $patient->pincode,
            ] : null,
            'doctor'            => $this->doctor ? [
                'id'             => $this->doctor->id,
                'name'           => $this->doctor->name,
                'specialization' => $this->doctor->specialization,
                'phone'          => $this->doctor->phone,
            ] : null,
            'department'        => $this->department ? [
                'id'   => $this->department->id,
                'name' => $this->department->name,
                'code' => $this->department->code,
            ] : null,
            'ward'              => $this->ward ? [
                'id'           => $this->ward->id,
                'name'         => $this->ward->name,
                'code'         => $this->ward->code,
                'floor'        => $this->ward->floor,
                'daily_charge' => $this->ward->daily_charge,
            ] : null,
            'bed'               => $this->bed ? [
                'id'           => $this->bed->id,
                'bed_number'   => $this->bed->bed_number,
                'status'       => $this->bed->status,
                'daily_charge' => $this->bed->daily_charge ?? $this->ward?->daily_charge,
            ] : null,
            'attendant'         => [
                'name'     => $this->attendant_name,
                'relation' => $this->attendant_relation,
                'phone'    => $this->attendant_phone,
                'address'  => $this->attendant_address,
            ],
            'financials'        => [
                'advance_deposit'   => (float) $this->advance_deposit,
                'payment_status'    => $this->payment_status,
                'payment_method'    => $this->payment_method,
                'payment_ref'       => $this->payment_ref,
                'payment_breakdown' => $this->payment_breakdown ?: [],
            ],
            'latest_vital'      => $this->patient?->latestVital,
            'created_at'        => $this->created_at instanceof \DateTimeInterface ? $this->created_at->toIso8601String() : $this->created_at,
        ];
    }
}
