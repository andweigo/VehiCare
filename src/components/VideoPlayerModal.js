import React, { useState } from 'react';
import {
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Video from 'react-native-video';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../theme/ThemeContext';

const VideoPlayerModal = ({ visible, videoUri, onClose, title = 'Video Playback' }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [paused, setPaused] = useState(false);

  if (!videoUri) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={[styles.backdrop, { paddingTop: Platform.OS === 'android' ? insets.top : 0 }]}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
          {/* TOP CONTROL BAR */}
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* VIDEO PLAYER VIEW */}
          <View style={styles.videoContainer}>
            <Video
              source={{ uri: videoUri }}
              style={styles.video}
              controls={true}
              paused={paused}
              resizeMode="contain"
              onEnd={() => setPaused(true)}
              onError={err => console.warn('[VideoPlayerModal] Playback error:', err)}
            />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    height: 56,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  title: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
});

export default VideoPlayerModal;
