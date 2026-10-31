import { StyleSheet, Text, View } from 'react-native';
import useDashboardGreeting from '../hooks/useDashboardGreeting';
import { useTheme } from '../theme/ThemeContext';

const DashboardGreeting = () => {
  const { theme } = useTheme();

  const {
    greetingPrefix,
    userName,
  } = useDashboardGreeting();

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.brandTag,
          {
            color: theme.textSecondary || '#8E8E93',
          },
        ]}
      >
        VEHICARE
      </Text>

      <Text
        style={[
          styles.title,
          {
            color: theme.text,
          },
        ]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {greetingPrefix}
        {userName ? `, ${userName}` : ''}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },

  brandTag: {
    fontFamily: 'Inter-Bold',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    marginBottom: 3,
  },

  title: {
    fontFamily: 'Outfit-Bold',
    fontSize: 21,
    fontWeight: '700',
    lineHeight: 27,
    letterSpacing: -0.3,
  },
});

export default DashboardGreeting;