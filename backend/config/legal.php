<?php

/*
|--------------------------------------------------------------------------
| Legal document metadata (server-side source of truth)
|--------------------------------------------------------------------------
|
| The mobile app displays the Terms and Conditions and Privacy Policy from
| src/data/legalDocuments.js. The versions below MUST match the versions in
| that file. The API rejects registrations/acceptances that carry a version
| other than the current one, which forces the client to show the latest text.
|
| Bump a version here AND in the mobile file whenever the document changes
| materially; existing users are then asked to accept the new version
| (GET /api/user/consents/status).
|
| The organization/contact values are intentionally NOT invented. They must
| be supplied through environment variables before production release.
|
*/

return [

    'terms_version' => env('LEGAL_TERMS_VERSION', '1.0'),
    'privacy_version' => env('LEGAL_PRIVACY_VERSION', '1.0'),

    // Effective date of the CURRENT versions (ISO-8601 date).
    'effective_date' => env('LEGAL_EFFECTIVE_DATE', '2026-10-24'),

    // Personal information controller details: REQUIRED BEFORE PRODUCTION.
    'organization_name' => env('LEGAL_ORGANIZATION_NAME'),
    'organization_address' => env('LEGAL_ORGANIZATION_ADDRESS'),
    'privacy_contact_name' => env('LEGAL_PRIVACY_CONTACT_NAME'),
    'privacy_contact_email' => env('LEGAL_PRIVACY_CONTACT_EMAIL'),
    'npc_registration_number' => env('LEGAL_NPC_REGISTRATION_NUMBER'),

];
