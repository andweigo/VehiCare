/**
 * VehiCare Helpful Resources & Knowledge Base Data
 * 
 * Accurately represents the implemented VehiCare features:
 * - Multi-Vehicle Garage (Cars, Motorcycles, Bicycles)
 * - Multimodal AI Diagnostics (Text symptoms, Camera photos, Audio recording, Video)
 * - Maintenance Schedules & Smart Recommendations
 * - Repair History & Nearby Repair Shop finder
 * - Free vs. Premium tiers & Guest Mode limits
 */

export const RESOURCE_CATEGORIES = [
  { key: 'all', title: 'All Guides', icon: 'apps' },
  { key: 'getting_started', title: 'Getting Started', icon: 'rocket-launch' },
  { key: 'ai_diagnostics', title: 'AI Diagnosis', icon: 'health-and-safety' },
  { key: 'maintenance', title: 'Maintenance & Repairs', icon: 'build' },
  { key: 'account_subscription', title: 'Account & Plans', icon: 'person' },
];

export const HELP_RESOURCES = [
  // ==========================================
  // SECTION A: GETTING STARTED
  // ==========================================
  {
    id: 'getting_started_overview',
    category: 'getting_started',
    categoryTitle: 'Getting Started',
    title: 'Getting Started with VehiCare',
    summary: 'A complete overview of how VehiCare works, from setting up your first vehicle to accessing smart maintenance tools.',
    readTime: '3 min read',
    icon: 'rocket-launch',
    actionScreen: 'Dashboard',
    actionLabel: 'Go to Dashboard',
    sections: [
      {
        heading: 'Welcome to VehiCare',
        text: 'VehiCare is an intelligent multi-vehicle diagnostics and repair assistance system engineered for cars, motorcycles, and bicycles. It blends intelligent symptom analysis with practical maintenance management so you can keep your vehicle safe, reliable, and cost-efficient.',
      },
      {
        heading: 'First Steps Checklist',
        bullets: [
          'Add your vehicle profile (Car, Motorcycle, or Bicycle) with year, brand, and model.',
          'Review your vehicle status on the Dashboard home screen.',
          'Explore Ask VehiCare to test an AI diagnosis when symptoms arise.',
          'Set up maintenance reminders in the Maintenance section to stay ahead of scheduled service.',
        ],
      },
      {
        heading: 'Accessing Main Sections',
        text: 'The sidebar drawer gives you immediate access to all core sections: Home Dashboard, My Garage, Notifications, Diagnose a Problem, Maintenance, History, Repair Shops, and Account Settings.',
        tip: 'Tap the menu icon in the top header anytime to open the navigation drawer.',
      },
    ],
  },
  {
    id: 'add_vehicle_guide',
    category: 'getting_started',
    categoryTitle: 'Getting Started',
    title: 'Adding & Selecting Vehicles (Cars, Bikes, Bicycles)',
    summary: 'Learn how to set up your garage, add custom makes, and switch between registered vehicles.',
    readTime: '4 min read',
    icon: 'directions-car',
    actionScreen: 'Vehicles',
    actionLabel: 'Open My Garage',
    sections: [
      {
        heading: 'Supported Vehicle Types',
        text: 'VehiCare supports three primary vehicle categories with tailored diagnostics for each:',
        bullets: [
          'Cars & Passenger Vehicles: Sedans, SUVs, Hatchbacks, Pickups, Vans.',
          'Motorcycles & Scooters: Underbones, Automatic Scooters, Cruisers, Big Bikes.',
          'Bicycles: Mountain Bikes (MTB), Road Bikes, Commuter, and City Bicycles.',
        ],
      },
      {
        heading: 'Adding a Vehicle to Your Garage',
        bullets: [
          'Navigate to My Garage from the sidebar or tap the vehicle card on the Dashboard.',
          'Tap Add Vehicle to begin the step-by-step setup.',
          'Step 1: Choose your vehicle category (Car, Motorcycle, or Bicycle).',
          'Step 2: Search and select the Brand, Model, and Year from the database.',
          'Optional: If your specific make or custom build is not listed, tap "Vehicle not found? Enter custom details" to manually enter brand and model name.',
          'Confirm and save to link the vehicle to your active profile.',
        ],
      },
      {
        heading: 'Vehicle Limits & Switching',
        text: 'Free accounts are configured for 1 registered vehicle. Upgrading to Premium expands your garage capacity up to 5 vehicles and allows seamless one-tap switching between profiles.',
        tip: 'Whichever vehicle is currently set as "Active" is automatically used as the default subject for new AI consultations.',
      },
    ],
  },
  {
    id: 'dashboard_navigation',
    category: 'getting_started',
    categoryTitle: 'Getting Started',
    title: 'Navigating Your Dashboard & Core Features',
    summary: 'Understand the Dashboard vehicle card, health overview, quick action tiles, and recent activity feed.',
    readTime: '3 min read',
    icon: 'dashboard',
    actionScreen: 'Dashboard',
    actionLabel: 'View Dashboard',
    sections: [
      {
        heading: 'The Dashboard Layout',
        text: 'The Dashboard is your vehicle command center, designed to surface the most relevant information at a glance.',
      },
      {
        heading: 'Key Elements on the Dashboard',
        bullets: [
          'Vehicle Profile Card: Displays your active vehicle name, model year, and type. Tapping this card opens the Vehicle Setup details modal.',
          'Ask VehiCare Action Banner: Instant shortcut to start an AI diagnosis with symptoms, audio, or photos.',
          'Action Cards: Quick access to Keep It Maintained, Nearby Repair Shops, Diagnosis consultation, and Smart Recommendations.',
          'Vehicle Health Status: Visual summary of recent diagnostic severity and health indicators.',
          'Recent Activity Feed: Tracks your latest maintenance logs, diagnoses, and completed services.',
        ],
      },
    ],
  },
  {
    id: 'guest_vs_account',
    category: 'getting_started',
    categoryTitle: 'Getting Started',
    title: 'Guest Mode vs. Registered Accounts',
    summary: 'Compare guest access features, understand the 5-diagnosis limit, and see how guest vehicles transfer upon registration.',
    readTime: '3 min read',
    icon: 'verified-user',
    actionScreen: 'Register',
    actionLabel: 'Create Account',
    sections: [
      {
        heading: 'Guest Access Capabilities',
        text: 'You can explore VehiCare without creating an account immediately. Guest mode allows you to:',
        bullets: [
          'Configure a temporary vehicle profile stored locally on your device.',
          'Perform up to 5 AI diagnoses to test symptom analysis.',
          'Browse basic maintenance recommendations.',
        ],
      },
      {
        heading: 'Why Register an Account?',
        text: 'Creating an account unlocks persistent cloud synchronization, history backups, and security:',
        bullets: [
          'No 5-diagnosis cap (Free plan includes continuous access within monthly allowance).',
          'Cloud garage sync: Your vehicle profile is saved safely to the backend MySQL database.',
          'Persistent history: Diagnosis transcripts and service logs survive app re-installs and device upgrades.',
          'Personalized notifications and maintenance reminder alerts.',
        ],
      },
      {
        heading: 'Seamless Vehicle Transfer',
        text: 'When you decide to register from guest mode, your existing guest vehicle is automatically claimed and attached to your new authenticated account during registration—you never lose your configured vehicle.',
        tip: 'To claim your guest vehicle, simply tap "Sign in / Register" and complete registration.',
      },
    ],
  },

  // ==========================================
  // SECTION B: AI VEHICLE DIAGNOSIS
  // ==========================================
  {
    id: 'start_diagnosis_guide',
    category: 'ai_diagnostics',
    categoryTitle: 'AI Diagnosis',
    title: 'How to Start an AI Diagnosis',
    summary: 'Step-by-step instructions for launching an AI diagnostic consultation in Ask VehiCare.',
    readTime: '4 min read',
    icon: 'medical-services',
    actionScreen: 'AskVehiCare',
    actionLabel: 'Start AI Diagnosis',
    sections: [
      {
        heading: 'Starting a Consultation',
        bullets: [
          'Open Ask VehiCare from the Dashboard action tile or the sidebar menu ("Diagnose a Problem").',
          'VehiCare automatically links the consultation to your current active vehicle profile.',
          'Type a detailed description of what you are experiencing in the text input box.',
          'Optionally attach a clear photo, recorded audio clip, or video demonstrating the issue.',
          'Tap Send to transmit your query to VehiCare AI for analysis.',
        ],
      },
      {
        heading: 'Scope Protection',
        text: 'VehiCare is strictly focused on vehicle diagnostics, repairs, and maintenance for cars, motorcycles, and bicycles. Unrelated inquiries (e.g., general trivia, cooking, math equations) are automatically declined so the system remains dedicated to vehicle safety.',
      },
    ],
  },
  {
    id: 'describe_symptoms_guide',
    category: 'ai_diagnostics',
    categoryTitle: 'AI Diagnosis',
    title: 'Describing Symptoms Clearly for Accurate Results',
    summary: 'Tips on conveying sounds, vibrations, leaks, warning indicators, and conditions for the best AI accuracy.',
    readTime: '4 min read',
    icon: 'edit-note',
    actionScreen: 'AskVehiCare',
    actionLabel: 'Try in Ask VehiCare',
    sections: [
      {
        heading: 'The Power of Specific Symptoms',
        text: 'The accuracy of any diagnosis depends heavily on the specificity of your observations. Rather than stating "car won\'t start", provide context about what happens when you turn the key.',
      },
      {
        heading: 'What to Include in Your Description',
        bullets: [
          'Sound: Squealing, grinding, clicking, knocking, hissing, or humming.',
          'Timing & Condition: Does it happen when braking, accelerating, turning left/right, cold starting in the morning, or idling at a red light?',
          'Physical Sensations: Steering wheel vibration, spongy brake pedal, sluggish acceleration, or pulling to one side.',
          'Visual Cues: Dashboard warning lights (Check Engine, ABS, Oil Pressure), smoke color (blue, black, white), fluid leaks (red transmission fluid, green/orange coolant, brown oil).',
          'Smell: Sweet coolant smell, burnt rubber, raw gasoline, or rotten egg/sulfur exhaust smell.',
        ],
        tip: 'Mentioning recent repairs or recent adverse road conditions (e.g., hitting a deep pothole, flood driving) gives the AI valuable diagnostic clues.',
      },
    ],
  },
  {
    id: 'capturing_media_guide',
    category: 'ai_diagnostics',
    categoryTitle: 'AI Diagnosis',
    title: 'Capturing Useful Photos, Audio & Video',
    summary: 'Guidelines for taking sharp component photos, recording engine sounds, and capturing informative video clips.',
    readTime: '3 min read',
    icon: 'camera-alt',
    actionScreen: 'AskVehiCare',
    actionLabel: 'Open Ask VehiCare',
    sections: [
      {
        heading: 'Photos',
        bullets: [
          'Lighting: Ensure the area under the hood or chassis is well-lit using a flashlight or daylight.',
          'Focus: Focus directly on the suspect part (e.g., worn brake pads, fluid leak origin, tire tread wear, cracked belt).',
          'Scale: Take one wider shot showing location and one close-up shot showing detail.',
        ],
      },
      {
        heading: 'Audio Recording',
        bullets: [
          'Use the in-app microphone button to record abnormal engine or chassis sounds.',
          'Hold the phone a safe distance (1 to 2 feet) from moving parts (never place near fan blades or exhaust headers).',
          'Record 5 to 10 seconds of consistent sound while the vehicle reproduces the symptom.',
        ],
        warning: 'Always prioritize your physical safety. Never hold a phone near running belts, pulleys, hot exhausts, or while driving.',
      },
      {
        heading: 'Video Clips',
        bullets: [
          'Video is best for intermittent vibrations, visible engine shake, fluid dripping, or smoke coming from the tailpipe.',
          'Keep clips under 30 seconds for quick upload and responsive AI processing.',
        ],
      },
    ],
  },
  {
    id: 'interpret_results_guide',
    category: 'ai_diagnostics',
    categoryTitle: 'AI Diagnosis',
    title: 'Interpreting Diagnosis Results, Severity & Recommendations',
    summary: 'How to read possible causes, severity badges (Low, Medium, High), repair advice, and cost ranges.',
    readTime: '4 min read',
    icon: 'insights',
    actionScreen: 'History',
    actionLabel: 'View Diagnosis History',
    sections: [
      {
        heading: 'Understanding the Diagnosis Report',
        text: 'When VehiCare completes an analysis, it returns a structured diagnostic report with clear sections:',
        bullets: [
          'Probable Causes: The top potential root causes ranked by likelihood based on your symptoms.',
          'Severity Level: An urgent indicator categorizing risk into Low, Medium, or High.',
          'Repair Recommendations: Step-by-step troubleshooting suggestions and suggested repairs.',
          'Estimated Cost Range: Indicative parts and labor estimates based on standard repair data.',
          'Action Guidance: DIY feasibility versus recommendations to seek a certified mechanic.',
        ],
      },
      {
        heading: 'Severity Breakdown',
        bullets: [
          'Low Severity: Minor cosmetic or convenience issues (e.g., noisy wiper blades, cabin air filter replacement, low washer fluid). Safe to operate normally.',
          'Medium Severity: Issues that need prompt attention to avoid worsening damage or reduced fuel economy (e.g., failing alternator, worn spark plugs, degraded brake pads, leaking shock absorber).',
          'High Severity: Safety-critical hazards that can cause accidents or catastrophic engine breakdown (e.g., complete brake failure, severe overheating, low oil pressure, loss of power steering). Stop driving safely.',
        ],
        warning: 'AI diagnostic suggestions are advisory and informational. If a diagnosis indicates High Severity, do not continue driving the vehicle.',
      },
    ],
  },
  {
    id: 'troubleshoot_diagnosis_guide',
    category: 'ai_diagnostics',
    categoryTitle: 'AI Diagnosis',
    title: 'What to Do When AI Diagnosis Fails or Times Out',
    summary: 'Troubleshooting steps for network timeouts, service errors, and out-of-scope question rejections.',
    readTime: '3 min read',
    icon: 'wifi-off',
    actionScreen: 'AskVehiCare',
    actionLabel: 'Go to Ask VehiCare',
    sections: [
      {
        heading: 'Common Failure Scenarios & Solutions',
        bullets: [
          'Network Connection Timeout: If your internet connection drops during media upload, verify your Wi-Fi or cellular data, tap retry, or send a shorter video/smaller photo.',
          'Service Unavailable / Rate Limit: High demand on AI servers can cause temporary delays. Wait 30 seconds and resend your symptom query.',
          'Out-of-Scope Warning: If the AI responds that the query is unrelated, ensure your message mentions your car, motorcycle, or bicycle and vehicle components.',
          'Guest Limit Reached: Guests are limited to 5 diagnoses. Sign in or register a free account to continue diagnostics.',
        ],
      },
      {
        heading: 'Still Stuck?',
        text: 'You can submit a ticket in "Report a Problem" or reach out through "Send Feedback" under Settings.',
      },
    ],
  },

  // ==========================================
  // SECTION C: MAINTENANCE & REPAIR GUIDANCE
  // ==========================================
  {
    id: 'maintenance_schedules_guide',
    category: 'maintenance',
    categoryTitle: 'Maintenance & Repairs',
    title: 'Using Maintenance Reminders & Service Schedules',
    summary: 'How to track routine servicing, view upcoming checklist items, and mark maintenance tasks as completed.',
    readTime: '3 min read',
    icon: 'schedule',
    actionScreen: 'Maintenance',
    actionLabel: 'Open Maintenance',
    sections: [
      {
        heading: 'Routine Maintenance Management',
        text: 'Proactive maintenance prevents up to 80% of unexpected breakdowns. VehiCare organizes maintenance tasks into categories like Engine & Oil, Brakes & Tires, Electrical, Fluids, and Suspension.',
      },
      {
        heading: 'How to Use Maintenance Features',
        bullets: [
          'Navigate to Maintenance from the bottom tabs or sidebar drawer.',
          'Browse tasks categorized by priority and service interval.',
          'Tap any task (e.g., "Engine Oil & Filter Change", "Brake Pad Inspection") to view the step-by-step DIY guide or service specifications.',
          'When the service has been performed, tap "Mark as Done" to log the completion date and update your vehicle health score.',
        ],
      },
      {
        heading: 'Smart Recommendations',
        text: 'VehiCare analyzes your vehicle age, model, and diagnostic history to generate tailored Smart Recommendations in the Smart Recommendations tab.',
      },
    ],
  },
  {
    id: 'review_history_guide',
    category: 'maintenance',
    categoryTitle: 'Maintenance & Repairs',
    title: 'Reviewing Diagnostic & Maintenance History',
    summary: 'Access past consultations, track recurring problems, and present service history to your mechanic.',
    readTime: '3 min read',
    icon: 'history',
    actionScreen: 'History',
    actionLabel: 'View History',
    sections: [
      {
        heading: 'The Importance of Service Records',
        text: 'Maintaining a clean record of past symptoms and maintenance gives mechanics the full context of your vehicle and helps preserve vehicle resale value.',
      },
      {
        heading: 'Browsing Your History',
        bullets: [
          'Tap History in the sidebar drawer or Recent Activities on the Dashboard.',
          'Switch between Diagnostic Consultations and Completed Maintenance logs.',
          'Tap any past diagnostic session to re-read the AI analysis, severity ratings, and recommended repairs.',
          'Completed maintenance logs show timestamps of when services were completed.',
        ],
      },
    ],
  },
  {
    id: 'repair_costs_guide',
    category: 'maintenance',
    categoryTitle: 'Maintenance & Repairs',
    title: 'Understanding Estimated Repair Costs',
    summary: 'How parts and labor cost ranges are determined and how to budget for vehicle repairs.',
    readTime: '3 min read',
    icon: 'payments',
    actionScreen: 'RepairShops',
    actionLabel: 'Find Repair Shops',
    sections: [
      {
        heading: 'How Cost Estimates Are Calculated',
        text: 'VehiCare calculates indicative repair costs by analyzing historical repair data, standard labor hour benchmarks for your vehicle make and model, and typical aftermarket vs. OEM parts pricing.',
      },
      {
        heading: 'Factors Influencing Actual Pricing',
        bullets: [
          'Shop Type: Independent repair shops generally charge lower hourly labor rates than franchised dealership service centers.',
          'Parts Selection: Original Equipment Manufacturer (OEM) parts are pricier but maintain exact manufacturer specs; reputable aftermarket parts offer savings.',
          'Secondary Damage: Unaddressed issues (e.g., driving with worn brake pads until the rotors groove) increase total parts and labor costs.',
          'Location: Regional labor rates vary between metropolitan and rural areas.',
        ],
        tip: 'Always ask your repair shop for a written estimate before authorizing major repairs.',
      },
    ],
  },
  {
    id: 'professional_mechanic_guide',
    category: 'maintenance',
    categoryTitle: 'Maintenance & Repairs',
    title: 'When to Seek Professional Assistance vs. DIY',
    summary: 'Clear guidelines on when a vehicle repair is safe to attempt yourself and when a certified mechanic is required.',
    readTime: '4 min read',
    icon: 'storefront',
    actionScreen: 'RepairShops',
    actionLabel: 'Browse Repair Shops',
    sections: [
      {
        heading: 'Safe DIY Tasks',
        bullets: [
          'Replacing cabin and engine air filters.',
          'Topping up windshield washer fluid, coolant overflow reservoir (when cold).',
          'Inspecting tire pressure, tread depth, and basic bicycle chain lubrication.',
          'Wiper blade replacements and battery terminal cleaning.',
        ],
      },
      {
        heading: 'When Professional Service Is Mandatory',
        bullets: [
          'Brake Hydraulics: ABS pump failure, master cylinder replacement, or brake line leaks.',
          'Steering & Suspension: Ball joint replacement, tie rod ends, or power steering rack failure.',
          'Internal Engine & Transmission: Timing belt/chain service, head gasket repairs, transmission slipping.',
          'High Voltage Systems: Hybrid or Electric Vehicle battery pack, inverter, or wiring.',
          'Fuel Systems: High pressure fuel rail leaks or fuel pump replacements.',
        ],
        warning: 'Never attempt repairs beneath a vehicle supported only by a portable scissor jack. Always use certified jack stands on a level concrete surface.',
      },
      {
        heading: 'Finding Nearby Repair Shops',
        text: 'Tap "Repair Shops" in the sidebar drawer to discover nearby mechanics, auto repair centers, motorcycle service centers, and bike shops with direct directions.',
      },
    ],
  },

  // ==========================================
  // SECTION D: ACCOUNT & SUBSCRIPTION HELP
  // ==========================================
  {
    id: 'account_registration_guide',
    category: 'account_subscription',
    categoryTitle: 'Account & Plans',
    title: 'Account Registration, Sign-In & Security',
    summary: 'How to register with Email/Password or Google, keep credentials safe, and manage personal information.',
    readTime: '3 min read',
    icon: 'lock',
    actionScreen: 'Profile',
    actionLabel: 'View Profile',
    sections: [
      {
        heading: 'Supported Authentication Methods',
        bullets: [
          'Email & Password: Enter your name, email, and choose a strong password (minimum 8 characters, letters, numbers, and symbols).',
          'Continue with Google: Instant, one-tap sign-in powered by Firebase Google Authentication.',
        ],
      },
      {
        heading: 'Managing Your Profile',
        bullets: [
          'Open Profile from the sidebar drawer to update your display name or profile picture.',
          'Change Password securely in the Password & Security section.',
          'Review your current subscription tier and vehicle capacity.',
        ],
      },
    ],
  },
  {
    id: 'recover_account_guide',
    category: 'account_subscription',
    categoryTitle: 'Account & Plans',
    title: 'Recovering Access to Your Account',
    summary: 'What to do if you forgot your password or cannot access your registered VehiCare account.',
    readTime: '3 min read',
    icon: 'lock-reset',
    actionScreen: 'ForgotPassword',
    actionLabel: 'Reset Password',
    sections: [
      {
        heading: 'Password Reset Procedure',
        bullets: [
          'On the Sign In screen, tap "Forgot Password?".',
          'Enter your registered email address and submit.',
          'Check your inbox for a password reset email or verification code.',
          'Enter the verification code and set your new password.',
          'Sign in with your new credentials.',
        ],
        tip: 'If you do not see the reset email within 2 minutes, check your spam or promotions folder.',
      },
      {
        heading: 'Google Account Users',
        text: 'If you created your account with Google Sign-In, tap "Continue with Google" on the Sign In screen. Your credentials are authenticated directly through your Google account.',
      },
    ],
  },
  {
    id: 'subscription_limits_guide',
    category: 'account_subscription',
    categoryTitle: 'Account & Plans',
    title: 'Free vs. Premium Plans & Vehicle Limits',
    summary: 'Understand plan differences, vehicle slot quotas, and how subscription upgrades work.',
    readTime: '3 min read',
    icon: 'workspace-premium',
    actionScreen: 'ManagePlan',
    actionLabel: 'View Subscription Plan',
    sections: [
      {
        heading: 'Plan Comparison',
        bullets: [
          'Guest Access: 1 temporary local vehicle, limit of 5 AI diagnoses, local-only storage.',
          'Free Plan: 1 registered vehicle in cloud garage, continuous access to AI diagnostics, maintenance reminders, and history logging.',
          'Premium Plan: Up to 5 vehicles in cloud garage, multi-vehicle switching, priority diagnostic queue, and advanced repair cost insights.',
        ],
      },
      {
        heading: 'Managing Your Plan',
        text: 'Tap "Manage Plan" under Profile to check your current subscription status, vehicle quota, and available plan options.',
      },
    ],
  },
  {
    id: 'sign_out_safely_guide',
    category: 'account_subscription',
    categoryTitle: 'Account & Plans',
    title: 'Signing Out Safely & Device Security',
    summary: 'How to sign out of VehiCare, safeguard credentials, and switch accounts without data loss.',
    readTime: '2 min read',
    icon: 'logout',
    actionScreen: 'Settings',
    actionLabel: 'Open Settings',
    sections: [
      {
        heading: 'How to Sign Out',
        bullets: [
          'Open the sidebar drawer.',
          'Scroll to the bottom and tap "Sign Out".',
          'Confirm in the confirmation dialog.',
        ],
      },
      {
        heading: 'What Happens Upon Sign Out',
        text: 'Your authentication token is securely wiped from local storage. Your vehicle records, diagnostic history, and maintenance schedules remain safe in your cloud account and will reload immediately when you sign back in.',
      },
    ],
  },
];
