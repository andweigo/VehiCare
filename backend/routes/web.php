<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\Admin\AdminManagementController;
use App\Http\Controllers\Admin\AiActivityAdminController;
use App\Http\Controllers\Admin\DiagnosticsAdminController;
use App\Http\Controllers\Admin\MaintenanceAdminController;
use App\Http\Controllers\Admin\RepairAssistanceAdminController;
use App\Http\Controllers\Admin\RepairShopAdminController;
use App\Http\Controllers\Admin\ReportsAdminController;
use App\Http\Controllers\Admin\ServiceReferralAdminController;
use App\Http\Controllers\Admin\SettingsAdminController;
use App\Http\Controllers\Admin\SubscriptionController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\VehicleAdminController;
use App\Http\Controllers\Admin\VehicleCorrectionRequestController;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});



/*
|--------------------------------------------------------------------------
| Admin Authentication
|--------------------------------------------------------------------------
*/

Route::get('/admin/login', [AdminController::class, 'loginView'])
    ->name('admin.login');

Route::post('/admin/login', [AdminController::class, 'login'])
    ->name('admin.login.submit');

Route::post('/admin/logout', [AdminController::class, 'logout'])
    ->name('admin.logout');


/*
|--------------------------------------------------------------------------
| Admin Routes
|--------------------------------------------------------------------------
*/

Route::middleware(['web', 'auth', 'admin'])
    ->prefix('admin')
    ->group(function () {

        // MAIN
        Route::get('/dashboard', [AdminController::class, 'dashboard'])
            ->name('admin.dashboard');

        Route::get('/users', [UserController::class, 'index'])
            ->name('admin.users.index');

        Route::get('/users/{id}', [UserController::class, 'show'])
            ->name('admin.users.show');

        Route::post('/users/{id}', [UserController::class, 'update'])
            ->name('admin.users.update');

        Route::post('/users/{id}/toggle', [UserController::class, 'toggle'])
            ->name('admin.users.toggle');

        Route::delete('/users/{id}', [UserController::class, 'destroy'])
            ->name('admin.users.destroy');


        // VEHICLES
        Route::get('/vehicles', [VehicleAdminController::class, 'index'])
            ->name('admin.vehicles.index');

        Route::get('/vehicles/{id}', [VehicleAdminController::class, 'show'])
            ->name('admin.vehicles.show');

        Route::delete('/vehicles/{id}', [VehicleAdminController::class, 'destroy'])
            ->name('admin.vehicles.destroy');


        // DIAGNOSTICS
        Route::get('/diagnostics', [DiagnosticsAdminController::class, 'index'])
            ->name('admin.diagnostics.index');

        Route::get('/diagnostics/{id}', [DiagnosticsAdminController::class, 'show'])
            ->name('admin.diagnostics.show');


        // SERVICES
        Route::get('/repair-shops', [RepairShopAdminController::class, 'index'])
            ->name('admin.repair-shops.index');
        Route::get('/repair-shops/create', [RepairShopAdminController::class, 'create'])
            ->name('admin.repair-shops.create');
        Route::post('/repair-shops', [RepairShopAdminController::class, 'store'])
            ->name('admin.repair-shops.store');
        Route::get('/repair-shops/{id}/edit', [RepairShopAdminController::class, 'edit'])
            ->name('admin.repair-shops.edit');
        Route::match(['put', 'patch', 'post'], '/repair-shops/{id}', [RepairShopAdminController::class, 'update'])
            ->name('admin.repair-shops.update');
        Route::post('/repair-shops/{id}/toggle', [RepairShopAdminController::class, 'toggle'])
            ->name('admin.repair-shops.toggle');
        Route::delete('/repair-shops/{id}', [RepairShopAdminController::class, 'destroy'])
            ->name('admin.repair-shops.destroy');

        Route::get('/repair-assistance', [RepairAssistanceAdminController::class, 'index'])
            ->name('admin.repair-assistance.index');

        Route::get('/service-referrals', [ServiceReferralAdminController::class, 'index'])
            ->name('admin.service-referrals.index');

        Route::get('/maintenance', [MaintenanceAdminController::class, 'index'])
            ->name('admin.maintenance.index');


        // AI
        Route::get('/ai-activity', [AiActivityAdminController::class, 'index'])
            ->name('admin.ai-activity.index');

        Route::get('/reports', [ReportsAdminController::class, 'index'])
            ->name('admin.reports.index');


        // SYSTEM
        Route::get('/settings', [SettingsAdminController::class, 'index'])
            ->name('admin.settings.index');

        Route::get('/correction-requests', [VehicleCorrectionRequestController::class, 'index'])
            ->name('admin.correction-requests.index');

        Route::get('/correction-requests/{id}', [VehicleCorrectionRequestController::class, 'show'])
            ->name('admin.correction-requests.show');

        Route::post('/correction-requests/{id}/approve', [VehicleCorrectionRequestController::class, 'approve'])
            ->name('admin.correction-requests.approve');

        Route::post('/correction-requests/{id}/reject', [VehicleCorrectionRequestController::class, 'reject'])
            ->name('admin.correction-requests.reject');


        // SUBSCRIPTIONS
        Route::get('/subscriptions', [SubscriptionController::class, 'index'])
            ->name('admin.subscriptions.index');

        Route::post('/subscriptions/{id}', [SubscriptionController::class, 'update'])
            ->name('admin.subscriptions.update');


        // PAYMENTS
        Route::post('/payments/{id}/approve', [SubscriptionController::class, 'approve'])
            ->name('admin.payments.approve');

        Route::post('/payments/{id}/reject', [SubscriptionController::class, 'reject'])
            ->name('admin.payments.reject');

        Route::post('/payments/{id}/complete-refund', [SubscriptionController::class, 'completeRefund'])
            ->name('admin.payments.complete-refund');


        // ADMIN MANAGEMENT
        Route::get('/admins', [AdminManagementController::class, 'index'])
            ->name('admin.admins.index');

        Route::get('/admins/create', [AdminManagementController::class, 'create'])
            ->name('admin.admins.create');

        Route::post('/admins', [AdminManagementController::class, 'store'])
            ->name('admin.admins.store');

        Route::post('/admins/{id}/toggle', [AdminManagementController::class, 'toggle'])
            ->name('admin.admins.toggle');

        Route::delete('/admins/{id}', [AdminManagementController::class, 'destroy'])
            ->name('admin.admins.destroy');
    });