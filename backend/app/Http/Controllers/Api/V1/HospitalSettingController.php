<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Traits\HasApiResponse;
use App\Services\HospitalSetting\HospitalSettingServiceInterface;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(
    name: "7. Hospital Settings (Hospital Admin)",
    description: "Hospital Admin Panel — Configure Hospital Settings (UHID Format, General, Billing, OPD, Notifications)"
)]
class HospitalSettingController extends Controller
{
    use HasApiResponse;

    public function __construct(
        protected HospitalSettingServiceInterface $settingService
    ) {}

    // ===============================================
    // 🆔 1. UHID CONFIGURATION & FORMAT SETTINGS
    // ===============================================

    #[OA\Get(
        path: "/api/v1/hospital/settings/uhid",
        summary: "Get hospital UHID sequence format and settings",
        description: "Hospital Admin API: Retrieves the hospital's configured UHID format, prefix, sequence padding, reset rules, and live preview sample.",
        security: [["bearerAuth" => []]],
        tags: ["7. Hospital Settings (Hospital Admin)"]
    )]
    #[OA\Response(response: 200, description: "UHID configuration details")]
    public function getUhidConfig(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $data = $this->settingService->getUhidConfig($hospitalId);

        return $this->successResponse($data, 'UHID Configuration retrieved successfully');
    }

    #[OA\Put(
        path: "/api/v1/hospital/settings/uhid",
        summary: "Update hospital UHID sequence format and settings",
        description: "Hospital Admin API: Customize patient UHID format, prefix, padding, reset frequency, and starting sequence.",
        security: [["bearerAuth" => []]],
        tags: ["7. Hospital Settings (Hospital Admin)"]
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: "uhid_prefix", type: "string", example: "CITY", description: "Prefix string (e.g. UHID, HOSP, PAT, CITY)"),
                new OA\Property(property: "uhid_format", type: "string", example: "{PREFIX}-{YEAR}-{SEQ}", description: "Format pattern using placeholders"),
                new OA\Property(property: "uhid_padding", type: "integer", example: 5, description: "Number of digits for sequence (3 to 10)"),
                new OA\Property(property: "uhid_sequence_reset", type: "string", enum: ["yearly", "monthly", "never"], example: "yearly"),
                new OA\Property(property: "uhid_next_sequence", type: "integer", example: 1, description: "Next sequence starting number")
            ]
        )
    )]
    #[OA\Response(response: 200, description: "UHID Configuration updated successfully")]
    public function updateUhidConfig(Request $request)
    {
        $validated = $request->validate([
            'uhid_prefix'         => 'nullable|string|max:20',
            'uhid_format'         => 'required|string|max:50',
            'uhid_padding'        => 'nullable|integer|min:3|max:10',
            'uhid_sequence_reset' => 'nullable|in:yearly,monthly,never',
            'uhid_next_sequence'  => 'nullable|integer|min:1',
        ]);

        $hospitalId = $this->getHospitalId($request);
        $result = $this->settingService->updateUhidConfig($hospitalId, $validated);

        return $this->successResponse($result, 'UHID Configuration updated successfully');
    }

    // ===============================================
    // ⚙️ 2. GENERIC KEY-VALUE HOSPITAL SETTINGS
    // ===============================================

    #[OA\Get(
        path: "/api/v1/hospital/settings",
        summary: "Get hospital settings by group",
        description: "Hospital Admin API: Retrieves key-value settings for the hospital (e.g. general, billing, opd, notifications, print_template).",
        security: [["bearerAuth" => []]],
        tags: ["7. Hospital Settings (Hospital Admin)"]
    )]
    #[OA\Parameter(name: "group", in: "query", description: "Settings group name (e.g. uhid, general, billing, opd, notifications)", required: false, schema: new OA\Schema(type: "string", example: "general"))]
    #[OA\Response(response: 200, description: "Hospital settings")]
    public function getSettings(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $group = $request->query('group');

        $settings = $this->settingService->getSettings($hospitalId, $group);

        return $this->successResponse($settings, 'Hospital settings retrieved successfully');
    }

    #[OA\Post(
        path: "/api/v1/hospital/settings",
        summary: "Save key-value settings for hospital",
        description: "Hospital Admin API: Stores or updates arbitrary key-value settings under a specified group (general, billing, notifications, etc.).",
        security: [["bearerAuth" => []]],
        tags: ["7. Hospital Settings (Hospital Admin)"]
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ["group", "settings"],
            properties: [
                new OA\Property(property: "group", type: "string", example: "general"),
                new OA\Property(property: "settings", type: "object", example: [
                    "hospital_tagline" => "Care with Compassion",
                    "emergency_contact" => "102",
                    "currency" => "INR",
                    "sms_enabled" => true
                ])
            ]
        )
    )]
    #[OA\Response(response: 200, description: "Settings saved")]
    public function saveSettings(Request $request)
    {
        $validated = $request->validate([
            'group'    => 'required|string|max:50',
            'settings' => 'required|array',
        ]);

        $hospitalId = $this->getHospitalId($request);
        $settings = $this->settingService->saveSettings($hospitalId, $validated['group'], $validated['settings']);

        return $this->successResponse(
            $settings,
            'Settings saved successfully'
        );
    }
}
