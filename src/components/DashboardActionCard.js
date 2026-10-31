import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../theme/ThemeContext';

const DashboardActionCard = ({
  iconName,
  title,
  description,
  onPress,
}) => {
  const { theme, themeName } = useTheme();
  const isDark = themeName === 'dark';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: theme?.glassSurface || (isDark ? 'rgba(20, 21, 25, 0.90)' : '#18181B'),
          borderColor: theme?.glassBorder || (isDark ? 'rgba(255, 255, 255, 0.14)' : '#2E2F35'),
        },
      ]}
      activeOpacity={0.82}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      onPress={onPress}
    >
      {/* Top Header Row: Outline Accent Icon & Top-Right Diagonal Arrow */}
      <View style={styles.topRow}>
        <Icon
          name={iconName || 'build'}
          size={26}
          color="#F5501C"
        />

        <Icon
          name="call-made"
          size={18}
          color="#6E6E73"
        />
      </View>

      {/* Content Area */}
      <View style={styles.contentWrap}>
        <Text
          style={styles.title}
          numberOfLines={2}
        >
          {title}
        </Text>
        <Text
          style={styles.description}
          numberOfLines={2}
        >
          {description}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(20, 21, 25, 0.90)',
    borderColor: 'rgba(255, 255, 255, 0.14)',
    width: '48%',
    minHeight: 132,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  contentWrap: {
    justifyContent: 'flex-end',
  },
  title: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 18,
    letterSpacing: -0.2,
  },
  description: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: '#8E8E93',
    lineHeight: 15,
    marginTop: 3,
  },
});

export default DashboardActionCard;
