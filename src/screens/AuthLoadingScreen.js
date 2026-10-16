import { ActivityIndicator, Image, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

const AuthLoadingScreen = () => {
  const { theme } = useTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme?.background || '#0A0A0A' }]}
      edges={['top', 'bottom']}
    >
      <StatusBar
        barStyle={theme?.name === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme?.background || '#0A0A0A'}
      />
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={[styles.title, { color: theme?.text || '#FFFFFF' }]}>
          VehiCare
        </Text>
        <Text style={[styles.subtitle, { color: theme?.textSecondary || '#8E8E93' }]}>
          {'An Intelligent Multi-Vehicle Diagnostics\n& Repair Assistance'}
        </Text>
        <ActivityIndicator
          size="small"
          color={theme?.accent || '#F63B05'}
          style={styles.spinner}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logo: {
    width: 90,
    height: 90,
  },
  title: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 32,
    letterSpacing: -0.8,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 280,
  },
  spinner: {
    marginTop: 28,
  },
});

export default AuthLoadingScreen;
