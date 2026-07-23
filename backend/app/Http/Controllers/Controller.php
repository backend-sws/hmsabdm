<?php

namespace App\Http\Controllers;

use OpenApi\Attributes as OA;

#[OA\Info(
    version: "1.0.0",
    title: "HMS ABDM Integration API",
    description: "API Documentation for the Hospital Management System"
)]
#[OA\Server(
    url: "http://localhost:8000",
    description: "Main API Server"
)]
#[OA\SecurityScheme(
    securityScheme: "bearerAuth",
    type: "http",
    scheme: "bearer"
)]
abstract class Controller
{
    //
}
