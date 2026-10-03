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

    /**
     * Get live visual bed matrix grouped by ward with patient, doctor, and occupancy statistics.
     */
    public function getBedMatrix(int $hospitalId): array;

    /**
     * Record doctor daily inpatient bedside round (SOAP note) and auto-trigger doctor round fee to ledger.
     */
    public function recordDoctorRound(int $hospitalId, int $admissionId, array $data, int $userId): array;

    /**
     * Get all doctor daily rounds for an inpatient admission.
     */
    public function getDoctorRounds(int $hospitalId, int $admissionId): array;

    /**
     * Record bedside nursing procedure and auto-post procedure tariff to patient ledger.
     */
    public function recordNursingProcedure(int $hospitalId, int $admissionId, array $data, int $userId, ?string $nurseName = null): array;

    /**
     * Get all bedside nursing procedures performed for an inpatient admission.
     */
    public function getNursingProcedures(int $hospitalId, int $admissionId): array;

    /**
     * Get complete 360-degree inpatient chart (admission, rounds, vitals, drug chart, procedures, financial ledger).
     */
    public function getInpatientChart(int $hospitalId, int $admissionId): array;

    /**
     * Record fluid intake or output entry for an inpatient admission.
     */
    public function recordIntakeOutput(int $hospitalId, int $admissionId, array $data, ?int $userId = null): array;

    /**
     * Get 24-hour / date-specific fluid balance summary and chronological logs.
     */
    public function getIntakeOutputSummary(int $hospitalId, int $admissionId, ?string $date = null): array;

    /**
     * Record medication administration (Given, Omitted, Refused) against prescription item or SOS.
     */
    public function recordMarAdministration(int $hospitalId, int $admissionId, array $data, ?int $userId = null): array;

    /**
     * Get active MAR drug chart and administration events for an inpatient admission.
     */
    public function getMarDrugChart(int $hospitalId, int $admissionId, ?string $date = null): array;

    /**
     * Record nurse shift handover note.
     */
    public function recordShiftHandover(int $hospitalId, int $admissionId, array $data): array;

    /**
     * Get shift handovers history for an admission.
     */
    public function getShiftHandovers(int $hospitalId, int $admissionId): array;

    /**
     * Acknowledge shift handover by incoming nurse.
     */
    public function acknowledgeShiftHandover(int $hospitalId, int $handoverId, string $incomingNurseName): array;
}

