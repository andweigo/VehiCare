<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class RepairAssistanceAdminController extends Controller
{
    public function index()
    {
        $assistanceItems = [];

        return view('admin.repair-assistance.index', compact('assistanceItems'));
    }
}
