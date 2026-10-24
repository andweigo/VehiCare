/**
 * legalDocuments.js
 *
 * SINGLE SOURCE OF TRUTH for the Terms and Conditions and Privacy Policy shown
 * in the app (registration, Settings, Sidebar). Version metadata lives here so
 * the registration checkbox, the document screens and the consent payload sent
 * to Laravel can never disagree.
 *
 * The Laravel API validates the versions it receives against
 * backend/config/legal.php (config('legal.terms_version') /
 * config('legal.privacy_version')). When you change any text MATERIALLY:
 *   1. bump the version below,
 *   2. bump the matching value in backend/config/legal.php (or the
 *      LEGAL_TERMS_VERSION / LEGAL_PRIVACY_VERSION env vars),
 *   3. update LEGAL_EFFECTIVE_DATE.
 * Existing users are then asked to accept the new version
 * (GET /api/user/consents/status -> accepted_current_versions === false).
 *
 * IMPORTANT: this text describes the implementation as inspected on the
 * effective date. It is NOT legal advice and must be reviewed by the
 * responsible organization / qualified Philippine privacy counsel before
 * production release. Items that could not be established from the codebase
 * are marked "To be confirmed" on purpose and are listed in
 * LEGAL_OPEN_ITEMS.
 */

export const LEGAL_VERSIONS = {
  terms: '1.0',
  privacy: '1.0',
  effectiveDate: '2026-10-24',
};

/**
 * Personal information controller details. NOT INVENTED: nothing in the
 * repository names the operating organization or a privacy contact. Fill these
 * in (and mirror them in backend/.env LEGAL_* values) before production.
 */
export const LEGAL_CONTROLLER = {
  organizationName: null, // e.g. registered business / project owner name
  organizationAddress: null,
  privacyContactName: null, // Data Protection Officer or privacy contact
  privacyContactEmail: null,
  npcRegistrationNumber: null, // only if the organization is registered with the NPC
};

export const PLACEHOLDER_TEXT = '[To be supplied by the operator before production release]';

const orPlaceholder = value => (value && String(value).trim() ? value : PLACEHOLDER_TEXT);

/** Open legal/operational items (also surfaced in the final report). */
export const LEGAL_OPEN_ITEMS = [
  'Name, address and privacy contact of the organization operating VehiCare are not established in the project.',
  'Data retention periods have not been defined in the implementation.',
  'There is no in-app account-deletion feature or privacy-request workflow yet; requests are handled through the privacy contact.',
  'The intended audience / minimum age and any parental-consent process have not been established.',
  'The app currently sends API requests to a Render-hosted backend. The production database provider, storage region, email provider, and any cross-border transfer safeguards must be confirmed by the operator.',
  'Diagnostic images are stored on Laravel public storage and their URLs are saved with diagnostic history; public access controls and retention need urgent review.',
  'A documented assessment of lawful bases, legitimate interests, and data-protection risks has not been found in the repository.',
  'The policy has not been reviewed by qualified Philippine privacy counsel.',
];

const p = text => ({ type: 'p', text });
const ul = items => ({ type: 'ul', items });
const note = text => ({ type: 'note', text });

/* ------------------------------------------------------------------ */
/* TERMS AND CONDITIONS                                                */
/* ------------------------------------------------------------------ */

