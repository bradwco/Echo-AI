import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import * as Sharing from 'expo-sharing';
import { uploadAudioAndTranscribe, auth } from '../firebase';  // Import the new function

const { width } = Dimensions.get('window');

export default function Record() {
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [time, setTime] = useState(0);
  const intervalRef = useRef(null);
  const [recordingURI, setRecordingURI] = useState(null);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const finishScaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRecording) {
      intervalRef.current = setInterval(() => setTime((prev) => prev + 1), 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRecording]);

  const startRecording = async () => {
    try {
      if (recording) {
        await recording.stopAndUnloadAsync();
        setRecording(null);
      }

      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const pauseRecording = async () => {
    if (recording) {
      await recording.pauseAsync();
      setIsRecording(false);
    }
  };

  const resumeRecording = async () => {
    if (recording) {
      await recording.startAsync();
      setIsRecording(true);
    }
  };

  const toggleRecording = async () => {
    if (!recording) {
      await startRecording();
    } else if (isRecording) {
      await pauseRecording();
    } else {
      await resumeRecording();
    }
  };

  const stopRecording = async () => {
    try {
      if (recording) {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        setRecordingURI(uri);
        setRecording(null);
        setIsRecording(false);
        return uri;
      }
    } catch (err) {
      console.error('Stop recording error:', err);
    }
  };

  const resetState = () => {
    setRecording(null);
    setIsRecording(false);
    setTime(0);
    setRecordingURI(null);
  };

  const handleFinish = async () => {
    const uri = await stopRecording();
    clearInterval(intervalRef.current);
    setTime(0);

    if (uri) {
      const user = auth.currentUser;
      if (!user) return;

      // Call the new function to upload the audio, send it for transcription, and store the result in Firebase
      await uploadAudioAndTranscribe(user.uid, uri);

      Alert.alert('✅ Session Saved', 'Your recording session was successfully created.');

      if (await Sharing.isAvailableAsync()) {
        try {
          await Sharing.shareAsync(uri);
        } catch (err) {
          console.error('Error sharing file:', err);
        }
      } else {
        alert('Sharing not available on this device.');
      }
    }

    resetState();
  };

  const formatTime = (seconds) => {
    const min = Math.floor(seconds / 60).toString().padStart(2, '0');
    const sec = (seconds % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
  };

  const animateButton = (animRef) => {
    Animated.sequence([
      Animated.timing(animRef, {
        toValue: 1.15,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(animRef, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <Image source={require('../assets/EchoLogoGray.png')} style={styles.logo} />
        <Text style={styles.header}>Recording Session</Text>
      </View>

      <View style={styles.bottomContainer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={async () => {
              animateButton(scaleAnim);
              await toggleRecording();
            }}
          >
            <Animated.View style={[styles.controlButton, { transform: [{ scale: scaleAnim }] }]}>
              <Text style={styles.playIcon}>{isRecording ? '❚❚' : '▶'}</Text>
            </Animated.View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={1}
            onPress={async () => {
              animateButton(finishScaleAnim);
              await handleFinish();
            }}
          >
            <Animated.View style={[styles.controlButton, { transform: [{ scale: finishScaleAnim }] }]}>
              <Image source={require('../assets/check.png')} style={styles.finishIcon} />
            </Animated.View>
          </TouchableOpacity>
        </View>

        <Text style={styles.timer}>{formatTime(time)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topSection: {
    alignItems: 'center',
    paddingTop: 60,
  },
  logo: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: 'AveriaSerifLibre-Regular',
  },
  bottomContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#fff',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
    position: 'relative',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: -40,
    width: '100%',
    zIndex: 10,
    gap: 40,
  },
  controlButton: {
    backgroundColor: '#0B132B',
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  playIcon: {
    fontSize: 32,
    color: '#fff',
  },
  finishIcon: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
    tintColor: 'white',
  },
  timer: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 20,
  },
});
