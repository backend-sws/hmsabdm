<?php

namespace Database\Seeders;

use App\Models\Bed;
use App\Models\Department;
use App\Models\Doctor;
use App\Models\Hospital;
use App\Models\IpdAdmission;
use App\Models\OpdVisit;
use App\Models\Patient;
use App\Models\User;
use App\Models\Ward;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class DemoHospitalClinicalSeeder extends Seeder
{
    /**
     * Seed Demo hospital staff user accounts, realistic Indian demo patients,
     * active IPD ward admissions with occupied beds, and OPD visits.
     */
    public function run(): void
    {
        $hospital = Hospital::first();
        if (!$hospital) {
            return;
        }

        $hId = $hospital->id;
        setPermissionsTeamId($hId);

        // 1. Create Demo Staff User Accounts (password: "password")
        $staffAccounts = [
            [
                'email' => 'admin@demo.com',
                'username' => 'admin',
                'name' => 'Dr. Arvind Mehra (Medical Superintendent)',
                'role' => 'Admin',
            ],
            [
                'email' => 'doctor@demo.com',
                'username' => 'doctor',
                'name' => 'Dr. Rajesh Sharma (Chief Cardiologist)',
                'role' => 'Doctor',
            ],
            [
                'email' => 'nurse@demo.com',
                'username' => 'nurse',
                'name' => 'Sister Mary Joseph (Nursing Supervisor)',
                'role' => 'Nurse',
            ],
            [
                'email' => 'pharmacy@demo.com',
                'username' => 'pharmacy',
                'name' => 'Suresh Joshi (Chief Pharmacist)',
                'role' => 'Pharmacist',
            ],
            [
                'email' => 'lab@demo.com',
                'username' => 'lab',
                'name' => 'Ankita Roy (Senior Pathologist / Lab Tech)',
                'role' => 'Lab Technician',
            ],
            [
                'email' => 'reception@demo.com',
                'username' => 'reception',
                'name' => 'Kavita Nair (Front Desk Receptionist)',
                'role' => 'Receptionist',
            ],
            [
                'email' => 'billing@demo.com',
                'username' => 'billing',
                'name' => 'Rohan Saxena (Billing & Cashier)',
                'role' => 'Cashier',
            ],
        ];

        foreach ($staffAccounts as $acc) {
            $role = Role::firstOrCreate([
                'name' => $acc['role'],
                'guard_name' => 'sanctum',
                'hospital_id' => $hId,
            ]);

            $user = User::firstOrCreate(
                ['email' => $acc['email']],
                [
                    'name' => $acc['name'],
                    'username' => $acc['username'],
                    'password' => Hash::make('password'),
                    'hospital_id' => $hId,
                ]
            );

            if (!$user->hasRole($role)) {
                $user->assignRole($role);
            }
        }

        // 2. Seed Realistic Clinical Patients with UHID
        $patientsData = [
            [
                'uhid' => 'HOSP-2026-00001',
                'name' => 'Ramesh Kumar',
                'gender' => 'M',
                'dob' => '1981-05-12',
                'mobile' => '9876543210',
                'blood_group' => 'A+',
                'address' => 'Flat 204, Shanti Nagar, Andheri East',
                'city' => 'Mumbai',
                'district' => 'Mumbai Suburban',
                'state' => 'Maharashtra',
                'pincode' => '400069',
                'guardian_name' => 'Suman Kumar',
                'guardian_relation' => 'Spouse',
                'guardian_phone' => '9876543299',
                'abha_number' => '91-1234-5678-9012',
                'abha_address' => 'ramesh.kumar@abdm',
                'kyc_verified' => true,
            ],
            [
                'uhid' => 'HOSP-2026-00002',
                'name' => 'Anjali Sharma',
                'gender' => 'F',
                'dob' => '1994-08-23',
                'mobile' => '9876543211',
                'blood_group' => 'O+',
                'address' => 'B-12, Green Park Colony',
                'city' => 'Pune',
                'district' => 'Pune',
                'state' => 'Maharashtra',
                'pincode' => '411001',
                'guardian_name' => 'Vikram Sharma',
                'guardian_relation' => 'Spouse',
                'guardian_phone' => '9876543298',
                'abha_number' => '91-2345-6789-0123',
                'abha_address' => 'anjali.sharma@abdm',
                'kyc_verified' => true,
            ],
            [
                'uhid' => 'HOSP-2026-00003',
                'name' => 'Mohammed Irfan',
                'gender' => 'M',
                'dob' => '1968-11-04',
                'mobile' => '9876543212',
                'blood_group' => 'B+',
                'address' => 'H.No 4-1-89, Banjara Hills',
                'city' => 'Hyderabad',
                'district' => 'Hyderabad',
                'state' => 'Telangana',
                'pincode' => '500034',
                'guardian_name' => 'Faizan Irfan',
                'guardian_relation' => 'Son',
                'guardian_phone' => '9876543297',
                'abha_number' => '91-3456-7890-1234',
                'abha_address' => 'md.irfan@abdm',
                'kyc_verified' => true,
            ],
            [
                'uhid' => 'HOSP-2026-00004',
                'name' => 'Sunita Deshmukh',
                'gender' => 'F',
                'dob' => '1999-03-15',
                'mobile' => '9876543213',
                'blood_group' => 'AB+',
                'address' => 'Plot 55, Civil Lines',
                'city' => 'Nagpur',
                'district' => 'Nagpur',
                'state' => 'Maharashtra',
                'pincode' => '440001',
                'guardian_name' => 'Ashok Deshmukh',
                'guardian_relation' => 'Father',
                'guardian_phone' => '9876543296',
                'abha_number' => '91-4567-8901-2345',
                'abha_address' => 'sunita.deshmukh@abdm',
                'kyc_verified' => true,
            ],
            [
                'uhid' => 'HOSP-2026-00005',
                'name' => 'Harish Verma',
                'gender' => 'M',
                'dob' => '1963-09-30',
                'mobile' => '9876543214',
                'blood_group' => 'O-',
                'address' => 'C-8, Mayur Vihar Phase 1',
                'city' => 'Delhi',
                'district' => 'East Delhi',
                'state' => 'Delhi',
                'pincode' => '110091',
                'guardian_name' => 'Pooja Verma',
                'guardian_relation' => 'Daughter',
                'guardian_phone' => '9876543295',
                'abha_number' => '91-5678-9012-3456',
                'abha_address' => 'harish.verma@abdm',
                'kyc_verified' => true,
            ],
        ];

        $patientMap = [];
        foreach ($patientsData as $p) {
            // Clean up any old dummy records from factories having the same ABHA or mobile under a different UHID
            Patient::where('hospital_id', $hId)
                ->where(function ($q) use ($p) {
                    $q->where('abha_number', $p['abha_number'])
                      ->orWhere('mobile', $p['mobile']);
                })
                ->where('uhid', '!=', $p['uhid'])
                ->delete();

            $patient = Patient::updateOrCreate(
                ['hospital_id' => $hId, 'uhid' => $p['uhid']],
                array_merge($p, ['hospital_id' => $hId])
            );
            $patientMap[$p['uhid']] = $patient;
        }

        // 3. Seed Inpatient (IPD) Admissions and Occupied Beds
        $doctor = Doctor::where('hospital_id', $hId)->first();
        $department = Department::where('hospital_id', $hId)->first();

        // Ward: General Ward Male -> Bed 1
        $gwmWard = Ward::where('hospital_id', $hId)->where('code', 'GWM')->first();
        $gwmBed = Bed::where('hospital_id', $hId)->where('ward_id', $gwmWard?->id)->first();

        // Ward: Deluxe AC -> Bed 1
        $dlxWard = Ward::where('hospital_id', $hId)->where('code', 'DLX')->first();
        $dlxBed = Bed::where('hospital_id', $hId)->where('ward_id', $dlxWard?->id)->first();

        if ($gwmWard && $gwmBed && isset($patientMap['HOSP-2026-00001'])) {
            $ipd1 = IpdAdmission::firstOrCreate(
                ['hospital_id' => $hId, 'ipd_number' => 'IPD-' . $hId . '-2026-0001'],
                [
                    'patient_id'        => $patientMap['HOSP-2026-00001']->id,
                    'doctor_id'         => $doctor?->id,
                    'department_id'     => $department?->id,
                    'ward_id'           => $gwmWard->id,
                    'bed_id'            => $gwmBed->id,
                    'admission_type'    => 'emergency',
                    'admission_reason'  => 'Unstable Angina with severe retrosternal chest pain. Observation & angiography planned.',
                    'status'            => 'admitted',
                    'advance_deposit'   => 15000.00,
                    'admission_date'    => now()->subDays(2),
                    'attendant_name'    => 'Suman Kumar',
                    'attendant_relation'=> 'Spouse',
                    'attendant_phone'   => '9876543299',
                ]
            );

            // Mark bed occupied
            $gwmBed->update(['status' => 'occupied', 'is_active' => true]);
        }

        if ($dlxWard && $dlxBed && isset($patientMap['HOSP-2026-00003'])) {
            $ipd2 = IpdAdmission::firstOrCreate(
                ['hospital_id' => $hId, 'ipd_number' => 'IPD-' . $hId . '-2026-0002'],
                [
                    'patient_id'        => $patientMap['HOSP-2026-00003']->id,
                    'doctor_id'         => $doctor?->id,
                    'department_id'     => $department?->id,
                    'ward_id'           => $dlxWard->id,
                    'bed_id'            => $dlxBed->id,
                    'admission_type'    => 'planned',
                    'admission_reason'  => 'Total Knee Replacement (TKR) post-operative monitoring & rehabilitation.',
                    'status'            => 'admitted',
                    'advance_deposit'   => 50000.00,
                    'admission_date'    => now()->subDays(1),
                    'attendant_name'    => 'Faizan Irfan',
                    'attendant_relation'=> 'Son',
                    'attendant_phone'   => '9876543297',
                ]
            );

            // Mark bed occupied
            $dlxBed->update(['status' => 'occupied', 'is_active' => true]);
        }

        // 4. Seed Active OPD Visits
        if (isset($patientMap['HOSP-2026-00002'])) {
            OpdVisit::firstOrCreate(
                ['hospital_id' => $hId, 'patient_id' => $patientMap['HOSP-2026-00002']->id, 'visit_date' => now()->toDateString()],
                [
                    'opd_number'      => 'OPD-' . $hId . '-2026-0001',
                    'doctor_id'       => $doctor?->id,
                    'department_id'   => $department?->id,
                    'queue_token'     => '101',
                    'status'          => 'in_consultation',
                    'chief_complaint' => 'Persistent dry cough and mild fever for 3 days.',
                    'fee_charged'     => 500.00,
                    'amount_paid'     => 500.00,
                    'payment_status'  => 'paid',
                    'payment_method'  => 'cash',
                ]
            );
        }

        if (isset($patientMap['HOSP-2026-00004'])) {
            OpdVisit::firstOrCreate(
                ['hospital_id' => $hId, 'patient_id' => $patientMap['HOSP-2026-00004']->id, 'visit_date' => now()->toDateString()],
                [
                    'opd_number'      => 'OPD-' . $hId . '-2026-0002',
                    'doctor_id'       => $doctor?->id,
                    'department_id'   => $department?->id,
                    'queue_token'     => '102',
                    'status'          => 'waiting',
                    'chief_complaint' => 'Routine antenatal checkup, 2nd trimester ultrasound review.',
                    'fee_charged'     => 500.00,
                    'amount_paid'     => 500.00,
                    'payment_status'  => 'paid',
                    'payment_method'  => 'upi',
                ]
            );
        }

        $this->command->info('Demo Hospital staff accounts, clinical patients, IPD admissions, and OPD queue seeded successfully.');
    }
}
