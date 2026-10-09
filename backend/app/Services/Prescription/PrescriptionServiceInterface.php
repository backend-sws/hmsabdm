<?php

namespace App\Services\Prescription;

interface PrescriptionServiceInterface
{
    public function searchMedicines(string $query, int $limit = 20);

    public function searchDiagnoses(string $query, int $limit = 20);

    public function searchInvestigations(string $query, ?string $category = null, int $limit = 25);

    public function createPrescription(int $hospitalId, int $doctorId, array $data);
 
    public function updatePrescription(int $hospitalId, int $id, array $data);

    public function getPrescription(int $hospitalId, int $id);

    public function getPatientPrescriptions(int $hospitalId, int $patientId);

    public function getVisitPrescription(int $hospitalId, int $visitId);
}
