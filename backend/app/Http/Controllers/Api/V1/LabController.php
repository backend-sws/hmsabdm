<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Traits\HasApiResponse;
use App\Services\Lab\LabServiceInterface;
use Illuminate\Http\Request;

class LabController extends Controller
{
    use HasApiResponse;

    public function __construct(
        protected LabServiceInterface $labService
    ) {}

    /**
     * Get live list of laboratory worklist orders
     */
    public function orders(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $orders = $this->labService->getOrders($hospitalId, $request);
        return $this->paginatedOrSuccessResponse($orders, 'Laboratory orders retrieved successfully');
    }

    /**
     * Manually trigger auto-intake sync of billed prescription investigations
     */
    public function syncBilled(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $count = $this->labService->syncBilledInvestigations($hospitalId);
        return $this->successResponse(['synced_count' => $count], "Successfully synced {$count} billed lab orders");
    }

    /**
     * Get single LabOrder with items, parameters, and results
     */
    public function showOrder(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $order = $this->labService->getOrder($hospitalId, (int) $id);
        return $this->successResponse($order, 'Laboratory order details retrieved successfully');
    }

    /**
     * Phlebotomy: Mark sample collected & generate barcode accession number
     */
    public function collectSample(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $userId = $request->user()?->id ?? 1;
        $order = $this->labService->markSampleCollected($hospitalId, (int) $id, $userId, $request->all());
        return $this->successResponse($order, 'Sample collected successfully. Accession number generated.');
    }

    /**
     * Record laboratory test results with live formula evaluations
     */
    public function recordResults(Request $request, $id)
    {
        $request->validate([
            'results' => 'required|array',
            'results.*.order_item_id' => 'required|integer',
        ]);

        $hospitalId = $this->getHospitalId($request);
        $userId = $request->user()?->id ?? 1;
        $order = $this->labService->recordResults($hospitalId, (int) $id, $userId, $request->all());
        return $this->successResponse($order, 'Test results recorded and verified against reference ranges');
    }

    /**
     * Pathologist authorization & sign-off release
     */
    public function authorizeOrder(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $doctorId = $request->user()?->doctor?->id;
        $order = $this->labService->authorizeReport($hospitalId, (int) $id, $doctorId, $request->all());
        return $this->successResponse($order, 'Diagnostic report successfully authorized and released');
    }

    /**
     * Pathologist independent test approval for selected test items
     */
    public function approveItems(Request $request, $id)
    {
        $request->validate([
            'item_ids' => 'required|array',
            'item_ids.*' => 'integer',
        ]);

        $hospitalId = $this->getHospitalId($request);
        $doctorId = $request->user()?->doctor?->id;
        $userId = $request->user()?->id ?? 1;
        $itemIds = array_map('intval', $request->input('item_ids', []));
        $notes = $request->input('notes');

        $order = $this->labService->approveOrderItems($hospitalId, (int) $id, $doctorId, $userId, $itemIds, $notes);
        return $this->successResponse($order, count($itemIds) . ' test panel(s) approved and signed off successfully');
    }

    /**
     * Revoke approval for a specific test item
     */
    public function revokeItem(Request $request, $id, $itemId)
    {
        $hospitalId = $this->getHospitalId($request);
        $userId = $request->user()?->id ?? 1;
        $reason = $request->input('reason');

        $order = $this->labService->revokeOrderItem($hospitalId, (int) $id, (int) $itemId, $userId, $reason);
        return $this->successResponse($order, 'Test panel approval revoked for re-examination');
    }

    /**
     * Get complete audit trail of result entries, edits, and approvals
     */
    public function auditLogs(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $logs = $this->labService->getAuditLogs($hospitalId, (int) $id);
        return $this->successResponse($logs, 'Order audit logs retrieved successfully');
    }

    /**
     * Get formatted printable diagnostic report payload
     */
    public function diagnosticReport(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $itemIds = $request->has('tests') && !empty($request->query('tests'))
            ? array_filter(array_map('intval', explode(',', $request->query('tests'))))
            : null;
        $report = $this->labService->getDiagnosticReport($hospitalId, (int) $id, $itemIds);
        return $this->successResponse($report, 'Diagnostic report payload generated successfully');
    }

    /**
     * Public Digital Diagnostic Report verification (for QR-code scanning)
     */
    public function publicDiagnosticReport(Request $request, $id)
    {
        $order = \App\Models\LabOrder::find((int) $id);
        if (!$order) {
            return $this->errorResponse('Diagnostic lab order not found.', 404);
        }
        $hospitalId = $order->hospital_id;
        $itemIds = $request->has('tests') && !empty($request->query('tests'))
            ? array_filter(array_map('intval', explode(',', $request->query('tests'))))
            : null;
        $report = $this->labService->getDiagnosticReport($hospitalId, $order->id, $itemIds);
        return $this->successResponse($report, 'Public diagnostic report retrieved successfully');
    }

