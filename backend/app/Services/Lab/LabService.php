<?php

namespace App\Services\Lab;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\LabOrder;
use App\Models\LabOrderItem;
use App\Models\LabTestResult;
use App\Models\LabTestTemplate;
use App\Models\LabParameter;
use App\Models\LabParameterReferenceRange;
use App\Models\PrescriptionInvestigation;
use App\Models\Hospital;
use App\Models\Patient;
use App\Models\Invoice;
use App\Models\BillingLedgerItem;
use App\Models\LabAuditLog;
use App\Models\User;
use App\Http\Traits\CanFilterAndPaginate;

class LabService implements LabServiceInterface
{
    use CanFilterAndPaginate;

    /**
     * Get live list of laboratory orders with status and urgency sorting.
     */
    public function getOrders(int $hospitalId, ?Request $request = null)
    {
        $req = $request ?? request();

        // Auto sync any newly billed prescription investigations first
        $this->syncBilledInvestigations($hospitalId);

        $query = LabOrder::where('hospital_id', $hospitalId)
            ->with([
                'patient',
                'doctor',
                'items.testTemplate',
                'invoice',
                'sampleCollector',
                'authorizingDoctor',
            ])
            ->orderByRaw("CASE WHEN urgency = 'STAT' THEN 1 WHEN urgency = 'Urgent' THEN 2 ELSE 3 END ASC")
            ->orderBy('created_at', 'desc');

        if ($req->filled('status')) {
            $query->where('status', $req->query('status'));
        }

        if ($req->filled('urgency')) {
            $query->where('urgency', $req->query('urgency'));
        }

        if ($req->filled('order_type')) {
            $query->where('order_type', $req->query('order_type'));
        }

        if ($req->filled('date')) {
            $query->whereDate('created_at', $req->query('date'));
        }

        if ($req->filled('search')) {
            $s = trim($req->query('search'));
            $query->where(function ($q) use ($s) {
                $q->where('order_number', 'ilike', "%{$s}%")
                  ->orWhere('sample_accession_number', 'ilike', "%{$s}%")
                  ->orWhereHas('patient', function ($pq) use ($s) {
                      $pq->where('name', 'ilike', "%{$s}%")
                         ->orWhere('uhid', 'ilike', "%{$s}%")
                         ->orWhere('mobile', 'ilike', "%{$s}%");
                  })
                  ->orWhereHas('items', function ($iq) use ($s) {
                      $iq->where('test_name', 'ilike', "%{$s}%")
                         ->orWhere('test_code', 'ilike', "%{$s}%");
                  });
            });
        }

        return $this->applyPaginationOrAll($query, $req, 20);
    }

    /**
     * Automatically intake all billed prescription investigations into LabOrders.
     */
    public function syncBilledInvestigations(int $hospitalId): int
    {
        // Find un-synced billed investigations
        $unlinked = PrescriptionInvestigation::where('hospital_id', $hospitalId)
            ->where('status', 'billed')
            ->whereNotIn('id', function ($q) use ($hospitalId) {
                $q->select('prescription_investigation_id')
                  ->from('lab_order_items')
                  ->where('hospital_id', $hospitalId)
                  ->whereNotNull('prescription_investigation_id');
            })
            ->with(['prescription'])
            ->get();

        if ($unlinked->isEmpty()) {
            return 0;
        }

        $createdCount = 0;

        // Group by (patient_id, prescription_id, billed_invoice_id)
        $groups = $unlinked->groupBy(function ($item) {
            return "{$item->patient_id}_{$item->prescription_id}_{$item->billed_invoice_id}";
        });

        foreach ($groups as $group) {
            DB::transaction(function () use ($hospitalId, $group, &$createdCount) {
                $first = $group->first();
                $datePrefix = date('Ymd');

                // Determine next sequential order number for today
                $todayCount = LabOrder::where('hospital_id', $hospitalId)
                    ->whereDate('created_at', today())
                    ->count();
                $orderNumber = sprintf('LAB-ORD-%s-%04d', $datePrefix, $todayCount + 1);

                // Priority determination
                $urgency = 'Routine';
                foreach ($group as $inv) {
                    $u = strtolower($inv->urgency ?? '');
                    if ($u === 'stat') {
                        $urgency = 'STAT';
                        break;
                    } elseif ($u === 'urgent') {
                        $urgency = 'Urgent';
                    }
                }

                $tokenNumber = $this->generateDailyToken($hospitalId, $urgency);

                $labOrder = LabOrder::create([
                    'hospital_id'     => $hospitalId,
                    'patient_id'      => $first->patient_id,
                    'prescription_id' => $first->prescription_id,
                    'doctor_id'       => $first->prescription?->doctor_id,
                    'invoice_id'      => $first->billed_invoice_id,
                    'order_number'    => $orderNumber,
                    'token_number'    => $tokenNumber,
                    'urgency'         => $urgency,
                    'order_type'      => 'OPD',
                    'status'          => 'pending_sample',
                ]);

                foreach ($group as $inv) {
                    // Try to match LabTestTemplate
                    $template = LabTestTemplate::where(function ($tq) use ($inv) {
                        if ($inv->test_code) {
                            $tq->where('test_code', $inv->test_code);
                        }
                        $tq->orWhere('test_name', 'ilike', trim($inv->test_name));
                    })->first();

                    LabOrderItem::create([
                        'hospital_id'                  => $hospitalId,
                        'order_id'                     => $labOrder->id,
                        'prescription_investigation_id' => $inv->id,
                        'test_template_id'             => $template?->id,
                        'test_name'                    => $inv->test_name,
                        'test_code'                    => $inv->test_code ?? $template?->test_code,
                        'category'                     => $inv->category ?? $template?->category,
                        'rate'                         => $inv->standard_rate ?? $template?->standard_price ?? 0.00,
                        'status'                       => 'pending_sample',
                    ]);
                }

                $createdCount++;
            });
        }

        return $createdCount;
    }

    /**
     * Get single LabOrder with complete items, test parameters, and results.
     */
    public function getOrder(int $hospitalId, int $orderId): LabOrder
    {
        return LabOrder::where('hospital_id', $hospitalId)
            ->where('id', $orderId)
            ->with([
                'patient',
                'doctor',
                'invoice',
                'items.testTemplate.parameters.referenceRanges',
                'items.results',
                'sampleCollector',
                'authorizingDoctor',
            ])
            ->firstOrFail();
    }

