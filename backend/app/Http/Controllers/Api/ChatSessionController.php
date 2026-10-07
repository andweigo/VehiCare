<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ChatMessage;
use App\Models\ChatSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class ChatSessionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! Schema::hasTable('chat_sessions')) {
            return response()->json(['data' => []]);
        }

        $sessions = ChatSession::where('user_id', $user->id)
            ->with(['vehicle.vehicleBrand', 'vehicle.vehicleModel', 'vehicle.vehicleYear', 'messages'])
            ->latest('updated_at')
            ->get();

        $formatted = $sessions->map(function ($sess) {
            $v = $sess->vehicle;
            $vehicleData = null;

            if ($v) {
                $brand = $v->custom_brand ?: ($v->vehicleBrand->name ?? '');
                $model = $v->custom_model ?: ($v->vehicleModel->name ?? '');
                $year = $v->custom_year ?: ($v->vehicleYear->year ?? '');

                $vehicleData = [
                    'id' => $v->id,
                    'name' => trim("{$brand} {$model} {$year}") ?: 'Vehicle',
                    'brand' => $brand ?: null,
                    'model' => $model ?: null,
                    'year' => $year ?: null,
                ];
            }

            return [
                'id' => $sess->id,
                'title' => $sess->title,
                'type' => $sess->type,
                'status' => $sess->status,
                'vehicle' => $vehicleData,
                'created_at' => $sess->created_at ? $sess->created_at->toISOString() : null,
                'updated_at' => $sess->updated_at ? $sess->updated_at->toISOString() : null,
                'message_count' => $sess->messages->count(),
                'messages' => $sess->messages->map(fn ($m) => [
                    'id' => $m->id,
                    'role' => $m->role,
                    'sender' => $m->sender,
                    'text' => $m->text,
                    'metadata' => $m->metadata,
                    'created_at' => $m->created_at ? $m->created_at->toISOString() : null,
                ])->values()->toArray(),
            ];
        });

        return response()->json([
            'data' => $formatted,
        ]);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        if (! Schema::hasTable('chat_sessions')) {
            return response()->json(['message' => 'Chat session not found or unauthorized.'], 404);
        }

        $session = ChatSession::where('id', $id)
            ->where('user_id', $user->id)
            ->with(['vehicle.vehicleBrand', 'vehicle.vehicleModel', 'vehicle.vehicleYear', 'messages'])
            ->first();

        if (! $session) {
            return response()->json([
                'message' => 'Chat session not found or unauthorized.',
            ], 404);
        }

        $v = $session->vehicle;
        $vehicleData = null;

        if ($v) {
            $brand = $v->custom_brand ?: ($v->vehicleBrand->name ?? '');
            $model = $v->custom_model ?: ($v->vehicleModel->name ?? '');
            $year = $v->custom_year ?: ($v->vehicleYear->year ?? '');

            $vehicleData = [
                'id' => $v->id,
                'name' => trim("{$brand} {$model} {$year}") ?: 'Vehicle',
                'brand' => $brand ?: null,
                'model' => $model ?: null,
                'year' => $year ?: null,
            ];
        }

        return response()->json([
            'id' => $session->id,
            'title' => $session->title,
            'type' => $session->type,
            'status' => $session->status,
            'vehicle' => $vehicleData,
            'created_at' => $session->created_at ? $session->created_at->toISOString() : null,
            'updated_at' => $session->updated_at ? $session->updated_at->toISOString() : null,
            'message_count' => $session->messages->count(),
            'messages' => $session->messages->map(fn ($m) => [
                'id' => $m->id,
                'role' => $m->role,
                'sender' => $m->sender,
                'text' => $m->text,
                'metadata' => $m->metadata,
                'created_at' => $m->created_at ? $m->created_at->toISOString() : null,
            ])->values()->toArray(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! Schema::hasTable('chat_sessions')) {
            return response()->json(['message' => 'Chat database table not migrated yet.'], 503);
        }

        $validated = $request->validate([
            'id' => 'required|string',
            'vehicle_id' => 'nullable|integer|exists:vehicles,id',
            'title' => 'nullable|string|max:255',
            'type' => 'nullable|string|max:50',
            'status' => 'nullable|string|in:active,completed',
            'messages' => 'nullable|array',
            'messages.*.role' => 'nullable|string|in:user,assistant',
            'messages.*.sender' => 'nullable|string',
            'messages.*.text' => 'nullable|string',
            'messages.*.message' => 'nullable|string',
        ]);

        $sessionId = $validated['id'];

        // If vehicle_id is passed, verify user owns vehicle
        $vehicleId = $validated['vehicle_id'] ?? null;
        if ($vehicleId) {
            $ownsVehicle = $user->vehicles()->where('id', $vehicleId)->exists();
            if (! $ownsVehicle) {
                $vehicleId = null;
            }
        }

        $session = ChatSession::where('id', $sessionId)->first();

        if ($session && $session->user_id !== $user->id) {
            return response()->json([
                'message' => 'Unauthorized chat session.',
            ], 403);
        }

        if (! $session) {
            $session = new ChatSession();
            $session->id = $sessionId;
            $session->user_id = $user->id;
        }

        if ($vehicleId) {
            $session->vehicle_id = $vehicleId;
        }
        if (! empty($validated['title'])) {
            $session->title = $validated['title'];
        }
        if (! empty($validated['type'])) {
            $session->type = $validated['type'];
        }
        if (! empty($validated['status'])) {
            $session->status = $validated['status'];
        }

        $session->touch();
        $session->save();

        // Process messages if present
        if (! empty($validated['messages']) && is_array($validated['messages'])) {
            foreach ($validated['messages'] as $msg) {
                $text = $msg['text'] ?? $msg['message'] ?? '';
                if (trim((string) $text) === '') {
                    continue;
                }

                $role = $msg['role'] ?? ($msg['sender'] === 'assistant' ? 'assistant' : 'user');
                $sender = $msg['sender'] ?? $role;

                // Deduplicate by text and role within recent messages of session
                $exists = ChatMessage::where('chat_session_id', $session->id)
                    ->where('role', $role)
                    ->where('text', $text)
                    ->exists();

                if (! $exists) {
                    ChatMessage::create([
                        'chat_session_id' => $session->id,
                        'role' => $role,
                        'sender' => $sender,
                        'text' => $text,
                    ]);
                }
            }
        }

        return $this->show($request, $session->id);
    }

    public function complete(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        $session = ChatSession::where('id', $id)
            ->where('user_id', $user->id)
            ->first();

        if (! $session) {
            return response()->json([
                'message' => 'Chat session not found or unauthorized.',
            ], 404);
        }

        $session->status = 'completed';
        $session->save();

        return response()->json([
            'message' => 'Session marked as completed.',
            'id' => $session->id,
            'status' => 'completed',
        ]);
    }
}
