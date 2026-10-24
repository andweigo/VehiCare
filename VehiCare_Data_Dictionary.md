# VehiCare Capstone Data Dictionary (Sequential Ordering Table 2.1 to Table 2.22)

## PART A: CORE APPLICATION ENTITIES

### Table 2.1: Data Dictionary of Users
| Field Name | Data Description | Data Type | Field Length | Constraint | Possible Values |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **id** | Unique internal identifier for the user | BigInt | 20 | Primary Key | Auto-increment (e.g., 3) |
| **firebaseUid** | Unique identifier from Firebase Authentication | String | 255 | Unique / Nullable | MZ4tEZgyGgM9wziHDiQbsAJqkDL2 |
| **googleId** | OAuth unique identifier for Google Sign-In | String | 255 | Unique / Nullable | 1083920194829104 |
| **name** | Full legal or display name of the user | String | 255 | Not Null | User User |
| **email** | Registered email address of the user | String | 255 | Unique / Not Null | user@gmail.com |
| **password** | Encrypted account login password | String | 255 | Not Null | Hashed string |
| **phoneNumber** | Mobile contact number of the user | String | 20 | Nullable | +639123456789 |
| **avatar** | Public storage URL to user's profile image | String | 255 | Nullable | Image URL string |
| **role** | System access control permission role | String | 20 | Not Null | user, admin |
| **subscriptionPlan** | Active membership tier | String | 20 | Not Null | free, premium |
| **subscriptionStatus** | Current subscription activation state | String | 20 | Not Null | active, expired, none |
| **subscriptionCycle** | Billing recurrence frequency | String | 20 | Nullable | monthly, yearly |
| **subscriptionExpiresAt**| Timestamp when premium privileges expire | Timestamp | N/A | Nullable | Date/Time |
| **vehicleLimit** | Maximum allowed garage vehicles | SmallInt | 5 | Not Null | 1 (free), 5 (premium) |
| **activeVehicleId** | Foreign key to currently active vehicle | BigInt | 20 | Foreign Key / Nullable | References Vehicles(id) |
| **createdAt** | Timestamp when account was created | Timestamp | N/A | Not Null | Date/Time |

---

### Table 2.2: Data Dictionary of Vehicles
| Field Name | Data Description | Data Type | Field Length | Constraint | Possible Values |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **id** | Unique identifier for the vehicle | BigInt | 20 | Primary Key | Auto-increment (e.g., 12) |
| **userId** | Foreign key linking to owner user account | BigInt | 20 | Foreign Key / Not Null | References Users(id) |
| **vehicleTypeId** | Foreign key linking to vehicle classification | BigInt | 20 | Foreign Key / Nullable | References VehicleTypes(id) |
| **vehicleBrandId** | Foreign key linking to manufacturer brand | BigInt | 20 | Foreign Key / Nullable | References VehicleBrands(id) |
| **vehicleModelId** | Foreign key linking to vehicle model | BigInt | 20 | Foreign Key / Nullable | References VehicleModels(id) |
| **vehicleYearId** | Foreign key linking to production year | BigInt | 20 | Foreign Key / Nullable | References VehicleYears(id) |
| **type** | Fallback category string | String | 50 | Not Null | Motorcycle, Car, Bicycle |
| **brand** | Fallback brand name string | String | 100 | Not Null | Yamaha, Honda, Specialized |
| **model** | Fallback model name string | String | 100 | Not Null | Sniper 150, Civic, Rockhopper |
| **year** | Model manufacturing year | Integer | 4 | Not Null | 2017, 2021, 2025 |
| **modelNumber** | Engine trim or specific variant number | String | 100 | Nullable | YZF-R15, 2.0 Turbo |
| **archivedAt** | Timestamp for soft deletion / garage removal | Timestamp | N/A | Nullable | Date/Time, null |
| **createdAt** | Timestamp when vehicle was registered | Timestamp | N/A | Not Null | Date/Time |

---

