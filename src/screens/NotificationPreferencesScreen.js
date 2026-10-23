import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import CustomToast from '../components/CustomToast';
import { DEFAULT_PREFERENCES, getNotificationPreferences, updateNotificationPreferences } from '../services/notificationService';
import { requestNotificationPermission } from '../services/permissionService';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../theme/ThemeContext';

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  const value = `${hour}:00`;
  const period = i >= 12 ? 'PM' : 'AM';
  const displayHour = i % 12 === 0 ? 12 : i % 12;
  const label = `${displayHour.toString().padStart(2, '0')}:00 ${period}`;
  return { value, label };
});

const formatTimeLabel = (timeStr) => {
  if (!timeStr) return '--:--';
  const matched = TIME_OPTIONS.find((opt) => opt.value === timeStr);
  if (matched) return matched.label;
  const parts = String(timeStr).split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parts[1] || '00';
  const period = h >= 12 ? 'PM' : 'AM';
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${displayHour.toString().padStart(2, '0')}:${m} ${period}`;
};

const NotificationPreferencesScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState(DEFAULT_PREFERENCES);
  const [toast, setToast] = useState({ visible: false, type: 'info', title: '', message: '' });

  // Quiet hours time picker state
  const [timePickerTarget, setTimePickerTarget] = useState(null); // 'start' | 'end' | null

  const loadPreferences = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getNotificationPreferences();
      setPrefs({ ...DEFAULT_PREFERENCES, ...data });
    } catch (e) {
      console.warn('Error loading notification preferences:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const handleToggle = async (key, forcedValue = null) => {
    const newValue = forcedValue !== null ? forcedValue : !prefs[key];

    if (key === 'push_notifications' && newValue === true) {
      const permResult = await requestNotificationPermission({ showSettingsDialog: true });
      if (!permResult.isGranted) {
        return;
      }
    }

    const updated = { ...prefs, [key]: newValue };
    setPrefs(updated);

    try {
      setSaving(true);
      await updateNotificationPreferences({ [key]: newValue });
      showToast('success', 'Preferences Saved', 'Your notification settings have been updated.');
    } catch (e) {
      setPrefs(prefs); // rollback
      showToast('error', 'Update Failed', 'Could not update notification preferences.');
    } finally {
      setSaving(false);
    }
  };

  const handleTimeSelect = async (timeVal) => {
    if (!timePickerTarget) return;

    const key = timePickerTarget === 'start' ? 'quiet_hours_start' : 'quiet_hours_end';
    setTimePickerTarget(null);

    const updated = { ...prefs, [key]: timeVal };
    setPrefs(updated);

    try {
      setSaving(true);
      await updateNotificationPreferences({ [key]: timeVal });
      showToast('success', 'Quiet Hours Updated', `Quiet hours ${timePickerTarget} set to ${formatTimeLabel(timeVal)}.`);
    } catch (e) {
      showToast('error', 'Update Failed', 'Could not update quiet hours.');
    } finally {
      setSaving(false);
    }
  };

  const showToast = (type, title, message) => {
    setToast({ visible: true, type, title, message });
    setTimeout(() => {
      setToast(t => ({ ...t, visible: false }));
    }, 3000);
  };

  const renderToggleItem = ({
    icon,
    title,
    subtitle,
    value,
    onToggle,
    locked = false,
    badgeText = null,
  }) => (
    <View style={[styles.toggleItem, { backgroundColor: theme.surface }]}>
      <View style={[styles.itemIconBg, { backgroundColor: theme.accentSoft || theme.surfaceAlt }]}>
        <Icon name={icon} size={20} color={theme.accent} />
      </View>

      <View style={styles.itemContent}>
        <View style={styles.itemTitleRow}>
          <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={1}>
            {title}
          </Text>
          {badgeText && (
            <View style={styles.lockedBadge}>
              <Text style={styles.lockedBadgeText}>{badgeText}</Text>
            </View>
          )}
        </View>

        {subtitle ? (
          <Text style={[styles.itemSubtitle, { color: theme.textSecondary }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <Switch
        value={value}
        onValueChange={locked ? () => {} : onToggle}
        disabled={locked || saving}
        trackColor={{ false: theme.border, true: theme.accent }}
        thumbColor="#FFFFFF"
      />
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
      <CustomToast
        visible={toast.visible}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onHide={() => setToast(t => ({ ...t, visible: false }))}
      />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <Icon name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {t('notificationPreferences', 'Notification Preferences')}
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            {t('notificationSubtitle', 'Control how VehiCare keeps you informed')}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            {t('loading', 'Loading...')}
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* GENERAL */}
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('generalSec', 'GENERAL')}</Text>
            <View style={[styles.cardGroup, { borderColor: theme.border }]}>
              {renderToggleItem({
                icon: 'notifications-active',
                title: t('pushNotif', 'Push Notifications'),
                subtitle: t('pushNotifSub', 'Receive system alerts on your device'),
                value: prefs.push_notifications,
                onToggle: () => handleToggle('push_notifications'),
              })}

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              {renderToggleItem({
                icon: 'smartphone',
                title: t('inAppNotif', 'In-App Notifications'),
                subtitle: t('inAppNotifSub', 'Show notification feeds inside the app'),
                value: prefs.in_app_notifications,
                onToggle: () => handleToggle('in_app_notifications'),
              })}
            </View>
          </View>

          {/* VEHICLE */}
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('vehicleSec', 'VEHICLE')}</Text>
            <View style={[styles.cardGroup, { borderColor: theme.border }]}>
              {renderToggleItem({
                icon: 'directions-car',
                title: t('vehicleUpdates', 'Vehicle Updates'),
                subtitle: t('vehicleUpdatesSub', 'Get notified when your vehicle info changes'),
                value: prefs.vehicle_updates,
                onToggle: () => handleToggle('vehicle_updates'),
              })}

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              {renderToggleItem({
                icon: 'edit',
                title: t('editRequests', 'Vehicle Edit Requests'),
                subtitle: t('editRequestsSub', 'Updates on submitted vehicle correction requests'),
                value: prefs.vehicle_edit_requests,
                onToggle: () => handleToggle('vehicle_edit_requests'),
              })}
            </View>
          </View>

          {/* AI DIAGNOSTICS */}
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('aiDiagSec', 'AI DIAGNOSTICS')}</Text>
            <View style={[styles.cardGroup, { borderColor: theme.border }]}>
              {renderToggleItem({
                icon: 'auto-awesome',
                title: t('diagResults', 'Diagnostic Results'),
                subtitle: t('diagResultsSub', 'Get notified when an AI diagnosis is ready'),
                value: prefs.diagnostic_results,
                onToggle: () => handleToggle('diagnostic_results'),
              })}

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              {renderToggleItem({
                icon: 'warning',
                title: t('highSeverity', 'High-Severity Issues'),
                subtitle: t('highSeveritySub', 'Alerts when AI detects serious vehicle issues'),
                value: prefs.high_severity_alerts,
                onToggle: () => handleToggle('high_severity_alerts'),
              })}

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              {renderToggleItem({
                icon: 'error-outline',
                title: t('criticalIssues', 'Critical Issues'),
                subtitle: t('criticalIssuesSub', 'Important safety alerts requiring immediate action'),
                value: true,
                onToggle: () => {},
                locked: true,
                badgeText: 'ALWAYS ON',
              })}
            </View>
          </View>

          {/* MAINTENANCE */}
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('maintSec', 'MAINTENANCE')}</Text>
            <View style={[styles.cardGroup, { borderColor: theme.border }]}>
              {renderToggleItem({
                icon: 'build',
                title: t('maintReminders', 'Maintenance Reminders'),
                subtitle: t('maintRemindersSub', 'Reminders for upcoming vehicle maintenance'),
                value: prefs.maintenance_reminders,
                onToggle: () => handleToggle('maintenance_reminders'),
              })}

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              {renderToggleItem({
                icon: 'alarm-off',
                title: t('overdueMaint', 'Overdue Maintenance'),
                subtitle: t('overdueMaintSub', 'Notified when scheduled maintenance becomes overdue'),
                value: prefs.overdue_maintenance,
                onToggle: () => handleToggle('overdue_maintenance'),
              })}

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              {renderToggleItem({
                icon: 'event-repeat',
                title: t('scheduleUpdates', 'Schedule Updates'),
                subtitle: t('scheduleUpdatesSub', 'Updates when your service schedule changes'),
                value: prefs.maintenance_schedule_updates,
                onToggle: () => handleToggle('maintenance_schedule_updates'),
              })}
            </View>
          </View>

          {/* REPAIR & SERVICE */}
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('repairSec', 'REPAIR & SERVICE')}</Text>
            <View style={[styles.cardGroup, { borderColor: theme.border }]}>
              {renderToggleItem({
                icon: 'place',
                title: t('profAssistance', 'Professional Assistance'),
                subtitle: t('profAssistanceSub', 'Notified when diagnosis recommends service'),
                value: prefs.professional_assistance,
                onToggle: () => handleToggle('professional_assistance'),
              })}

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              {renderToggleItem({
                icon: 'storefront',
                title: t('nearbyShops', 'Nearby Repair Shops'),
                subtitle: t('nearbyShopsSub', 'Recommendations for trusted nearby repair shops'),
                value: prefs.nearby_repair_shops,
                onToggle: () => handleToggle('nearby_repair_shops'),
              })}
            </View>
          </View>

          {/* QUIET HOURS */}
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('quietHoursSec', 'QUIET HOURS')}</Text>
            <View style={[styles.cardGroup, { borderColor: theme.border }]}>
              {renderToggleItem({
                icon: 'do-not-disturb-on',
                title: t('quietHours', 'Quiet Hours'),
                subtitle: t('quietHoursSub', 'Pause non-critical notifications during specific hours'),
                value: prefs.quiet_hours_enabled,
                onToggle: () => handleToggle('quiet_hours_enabled'),
              })}

              {prefs.quiet_hours_enabled && (
                <>
                  <View style={[styles.divider, { backgroundColor: theme.border }]} />

                  <View style={styles.quietHoursTimeRow}>
                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={() => setTimePickerTarget('start')}
                      style={[styles.timePickerButton, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
                    >
                      <Text style={[styles.timePickerLabel, { color: theme.textSecondary }]}>From</Text>
                      <Text style={[styles.timePickerValue, { color: theme.text }]}>
                        {formatTimeLabel(prefs.quiet_hours_start)}
                      </Text>
                    </TouchableOpacity>

                    <Text style={[styles.timeSeparator, { color: theme.textSecondary }]}>—</Text>

                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={() => setTimePickerTarget('end')}
                      style={[styles.timePickerButton, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
                    >
                      <Text style={[styles.timePickerLabel, { color: theme.textSecondary }]}>To</Text>
                      <Text style={[styles.timePickerValue, { color: theme.text }]}>
                        {formatTimeLabel(prefs.quiet_hours_end)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>

            <Text style={[styles.safetyCaption, { color: theme.textSecondary }]}>
              Critical vehicle safety notifications may still be delivered during quiet hours.
            </Text>
          </View>
        </ScrollView>
      )}

      {/* TIME PICKER MODAL */}
      <Modal
        visible={Boolean(timePickerTarget)}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setTimePickerTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setTimePickerTarget(null)}
          />
          <View style={[styles.timeModalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {/* Header Row: Badge Pill + Circular X Close Button */}
            <View style={styles.modalHeaderRow}>
              <View
                style={[
                  styles.modalBadgePill,
                  { backgroundColor: theme.accentSoft || 'rgba(246, 59, 5, 0.15)' },
                ]}
              >
                <Icon name="schedule" size={14} color={theme.accent || '#F63B05'} />
                <Text style={[styles.modalBadgeText, { color: theme.accent || '#F63B05' }]}>
                  QUIET HOURS
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setTimePickerTarget(null)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                activeOpacity={0.7}
                style={[styles.closeCircleBtn, { backgroundColor: theme.surfaceAlt }]}
                accessibilityLabel="Close time picker"
              >
                <Icon name="close" size={16} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.timeModalTitle, { color: theme.text }]}>
              {timePickerTarget === 'start' ? 'Quiet Hours Start Time' : 'Quiet Hours End Time'}
            </Text>
            <Text style={[styles.timeModalSubtitle, { color: theme.textSecondary }]}>
              Choose when notifications should be silenced.
            </Text>

            <View style={[styles.modalDivider, { backgroundColor: theme.border }]} />

            <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={true}>
              {TIME_OPTIONS.map(item => {
                const isSelected =
                  (timePickerTarget === 'start' ? prefs.quiet_hours_start : prefs.quiet_hours_end) === item.value;
                return (
                  <TouchableOpacity
                    key={item.value}
                    activeOpacity={0.7}
                    onPress={() => handleTimeSelect(item.value)}
                    style={[
                      styles.timeOptionItem,
                      {
                        backgroundColor: isSelected ? (theme.accentSoft || 'rgba(246, 59, 5, 0.12)') : theme.surfaceAlt,
                        borderColor: isSelected ? theme.accent : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.timeOptionText,
                        {
                          color: isSelected ? theme.accent : theme.text,
                          fontFamily: isSelected ? 'Outfit-Bold' : 'Inter-Medium',
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                    {isSelected && (
                      <View style={[styles.timeCheckCircle, { backgroundColor: theme.accent }]}>
                        <Icon name="check" size={13} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    marginTop: 12,
  },

  /* HEADER */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 22,
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    marginTop: 2,
  },

  /* SECTIONS */
  sectionBlock: {
    marginTop: 20,
  },
  sectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    letterSpacing: 1.4,
    marginBottom: 8,
    paddingLeft: 4,
  },
  cardGroup: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    marginHorizontal: 12,
    opacity: 0.6,
  },

  /* TOGGLE ITEM */
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  itemIconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
    paddingRight: 8,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
  },
  itemSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  lockedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  lockedBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
    color: '#10B981',
  },

  /* QUIET HOURS */
  quietHoursTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  timePickerButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  timePickerLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    marginBottom: 2,
  },
  timePickerValue: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
  },
  timeSeparator: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    marginHorizontal: 10,
  },
  safetyCaption: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    marginTop: 8,
    paddingLeft: 4,
    lineHeight: 16,
  },

  /* MODAL */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  timeModalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 14,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 16,
    gap: 5,
  },
  modalBadgeText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 10.5,
    letterSpacing: 0.6,
  },
  closeCircleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeModalTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 17,
    lineHeight: 22,
    marginBottom: 4,
  },
  timeModalSubtitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 11.5,
    lineHeight: 16,
    marginBottom: 10,
  },
  modalDivider: {
    height: 1,
    marginBottom: 12,
  },
  timeOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 6,
  },
  timeOptionText: {
    fontSize: 13,
  },
  timeCheckCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default NotificationPreferencesScreen;
