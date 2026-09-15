# Guidance Document for ABDM Compliant HMIS / LMIS

> **Official Reference Document:** National Health Authority (NHA) / Ayushman Bharat Digital Mission (ABDM)  
> **Applicability:** Hospital Management Information Systems (HMIS) & Laboratory Information Management Systems (LMIS)

---

## 1. Overview & Compliance Matrix

This document defines the minimum viable features, recommended enhancements, and high-end enterprise capabilities required for an **ABDM Compliant HMIS/LMIS**, along with official specifications, Swagger schemas, toolkits, and FHIR R4 packaging guidelines.

| Features and Standards | Minimum Viable ABDM Compliant HMIS (M1, M2, M3) | Recommended HMIS | Optional / High-end Features | Documentation & Official Links |
| :--- | :--- | :--- | :--- | :--- |
| **Creation & Verification of ABHA (Health IDs)** | **Creation:** Yes<br>**Verification:** Yes | **Creation:** Yes<br>**Verification:** Yes | - | • [ABDM Health ID Documentation](https://sandbox.abdm.gov.in/docs/healthid)<br>• [ABHA Swagger API Specs](https://healthidsbx.ndhm.gov.in/api/swagger-ui.html#/) |
| **Linking of Health Records (HIP Services)** | **Yes** | **Yes** | - | • [ABDM Build HIP Guide](https://sandbox.abdm.gov.in/docs/build_hip)<br>• [HIP Gateway Swagger YAML](https://sandbox.abdm.gov.in/swagger/ndhm-hip.yaml)<br>• [Building HIP/HIU Video Session](https://www.youtube.com/watch?v=72SRn0wevfY)<br>• [FHIR Compliance Data Packaging Video](https://www.youtube.com/watch?v=l8TiGXX8E34) |
| **Exchange of Health Records (HIU Services)** | **Yes** | **Yes** | - | • [ABDM Build HIU Guide](https://sandbox.abdm.gov.in/docs/build_hiu)<br>• [HIU Gateway Swagger YAML](https://sandbox.abdm.gov.in/swagger/ndhm-hiu.yaml)<br>• [HIU Integration Video Session](https://www.youtube.com/watch?v=oZ9Z2JtO21Q) |
| **Cloud-Based Storage** | Optional | **Yes** + Disaster Recovery Plan | Cloud-model deployment in private / public cloud infrastructure | Hospital-specific cloud architecture documentation |
| **Mobile App for Remote Access** | Optional | Optional | Mobile applications for patients and doctors | N/A |
| **Artificial Intelligence (AI)** | Optional | **Yes** | Clinical decision support, triage assistance | N/A |
| **Speech-to-Text & Text-to-Speech** | Optional | **Yes** | Novel data entry methods (smart pen, voice commands) | N/A |

---

## 2. HMIS Functional Modules

| Module Name | Minimum Viable HMIS | Recommended HMIS | ABDM FHIR R4 Record Type |
| :--- | :--- | :--- | :--- |
| **OPD Registration** | **Yes** | **Yes** | Encounter (`AMB`), Patient, Care Context |
| **OP Consultation** | **Yes** | **Yes** | `OPConsultationRecord` (FHIR Bundle) |
| **Prescription** | **Yes** | **Yes** | `PrescriptionRecord` (FHIR Bundle) |
| **IPD (Inpatient Admission)** | **Yes** | **Yes** | Encounter (`IMP`), Vitals, Clinical Chart |
| **Discharge Summaries** | **Yes** | **Yes** | `DischargeSummaryRecord` (FHIR Bundle) |
| **Laboratory Reports (LIMS)** | **Yes** | **Yes** | `DiagnosticReportRecord` (Lab) |
| **Radiology (RIS)** | **Yes** | **Yes** | `DiagnosticReportRecord` (Radiology) |
| **Billing** | **Yes** | **Yes** | Split payments, Invoices, Receipts |
| **Pharmacy** | **Yes** | **Yes** | Medication Dispense, Inventory |
| **OT (Operation Theatre)** | Optional | **Yes** | Surgical Notes, Anesthesia Records |
| **Inventory** | Optional | **Yes** | Stock & Batch Tracking |
| **Epidemiology / Public Health Dashboard**| Optional | Optional | Disease surveillance & reporting analytics |
| **Dietary & HR Management** | Optional | Optional | Internal Hospital Operations |

---

## 3. Mandatory ABDM FHIR R4 Clinical Bundles

Every clinical transaction shared via ABDM must be packaged as an **ABDM-Profiled FHIR R4 JSON Bundle**:

1. **`OPConsultationRecord`**: Chief complaints, physical examinations, vitals, diagnosis (SNOMED CT), doctor advice, follow-up date.
2. **`PrescriptionRecord`**: Medication name, dosage, frequency, route, duration, instructions.
3. **`DischargeSummaryRecord`**: Admission date, discharge date, reason for admission, hospital course, surgical procedures, condition at discharge, discharge medications.
4. **`DiagnosticReportRecord` (Lab & Radiology)**: Test name (LOINC), specimen, observation values/units, interpretation, report attachments (PDF/A).
5. **`ImmunizationRecord`**: Vaccine code, date of administration, dose number, manufacturer.
6. **`WellnessRecord`**: General fitness, vitals history, lifestyle metrics.
7. **`HealthDocumentRecord`**: Generic scanned clinical records & attachments in PDF/A.

### Technical Data Preparation Links:
* **Data Preparation Guide:** [https://sandbox.abdm.gov.in/docs/data_preparation](https://sandbox.abdm.gov.in/docs/data_preparation)
* **Main FHIR Envelope:** [https://sandbox.abdm.gov.in/docs/main_envelope](https://sandbox.abdm.gov.in/docs/main_envelope)
* **Diagnostic Report Specs:** [https://sandbox.abdm.gov.in/docs/diagnostic_report](https://sandbox.abdm.gov.in/docs/diagnostic_report)
* **Data Encryption / Decryption (Diffie-Hellman Key Exchange):** [https://sandbox.abdm.gov.in/docs/data_encrypt_decrypt](https://sandbox.abdm.gov.in/docs/data_encrypt_decrypt)

---

## 4. Medical Terminology & Coding Standards

| Standard | Minimum Viable HMIS | Recommended HMIS | Purpose / Integration Resources |
| :--- | :--- | :--- | :--- |
| **SNOMED CT** | **Yes** | **Yes** | Clinical findings, symptoms, diagnoses, procedures.<br>• [NRCeS SNOMED CT Toolkit](https://www.nrces.in/services/tools-and-technologies)<br>• [C-DAC MedInfo SDK](https://www.cdac.in/index.aspx?id=hi_hs_medinfo_sdk_home) |
| **LOINC** | **Yes** | **Yes** | Laboratory tests, observations, diagnostic investigations.<br>• [NRCeS LOINC Guide](https://www.nrces.in/resources) |
| **ICD-10 (WHO)** | Optional (Mapped from SNOMED) | **Yes** (For reporting) | Disease classification and statutory public health reporting.<br>• [ICD-10 Mapping Guide](https://www.nrces.in/resources) |

---

## 5. Clinical Data Capture Formats & Device Interfacing

### Supported Media Formats:
* **Still Images:** JPEG / PNG
* **Audio (Voice Notes):** MP3 / OGG
* **Video (Endoscopy / Surgery):** MP4 / MOV
* **Clinical Documents & Reports:** PDF/A-2 format (ISO 19005-2)

### Diagnostic Systems Interoperability:
* **RIS (Radiology Information System):** DICOM compliant reports; DICOM/PACS interface for medical imaging (X-Ray, CT, MRI, Ultrasound).
* **LIS (Laboratory Information System):** LOINC codes for test observations; HL7 v2.x order management & instrument interfacing.
* **Medical Devices:** Standard device communication via TWAIN / DICOM / HL7 v2.x / Web API.

---

## 6. Privacy, Security & Governance Standards

| Requirement | Minimum Standard | Recommended Standard | Reference |
| :--- | :--- | :--- | :--- |
| **Health Data Management Policy** | **Yes** | **Yes** | [ABDM Data Management Policy](https://abdm.gov.in/publications/policies_regulations/health_data_management_policy) |
| **Role-Based Access Control (RBAC)**| **Yes** | **Yes** | Super Admin, Hospital Admin, Doctor, Nurse, Receptionist, Lab Tech, Pharmacist |
| **Transport Encryption** | **Yes** | **Yes** | TLS 1.3 / HTTPS on all external and internal endpoints |
| **Data Encryption at Rest** | Optional with safeguards | **Yes** | AES-256 database column/tablespace encryption |
| **Audit Trails & Access Logs** | **Yes** | **Yes** | Immutable timestamped audit log of all clinical record views, edits, and exports |
| **EHR Architecture Standard** | Optional | **Yes** | ISO 18308:2011 & ISO/HL7 10781:2015 (EHR-System Functional Model R2) |

---

## 7. Production Deployment & HFR Linkage

1. **Health Facility Registry (HFR):** Every physical hospital, clinic, or diagnostic center must register on HFR ([https://facility.abdm.gov.in](https://facility.abdm.gov.in)) and obtain a unique **HFR ID / HIP ID**.
2. **HIP Bridge Linking:** The generated **HIP ID** is configured in the HMIS (`hospitals.abdm_hip_id`) to bind the gateway bridge with the hospital tenant.
3. **Consent Manager Gateway:** HMIS securely receives consent notifications, verifies digital signatures, packages FHIR bundles, encrypts payloads using DH key exchange, and pushes health records to the patient's ABHA app.