### Table 2.3: Data Dictionary of Vehicle Correction Requests
| Field Name | Data Description | Data Type | Field Length | Constraint | Possible Values |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **id** | Unique identifier for correction request | BigInt | 20 | Primary Key | Auto-increment (e.g., 3) |
| **userId** | Foreign key linking to requesting user | BigInt | 20 | Foreign Key / Not Null | References Users(id) |
| **vehicleId** | Foreign key linking to target vehicle | BigInt | 20 | Foreign Key / Not Null | References Vehicles(id) |
| **requestedFields** | JSON array of attributes requested to edit | JSON | N/A | Not Null | ["brand", "model", "year"] |
| **currentValues** | JSON snapshot of current specifications | JSON | N/A | Not Null | JSON object |
| **requestedValues** | JSON snapshot of proposed new specifications | JSON | N/A | Not Null | JSON object |
| **reason** | User justification for requested edit | String | 500 | Not Null | Typo in initial registration model |
| **status** | Administrative review status | String | 20 | Not Null | pending, approved, rejected |
| **approvedBy** | Foreign key linking to approving admin | BigInt | 20 | Foreign Key / Nullable | References Users(id) |
| **submittedAt** | Timestamp when request was submitted | Timestamp | N/A | Not Null | Date/Time |
| **approvedAt** | Timestamp when approved by admin | Timestamp | N/A | Nullable | Date/Time, null |

---

### Table 2.4: Data Dictionary of Subscription Payments
| Field Name | Data Description | Data Type | Field Length | Constraint | Possible Values |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **id** | Unique identifier for payment transaction | BigInt | 20 | Primary Key | Auto-increment (e.g., 4) |
| **userId** | Foreign key linking to paying subscriber | BigInt | 20 | Foreign Key / Not Null | References Users(id) |
| **plan** | Subscribed membership tier | String | 255 | Not Null | premium |
| **billingCycle** | Billing recurrence period | String | 255 | Not Null | monthly, yearly |
| **amount** | Payment transaction amount in PHP | Decimal | 10,2 | Not Null | 149.00, 1490.00 |
| **paymentMethod** | Channel used for payment submission | String | 255 | Not Null | gcash, card |
| **referenceNumber** | Transaction reference number | String | 255 | Unique / Not Null | VC-20260913-4597 |
| **status** | Administrative verification status | String | 255 | Not Null | pending, approved, rejected |
| **adminId** | Foreign key linking to verifying admin | BigInt | 20 | Foreign Key / Nullable | References Users(id) |
| **submittedAt** | Timestamp when payment proof was sent | Timestamp | N/A | Nullable | Date/Time |
| **verifiedAt** | Timestamp when payment was approved | Timestamp | N/A | Nullable | Date/Time, null |

---

### Table 2.5: Data Dictionary of AI Usage Logs
| Field Name | Data Description | Data Type | Field Length | Constraint | Possible Values |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **id** | Unique identifier for usage log | BigInt | 20 | Primary Key | Auto-increment (e.g., 1) |
| **userId** | Foreign key linking to user | BigInt | 20 | Foreign Key / Nullable | References Users(id) |
| **guestUuid** | Identifier for anonymous guest session | String | 255 | Nullable | UUID string |
| **requestKey** | Idempotency hash ensuring single charge | String | 64 | Unique / Nullable | SHA-256 hash string |
| **payloadHash** | Hash of inputs preventing duplicate calls | String | 64 | Nullable | SHA-256 hash string |
| **plan** | Membership plan active during consultation | String | 20 | Not Null | guest, free, premium |
| **inputType** | Modality submitted for analysis | String | 20 | Not Null | text, image, voice, video |
| **mediaSizeBytes** | Size of media upload in bytes | BigInt | 20 | Nullable | 1048576 (1 MB) |
| **videoDurationSeconds**| Video duration in seconds | Integer | 10 | Nullable | 15, 30 |
| **status** | Final execution state of AI pipeline | String | 20 | Not Null | pending, success, failed |
| **createdAt** | Timestamp when usage was recorded | Timestamp | N/A | Not Null | Date/Time |

---

