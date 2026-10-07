<!DOCTYPE html>
<html lang="en" class="h-full bg-[#000000]">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Sign In | VehiCare Console</title>

    <!-- Google Fonts: Outfit & Inter -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@500;600;700;800&display=swap" rel="stylesheet">

    <!-- Tailwind CSS CDN Fallback + Vite -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    fontFamily: {
                        heading: ['Outfit', 'sans-serif'],
                        sans: ['Inter', 'sans-serif'],
                    },
                    colors: {
                        brand: {
                            DEFAULT: '#F63B05',
                            500: '#F63B05',
                            600: '#D83000',
                        }
                    }
                }
            }
        }
    </script>
    @vite(['resources/css/app.css'])

    <style>
        body { font-family: 'Inter', sans-serif; background-color: #000000; color: #FFFFFF; }
        h1, h2, h3, .font-heading { font-family: 'Outfit', sans-serif; }
    </style>
</head>
<body class="h-full bg-[#000000] text-[#FFFFFF] antialiased flex items-center justify-center p-4">

    <!-- Login Container Card -->
    <div class="w-full max-w-md overflow-hidden rounded-xl border border-[#222222] bg-[#111111] p-6 sm:p-8 space-y-6 shadow-2xl">
        
        <!-- Logo Header -->
        <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F63B05] text-white font-heading font-extrabold text-xl shadow-md shadow-[#F63B05]/20">
                V
            </div>
            <div>
                <span class="font-heading font-bold text-lg text-white">VehiCare</span>
                <p class="text-[10px] text-[#A1A1AA] font-heading font-semibold tracking-wider uppercase">ADMIN DASHBOARD</p>
            </div>
        </div>

        <div>
            <h1 class="text-xl font-heading font-bold text-white">Administrator Sign In</h1>
            <p class="mt-1 text-xs text-[#A1A1AA]">Enter your credentials to access the VehiCare desktop administration console.</p>
        </div>

        @if($errors->any())
            <div class="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 p-3.5 text-xs text-[#EF4444]">
                <ul class="list-disc list-inside space-y-1 text-[11px]">
                    @foreach($errors->all() as $error)
                        <li>{{ $error }}</li>
                    @endforeach
                </ul>
            </div>
        @endif

        <form action="{{ route('admin.login.submit') }}" method="POST" class="space-y-4">
            @csrf

            <div>
                <label class="block text-[11px] font-heading font-semibold text-[#A1A1AA] mb-1.5 uppercase">Email Address</label>
                <input type="email" name="email" value="{{ old('email') }}" required autofocus
                    placeholder="admin@vehicare.com"
                    class="w-full rounded-xl border border-[#222222] bg-[#181818] px-3.5 py-2.5 text-xs text-white placeholder-[#666666] outline-none transition focus:border-[#F63B05]" />
            </div>

            <div>
                <label class="block text-[11px] font-heading font-semibold text-[#A1A1AA] mb-1.5 uppercase">Password</label>
                <input type="password" name="password" required
                    placeholder="••••••••••••"
                    class="w-full rounded-xl border border-[#222222] bg-[#181818] px-3.5 py-2.5 text-xs text-white placeholder-[#666666] outline-none transition focus:border-[#F63B05]" />
            </div>

            <div class="flex items-center justify-between text-xs text-[#A1A1AA]">
                <label class="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" name="remember" class="h-4 w-4 rounded border-[#222222] bg-[#181818] text-[#F63B05] focus:ring-[#F63B05]" />
                    <span>Keep me signed in</span>
                </label>
            </div>

            <button type="submit" class="w-full rounded-xl bg-[#F63B05] px-4 py-3 text-xs font-heading font-semibold text-white shadow hover:bg-[#D83000] transition">
                Sign In to Console &rarr;
            </button>
        </form>

        <p class="text-center text-[10px] text-[#666666]">VehiCare Automotive AI Platform &bull; Security Standard</p>

    </div>

</body>
</html>
