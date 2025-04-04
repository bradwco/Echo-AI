// LiveFeedback.js
import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Image,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Audio } from 'expo-av';
import { auth, getUserSettings } from '../firebase';

export default function LiveFeedback() {
  const [enableSpeed, setEnableSpeed] = useState(false);
  const [enableVolume, setEnableVolume] = useState(false);
  const [enableFiller, setEnableFiller] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [userSettings, setUserSettings] = useState(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [flashVisible, setFlashVisible] = useState(true);
  const [screenFlash, setScreenFlash] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    getUserSettings().then(settings => {
      setUserSettings(settings);
    });
  }, []);

  useEffect(() => {
    let interval;
    let flashInterval;

    const flashScreen = () => {
      setScreenFlash(true);
      setTimeout(() => setScreenFlash(false), 200);
    };

    const analyzeAndVibrate = async (uri) => {
      console.log('1️⃣ Starting analyzeAndVibrate');
      if (!uri) return console.log('❌ No URI');
      if (!userSettings) return console.log('❌ No userSettings');
      if (!auth.currentUser) return console.log('❌ No auth user');
      if (!userSettings || !auth.currentUser || !uri) return;
      console.log('Sending audio to backend for analysis...');
      console.log('Audio URI:', uri);

      const formData = new FormData();
      formData.append('userId', auth.currentUser.uid);
      formData.append('audio', {
        uri,
        name: 'clip.m4a',
        type: 'audio/m4a',
      });

      try {
        const res = await fetch('http://192.168.4.118:5000/analyze_live', {
          method: 'POST',
          body: formData,
        });
        const text = await res.text();
        console.log('📨 Raw backend text:', text);
        let data;
        try {
          data = JSON.parse(text);
        } catch (err) {
          console.log('❌ Failed to parse backend response:', err);
          return;
        }
        console.log('Backend response:', data);

        const wpm = Number(data.wpm);
        const volume = Number(data.volume);
        const filler = Number(data.fillerCount);

        console.log('Checking thresholds:', {
          enableSpeed, actualWPM: wpm, target: userSettings.speedValue,
          enableVolume, actualVol: volume, target: userSettings.volumeValue,
          enableFiller, actualFiller: filler, target: userSettings.fillerCount,
        });

        if (enableSpeed && !isNaN(wpm) && wpm > userSettings.speedValue) {
          console.log('⚠️ Speed threshold exceeded!');
          flashScreen();
        }
        if (enableVolume && !isNaN(volume) && volume > userSettings.volumeValue) {
          console.log('⚠️ Volume threshold exceeded!');
          flashScreen();
        }
        if (enableFiller && !isNaN(filler) && filler > userSettings.fillerCount) {
          console.log('⚠️ Filler threshold exceeded!');
          flashScreen();
        }
      } catch (err) {
        console.log('Analysis error:', err);
      }
    };

    const loopRecording = async () => {
      try {
        const activeRecording = recording;
        if (!activeRecording) return;
        console.log('Stopping previous recording...');
        await activeRecording.stopAndUnloadAsync();
        const uri = activeRecording.getURI();
        console.log('📦 Recorded file URI:', uri);
        if (!uri) return console.log('❌ URI is null');
        setRecording(null);
        console.log('Analyzing URI...');
        await analyzeAndVibrate(uri);
        console.log('Starting new recording...');
        await startRecording();
      } catch (err) {
        console.log('Loop error:', err);
      }
    };

    if (isRecording) {
      setShowOverlay(true);
      flashInterval = setInterval(() => setFlashVisible(v => !v), 500);
      startRecording();
      interval = setInterval(loopRecording, 5000);
    } else {
      clearInterval(interval);
      clearInterval(flashInterval);
      setShowOverlay(false);
      if (recording) {
        recording.stopAndUnloadAsync().catch(err => {
          if (!err.message.includes('already been unloaded')) {
            console.log('Stop recording error:', err);
          }
        });
        setRecording(null);
      }
    }

    return () => {
      clearInterval(interval);
      clearInterval(flashInterval);
      if (recording) {
        recording.stopAndUnloadAsync().catch(err => {
          if (!err.message.includes('already been unloaded')) {
            console.log('Stop recording error:', err);
          }
        });
        setRecording(null);
      }
      setShowOverlay(false);
    };
  }, [isRecording, userSettings, enableSpeed, enableVolume, enableFiller]);

  const startRecording = async () => {
    try {
      if (recording) {
        console.log('Recording already in progress');
        return;
      }
      await Audio.requestPermissionsAsync();
      console.log('✅ Microphone permission granted');
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      console.log('🎤 Recording started');
    } catch (err) {
      console.log('Recording error:', err);
    }
  };

  const toggleRecording = () => {
    console.log('🔴 Play/Pause button tapped');
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.15, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true })
    ]).start();
    setIsRecording(prev => !prev);
  };

  return (
    <View style={[styles.screen, screenFlash && { backgroundColor: 'red' }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Image source={require('../assets/EchoLogoGray.png')} style={styles.logo} />
        <Text style={styles.title}>Live Feedback Settings</Text>

        <View style={styles.settingRow}>
          <Text style={styles.label}>Speed</Text>
          <Switch value={enableSpeed} onValueChange={() => {
            setEnableSpeed(!enableSpeed);
            setEnableVolume(false);
            setEnableFiller(false);
          }} />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.label}>Volume</Text>
          <Switch value={enableVolume} onValueChange={() => {
            setEnableSpeed(false);
            setEnableVolume(!enableVolume);
            setEnableFiller(false);
          }} />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.label}>Filler</Text>
          <Switch value={enableFiller} onValueChange={() => {
            setEnableSpeed(false);
            setEnableVolume(false);
            setEnableFiller(!enableFiller);
          }} />
        </View>

        <TouchableOpacity style={styles.buttonWrapper} onPress={toggleRecording}>
          <Animated.View style={[styles.controlButton, { transform: [{ scale: scaleAnim }] }]}> 
            <Text style={styles.playIcon}>{isRecording ? '❚❚' : '▶'}</Text>
          </Animated.View>
        </TouchableOpacity>
      </ScrollView>

      {showOverlay && (
        <View style={styles.overlay} pointerEvents="box-none">
          {flashVisible && <Text style={styles.recordingText}>Recording...</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  container: { paddingTop: 60, paddingBottom: 30, paddingHorizontal: 25, alignItems: 'center' },
  logo: { width: 60, height: 60, resizeMode: 'contain', marginBottom: 10 },
  title: { fontSize: 20, fontWeight: 'bold', fontFamily: 'AveriaSerifLibre-Regular', marginBottom: 30 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginVertical: 12 },
  label: { fontSize: 18, fontWeight: 'bold', fontFamily: 'AveriaSerifLibre-Regular' },
  buttonWrapper: { marginTop: 30, alignSelf: 'center', zIndex: 2 },
  controlButton: { backgroundColor: '#0B132B', width: 160, height: 160, borderRadius: 60, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowOffset: { width: 0, height: 4 }, elevation: 10 },
  playIcon: { fontSize: 64, color: '#fff', fontWeight: 'bold' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  recordingText: { fontSize: 28, fontWeight: 'bold', color: 'red', backgroundColor: '#fff', padding: 10, borderRadius: 8 }
});