### Table 2.6: Data Dictionary of Diagnostics
| Field Name | Data Description | Data Type | Field Length | Constraint | Possible Values |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **id** | Unique identifier for diagnostic report | BigInt | 20 | Primary Key | Auto-increment (e.g., 48) |
| **userId** | Foreign key linking to requesting user | BigInt | 20 | Foreign Key / Nullable | References Users(id) |
| **vehicleId** | Foreign key linking to diagnosed vehicle | BigInt | 20 | Foreign Key / Nullable | References Vehicles(id) |
| **requestKey** | Unique idempotency request key | String | 64 | Unique / Nullable | SHA-256 hash string |
| **inputType** | Input modality used for diagnosis | String | 20 | Not Null | text, image, voice, video |
| **planTier** | Membership tier active during diagnosis | String | 20 | Not Null | free, premium |
| **symptoms** | User description of vehicle behavior | Text | N/A | Not Null | Rear brake making squeaking sound |
| **summary** | AI-generated diagnosis summary overview | Text | N/A | Not Null | Worn rear brake pads friction material |
| **confidence** | Confidence score percentage | Integer | 3 | Not Null | 85, 90, 95 |
| **severity** | Mechanical danger classification | String | 20 | Not Null | LOW, MODERATE, HIGH, CRITICAL |
| **urgency** | Recommended service timeframe | String | 255 | Not Null | Immediate inspection needed |
| **possibleCauses** | JSON list of probable root causes | JSON | N/A | Nullable | JSON array |
| **recommendedActions** | JSON list of step-by-step repair guidance | JSON | N/A | Nullable | JSON array |
| **maintenanceTasks** | Extracted preventive inspection items | JSON | N/A | Nullable | JSON array |
| **estimatedCostMin** | Minimum estimated repair cost in PHP | Decimal | 10,2 | Not Null | 400.00 |
| **estimatedCostMax** | Maximum estimated repair cost in PHP | Decimal | 10,2 | Not Null | 2500.00 |
| **currency** | Currency designation | String | 10 | Not Null | PHP |
| **createdAt** | Timestamp when diagnosis was generated | Timestamp | N/A | Not Null | Date/Time |

---

### Table 2.7: Data Dictionary of Chat Sessions
| Field Name | Data Description | Data Type | Field Length | Constraint | Possible Values |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **id** | Unique string identifier for session | String | 191 | Primary Key | session_1787658538211_ij9is |
| **userId** | Foreign key linking to user | BigInt | 20 | Foreign Key / Not Null | References Users(id) |
| **vehicleId** | Foreign key linking to vehicle context | BigInt | 20 | Foreign Key / Nullable | References Vehicles(id) |
| **title** | Topic title for AI consultation | String | 255 | Not Null | Rear brake noise consultation |
| **type** | Context classification | String | 50 | Not Null | general, diagnostic_followup |
| **status** | Active state of conversation | String | 20 | Not Null | active, completed |
| **createdAt** | Timestamp when session started | Timestamp | N/A | Not Null | Date/Time |

---

### Table 2.8: Data Dictionary of Chat Messages
| Field Name | Data Description | Data Type | Field Length | Constraint | Possible Values |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **id** | Unique identifier for individual message | BigInt | 20 | Primary Key | Auto-increment (e.g., 105) |
| **chatSessionId** | Foreign key linking to parent chat session | String | 191 | Foreign Key / Not Null | References ChatSessions(id) |
| **role** | Functional role of message author | String | 20 | Not Null | user, assistant |
| **sender** | Display name of message author | String | 255 | Not Null | user, assistant |
| **text** | Full content text of message | Text | N/A | Not Null | Why is my brake squeaking? |
| **metadata** | JSON payload storing token data or refs | JSON | N/A | Nullable | JSON object |
| **createdAt** | Timestamp when message was sent | Timestamp | N/A | Not Null | Date/Time |

---

### Table 2.9: Data Dictionary of Maintenance Records
| Field Name | Data Description | Data Type | Field Length | Constraint | Possible Values |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **id** | Unique identifier for maintenance log | BigInt | 20 | Primary Key | Auto-increment (e.g., 1) |
| **userId** | Foreign key linking to vehicle owner | BigInt | 20 | Foreign Key / Not Null | References Users(id) |
| **vehicleId** | Foreign key linking to maintained vehicle | BigInt | 20 | Foreign Key / Not Null | References Vehicles(id) |
| **diagnosticId** | Foreign key to originating diagnosis | BigInt | 20 | Foreign Key / Nullable | References Diagnostics(id) |
| **title** | Title summary of service performed | String | 255 | Not Null | Engine Oil Change & Tune-up |
| **serviceType** | Category of maintenance service | String | 255 | Not Null | Oil Change, Brake Service |
| **isInspection** | Flag indicating an AI-generated check item | Boolean | 1 | Not Null | true, false |
| **urgency** | Urgency ranking from diagnostic engine | String | 30 | Nullable | Routine, High, Immediate |
| **status** | Service task execution state | String | 30 | Not Null | pending, completed |
| **dueDate** | Calculated deadline for preventive task | Timestamp | N/A | Nullable | Date/Time |
| **performedAt** | Timestamp when service was executed | Timestamp | N/A | Nullable | Date/Time |
| **cost** | Actual service cost in PHP | Decimal | 10,2 | Not Null | 1200.00 |
| **odometer** | Vehicle odometer reading at service | Integer | 10 | Nullable | 45000 |
| **notes** | Mechanic notes or task metadata | Text | N/A | Nullable | Replaced filter and gasket |

