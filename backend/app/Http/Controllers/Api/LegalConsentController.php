<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserConsent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LegalConsentController extends Controller
{
    /**
     * Current legal document versions (public, so the client can detect a
     * version change before presenting the registration agreement).
     */
    public function versions(): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => $this->currentVersions(),
        ]);
    }

    /**
     * Whether the authenticated user has accepted the CURRENT versions.
     */
    public function status(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'status' => 'success',
            'data' => array_merge($this->currentVersions(), [
                'accepted_current_versions' => UserConsent::hasAcceptedCurrentVersions($user),
                'accepted' => UserConsent::where('user_id', $user->id)
                    ->orderBy('accepted_at')
                    ->get(['document_type', 'document_version', 'accepted_at', 'source']),
            ]),
        ]);
    }

    /**
     * Record an explicit (re-)acceptance of the current versions. The client
     * must submit the versions it actually displayed; a mismatch is rejected so
     * a user can never be recorded as accepting text they were not shown.
     */
    public function accept(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'accepted' => ['required', 'accepted'],
            'terms_version' => ['required', 'string', 'max:32'],
            'privacy_version' => ['required', 'string', 'max:32'],
        ]);

        if (
            $validated['terms_version'] !== (string) config('legal.terms_version')
            || $validated['privacy_version'] !== (string) config('legal.privacy_version')
        ) {
            return response()->json([
                'status' => 'error',
                'code' => 'policy_version_mismatch',
                'message' => 'The Terms and Privacy Policy have been updated. Please review the latest versions.',
                'data' => $this->currentVersions(),
            ], 409);
        }

        UserConsent::recordCurrentVersions($request->user(), UserConsent::SOURCE_REACCEPTANCE);

        return response()->json([
            'status' => 'success',
            'message' => 'Your acceptance has been recorded.',
            'data' => array_merge($this->currentVersions(), ['accepted_current_versions' => true]),
        ]);
    }

    private function currentVersions(): array
    {
        return [
            'terms_version' => (string) config('legal.terms_version'),
            'privacy_version' => (string) config('legal.privacy_version'),
            'effective_date' => (string) config('legal.effective_date'),
        ];
    }
}
