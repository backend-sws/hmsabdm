<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Hospital;
use App\Models\Patient;
use App\Models\Doctor;
use App\Models\Department;
use App\Models\Ward;
use App\Models\Bed;
use App\Models\IpdAdmission;
use App\Models\BillingLedgerItem;
use App\Models\Invoice;
use Database\Seeders\ChargeMasterSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

class DischargeBillingApiTest extends TestCase
{
    use RefreshDatabase;

    protected Hospital $hospital;
    protected User $cashierUser;
    protected Department $department;
    protected Doctor $doctor;
    protected Ward $ward;
    protected Bed $bed;
    protected Patient $patient;
    protected IpdAdmission $admission;

    protected function setUp(): void
    {
        parent::setUp();

        $this->hospital = Hospital::firstOrCreate(
            ['abdm_hip_id' => 'HIP-TEST-DISCHARGE-BILL'],
            ['name' => 'Metro Care Multispeciality Hospital', 'code' => 'MCMH']
        );

        ChargeMasterSeeder::seedHospitalCharges($this->hospital->id);

        $this->cashierUser = User::firstOrCreate(
            ['email' => 'cashier@metrocare.com'],
            ['name' => 'Ramesh Cashier', 'password' => bcrypt('password'), 'hospital_id' => $this->hospital->id]
        );

        $this->department = Department::firstOrCreate(
            ['hospital_id' => $this->hospital->id, 'name' => 'General Surgery'],
            ['code' => 'SURG', 'status' => 'active']
        );

        $this->doctor = Doctor::firstOrCreate(
            ['hospital_id' => $this->hospital->id, 'name' => 'Dr. Arvind Mehra'],
            [
                'department_id'  => $this->department->id,
                'specialization' => 'General Surgeon',
                'status'         => 'active',
                'phone'          => '9811223399',
            ]
        );

        $this->ward = Ward::create([
            'hospital_id'  => $this->hospital->id,
            'name'         => 'Surgical Deluxe Ward',
            'ward_type'    => 'deluxe',
            'daily_charge' => 4500.00,
            'is_active'    => true,
        ]);

        $this->bed = Bed::create([
            'hospital_id'  => $this->hospital->id,
            'ward_id'      => $this->ward->id,
            'bed_number'   => 'DELUXE-101',
            'daily_charge' => 4500.00,
            'status'       => 'available',
            'is_active'    => true,
        ]);

        $this->patient = Patient::create([
            'hospital_id' => $this->hospital->id,
            'name'        => 'Vikram Singhania',
            'gender'      => 'M',
            'dob'         => '1975-08-20',
            'mobile'      => '9822334455',
            'blood_group' => 'B+',
        ]);

        $this->admission = IpdAdmission::create([
            'hospital_id'      => $this->hospital->id,
            'patient_id'        => $this->patient->id,
            'doctor_id'         => $this->doctor->id,
            'department_id'     => $this->department->id,
            'ward_id'           => $this->ward->id,
            'bed_id'            => $this->bed->id,
            'admission_type'    => 'planned',
            'admission_reason'  => 'Laparoscopic Appendectomy',
            'status'            => 'admitted',
            'advance_deposit'   => 10000.00,
            'admission_date'    => now()->subDays(3),
        ]);

        $this->bed->update([
            'status'               => 'occupied',
            'current_admission_id' => $this->admission->id,
        ]);
    }

