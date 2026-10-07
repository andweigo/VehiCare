import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../theme/ThemeContext';

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch (e) {
    return dateStr;
  }
};

const SubscriptionManagementCard = ({
  isPremium = false,
  subscriptionInterval = 'monthly',
  subscriptionStatus = 'none',
  expiresAt = null,
  vehicleLimit = 1,
  onChangeBilling,
  onUpdatePayment,
  onCancel,
}) => {
  const { theme } = useTheme();

  const isExpired = subscriptionStatus === 'expired';
  const isActive = isPremium && subscriptionStatus === 'active';

  const statusLabel = isActive ? 'ACTIVE' : isExpired ? 'EXPIRED' : 'FREE';

  const billingLabel =
    subscriptionInterval === 'yearly'
      ? 'Yearly (₱1,490/year)'
      : 'Monthly (₱149/month)';

  const formattedExpiration = formatDate(expiresAt) || 'Not set';

  const renderInfoRow = (icon, label, value) => (
    <View style={[styles.infoRow, { borderColor: theme.border }]}>
      <View style={styles.infoLeft}>
        <Icon name={icon} size={18} color={theme.accent} />
        <View style={styles.infoText}>
          <Text style={[styles.infoLabel, { color: theme.text }]}>{label}</Text>
        </View>
      </View>

      <Text style={[styles.infoValue, { color: theme.textSecondary }]}>
        {value}
      </Text>
    </View>
  );

  const renderActionRow = (icon, label, onPress) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.actionRow, { borderColor: theme.border }]}
    >
      <View style={styles.actionLeft}>
        <Icon name={icon} size={18} color={theme.text} />
        <Text style={[styles.actionText, { color: theme.text }]}>{label}</Text>
      </View>
      <Icon name="chevron-right" size={22} color={theme.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      <View style={styles.headerRow}>
        <View
          style={[styles.headerIcon, { backgroundColor: theme.surfaceAlt }]}
        >
          <Icon name="credit-card" size={20} color={theme.accent} />
        </View>

        <View style={styles.headerText}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            Subscription Management
          </Text>
          <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
            Manage your VehiCare plan details
          </Text>
        </View>
      </View>

      {isActive ? (
        <View style={styles.premiumSection}>
          <View style={styles.premiumHeader}>
            <View style={styles.premiumLabel}>
              <Icon name="star" size={18} color={theme.accent} />
              <Text style={[styles.premiumTitle, { color: theme.text }]}>
                Premium Plan
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: theme.accentSoft },
              ]}
            >
              <Text style={[styles.statusText, { color: theme.accent }]}>
                {statusLabel}
              </Text>
            </View>
          </View>

          {renderInfoRow('event', 'Billing Cycle', billingLabel)}
          {renderInfoRow('calendar-month', 'Expiration Date', formattedExpiration)}
          {renderInfoRow(
            'directions-car',
            'Vehicle Limit',
            `${vehicleLimit} vehicles`,
          )}

          {onChangeBilling && (
            <View style={styles.actionSection}>
              {renderActionRow(
                'calendar-month',
                'Change Billing Plan',
                onChangeBilling,
              )}
            </View>
          )}
        </View>
      ) : (
        <View style={styles.freeSection}>
          <View style={styles.premiumHeader}>
            <View style={styles.premiumLabel}>
              <Icon name="person" size={18} color={theme.textSecondary} />
              <Text style={[styles.premiumTitle, { color: theme.text }]}>
                Free Plan
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isExpired
                    ? 'rgba(239, 68, 68, 0.15)'
                    : theme.surfaceAlt,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: isExpired ? '#EF4444' : theme.textSecondary },
                ]}
              >
                {statusLabel}
              </Text>
            </View>
          </View>

          {renderInfoRow('star', 'Current Plan', 'Free')}
          {renderInfoRow('payment', 'Price', '₱0/month')}
          {renderInfoRow(
            'directions-car',
            'Vehicle Limit',
            `${vehicleLimit} vehicle`,
          )}
          {isExpired &&
            renderInfoRow(
              'calendar-month',
              'Previous Expiration',
              formattedExpiration,
            )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  headerText: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 16,
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    marginTop: 4,
  },
  premiumSection: {
    marginTop: 6,
  },
  premiumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  premiumLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoText: {
    marginLeft: 10,
    flexShrink: 1,
  },
  infoLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
  },
  infoValue: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    flexShrink: 1,
    textAlign: 'right',
  },
  actionSection: {
    marginTop: 14,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 12,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    marginLeft: 10,
  },
  freeSection: {
    marginTop: 6,
  },
});

export default SubscriptionManagementCard;
