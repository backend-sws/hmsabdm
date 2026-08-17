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
        return [
            'id'           => $this->id,
            'uhid'         => $this->uhid,
            'name'         => $this->name,
            'mobile'       => $this->mobile,
            'abha_number'  => $this->abha_number,
            'abha_address' => $this->abha_address,
            'dob'          => $this->dob ? $this->dob->format('Y-m-d') : null,
            'gender'       => $this->gender,
            'blood_group'  => $this->blood_group,
            'address'      => $this->address,
            'city'         => $this->city,
            'pincode'      => $this->pincode,
            'hospital_id'  => $this->hospital_id,
            'latest_vital' => $this->whenLoaded('latestVital'),
            'created_at'   => $this->created_at?->toIso8601String(),
        ];
    }
}