    public function test_can_preview_pre_discharge_estimate_with_advance_and_unbilled_items()
    {
        Sanctum::actingAs($this->cashierUser);

        // Add 3 unbilled items to patient running ledger
        BillingLedgerItem::create([
            'hospital_id'        => $this->hospital->id,
            'patient_id'         => $this->patient->id,
            'encounter_type'     => 'ipd',
            'encounter_id'       => $this->admission->id,
            'category'           => 'bed_charges',
            'item_name'          => 'Deluxe Room Bed Rent (3 Days)',
            'unit_price'         => 4500.00,
            'quantity'           => 3.0,
            'total_amount'       => 13500.00,
            'charged_at'         => now()->subDay(),
            'status'             => 'unbilled',
            'charged_by_user_id' => 0,
            'auto_generated'     => true,
        ]);

        BillingLedgerItem::create([
            'hospital_id'        => $this->hospital->id,
            'patient_id'         => $this->patient->id,
            'encounter_type'     => 'ipd',
            'encounter_id'       => $this->admission->id,
            'category'           => 'doctor_visit',
            'item_name'          => 'Surgeon Daily Inpatient Rounds',
            'unit_price'         => 500.00,
            'quantity'           => 2.0,
            'total_amount'       => 1000.00,
            'charged_at'         => now()->subDay(),
            'status'             => 'unbilled',
            'charged_by_user_id' => $this->cashierUser->id,
        ]);

        BillingLedgerItem::create([
            'hospital_id'        => $this->hospital->id,
            'patient_id'         => $this->patient->id,
            'encounter_type'     => 'ipd',
            'encounter_id'       => $this->admission->id,
            'category'           => 'nursing_care',
            'item_name'          => 'Surgical Wound Dressing & Nursing Care',
            'unit_price'         => 500.00,
            'quantity'           => 1.0,
            'total_amount'       => 500.00,
            'charged_at'         => now()->subHours(6),
            'status'             => 'unbilled',
            'charged_by_user_id' => $this->cashierUser->id,
        ]);

        // Total Unbilled = 13500 + 1000 + 500 = 15000. Advance = 10000. Balance = 5000.
        $res = $this->getJson("/api/v1/ipd/admissions/{$this->admission->id}/discharge-estimate");

        $res->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.financials.gross_amount', 15000)
            ->assertJsonPath('data.financials.advance_deposit_paid', 10000)
            ->assertJsonPath('data.financials.estimated_balance_due', 5000)
            ->assertJsonPath('data.unbilled_items_count', 3);

        $this->assertCount(3, $res->json('data.category_breakdown'));
    }

    public function test_can_settle_bill_finalize_invoice_free_bed_and_issue_gate_pass()
    {
        Sanctum::actingAs($this->cashierUser);

        // Add 2 ledger items totaling 15,000
        BillingLedgerItem::create([
            'hospital_id'        => $this->hospital->id,
            'patient_id'         => $this->patient->id,
            'encounter_type'     => 'ipd',
            'encounter_id'       => $this->admission->id,
            'category'           => 'bed_charges',
            'item_name'          => 'Deluxe Room Bed Rent',
            'unit_price'         => 13500.00,
            'quantity'           => 1.0,
            'total_amount'       => 13500.00,
            'status'             => 'unbilled',
            'charged_by_user_id' => 0,
        ]);

        BillingLedgerItem::create([
            'hospital_id'        => $this->hospital->id,
            'patient_id'         => $this->patient->id,
            'encounter_type'     => 'ipd',
            'encounter_id'       => $this->admission->id,
            'category'           => 'doctor_visit',
            'item_name'          => 'Doctor Inpatient Visits',
            'unit_price'         => 1500.00,
            'quantity'           => 1.0,
            'total_amount'       => 1500.00,
            'status'             => 'unbilled',
            'charged_by_user_id' => 0,
        ]);

        // Total = 15,000. Discount = 500. Net = 14,500. Advance = 10,000. Amount Paid = 4,500. Balance Due = 0.
        $settleRes = $this->postJson("/api/v1/ipd/admissions/{$this->admission->id}/settle-discharge", [
            'discount_amount'   => 500.00,
            'discount_reason'   => 'Hospital Director Courtesy Discount',
            'amount_paid'       => 4500.00,
            'payment_method'    => 'upi',
            'discharge_type'    => 'normal',
            'discharge_summary' => 'Patient recovered uneventfully. Port wounds healthy. Tolerating oral diet.',
            'discharge_advice'  => 'Avoid heavy lifting for 2 weeks. High protein diet. Tablet Cefixime 200mg BD for 5 days.',
            'final_diagnosis'   => 'Acute Appendicitis post Lap Appendectomy (K35.8)',
            'notes'             => 'Settled at Cashier Counter 1 via UPI',
        ]);

        $settleRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.invoice.gross_amount', 15000)
            ->assertJsonPath('data.invoice.discount_amount', 500)
            ->assertJsonPath('data.invoice.net_amount', 14500)
            ->assertJsonPath('data.invoice.advance_adjusted', 10000)
            ->assertJsonPath('data.invoice.amount_paid', 4500)
            ->assertJsonPath('data.invoice.balance_due', 0)
            ->assertJsonPath('data.invoice.payment_status', 'paid')
            ->assertJsonPath('data.admission.status', 'discharged')
            ->assertJsonPath('data.admission.discharge_type', 'normal')
            ->assertJsonPath('data.bed.status', 'available')
            ->assertJsonPath('data.gate_pass.status', 'cleared');

        $invoiceId = $settleRes->json('data.invoice.id');
        $invoiceNumber = $settleRes->json('data.invoice.invoice_number');
        $gatePassNumber = $settleRes->json('data.gate_pass.gate_pass_number');

        $this->assertStringStartsWith('INV-', $invoiceNumber);
        $this->assertStringStartsWith('GP-', $gatePassNumber);

        // Verify Bed is Freed in DB
        $freshBed = $this->bed->fresh();
        $this->assertEquals('available', $freshBed->status);
        $this->assertNull($freshBed->current_admission_id);

        // Verify all ledger items are marked 'billed' with invoice_id
        $unbilledCount = BillingLedgerItem::where('hospital_id', $this->hospital->id)
            ->where('encounter_type', 'ipd')
            ->where('encounter_id', $this->admission->id)
            ->where('status', 'unbilled')
            ->count();
        $this->assertEquals(0, $unbilledCount);

        $billedCount = BillingLedgerItem::where('hospital_id', $this->hospital->id)
            ->where('invoice_id', $invoiceId)
            ->where('status', 'billed')
            ->count();
        $this->assertEquals(2, $billedCount);
    }

