<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminActionAudit;
use Illuminate\Http\Request;

class AdminAuditController extends Controller
{
    public function index(Request $request)
    {
        $query = AdminActionAudit::query();

        if ($request->filled('action')) {
            $query->where('action', $request->input('action'));
        }
        if ($request->filled('subject_type')) {
            $query->where('subject_type', $request->input('subject_type'));
        }

        $audits = $query->latest('created_at')->paginate(25)->withQueryString();
        $actions = AdminActionAudit::query()->distinct()->orderBy('action')->pluck('action');

        return view('admin.audit.index', compact('audits', 'actions'));
    }
}
