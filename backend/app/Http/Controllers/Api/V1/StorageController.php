<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\Storage\StorageServiceInterface;
use App\Http\Traits\ApiResponseTrait;
use OpenApi\Attributes as OA;

class StorageController extends Controller
{
    use ApiResponseTrait;

    protected $storageService;

    public function __construct(StorageServiceInterface $storageService)
    {
        $this->storageService = $storageService;
    }

    #[OA\Post(
        path: "/api/v1/storage/upload-url",
        summary: "Generate a presigned URL for direct file upload to Cloudflare R2 / S3",
        tags: ["Storage"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ["file_name", "content_type"],
            properties: [
                new OA\Property(property: "file_name", type: "string", example: "patient_report.pdf"),
                new OA\Property(property: "content_type", type: "string", example: "application/pdf"),
                new OA\Property(property: "folder", type: "string", example: "reports", description: "Optional folder path")
            ]
        )
    )]
    #[OA\Response(response: 200, description: "Upload URL generated successfully")]
    public function generateUploadUrl(Request $request)
    {
        $request->validate([
            'file_name' => 'required|string',
            'content_type' => 'required|string',
            'folder' => 'nullable|string'
        ]);

        // Generate a unique path to prevent overwriting
        $folder = $request->input('folder', 'general');
        $uniqueName = uniqid() . '_' . time() . '_' . str_replace(' ', '_', $request->file_name);
        $path = $folder . '/' . $uniqueName;

        $uploadUrl = $this->storageService->generateUploadUrl($path, $request->content_type);

        return $this->success([
            'upload_url' => $uploadUrl,
            'path' => $path
        ], 'Presigned upload URL generated successfully');
    }

    #[OA\Get(
        path: "/api/v1/storage/view-url",
        summary: "Generate a time-limited presigned URL to view a private file",
        tags: ["Storage"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Parameter(
        name: "path",
        in: "query",
        required: true,
        description: "The exact path of the file in the bucket",
        schema: new OA\Schema(type: "string")
    )]
    #[OA\Response(response: 200, description: "View URL generated successfully")]
    public function generateViewUrl(Request $request)
    {
        $request->validate([
            'path' => 'required|string'
        ]);

        $viewUrl = $this->storageService->generateViewUrl($request->path);

        return $this->success([
            'view_url' => $viewUrl
        ], 'Presigned view URL generated successfully');
    }
}
