import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import { useVehicle } from '../context/VehicleContext';

import AboutScreen from '../screens/AboutScreen';
import ActivityScreen from '../screens/ActivityScreen';
import AskVehiCareScreen from '../screens/AskVehiCareScreen';
import AuthLoadingScreen from '../screens/AuthLoadingScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import HelpArticleScreen from '../screens/HelpArticleScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';
import HistoryScreen from '../screens/HistoryScreen';
import LoginScreen from '../screens/LoginScreen';
import MaintenanceCategoryScreen from '../screens/MaintenanceCategoryScreen';
import MaintenanceGuideScreen from '../screens/MaintenanceGuideScreen';
import MaintenanceScreen from '../screens/MaintenanceScreen';
import ManagePlanScreen from '../screens/ManagePlanScreen';
import MyVehiclesScreen from '../screens/MyVehiclesScreen';
import NotificationPreferencesScreen from '../screens/NotificationPreferencesScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import OtpVerificationScreen from '../screens/OtpVerificationScreen';
import PersonalInformationScreen from '../screens/PersonalInformationScreen';
import PrivacyScreen from '../screens/PrivacyScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RegisterScreen from '../screens/RegisterScreen';
import RepairShopsScreen from '../screens/RepairShopsScreen';
import ReportProblemScreen from '../screens/ReportProblemScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import SendFeedbackScreen from '../screens/SendFeedbackScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SmartRecommendationsScreen from '../screens/SmartRecommendationsScreen';
import TermsScreen from '../screens/TermsScreen';
import VehicleCorrectionRequestScreen from '../screens/VehicleCorrectionRequestScreen';
import VehicleDetailsScreen from '../screens/VehicleDetailsScreen';
import VehicleHealthScreen from '../screens/VehicleHealthScreen';
import VehicleLoadingScreen from '../screens/VehicleLoadingScreen';
import WelcomeScreen from '../screens/WelcomeScreen';

const Stack = createNativeStackNavigator();

/**
 * Shared authenticated application routes.
 */
const renderAppScreens = () => (
  <>
    {/* =========================
        VEHICLE MANAGEMENT
    ========================= */}
    <Stack.Screen
      name="VehicleCorrectionRequest"
      component={VehicleCorrectionRequestScreen}
    />
    <Stack.Screen
      name="Vehicles"
      component={MyVehiclesScreen}
    />
    <Stack.Screen
      name="MyVehicles"
      component={MyVehiclesScreen}
    />

    {/* =========================
        ASK VEHICARE / DIAGNOSTICS
    ========================= */}
    <Stack.Screen
      name="AskVehiCare"
      component={AskVehiCareScreen}
    />
    <Stack.Screen
      name="Diagnostics"
      component={AskVehiCareScreen}
    />
    <Stack.Screen
      name="LogMaintenance"
      component={AskVehiCareScreen}
    />
    <Stack.Screen
      name="AIConsultation"
      component={AskVehiCareScreen}
    />

    {/* =========================
        NOTIFICATIONS & PREFERENCES
    ========================= */}
    <Stack.Screen
      name="Notifications"
      component={NotificationsScreen}
    />
    <Stack.Screen
      name="NotificationPreferences"
      component={NotificationPreferencesScreen}
    />
    <Stack.Screen
      name="MaintenanceReminders"
      component={NotificationPreferencesScreen}
    />

    {/* =========================
        MAINTENANCE & HISTORY
    ========================= */}
    <Stack.Screen
      name="Maintenance"
      component={MaintenanceScreen}
    />
    <Stack.Screen
      name="MaintenanceCategory"
      component={MaintenanceCategoryScreen}
    />
    <Stack.Screen
      name="MaintenanceGuide"
      component={MaintenanceGuideScreen}
    />
    <Stack.Screen
      name="MaintenanceHistory"
      component={HistoryScreen}
    />
    <Stack.Screen
      name="History"
      component={HistoryScreen}
    />
    <Stack.Screen
      name="Activity"
      component={ActivityScreen}
    />

    {/* =========================
        HEALTH & SHOPS
    ========================= */}
    <Stack.Screen
      name="VehicleHealth"
      component={VehicleHealthScreen}
    />
    <Stack.Screen
      name="SmartRecommendations"
      component={SmartRecommendationsScreen}
    />
    <Stack.Screen
      name="RepairShops"
      component={RepairShopsScreen}
    />

    {/* =========================
        ACCOUNT & PROFILE
    ========================= */}
    <Stack.Screen
      name="Profile"
      component={ProfileScreen}
    />
    <Stack.Screen
      name="PersonalInformation"
      component={PersonalInformationScreen}
    />
    <Stack.Screen
      name="ManagePlan"
      component={ManagePlanScreen}
    />
    <Stack.Screen
      name="Settings"
      component={SettingsScreen}
    />
    <Stack.Screen
      name="HelpSupport"
      component={HelpSupportScreen}
    />
    <Stack.Screen
      name="HelpArticle"
      component={HelpArticleScreen}
    />
    <Stack.Screen
      name="About"
      component={AboutScreen}
    />
    <Stack.Screen
      name="Terms"
      component={TermsScreen}
    />
    <Stack.Screen
      name="Privacy"
      component={PrivacyScreen}
    />
    <Stack.Screen
      name="SendFeedback"
      component={SendFeedbackScreen}
    />
    <Stack.Screen
      name="ReportProblem"
      component={ReportProblemScreen}
    />

    {/* =========================
        VERIFICATION (IF REQUIRED)
    ========================= */}
    <Stack.Screen
      name="OtpVerification"
      component={OtpVerificationScreen}
    />
  </>
);

