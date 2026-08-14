<?php

namespace App\Exceptions;

use RuntimeException;

class AbdmApiException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly string $abdmCode = '',
        public readonly array $context = [],
        int $code = 0,
        ?\Throwable $previous = null
    ) {
        parent::__construct($message, $code, $previous);
    }

    public static function fromResponse(array|string|null $response): self
    {
        if (is_string($response)) {
            $response = ['message' => $response];
        } elseif ($response === null) {
            $response = ['message' => 'Unknown ABDM error'];
        }

        // ABDM often sends errors nested under an "error" key
        $message = $response['message'] 
            ?? $response['error']['message'] 
            ?? $response['error'] 
            ?? null;

        if (is_array($message)) {
            $firstString = collect($message)->flatten()->first(fn($val) => is_string($val));
            $message = $firstString ?: 'ABDM API error';
        } elseif ($message === null) {
            $firstString = collect($response)->except(['timestamp', 'status', 'code'])->flatten()->first(fn($val) => is_string($val));
            $message = $firstString ?: 'ABDM Validation Error';
        }

        $code = (string) ($response['code'] ?? $response['error']['code'] ?? '');

        // Add helpful context for confusing ABDM generic codes
        if ($code === 'ABDM-1220' && $message === 'Sorry, Unable to process your request at this time. Please try again later.') {
            $message = 'ABDM-1220: Unable to process request. This typically occurs when an ABHA Address is already assigned to this Aadhaar or the enrollment transaction has expired.';
        }

        \Illuminate\Support\Facades\Log::error('ABDM API Error details:', ['response' => $response]);

        return new self(
            message: (string) $message,
            abdmCode: $code,
            context: $response,
        );
    }
}
