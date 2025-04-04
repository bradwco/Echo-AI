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
  Vibration,
  Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import { auth, getUserSettings } from '../firebase';

export default function LiveFeedback() {
  const [enableSpeed, setEnableSpeed] = useState(false);
  const [enableVolume, setEnableVolume] = useState(false);
  const [enableFiller, setEnableFiller] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [userSettings, setUserSettings] = useState({});
  const [showOverlay, setShowOverlay] = useState(false);
  const [flashVisible, setFlashVisible] = useState(true);
  const [screenFlash, setScreenFlash] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingIndicator, setRecordingIndicator] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const finishScaleAnim = useRef(new Animated.Value(1)).current;
  const recordingInterval = useRef(null);
  const flashInterval = useRef(null);
  const indicatorInterval = useRef(null);
  const isMounted = useRef(true);
  const lastVibrationTime = useRef(0);
  const [expandedSpeed, setExpandedSpeed] = useState(false);
  const [expandedVolume, setExpandedVolume] = useState(false);
  const [expandedFiller, setExpandedFiller] = useState(false);
  const activeRecordingRef = useRef(null);
  const [flashMessage, setFlashMessage] = useState('');
  const [currentMetrics, setCurrentMetrics] = useState({
    speed: '0 WPM',
    volume: '0 dB',
    zeroPoint: 'Not calibrated',
    fillers: '0'
  });
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const triggerCounters = useRef(null);
  const [metricsHistory, setMetricsHistory] = useState({
    speed: [],
    volume: [],
    filler: []
  });

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!auth.currentUser) {
      console.warn('⚠️ No authenticated user');
      return;
    }

    getUserSettings(auth.currentUser.uid).then(settings => {
      if (!isMounted.current) return;
      console.log('📥 Retrieved user settings:', settings);
      if (!settings) {
        console.warn('⚠️ No user settings returned');
        setUserSettings({});
        return;
      }
      setUserSettings(settings);
    }).catch(err => {
      console.error('❌ Error fetching user settings:', err);
      if (isMounted.current) {
        setUserSettings({});
      }
    });
  }, []);

  const flashScreen = () => {
    if (!isMounted.current) return;
    console.log('🔴 Screen flash triggered');
    setScreenFlash(true);
    setTimeout(() => {
      if (isMounted.current) {
        setScreenFlash(false);
        setFlashMessage('');
      }
    }, 3000);
  };

  const checkThresholds = (data) => {
    if (!userSettings) {
      console.log('❌ No user settings available');
      return false;
    }

    console.log('🔍 Checking thresholds with settings:', {
      speedValue: userSettings.speedValue,
      volumeValue: userSettings.volumeValue,
      fillerCount: userSettings.fillerCount,
      speedTrigger: userSettings.speedTrigger,
      volumeTrigger: userSettings.volumeTrigger,
      fillerTrigger: userSettings.fillerTrigger
    });

    console.log('📊 Current metrics:', {
      speed: data.speed,
      volume: data.volume,
      filler_count: data.filler_count
    });

    // Update metrics history
    updateHistory(data);

    // Check each metric if enabled
    let speedExceeded = false;
    let volumeExceeded = false;
    let fillerExceeded = false;

    if (enableSpeed) {
      const [minSpeed, maxSpeed] = userSettings.speedValue.split('-').map(Number);
      const avgSpeed = metricsHistory.speed.slice(-2).reduce((a, b) => a + b, 0) / 2;
      speedExceeded = avgSpeed < minSpeed || avgSpeed > maxSpeed;
      console.log('🏃 Speed check:', { avgSpeed, minSpeed, maxSpeed, exceeded: speedExceeded });
    }

    if (enableVolume) {
      const [minVolume, maxVolume] = userSettings.volumeValue.split('-').map(Number);
      const avgVolume = metricsHistory.volume.slice(-2).reduce((a, b) => a + b, 0) / 2;
      volumeExceeded = avgVolume < minVolume || avgVolume > maxVolume;
      console.log('🔊 Volume check:', { avgVolume, minVolume, maxVolume, exceeded: volumeExceeded });
    }

    if (enableFiller) {
      const fillerThreshold = parseInt(userSettings.fillerCount);
      const avgFiller = metricsHistory.filler.slice(-2).reduce((a, b) => a + b, 0) / 2;
      fillerExceeded = avgFiller > fillerThreshold;
      console.log('🗣️ Filler check:', { avgFiller, threshold: fillerThreshold, exceeded: fillerExceeded });
    }

    // Check if any enabled metric has exceeded its threshold for the required number of consecutive readings
    const speedTriggerCount = parseInt(userSettings.speedTrigger || '3');
    const volumeTriggerCount = parseInt(userSettings.volumeTrigger || '3');
    const fillerTriggerCount = parseInt(userSettings.fillerTrigger || '3');

    if (enableSpeed && speedExceeded) {
      triggerCounters.speed++;
      if (triggerCounters.speed >= speedTriggerCount) {
        console.log(`🚨 Speed threshold exceeded for ${speedTriggerCount} consecutive readings`);
        return true;
      }
    } else {
      triggerCounters.speed = 0;
    }

    if (enableVolume && volumeExceeded) {
      triggerCounters.volume++;
      if (triggerCounters.volume >= volumeTriggerCount) {
        console.log(`🚨 Volume threshold exceeded for ${volumeTriggerCount} consecutive readings`);
        return true;
      }
    } else {
      triggerCounters.volume = 0;
    }

    if (enableFiller && fillerExceeded) {
      triggerCounters.filler++;
      if (triggerCounters.filler >= fillerTriggerCount) {
        console.log(`🚨 Filler threshold exceeded for ${fillerTriggerCount} consecutive readings`);
        return true;
      }
    } else {
      triggerCounters.filler = 0;
    }

    return false;
  };

  const analyzeAndVibrate = async (uri) => {
    console.log('🔍 Starting analyzeAndVibrate with URI:', uri);
    
    if (!uri || !auth.currentUser || !userSettings) {
      console.log('❌ Missing required data for analysis:', { 
        hasUri: !!uri, 
        hasUser: !!auth.currentUser, 
        hasSettings: !!userSettings 
      });
      return;
    }

    const formData = new FormData();
    formData.append('audio', {
      uri,
      name: 'clip.m4a',
      type: 'audio/m4a',
    });

    try {
      console.log('🎤 Sending audio for analysis...');
      console.log('🌐 Backend URL:', 'http://192.168.4.118:5000/analyze_live');
      
      const startTime = Date.now();
      
      const res = await fetch('http://192.168.4.118:5000/analyze_live', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });
      
      console.log('📡 Response status:', res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ Server error:', errorText);
        throw new Error(`HTTP error! status: ${res.status}, message: ${errorText}`);
      }

      const text = await res.text();
      console.log('📥 Raw response text:', text);

      let data;
      try {
        data = JSON.parse(text);
        console.log('✅ Successfully parsed JSON response');
        
        // Log actual audio metrics with clear formatting
        console.log('\n🎯 CURRENT AUDIO METRICS:');
        console.log('------------------------');
        console.log(`Speed:    ${data.speed} WPM`);
        console.log(`Volume:   ${data.volume} dB`);
        console.log(`Fillers:  ${data.filler_count}`);
        console.log(`Process:  ${data.processingTime}ms`);
        console.log('------------------------\n');
        
      } catch (err) {
        console.error('❌ Failed to parse backend response:', err);
        console.error('Raw text that failed to parse:', text);
        return;
      }

      const endTime = Date.now();
      const totalProcessingTime = endTime - startTime;
      console.log(`⏱️ Total round-trip time: ${totalProcessingTime}ms`);

      if (data.error) {
        console.error('❌ Backend error:', data.error);
        return;
      }

      const thresholdExceeded = checkThresholds(data);
      console.log('🔍 Threshold check result:', thresholdExceeded);

      if (thresholdExceeded) {
        console.log('🔔 Triggering feedback (vibration + flash)');
        // Use a shorter vibration pattern for more immediate feedback
        Vibration.vibrate([0, 1000, 0, 0]); // Reduced from 3000ms to 1000ms
        setTimeout(() => {
          flashScreen();
        }, 50); // Reduced from 100ms to 50ms
      }
    } catch (err) {
      console.error('❌ Analysis error:', err);
      console.error('Error stack:', err.stack);
      console.error('Error message:', err.message);
      console.error('Error name:', err.name);
    } finally {
      if (isMounted.current) {
        setIsProcessing(false);
      }
    }
  };

  const startRecording = async () => {
    if (activeRecordingRef.current) {
      console.log('⚠️ Recording already in progress');
      return;
    }

    try {
      console.log('🔒 Requesting audio permissions...');
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      console.log('🎤 Creating new recording...');
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      if (isMounted.current) {
        console.log('✅ Setting recording object...');
        activeRecordingRef.current = newRecording;
        setRecording(newRecording);
        console.log('✅ Recording state updated:', !!newRecording);
        
        // Wait for recording state to be set
        setTimeout(() => {
          if (isMounted.current && isRecording) {
            console.log('🔄 Setting up recording interval...');
            // Clear any existing interval before setting a new one
            if (recordingInterval.current) {
              clearInterval(recordingInterval.current);
            }

            // Start the first analysis after a short delay
            setTimeout(() => {
              if (isMounted.current && activeRecordingRef.current) {
                console.log('🎤 Starting first analysis...');
                loopRecording();
              }
            }, 500); // Reduced from 1000ms to 500ms

            // Set up interval for subsequent analyses
            recordingInterval.current = setInterval(() => {
              if (isMounted.current && activeRecordingRef.current) {
                console.log('🔄 Recording interval triggered');
                loopRecording();
              }
            }, 2000); // Reduced from 3000ms to 2000ms
          }
        }, 500); // Wait for state to update
      }
    } catch (err) {
      console.error('❌ Recording error:', err);
      if (isMounted.current) {
        setIsRecording(false);
        setRecording(null);
        activeRecordingRef.current = null;
      }
    }
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

  const toggleRecording = () => {
    // Check if all features are disabled
    if (!enableSpeed && !enableVolume && !enableFiller) {
      Alert.alert(
        'No Features Selected',
        'Please enable at least one feature to start recording.',
        [{ text: 'OK' }]
      );
      return;
    }

    animateButton(scaleAnim);
    setIsRecording(prev => !prev);
  };

  useEffect(() => {
    let isStarting = false;

    if (isRecording) {
      console.log('🎥 Starting recording loop...');
      console.log('Feature states:', {
        speed: enableSpeed,
        volume: enableVolume,
        filler: enableFiller
      });
      
      // Ensure at least one feature is enabled
      if (!enableSpeed && !enableVolume && !enableFiller) {
        console.log('⚠️ No features enabled! Stopping recording.');
        setIsRecording(false);
        return;
      }

      setShowOverlay(true);
      
      // Start flashing indicator
      indicatorInterval.current = setInterval(() => {
        if (isMounted.current) {
          setRecordingIndicator(v => !v);
        }
      }, 500);
      
      // Start recording immediately
      if (!isStarting && !recording) {
        isStarting = true;
        startRecording().then(() => {
          isStarting = false;
        });
      }
    } else {
      console.log('⏹️ Stopping recording loop...');
      clearInterval(recordingInterval.current);
      clearInterval(indicatorInterval.current);
      setShowOverlay(false);
      setRecordingIndicator(false);
      stopRecording();
    }

    return () => {
      console.log('🧹 Cleaning up intervals...');
      clearInterval(recordingInterval.current);
      clearInterval(indicatorInterval.current);
      stopRecording();
      if (isMounted.current) {
        setShowOverlay(false);
        setRecordingIndicator(false);
      }
    };
  }, [isRecording]);

  const loopRecording = async () => {
    console.log('🔄 Starting loopRecording...');
    console.log('Current state:', {
      isProcessing,
      hasRecording: !!activeRecordingRef.current,
      isRecording,
      enableSpeed,
      enableVolume,
      enableFiller
    });

    if (isProcessing) {
      console.log('⏸️ Skipping loop - still processing');
      return;
    }

    if (!activeRecordingRef.current) {
      console.log('⏸️ No recording object available');
      return;
    }
    
    try {
      setIsProcessing(true);
      const currentRecording = activeRecordingRef.current;
      console.log('⏹️ Stopping previous recording...');
      
      try {
        await currentRecording.stopAndUnloadAsync();
        console.log('✅ Recording stopped successfully');
      } catch (err) {
        if (!err.message.includes('already been unloaded') && !err.message.includes('Recorder does not exist')) {
          console.error('❌ Stop recording error:', err);
        }
      }
      
      const uri = currentRecording.getURI();
      
      if (!uri) {
        console.log('❌ URI is null');
        setIsProcessing(false);
        return;
      }

      console.log('📁 Got recording URI:', uri);
      activeRecordingRef.current = null;
      setRecording(null);
      
      // Ensure we have valid settings before analyzing
      if (!userSettings || !auth.currentUser) {
        console.log('❌ Missing settings or user for analysis');
        setIsProcessing(false);
        return;
      }

      console.log('🔍 Starting analysis with settings:', {
        speedEnabled: enableSpeed,
        volumeEnabled: enableVolume,
        fillerEnabled: enableFiller,
        speedRange: userSettings.speedValue,
        volumeRange: userSettings.volumeValue,
        fillerThreshold: userSettings.fillerCount
      });

      await analyzeAndVibrate(uri);
      
      if (isRecording && isMounted.current && !isProcessing) {
        console.log('🎥 Starting new recording...');
        await startRecording();
      }
    } catch (err) {
      console.error('❌ Loop error:', err);
      if (err.message.includes('Audio file is too short')) {
        console.log('⚠️ Audio too short, retrying...');
        if (isRecording && isMounted.current && !isProcessing) {
          await startRecording();
        }
      }
    } finally {
      if (isMounted.current) {
        setIsProcessing(false);
      }
    }
  };

  const stopRecording = async () => {
    if (activeRecordingRef.current) {
      try {
        await activeRecordingRef.current.stopAndUnloadAsync();
      } catch (err) {
        if (!err.message.includes('already been unloaded') && !err.message.includes('Recorder does not exist')) {
          console.error('Stop recording error:', err);
        }
      }
      if (isMounted.current) {
        activeRecordingRef.current = null;
        setRecording(null);
      }
    }
  };

  const toggleDropdown = (category) => {
    // Close all other dropdowns
    setExpandedSpeed(category === 'speed' ? !expandedSpeed : false);
    setExpandedVolume(category === 'volume' ? !expandedVolume : false);
    setExpandedFiller(category === 'filler' ? !expandedFiller : false);
  };

  const SettingsDropdown = ({ isExpanded, onToggle, category, settings }) => (
    <View style={styles.dropdownContainer}>
      <TouchableOpacity style={styles.titleContainer} onPress={onToggle}>
        <Text style={styles.label}>{category.charAt(0).toUpperCase() + category.slice(1)}</Text>
        <Text style={styles.dropdownArrow}>{isExpanded ? '▼' : '▶'}</Text>
      </TouchableOpacity>
      {isExpanded && settings && (
        <View style={styles.dropdownContent}>
          {category === 'speed' && (
            <>
              <Text style={styles.settingText}>Target: {settings.speedValue} WPM</Text>
              <Text style={styles.settingText}>Trigger: {settings.speedTrigger}s</Text>
            </>
          )}
          {category === 'volume' && (
            <>
              <Text style={styles.settingText}>Target: {settings.volumeValue} dB</Text>
              <Text style={styles.settingText}>Trigger: {settings.volumeTrigger}s</Text>
              <Text style={styles.settingText}>Zero: {settings.volumeZeroPoint?.toFixed(1) || '0.0'} dB</Text>
            </>
          )}
          {category === 'filler' && (
            <>
              <Text style={styles.settingText}>Target: {settings.fillerCount}</Text>
              <Text style={styles.settingText}>Mode: {settings.fillerMode}</Text>
              {settings.customWords && (
                <Text style={styles.settingText}>Custom: {settings.customWords}</Text>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );

  const processAudioData = (data) => {
    if (!data || !data.volume) return;

    const rawVolume = data.volume;
    const zeroPoint = userSettings.volumeZeroPoint || 0;
    
    // Make volume more sensitive by:
    // 1. Using a smaller scaling factor
    // 2. Adding a boost for normal speech levels
    // 3. Ensuring we don't go below 0 dB
    const volumeBoost = 20; // Boost normal speech levels by 20 dB
    const adjustedVolume = Math.max(0, (rawVolume - zeroPoint) * 1.5 + volumeBoost);
    
    // Update metrics with the more sensitive volume
    const newMetrics = {
      ...currentMetrics,
      volume: adjustedVolume.toFixed(1),
      zeroPoint: zeroPoint.toFixed(1)
    };
    
    setCurrentMetrics(newMetrics);
    checkThresholds(data);
  };

  return (
    <View style={[styles.screen, screenFlash && styles.flashRed]}>  
      <ScrollView contentContainerStyle={styles.container}>
        <Image source={require('../assets/EchoLogoGray.png')} style={styles.logo} />
        <Text style={styles.title}>Live Feedback</Text>

        <View style={styles.settingRow}>
          <SettingsDropdown
            isExpanded={expandedSpeed}
            onToggle={() => toggleDropdown('speed')}
            category="speed"
            settings={userSettings}
          />
          <Switch value={enableSpeed} onValueChange={() => {
            setEnableSpeed(!enableSpeed);
            setEnableVolume(false);
            setEnableFiller(false);
          }} />
        </View>

        <View style={styles.settingRow}>
          <SettingsDropdown
            isExpanded={expandedVolume}
            onToggle={() => toggleDropdown('volume')}
            category="volume"
            settings={userSettings}
          />
          <Switch value={enableVolume} onValueChange={() => {
            setEnableSpeed(false);
            setEnableVolume(!enableVolume);
            setEnableFiller(false);
          }} />
        </View>

        <View style={styles.settingRow}>
          <SettingsDropdown
            isExpanded={expandedFiller}
            onToggle={() => toggleDropdown('filler')}
            category="filler"
            settings={userSettings}
          />
          <Switch value={enableFiller} onValueChange={() => {
            setEnableSpeed(false);
            setEnableVolume(false);
            setEnableFiller(!enableFiller);
          }} />
        </View>
      </ScrollView>

      <TouchableOpacity 
        style={styles.controlButtonWrapper} 
        onPress={toggleRecording}
        disabled={isProcessing}
      >
        <Animated.View style={[styles.controlButton, { transform: [{ scale: scaleAnim }] }]}> 
          <Text style={styles.playIcon}>{isRecording ? '❚❚' : '▶'}</Text>
        </Animated.View>
      </TouchableOpacity>

      {showOverlay && (
        <View style={styles.overlay} pointerEvents="box-none">
          <View style={[styles.recordingIndicator, recordingIndicator && styles.recordingIndicatorActive]} />
          <View style={styles.metricsContainer}>
            {enableSpeed && <Text style={styles.metricText}>Current Speed: {currentMetrics.speed || '0.0 WPM'}</Text>}
            {enableVolume && (
              <>
                <Text style={styles.metricText}>Current Volume: {currentMetrics.volume || '0.0 dB'}</Text>
                <Text style={styles.metricText}>Zero Point: {currentMetrics.zeroPoint || '0.0 dB'}</Text>
              </>
            )}
            {enableFiller && <Text style={styles.metricText}>Filler Words: {currentMetrics.fillers || '0'}</Text>}
          </View>
        </View>
      )}

      {screenFlash && (
        <View style={styles.flashOverlay}>
          <Text style={styles.flashText}>{flashMessage}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8f9fa' },
  flashRed: { backgroundColor: '#FF6B6B' },
  container: { 
    flex: 1,
    paddingTop: 40, 
    paddingBottom: 100,
    paddingHorizontal: 20, 
    alignItems: 'center' 
  },
  logo: { 
    width: 50, 
    height: 50, 
    resizeMode: 'contain', 
    marginBottom: 8,
    opacity: 0.9 
  },
  title: { 
    fontSize: 24, 
    fontWeight: '600', 
    fontFamily: 'AveriaSerifLibre-Regular',
    color: '#1a1a1a',
    marginBottom: 24,
    letterSpacing: 0.5
  },
  settingRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    width: '100%', 
    marginVertical: 8,
    minHeight: 48,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 24,
    justifyContent: 'flex-start',
  },
  label: { 
    fontSize: 16, 
    fontWeight: '600', 
    fontFamily: 'AveriaSerifLibre-Regular',
    color: '#1a1a1a',
    letterSpacing: 0.3,
    textAlignVertical: 'center',
    includeFontPadding: false,
    height: 24,
    lineHeight: 24,
    textAlign: 'left',
  },
  controlButtonWrapper: {
    position: 'absolute',
    bottom: '25%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  controlButton: {
    backgroundColor: '#0B132B',
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 8,
  },
  playIcon: {
    fontSize: 28,
    color: '#fff',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#2C3E50',
    justifyContent: 'flex-start',
    alignItems: 'center',
    zIndex: 2,
    paddingTop: 100,
  },
  recordingText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginBottom: 16,
  },
  dropdownContainer: {
    flex: 1,
  },
  dropdownArrow: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
    textAlignVertical: 'center',
    includeFontPadding: false,
    height: 24,
    lineHeight: 24,
  },
  dropdownContent: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    width: '100%',
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  settingText: {
    fontSize: 14,
    color: '#495057',
    marginVertical: 4,
    paddingVertical: 2,
    letterSpacing: 0.2,
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  flashText: {
    color: 'white',
    fontSize: 32,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 0.5,
  },
  metricsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
    width: '80%',
    alignItems: 'center',
    marginTop: 20,
  },
  metricText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginVertical: 4,
    letterSpacing: 0.3,
  },
  recordingIndicator: {
    position: 'absolute',
    top: 30,
    right: 20,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2C3E50',
    borderWidth: 3,
    borderColor: '#FF6B6B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  recordingIndicatorActive: {
    backgroundColor: '#FF6B6B',
    shadowColor: '#FF6B6B',
    shadowOpacity: 0.5,
  },
});