    /**
     * Mark sample collected & generate barcode accession number.
     */
    public function markSampleCollected(int $hospitalId, int $orderId, int $userId, array $data): LabOrder
    {
        return DB::transaction(function () use ($hospitalId, $orderId, $userId, $data) {
            $order = LabOrder::where('hospital_id', $hospitalId)
                ->where('id', $orderId)
                ->firstOrFail();

            $datePrefix = date('Ymd');
            $accessionNumber = $order->sample_accession_number;
            if (!$accessionNumber) {
                $todaySampleCount = LabOrder::where('hospital_id', $hospitalId)
                    ->whereNotNull('sample_accession_number')
                    ->whereDate('sample_collected_at', today())
                    ->count();
                $accessionNumber = sprintf('SMP-%s-%04d', $datePrefix, $todaySampleCount + 1);
            }

            $order->update([
                'sample_accession_number'     => $accessionNumber,
                'sample_collected_at'         => now(),
                'sample_collected_by_user_id' => $userId,
                'sample_notes'                => $data['notes'] ?? null,
                'status'                      => 'sample_collected',
            ]);

            // Update items
            LabOrderItem::where('order_id', $order->id)
                ->where('status', 'pending_sample')
                ->update(['status' => 'sample_collected']);

            // Sync with PrescriptionInvestigations
            $itemInvIds = LabOrderItem::where('order_id', $order->id)
                ->whereNotNull('prescription_investigation_id')
                ->pluck('prescription_investigation_id');

            if ($itemInvIds->isNotEmpty()) {
                PrescriptionInvestigation::whereIn('id', $itemInvIds)
                    ->update(['status' => 'sample_collected']);
            }

            return $this->getOrder($hospitalId, $order->id);
        });
    }

    /**
     * Record an audit log entry for lab order actions and modifications.
     */
    public function logAudit(
        int $hospitalId,
        int $orderId,
        ?int $orderItemId,
        ?int $userId,
        string $action,
        string $description,
        ?array $previousValues = null,
        ?array $newValues = null
    ): LabAuditLog {
        return LabAuditLog::create([
            'hospital_id'     => $hospitalId,
            'order_id'        => $orderId,
            'order_item_id'   => $orderItemId,
            'user_id'         => $userId,
            'action'          => $action,
            'description'     => $description,
            'previous_values' => $previousValues,
            'new_values'      => $newValues,
            'ip_address'      => request()?->ip(),
        ]);
    }

    /**
     * Recalculate order status based on its item statuses.
     */
    public function recalculateOrderStatus(LabOrder $order): string
    {
        $items = $order->items()->get();
        if ($items->isEmpty()) {
            return $order->status;
        }

        $totalCount = $items->count();
        $authorizedCount = $items->where('status', 'authorized')->count();
        $completedCount = $items->whereIn('status', ['completed', 'result_entered'])->count();
        $sampleCount = $items->where('status', 'sample_collected')->count();

        if ($authorizedCount === $totalCount) {
            $newStatus = 'authorized';
        } elseif ($authorizedCount > 0) {
            $newStatus = 'partially_authorized';
        } elseif (($authorizedCount + $completedCount) === $totalCount) {
            $newStatus = 'result_entered';
        } elseif (($authorizedCount + $completedCount) > 0) {
            $newStatus = 'result_entered';
        } elseif ($order->sample_accession_number || $sampleCount > 0) {
            $newStatus = 'sample_collected';
        } else {
            $newStatus = 'pending_sample';
        }

        $order->status = $newStatus;
        if ($newStatus === 'authorized' && !$order->authorized_at) {
            $order->authorized_at = now();
        } elseif ($newStatus === 'partially_authorized' && !$order->authorized_at) {
            $order->authorized_at = now();
        }
        $order->save();

        return $newStatus;
    }

    /**
     * Pathologist independent test approval for selected test items.
     */
    public function approveOrderItems(int $hospitalId, int $orderId, ?int $doctorId, ?int $userId, array $itemIds, ?string $notes = null): LabOrder
    {
        return DB::transaction(function () use ($hospitalId, $orderId, $doctorId, $userId, $itemIds, $notes) {
            $order = LabOrder::where('hospital_id', $hospitalId)
                ->with(['items'])
                ->findOrFail($orderId);

            if (empty($itemIds)) {
                throw new \InvalidArgumentException("No test items selected for approval.");
            }

            $selectedItems = $order->items->whereIn('id', $itemIds);
            if ($selectedItems->isEmpty()) {
                throw new \InvalidArgumentException("Selected test items do not belong to this order.");
            }

            // Update item statuses to authorized
            foreach ($selectedItems as $item) {
                $item->update(['status' => 'authorized']);

                // If linked to prescription investigation, mark as completed
                if ($item->prescription_investigation_id) {
                    PrescriptionInvestigation::where('id', $item->prescription_investigation_id)
                        ->update(['status' => 'completed']);
                }
            }

            if ($doctorId) {
                $order->authorized_by_doctor_id = $doctorId;
            }
            if ($notes) {
                $order->authorization_notes = ($order->authorization_notes ? $order->authorization_notes . " | " : "") . $notes;
            }

            // Recalculate overall order status
            $this->recalculateOrderStatus($order);

            $userName = User::find($userId)?->name ?? 'User #' . $userId;
            $approvedNames = $selectedItems->pluck('test_name')->join(', ');

            $this->logAudit(
                $hospitalId,
                $order->id,
                $selectedItems->count() === 1 ? $selectedItems->first()->id : null,
                $userId,
                'test_approved',
                "Approved {$selectedItems->count()} test(s) [{$approvedNames}] by {$userName}" . ($notes ? " (Note: {$notes})" : ""),
                null,
                ['approved_items' => $selectedItems->pluck('id')->toArray(), 'new_status' => $order->status]
            );

            return $this->getOrder($hospitalId, $order->id);
        });
    }

    /**
     * Revoke approval for a specific test item.
     */
    public function revokeOrderItem(int $hospitalId, int $orderId, int $itemId, int $userId, ?string $reason = null): LabOrder
    {
        return DB::transaction(function () use ($hospitalId, $orderId, $itemId, $userId, $reason) {
            $order = LabOrder::where('hospital_id', $hospitalId)
                ->with(['items'])
                ->findOrFail($orderId);

            $item = $order->items->where('id', $itemId)->firstOrFail();
            $item->update(['status' => 'completed']);

            $this->recalculateOrderStatus($order);

            $userName = User::find($userId)?->name ?? 'User #' . $userId;
            $this->logAudit(
                $hospitalId,
                $order->id,
                $item->id,
                $userId,
                'test_revoked',
                "Approval revoked for test '{$item->test_name}' by {$userName}. Reason: " . ($reason ?? 'Re-opened for modification')
            );

            return $this->getOrder($hospitalId, $order->id);
        });
    }

