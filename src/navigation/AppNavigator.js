import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ActivityScreen from '../screens/ActivityScreen';
import AskVehiCareScreen from '../screens/AskVehiCareScreen';
import DashboardScreen from '../screens/DashboardScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import LoginScreen from '../screens/LoginScreen';
import MaintenanceCategoryScreen from '../screens/MaintenanceCategoryScreen';
import MaintenanceGuideScreen from '../screens/MaintenanceGuideScreen';
import MaintenanceScreen from '../screens/MaintenanceScreen';
import ManagePlanScreen from '../screens/ManagePlanScreen';
import MyVehiclesScreen from '../screens/MyVehiclesScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import NotificationPreferencesScreen from '../screens/NotificationPreferencesScreen';
import OtpVerificationScreen from '../screens/OtpVerificationScreen';
import PersonalInformationScreen from '../screens/PersonalInformationScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import RepairShopsScreen from '../screens/RepairShopsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SmartRecommendationsScreen from '../screens/SmartRecommendationsScreen';
import VehicleCorrectionRequestScreen from '../screens/VehicleCorrectionRequestScreen';
import VehicleDetailsScreen from '../screens/VehicleDetailsScreen';
import VehicleHealthScreen from '../screens/VehicleHealthScreen';
import VehicleLoadingScreen from '../screens/VehicleLoadingScreen';
import WelcomeScreen from '../screens/WelcomeScreen';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false,
      }}>

      {/* =========================
          WELCOME
      ========================= */}
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreen}
      />

      {/* =========================
          VEHICLE SETUP
      ========================= */}
      <Stack.Screen
        name="VehicleCorrectionRequest"
        component={VehicleCorrectionRequestScreen}
      />

      <Stack.Screen
        name="VehicleDetails"
        component={VehicleDetailsScreen}
      />

      {/* =========================
          MY VEHICLES
      ========================= */}
      <Stack.Screen
        name="Vehicles"
        component={MyVehiclesScreen}
      />
      <Stack.Screen
        name="MyVehicles"
        component={MyVehiclesScreen}
      />

      {/* =========================
          AUTHENTICATION
      ========================= */}
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

      {/* =========================
          ASK VEHICARE
      ========================= */}
      <Stack.Screen
        name="AskVehiCare"
        component={AskVehiCareScreen}
      />
      <Stack.Screen
        name="Diagnostics"
        component={AskVehiCareScreen}
      />

      {/* =========================
          DASHBOARD
      ========================= */}
      <Stack.Screen
        name="VehicleLoading"
        component={VehicleLoadingScreen}
      />

      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
      />
      <Stack.Screen
        name="NotificationPreferences"
        component={NotificationPreferencesScreen}
      />
      <Stack.Screen
        name="HelpSupport"
        component={HelpSupportScreen}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
      />
      <Stack.Screen
        name="Activity"
        component={ActivityScreen}
      />
      <Stack.Screen
        name="History"
        component={HistoryScreen}
      />
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
        name="MaintenanceReminders"
        component={NotificationPreferencesScreen}
      />
      <Stack.Screen
        name="LogMaintenance"
        component={AskVehiCareScreen}
      />
      <Stack.Screen
        name="AIConsultation"
        component={AskVehiCareScreen}
      />
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
        name="VehicleHealth"
        component={VehicleHealthScreen}
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="SmartRecommendations"
        component={SmartRecommendationsScreen}
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="RepairShops"
        component={RepairShopsScreen}
        options={{
          headerShown: false,
        }}
      />

    </Stack.Navigator>
  );
};

export default AppNavigator;