---

### Table 2.10: Data Dictionary of Repair Shops
| Field Name | Data Description | Data Type | Field Length | Constraint | Possible Values |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **id** | Unique identifier for repair shop | BigInt | 20 | Primary Key | Auto-increment (e.g., 5) |
| **name** | Commercial trade name of garage | String | 255 | Not Null | SpeedTech Motors & Repair |
| **category** | Vehicle categories serviced | String | 50 | Not Null | car, motorcycle, bicycle, all |
| **address** | Physical street address of shop | String | 255 | Not Null | 123 Rizal Ave, Calapan City |
| **latitude** | Geospatial latitude coordinate | Decimal | 10,7 | Nullable | 13.4124012 |
| **longitude** | Geospatial longitude coordinate | Decimal | 10,7 | Nullable | 121.1812901 |
| **contactNumber** | Telephone or mobile contact number | String | 50 | Nullable | +639171234567 |
| **rating** | Customer review rating score | Decimal | 3,2 | Not Null | 4.85 |
| **isCertified** | Accreditation badge status | Boolean | 1 | Not Null | true, false |

---

## PART B: EXTENDED SYSTEM ENTITIES

### Table 2.11: Data Dictionary of Diagnostic Media
| Field Name | Data Description | Data Type | Field Length | Constraint | Possible Values |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **id** | Unique identifier for media asset | BigInt | 20 | Primary Key | Auto-increment |
| **diagnosticId** | Foreign key linking to diagnostic report | BigInt | 20 | Foreign Key / Not Null | References Diagnostics(id) |
| **type** | Multimedia classification | String | 20 | Not Null | image, video, audio |
| **storagePath** | Server storage file path | String | 255 | Nullable | diagnostics/scan_091.jpg |
| **url** | Accessible media endpoint URL | Text | N/A | Nullable | Storage URL string |
| **mimeType** | MIME format of uploaded file | String | 100 | Nullable | image/jpeg, video/mp4 |
| **createdAt** | Timestamp when media was uploaded | Timestamp | N/A | Not Null | Date/Time |

---

### Table 2.12: Data Dictionary of AI Diagnosis Caches
| Field Name | Data Description | Data Type | Field Length | Constraint | Possible Values |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **id** | Unique identifier for cached result | BigInt | 20 | Primary Key | Auto-increment |
| **vehicleType** | Vehicle category of cached query | String | 50 | Not Null | Motorcycle, Car, generic |
| **brand** | Vehicle brand of cached query | String | 50 | Not Null | Honda, Toyota, generic |
| **model** | Vehicle model of cached query | String | 50 | Not Null | Civic, Vios, generic |
| **year** | Model year of cached query | String | 20 | Not Null | 2020, generic |
| **symptomKey** | Normalized hash of symptom phrase | String | 128 | Unique / Not Null | Hash key (Index) |
| **diagnosisData** | Cached JSON diagnosis payload | JSON | N/A | Not Null | Valid JSON structure |
| **hitCount** | Reuse frequency counter | Integer | 10 | Not Null | 1, 5, 23 |
| **expiresAt** | Cache expiration timestamp | Timestamp | N/A | Not Null | Date/Time |

---

### Table 2.13: Data Dictionary of AI Runtime Settings
| Field Name | Data Description | Data Type | Field Length | Constraint | Possible Values |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **id** | Unique identifier for runtime config | BigInt | 20 | Primary Key | Auto-increment |
| **plan** | Target subscription tier | String | 10 | Unique / Not Null | guest, free, premium |
| **consultationLimit**| Maximum allowed AI consultations | SmallInt | 5 | Not Null | 5, 10, 50 |
| **maxImageMb** | Maximum image upload size in MB | SmallInt | 5 | Not Null | 5, 10 |
| **maxVideoMb** | Maximum video upload size in MB | SmallInt | 5 | Not Null | 15, 30 |
| **maxAudioMb** | Maximum audio upload size in MB | SmallInt | 5 | Not Null | 10, 20 |
| **updatedBy** | Foreign key linking to admin | BigInt | 20 | Foreign Key / Nullable | References Users(id) |

