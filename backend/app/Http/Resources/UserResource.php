<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'username' => $this->username,
            'hospital_id' => $this->hospital_id,
            'hospital_name' => $this->hospital?->name,
            'hospital' => $this->hospital ? [
                'id' => $this->hospital->id,
                'name' => $this->hospital->name,
                'code' => $this->hospital->code,
            ] : null,
            'roles' => $this->getRoleNames(),
        ];
    }
}
