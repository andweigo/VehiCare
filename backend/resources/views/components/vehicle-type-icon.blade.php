@props(['type' => null, 'class' => 'h-5 w-5'])

@php
    $normalizedType = strtolower(trim(is_object($type) ? ($type->name ?? '') : (string)$type));

    $isMotorcycle = str_contains($normalizedType, 'motorcycle') || 
                    str_contains($normalizedType, 'scooter') || 
                    str_contains($normalizedType, 'moto') || 
                    str_contains($normalizedType, '2-wheeler');

    $isBicycle = str_contains($normalizedType, 'bicycle') || 
                 str_contains($normalizedType, 'bike') || 
                 str_contains($normalizedType, 'cycle') || 
                 str_contains($normalizedType, 'ebike') || 
                 str_contains($normalizedType, 'e-bike');

    $isCar = str_contains($normalizedType, 'car') || 
             str_contains($normalizedType, 'sedan') || 
             str_contains($normalizedType, 'suv') || 
             str_contains($normalizedType, 'hatchback') || 
             str_contains($normalizedType, 'truck') || 
             str_contains($normalizedType, 'van') || 
             str_contains($normalizedType, 'coupe') || 
             str_contains($normalizedType, 'convertible') ||
             str_contains($normalizedType, '4-wheeler');
@endphp

@if($isMotorcycle)
    <!-- Motorcycle Icon -->
    <svg class="{{ $class }}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M5 16a3 3 0 100-6 3 3 0 000 6zm14 0a3 3 0 100-6 3 3 0 000 6zM8 13h4l2.5-5H18M10 13l2-7h3.5"/>
    </svg>
@elseif($isBicycle)
    <!-- Bicycle Icon -->
    <svg class="{{ $class }}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M5 17a3 3 0 100-6 3 3 0 000 6zm14 0a3 3 0 100-6 3 3 0 000 6zM9 14l2-4h3l2 4M12 10v4M6 14h2"/>
    </svg>
@elseif($isCar)
    <!-- Car Icon -->
    <svg class="{{ $class }}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/>
    </svg>
@else
    <!-- Neutral Fallback Vehicle Icon -->
    <svg class="{{ $class }}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
    </svg>
@endif
