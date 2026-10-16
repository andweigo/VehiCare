<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FeedbackSubmission;
use App\Services\AdminNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FeedbackController extends Controller
{
    public function store(Request $request, AdminNotificationService $adminNotifications): JsonResponse
    {
        $validated = $request->validate([
            'category' => ['required', 'string', 'in:general,feature,accuracy,usability,performance,other'],
            'rating' => ['nullable', 'integer', 'between:1,5'],
            'subject' => ['required', 'string', 'min:3', 'max:255'],
            'message' => ['required', 'string', 'min:10', 'max:5000'],
            'email' => ['nullable', 'email', 'max:255'],
        ]);

        $feedback = FeedbackSubmission::create([
            'user_id' => $request->user()?->id,
            'category' => $validated['category'],
            'rating' => $validated['rating'] ?? null,
            'subject' => trim($validated['subject']),
            'message' => trim($validated['message']),
            'contact_email' => $request->user()?->email ?? ($validated['email'] ?? null),
        ]);

        $adminNotifications->notify(
            "feedback-submitted:{$feedback->id}",
            'New user feedback',
            'A feedback submission is ready for review.',
            ['feedback_id' => $feedback->id, 'category' => $feedback->category],
        );

        return response()->json([
            'status' => 'success',
            'data' => ['id' => $feedback->id, 'received_at' => $feedback->created_at->toIso8601String()],
        ], 201);
    }
}
