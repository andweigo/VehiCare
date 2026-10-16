<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\FeedbackSubmission;
use App\Services\AdminActionAuditService;
use Illuminate\Http\Request;

class FeedbackAdminController extends Controller
{
    public function index(Request $request)
    {
        $query = FeedbackSubmission::with(['user:id,name,email', 'reviewedBy:id,name']);

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('category')) {
            $query->where('category', $request->input('category'));
        }

        $feedback = $query->latest()->paginate(20)->withQueryString();

        return view('admin.feedback.index', compact('feedback'));
    }

    public function update(Request $request, FeedbackSubmission $feedback)
    {
        $validated = $request->validate([
            'status' => ['required', 'in:new,reviewing,resolved,dismissed'],
            'admin_notes' => ['nullable', 'string', 'max:5000'],
        ]);

        $feedback->update([
            'status' => $validated['status'],
            'admin_notes' => trim($validated['admin_notes'] ?? '') ?: null,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);
        app(AdminActionAuditService::class)->record(
            $request->user(),
            'feedback_reviewed',
            'feedback',
            $feedback->id,
            ['status' => $feedback->status],
        );

        return back()->with('status', 'Feedback review updated.');
    }
}
