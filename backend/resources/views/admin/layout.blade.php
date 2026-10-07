<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VehiCare Admin</title>
    @vite(['resources/css/app.css'])
</head>
<body class="min-h-screen bg-slate-50 text-slate-900">
    <div class="max-w-6xl mx-auto py-8 px-4">
        <header class="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <p class="text-sm text-slate-500">VehiCare Admin</p>
                <h1 class="text-3xl font-semibold">Dashboard</h1>
            </div>
            <div class="flex items-center gap-3">
                <a href="{{ route('admin.dashboard') }}" class="px-4 py-2 rounded bg-slate-900 text-white text-sm">Dashboard</a>
                <form action="{{ route('admin.logout') }}" method="POST" class="inline">
                    @csrf
                    <button type="submit" class="px-4 py-2 rounded bg-red-600 text-white text-sm">Logout</button>
                </form>
            </div>
        </header>

        @if(session('status'))
            <div class="mb-4 rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900">
                {{ session('status') }}
            </div>
        @endif

        @if($errors->any())
            <div class="mb-4 rounded border border-rose-200 bg-rose-50 px-4 py-3 text-rose-900">
                <ul class="list-disc list-inside">
                    @foreach($errors->all() as $error)
                        <li>{{ $error }}</li>
                    @endforeach
                </ul>
            </div>
        @endif

        <main>
            {{ $slot }}
        </main>
    </div>
</body>
</html>