---

### Table 2.14: Data Dictionary of Repair Records
| Field Name | Data Description | Data Type | Field Length | Constraint | Possible Values |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **id** | Unique identifier for physical repair | BigInt | 20 | Primary Key | Auto-increment |
| **userId** | Foreign key linking to vehicle owner | BigInt | 20 | Foreign Key / Not Null | References Users(id) |
| **vehicleId** | Foreign key linking to repaired vehicle | BigInt | 20 | Foreign Key / Not Null | References Vehicles(id) |
| **diagnosticId** | Foreign key linking to diagnosis | BigInt | 20 | Foreign Key / Nullable | References Diagnostics(id) |
| **title** | Summary title of repair work | String | 255 | Not Null | Front Brake Caliper Replacement |
| **problem** | Detailed mechanical malfunction | Text | N/A | Nullable | Leaking brake fluid |
| **solution** | Corrective mechanical procedure | Text | N/A | Nullable | Replaced piston seals |
| **cost** | Actual repair cost in PHP | Decimal | 10,2 | Not Null | 1850.00 |
| **status** | Work completion status | String | 20 | Not Null | pending, completed |
| **performedAt** | Timestamp when repair occurred | Timestamp | N/A | Nullable | Date/Time |

---

### Table 2.15: Data Dictionary of Manual Premium Grants
| Field Name | Data Description | Data Type | Field Length | Constraint | Possible Values |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **id** | Unique identifier for manual grant | BigInt | 20 | Primary Key | Auto-increment |
| **userId** | Foreign key linking to receiving user | BigInt | 20 | Foreign Key / Not Null | References Users(id) |
| **adminId** | Foreign key linking to grantor admin | BigInt | 20 | Foreign Key / Not Null | References Users(id) |
| **billingCycle** | Billing cycle length assigned | String | 20 | Not Null | monthly, yearly |
| **reason** | Reason for non-payment grant | Text | N/A | Not Null | Beta tester reward, trial |
| **status** | Active status of grant | String | 20 | Not Null | active, expired, revoked |
| **grantedAt** | Timestamp when granted | Timestamp | N/A | Not Null | Date/Time |
| **expiresAt** | Expiration timestamp | Timestamp | N/A | Not Null | Date/Time |

---

### Table 2.16: Data Dictionary of User Notification Preferences
| Field Name | Data Description | Data Type | Field Length | Constraint | Possible Values |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **id** | Unique identifier for preference row | BigInt | 20 | Primary Key | Auto-increment |
| **userId** | Foreign key linking to user account | BigInt | 20 | Foreign Key / Unique | References Users(id) |
| **pushNotifications** | Toggle for push notification channel | Boolean | 1 | Not Null | true, false |
| **inAppNotifications** | Toggle for in-app bell notifications | Boolean | 1 | Not Null | true, false |
| **highSeverityAlerts** | Toggle for critical automotive alerts | Boolean | 1 | Not Null | true, false |
| **maintenanceReminders**| Toggle for inspection task notices | Boolean | 1 | Not Null | true, false |
| **quietHoursEnabled** | Toggle to mute overnight alerts | Boolean | 1 | Not Null | true, false |
| **quietHoursStart** | Time string when quiet hours start | String | 10 | Not Null | 22:00 |
| **quietHoursEnd** | Time string when quiet hours end | String | 10 | Not Null | 07:00 |

---

### Table 2.17: Data Dictionary of Notifications
| Field Name | Data Description | Data Type | Field Length | Constraint | Possible Values |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **id** | Unique UUID for notification record | String | 36 | Primary Key | UUID string |
| **type** | Class name of the notification event | String | 255 | Not Null | HighSeverityDiagnosticAlert |
| **notifiableType** | Polymorphic model entity type | String | 255 | Not Null | App\Models\User |
| **notifiableId** | Foreign key ID of target user | BigInt | 20 | Not Null | References Users(id) |
| **data** | JSON text containing message & links | Text | N/A | Not Null | Serialized JSON text |
| **readAt** | Timestamp when user opened notice | Timestamp | N/A | Nullable | Date/Time, null |
| **createdAt** | Timestamp when alert was dispatched | Timestamp | N/A | Not Null | Date/Time |

