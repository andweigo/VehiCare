<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Broadcast;
use App\Http\Controllers\Api\VehicleController;
use App\Http\Controllers\Api\VehicleCorrectionRequestController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\NotificationPreferenceController;
use App\Http\Controllers\Api\NhtsaController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\SubscriptionController;
use App\Http\Controllers\Api\VehicleValidationController;

try {
    Broadcast::routes(['middleware' => ['auth:sanctum']]);
} catch (\Throwable $e) {
    \Illuminate\Support\Facades\Log::warning('Broadcast routes registration skipped: ' . $e->getMessage());
}

Route::get('/health', function () {
    return response()->json([
        'status' => 'success',
        'message' => 'VehiCare API is running',
    ]);
});

Route::post('/vehicles/validate', [VehicleValidationController::class, 'validate']);
Route::get('/models/{modelId}/validated-years', [VehicleValidationController::class, 'getValidatedYears']);
Route::get('/admin/vehicle-data-quality', [VehicleValidationController::class, 'dataQuality']);

Route::get('/vehicles', [VehicleController::class, 'index']);
Route::get('/vehicle-types', [VehicleController::class, 'types']);
Route::get('/vehicle-types/{vehicleTypeId}/brands', [VehicleController::class, 'brands']);
Route::get(
    '/brands/{brandId}/models',
    [VehicleController::class, 'models']
);
Route::get(
    '/models/{modelId}/years',
    [VehicleController::class, 'years']
);
Route::post(
    '/vehicles',
    [VehicleController::class, 'store']
)->middleware('auth:sanctum');

Route::get(
    '/my-vehicles',
    [VehicleController::class, 'myVehicles']
)->middleware('auth:sanctum');

Route::get(
    '/vehicle-correction-requests',
    [VehicleCorrectionRequestController::class, 'index']
)->middleware('auth:sanctum');

Route::get(
    '/my-vehicles/{vehicleId}/correction-request',
    [VehicleCorrectionRequestController::class, 'forVehicle']
)->middleware('auth:sanctum');

Route::post(
    '/vehicle-correction-requests',
    [VehicleCorrectionRequestController::class, 'store']
)->middleware('auth:sanctum');

Route::post(
    '/my-vehicles/active',
    [VehicleController::class, 'setActiveVehicle']
)->middleware('auth:sanctum');

Route::get(
    '/notifications',
    [NotificationController::class, 'index']
)->middleware('auth:sanctum');

Route::get(
    '/notifications/unread-count',
    [NotificationController::class, 'unreadCount']
)->middleware('auth:sanctum');

Route::patch(
    '/notifications/read-all',
    [NotificationController::class, 'markAllAsRead']
)->middleware('auth:sanctum');

Route::patch(
    '/notifications/{id}/read',
    [NotificationController::class, 'markAsRead']
)->middleware('auth:sanctum');

Route::get(
    '/user/notification-preferences',
    [NotificationPreferenceController::class, 'show']
)->middleware('auth:sanctum');

Route::match(
    ['put', 'patch'],
    '/user/notification-preferences',
    [NotificationPreferenceController::class, 'update']
)->middleware('auth:sanctum');

Route::get(
    '/vehicles/{id}',
    [VehicleController::class, 'show']
)->middleware('auth:sanctum');

Route::match(
    ['put', 'patch'],
    '/vehicles/{id}',
    [VehicleController::class, 'update']
)->middleware('auth:sanctum');

Route::delete(
    '/vehicles/{id}',
    [VehicleController::class, 'destroy']
)->middleware('auth:sanctum');

Route::post(
    '/vehicles/{id}/unarchive',
    [VehicleController::class, 'unarchive']
)->middleware('auth:sanctum');

use App\Http\Controllers\Auth\OtpController;

Route::prefix('auth')->group(function () {
    Route::post('/send-otp', [OtpController::class, 'sendOtp'])->middleware('throttle:10,1');
    Route::post('/verify-otp', [OtpController::class, 'verifyOtp'])->middleware('throttle:15,1');
    Route::post('/resend-otp', [OtpController::class, 'resendOtp'])->middleware('throttle:10,1');
    Route::post('/reset-password', [OtpController::class, 'resetPassword'])->middleware('throttle:5,1');
});

