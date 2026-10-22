import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';

import { useVehicle } from '../context/VehicleContext';
import useVehicleHealth from '../hooks/useVehicleHealth';
import { useTheme } from '../theme/ThemeContext';
import {
    getVehicleDisplayDetails,
    getVehicleDisplayName,
} from '../utils/vehicleDisplay';

const VehicleHealthScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const isDark = theme?.name === 'dark';
  const { activeVehicle, pendingVehicle } = useVehicle();
  const [refreshing, setRefreshing] = useState(false);

  const {
    healthPercentage,
    healthStatus,
    healthData,
    completedRecommendations,
    loading,
    refreshVehicleHealth,
  } = useVehicleHealth();

  useFocusEffect(
    useCallback(() => {
      refreshVehicleHealth?.();
    }, [refreshVehicleHealth]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshVehicleHealth?.();
    } finally {
      setRefreshing(false);
    }
  }, [refreshVehicleHealth]);

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
              backgroundColor: isDark ? '#1C1C1F' : '#FFFFFF',
              borderColor: isDark ? '#2B2B30' : '#E2E8F0',
            },
          ]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.75}
        >
          <Icon
            name="arrow-back"
            size={20}
            color={theme.text}
          />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text
            style={[
              styles.headerEyebrow,
              { color: theme.accent },
            ]}
          >
            HEALTH METRICS
          </Text>
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
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.accent}
          />
        }
      >
        {/* HEALTH OVERVIEW HERO CARD */}
        <View
          style={[
            styles.healthCard,
            {
              backgroundColor: isDark ? '#141416' : '#FFFFFF',
              borderColor: isDark ? '#262629' : '#E8EDF2',
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
                OVERALL HEALTH SCORE
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
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.06)'
                    : '#F1F5F9',
                },
              ]}
            >
              <Icon
                name={healthStatus.icon}
                size={16}
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
                {healthStatus.label.toUpperCase()}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.progressTrack,
              {
                backgroundColor: isDark ? '#222226' : '#F1F5F9',
              },
            ]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(100, Math.max(0, healthPercentage))}%`,
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
            Calculated dynamically from vehicle specifications, logged maintenance tasks, diagnostic scan findings, and completed service recommendations.
          </Text>
        </View>

        {/* ACTIVE VEHICLE CARD */}
        <View
          style={[
            styles.vehicleCard,
            {
              backgroundColor: isDark ? '#141416' : '#FFFFFF',
              borderColor: isDark ? '#262629' : '#E8EDF2',
            },
          ]}
        >
          <View style={styles.vehicleHeader}>
            <View style={styles.vehicleInfo}>
              <View style={styles.activeVehiclePill}>
                <View style={styles.activeDot} />
                <Text style={styles.activeVehicleLabel}>ACTIVE VEHICLE</Text>
              </View>
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
                  backgroundColor: isDark
                    ? 'rgba(246, 59, 5, 0.12)'
                    : '#FFF2EE',
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
                backgroundColor: isDark ? '#1A1A1D' : '#F8FAFC',
                borderColor: isDark ? '#2B2B30' : '#E2E8F0',
              },
            ]}
            onPress={() => navigation.navigate('Vehicles')}
            activeOpacity={0.8}
          >
            <Icon name="swap-horiz" size={18} color={theme.accent} />
            <Text
              style={[
                styles.changeVehicleText,
                {
                  color: theme.accent,
                },
              ]}
            >
              Switch Vehicle
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
            Interactive breakdown of elements contributing to your score.
          </Text>

          <View
            style={[
              styles.factorCard,
              {
                backgroundColor: isDark ? '#141416' : '#FFFFFF',
                borderColor: isDark ? '#262629' : '#E8EDF2',
              },
            ]}
          >
            <HealthFactor
              icon="build"
              title="Maintenance Logs"
              value={factors.maintenance || 0}
              unit="services"
              theme={theme}
              isDark={isDark}
              categoryType="maintenance"
              onPress={() => navigation.navigate('Maintenance')}
            />

            <View
              style={[
                styles.factorDivider,
                {
                  backgroundColor: isDark ? '#222226' : '#F1F5F9',
                },
              ]}
            />

            <HealthFactor
              icon="medical-services"
              title="Diagnostic History"
              value={factors.diagnostics || 0}
              unit="scans"
              theme={theme}
              isDark={isDark}
              categoryType="diagnostics"
              onPress={() => navigation.navigate('History', { filter: 'diagnosis' })}
            />

            <View
              style={[
                styles.factorDivider,
                {
                  backgroundColor: isDark ? '#222226' : '#F1F5F9',
                },
              ]}
            />

            <HealthFactor
              icon="auto-awesome"
              title="Recommendations"
              value={factors.recommendations || 0}
              unit="actions"
              theme={theme}
              isDark={isDark}
              categoryType="recommendations"
              onPress={() => navigation.navigate('SmartRecommendations')}
            />
          </View>
        </View>

        {/* IMPROVE HEALTH CTA */}
        <TouchableOpacity
          style={[
            styles.recommendationCard,
            {
              backgroundColor: isDark ? '#141416' : '#FFFFFF',
              borderColor: isDark ? 'rgba(246, 59, 5, 0.4)' : '#FDCAC0',
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
                backgroundColor: isDark
                  ? 'rgba(246, 59, 5, 0.15)'
                  : '#FFF2EE',
              },
            ]}
          >
            <Icon
              name="auto-awesome"
              size={24}
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
              Get personalized AI recommendations based on your vehicle's symptoms, mileage, and maintenance needs.
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
                View Smart Recommendations
              </Text>

              <Icon
                name="arrow-forward"
                size={14}
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
                Completed Actions
              </Text>

              <Text
                style={[
                  styles.sectionSubtitle,
                  {
                    color: theme.textSecondary,
                  },
                ]}
              >
                Milestones that helped improve vehicle longevity.
              </Text>
            </View>

            <View
              style={[
                styles.countBadge,
                {
                  backgroundColor: isDark
                    ? 'rgba(246, 59, 5, 0.12)'
                    : '#FFF2EE',
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
                  backgroundColor: isDark ? '#141416' : '#FFFFFF',
                  borderColor: isDark ? '#232326' : '#E8EDF2',
                },
              ]}
            >
              <View
                style={[
                  styles.emptyIconCircle,
                  {
                    backgroundColor: isDark ? '#1C1C1F' : '#F1F5F9',
                  },
                ]}
              >
                <Icon
                  name="task-alt"
                  size={24}
                  color={theme.textSecondary}
                />
              </View>

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
                Complete recommended service actions to increase your vehicle health score.
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
                      backgroundColor: isDark ? '#141416' : '#FFFFFF',
                      borderColor: isDark ? '#232326' : '#E8EDF2',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.completedIcon,
                      {
                        backgroundColor: isDark ? '#13241A' : '#DCFCE7',
                      },
                    ]}
                  >
                    <Icon
                      name="check"
                      size={18}
                      color={isDark ? '#32D583' : '#15803D'}
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
                      +{item.scoreImpact || 0} health impact
                    </Text>
                  </View>
                </View>
              ))
          )}
        </View>

        {/* LAST UPDATED */}
        {healthData?.lastUpdated && (
          <View style={styles.lastUpdatedBox}>
            <Icon name="history" size={13} color={theme.textSecondary} />
            <Text
              style={[
                styles.lastUpdated,
                {
                  color: theme.textSecondary,
                },
              ]}
            >
              Updated{' '}
              {new Date(
                healthData.lastUpdated,
              ).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const HealthFactor = ({
  icon,
  title,
  value,
  unit = 'completed',
  theme,
  isDark,
  categoryType,
  onPress,
}) => {
  let iconBg = theme.accentSoft;
  let iconColor = theme.accent;

  if (categoryType === 'maintenance') {
    iconBg = isDark ? '#13241A' : '#DCFCE7';
    iconColor = isDark ? '#32D583' : '#15803D';
  } else if (categoryType === 'diagnostics') {
    iconBg = isDark ? '#27160F' : '#FEE4DA';
    iconColor = isDark ? '#F63B05' : '#C2410C';
  } else if (categoryType === 'recommendations') {
    iconBg = isDark ? '#19162A' : '#F3E8FF';
    iconColor = isDark ? '#8C7BFF' : '#6D28D9';
  }

  return (
    <TouchableOpacity
      style={styles.factor}
      activeOpacity={0.7}
      onPress={onPress}
      disabled={!onPress}
    >
      <View
        style={[
          styles.factorIcon,
          {
            backgroundColor: iconBg,
          },
        ]}
      >
        <Icon
          name={icon}
          size={18}
          color={iconColor}
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
          {value} {unit}
        </Text>
      </View>

      {onPress && (
        <Icon
          name="chevron-right"
          size={19}
          color={isDark ? '#52525B' : '#CBD5E1'}
        />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 115,
  },

  // ==========================================
  // HEADER
  // ==========================================

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    marginBottom: 12,
    gap: 12,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitleContainer: {
    flex: 1,
    minWidth: 0,
  },

  headerEyebrow: {
    fontFamily: 'Inter-Bold',
    fontSize: 9.5,
    letterSpacing: 1.5,
    marginBottom: 2,
  },

  headerTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 21,
    lineHeight: 26,
  },

  // ==========================================
  // HEALTH CARD
  // ==========================================

  healthCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  overline: {
    fontFamily: 'Inter-Bold',
    fontSize: 9.5,
    letterSpacing: 1.2,
    marginBottom: 4,
  },

  scoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },

  score: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 44,
    lineHeight: 48,
  },

  percent: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 20,
    marginBottom: 6,
    marginLeft: 3,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
    gap: 5,
  },

  statusText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    letterSpacing: 0.8,
  },

  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 14,
    marginBottom: 12,
  },

  progressFill: {
    height: '100%',
    borderRadius: 999,
  },

  healthDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 11.5,
    lineHeight: 17,
  },

  // ==========================================
  // VEHICLE
  // ==========================================

  vehicleCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  activeVehiclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },

  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },

  activeVehicleLabel: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
    color: '#10B981',
    letterSpacing: 0.8,
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
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    lineHeight: 21,
  },

  vehicleDetails: {
    fontFamily: 'Inter-Regular',
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },

  vehicleIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  changeVehicleButton: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 13,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  changeVehicleText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12.5,
  },

  // ==========================================
  // SECTIONS
  // ==========================================

  section: {
    marginBottom: 20,
  },

  sectionTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 17,
    lineHeight: 22,
  },

  sectionSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },

  // ==========================================
  // FACTORS
  // ==========================================

  factorCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    marginTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  factor: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },

  factorIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  factorContent: {
    flex: 1,
  },

  factorTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13.5,
  },

  factorValue: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    marginTop: 1.5,
  },

  factorDivider: {
    height: 1,
    marginVertical: 8,
  },

  // ==========================================
  // RECOMMENDATIONS
  // ==========================================

  recommendationCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 20,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  recommendationIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  recommendationContent: {
    flex: 1,
  },

  recommendationTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
    lineHeight: 20,
  },

  recommendationDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 4,
  },

  recommendationAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },

  recommendationActionText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11.5,
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
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },

  countText: {
    fontFamily: 'Inter-Bold',
    fontSize: 11,
  },

  emptyCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginTop: 10,
    gap: 4,
  },

  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },

  emptyTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14.5,
    textAlign: 'center',
  },

  emptyDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 11.5,
    lineHeight: 16,
    textAlign: 'center',
    maxWidth: 260,
  },

  completedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginTop: 9,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },

  completedIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  completedContent: {
    flex: 1,
  },

  completedTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13,
    lineHeight: 18,
  },

  completedImpact: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10.5,
    marginTop: 2,
  },

  lastUpdatedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 8,
  },

  lastUpdated: {
    fontFamily: 'Inter-Medium',
    fontSize: 10.5,
  },
});

export default VehicleHealthScreen;
