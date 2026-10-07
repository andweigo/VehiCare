# VehiCare: An Intelligent Multi-Vehicle Diagnostics and Repair Assistance System

VehiCare is a full-stack, AI-powered multi-vehicle management, diagnostic, and repair assistance platform. The platform integrates a mobile client, a robust backend API, and a microservice dedicated to AI orchestration.

---

## Architecture Overview

VehiCare consists of three primary components:

1. **React Native Mobile Application** (`/src` & `/android`) — Multi-vehicle dashboard, diagnostic history, AI diagnostic chat, maintenance & repair records, interactive repair shop map, and subscription management.
2. **Laravel 12 Backend API** (`/backend`) — Core RESTful API handling authentication (Firebase & Sanctum), vehicle records, diagnostic persistence, subscription tiers, repair shop locator, and database migrations/seeders.
3. **Node.js AI Microservice** (`/vehicare-ai-service`) — High-performance Node.js service utilizing Google Gemini 3.8 Flash for intelligent vehicle diagnostic analysis, response caching, queue management, and rate limiting.
4. **MySQL Database** — Relational storage for users, vehicles, diagnostic records, maintenance logs, and repair shop locations.

---

## Repository Structure

```text
VehiCare/
├── src/                    # React Native mobile app source code
│   ├── api/                # Axios API clients & networking configuration
│   ├── components/         # Reusable UI components & map widgets
│   ├── config/             # Map, theme, and app configurations
│   ├── contexts/           # React Context providers (Auth, Vehicle, etc.)
│   ├── hooks/              # Custom React hooks
│   ├── navigation/         # Navigation stacks & tab bar setup
│   ├── screens/            # Application screens (Auth, Diagnostics, Repair, etc.)
│   ├── services/           # Storage, Firebase, and location services
│   └── utils/              # Helper functions & formatting utilities
├── android/                # Android native project & Gradle configuration
├── ios/                    # iOS native project configuration
├── backend/                # Laravel 12 Backend API
│   ├── app/                # Controllers, Models, Middleware, Services, Mail
│   ├── bootstrap/          # Framework bootstrap & routes registration
│   ├── config/             # Laravel application configurations
│   ├── database/           # Database migrations, seeders, and factories
│   ├── routes/             # API and Web routes
│   ├── .env.example        # Environment variable template for backend
│   └── composer.json       # PHP dependencies
├── vehicare-ai-service/    # Node.js AI Orchestration Microservice
│   ├── src/                # Express routes, controllers, and Gemini AI services
│   ├── tests/              # Connectivity and load testing scripts
│   ├── .env.example        # Environment variable template for AI service
│   └── package.json        # Node.js dependencies
├── database/               # Database assets & clean demo SQL dump
│   └── vehicare_demo.sql   # Pre-seeded clean demonstration database dump
├── package.json            # React Native app dependencies and scripts
├── .env.example            # Reference environment file for root/mobile configuration
├── .gitignore              # Security-focused Git ignore file
└── README.md               # Master system documentation
```

---

## Required Software & System Requirements

Before running VehiCare, verify that your development machine meets the software prerequisites:

* **Git**: `>= 2.30`
* **Node.js**: `>= 22.11.0` (Recommended: Node 22+ or 24+)
* **npm**: `>= 10.0.0`
* **PHP**: `>= 8.2` (PHP 8.2 or 8.3 with PDO, OpenSSL, Mbstring, Curl, and MySQL extensions enabled)
* **Composer**: `>= 2.5`
* **MySQL Database**: `>= 8.0` or MariaDB `>= 10.4`
* **Java Development Kit (JDK)**: JDK 17 (Required for React Native Android builds)
* **Android Studio & Android SDK**: Android SDK Platform 34+, Android SDK Build-Tools, and `adb` CLI tool

### Verification Commands

Open your terminal or PowerShell and run:

```bash
git --version
node --version
npm --version
php --version
composer --version
mysql --version
java -version
adb version
```

---