---

### Table 2.18: Data Dictionary of OTP Codes
| Field Name | Data Description | Data Type | Field Length | Constraint | Possible Values |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **id** | Unique identifier for OTP record | BigInt | 20 | Primary Key | Auto-increment |
| **email** | Target email address | String | 255 | Index / Not Null | user@example.com |
| **codeHash** | Hashed representation of 6-digit PIN | String | 255 | Not Null | Bcrypt hash |
| **purpose** | Verification action | String | 50 | Not Null | registration, password_reset |
| **attempts** | Counter for failed entry attempts | Integer | 10 | Not Null | 0, 1, 2, 3 |
| **expiresAt** | Expiration timestamp | Timestamp | N/A | Not Null | Date/Time |
| **verifiedAt** | Verification timestamp | Timestamp | N/A | Nullable | Date/Time, null |

---

### Table 2.19: Data Dictionary of Announcements
| Field Name | Data Description | Data Type | Field Length | Constraint | Possible Values |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **id** | Unique identifier for announcement | BigInt | 20 | Primary Key | Auto-increment |
| **title** | Headline title of broadcast | String | 160 | Not Null | System Maintenance Notice |
| **body** | Full content text of notice | Text | N/A | Not Null | Detailed text |
| **audience** | Target user group | String | 20 | Not Null | all, free, premium |
| **status** | Publication state | String | 20 | Not Null | scheduled, published |
| **scheduledAt** | Timestamp when notice is published | Timestamp | N/A | Not Null | Date/Time |
| **createdBy** | Foreign key linking to admin | BigInt | 20 | Foreign Key / Not Null | References Users(id) |

---

### Table 2.20: Data Dictionary of Feedback Submissions
| Field Name | Data Description | Data Type | Field Length | Constraint | Possible Values |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **id** | Unique identifier for feedback | BigInt | 20 | Primary Key | Auto-increment |
| **userId** | Foreign key linking to user | BigInt | 20 | Foreign Key / Nullable | References Users(id) |
| **category** | Classification topic | String | 30 | Not Null | bug_report, suggestion |
| **rating** | Star rating score | SmallInt | 3 | Nullable | 1 to 5 |
| **subject** | Short summary subject line | String | 255 | Not Null | App crashes on scan |
| **message** | Detailed explanation | Text | N/A | Not Null | Message text |
| **status** | Review workflow state | String | 20 | Not Null | new, in_review, resolved |
| **reviewedBy** | Foreign key linking to admin | BigInt | 20 | Foreign Key / Nullable | References Users(id) |

---

### Table 2.21: Data Dictionary of Admin Action Audits
| Field Name | Data Description | Data Type | Field Length | Constraint | Possible Values |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **id** | Unique identifier for audit log | BigInt | 20 | Primary Key | Auto-increment |
| **adminId** | Primary key ID of admin | BigInt | 20 | Not Null | Administrator ID |
| **adminName** | Full name of administrator | String | 255 | Not Null | Admin Name |
| **action** | Specific action keyword | String | 80 | Not Null | approve_payment, grant_premium |
| **subjectType** | Entity class targeted | String | 40 | Not Null | Payment, Vehicle, User |
| **subjectId** | Identifier of target record | String | 64 | Not Null | Record ID string |
| **metadata** | JSON snapshot of mutation | JSON | N/A | Nullable | JSON object |
| **createdAt** | Timestamp when action was logged | Timestamp | N/A | Not Null | Date/Time |

---

### Table 2.22: Data Dictionary of Normalized Vehicle Catalog
| Table Name | Primary Key | Foreign Key Reference | Key Attributes | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **vehicle_types** | `id` (BigInt) | None | `name` (varchar 255) | Top category (Sedan, SUV, Motorcycle) |
| **vehicle_brands** | `id` (BigInt) | `vehicle_type_id` $\rightarrow$ `vehicle_types(id)` | `name` (varchar 255) | Manufacturer (Toyota, Honda, Yamaha) |
| **vehicle_models** | `id` (BigInt) | `vehicle_brand_id` $\rightarrow$ `vehicle_brands(id)`| `name` (varchar 255) | Model variant (Civic, Vios, Sniper 150) |
| **vehicle_years** | `id` (BigInt) | `vehicle_model_id` $\rightarrow$ `vehicle_models(id)`| `year` (smallint) | Production year (2018, 2021, 2024) |
