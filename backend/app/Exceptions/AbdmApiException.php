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
            ?? 'ABDM API error';

        if (is_array($message)) {
            $message = json_encode($message);
        }

        $code = $response['code'] ?? $response['error']['code'] ?? '';

        \Illuminate\Support\Facades\Log::error('ABDM API Error details:', ['response' => $response]);

        return new self(
            message: (string) $message,
            abdmCode: (string) $code,
            context: $response,
        );
    }
}