    /**
     * Direct Walk-In Lab Booking with instant billing
     */
    public function directBooking(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $userId = $request->user()?->id ?? 1;
        $order = $this->labService->createDirectLabOrder($hospitalId, $userId, $request->all());
        return $this->createdResponse($order, "Walk-in lab order booked successfully. Phlebotomy Token: {$order->token_number}");
    }

    /**
     * Update existing Direct Lab Booking / Invoice
     */
    public function updateDirectBooking(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $userId = $request->user()?->id ?? 1;
        $order = $this->labService->updateDirectLabOrder($hospitalId, (int) $id, $userId, $request->all());
        return $this->successResponse($order, "Lab booking & invoice updated successfully.");
    }

    /**
     * Settle / Collect due balance payment on a lab invoice
     */
    public function collectPayment(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $order = $this->labService->collectInvoicePayment($hospitalId, (int) $id, $request->all());
        return $this->successResponse($order, "Payment collected and receipt updated successfully.");
    }

    /**
     * Revoke pathologist authorization to allow editing
     */
    public function revokeAuthorization(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $userId = $request->user()?->id ?? 1;
        $order = $this->labService->revokeAuthorization($hospitalId, (int) $id, $userId, $request->input('reason'));
        return $this->successResponse($order, "Authorization revoked. Report re-opened for modification.");
    }

    /**
     * List Lab Invoices & Billing History
     */
    public function invoices(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $invoices = $this->labService->getLabInvoices($hospitalId, $request);
        return $this->successResponse($invoices, "Lab billing & invoices history retrieved successfully");
    }

    /**
     * Call next Phlebotomy token for booth
     */
    public function callToken(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $booth = $request->input('booth_number', 'Booth 1');
        $order = $this->labService->callToken($hospitalId, (int) $id, $booth);
        return $this->successResponse($order, "Token {$order->token_number} called for {$booth}");
    }

    /**
     * Live Queue for TV Display Kiosk
     */
    public function queueDisplay(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $queue = $this->labService->getActiveTokensQueue($hospitalId);
        return $this->successResponse($queue, 'Phlebotomy active queue retrieved');
    }

    /**
     * Reject collected sample
     */
    public function rejectSample(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string']);
        $hospitalId = $this->getHospitalId($request);
        $userId = $request->user()?->id ?? 1;
        $order = $this->labService->rejectSample($hospitalId, (int) $id, $userId, $request->all());
        return $this->successResponse($order, 'Sample marked as rejected');
    }

    /**
     * Request re-collection of rejected sample
     */
    public function recollectSample(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $userId = $request->user()?->id ?? 1;
        $order = $this->labService->recollectSample($hospitalId, (int) $id, $userId);
        return $this->successResponse($order, "Recollection token {$order->token_number} raised with STAT priority");
    }

    /**
     * Fetch patient's previous authorized test results for Delta Check
     */
    public function deltaHistory(Request $request, $patientId)
    {
        $hospitalId = $this->getHospitalId($request);
        $history = $this->labService->getPatientPreviousResults($hospitalId, (int) $patientId);
        return $this->successResponse($history, 'Patient previous lab test results retrieved');
    }

    // ==========================================
    // 🗂️ TEST TEMPLATES CATALOG (281+ TESTS)
    // ==========================================

    /**
     * List / search test templates
     */
    public function templates(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $templates = $this->labService->getTemplates($hospitalId, $request);
        return $this->paginatedOrSuccessResponse($templates, 'Test templates catalog retrieved successfully');
    }

    /**
     * Get single test template details
     */
    public function showTemplate(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $template = $this->labService->getTemplate($hospitalId, (int) $id);
        return $this->successResponse($template, 'Test template details retrieved');
    }

    /**
     * Create new custom test template with parameters
     */
    public function storeTemplate(Request $request)
    {
        $request->validate([
            'test_name'      => 'required|string|max:255',
            'test_code'      => 'required|string|max:100',
            'category'       => 'nullable|string|max:100',
            'standard_price' => 'nullable|numeric|min:0',
        ]);

        $hospitalId = $this->getHospitalId($request);
        $template = $this->labService->createTemplate($hospitalId, $request->all());
        return $this->createdResponse($template, 'Test template created successfully');
    }

    /**
     * Update test template details
     */
    public function updateTemplate(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $template = $this->labService->updateTemplate($hospitalId, (int) $id, $request->all());
        return $this->successResponse($template, 'Test template updated successfully');
    }

    /**
     * Deactivate test template
     */
    public function destroyTemplate(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $this->labService->deleteTemplate($hospitalId, (int) $id);
        return $this->successResponse(null, 'Test template deactivated successfully');
    }
}