Route::post(
    '/register',
    [AuthController::class, 'register']
);

Route::post(
    '/login',
    [AuthController::class, 'login']
)->name('login');

Route::post(
    '/google-login',
    [AuthController::class, 'googleLogin']
);

Route::post(
    '/google-register',
    [AuthController::class, 'googleRegister']
);

Route::post(
    '/logout',
    [AuthController::class, 'logout']
)->middleware('auth:sanctum');

Route::match(
    ['put', 'patch'],
    '/user',
    [AuthController::class, 'updateProfile']
)->middleware('auth:sanctum');

Route::get(
    '/user/me',
    [AuthController::class, 'me']
)->middleware('auth:sanctum');

Route::post(
    '/subscription/subscribe',
    [SubscriptionController::class, 'subscribe']
)->middleware('auth:sanctum');

Route::get(
    '/subscription/status',
    [SubscriptionController::class, 'status']
)->middleware('auth:sanctum');

Route::get(
    '/subscription/payments',
    [SubscriptionController::class, 'payments']
)->middleware('auth:sanctum');

use App\Http\Controllers\Api\AIUsageController;
use App\Http\Controllers\Api\DiagnosticController;
use App\Http\Controllers\Api\RepairShopController;
use App\Http\Controllers\Api\HistoryController;
use App\Http\Controllers\Api\ChatSessionController;
use App\Http\Controllers\Api\MaintenanceController;
use App\Http\Controllers\Api\RepairController;

Route::get('/ai/usage', [AIUsageController::class, 'show']);
Route::post('/diagnostics', [DiagnosticController::class, 'store']);
Route::get('/diagnostics', [DiagnosticController::class, 'index'])->middleware('auth:sanctum');
Route::get('/diagnostics/{id}', [DiagnosticController::class, 'show'])->middleware('auth:sanctum');

Route::get('/history', [HistoryController::class, 'index'])->middleware('auth:sanctum');
Route::get('/history/{type}/{id}', [HistoryController::class, 'show'])->middleware('auth:sanctum');
Route::get('/chat-sessions', [ChatSessionController::class, 'index'])->middleware('auth:sanctum');
Route::get('/chat-sessions/{id}', [ChatSessionController::class, 'show'])->middleware('auth:sanctum');
Route::post('/chat-sessions', [ChatSessionController::class, 'store'])->middleware('auth:sanctum');
Route::post('/chat-sessions/{id}/complete', [ChatSessionController::class, 'complete'])->middleware('auth:sanctum');

Route::get('/maintenance', [MaintenanceController::class, 'index'])->middleware('auth:sanctum');
Route::post('/maintenance', [MaintenanceController::class, 'store'])->middleware('auth:sanctum');
Route::get('/maintenance/{id}', [MaintenanceController::class, 'show'])->middleware('auth:sanctum');
Route::match(['put', 'patch'], '/maintenance/{id}', [MaintenanceController::class, 'update'])->middleware('auth:sanctum');
Route::delete('/maintenance/{id}', [MaintenanceController::class, 'destroy'])->middleware('auth:sanctum');

Route::get('/repairs', [RepairController::class, 'index'])->middleware('auth:sanctum');
Route::post('/repairs', [RepairController::class, 'store'])->middleware('auth:sanctum');
Route::get('/repairs/{id}', [RepairController::class, 'show'])->middleware('auth:sanctum');
Route::match(['put', 'patch'], '/repairs/{id}', [RepairController::class, 'update'])->middleware('auth:sanctum');
Route::delete('/repairs/{id}', [RepairController::class, 'destroy'])->middleware('auth:sanctum');

Route::get('/repair-shops/nearby', [RepairShopController::class, 'nearby']);
Route::post('/service-referrals', [RepairShopController::class, 'createReferral'])->middleware('auth:sanctum');

Route::prefix('nhtsa')->group(function () {
    Route::get('/makes/{type}', [NhtsaController::class, 'makes']);
    Route::get('/models/{make}', [NhtsaController::class, 'models']);
    Route::get('/vin/{vin}', [NhtsaController::class, 'decodeVin']);
});