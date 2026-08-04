<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key'    => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel'              => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | ABDM (Ayushman Bharat Digital Mission) Configuration
    |--------------------------------------------------------------------------
    |
    | mock_mode = true  → MockAbdmService (no real API calls, OTP = 123456)
    | mock_mode = false → RealAbdmService (live sandbox / production calls)
    |
    | Sandbox:
    |   gateway_url = https://dev.abdm.gov.in
    |   abha_url    = https://abhasbx.abdm.gov.in/abha/api
    |
    | Production:
    |   gateway_url = https://apis.abdm.gov.in
    |   abha_url    = https://abha.abdm.gov.in/api/abha
    |
    */
    'abdm' => [
        'mock_mode'     => env('ABDM_MOCK_MODE', true),
        'gateway_url'   => env('ABDM_GATEWAY_URL', 'https://dev.abdm.gov.in'),
        'abha_url'      => env('ABDM_ABHA_URL', 'https://abhasbx.abdm.gov.in/abha/api'),
        'client_id'     => env('ABDM_CLIENT_ID'),
        'client_secret' => env('ABDM_CLIENT_SECRET'),
        'hip_id'        => env('ABDM_HIP_ID'),
    ],

];
