<?php

namespace App\Services\Storage;

interface StorageServiceInterface
{
    /**
     * Generate a presigned URL for uploading a file to S3/R2 directly.
     *
     * @param string $path The exact path where the file should be stored.
     * @param string $contentType The MIME type of the file.
     * @return string The presigned URL.
     */
    public function generateUploadUrl(string $path, string $contentType): string;

    /**
     * Generate a presigned URL for viewing/downloading a private file.
     *
     * @param string $path The exact path of the file.
     * @return string The presigned URL.
     */
    public function generateViewUrl(string $path): string;
}
