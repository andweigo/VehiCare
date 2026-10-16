<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Diagnostic extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'vehicle_id',
        'input_type',
        'symptoms',
        'image_path',
        'summary',
        'confidence',
        'severity',
        'urgency',
        'possible_causes',
        'recommended_actions',
        'maintenance_tasks',
        'smart_recommendations',
        'estimated_cost_min',
        'estimated_cost_max',
        'currency',
        'professional_help_recommended',
        'professional_help_reason',
        'professional_help_priority',
        'plan_tier',
        'repair_guidance',
        'cost_breakdown',
        'history_insights',
        'clarification_questions',
        'request_key',
    ];

    protected $casts = [
        'possible_causes' => 'array',
        'recommended_actions' => 'array',
        'maintenance_tasks' => 'array',
        'smart_recommendations' => 'array',
        'repair_guidance' => 'array',
        'cost_breakdown' => 'array',
        'clarification_questions' => 'array',
        'professional_help_recommended' => 'boolean',
        'estimated_cost_min' => 'float',
        'estimated_cost_max' => 'float',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function serviceReferrals()
    {
        return $this->hasMany(ServiceReferral::class);
    }

    public function media()
    {
        return $this->hasMany(DiagnosticMedia::class);
    }

    public function maintenanceRecords()
    {
        return $this->hasMany(MaintenanceRecord::class);
    }

    public function repairRecords()
    {
        return $this->hasMany(RepairRecord::class);
    }
}
