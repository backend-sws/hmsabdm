<?php

namespace App\Services\Ipd;

use App\Models\IpdAdmission;

interface IpdServiceInterface
{
    /**
     * Get all active wards with bed counts.
     */
    public function getWards(int $hospitalId, $request = null);

    /**
     * Get available (vacant) beds optionally filtered by ward.
     */
    public function getAvailableBeds(int $hospitalId, ?int $wardId = null);

    /**
     * Admit a patient directly to IPD, allocate bed, record advance payment, and issue IPD Parcha.
     */
    public function admitPatient(int $hospitalId, array $data): IpdAdmission;

    /**
     * Get specific IPD Admission by ID with all relations.
     */
    public function getAdmissionById(int $hospitalId, int $id): IpdAdmission;

    /**
     * Get currently admitted inpatients list with filtering and pagination.
     */
    public function getActiveAdmissions(int $hospitalId, $request = null);

    /**
     * Transfer patient to a different bed/ward.
     */
    public function transferBed(int $hospitalId, int $admissionId, int $newBedId): IpdAdmission;

    /**
     * Discharge patient and release bed.
     */
    public function dischargePatient(int $hospitalId, int $id, array $data = []): IpdAdmission;
}
