import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../theme/ThemeContext';

/**
 * Category-themed Icon Fill Palette for Dashboard Action Cards
 */
const getActionCardCategoryStyle = (categoryKey = '', isDark = false) => {
  const norm = String(categoryKey).toLowerCase();

  if (norm.includes('diag') || norm.includes('wrong') || norm.includes('problem')) {
    return {
      icon: 'medical-services',
      color: isDark ? '#F63B05' : '#C2410C',
      background: isDark ? '#27160F' : '#FEE4DA',
    };
  }

  if (norm.includes('shop') || norm.includes('profess') || norm.includes('help')) {
    return {
      icon: 'storefront',
      color: isDark ? '#F59E0B' : '#B45309',
      background: isDark ? '#29220F' : '#FEF3C7',
    };
  }

  if (norm.includes('maint') || norm.includes('keep')) {
    return {
      icon: 'build',
      color: isDark ? '#32D583' : '#15803D',
      background: isDark ? '#13241A' : '#DCFCE7',
    };
  }

  if (norm.includes('recommend') || norm.includes('smart') || norm.includes('ai')) {
    return {
      icon: 'auto-awesome',
      color: isDark ? '#8C7BFF' : '#6D28D9',
      background: isDark ? '#19162A' : '#F3E8FF',
    };
  }

  return {
    icon: 'star',
    color: isDark ? '#F63B05' : '#C2410C',
    background: isDark ? '#27160F' : '#FEE4DA',
  };
};

const DashboardActionCard = ({
  iconName,
  categoryKey,
  title,
  description,
  onPress,
}) => {
  const { theme, themeName } = useTheme();
  const isDark = themeName === 'dark';

  const categoryStyle = getActionCardCategoryStyle(categoryKey || title || iconName, isDark);
  const displayIcon = iconName || categoryStyle.icon;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: theme.surface || '#151515',
          borderColor: theme.border || '#292929',
        },
      ]}
      activeOpacity={0.84}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      onPress={onPress}
    >
      {/* Top Header Row: Category Icon Badge & Chevron */}
      <View style={styles.topRow}>
        <View style={[styles.iconContainer, { backgroundColor: categoryStyle.background }]}>
          <Icon name={displayIcon} size={21} color={categoryStyle.color} />
        </View>

        <View style={styles.chevronBox}>
          <Icon name="chevron-right" size={18} color={theme.textSecondary} />
        </View>
      </View>

      {/* Content Area */}
      <View style={styles.contentWrap}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
          {title}
        </Text>
        <Text style={[styles.description, { color: theme.textSecondary }]} numberOfLines={3}>
          {description}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '48.5%',
    minHeight: 165,
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  title: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  description: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },
});

export default DashboardActionCard;
