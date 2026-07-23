<?php

namespace App\Services\Storage;

use Illuminate\Support\Facades\Storage;

class StorageService implements StorageServiceInterface
{
    /**
     * Generate a presigned URL for uploading a file to S3/R2 directly.
     *
     * @param string $path The exact path where the file should be stored.
     * @param string $contentType The MIME type of the file.
     * @return string The presigned URL.
     */
    public function generateUploadUrl(string $path, string $contentType): string
    {
        $s3 = Storage::disk('s3')->getClient();
        $bucket = config('filesystems.disks.s3.bucket');

        $command = $s3->getCommand('PutObject', [
            'Bucket' => $bucket,
            'Key' => $path,
            'ContentType' => $contentType,
        ]);

        // URL expires in 5 minutes
        $request = $s3->createPresignedRequest($command, '+5 minutes');

        return (string) $request->getUri();
    }

    /**
     * Generate a presigned URL for viewing/downloading a private file.
     *
     * @param string $path The exact path of the file.
     * @return string The presigned URL.
     */
    public function generateViewUrl(string $path): string
    {
        // URL expires in 5 minutes
        return Storage::disk('s3')->temporaryUrl(
            $path,
            now()->addMinutes(5)
        );
    }
}