const AppNavigator = () => {
  const { isAuthenticated, loading: authLoading, isGuest, isNewRegistration } = useAuth();
  const { activeVehicle, vehicles, loading: vehicleLoading, pendingVehicle } = useVehicle();

  // Show clean branded splash screen while checking session or restoring vehicles
  const isInitialLoading = authLoading || (isAuthenticated && vehicleLoading);

  if (isInitialLoading) {
    return (
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        <Stack.Screen
          name="AuthLoading"
          component={AuthLoadingScreen}
        />
      </Stack.Navigator>
    );
  }

  // Determine whether an authenticated user already has vehicle(s)
  const hasAccountVehicles = Boolean(
    activeVehicle || (Array.isArray(vehicles) && vehicles.length > 0),
  );

  // Determine whether a guest already has a configured vehicle
  const hasGuestVehicle = Boolean(
    (pendingVehicle && Object.keys(pendingVehicle).length > 0) ||
      (!isAuthenticated && activeVehicle && Object.keys(activeVehicle).length > 0),
  );

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {isAuthenticated ? (
        /* ==========================================================
           AUTHENTICATED FLOW
           Guarantees Login, Register, and Welcome are NOT in history.
           Hardware Back on Dashboard exits/backgrounds app.
        ========================================================== */
        isNewRegistration ? (
          hasAccountVehicles ? (
            <>
              <Stack.Screen
                name="VehicleLoading"
                component={VehicleLoadingScreen}
              />
              <Stack.Screen
                name="Dashboard"
                component={DashboardScreen}
              />
              <Stack.Screen
                name="VehicleDetails"
                component={VehicleDetailsScreen}
              />
              {renderAppScreens()}
            </>
          ) : (
            <>
              <Stack.Screen
                name="VehicleDetails"
                component={VehicleDetailsScreen}
              />
              <Stack.Screen
                name="VehicleLoading"
                component={VehicleLoadingScreen}
              />
              <Stack.Screen
                name="Dashboard"
                component={DashboardScreen}
              />
              {renderAppScreens()}
            </>
          )
        ) : hasAccountVehicles ? (
          <>
            <Stack.Screen
              name="Dashboard"
              component={DashboardScreen}
            />
            <Stack.Screen
              name="VehicleLoading"
              component={VehicleLoadingScreen}
            />
            <Stack.Screen
              name="VehicleDetails"
              component={VehicleDetailsScreen}
            />
            {renderAppScreens()}
          </>
        ) : (
          <>
            <Stack.Screen
              name="VehicleDetails"
              component={VehicleDetailsScreen}
            />
            <Stack.Screen
              name="VehicleLoading"
              component={VehicleLoadingScreen}
            />
            <Stack.Screen
              name="Dashboard"
              component={DashboardScreen}
            />
            {renderAppScreens()}
          </>
        )
      ) : isGuest ? (
        /* ==========================================================
           GUEST FLOW
           Allows guest vehicle onboarding, dashboard, diagnostics,
           profile, plus upgrade entry points to Login and Register.
        ========================================================== */
        hasGuestVehicle ? (
          <>
            <Stack.Screen
              name="Dashboard"
              component={DashboardScreen}
            />
            <Stack.Screen
              name="VehicleLoading"
              component={VehicleLoadingScreen}
            />
            <Stack.Screen
              name="VehicleDetails"
              component={VehicleDetailsScreen}
            />
            {renderAppScreens()}
            {/* Guest account upgrade entry points */}
            <Stack.Screen
              name="Login"
              component={LoginScreen}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
            />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
            />
            <Stack.Screen
              name="ResetPassword"
              component={ResetPasswordScreen}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="VehicleDetails"
              component={VehicleDetailsScreen}
            />
            <Stack.Screen
              name="VehicleLoading"
              component={VehicleLoadingScreen}
            />
            <Stack.Screen
              name="Dashboard"
              component={DashboardScreen}
            />
            {renderAppScreens()}
            {/* Guest account upgrade entry points */}
            <Stack.Screen
              name="Login"
              component={LoginScreen}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
            />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
            />
            <Stack.Screen
              name="ResetPassword"
              component={ResetPasswordScreen}
            />
          </>
        )
      ) : (
        /* ==========================================================
           SIGNED-OUT FLOW
           Default entry point for unauthenticated users.
           Contains ONLY signed-out auth screens so logging out
           immediately returns to Welcome.
        ========================================================== */
        <>
          <Stack.Screen
            name="Welcome"
            component={WelcomeScreen}
          />
          <Stack.Screen
            name="Login"
            component={LoginScreen}
          />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
          />
          <Stack.Screen
            name="OtpVerification"
            component={OtpVerificationScreen}
          />
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
          />
          <Stack.Screen
            name="ResetPassword"
            component={ResetPasswordScreen}
          />
          <Stack.Screen
            name="Terms"
            component={TermsScreen}
          />
          <Stack.Screen
            name="Privacy"
            component={PrivacyScreen}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;