import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useVehicle } from '../context/VehicleContext';
import useVehicleHealth from '../hooks/useVehicleHealth';
import { useTheme } from '../theme/ThemeContext';
import {
    getVehicleDisplayDetails,
    getVehicleDisplayName,
} from '../utils/vehicleDisplay';

const VehicleHealthScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { activeVehicle, pendingVehicle } = useVehicle();

  const {
    healthPercentage,
    healthStatus,
    healthData,
    completedRecommendations,
    loading,
  } = useVehicleHealth();

  const vehicleProfile = activeVehicle || pendingVehicle;

  const vehicleName = getVehicleDisplayName(
    vehicleProfile,
    'Your Vehicle',
  );

  const vehicleDetails = getVehicleDisplayDetails(
    vehicleProfile,
    'Vehicle information',
  );

  const getHealthColor = score => {
    if (score >= 80) {
      return theme.success || '#35B86B';
    }

    if (score >= 60) {
      return theme.accent;
    }

    if (score >= 40) {
      return '#D6A23A';
    }

    return '#FF5A5F';
  };

  const getVehicleIconName = vehicleTypeValue => {
    let typeValue = vehicleTypeValue;

    if (typeValue && typeof typeValue === 'object') {
      const objectCandidates = [
        typeValue.name,
        typeValue.type,
        typeValue.label,
        typeValue.title,
        typeValue.value,
        typeValue.code,
        typeValue.id,
      ];

      typeValue = objectCandidates.find(
        candidate =>
          candidate !== undefined &&
          candidate !== null &&
          candidate !== '',
      );
    }

    const text = `${typeValue || ''}`.toLowerCase().trim();

    if (
      text.includes('moto') ||
      text.includes('motor') ||
      text.includes('scooter')
    ) {
      return 'motorcycle';
    }

    if (
      text.includes('bicycle') ||
      text.includes('bike') ||
      text.includes('cycle')
    ) {
      return 'directions-bike';
    }

    if (text.includes('bus')) {
      return 'directions-bus';
    }

    if (
      text.includes('truck') ||
      text.includes('van') ||
      text.includes('pickup')
    ) {
      return 'local-shipping';
    }

    if (
      text.includes('car') ||
      text.includes('sedan') ||
      text.includes('suv') ||
      text.includes('hatch') ||
      text.includes('coupe') ||
      text.includes('mpv')
    ) {
      return 'directions-car';
    }

    return 'directions-car';
  };

  const vehicleIconName = getVehicleIconName(
    vehicleProfile?.vehicle_type ||
      vehicleProfile?.vehicleType ||
      vehicleProfile?.type ||
      vehicleProfile,
  );

  const healthColor = getHealthColor(
    healthPercentage,
  );

  const factors = healthData?.factors || {};

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
        },
      ]}
    >
      {/* HEADER */}

      <View style={styles.header}>
        <TouchableOpacity
          style={[
            styles.backButton,
            {
              backgroundColor: theme.surfaceAlt,
              borderColor: theme.border,
            },
          ]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Icon
            name="arrow-back"
            size={22}
            color={theme.text}
          />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text
            style={[
              styles.headerTitle,
              {
                color: theme.text,
              },
            ]}
          >
            Vehicle Health
          </Text>

          <Text
            style={[
              styles.headerSubtitle,
              {
                color: theme.textSecondary,
              },
            ]}
            numberOfLines={1}
          >
            Track your vehicle’s condition.
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* HEALTH OVERVIEW */}

        <View
          style={[
            styles.healthCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.scoreHeader}>
            <View>
              <Text
                style={[
                  styles.overline,
                  {
                    color: theme.textSecondary,
                  },
                ]}
              >
                CURRENT HEALTH
              </Text>

              <View style={styles.scoreRow}>
                <Text
                  style={[
                    styles.score,
                    {
                      color: healthColor,
                    },
                  ]}
                >
                  {healthPercentage}
                </Text>

                <Text
                  style={[
                    styles.percent,
                    {
                      color: healthColor,
                    },
                  ]}
                >
                  %
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    theme.statusBadgeBackground,
                },
              ]}
            >
              <Icon
                name={healthStatus.icon}
                size={17}
                color={healthColor}
              />

              <Text
                style={[
                  styles.statusText,
                  {
                    color: healthColor,
                  },
                ]}
              >
                {healthStatus.label}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.progressTrack,
              {
                backgroundColor: theme.border,
              },
            ]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  width: `${healthPercentage}%`,
                  backgroundColor: healthColor,
                },
              ]}
            />
          </View>

          <Text
            style={[
              styles.healthDescription,
              {
                color: theme.textSecondary,
              },
            ]}
          >
            Your vehicle health score is based on your
            vehicle information, maintenance activity,
            diagnostics, and completed recommendations.
          </Text>
        </View>

        {/* VEHICLE */}

        <View
          style={[
            styles.vehicleCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          
          <View style={styles.vehicleHeader}>
            <View style={styles.vehicleInfo}>
              <Text
                style={[
                  styles.vehicleName,
                  {
                    color: theme.text,
                  },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {vehicleName}
              </Text>

              <Text
                style={[
                  styles.vehicleDetails,
                  {
                    color: theme.textSecondary,
                  },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {vehicleDetails}
              </Text>
            </View>

            <View
              style={[
                styles.vehicleIconContainer,
                {
                  backgroundColor: theme.accentSoft,
                },
              ]}
            >
              <Icon
                name={vehicleIconName}
                size={24}
                color={theme.accent}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.changeVehicleButton,
              {
                backgroundColor: theme.surfaceAlt,
                borderColor: theme.accent,
              },
            ]}
            onPress={() => navigation.navigate('Vehicles')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.changeVehicleText,
                {
                  color: theme.accent,
                },
              ]}
            >
              Change Vehicle
            </Text>
          </TouchableOpacity>
        </View>

        {/* HEALTH FACTORS */}

        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: theme.text,
              },
            ]}
          >
            Health Factors
          </Text>

          <Text
            style={[
              styles.sectionSubtitle,
              {
                color: theme.textSecondary,
              },
            ]}
          >
            Areas contributing to your vehicle health.
          </Text>

          <View
            style={[
              styles.factorCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <HealthFactor
              icon="build"
              title="Maintenance"
              value={factors.maintenance || 0}
              theme={theme}
            />

            <View
              style={[
                styles.factorDivider,
                {
                  backgroundColor: theme.border,
                },
              ]}
            />

            <HealthFactor
              icon="medical-services"
              title="Diagnostics"
              value={factors.diagnostics || 0}
              theme={theme}
            />

            <View
              style={[
                styles.factorDivider,
                {
                  backgroundColor: theme.border,
                },
              ]}
            />

            <HealthFactor
              icon="lightbulb"
              title="Recommendations"
              value={factors.recommendations || 0}
              theme={theme}
            />
          </View>
        </View>

        {/* IMPROVE HEALTH */}

        <TouchableOpacity
          style={[
            styles.recommendationCard,
            {
              backgroundColor: theme.surfaceAlt,
              borderColor: theme.accent,
            },
          ]}
          activeOpacity={0.85}
          onPress={() =>
            navigation.navigate('SmartRecommendations')
          }
        >
          <View
            style={[
              styles.recommendationIcon,
              {
                backgroundColor: theme.accentSoft,
              },
            ]}
          >
            <Icon
              name="auto-awesome"
              size={25}
              color={theme.accent}
            />
          </View>

          <View style={styles.recommendationContent}>
            <Text
              style={[
                styles.recommendationTitle,
                {
                  color: theme.text,
                },
              ]}
            >
              Improve Vehicle Health
            </Text>

            <Text
              style={[
                styles.recommendationDescription,
                {
                  color: theme.textSecondary,
                },
              ]}
            >
              Get personalized recommendations based
              on your vehicle's symptoms, history, and
              maintenance needs.
            </Text>

            <View style={styles.recommendationAction}>
              <Text
                style={[
                  styles.recommendationActionText,
                  {
                    color: theme.accent,
                  },
                ]}
              >
                View recommendations
              </Text>

              <Icon
                name="arrow-forward"
                size={16}
                color={theme.accent}
              />
            </View>
          </View>
        </TouchableOpacity>

        {/* COMPLETED RECOMMENDATIONS */}

        <View style={styles.section}>
          <View style={styles.completedHeader}>
            <View>
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color: theme.text,
                  },
                ]}
              >
                Completed
              </Text>

              <Text
                style={[
                  styles.sectionSubtitle,
                  {
                    color: theme.textSecondary,
                  },
                ]}
              >
                Recommendations you've completed.
              </Text>
            </View>

            <View
              style={[
                styles.countBadge,
                {
                  backgroundColor:
                    theme.statusBadgeBackground,
                },
              ]}
            >
              <Text
                style={[
                  styles.countText,
                  {
                    color: theme.accent,
                  },
                ]}
              >
                {completedRecommendations.length}
              </Text>
            </View>
          </View>

          {completedRecommendations.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
            >
              <Icon
                name="task-alt"
                size={25}
                color={theme.textSecondary}
              />

              <Text
                style={[
                  styles.emptyTitle,
                  {
                    color: theme.text,
                  },
                ]}
              >
                No completed recommendations yet
              </Text>

              <Text
                style={[
                  styles.emptyDescription,
                  {
                    color: theme.textSecondary,
                  },
                ]}
              >
                Complete recommended actions to help
                improve your vehicle health score.
              </Text>
            </View>
          ) : (
            completedRecommendations
              .slice()
              .reverse()
              .map(item => (
                <View
                  key={item.id}
                  style={[
                    styles.completedCard,
                    {
                      backgroundColor:
                        theme.surface,
                      borderColor:
                        theme.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.completedIcon,
                      {
                        backgroundColor:
                          theme.accentSoft,
                      },
                    ]}
                  >
                    <Icon
                      name="check"
                      size={18}
                      color={theme.accent}
                    />
                  </View>

                  <View
                    style={
                      styles.completedContent
                    }
                  >
                    <Text
                      style={[
                        styles.completedTitle,
                        {
                          color: theme.text,
                        },
                      ]}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>

                    <Text
                      style={[
                        styles.completedImpact,
                        {
                          color:
                            theme.success ||
                            '#35B86B',
                        },
                      ]}
                    >
                      +{item.scoreImpact || 0} health
                    </Text>
                  </View>
                </View>
              ))
          )}
        </View>

        {/* LAST UPDATED */}

        {healthData?.lastUpdated && (
          <Text
            style={[
              styles.lastUpdated,
              {
                color: theme.textSecondary,
              },
            ]}
          >
            Last updated{' '}
            {new Date(
              healthData.lastUpdated,
            ).toLocaleString()}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const HealthFactor = ({
  icon,
  title,
  value,
  theme,
}) => {
  return (
    <View style={styles.factor}>
      <View
        style={[
          styles.factorIcon,
          {
            backgroundColor:
              theme.accentSoft,
          },
        ]}
      >
        <Icon
          name={icon}
          size={18}
          color={theme.accent}
        />
      </View>

      <View style={styles.factorContent}>
        <Text
          style={[
            styles.factorTitle,
            {
              color: theme.text,
            },
          ]}
        >
          {title}
        </Text>

        <Text
          style={[
            styles.factorValue,
            {
              color:
                theme.textSecondary,
            },
          ]}
        >
          {value} completed
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // ==========================================
  // HEADER
  // ==========================================

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 18,
  },

  backButton: {
    width: 43,
    height: 43,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  headerTitleContainer: {
    flex: 1,
    minWidth: 0,
  },

  headerTitle: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 21,
    lineHeight: 26,
  },

  headerSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    marginTop: 2,
  },

  // ==========================================
  // HEALTH CARD
  // ==========================================

  healthCard: {
    borderWidth: 1,
    borderRadius: 21,
    padding: 18,
    marginBottom: 15,
  },

  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  overline: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 8,
    letterSpacing: 1,
    marginBottom: 2,
  },

  scoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },

  score: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 45,
    lineHeight: 48,
  },

  percent: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 18,
    marginBottom: 6,
    marginLeft: 2,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  statusText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    marginLeft: 5,
  },

  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 14,
    marginBottom: 13,
  },

  progressFill: {
    height: '100%',
    borderRadius: 999,
  },

  healthDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    lineHeight: 17,
  },

  // ==========================================
  // VEHICLE
  // ==========================================

  vehicleCard: {
    borderWidth: 1,
    borderRadius: 19,
    padding: 16,
    marginBottom: 22,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sectionTitle: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 18,
  },

  sectionSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 10.5,
    lineHeight: 16,
    marginTop: 3,
  },

  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  vehicleInfo: {
    flex: 1,
    paddingRight: 12,
  },

  vehicleName: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 15,
    lineHeight: 20,
  },

  vehicleDetails: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },

  vehicleIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  changeVehicleButton: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  changeVehicleText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
  },

  // ==========================================
  // SECTIONS
  // ==========================================

  section: {
    marginBottom: 22,
  },

  // ==========================================
  // FACTORS
  // ==========================================

  factorCard: {
    borderWidth: 1,
    borderRadius: 19,
    padding: 14,
    marginTop: 12,
  },

  factor: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },

  factorIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  factorContent: {
    flex: 1,
  },

  factorTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
  },

  factorValue: {
    fontFamily: 'Inter-Regular',
    fontSize: 9.5,
    marginTop: 2,
  },

  factorDivider: {
    height: 1,
    marginVertical: 7,
  },

  // ==========================================
  // RECOMMENDATIONS
  // ==========================================

  recommendationCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 22,
  },

  recommendationIcon: {
    width: 47,
    height: 47,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  recommendationContent: {
    flex: 1,
  },

  recommendationTitle: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 16,
  },

  recommendationDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 10.5,
    lineHeight: 16,
    marginTop: 4,
  },

  recommendationAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },

  recommendationActionText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    marginRight: 4,
  },

  // ==========================================
  // COMPLETED
  // ==========================================

  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  countBadge: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  countText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
  },

  emptyCard: {
    borderWidth: 1,
    borderRadius: 19,
    padding: 20,
    alignItems: 'center',
    marginTop: 12,
  },

  emptyTitle: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },

  emptyDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
    marginTop: 4,
  },

  completedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 17,
    padding: 13,
    marginTop: 10,
  },

  completedIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  completedContent: {
    flex: 1,
  },

  completedTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    lineHeight: 16,
  },

  completedImpact: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    marginTop: 3,
  },

  lastUpdated: {
    fontFamily: 'Inter-Regular',
    fontSize: 9,
    textAlign: 'center',
    marginTop: 2,
  },
});

export default VehicleHealthScreen;