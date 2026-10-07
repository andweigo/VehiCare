import { StyleSheet, Text, View } from 'react-native';
import useDashboardGreeting from '../hooks/useDashboardGreeting';
import { useTheme } from '../theme/ThemeContext';

const DashboardGreeting = () => {
  const { theme } = useTheme();

  const {
    greetingPrefix,
    userName,
    subtitleText,
  } = useDashboardGreeting();

  return (
    <View style={styles.container}>
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
        {userName ? ', ' : ''}
        {userName ? (
          <Text
            style={{
              color: theme.accent,
            }}
          >
            {userName}
          </Text>
        ) : null}
      </Text>

      <Text
        style={[
          styles.subtitle,
          {
            color: theme.textSecondary,
          },
        ]}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {subtitleText}
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

  title: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 23,
    lineHeight: 30,
  },

  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
});

export default DashboardGreeting;