## Complete First-Time Setup Order

Follow this numbered setup guide step-by-step to install and execute the complete VehiCare system on a fresh computer.

### Step 1 — Install Prerequisites
Ensure Git, Node.js, PHP, Composer, MySQL, JDK 17, and Android Studio are installed and added to your system environment `PATH`.

### Step 2 — Clone the Repository
```bash
git clone <repository-url>
cd VehiCare
```

### Step 3 — Configure Environment Files
Each service requires its own local `.env` file created from its corresponding `.env.example` file. Real secrets are kept local and are never committed to GitHub.

#### Backend `.env`
```bash
cp backend/.env.example backend/.env
```

#### AI Microservice `.env`
```bash
cp vehicare-ai-service/.env.example vehicare-ai-service/.env
```

### Step 4 — Configure Developer's Gemini API Key
VehiCare's AI diagnostics require a Google Gemini API key. Each developer must supply their own API key in their local `.env` files.

1. Obtain a free Gemini API key from [Google AI Studio](https://aistudio.google.com/).
2. Open `vehicare-ai-service/.env` and paste your key:
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   ```
3. (Optional) You may also set `GEMINI_API_KEY` in `backend/.env` for direct backend fallback verification.

### Step 5 — Configure MySQL & Setup Database

1. Ensure MySQL is running.
2. Open MySQL CLI or phpMyAdmin and create the `vehicare_db` database:
   ```sql
   CREATE DATABASE vehicare_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
3. Configure your database credentials in `backend/.env`:
   ```env
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=vehicare_db
   DB_USERNAME=root
   DB_PASSWORD=
   ```

4. Choose your preferred database population method:

   * **Option A: Run Migrations & Seeders (Recommended)**
     ```bash
     cd backend
     php artisan migrate --seed
     ```

   * **Option B: Import Clean SQL Dump (Alternative)**
     ```bash
     mysql -u root vehicare_db < database/vehicare_demo.sql
     ```

### Step 6 — Install Laravel Backend Dependencies
From the `backend/` directory:
```bash
cd backend
composer install
php artisan key:generate
```

### Step 7 — Install Node.js AI Service Dependencies
From the `vehicare-ai-service/` directory:
```bash
cd vehicare-ai-service
npm install
```

### Step 8 — Configure Laravel ↔ AI Service Communication
Ensure `backend/.env` points to the AI service port (`5000`):
```env
AI_SERVICE_URL=http://127.0.0.1:5000
AI_SERVICE_SECRET=vehicare_internal_ai_secret_key_2026
```
Ensure `vehicare-ai-service/.env` has the matching secret:
```env
AI_SERVICE_SECRET=vehicare_internal_ai_secret_key_2026
```

### Step 9 — Install React Native Mobile Dependencies
From the root `VehiCare/` directory:
```bash
npm install
```

### Step 10 — Configure Mobile API Base URL
The mobile app communicates with the Laravel backend.
* **USB Physical Phone (Recommended)**: The app uses `http://127.0.0.1:8080/api`. You will forward port 8080 using `adb reverse tcp:8080 tcp:8080` in Step 15.
* **Android Emulator**: Uses `http://10.0.2.2:8080/api` automatically.
* **Wi-Fi LAN Testing**: Set your computer's local IP address in `src/api/apiClient.js` if testing over wireless LAN.

### Step 11 — Start MySQL Database
Ensure MySQL service is active.

### Step 12 — Start Laravel Backend Server
From `backend/`:
```bash
cd backend
php artisan serve --host=0.0.0.0 --port=8080
```

### Step 13 — Start Node.js AI Microservice
In a new terminal window, from `vehicare-ai-service/`:
```bash
cd vehicare-ai-service
npm run dev
```

### Step 14 — Start Metro Bundler
In a new terminal window, from root `VehiCare/`:
```bash
npx react-native start
```

### Step 15 — Connect Android Device or Launch Emulator

#### For Physical Android Phone via USB:
1. Enable **Developer Options** and **USB Debugging** on your Android phone.
2. Connect your phone to your computer via USB cable.
3. Verify connection:
   ```bash
   adb devices
   ```
4. Forward the backend API port:
   ```bash
   adb reverse tcp:8080 tcp:8080
   ```

#### For Android Studio Emulator:
Launch your virtual device (AVD) from Android Studio.

### Step 16 — Build & Run the Android Application
In a new terminal window, from root `VehiCare/`:
```bash
npx react-native run-android
```

---

## First-Time Setup Flowchart

```text
       Install Prerequisites (Git, Node, PHP, MySQL, JDK 17, Android Studio)
                                        │
                                        ▼
                             Clone VehiCare Repository
                                        │
                                        ▼
                   Create .env Files from .env.example Templates
                                        │
                                        ▼
                   Configure Local Gemini API Key in .env
                                        │
                                        ▼
                  Create MySQL Database & Run Migrations / Seeders
                   (php artisan migrate --seed OR import SQL dump)
                                        │
                                        ▼
                   Install Dependencies (Composer & npm install)
                                        │
                                        ▼
                      Start Backend Server (Laravel on port 8080)
                                        │
                                        ▼
                     Start AI Microservice (Node.js on port 5000)
                                        │
                                        ▼
                     Start Metro Bundler & Connect Android Device
                      (adb reverse tcp:8080 tcp:8080 for USB phone)
                                        │
                                        ▼
                   Run Android App (npx react-native run-android)
                                        │
                                        ▼
                           Verify Full System Execution
```

---

## Daily Development Workflow

For developers who have already completed the initial setup:

```text
  Pull Latest Changes ──► Start MySQL ──► Start Laravel ──► Start AI Service ──► Start Metro ──► Launch App
      (git pull)                            (:8080)             (:5000)
```

### Quick Commands Terminal Matrix

| Terminal | Path | Command |
|---|---|---|
| **Terminal 1 (Backend)** | `VehiCare/backend` | `php artisan serve --host=0.0.0.0 --port=8080` |
| **Terminal 2 (AI Service)** | `VehiCare/vehicare-ai-service` | `npm run dev` |
| **Terminal 3 (Metro)** | `VehiCare/` | `npx react-native start` |
| **Terminal 4 (App Launcher)** | `VehiCare/` | `adb reverse tcp:8080 tcp:8080 && npx react-native run-android` |

*When pulling new code from team members, run:*
```bash
# In backend/ if migrations or php packages changed:
composer install
php artisan migrate

# In root/ if npm packages changed:
npm install

# In vehicare-ai-service/ if AI packages changed:
npm install
```

---

## Physical Android Device & Networking Guide

When testing on a physical Android device:

1. **USB Reverse Tunneling (Recommended)**:
   Connect via USB, enable USB Debugging, and execute:
   ```bash
   adb reverse tcp:8080 tcp:8080
   ```
   This routes `127.0.0.1:8080` from your phone directly to your computer's `localhost:8080`.

2. **LAN Wi-Fi Connection**:
   * Ensure your phone and computer are on the same Wi-Fi network.
   * Find your computer's IP address:
     - Windows: `ipconfig` (look for IPv4 Address, e.g., `192.168.1.100`)
     - Mac/Linux: `ifconfig` or `ip a`
   * Note: `127.0.0.1` on a physical mobile phone refers to the phone itself, NOT your computer. When using Wi-Fi LAN, configure the API base URL in `src/api/apiClient.js` to point to your computer's local IP address (e.g., `http://192.168.1.100:8080/api`).

---

## Complete System Verification Checklist

Before reporting setup completion, verify all items:

- [ ] MySQL database `vehicare_db` is created.
- [ ] `backend/.env` exists and contains database configuration.
- [ ] `vehicare-ai-service/.env` exists and contains a valid `GEMINI_API_KEY`.
- [ ] Laravel migrations and seeders executed cleanly (`php artisan migrate --seed`).
- [ ] Backend server is running on `http://127.0.0.1:8080`.
- [ ] AI service is running on `http://127.0.0.1:5000`.
- [ ] Metro bundler is running.
- [ ] `adb devices` lists your connected device or emulator.
- [ ] `adb reverse tcp:8080 tcp:8080` executed (if using physical USB phone).
- [ ] App builds and launches on Android.
- [ ] User authentication (Login / Registration) succeeds.
- [ ] Vehicle garage features (Adding/Viewing vehicles) work.
- [ ] AI Diagnostic Assistant responds with diagnostic recommendations.
- [ ] Repair shop locator map renders successfully.
- [ ] Security check: `.env` files and API keys are NOT tracked by Git (`git status`).

---

## Troubleshooting Guide

### 1. `composer install` Errors or PHP Extension Warnings
* **Issue**: Missing PHP extension (e.g., `pdo_mysql`, `mbstring`, `curl`).
* **Fix**: Edit your `php.ini` file (e.g., in `C:\xampp\php\php.ini` or system PHP installation) and uncomment `;extension=pdo_mysql`, `;extension=curl`, `;extension=mbstring`. Restart terminal.

### 2. Database Connection Refused (`SQLSTATE[HY000] [2002]`)
* **Issue**: MySQL service is not running or incorrect credentials in `backend/.env`.
* **Fix**: Ensure MySQL is started via XAMPP Control Panel, Services, or Docker. Verify `DB_HOST=127.0.0.1`, `DB_PORT=3306`, `DB_USERNAME`, and `DB_PASSWORD` in `backend/.env`.

### 3. Missing `APP_KEY` Warning in Laravel
* **Issue**: `RuntimeException: No application encryption key has been specified.`
* **Fix**: Run `php artisan key:generate` inside `backend/`.

### 4. Gemini AI Service Returning 500 / 401 Error
* **Issue**: Missing or invalid `GEMINI_API_KEY` in `vehicare-ai-service/.env`.
* **Fix**: Verify your API key at Google AI Studio. Update `GEMINI_API_KEY` in `vehicare-ai-service/.env` and restart the Node.js AI service (`npm run dev`).

### 5. Mobile App Network Error (`ERR_NETWORK` / `ECONNREFUSED`)
* **Issue**: Mobile app cannot reach the Laravel backend.
* **Fix**:
  1. Verify Laravel is running on `0.0.0.0:8080`.
  2. For USB phone, run `adb reverse tcp:8080 tcp:8080`.
  3. For emulator, ensure `apiClient.js` uses `10.0.2.2:8080`.
  4. Ensure firewall is not blocking port 8080.

### 6. Android Build Failures / Gradle Errors
* **Issue**: Gradle daemon error or SDK path issue.
* **Fix**:
  1. Open the `android/` directory in Android Studio to trigger auto-indexing and SDK download.
  2. Create `android/local.properties` if missing and set SDK location:
     ```properties
     sdk.dir=C\:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\Sdk
     ```
  3. Clean gradle build:
     ```bash
     cd android
     ./gradlew clean
     ```

---

## Git Team Workflow & Guidelines

To maintain code quality and repository cleanliness across the development group:

1. **Pull Before Working**:
   Always pull the latest changes from `main` before starting a new task:
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Feature Branching**:
   Create dedicated feature branches for new work:
   ```bash
   git checkout -b feature/diagnostic-ui-enhancement
   ```

3. **Committing Changes**:
   ```bash
   git add .
   git commit -m "Add custom vehicle filter to diagnostic history"
   ```

4. **Pushing to GitHub**:
   ```bash
   git push -u origin feature/diagnostic-ui-enhancement
   ```

5. **Security Rules for Team Commits**:
   * **NEVER** force commit `.env` files or API keys.
   * **NEVER** remove `.env` from `.gitignore`.
   * **NEVER** commit `node_modules/`, `vendor/`, or Android `build/` directories.
   * Keep developer-specific credentials local to your own machine.
