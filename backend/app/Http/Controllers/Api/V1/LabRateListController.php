<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Traits\HasApiResponse;
use App\Models\LabTestTemplate;
use App\Models\LabOrderItem;
use App\Models\LabRateList;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use OpenApi\Attributes as OA;

class LabRateListController extends Controller
{
    use HasApiResponse;

    #[OA\Get(
        path: "/api/v1/lab/rate-list",
        summary: "Get laboratory rate list spreadsheet matrix",
        description: "Retrieves all tests with Patient MRP, Outsource B2B Cost, Reagent Cost, and calculated Gross Profit & Margin %",
        tags: ["16. Lab — Rate List & Pricing"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Response(response: 200, description: "Rate list matrix retrieved")]
    public function index(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);

        $query = LabTestTemplate::where(function ($q) use ($hospitalId) {
            $q->whereNull('hospital_id')->orWhere('hospital_id', $hospitalId);
        })
        ->with('defaultVendor:id,vendor_code,name');

        if ($request->filled('category') && $request->category !== 'all') {
            $query->where('category', $request->category);
        }

        if ($request->filled('fulfillment_type') && $request->fulfillment_type !== 'all') {
            $query->where('fulfillment_type', $request->fulfillment_type);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('test_name', 'ilike', "%{$search}%")
                  ->orWhere('test_code', 'ilike', "%{$search}%")
                  ->orWhere('category', 'ilike', "%{$search}%");
            });
        }

        $templates = $query->orderBy('category')->orderBy('test_name')->get();

        $matrix = $templates->map(function ($t) {
            $mrp = (float) $t->standard_price;
            $b2b = (float) ($t->b2b_cost ?? 0);
            $reagent = (float) ($t->reagent_cost ?? 0);
            $isOutsource = ($t->fulfillment_type === 'outsourced');
            $cost = $isOutsource ? $b2b : $reagent;
            $profit = max(0, $mrp - $cost);
            $marginPercent = $mrp > 0 ? round(($profit / $mrp) * 100, 1) : 0;

            return [
                'id'                  => $t->id,
                'test_code'           => $t->test_code,
                'test_name'           => $t->test_name,
                'category'            => $t->category,
                'sample_type'         => $t->sample_type,
                'container_color'     => $t->container_color,
                'tat_hours'           => $t->tat_hours,
                'standard_price'      => $mrp,
                'b2b_cost'            => $b2b,
                'reagent_cost'        => $reagent,
                'fulfillment_type'    => $t->fulfillment_type ?? 'in_house',
                'default_vendor_id'   => $t->default_vendor_id,
                'default_vendor_name' => $t->defaultVendor?->name,
                'gross_profit'        => round($profit, 2),
                'margin_percentage'   => $marginPercent,
                'is_active'           => (bool) $t->is_active,
            ];
        });

        return $this->successResponse([
            'total_tests' => $matrix->count(),
            'tests'       => $matrix,
        ], 'Rate list matrix retrieved successfully');
    }

    #[OA\Put(
        path: "/api/v1/lab/rate-list/bulk-update",
        summary: "Direct bulk update rates and costs (Spreadsheet save)",
        description: "Updates patient MRP, B2B outsource costs, reagent costs, and fulfillment modes in one batch transaction",
        tags: ["16. Lab — Rate List & Pricing"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Response(response: 200, description: "Rates updated successfully")]
    public function bulkUpdate(Request $request)
    {
        $validated = $request->validate([
            'items'                     => 'required|array|min:1',
            'items.*.id'                => 'required|integer|exists:lab_test_templates,id',
            'items.*.standard_price'    => 'nullable|numeric|min:0',
            'items.*.b2b_cost'          => 'nullable|numeric|min:0',
            'items.*.reagent_cost'      => 'nullable|numeric|min:0',
            'items.*.fulfillment_type'  => 'nullable|string|in:in_house,outsourced,hybrid',
            'items.*.default_vendor_id' => 'nullable|integer',
            'items.*.tat_hours'         => 'nullable|integer|min:1',
            'items.*.is_active'         => 'nullable|boolean',
        ]);

        DB::transaction(function () use ($validated) {
            foreach ($validated['items'] as $it) {
                $updateData = [];
                if (isset($it['standard_price']))   $updateData['standard_price'] = $it['standard_price'];
                if (isset($it['b2b_cost']))         $updateData['b2b_cost'] = $it['b2b_cost'];
                if (isset($it['reagent_cost']))     $updateData['reagent_cost'] = $it['reagent_cost'];
                if (isset($it['fulfillment_type'])) $updateData['fulfillment_type'] = $it['fulfillment_type'];
                if (array_key_exists('default_vendor_id', $it)) $updateData['default_vendor_id'] = $it['default_vendor_id'];
                if (isset($it['tat_hours']))        $updateData['tat_hours'] = $it['tat_hours'];
                if (isset($it['is_active']))        $updateData['is_active'] = $it['is_active'];

                if (!empty($updateData)) {
                    LabTestTemplate::where('id', $it['id'])->update($updateData);
                }
            }
        });

        return $this->successResponse(null, count($validated['items']) . ' test rates updated successfully');
    }

    #[OA\Post(
        path: "/api/v1/lab/rate-list/apply-percentage",
        summary: "Apply bulk percentage markup or discount",
        description: "Applies percentage modifier across categories or fulfillment types",
        tags: ["16. Lab — Rate List & Pricing"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Response(response: 200, description: "Percentage adjustments applied")]
    public function applyPercentage(Request $request)
    {
        $validated = $request->validate([
            'category'         => 'nullable|string',
            'fulfillment_type' => 'nullable|string',
            'field'            => 'required|string|in:standard_price,b2b_cost,reagent_cost',
            'percentage'       => 'required|numeric|min:-90|max:500',
            'round_to'         => 'nullable|integer|in:1,5,10',
        ]);

        $query = LabTestTemplate::query();

        if (!empty($validated['category']) && $validated['category'] !== 'all') {
            $query->where('category', $validated['category']);
        }
        if (!empty($validated['fulfillment_type']) && $validated['fulfillment_type'] !== 'all') {
            $query->where('fulfillment_type', $validated['fulfillment_type']);
        }

        $field = $validated['field'];
        $multiplier = 1 + ($validated['percentage'] / 100);
        $roundTo = $validated['round_to'] ?? 1;

        $updatedCount = 0;
        $tests = $query->get();

        DB::transaction(function () use ($tests, $field, $multiplier, $roundTo, &$updatedCount) {
            foreach ($tests as $t) {
                $oldVal = (float) $t->$field;
                if ($oldVal > 0) {
                    $newVal = $oldVal * $multiplier;
                    if ($roundTo > 1) {
                        $newVal = round($newVal / $roundTo) * $roundTo;
                    } else {
                        $newVal = round($newVal, 2);
                    }
                    $t->$field = $newVal;
                    $t->save();
                    $updatedCount++;
                }
            }
        });

        return $this->successResponse([
            'updated_count' => $updatedCount,
            'percentage'    => $validated['percentage'],
        ], "Applied {$validated['percentage']}% adjustment to {$updatedCount} tests");
    }

    #[OA\Get(
        path: "/api/v1/lab/analytics/profitability",
        summary: "Lab Profit & Loss (P&L) and Margin Analytics",
        description: "Computes total revenue, outsource B2B payables, reagent costs, and gross margins",
        tags: ["16. Lab — Rate List & Pricing"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Response(response: 200, description: "Profitability metrics retrieved")]
    public function profitabilityAnalytics(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);

        // Fetch completed order items
        $items = LabOrderItem::whereHas('order', function ($q) use ($hospitalId) {
            $q->where('hospital_id', $hospitalId)
              ->whereNotIn('status', ['cancelled']);
        })
        ->with('testTemplate:id,test_code,test_name,category,fulfillment_type,b2b_cost,reagent_cost')
        ->get();

        $totalRevenue = $items->sum('rate');
        $outsourcePayable = 0.0;
        $reagentExpense = 0.0;
        $testStats = [];

        foreach ($items as $it) {
            $t = $it->testTemplate;
            $rate = (float) $it->rate;
            $isOutsource = ($it->fulfillment_type === 'outsourced') || ($t && $t->fulfillment_type === 'outsourced');
            $cost = 0.0;

            if ($isOutsource) {
                $cost = (float) ($it->b2b_cost > 0 ? $it->b2b_cost : ($t?->b2b_cost ?? 0));
                $outsourcePayable += $cost;
            } else {
                $cost = (float) ($t?->reagent_cost ?? 0);
                $reagentExpense += $cost;
            }

            $profit = max(0, $rate - $cost);
            $code = $it->test_code ?: ($t?->test_code ?: 'TEST');

            if (!isset($testStats[$code])) {
                $testStats[$code] = [
                    'test_code'       => $code,
                    'test_name'       => $it->test_name,
                    'category'        => $it->category ?: ($t?->category ?: 'General'),
                    'is_outsource'    => $isOutsource,
                    'count'           => 0,
                    'total_revenue'   => 0.0,
                    'total_cost'      => 0.0,
                    'total_profit'    => 0.0,
                ];
            }

            $testStats[$code]['count']++;
            $testStats[$code]['total_revenue'] += $rate;
            $testStats[$code]['total_cost'] += $cost;
            $testStats[$code]['total_profit'] += $profit;
        }

        $totalCost = $outsourcePayable + $reagentExpense;
        $netProfit = $totalRevenue - $totalCost;
        $grossMarginPercent = $totalRevenue > 0 ? round(($netProfit / $totalRevenue) * 100, 1) : 0;

        // Top 5 most profitable tests
        $topProfitable = collect($testStats)->sortByDesc('total_profit')->values()->take(5)->map(function ($it) {
            $it['margin_percent'] = $it['total_revenue'] > 0 ? round(($it['total_profit'] / $it['total_revenue']) * 100, 1) : 0;
            return $it;
        });

        // "Make vs Buy" Analyzer ROI Advisor: Find top outsourced tests by volume
        $topOutsourcedByVolume = collect($testStats)
            ->filter(fn($it) => $it['is_outsource'] && $it['count'] > 0)
            ->sortByDesc('count')
            ->values()
            ->take(5)
            ->map(function ($it) {
                $monthlyOutsourceCost = $it['total_cost'];
                $estInHouseCost = $it['count'] * 45; // Estimated ₹45/test on leased benchtop CLIA
                $potentialSavings = max(0, $monthlyOutsourceCost - $estInHouseCost);
                $it['monthly_outsource_cost'] = round($monthlyOutsourceCost, 2);
                $it['estimated_inhouse_cost'] = round($estInHouseCost, 2);
                $it['potential_monthly_savings'] = round($potentialSavings, 2);
                $it['recommendation'] = $it['count'] >= 50 
                    ? 'High volume: Lease benchtop analyzer to save ~₹' . number_format($potentialSavings) . '/mo'
                    : 'Economical to continue outsourcing';
                return $it;
            });

        return $this->successResponse([
            'total_tests_billed'       => $items->count(),
            'total_revenue'            => round($totalRevenue, 2),
            'total_cost'               => round($totalCost, 2),
            'outsource_b2b_payable'    => round($outsourcePayable, 2),
            'internal_reagent_expense' => round($reagentExpense, 2),
            'net_gross_profit'         => round($netProfit, 2),
            'gross_margin_percent'     => $grossMarginPercent,
            'top_profitable_tests'     => $topProfitable,
            'make_vs_buy_advisor'      => $topOutsourcedByVolume,
        ], 'Profitability metrics retrieved successfully');
    }
}
