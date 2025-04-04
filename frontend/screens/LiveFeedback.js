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
  Dimensions,
} from 'react-native';
import { Audio } from 'expo-av';
import { auth, getUserSettings } from '../firebase';

const { width } = Dimensions.get('window');
const MIN_DB = -80; // Minimum decibel level
const MAX_DB = 0;   // Maximum decibel level
const POLL_INTERVAL = 50; // Poll every 50ms

export default function LiveFeedback() {
  const [enableSpeed, setEnableSpeed] = useState(false);
  const [enableVolume, setEnableVolume] = useState(false);
  const [enableFiller, setEnableFiller] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [userSettings, setUserSettings] = useState({});
  const [showOverlay, setShowOverlay] = useState(false);
  const [flashVisible, setFlashVisible] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
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
  const [audioLevels, setAudioLevels] = useState(Array(30).fill(0));
  const levelsRef = useRef(Array(30).fill(0));
  const pollIntervalRef = useRef(null);
  const flashTimeout = useRef(null);

  useEffect(() => {
    isMounted.current = true;
    
    return () => {
      isMounted.current = false;
      console.log('📱 Component unmounted');
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
    if (!isMounted.current || isFlashing) {
      console.log('📱 Flash screen skipped:', { isMounted: isMounted.current, isFlashing });
      return;
    }
    
    // Clear any existing flash timeout
    if (flashTimeout.current) {
      clearTimeout(flashTimeout.current);
      console.log('⏰ Cleared existing flash timeout');
    }
    
    console.log('🔴 Screen flash triggered');
    
    // Set flash screen and message
    setIsFlashing(true);
    setFlashVisible(true);
    
    // Turn off flash after 3 seconds and start grace period
    flashTimeout.current = setTimeout(() => {
      if (isMounted.current) {
        setIsFlashing(false);
        setFlashVisible(false);
        setFlashMessage('');
        // Start the grace period after flash ends
        triggerCounters.current.lastCheck.volume = Date.now();
        console.log('🟢 Flash screen cleared');
      }
    }, 3000);
  };

  // Initialize trigger timers
  useEffect(() => {
    triggerCounters.current = {
      speed: 0,
      volume: 0,
      filler: 0,
      lastCheck: {
        speed: 0,
        volume: 0,
        filler: 0
      }
    };
  }, []);

  const checkThresholds = (data) => {
    if (!userSettings) {
      console.log('❌ No user settings available');
      return false;
    }

    const now = Date.now();

    // Check each metric if enabled
    let speedExceeded = false;
    let volumeExceeded = false;
    let fillerExceeded = false;

    if (enableVolume) {
      // Parse the volume range correctly, handling negative values
      const parts = userSettings.volumeValue.split('--');  // First split by double dash
      let minVolume, maxVolume;
      
      if (parts.length === 2) {
        // Case: "-100--80" becomes ["100", "80"]
        minVolume = -parseFloat(parts[0]);
        maxVolume = -parseFloat(parts[1]);
      } else {
        // Fallback to old logic
        const volumeRange = userSettings.volumeValue.split('-');
        if (volumeRange[0] === '') {
          minVolume = -parseFloat(volumeRange[1]);
          maxVolume = -parseFloat(volumeRange[2]);
        } else {
          minVolume = parseFloat(volumeRange[0]);
          maxVolume = parseFloat(volumeRange[1]);
        }
      }

      // Debug log the raw values
      console.log('🎯 Raw volume settings:', {
        volumeValue: userSettings.volumeValue,
        parts,
        parsedMin: minVolume,
        parsedMax: maxVolume
      });
      
      const currentVolume = parseFloat(data.volume);
      // For dB values:
      // - A higher (less negative) number means louder
      // - A lower (more negative) number means quieter
      // Example: -50 dB is louder than -80 dB
      const isTooLoud = currentVolume > maxVolume;  // e.g., -50 > -80 (true, too loud)
      const isTooQuiet = currentVolume < minVolume; // e.g., -90 < -100 (false, not too quiet)
      volumeExceeded = isTooLoud || isTooQuiet;
      
      console.log('🔊 Volume check:', {
        currentVolume,
        minVolume,
        maxVolume,
        isTooLoud,
        isTooQuiet,
        message: isTooLoud ? "Volume too high" : isTooQuiet ? "Volume too low" : "Volume in range"
      });
      
      if (volumeExceeded) {
        // If we're in the grace period, don't check
        if (triggerCounters.current.lastCheck.volume > 0 && 
            (now - triggerCounters.current.lastCheck.volume) < 5000) {
          console.log('⏳ In grace period, skipping check');
          return false;
        }
        
        if (triggerCounters.current.lastCheck.volume === 0) {
          triggerCounters.current.lastCheck.volume = now;
          console.log('⏱️ Starting volume trigger timer');
        }
        
        const triggerSeconds = parseInt(userSettings.volumeTrigger || '3');
        const elapsedSeconds = (now - triggerCounters.current.lastCheck.volume) / 1000;
        console.log(`⏱️ Volume elapsed time: ${elapsedSeconds.toFixed(1)}s / ${triggerSeconds}s`);
        
        if (elapsedSeconds >= triggerSeconds) {
          console.log(`🚨 Volume threshold exceeded for ${triggerSeconds} seconds`);
          // For dB values:
          // If currentVolume (-50) > maxVolume (-80), we're too loud
          // If currentVolume (-110) < minVolume (-100), we're too quiet
          const message = isTooLoud ? "Lower your voice" : "Speak louder";
          console.log(`📢 Volume feedback: ${message} (current: ${currentVolume}dB, range: ${minVolume}dB to ${maxVolume}dB)`);
          setFlashMessage(message);
          console.log('📱 Calling flashScreen from volume check');
          flashScreen();
          // Reset the timer after triggering flash
          triggerCounters.current.lastCheck.volume = now;
          return true;
        }
      } else {
        // Reset the timer if we're back in range
        triggerCounters.current.lastCheck.volume = 0;
      }
    }

    if (enableSpeed) {
      const speedThreshold = parseInt(userSettings.speedValue);
      const currentSpeed = parseFloat(data.speed);
      speedExceeded = currentSpeed > speedThreshold;
      console.log('🏃 Speed check:', { currentSpeed, threshold: speedThreshold, exceeded: speedExceeded });
      
      if (speedExceeded) {
        // If we're in the grace period, don't check
        if (triggerCounters.current.lastCheck.speed > 0 && 
            (now - triggerCounters.current.lastCheck.speed) < 3000) {
          console.log('⏳ In grace period, skipping check');
          return false;
        }
        
        if (triggerCounters.current.lastCheck.speed === 0) {
          triggerCounters.current.lastCheck.speed = now;
          console.log('⏱️ Starting speed trigger timer');
        }
        
        const triggerSeconds = parseInt(userSettings.speedTrigger || '3');
        const elapsedSeconds = (now - triggerCounters.current.lastCheck.speed) / 1000;
        console.log(`⏱️ Speed elapsed time: ${elapsedSeconds.toFixed(1)}s / ${triggerSeconds}s`);
        
        if (elapsedSeconds >= triggerSeconds) {
          console.log(`🚨 Speed threshold exceeded for ${triggerSeconds} seconds`);
          const message = "Talk slower";
          setFlashMessage(message);
          flashScreen();
          // Reset the timer after triggering flash
          triggerCounters.current.lastCheck.speed = now;
          return true;
        }
      } else {
        // Reset the timer if we're back in range
        triggerCounters.current.lastCheck.speed = 0;
      }
    }

    if (enableFiller) {
      const fillerThreshold = parseInt(userSettings.fillerCount);
      const avgFiller = metricsHistory.filler.slice(-2).reduce((a, b) => a + b, 0) / 2;
      fillerExceeded = avgFiller > fillerThreshold;
      console.log('🗣️ Filler check:', { avgFiller, threshold: fillerThreshold, exceeded: fillerExceeded });
      
      if (fillerExceeded) {
        // If we're in the grace period, don't check
        if (triggerCounters.current.lastCheck.filler > 0 && 
            (now - triggerCounters.current.lastCheck.filler) < 3000) {
          console.log('⏳ In grace period, skipping check');
          return false;
        }
        
        if (triggerCounters.current.lastCheck.filler === 0) {
          triggerCounters.current.lastCheck.filler = now;
          console.log('⏱️ Starting filler trigger timer');
        }
        
        const triggerSeconds = parseInt(userSettings.fillerTrigger || '3');
        const elapsedSeconds = (now - triggerCounters.current.lastCheck.filler) / 1000;
        console.log(`⏱️ Filler elapsed time: ${elapsedSeconds.toFixed(1)}s / ${triggerSeconds}s`);
        
        if (elapsedSeconds >= triggerSeconds) {
          console.log(`🚨 Filler threshold exceeded for ${triggerSeconds} seconds`);
          const message = "Reduce filler words";
          setFlashMessage(message);
          flashScreen();
          // Reset the timer after triggering flash
          triggerCounters.current.lastCheck.filler = now;
          return true;
        }
      } else {
        // Reset the timer if we're back in range
        triggerCounters.current.lastCheck.filler = 0;
      }
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
    try {
      // First, ensure we have permissions
      await Audio.requestPermissionsAsync();
      
      // Set up audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });

      // Stop any existing recording first
      if (recording) {
        try {
          await recording.stopAndUnloadAsync();
        } catch (err) {
          // Ignore errors if recording is already stopped
          if (!err.message.includes('already been unloaded') && 
              !err.message.includes('Recorder does not exist')) {
            console.error('Error stopping previous recording:', err);
          }
        }
        setRecording(null);
      }

      // Create new recording
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);

      // Start polling for audio levels
      pollIntervalRef.current = setInterval(async () => {
        if (newRecording) {
          try {
            const status = await newRecording.getStatusAsync();
            if (status.isRecording && status.metering !== undefined) {
              const zeroPoint = userSettings.volumeZeroPoint || 0;
              const relativeVolume = status.metering - zeroPoint;
              
              // Update current metrics
              setCurrentMetrics(prev => ({
                ...prev,
                volume: `${Math.round(relativeVolume)} dB`,
                zeroPoint: `${zeroPoint} dB`
              }));

              // Check thresholds with the current volume
              checkThresholds({
                volume: relativeVolume,
                speed: 0,
                filler_count: 0
              });
            }
          } catch (err) {
            console.error('Error getting recording status:', err);
          }
        }
      }, POLL_INTERVAL);

    } catch (err) {
      console.error('Failed to start recording:', err);
      setIsRecording(false);
      setRecording(null);
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
    let cleanup = false;

    if (isRecording && !cleanup) {
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
    } else if (!isRecording && !cleanup) {
      console.log('⏹️ Stopping recording loop...');
      clearInterval(recordingInterval.current);
      clearInterval(indicatorInterval.current);
      setShowOverlay(false);
      setRecordingIndicator(false);
      stopRecording();
    }

    return () => {
      cleanup = true;
      console.log('🧹 Cleaning up intervals...');
      clearInterval(recordingInterval.current);
      clearInterval(indicatorInterval.current);
      if (recording) {
        stopRecording();
      }
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
    try {
      // Clear the polling interval first
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }

      if (recording) {
        try {
          await recording.stopAndUnloadAsync();
        } catch (err) {
          // Ignore errors if recording is already stopped
          if (!err.message.includes('already been unloaded') && 
              !err.message.includes('Recorder does not exist')) {
            console.error('Stop recording error:', err);
          }
        }
        setRecording(null);
        setIsRecording(false);
      }
    } catch (err) {
      console.error('Stop recording error:', err);
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
    
    // Calculate relative volume without boost
    const adjustedVolume = rawVolume - zeroPoint;
    
    // Update metrics with the actual volume
    const newMetrics = {
      ...currentMetrics,
      volume: adjustedVolume.toFixed(1),
      zeroPoint: zeroPoint.toFixed(1)
    };
    
    setCurrentMetrics(newMetrics);
    
    // Pass the raw adjusted volume to checkThresholds
    checkThresholds({
      ...data,
      volume: adjustedVolume
    });
  };

  const checkVolumeThreshold = (normalizedLevel) => {
    if (!userSettings || !userSettings.volumeValue) return false;
    
    // Don't check if we're currently flashing
    if (isFlashing) {
      console.log('⏳ Flash in progress, skipping volume check');
      return false;
    }
    
    // Convert normalized level (0-1) back to dB
    const currentDb = MIN_DB + (normalizedLevel * (MAX_DB - MIN_DB));
    
    // Parse the volume range from settings (e.g., "-70--50")
    const [minVolume, maxVolume] = userSettings.volumeValue.split('-').map(Number);
    
    // Check if current volume is outside the target range
    return currentDb < minVolume || currentDb > maxVolume;
  };

  // Cleanup flash timeout on unmount
  useEffect(() => {
    return () => {
      if (flashTimeout.current) {
        clearTimeout(flashTimeout.current);
        setIsFlashing(false);
        setFlashVisible(false);
        setFlashMessage('');
      }
    };
  }, []);

  return (
    <View style={styles.screen}>  
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
            {enableSpeed && (
              <View style={styles.metricSection}>
                <Text style={styles.metricHeader}>Speed Settings</Text>
                <Text style={styles.metricText}>Current: {currentMetrics.speed || '0.0 WPM'}</Text>
                <Text style={styles.metricText}>Target: {userSettings.speedValue} WPM</Text>
                <Text style={styles.metricText}>Trigger: {userSettings.speedTrigger}s</Text>
              </View>
            )}
            {enableVolume && (
              <View style={styles.metricSection}>
                <Text style={styles.metricHeader}>Volume Settings</Text>
                <Text style={styles.metricText}>Current: {currentMetrics.volume || '0.0 dB'}</Text>
                <Text style={styles.metricText}>Target: {userSettings.volumeValue} dB</Text>
                <Text style={styles.metricText}>Zero Point: {currentMetrics.zeroPoint || '0.0 dB'}</Text>
                <Text style={styles.metricText}>Trigger: {userSettings.volumeTrigger}s</Text>
              </View>
            )}
            {enableFiller && (
              <View style={styles.metricSection}>
                <Text style={styles.metricHeader}>Filler Settings</Text>
                <Text style={styles.metricText}>Current: {currentMetrics.fillers || '0'}</Text>
                <Text style={styles.metricText}>Target: {userSettings.fillerCount}</Text>
                <Text style={styles.metricText}>Mode: {userSettings.fillerMode}</Text>
                <Text style={styles.metricText}>Trigger: {userSettings.fillerTrigger}s</Text>
                {userSettings.customWords && (
                  <Text style={styles.metricText}>Custom Words: {userSettings.customWords}</Text>
                )}
              </View>
            )}
          </View>
        </View>
      )}

      {flashVisible && (
        <View style={styles.flashOverlay}>
          <Text style={styles.flashText}>{flashMessage}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8f9fa' },
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
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    transform: [{ translateY: -16 }],
  },
  metricsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
    width: '80%',
    alignItems: 'stretch',
    marginTop: 20,
  },
  metricSection: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  metricHeader: {
    color: '#ADD8E6',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  metricText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'left',
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
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
    width: '100%',
    paddingHorizontal: 20,
    gap: 2,
    marginVertical: 20,
  },
  waveformBar: {
    width: 4,
    backgroundColor: '#0B132B',
    borderRadius: 2,
    marginHorizontal: 1,
  },
});
