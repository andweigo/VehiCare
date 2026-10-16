<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Vehicle extends Model
{
    protected $fillable = [
        'user_id',
        'vehicle_type_id',
        'vehicle_brand_id',
        'vehicle_model_id',
        'vehicle_year_id',
        'custom_brand',
        'custom_model',
        'custom_year',
        'model_number',
        'archived_at',
    ];
    
    protected $casts = [
        'archived_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function vehicleType(): BelongsTo
    {
        return $this->belongsTo(VehicleType::class);
    }

    public function vehicleBrand(): BelongsTo
    {
        return $this->belongsTo(VehicleBrand::class);
    }

    public function vehicleModel(): BelongsTo
    {
        return $this->belongsTo(VehicleModel::class);
    }

    public function vehicleYear(): BelongsTo
    {
        return $this->belongsTo(VehicleYear::class);
    }

    /**
     * Safely apply requested correction values to this vehicle record,
     * correctly distinguishing integer foreign keys from string custom attributes.
     *
     * @param array $requestedValues
     * @return $this
     */
    public function applyCorrectionValues(array $requestedValues): self
    {
        // 1. Resolve vehicle type
        if (array_key_exists('vehicle_type_id', $requestedValues) || array_key_exists('type', $requestedValues)) {
            $val = $requestedValues['vehicle_type_id'] ?? $requestedValues['type'];
            if (!empty($val)) {
                if (is_numeric($val) && (int) $val > 0) {
                    $this->vehicle_type_id = (int) $val;
                } else {
                    $matchedType = VehicleType::whereRaw('LOWER(name) = ?', [strtolower(trim((string) $val))])->first();
                    if ($matchedType) {
                        $this->vehicle_type_id = $matchedType->id;
                    }
                }
            }
        }

        // 2. Resolve vehicle brand
        if (
            array_key_exists('vehicle_brand_id', $requestedValues) ||
            array_key_exists('custom_brand', $requestedValues) ||
            array_key_exists('brand', $requestedValues)
        ) {
            $val = $requestedValues['vehicle_brand_id'] ?? ($requestedValues['custom_brand'] ?? $requestedValues['brand']);
            if (!empty($val)) {
                if (is_numeric($val) && (int) $val > 0 && ($matchedBrand = VehicleBrand::find((int) $val))) {
                    $this->vehicle_brand_id = $matchedBrand->id;
                    $this->custom_brand = null;
                    if ($matchedBrand->vehicle_type_id && !$this->vehicle_type_id) {
                        $this->vehicle_type_id = $matchedBrand->vehicle_type_id;
                    }
                } else {
                    $stringBrand = trim((string) $val);
                    $brandQuery = VehicleBrand::whereRaw('LOWER(name) = ?', [strtolower($stringBrand)]);
                    if ($this->vehicle_type_id) {
                        $brandQuery->where('vehicle_type_id', $this->vehicle_type_id);
                    }
                    $matchedBrand = $brandQuery->first() ?: VehicleBrand::whereRaw('LOWER(name) = ?', [strtolower($stringBrand)])->first();

                    if ($matchedBrand) {
                        $this->vehicle_brand_id = $matchedBrand->id;
                        $this->custom_brand = null;
                        if ($matchedBrand->vehicle_type_id && !$this->vehicle_type_id) {
                            $this->vehicle_type_id = $matchedBrand->vehicle_type_id;
                        }
                    } else {
                        $this->custom_brand = $stringBrand;
                        $this->vehicle_brand_id = null;
                    }
                }
            }
        }

        // 3. Resolve vehicle model
        if (
            array_key_exists('vehicle_model_id', $requestedValues) ||
            array_key_exists('custom_model', $requestedValues) ||
            array_key_exists('model', $requestedValues)
        ) {
            $val = $requestedValues['vehicle_model_id'] ?? ($requestedValues['custom_model'] ?? $requestedValues['model']);
            if (!empty($val)) {
                if (is_numeric($val) && (int) $val > 0 && ($matchedModel = VehicleModel::find((int) $val))) {
                    $this->vehicle_model_id = $matchedModel->id;
                    $this->custom_model = null;
                    if (!$this->vehicle_brand_id) {
                        $this->vehicle_brand_id = $matchedModel->vehicle_brand_id;
                        $this->custom_brand = null;
                    }
                } else {
                    $stringModel = trim((string) $val);
                    $brandId = $this->vehicle_brand_id;

                    if (!$brandId && !empty($this->custom_brand)) {
                        $matchedBrand = VehicleBrand::whereRaw('LOWER(name) = ?', [strtolower(trim($this->custom_brand))])->first();
                        if ($matchedBrand) {
                            $brandId = $matchedBrand->id;
                        }
                    }

                    $matchedModel = null;
                    if ($brandId) {
                        $matchedModel = VehicleModel::where('vehicle_brand_id', $brandId)
                            ->whereRaw('LOWER(name) = ?', [strtolower($stringModel)])
                            ->first();
                    } else {
                        $matchedModel = VehicleModel::whereRaw('LOWER(name) = ?', [strtolower($stringModel)])->first();
                    }

                    if ($matchedModel) {
                        $this->vehicle_model_id = $matchedModel->id;
                        $this->custom_model = null;
                        if (!$this->vehicle_brand_id) {
                            $this->vehicle_brand_id = $matchedModel->vehicle_brand_id;
                            $this->custom_brand = null;
                        }
                    } else {
                        $this->custom_model = $stringModel;
                        $this->vehicle_model_id = null;
                    }
                }
            }
        }

        // 4. Resolve vehicle year
        if (
            array_key_exists('vehicle_year_id', $requestedValues) ||
            array_key_exists('custom_year', $requestedValues) ||
            array_key_exists('year', $requestedValues)
        ) {
            $val = $requestedValues['vehicle_year_id'] ?? ($requestedValues['custom_year'] ?? $requestedValues['year']);
            if (!empty($val)) {
                $stringYear = trim((string) $val);
                $yearAssigned = false;

                if ($this->vehicle_model_id && is_numeric($stringYear)) {
                    $yearInt = (int) $stringYear;
                    $matchedYear = VehicleYear::where('vehicle_model_id', $this->vehicle_model_id)
                        ->where('year', $yearInt)
                        ->first();

                    if (!$matchedYear) {
                        $matchedYear = VehicleYear::where('vehicle_model_id', $this->vehicle_model_id)
                            ->where('id', $yearInt)
                            ->first();
                    }

                    if ($matchedYear) {
                        $this->vehicle_year_id = $matchedYear->id;
                        $this->custom_year = null;
                        $yearAssigned = true;
                    }
                }

                if (!$yearAssigned) {
                    $this->custom_year = $stringYear;
                    $this->vehicle_year_id = null;
                }
            }
        }

        // 5. Resolve model number
        if (array_key_exists('model_number', $requestedValues)) {
            $val = $requestedValues['model_number'];
            $this->model_number = !empty($val) ? trim((string) $val) : null;
        }

        return $this;
    }
}