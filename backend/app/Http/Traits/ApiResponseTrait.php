<?php

namespace App\Http\Traits;

trait ApiResponseTrait
{
    /**
     * Send a success response.
     *
     * @param  mixed  $data
     * @param  string  $message
     * @param  int  $status
     * @return \Illuminate\Http\JsonResponse
     */
    protected function success($data, string $message = 'Success', int $status = 200)
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data'    => $data,
        ], $status);
    }

    /**
     * Send an error response.
     *
     * @param  string  $message
     * @param  int  $status
     * @param  mixed  $errors
     * @return \Illuminate\Http\JsonResponse
     */
    protected function error(string $message = 'Error', int $status = 400, $errors = null)
    {
        $response = [
            'success' => false,
            'message' => $message,
        ];

        if (!is_null($errors)) {
            $response['errors'] = $errors;
        }

        return response()->json($response, $status);
    }
}
