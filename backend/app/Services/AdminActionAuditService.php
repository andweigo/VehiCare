<?php

namespace App\Services;

use App\Models\AdminActionAudit;
use App\Models\User;

class AdminActionAuditService
{
    public function record(User $admin, string $action, string $subjectType, int|string $subjectId, array $metadata = []): void
    {
        AdminActionAudit::create([
            'admin_id' => $admin->id,
            'admin_name' => $admin->name,
            'action' => $action,
            'subject_type' => $subjectType,
            'subject_id' => (string) $subjectId,
            'metadata' => $metadata,
            'created_at' => now(),
        ]);
    }
}