export const TERMS_DOCUMENT = {
  id: 'terms',
  title: 'Terms and Conditions',
  version: LEGAL_VERSIONS.terms,
  effectiveDate: LEGAL_VERSIONS.effectiveDate,
  intro:
    'These Terms and Conditions explain the rules for using VehiCare. Please read them together with our Privacy Policy, which explains how your personal data is handled.',
  sections: [
    {
      id: 'service',
      title: 'A. What VehiCare provides',
      blocks: [
        p('VehiCare is a mobile app for cars, motorcycles and bicycles. Depending on your plan, it offers:'),
        ul([
          'Vehicle profiles for the vehicles you add.',
          'AI-assisted vehicle diagnostics from text, images, video and recorded vehicle sounds.',
          'Maintenance tracking and maintenance reminders.',
          'Repair guidance and estimated repair costs.',
          'Repair shop discovery on a map.',
        ]),
        p('Some features can be tried in guest mode with limits. Creating an account unlocks saved vehicles and history.'),
      ],
    },
    {
      id: 'account',
      title: 'B. Your account',
      blocks: [
        ul([
          'Give accurate registration information and keep it up to date.',
          'Keep your password and sign-in methods private. You are responsible for activity under your account.',
          'Tell us promptly if you suspect someone else has used your account.',
          'Registration is complete only after you verify your email address with the one-time code we send you.',
        ]),
      ],
    },
    {
      id: 'ai',
      title: 'C. Limits of AI diagnostics',
      blocks: [
        p(
          'Diagnoses, possible faults, severity estimates, repair suggestions and cost estimates produced by VehiCare are generated by artificial intelligence. They are informational only and may be incomplete or inaccurate.',
        ),
        p(
          'VehiCare does not replace a qualified mechanic, a physical inspection of your vehicle, or professional repair services. If a problem could affect safety (for example brakes, steering, tyres, fuel leaks, overheating or unusual smells), stop using the vehicle where appropriate and have it inspected by a qualified professional.',
        ),
      ],
    },
    {
      id: 'media',
      title: 'D. Vehicle sound, image and text input',
      blocks: [
        ul([
          'Sound input is for recording a noise made by your vehicle, not for asking questions by voice. Speech, music, silence or unrelated sounds are not analysed as vehicle noises.',
          'Images and video are used to help identify visible vehicle problems.',
          'Text chat is for describing symptoms and asking vehicle-related questions.',
        ]),
        p(
          'AI interpretation of sound and images has limits. A recording may be rejected or reported as inconclusive when a vehicle sound cannot be identified reliably, and a normal operating sound is not treated as a fault. Recording again in a quieter place, closer to the source, usually helps.',
        ),
      ],
    },
    {
      id: 'maintenance',
      title: 'E. Maintenance tracking',
      blocks: [
        p(
          'Reminders and schedules are there to help you. They do not guarantee that maintenance is carried out or that a vehicle is safe to operate. You remain responsible for maintaining your vehicle.',
        ),
      ],
    },
    {
      id: 'shops',
      title: 'F. Repair shop discovery',
      blocks: [
        p(
          'Map results help you find repair shops near a location. Appearing in results does not mean VehiCare has a partnership with, endorses, guarantees the quality of, or receives a referral from that business. Check details with the shop before you visit.',
        ),
      ],
    },
    {
      id: 'plans',
      title: 'G. Free and Premium plans',
      blocks: [
        p('The plans currently implemented in the app are:'),
        ul([
          'Guest: limited AI consultations (5 in total on a device).',
          'Free account: 1 active vehicle and 20 AI consultations per month.',
          'Premium: up to 5 vehicle profiles and 100 AI consultations per month, with higher media limits. Listed prices are PHP 149 per month or PHP 1,490 per year.',
        ]),
        note(
          'Billing status: payments in the current version of VehiCare are SIMULATED. No real payment is collected and no payment card or e-wallet credentials are processed. Premium access is recorded in VehiCare\'s database for the selected period. If real payment processing is introduced, these Terms and the Privacy Policy will be updated first and you will be notified.',
        ),
        p(
          'A Premium period ends on its expiry date, after which your account returns to the Free plan limits. Plan limits are shown in the app and may be adjusted by the operator with notice.',
        ),
      ],
    },
    {
      id: 'use',
      title: 'H. Acceptable use',
      blocks: [
        p('You agree not to:'),
        ul([
          'Access or try to access other people\'s accounts or data.',
          'Probe, overload, reverse-engineer or exploit the app, the AI service or the servers.',
          'Bypass plan limits, validation checks or safety measures.',
          'Upload content that is unlawful, infringes the rights of others, or is unrelated to vehicle diagnosis.',
        ]),
      ],
    },
    {
      id: 'availability',
      title: 'I. Service availability',
      blocks: [
        p(
          'VehiCare depends on third-party services such as AI providers, maps, authentication, hosting and your network connection. These may be unavailable or slow from time to time, so uninterrupted operation cannot be guaranteed. When the AI service is unavailable we tell you instead of presenting an invented result.',
        ),
      ],
    },
    {
      id: 'changes',
      title: 'J. Changes, suspension and termination',
      blocks: [
        p(
          'We may update these Terms. For material changes we will notify you in the app and ask you to review and accept the new version where required. We may suspend or end access to an account that seriously or repeatedly breaks these Terms or threatens the security of the service or other users, subject to applicable law and with appropriate notice where possible. You may stop using VehiCare at any time and may request account closure as described in the Privacy Policy.',
        ),
        p('Nothing in these Terms limits rights you have under Philippine law, including your rights under the Data Privacy Act of 2012.'),
      ],
    },
    {
      id: 'privacy',
      title: 'K. Privacy',
      blocks: [
        p('How we handle your personal data is explained in the VehiCare Privacy Policy. Agreeing to these Terms does not waive any of your statutory privacy rights.'),
      ],
      linkToPrivacy: true,
    },
    {
      id: 'content',
      title: 'L. App content and your uploads',
      blocks: [
        p('VehiCare and its licensors retain rights to the app, name, design and materials provided through the service. We give you a limited, personal, non-exclusive and revocable permission to use the app for its intended vehicle-care features, subject to these Terms.'),
        p('You keep any rights you already have in the text, photos, video and recordings you submit. You confirm that you may submit them and that doing so does not violate another person\'s rights. You allow VehiCare and its service providers to host, transmit and process your submitted content only as needed to provide, maintain, protect and support the features you request, and to meet legal requirements. This permission does not transfer ownership to VehiCare.'),
      ],
    },
    {
      id: 'law',
      title: 'M. Applicable law and limits',
      blocks: [
        p('These Terms are governed by the laws of the Philippines, subject to any mandatory law that applies to you. If a court finds one part unenforceable, the remaining parts continue to apply to the extent permitted by law.'),
        p('To the extent permitted by applicable law, VehiCare is not responsible for indirect or consequential loss arising from reliance on an AI-generated response or an unavailable third-party service. Nothing in these Terms excludes liability or limits a right that cannot lawfully be excluded or limited, including your rights under Philippine privacy and consumer-protection laws.'),
      ],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* PRIVACY POLICY                                                      */
/* ------------------------------------------------------------------ */

export const PRIVACY_DOCUMENT = {
  id: 'privacy',
  title: 'Privacy Policy',
  version: LEGAL_VERSIONS.privacy,
  effectiveDate: LEGAL_VERSIONS.effectiveDate,
  intro:
    'This Privacy Policy explains in plain language what personal data VehiCare handles, why, who receives it, how long it is kept and what rights you have under the Data Privacy Act of 2012 (Republic Act No. 10173) and its Implementing Rules and Regulations. It describes how the app actually works at the effective date above.',
  sections: [
    {
      id: 'controller',
      title: 'A. Who is responsible for your data',
      blocks: [
        {
          type: 'kv',
          items: [
            ['Organization', () => orPlaceholder(LEGAL_CONTROLLER.organizationName)],
            ['Address', () => orPlaceholder(LEGAL_CONTROLLER.organizationAddress)],
            ['Privacy contact / DPO', () => orPlaceholder(LEGAL_CONTROLLER.privacyContactName)],
            ['Privacy email', () => orPlaceholder(LEGAL_CONTROLLER.privacyContactEmail)],
            ['NPC registration no.', () => orPlaceholder(LEGAL_CONTROLLER.npcRegistrationNumber)],
          ],
        },
        p(
          'Send privacy questions and requests (access, correction, deletion, objection, withdrawal of consent) to the privacy contact above. We may ask you to confirm your identity first, for example by replying from the email address registered to your account or by signing in, so that your data is not given to someone else.',
        ),
      ],
    },
    {
      id: 'data',
      title: 'B. Personal data we handle',
      blocks: [
        p('Account information'),
        ul([
          'Name and email address; an optional phone number and profile picture if you add them.',
          'Account identifiers, including your Firebase user ID when you sign up with Firebase Authentication or Google Sign-In.',
          'Account status: when the account was created, whether the email was verified, role and plan.',
          'Your password is entered for Firebase Authentication and for VehiCare\'s own sign-in. VehiCare\'s database stores only a one-way hash of an email-and-password account\'s password. For Google Sign-In, VehiCare never receives your Google password.',
        ]),
        p('Vehicle information'),
        ul([
          'Vehicle type, brand, model, year, model number and any custom details you enter; maintenance schedules, completed services and history.',
        ]),
        p('Diagnostic information'),
        ul([
          'Symptoms and questions you type in chat and the AI\'s answers, severity estimates and repair suggestions.',
          'Images and videos you upload for diagnosis, and recordings you make for vehicle sound analysis.',
          'Saved diagnostic and conversation history (see Storage and Retention).',
        ]),
        p('Location information'),
        ul([
          'Your device location, only when you use a location feature such as "use my current location" in Repair Shops and after you grant the Android or iOS location permission. VehiCare does not track your location in the background.',
          'The map point you select or search for. The coordinates of the selected point are sent to VehiCare\'s server to find nearby repair shops, and your last selected location is saved on your phone so you do not need to pick it again.',
          'Coordinates are also sent to OpenStreetMap\'s Nominatim service to turn them into a place name.',
        ]),
        p('Maintenance and notification information'),
        ul(['Maintenance tasks and completion status, reminder settings, notification preferences and notification records.']),
        p('Subscription and transaction information'),
        ul([
          'Plan, billing cycle, start and expiry dates, and payment records (amount, chosen payment method label and reference number).',
          'Payments are currently simulated: VehiCare does not collect card or e-wallet credentials and no external payment processor is involved.',
        ]),
        p('Technical information'),
        ul([
          'Request and error logs with timestamps and request identifiers; the Node AI service records IP addresses for failed authentication and rate-limit events. AI usage records include request type, outcome and counts, and a random guest/device identifier is used to apply guest limits.',
          'Authentication and security events (for example failed verification attempts). These records can be linked to an account or request, so they are not anonymous.',
        ]),
      ],
    },
    {
      id: 'purposes',
      title: 'C. Why we use your data and our lawful basis',
      blocks: [
        {
          type: 'table',
          head: ['Purpose', 'Lawful basis (Data Privacy Act, Secs. 12-13)'],
          rows: [
            ['Create and manage your account', 'Necessary for the contract/service you requested'],
            ['Verify your email and protect account access', 'Necessary for the service and our legitimate interest in security'],
            ['Create and keep your vehicle profiles', 'Necessary for the service you requested'],
            ['Process diagnostic requests and return AI assistance', 'Necessary for the service you requested; your explicit submission of the content'],
            ['Keep diagnostic history', 'Necessary for the service; you can ask for deletion'],
            ['Manage maintenance schedules and reminders', 'Necessary for the service you requested'],
            ['Show repair shops and map locations', 'Your request for the feature; device location is used only after you grant operating-system permission'],
            ['Manage subscription access and records', 'Necessary for the contract; legal and accounting obligations where they apply'],
            ['Fix problems, keep the system reliable, prevent abuse', 'Legitimate interest'],
            ['Respond to your requests and meet legal obligations', 'Legal obligation / your request'],
          ],
        },
        p('Agreeing to the Terms and acknowledging this Policy is required to create an account. Marketing or other optional processing is not part of that agreement, and VehiCare does not currently ask for it.'),
      ],
    },
    {
      id: 'ai',
      title: 'D. How AI processes your diagnostic data',
      emphasis: true,
      blocks: [
        note(
          'When you send a diagnostic request, the text you wrote, the images or videos you upload, the vehicle recording you make, and details of the selected vehicle (such as type, brand, model and year) are transmitted from your phone to VehiCare\'s server, then to VehiCare\'s AI service, and from there to the Gemini API provided by Google (or another AI provider VehiCare configures) to generate the answer.',
        ),
        ul([
          'The AI request can include your current question or symptom, recent conversation turns, diagnostic state, relevant recent repair and maintenance history, selected vehicle details, language, your internal account ID and plan entitlements, and the image, video or sound file you submit. Google Gemini processes submitted diagnostic content for VehiCare. Depending on a technical fallback, the Laravel backend may send the same non-audio diagnostic content directly to Gemini. Its own terms govern how it handles content, including any retention, human review or product-improvement use. We have not verified that provider-side retention is disabled, so do not include information you do not want processed this way (for example faces, licence plates or other people\'s data).',
          'Recorded sounds and videos are used to produce the response and are not kept as files by VehiCare after the request finishes. Uploaded diagnostic images are saved on VehiCare\'s public storage disk, and their URLs are saved with diagnostic history. Anyone who obtains a public image URL may be able to access that image; access controls and retention need operator review.',
          'The AI response, severity estimate and recommendations are saved in your history so you can review them. Rejected sound recordings are not saved as diagnoses. Before diagnosis, audio is checked to determine whether it clearly contains an identifiable vehicle sound; speech, music, silence and unrelated or unclear audio are rejected.',
          'VehiCare checks the type and size of media before sending it and shows a notice before you submit diagnostic media.',
        ]),
      ],
    },
    {
      id: 'recipients',
      title: 'E. Who receives data',
      blocks: [
        p('Service providers that process data for VehiCare:'),
        ul([
          'Firebase Authentication (Google): email address, name, sign-in identifiers and authentication events, to sign you in.',
          'VehiCare backend (Laravel) hosted at vehicare-backend-n3v4.onrender.com and its configured database: account, vehicle, maintenance, diagnostic, notification, subscription and consent records. The database provider and hosting/storage regions must be identified by the operator.',
          'VehiCare AI service (Node.js) and the Gemini API (Google): diagnostic content as described in Section D.',
          'Email delivery: your email address and one-time verification code are sent through the email provider configured by the operator to deliver the code. The production provider must be identified.',
        ]),
        p('Independent services that receive data directly from the app or server:'),
        ul([
          'OpenStreetMap Nominatim: coordinates (and your IP address, as with any web request) to look up place names.',
          'Overpass API (OpenStreetMap data): the search area around the selected point, queried by VehiCare\'s server to find repair shops.',
          'Esri/ArcGIS map tile servers: the map area being viewed (tile requests reveal the approximate area and your IP address).',
          'NHTSA vehicle database: vehicle brand/model/year lookups when vehicle data is imported or validated.',
        ]),
        p('We do not sell your personal data. We do not currently use a payment processor.'),
      ],
    },
    {
      id: 'security',
      title: 'F. Where data is stored and how it is protected',
      blocks: [
        p('Where data lives'),
        ul([
          'On the server: account and application records in the backend database; uploaded diagnostic images on the server\'s file storage.',
          'On your phone: your sign-in token and basic account profile, vehicle and maintenance caches, chat drafts, your last selected map location and preferences, saved in the app\'s local storage. Signing out removes account-specific entries; theme and language preferences are kept.',
        ]),
        p('Safeguards in place'),
        ul([
          'The production app connects to VehiCare\'s backend over HTTPS. Local development configurations may differ.',
          'API access to account records requires a signed-in session (Laravel Sanctum token).',
          'Passwords of email accounts are stored only as one-way hashes; verification codes are stored hashed, expire, and are limited in attempts.',
          'Signing out revokes the session token on the server when the server confirms it; if the phone is offline the app tells you the server could not confirm.',
          'The AI service request logs record request metadata, not the submitted media or full symptom text. Logs still include technical identifiers such as IP address and request ID and should be access-controlled.',
        ]),
        note(
          'No system is completely secure. We have not verified that all data is encrypted at rest by the hosting providers. Recommended improvements that are not yet complete include: a retention schedule, restricting diagnostic image access, an in-app deletion tool, and an independent security review.',
        ),
      ],
    },
    {
      id: 'retention',
      title: 'G. How long we keep data and how to delete it',
      blocks: [
        p(
          'Specific retention periods have NOT yet been defined for VehiCare and are an implementation requirement to be confirmed by the responsible organization before production release. Until they are set:',
        ),
        ul([
          'Account, vehicle, maintenance and diagnostic records are stored while your account is active; no automatic deletion schedule is implemented.',
          'Sound and video recordings are not retained as files after processing. Diagnostic images remain on public server storage with their diagnostic record; no user-facing deletion or published retention period is implemented.',
          'Security and error logs are retained according to hosting and operator settings; a defined period has not been found in the implementation.',
          'Payment records may need to be kept longer for accounting or legal reasons; a specific period is not defined.',
        ]),
        p(
          'Deleting your account: there is no in-app delete button yet. Send an account-closure request to the privacy contact. When an account is closed, its profile, vehicles, maintenance records and diagnostic history are intended to be deleted or irreversibly de-identified, except records we must keep by law or need to establish or defend legal claims. Data may remain for a limited time in backups and in third-party systems (such as Google) under their own policies; we cannot promise immediate removal from those.',
        ),
      ],
    },
    {
      id: 'rights',
      title: 'H. Your rights under the Data Privacy Act',
      blocks: [
        ul([
          'To be informed about how your data is processed (this Policy).',
          'To access your personal data.',
          'To correct inaccurate or outdated data (contact the privacy contact or use the account, profile and vehicle edit controls available in the app).',
          'To object to processing in the situations the law allows.',
          'To request erasure or blocking where the law allows it.',
          'To data portability where it applies.',
          'To withdraw consent for processing that relies on consent (for example, revoke location permission in your Android or iOS settings). Withdrawal does not affect processing that relies on another lawful basis and does not require us to delete records we must keep by law.',
          'To lodge a complaint with the National Privacy Commission (privacy.gov.ph).',
          'To claim compensation for damages where provided by law.',
        ]),
        p('These rights are subject to the conditions and limits set by law. To exercise them, contact the privacy contact in Section A.'),
      ],
    },
    {
      id: 'incidents',
      title: 'I. Data breaches',
      blocks: [
        p(
          'We cannot promise that a breach will never happen. If a personal-data incident occurs, the responsible organization will detect and assess it, contain it, investigate the cause and the data affected, and decide whether the National Privacy Commission and the affected users must be notified within the periods required by law, then notify them accordingly.',
        ),
      ],
    },
    {
      id: 'children',
      title: 'J. Children and minors',
      blocks: [
        p(
          'The operator has not established VehiCare\'s intended audience, minimum age or parental-consent process, and the app has no age gate. These must be decided before production release. A parent or guardian who believes a child has provided data should contact the privacy contact in Section A.',
        ),
      ],
    },
    {
      id: 'updates',
      title: 'K. Changes to this Policy',
      blocks: [
        p(
          'This is version ' +
            LEGAL_VERSIONS.privacy +
            ', effective ' +
            LEGAL_VERSIONS.effectiveDate +
            '. If we make material changes we will publish a new version number and date, tell you in the app, and ask you to review and accept the new version where the law or the change requires. VehiCare records the document versions you accepted and when.',
        ),
      ],
    },
  ],
};

export const getLegalDocument = type =>
  type === 'privacy' ? PRIVACY_DOCUMENT : TERMS_DOCUMENT;