    public function test_can_handle_tpa_insurance_cashless_split_settlement()
    {
        Sanctum::actingAs($this->cashierUser);

        // Large Bill: ₹50,000. Advance: ₹10,000.
        BillingLedgerItem::create([
            'hospital_id'        => $this->hospital->id,
            'patient_id'         => $this->patient->id,
            'encounter_type'     => 'ipd',
            'encounter_id'       => $this->admission->id,
            'category'           => 'procedure',
            'item_name'          => 'Major Surgical Laparoscopy Package',
            'unit_price'         => 50000.00,
            'quantity'           => 1.0,
            'total_amount'       => 50000.00,
            'status'             => 'unbilled',
            'charged_by_user_id' => 0,
        ]);

        // Net = 50,000. Advance = 10,000.
        // TPA Cashless approval = 35,000. Patient copay cash = 5,000. Balance Due = 0.
        $res = $this->postJson("/api/v1/ipd/admissions/{$this->admission->id}/settle-discharge", [
            'insurance_approved_amount' => 35000.00,
            'tpa_claim_number'          => 'CLAIM-STAR-HEALTH-9921',
            'insurance_company_name'    => 'Star Health & Allied Insurance',
            'amount_paid'               => 5000.00,
            'payment_method'            => 'split',
            'payment_breakdown'         => [
                'cash'      => 5000.00,
                'insurance' => 35000.00,
                'advance'   => 10000.00,
            ],
            'discharge_type'            => 'normal',
            'discharge_summary'         => 'Discharged under Star Health cashless claim approval',
        ]);

        $res->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.invoice.gross_amount', 50000)
            ->assertJsonPath('data.invoice.advance_adjusted', 10000)
            ->assertJsonPath('data.invoice.insurance_approved_amount', 35000)
            ->assertJsonPath('data.invoice.tpa_claim_number', 'CLAIM-STAR-HEALTH-9921')
            ->assertJsonPath('data.invoice.amount_paid', 5000)
            ->assertJsonPath('data.invoice.balance_due', 0)
            ->assertJsonPath('data.invoice.payment_status', 'paid');
    }

    public function test_can_fetch_formatted_itemized_tax_invoice_and_security_gate_pass()
    {
        Sanctum::actingAs($this->cashierUser);

        // Add 1 item and settle
        BillingLedgerItem::create([
            'hospital_id'        => $this->hospital->id,
            'patient_id'         => $this->patient->id,
            'encounter_type'     => 'ipd',
            'encounter_id'       => $this->admission->id,
            'category'           => 'bed_charges',
            'item_name'          => 'Room Rent',
            'unit_price'         => 12000.00,
            'quantity'           => 1.0,
            'total_amount'       => 12000.00,
            'status'             => 'unbilled',
            'charged_by_user_id' => 0,
        ]);

        $settleRes = $this->postJson("/api/v1/ipd/admissions/{$this->admission->id}/settle-discharge", [
            'amount_paid'       => 2000.00,
            'payment_method'    => 'cash',
            'discharge_summary' => 'Standard discharge',
        ]);

        $invoiceId = $settleRes->json('data.invoice.id');

        // 1. Fetch Tax Invoice
        $invRes = $this->getJson("/api/v1/invoices/{$invoiceId}");
        $invRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'invoice' => [
                        'id',
                        'invoice_number',
                        'gross_amount',
                        'advance_adjusted',
                        'amount_paid',
                        'patient',
                        'hospital',
                    ],
                    'category_breakdown',
                ],
            ]);

        // 2. Fetch Security Gate Pass
        $gateRes = $this->getJson("/api/v1/ipd/admissions/{$this->admission->id}/gate-pass");
        $gateRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.security_clearance.status', 'APPROVED')
            ->assertJsonPath('data.patient.name', 'Vikram Singhania')
            ->assertJsonPath('data.admission.bed_number', 'DELUXE-101');
    }
}
