<?php

namespace App\Http\Traits;

use Illuminate\Http\JsonResponse;

trait HasApiResponse
{
    protected function successResponse(
        mixed $data,
        string $message = 'Success',
        int $status = 200
    ): JsonResponse {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data'    => $data,
        ], $status);
    }

    protected function errorResponse(
        string $message,
        mixed $errors = null,
        int $status = 422
    ): JsonResponse {
        $response = [
            'success' => false,
            'message' => $message,
        ];
        if ($errors !== null) {
            $response['errors'] = $errors;
        }
        return response()->json($response, $status);
    }

    protected function notFoundResponse(string $message = 'Resource not found'): JsonResponse
    {
        return $this->errorResponse($message, null, 404);
    }

    protected function createdResponse(mixed $data, string $message = 'Created successfully'): JsonResponse
    {
        return $this->successResponse($data, $message, 201);
    }

    protected function paginatedResponse(
        \Illuminate\Pagination\LengthAwarePaginator $paginator,
        string $message = 'Success'
    ): JsonResponse {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data'    => $paginator->items(),
            'meta'    => [
                'current_page' => $paginator->currentPage(),
                'last_page'    => $paginator->lastPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
            ]
        ], 200);
    }
}
