<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class MaintenanceAdminController extends Controller
{
    public function index()
    {
        $maintenanceItems = [];

        return view('admin.maintenance.index', compact('maintenanceItems'));
    }
}
