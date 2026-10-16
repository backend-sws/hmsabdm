<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PatientResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $lastVisitDate = null;
        $lastVisitType = null;
        $lastDepartment = null;
        $lastDoctor = null;

        if ($this->latestOpdVisit) {
            $lastVisitDate = $this->latestOpdVisit->visit_date instanceof \DateTimeInterface 
                ? $this->latestOpdVisit->visit_date->format('Y-m-d') 
                : ($this->latestOpdVisit->visit_date ?: null);
            $lastVisitType = 'OPD';
            $lastDepartment = $this->latestOpdVisit->department?->name;
            $lastDoctor = $this->latestOpdVisit->doctor?->name;
        } elseif ($this->latestIpdAdmission) {
            $lastVisitDate = $this->latestIpdAdmission->admission_date instanceof \DateTimeInterface 
                ? $this->latestIpdAdmission->admission_date->format('Y-m-d') 
                : ($this->latestIpdAdmission->admission_date ?: null);
            $lastVisitType = 'IPD';
            $lastDepartment = 'IPD Ward';
        } else {
            $lastVisitDate = $this->created_at instanceof \DateTimeInterface 
                ? $this->created_at->format('Y-m-d') 
                : null;
            $lastVisitType = 'Registration';
        }

        return [
            'id'                => $this->id,
            'uhid'              => $this->uhid,
            'name'              => $this->name,
            'first_name'        => $this->name,
            'last_name'         => '',
            'guardian_name'     => $this->guardian_name,
            'guardian_relation' => $this->guardian_relation,
            'guardian_phone'    => $this->guardian_phone,
            'id_proof_type'     => $this->id_proof_type,
            'id_proof_number'   => $this->id_proof_number,
            'mobile'            => $this->mobile,
            'phone'             => $this->mobile ?: ($this->guardian_phone ?: null),
            'abha_number'       => $this->abha_number,
            'abha_address'      => $this->abha_address,
            'dob'               => $this->dob instanceof \DateTimeInterface ? $this->dob->format('Y-m-d') : ($this->dob ?: null),
            'age'               => $this->age,
            'gender'            => $this->gender,
            'blood_group'       => $this->blood_group,
            'address'           => $this->address,
            'city'              => $this->city,
            'district'          => $this->district,
            'state'             => $this->state,
            'pincode'           => $this->pincode,
            'photo'             => $this->photo,
            'kyc_verified'      => (bool) $this->kyc_verified,
            'custom_fields'     => $this->custom_fields ?: new \stdClass(),
            'hospital_id'       => $this->hospital_id,
            'latest_vital'      => $this->whenLoaded('latestVital'),
            'last_visit_date'   => $lastVisitDate,
            'last_visit_type'   => $lastVisitType,
            'last_department'   => $lastDepartment,
            'last_doctor'       => $lastDoctor,
            'created_at'        => $this->created_at instanceof \DateTimeInterface ? $this->created_at->toIso8601String() : ($this->created_at ?: null),
        ];
    }
}
