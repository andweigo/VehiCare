<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class AdminMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::user();

        if (! $user || $user->role !== 'admin' || ! $user->is_active) {
            if ($request->expectsJson()) {
                return response()->json([
                    'message' => 'Unauthorized.',
                ], 403);
            }

            return redirect()->route('admin.login');
        }

        return $next($request);
    }
}