    /**
     * Retrieve audit log history for a lab order.
     */
    public function getAuditLogs(int $hospitalId, int $orderId)
    {
        return LabAuditLog::where('hospital_id', $hospitalId)
            ->where('order_id', $orderId)
            ->with(['user:id,name', 'orderItem:id,test_name'])
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Record laboratory test results with live formula evaluations & range flagging.
     */
    public function recordResults(int $hospitalId, int $orderId, int $userId, array $data): LabOrder
    {
        return DB::transaction(function () use ($hospitalId, $orderId, $userId, $data) {
            $order = LabOrder::where('hospital_id', $hospitalId)
                ->where('id', $orderId)
                ->with(['patient', 'items.testTemplate.parameters.referenceRanges'])
                ->firstOrFail();

            $patientGender = $order->patient?->gender === 'M' ? 'Male' : ($order->patient?->gender === 'F' ? 'Female' : 'Both');
            $patientAgeYears = $order->patient?->dob ? (int) \Carbon\Carbon::parse($order->patient->dob)->age : 30;

            $incomingResults = $data['results'] ?? [];

            // Group incoming results by order_item_id
            $itemResultsMap = [];
            foreach ($incomingResults as $res) {
                $itemId = $res['order_item_id'] ?? null;
                if ($itemId) {
                    $itemResultsMap[$itemId][] = $res;
                }
            }

            // Snapshot prior results for audit diffing before deletion
            $priorResultsByItem = LabTestResult::whereIn('order_item_id', $order->items->pluck('id'))
                ->get()
                ->groupBy('order_item_id');

            $userName = User::find($userId)?->name ?? 'User #' . $userId;

            foreach ($order->items as $item) {
                $resultsList = $itemResultsMap[$item->id] ?? [];
                if (empty($resultsList)) {
                    continue;
                }

                $priorItemResults = $priorResultsByItem->get($item->id, collect());
                $changedDescriptions = [];
                $oldValuesSnapshot = [];
                $newValuesSnapshot = [];

                // First pass: Index known numeric values by short_code for formula evaluation
                $valuesByCode = [];
                foreach ($resultsList as $r) {
                    $code = strtoupper(trim($r['short_code'] ?? ''));
                    $val = $r['observed_value'] ?? null;
                    if ($code && is_numeric($val)) {
                        $valuesByCode[$code] = (float) $val;
                    }
                }

                // Delete prior results for this item to overwrite cleanly
                LabTestResult::where('order_item_id', $item->id)->delete();

                foreach ($resultsList as $pIdx => $r) {
                    $paramId = $r['parameter_id'] ?? null;
                    $param = $paramId ? LabParameter::with('referenceRanges')->find($paramId) : null;
                    
                    $observedValue = $r['observed_value'] ?? null;
                    $isCalculated = !empty($param?->is_calculated) || !empty($r['is_calculated']);
                    $formula = $param?->formula ?? ($r['formula'] ?? null);

                    // Evaluate formula if calculated
                    if ($isCalculated && !empty($formula)) {
                        $evalVal = $this->evaluateFormula($formula, $valuesByCode);
                        if ($evalVal !== null) {
                            $observedValue = (string) $evalVal;
                            if ($param?->short_code) {
                                $valuesByCode[strtoupper(trim($param->short_code))] = $evalVal;
                            }
                        }
                    }

                    $numericVal = is_numeric($observedValue) ? (float) $observedValue : null;

                    // Match reference range for patient gender and age
                    $refRangeText = null;
                    $flag = 'normal';

                    if ($param && $param->referenceRanges->isNotEmpty()) {
                        $range = $param->referenceRanges->first(function ($rg) use ($patientGender, $patientAgeYears) {
                            return ($rg->gender === 'Both' || $rg->gender === $patientGender) &&
                                   ($patientAgeYears >= $rg->age_min && $patientAgeYears <= $rg->age_max);
                        }) ?? $param->referenceRanges->first();

                        if ($range) {
                            $refRangeText = $range->display_range;
                            if ($numericVal !== null && $range->min_val !== null && $range->max_val !== null) {
                                if ($range->panic_min !== null && $numericVal < $range->panic_min) {
                                    $flag = 'panic_low';
                                } elseif ($range->panic_max !== null && $numericVal > $range->panic_max) {
                                    $flag = 'panic_high';
                                } elseif ($numericVal < $range->min_val) {
                                    $flag = 'low';
                                } elseif ($numericVal > $range->max_val) {
                                    $flag = 'high';
                                } else {
                                    $flag = 'normal';
                                }
                            } elseif ($range->normal_value && $observedValue) {
                                if (strcasecmp(trim($observedValue), trim($range->normal_value)) !== 0) {
                                    $flag = 'abnormal';
                                }
                            }
                        }
                    }

                    $pName = $r['parameter_name'] ?? $param?->name ?? 'Parameter';

                    // Track audit diff
                    $priorRes = $priorItemResults->first(function ($pr) use ($paramId, $r) {
                        return ($paramId && $pr->parameter_id == $paramId) ||
                               (!empty($r['short_code']) && strcasecmp($pr->short_code ?? '', $r['short_code']) === 0);
                    });

                    if ($priorRes) {
                        if ((string) $priorRes->observed_value !== (string) $observedValue) {
                            $changedDescriptions[] = "{$pName}: '{$priorRes->observed_value}' -> '{$observedValue}'";
                            $oldValuesSnapshot[$pName] = $priorRes->observed_value;
                            $newValuesSnapshot[$pName] = $observedValue;
                        }
                    } else {
                        $newValuesSnapshot[$pName] = $observedValue;
                    }

                    LabTestResult::create([
                        'hospital_id'          => $hospitalId,
                        'order_item_id'        => $item->id,
                        'parameter_id'         => $paramId,
                        'parameter_name'       => $pName,
                        'short_code'           => $r['short_code'] ?? $param?->short_code,
                        'unit'                 => $r['unit'] ?? $param?->unit,
                        'method'               => $r['method'] ?? $param?->method ?? $item->testTemplate?->method,
                        'observed_value'       => $observedValue,
                        'numeric_value'        => $numericVal,
                        'flag'                 => $flag,
                        'reference_range_text' => $refRangeText,
                        'is_calculated'        => $isCalculated,
                        'formula_used'         => $formula,
                        'display_order'        => $pIdx + 1,
                    ]);
                }

                // Save per-item remarks & custom interpretations
                $itemRemarks = $data['item_remarks'] ?? [];
                $customPathRemarks = $itemRemarks[$item->id]['pathologist_remarks'] 
                    ?? ($itemRemarks[$item->id]['interpretation'] ?? ($data['pathologist_remarks'] ?? $item->pathologist_remarks));
                $customTechRemarks = $itemRemarks[$item->id]['technician_remarks'] 
                    ?? ($data['technician_remarks'] ?? $item->technician_remarks);

                // Determine item status
                $isItemApproved = false;
                if (!empty($data['action']) && $data['action'] === 'approve') {
                    if (isset($data['approved_item_ids']) && is_array($data['approved_item_ids'])) {
                        $isItemApproved = in_array($item->id, $data['approved_item_ids']);
                    } else {
                        $isItemApproved = true;
                    }
                } elseif ($item->status === 'authorized') {
                    $isItemApproved = true;
                }

                $newItemStatus = $isItemApproved ? 'authorized' : 'completed';

                $item->update([
                    'status'              => $newItemStatus,
                    'technician_remarks'  => $customTechRemarks,
                    'pathologist_remarks' => $customPathRemarks,
                ]);

                // Create audit log for this item
                if (!empty($changedDescriptions)) {
                    $this->logAudit(
                        $hospitalId,
                        $order->id,
                        $item->id,
                        $userId,
                        'result_modified',
                        "Results modified for '{$item->test_name}' by {$userName}: " . implode(', ', $changedDescriptions),
                        $oldValuesSnapshot,
                        $newValuesSnapshot
                    );
                } elseif ($priorItemResults->isEmpty() && count($resultsList) > 0) {
                    $this->logAudit(
                        $hospitalId,
                        $order->id,
                        $item->id,
                        $userId,
                        'result_entered',
                        "Results recorded for '{$item->test_name}' by {$userName} (" . count($resultsList) . " parameters)",
                        null,
                        $newValuesSnapshot
                    );
                }
            }

            // Update order metadata
            $orderUpdates = [
                'result_entered_at'         => $order->result_entered_at ?? now(),
                'result_entered_by_user_id' => $userId,
            ];
            if (isset($data['clinical_notes'])) {
                $orderUpdates['clinical_notes'] = $data['clinical_notes'];
            }
            if (!empty($data['doctor_id'])) {
                $orderUpdates['doctor_id'] = $data['doctor_id'];
            }
            if (!empty($data['authorization_notes'])) {
                $orderUpdates['authorization_notes'] = $data['authorization_notes'];
            }
            $order->update($orderUpdates);

            // Recompute overall order status
            $this->recalculateOrderStatus($order);

            return $this->getOrder($hospitalId, $order->id);
        });
    }

    /**
     * Pathologist authorization & signature release.
     */
    public function authorizeReport(int $hospitalId, int $orderId, ?int $doctorId, array $data): LabOrder
    {
        return DB::transaction(function () use ($hospitalId, $orderId, $doctorId, $data) {
            $order = LabOrder::where('hospital_id', $hospitalId)
                ->where('id', $orderId)
                ->firstOrFail();

            $order->update([
                'status'                  => 'authorized',
                'authorized_at'           => now(),
                'authorized_by_doctor_id' => $doctorId ?? $order->doctor_id,
                'authorization_notes'     => $data['notes'] ?? null,
                'clinical_notes'          => $data['clinical_notes'] ?? $order->clinical_notes,
            ]);

            LabOrderItem::where('order_id', $order->id)
                ->update(['status' => 'authorized']);

            // Sync with PrescriptionInvestigations as completed
            $itemInvIds = LabOrderItem::where('order_id', $order->id)
                ->whereNotNull('prescription_investigation_id')
                ->pluck('prescription_investigation_id');

            if ($itemInvIds->isNotEmpty()) {
                PrescriptionInvestigation::whereIn('id', $itemInvIds)
                    ->update(['status' => 'completed']);
            }

            $userId = auth()->id() ?? 1;
            $userName = User::find($userId)?->name ?? 'User #' . $userId;
            $this->logAudit(
                $hospitalId,
                $order->id,
                null,
                $userId,
                'report_authorized',
                "Complete diagnostic report authorized and released by {$userName}" . (!empty($data['notes']) ? " (Note: {$data['notes']})" : "")
            );

            return $this->getOrder($hospitalId, $order->id);
        });
    }

    /**
     * Revoke pathologist authorization to allow modification/re-checking.
     */
    public function revokeAuthorization(int $hospitalId, int $orderId, int $userId, ?string $reason = null): LabOrder
    {
        return DB::transaction(function () use ($hospitalId, $orderId, $userId, $reason) {
            $order = LabOrder::where('hospital_id', $hospitalId)->findOrFail($orderId);
            $order->update([
                'status'                  => 'result_entered',
                'authorized_at'           => null,
                'authorized_by_doctor_id' => null,
                'authorization_notes'     => ($order->authorization_notes ? $order->authorization_notes . " | " : "") . "Revoked: " . ($reason ?? 'Re-opened for modification by pathologist'),
            ]);

            LabOrderItem::where('order_id', $order->id)
                ->update(['status' => 'completed']);

            $userName = User::find($userId)?->name ?? 'User #' . $userId;
            $this->logAudit(
                $hospitalId,
                $order->id,
                null,
                $userId,
                'authorization_revoked',
                "Full report authorization revoked by {$userName}. Reason: " . ($reason ?? 'Re-opened for modification')
            );

            return $this->getOrder($hospitalId, $order->id);
        });
    }

    /**
     * Get complete printable diagnostic report payload with hospital branding.
     */
    public function getDiagnosticReport(int $hospitalId, int $orderId, ?array $itemIds = null): array
    {
        $order = $this->getOrder($hospitalId, $orderId);
        $hospital = Hospital::find($hospitalId);

        $sections = [];
        foreach ($order->items as $item) {
            if (!empty($itemIds) && !in_array($item->id, $itemIds)) {
                continue;
            }
            $results = $item->results;
            $sections[] = [
                'item_id'         => $item->id,
                'test_name'       => $item->test_name,
                'test_code'       => $item->test_code,
                'category'        => $item->category,
                'status'          => $item->status,
                'sample_type'     => $item->testTemplate?->sample_type ?? 'Blood / Serum',
                'container_color' => $item->testTemplate?->container_color,
                'method'          => $item->testTemplate?->method,
                'interpretation'  => $item->pathologist_remarks ?? ($item->testTemplate?->interpretation ?? null),
                'remarks'         => $item->technician_remarks,
                'results'         => $results->map(function ($r) {
                    return [
                        'id'             => $r->id,
                        'name'           => $r->parameter_name,
                        'short_code'     => $r->short_code,
                        'observed_value' => $r->observed_value,
                        'unit'           => $r->unit,
                        'flag'           => $r->flag,
                        'range_text'     => $r->reference_range_text,
                        'is_calculated'  => $r->is_calculated,
                        'method'         => $r->method,
                    ];
                }),
            ];
        }

        return [
            'hospital' => [
                'name'    => $hospital?->name ?? 'Hospital Diagnostic Laboratory',
                'address' => $hospital?->address ?? '',
                'phone'   => $hospital?->phone ?? '',
                'email'   => $hospital?->email ?? '',
                'logo'    => $hospital?->logo ?? null,
            ],
            'order' => [
                'id'                      => $order->id,
                'order_number'            => $order->order_number,
                'sample_accession_number' => $order->sample_accession_number,
                'urgency'                 => $order->urgency,
                'status'                  => $order->status,
                'order_date'              => $order->created_at->format('d M Y, h:i A'),
                'sample_collected_at'     => $order->sample_collected_at?->format('d M Y, h:i A'),
                'result_entered_at'       => $order->result_entered_at?->format('d M Y, h:i A'),
                'authorized_at'           => $order->authorized_at?->format('d M Y, h:i A'),
                'authorization_notes'     => $order->authorization_notes,
                'clinical_notes'          => $order->clinical_notes,
            ],
            'patient' => [
                'id'      => $order->patient?->id,
                'uhid'    => $order->patient?->uhid,
                'name'    => $order->patient?->name,
                'age'     => $order->patient?->dob ? \Carbon\Carbon::parse($order->patient->dob)->age . ' Y' : 'N/A',
                'gender'  => $order->patient?->gender === 'M' ? 'Male' : ($order->patient?->gender === 'F' ? 'Female' : 'Other'),
                'mobile'  => $order->patient?->mobile,
            ],
            'doctor' => [
                'id'             => $order->doctor?->id,
                'name'           => $order->doctor?->name ?? 'Self / Direct OPD',
                'specialization' => $order->doctor?->specialization ?? '',
            ],
            'authorized_by' => [
                'name'           => $order->authorizingDoctor?->name ?? 'Consultant Pathologist',
                'qualification'  => $order->authorizingDoctor?->qualification ?? 'MD (Pathology)',
                'reg_no'         => $order->authorizingDoctor?->registration_number ?? '',
            ],
            'sections' => $sections,
        ];
    }

    /**
     * Safely evaluate arithmetic formula string with parameter values.
     */
    private function evaluateFormula(string $formula, array $values): ?float
    {
        // Replace {CODE} with numeric values
        $expr = $formula;
        foreach ($values as $code => $val) {
            $expr = str_ireplace("{{$code}}", (string) $val, $expr);
        }

        // If curly braces remain, variable is missing
        if (preg_match('/\{[a-zA-Z0-9_]+\}/', $expr)) {
            return null;
        }

        // Sanitize: only allow numbers, dots, spaces, and ()+-*/
        $clean = preg_replace('/[^0-9\.\+\-\*\/\(\)\s]/', '', $expr);
        if (empty(trim($clean))) {
            return null;
        }

        try {
            // Safe evaluation of pure arithmetic expression
            $result = @eval("return ({$clean});");
            return is_numeric($result) ? round((float) $result, 2) : null;
        } catch (\Throwable) {
            return null;
        }
    }

    // ==========================================
    // 🗂️ TEST TEMPLATES CATALOG CRUD
    // ==========================================

    public function getTemplates(int $hospitalId, ?Request $request = null)
    {
        $req = $request ?? request();
        $query = LabTestTemplate::with(['department', 'parameters.referenceRanges'])
            ->where(function ($q) use ($hospitalId) {
                $q->where('hospital_id', $hospitalId)
                  ->orWhereNull('hospital_id');
            })
            ->where('is_active', true)
            ->orderBy('sort_order', 'asc');

        if ($req->filled('category')) {
            $query->where('category', $req->query('category'));
        }

        if ($req->filled('department_id')) {
            $query->where('department_id', $req->query('department_id'));
        }

        if ($req->filled('search')) {
            $s = trim($req->query('search'));
            $query->where(function ($q) use ($s) {
                $q->where('test_name', 'ilike', "%{$s}%")
                  ->orWhere('test_code', 'ilike', "%{$s}%")
                  ->orWhere('sample_type', 'ilike', "%{$s}%");
            });
        }

        return $this->applyPaginationOrAll($query, $req, 50);
    }

    public function getTemplate(int $hospitalId, int $id): LabTestTemplate
    {
        return LabTestTemplate::with(['department', 'parameters.referenceRanges'])
            ->where(function ($q) use ($hospitalId) {
                $q->where('hospital_id', $hospitalId)
                  ->orWhereNull('hospital_id');
            })
            ->where('id', $id)
            ->firstOrFail();
    }

    public function createTemplate(int $hospitalId, array $data): LabTestTemplate
    {
        return DB::transaction(function () use ($hospitalId, $data) {
            $template = LabTestTemplate::create([
                'hospital_id'     => $hospitalId,
                'department_id'   => $data['department_id'] ?? null,
                'category'        => $data['category'] ?? 'Biochemistry',
                'test_code'       => strtoupper(trim($data['test_code'])),
                'test_name'       => trim($data['test_name']),
                'description'     => $data['description'] ?? null,
                'interpretation'  => $data['interpretation'] ?? null,
                'sample_type'     => $data['sample_type'] ?? 'Blood / Serum',
                'container_color' => $data['container_color'] ?? 'Red / Plain',
                'method'          => $data['method'] ?? null,
                'tat_hours'       => $data['tat_hours'] ?? 24,
                'standard_price'  => $data['standard_price'] ?? 0.00,
                'is_panel'        => !empty($data['parameters']) && count($data['parameters']) > 1,
                'is_active'       => true,
            ]);

            if (!empty($data['parameters']) && is_array($data['parameters'])) {
                foreach ($data['parameters'] as $idx => $p) {
                    $param = LabParameter::create([
                        'hospital_id'      => $hospitalId,
                        'test_template_id' => $template->id,
                        'name'             => $p['name'],
                        'short_code'       => $p['short_code'] ?? null,
                        'unit'             => $p['unit'] ?? null,
                        'input_type'       => $p['input_type'] ?? 'numeric',
                        'method'           => $p['method'] ?? null,
                        'options'          => $p['options'] ?? null,
                        'is_calculated'    => !empty($p['is_calculated']),
                        'formula'          => $p['formula'] ?? null,
                        'display_order'    => $idx + 1,
                        'is_mandatory'     => true,
                        'is_active'        => true,
                    ]);

                    if (!empty($p['reference_ranges']) && is_array($p['reference_ranges'])) {
                        foreach ($p['reference_ranges'] as $r) {
                            LabParameterReferenceRange::create([
                                'parameter_id'         => $param->id,
                                'gender'               => $r['gender'] ?? 'Both',
                                'age_min'              => $r['age_min'] ?? 0,
                                'age_max'              => $r['age_max'] ?? 120,
                                'age_unit'             => $r['age_unit'] ?? 'Years',
                                'min_val'              => $r['min_val'] ?? null,
                                'max_val'              => $r['max_val'] ?? null,
                                'panic_min'            => $r['panic_min'] ?? null,
                                'panic_max'            => $r['panic_max'] ?? null,
                                'normal_value'         => $r['normal_value'] ?? null,
                                'display_range'        => $r['display_range'] ?? null,
                                'interpretation_notes' => $r['interpretation_notes'] ?? null,
                            ]);
                        }
                    }
                }
            }

            return $this->getTemplate($hospitalId, $template->id);
        });
    }

    public function updateTemplate(int $hospitalId, int $id, array $data): LabTestTemplate
    {
        return DB::transaction(function () use ($hospitalId, $id, $data) {
            $template = LabTestTemplate::where('id', $id)->firstOrFail();
            $template->update(array_filter([
                'department_id'   => $data['department_id'] ?? $template->department_id,
                'category'        => $data['category'] ?? $template->category,
                'test_name'       => $data['test_name'] ?? $template->test_name,
                'description'     => array_key_exists('description', $data) ? $data['description'] : $template->description,
                'interpretation'  => array_key_exists('interpretation', $data) ? $data['interpretation'] : $template->interpretation,
                'sample_type'     => $data['sample_type'] ?? $template->sample_type,
                'container_color' => $data['container_color'] ?? $template->container_color,
                'method'          => array_key_exists('method', $data) ? $data['method'] : $template->method,
                'tat_hours'       => $data['tat_hours'] ?? $template->tat_hours,
                'standard_price'  => $data['standard_price'] ?? $template->standard_price,
            ], fn($v) => !is_null($v)));

            if (isset($data['parameters']) && is_array($data['parameters'])) {
                $oldParams = LabParameter::where('test_template_id', $template->id)->get();
                foreach ($oldParams as $op) {
                    LabParameterReferenceRange::where('parameter_id', $op->id)->delete();
                    $op->delete();
                }

                foreach ($data['parameters'] as $idx => $p) {
                    $param = LabParameter::create([
                        'hospital_id'      => $hospitalId,
                        'test_template_id' => $template->id,
                        'name'             => $p['name'],
                        'short_code'       => $p['short_code'] ?? null,
                        'unit'             => $p['unit'] ?? null,
                        'input_type'       => $p['input_type'] ?? 'numeric',
                        'method'           => $p['method'] ?? null,
                        'options'          => $p['options'] ?? null,
                        'is_calculated'    => !empty($p['is_calculated']),
                        'formula'          => $p['formula'] ?? null,
                        'display_order'    => $idx + 1,
                        'is_mandatory'     => true,
                        'is_active'        => true,
                    ]);

                    if (!empty($p['reference_ranges']) && is_array($p['reference_ranges'])) {
                        foreach ($p['reference_ranges'] as $r) {
                            LabParameterReferenceRange::create([
                                'parameter_id'         => $param->id,
                                'gender'               => $r['gender'] ?? 'Both',
                                'age_min'              => $r['age_min'] ?? 0,
                                'age_max'              => $r['age_max'] ?? 120,
                                'age_unit'             => $r['age_unit'] ?? 'Years',
                                'min_val'              => $r['min_val'] ?? null,
                                'max_val'              => $r['max_val'] ?? null,
                                'panic_min'            => $r['panic_min'] ?? null,
                                'panic_max'            => $r['panic_max'] ?? null,
                                'normal_value'         => $r['normal_value'] ?? null,
                                'display_range'        => $r['display_range'] ?? null,
                                'interpretation_notes' => $r['interpretation_notes'] ?? null,
                            ]);
                        }
                    }
                }
            }

            return $this->getTemplate($hospitalId, $template->id);
        });
    }

    public function deleteTemplate(int $hospitalId, int $id): bool
    {
        $template = LabTestTemplate::where('id', $id)->firstOrFail();
        return $template->update(['is_active' => false]);
    }

    /**
     * Generate daily sequential phlebotomy queue token number (e.g. P-001, STAT-01).
     */
    public function generateDailyToken(int $hospitalId, string $urgency = 'Routine'): string
    {
        $todayCount = LabOrder::where('hospital_id', $hospitalId)
            ->whereDate('created_at', today())
            ->count();
        $prefix = strtoupper($urgency) === 'STAT' ? 'STAT' : 'P';
        return sprintf('%s-%03d', $prefix, $todayCount + 1);
    }

    /**
     * Direct Walk-In Lab Booking: Book and bill tests directly at Lab Desk or Billing Desk.
     */
    public function createDirectLabOrder(int $hospitalId, int $userId, array $data): LabOrder
    {
        return DB::transaction(function () use ($hospitalId, $userId, $data) {
            // 1. Resolve Patient (Existing OR Quick Walk-in Registration)
            if (!empty($data['patient_id'])) {
                $patient = Patient::where('hospital_id', $hospitalId)->findOrFail($data['patient_id']);
            } elseif (!empty($data['walkin_patient'])) {
                $wp = $data['walkin_patient'];
                $dob = null;
                if (!empty($wp['dob'])) {
                    $dob = $wp['dob'];
                } elseif (!empty($wp['age'])) {
                    $dob = now()->subYears((int)$wp['age'])->format('Y-01-01');
                }
                $patient = Patient::create([
                    'hospital_id' => $hospitalId,
                    'name'        => trim($wp['name']),
                    'gender'      => $wp['gender'] ?? 'M',
                    'dob'         => $dob,
                    'mobile'      => $wp['mobile'] ?? null,
                    'address'     => $wp['address'] ?? null,
                ]);
            } else {
                throw new \InvalidArgumentException("Patient details are required for walk-in lab booking.");
            }

            // 2. Fetch Selected Test Templates
            $templateIds = $data['template_ids'] ?? [];
            if (empty($templateIds)) {
                throw new \InvalidArgumentException("Please select at least one lab test to book.");
            }

            $templates = LabTestTemplate::where(function ($q) use ($hospitalId) {
                    $q->where('hospital_id', $hospitalId)
                      ->orWhereNull('hospital_id');
                })
                ->whereIn('id', $templateIds)
                ->where('is_active', true)
                ->get();

            if ($templates->isEmpty()) {
                throw new \InvalidArgumentException("No valid active lab test templates found for selection.");
            }

            $urgency = $data['urgency'] ?? 'Routine';
            $grossAmount = 0.00;
            foreach ($templates as $tpl) {
                $grossAmount += (float)$tpl->standard_price;
            }

            $discountAmount = min($grossAmount, max(0, (float)($data['discount_amount'] ?? 0.00)));
            $netAmount = max(0, $grossAmount - $discountAmount);
            $paymentMethod = $data['payment_method'] ?? 'cash';

            // 3. Create Tax Invoice
            $invoice = Invoice::create([
                'hospital_id'        => $hospitalId,
                'patient_id'         => $patient->id,
                'encounter_type'     => 'Walk-In Lab',
                'gross_amount'       => $grossAmount,
                'discount_amount'    => $discountAmount,
                'discount_reason'    => $discountAmount > 0 ? ($data['discount_reason'] ?? 'Lab concession') : null,
                'net_amount'         => $netAmount,
                'amount_paid'        => $netAmount,
                'balance_due'        => 0.00,
                'payment_method'     => $paymentMethod,
                'payment_status'     => 'paid',
                'status'             => 'final',
                'created_by_user_id' => $userId,
                'notes'              => "Direct Lab Booking: " . $templates->pluck('test_name')->join(', '),
            ]);

            // 4. Create Ledger Items
            foreach ($templates as $tpl) {
                BillingLedgerItem::create([
                    'hospital_id'        => $hospitalId,
                    'patient_id'         => $patient->id,
                    'invoice_id'         => $invoice->id,
                    'encounter_type'     => 'opd',
                    'encounter_id'       => $invoice->id,
                    'category'           => 'investigation',
                    'item_name'          => $tpl->test_name,
                    'unit_price'         => (float)$tpl->standard_price,
                    'quantity'           => 1.0,
                    'tax_amount'         => 0.00,
                    'discount_amount'    => 0.00,
                    'total_amount'       => (float)$tpl->standard_price,
                    'charged_at'         => now(),
                    'charged_by_user_id' => $userId,
                    'auto_generated'     => true,
                    'status'             => 'billed',
                ]);
            }

            // 5. Generate Order Number & Phlebotomy Token
            $datePrefix = date('Ymd');
            $todayCount = LabOrder::where('hospital_id', $hospitalId)
                ->whereDate('created_at', today())
                ->count();
            $orderNumber = sprintf('LAB-WALK-%s-%04d', $datePrefix, $todayCount + 1);
            $tokenNumber = $this->generateDailyToken($hospitalId, $urgency);

            // 6. Create LabOrder
            $labOrder = LabOrder::create([
                'hospital_id'     => $hospitalId,
                'patient_id'      => $patient->id,
                'doctor_id'       => $data['doctor_id'] ?? null,
                'invoice_id'      => $invoice->id,
                'order_number'    => $orderNumber,
                'token_number'    => $tokenNumber,
                'urgency'         => $urgency,
                'order_type'      => 'Walk-In',
                'status'          => 'pending_sample',
            ]);

            // 7. Create LabOrderItems
            foreach ($templates as $tpl) {
                LabOrderItem::create([
                    'hospital_id'      => $hospitalId,
                    'order_id'         => $labOrder->id,
                    'test_template_id' => $tpl->id,
                    'test_name'        => $tpl->test_name,
                    'test_code'        => $tpl->test_code,
                    'category'         => $tpl->category,
                    'rate'             => $tpl->standard_price,
                    'status'           => 'pending_sample',
                ]);
            }

            return $this->getOrder($hospitalId, $labOrder->id);
        });
    }

    /**
     * Call next Phlebotomy token for booth.
     */
    public function callToken(int $hospitalId, int $orderId, ?string $boothNumber = 'Booth 1'): LabOrder
    {
        $order = LabOrder::where('hospital_id', $hospitalId)->findOrFail($orderId);
        $order->update([
            'is_called'       => true,
            'token_called_at' => now(),
            'booth_number'    => $boothNumber ?: 'Booth 1',
        ]);
        return $this->getOrder($hospitalId, $order->id);
    }

    /**
     * Get live queue tokens for phlebotomist console & TV display board.
     */
    public function getActiveTokensQueue(int $hospitalId): array
    {
        $today = today();

        // Currently being called / serving
        $calling = LabOrder::where('hospital_id', $hospitalId)
            ->whereDate('created_at', $today)
            ->where('status', 'pending_sample')
            ->where('is_called', true)
            ->with(['patient:id,name,uhid', 'items:id,order_id,test_name,test_code'])
            ->orderBy('token_called_at', 'desc')
            ->limit(4)
            ->get();

        // Waiting in lounge
        $waiting = LabOrder::where('hospital_id', $hospitalId)
            ->whereDate('created_at', $today)
            ->where('status', 'pending_sample')
            ->where('is_called', false)
            ->with(['patient:id,name,uhid', 'items:id,order_id,test_name,test_code'])
            ->orderByRaw("CASE WHEN urgency = 'STAT' THEN 1 WHEN urgency = 'Urgent' THEN 2 ELSE 3 END ASC")
            ->orderBy('id', 'asc')
            ->limit(15)
            ->get();

        // Recently collected
        $recentCollected = LabOrder::where('hospital_id', $hospitalId)
            ->whereDate('created_at', $today)
            ->whereIn('status', ['sample_collected', 'result_entered', 'authorized'])
            ->with(['patient:id,name,uhid'])
            ->orderBy('sample_collected_at', 'desc')
            ->limit(5)
            ->get();

        return [
            'calling'           => $calling,
            'currently_calling' => $calling->first(),
            'waiting'           => $waiting,
            'upcoming_waiting'  => $waiting,
            'recent_called'     => $calling->slice(1)->values(),
            'recent_collected'  => $recentCollected,
            'total_today'       => LabOrder::where('hospital_id', $hospitalId)->whereDate('created_at', $today)->count(),
            'pending_count'     => LabOrder::where('hospital_id', $hospitalId)->whereDate('created_at', $today)->where('status', 'pending_sample')->count(),
            'collected_count'   => LabOrder::where('hospital_id', $hospitalId)->whereDate('created_at', $today)->where('status', '!=', 'pending_sample')->count(),
        ];
    }

    /**
     * Reject a collected sample with reason & audit trail.
     */
    public function rejectSample(int $hospitalId, int $orderId, int $userId, array $data): LabOrder
    {
        $order = LabOrder::where('hospital_id', $hospitalId)->findOrFail($orderId);
        $order->update([
            'status'              => 'sample_rejected',
            'rejection_reason'    => $data['reason'] ?? 'Specimen Rejected',
            'rejection_notes'     => $data['notes'] ?? null,
            'rejected_at'         => now(),
            'rejected_by_user_id' => $userId,
        ]);

        LabOrderItem::where('order_id', $order->id)->update(['status' => 'sample_rejected']);
        return $this->getOrder($hospitalId, $order->id);
    }

    /**
     * Re-collect a rejected sample (Fast-track priority token).
     */
    public function recollectSample(int $hospitalId, int $orderId, int $userId): LabOrder
    {
        $order = LabOrder::where('hospital_id', $hospitalId)->findOrFail($orderId);
        $tokenNum = $order->token_number ? "REC-{$order->token_number}" : $this->generateDailyToken($hospitalId, 'STAT');

        $order->update([
            'status'         => 'pending_sample',
            'urgency'        => 'STAT',
            'token_number'   => $tokenNum,
            'is_recollected' => true,
            'is_called'      => false,
            'sample_notes'   => ($order->sample_notes ? "{$order->sample_notes} | " : "") . "Recollection requested: {$order->rejection_reason}",
        ]);

        LabOrderItem::where('order_id', $order->id)->update(['status' => 'pending_sample']);
        return $this->getOrder($hospitalId, $order->id);
    }

    /**
     * Delta Check: Fetch latest previous authorized test results for this patient.
     */
    public function getPatientPreviousResults(int $hospitalId, int $patientId): array
    {
        $results = LabTestResult::whereHas('orderItem.order', function ($q) use ($hospitalId, $patientId) {
            $q->where('hospital_id', $hospitalId)
              ->where('patient_id', $patientId)
              ->where('status', 'authorized');
        })
        ->with([
            'parameter:id,name,short_code,unit',
            'orderItem:id,test_name,order_id',
            'orderItem.order:id,order_number,created_at'
        ])
        ->orderBy('created_at', 'desc')
        ->limit(100)
        ->get();

        $history = [];
        foreach ($results as $res) {
            $param = $res->parameter;
            if (!$param) continue;

            $key = $param->short_code ? strtolower(trim($param->short_code)) : (string)$param->id;
            if (!isset($history[$key])) {
                $history[$key] = [
                    'parameter_id'   => $param->id,
                    'short_code'     => $param->short_code,
                    'parameter_name' => $param->name,
                    'unit'           => $param->unit,
                    'value'          => $res->numeric_value !== null ? (float)$res->numeric_value : $res->text_value,
                    'flag'           => $res->flag,
                    'order_number'   => $res->orderItem?->order?->order_number,
                    'test_date'      => $res->created_at?->format('d M Y, H:i') ?? '',
                ];
            }
        }

        return array_values($history);
    }

    /**
     * Get list of Lab Invoices & Billing History with search & filters.
     */
    public function getLabInvoices(int $hospitalId, ?Request $request = null)
    {
        $req = $request ?? request();
        $query = LabOrder::where('hospital_id', $hospitalId)
            ->whereNotNull('invoice_id')
            ->with(['patient', 'doctor', 'invoice', 'items.testTemplate'])
            ->orderBy('id', 'desc');

        if ($req->filled('search')) {
            $s = trim($req->query('search'));
            $query->where(function ($q) use ($s) {
                $q->where('order_number', 'ilike', "%{$s}%")
                  ->orWhere('token_number', 'ilike', "%{$s}%")
                  ->orWhereHas('patient', function ($pq) use ($s) {
                      $pq->where('name', 'ilike', "%{$s}%")
                         ->orWhere('uhid', 'ilike', "%{$s}%")
                         ->orWhere('mobile', 'ilike', "%{$s}%");
                  })
                  ->orWhereHas('invoice', function ($iq) use ($s) {
                      $iq->where('invoice_number', 'ilike', "%{$s}%");
                  });
            });
        }

        if ($req->filled('payment_status') && $req->query('payment_status') !== 'all') {
            $ps = $req->query('payment_status');
            $query->whereHas('invoice', function ($iq) use ($ps) {
                $iq->where('payment_status', $ps);
            });
        }

        if ($req->filled('order_status') && $req->query('order_status') !== 'all') {
            $query->where('status', $req->query('order_status'));
        }

        return $this->applyPaginationOrAll($query, $req, 20);
    }

    /**
     * Update an existing Walk-In Lab Booking / Invoice (add/remove tests, discounts, payments).
     */
    public function updateDirectLabOrder(int $hospitalId, int $orderId, int $userId, array $data): LabOrder
    {
        return DB::transaction(function () use ($hospitalId, $orderId, $userId, $data) {
            $order = LabOrder::where('hospital_id', $hospitalId)
                ->with(['invoice', 'items'])
                ->findOrFail($orderId);

            // Update Patient details if provided
            if (!empty($data['walkin_patient']) && $order->patient) {
                $wp = $data['walkin_patient'];
                $order->patient->update(array_filter([
                    'name'    => $wp['name'] ?? null,
                    'gender'  => $wp['gender'] ?? null,
                    'mobile'  => $wp['mobile'] ?? null,
                    'address' => $wp['address'] ?? null,
                ]));
            }

            if (!empty($data['doctor_id'])) {
                $order->doctor_id = $data['doctor_id'];
            }
            if (!empty($data['urgency'])) {
                $order->urgency = $data['urgency'];
            }

            // Update tests list if template_ids is provided and order is not authorized
            if (isset($data['template_ids']) && is_array($data['template_ids']) && !empty($data['template_ids'])) {
                $newTemplateIds = array_unique(array_map('intval', $data['template_ids']));
                $existingItemTemplates = $order->items->pluck('test_template_id')->filter()->toArray();

                $templates = LabTestTemplate::where(function ($q) use ($hospitalId) {
                        $q->where('hospital_id', $hospitalId)
                          ->orWhereNull('hospital_id');
                    })
                    ->whereIn('id', $newTemplateIds)
                    ->where('is_active', true)
                    ->get();

                // Delete removed items
                foreach ($order->items as $existingItem) {
                    if (!in_array($existingItem->test_template_id, $newTemplateIds)) {
                        LabTestResult::where('order_item_id', $existingItem->id)->delete();
                        if ($order->invoice_id) {
                            BillingLedgerItem::where('invoice_id', $order->invoice_id)
                                ->where('item_name', $existingItem->test_name)
                                ->delete();
                        }
                        $existingItem->delete();
                    }
                }

                // Add newly selected items
                $addedNames = [];
                foreach ($templates as $tpl) {
                    if (!in_array($tpl->id, $existingItemTemplates)) {
                        $initialItemStatus = $order->sample_accession_number ? 'sample_collected' : 'pending_sample';
                        LabOrderItem::create([
                            'hospital_id'      => $hospitalId,
                            'order_id'         => $order->id,
                            'test_template_id' => $tpl->id,
                            'test_name'        => $tpl->test_name,
                            'test_code'        => $tpl->test_code,
                            'category'         => $tpl->category,
                            'rate'             => $tpl->standard_price,
                            'status'           => $initialItemStatus,
                        ]);
                        $addedNames[] = $tpl->test_name;

                        if ($order->invoice_id) {
                            BillingLedgerItem::create([
                                'hospital_id'        => $hospitalId,
                                'patient_id'         => $order->patient_id,
                                'invoice_id'         => $order->invoice_id,
                                'encounter_type'     => 'opd',
                                'encounter_id'       => $order->invoice_id,
                                'category'           => 'investigation',
                                'item_name'          => $tpl->test_name,
                                'unit_price'         => (float)$tpl->standard_price,
                                'quantity'           => 1.0,
                                'tax_amount'         => 0.00,
                                'discount_amount'    => 0.00,
                                'total_amount'       => (float)$tpl->standard_price,
                                'charged_at'         => now(),
                                'charged_by_user_id' => $userId,
                                'auto_generated'     => true,
                                'status'             => 'billed',
                            ]);
                        }
                    }
                }

                // Recalculate Order Status when items change!
                $this->recalculateOrderStatus($order);

                $userName = User::find($userId)?->name ?? 'User #' . $userId;
                $this->logAudit(
                    $hospitalId,
                    $order->id,
                    null,
                    $userId,
                    'bill_updated',
                    "Investigation bill updated by {$userName}." . (!empty($addedNames) ? " Added tests: " . implode(', ', $addedNames) : "") . " Status: {$order->status}."
                );

                // Recalculate Invoice totals
                if ($order->invoice) {
                    $grossAmount = $templates->sum('standard_price');
                    $discountAmount = min($grossAmount, max(0, (float)($data['discount_amount'] ?? $order->invoice->discount_amount ?? 0)));
                    $netAmount = max(0, $grossAmount - $discountAmount);
                    $amountPaid = (float)($data['amount_paid'] ?? $order->invoice->amount_paid ?? $netAmount);
                    $balanceDue = max(0, $netAmount - $amountPaid);

                    $paymentStatus = 'paid';
                    if ($balanceDue > 0 && $amountPaid > 0) {
                        $paymentStatus = 'partial';
                    } elseif ($balanceDue > 0 && $amountPaid <= 0) {
                        $paymentStatus = 'pending';
                    }

                    $order->invoice->update([
                        'gross_amount'    => $grossAmount,
                        'discount_amount' => $discountAmount,
                        'discount_reason' => $discountAmount > 0 ? ($data['discount_reason'] ?? $order->invoice->discount_reason) : null,
                        'net_amount'      => $netAmount,
                        'amount_paid'     => $amountPaid,
                        'balance_due'     => $balanceDue,
                        'payment_status'  => $paymentStatus,
                        'payment_method'  => $data['payment_method'] ?? $order->invoice->payment_method ?? 'cash',
                        'notes'           => "Direct Lab Booking: " . $templates->pluck('test_name')->join(', '),
                    ]);
                }
            }

            $order->save();
            return $this->getOrder($hospitalId, $order->id);
        });
    }

    /**
     * Settle / Collect due balance payment on a lab invoice.
     */
    public function collectInvoicePayment(int $hospitalId, int $orderId, array $data): LabOrder
    {
        return DB::transaction(function () use ($hospitalId, $orderId, $data) {
            $order = LabOrder::where('hospital_id', $hospitalId)
                ->with(['invoice'])
                ->findOrFail($orderId);

            if (!$order->invoice) {
                throw new \InvalidArgumentException("No invoice attached to this lab order.");
            }

            $payingAmount = (float)($data['amount'] ?? 0);
            if ($payingAmount <= 0) {
                throw new \InvalidArgumentException("Payment amount must be greater than zero.");
            }

            $newPaid = $order->invoice->amount_paid + $payingAmount;
            $newDue = max(0, $order->invoice->net_amount - $newPaid);
            $newPaymentStatus = $newDue <= 0 ? 'paid' : 'partial';

            $order->invoice->update([
                'amount_paid'    => $newPaid,
                'balance_due'    => $newDue,
                'payment_status' => $newPaymentStatus,
            ]);

            return $this->getOrder($hospitalId, $order->id);
        });
    }
}
