<?php

namespace App\Services\AI;

use RuntimeException;

class AIServiceException extends RuntimeException
{
    public function __construct(
        string $errorCode,
        string $message,
        public readonly bool $retryable,
        public readonly int $httpStatus = 502,
        ?\Throwable $previous = null,
        public readonly ?array $details = null
    ) {
        parent::__construct($message, 0, $previous);
        $this->errorCode = $errorCode;
    }

    public readonly string $errorCode;
}
