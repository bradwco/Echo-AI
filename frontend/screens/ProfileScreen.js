import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import {
  auth,
  saveUserProfile,
  getUserProfile,
  uploadProfilePicture,
  logoutUser,
  saveUserSettings,
  getUserSettings,
} from '../firebase';
import { Audio } from 'expo-av';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    paddingTop: 80,
    paddingBottom: 100,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  logoutBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: '#CC4444',
    padding: 10,
    borderRadius: 10,
    zIndex: 10,
  },
  logoutIcon: {
    width: 24,
    height: 24,
    tintColor: '#fff',
    resizeMode: 'contain',
  },
  profilePic: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#0B132B',
    marginBottom: 30,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  username: {
    fontSize: 22,
    fontWeight: 'bold',
    marginRight: 10,
  },
  usernameInput: {
    fontSize: 20,
    borderBottomWidth: 1,
    borderColor: '#aaa',
    marginRight: 10,
  },
  editIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
    tintColor: '#0B132B',
  },
  liveSettingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EAEAEA',
    padding: 12,
    borderRadius: 10,
    width: '100%',
    marginBottom: 10,
  },
  liveSettingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  liveSettingsToggle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  liveSettingsBox: {
    width: '100%',
    backgroundColor: '#F7F7F7',
    padding: 16,
    borderRadius: 10,
  },
  label: { 
    marginTop: 16, 
    marginBottom: 6 
  },
  picker: { 
    backgroundColor: '#fff', 
    borderRadius: 6 
  },
  input: { 
    padding: 10, 
    marginTop: 10, 
    backgroundColor: '#f9f9f9', 
    borderRadius: 6 
  },
  calibrationSection: {
    marginTop: 10,
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    width: '100%',
  },
  calibrationInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  zeroPoint: {
    fontSize: 16,
    marginBottom: 15,
    fontFamily: 'AveriaSerifLibre-Regular',
  },
  calibrateButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  calibratingButton: {
    backgroundColor: '#999',
  },
  calibrateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  calibrationStatus: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  settingsContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  settingRow: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  settingPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  settingValue: {
    fontSize: 16,
    color: '#666',
  },
  dropdownContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginTop: 5,
    padding: 10,
  },
  settingGroup: {
    marginBottom: 10,
  },
  settingSubLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  dropdownContainer: {
    marginBottom: 10,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownArrow: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  settingText: {
    fontSize: 14,
    color: '#666',
  },
});

export default function ProfileScreen({ navigation }) {
  const [username, setUsername] = useState('YourUsername');
  const [isEditing, setIsEditing] = useState(false);
  const [profileImage, setProfileImage] = useState(require('../assets/user.png'));
  const [loading, setLoading] = useState(true);
  const [showLiveSettings, setShowLiveSettings] = useState(false);
  const [userSettings, setUserSettings] = useState({});
  const scrollViewRef = useRef(null);

  const [speedValue, setSpeedValue] = useState("50-60");
  const [speedTrigger, setSpeedTrigger] = useState("3");
  const [volumeValue, setVolumeValue] = useState("0-20");
  const [volumeTrigger, setVolumeTrigger] = useState("3");
  const [fillerCount, setFillerCount] = useState("1");
  const [fillerMode, setFillerMode] = useState("default");
  const [customWords, setCustomWords] = useState("");
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationStatus, setCalibrationStatus] = useState('');

  const [expandedSpeed, setExpandedSpeed] = useState(false);
  const [expandedVolume, setExpandedVolume] = useState(false);
  const [expandedFiller, setExpandedFiller] = useState(false);
  const [expandedFillerMode, setExpandedFillerMode] = useState(false);
  const [expandedCalibration, setExpandedCalibration] = useState(false);
  const [fillerTrigger, setFillerTrigger] = useState('3');

  useEffect(() => {
    const fetchProfile = async () => {
      const user = auth.currentUser;
      if (!user) return setLoading(false);

      try {
        const data = await getUserProfile(user.uid);
        if (data?.username) setUsername(data.username);
        if (data?.imageUrl) setProfileImage({ uri: data.imageUrl });

        // Fetch user settings
        const settings = await getUserSettings(user.uid);
        if (settings) {
          setUserSettings(settings);
          // Update local state immediately
          if (settings.speedValue) setSpeedValue(settings.speedValue);
          if (settings.speedTrigger) setSpeedTrigger(settings.speedTrigger);
          if (settings.volumeValue) setVolumeValue(settings.volumeValue);
          if (settings.volumeTrigger) setVolumeTrigger(settings.volumeTrigger);
          if (settings.fillerCount) setFillerCount(settings.fillerCount);
          if (settings.fillerMode) setFillerMode(settings.fillerMode);
          if (settings.customWords) setCustomWords(settings.customWords);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      }
      setLoading(false);
    };

    const unsubscribe = auth.onAuthStateChanged(fetchProfile);
    return unsubscribe;
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setProfileImage({ uri });

      const user = auth.currentUser;
      if (!user) return;
      const imageUrl = await uploadProfilePicture(user.uid, uri);
      await saveUserProfile(user.uid, username, imageUrl);
    }
  };

  const handleUsernameSave = async () => {
    const user = auth.currentUser;
    if (!user) return;
    await saveUserProfile(user.uid, username, profileImage.uri || '');
    setIsEditing(false);
  };

  const handleLogout = async () => {
    await logoutUser();
    await AsyncStorage.removeItem('profileImageUrl');
    navigation.reset({ index: 0, routes: [{ name: 'Start' }] });
  };

  const handleSettingChange = async (setting, value) => {
    try {
      console.log("Updating setting:", setting, "with value:", value);
      console.log("Current userSettings:", userSettings);
      
      if (!auth.currentUser) {
        console.error("No authenticated user");
        Alert.alert('Error', 'You must be logged in to update settings');
        return;
      }

      // Create updated settings with the new value
      const updatedSettings = {
        ...userSettings,
        [setting]: value
      };
      
      // Update local state immediately
      switch(setting) {
        case 'speedValue':
          setSpeedValue(value);
          break;
        case 'speedTrigger':
          setSpeedTrigger(value);
          break;
        case 'volumeValue':
          setVolumeValue(value);
          break;
        case 'volumeTrigger':
          setVolumeTrigger(value);
          break;
        case 'fillerCount':
          setFillerCount(value);
          break;
        case 'fillerMode':
          setFillerMode(value);
          break;
        case 'customWords':
          setCustomWords(value);
          break;
        case 'fillerTrigger':
          setFillerTrigger(value);
          break;
      }
      
      // Update userSettings state
      setUserSettings(updatedSettings);
      
      console.log("Saving settings to Firebase:", updatedSettings);
      
      // Save to Firebase
      await saveUserSettings(auth.currentUser.uid, updatedSettings);
      console.log(`✅ ${setting} updated to:`, value);
    } catch (error) {
      console.error(`❌ Error updating ${setting}:`, error);
      Alert.alert('Error', `Failed to update ${setting}. Please try again.`);
    }
  };

  const handleSpeedValueChange = (value) => {
    setSpeedValue(value); // Update local state immediately
    handleSettingChange('speedValue', value);
  };

  const handleSpeedTriggerChange = (value) => {
    setSpeedTrigger(value); // Update local state immediately
    handleSettingChange('speedTrigger', value);
  };

  const handleVolumeValueChange = (value) => {
    console.log('Volume value changed to:', value);
    setVolumeValue(value);
    handleSettingChange('volumeValue', value);
  };

  const handleVolumeTriggerChange = (value) => {
    setVolumeTrigger(value); // Update local state immediately
    handleSettingChange('volumeTrigger', value);
  };

  const handleFillerCountChange = (value) => {
    setFillerCount(value); // Update local state immediately
    handleSettingChange('fillerCount', value);
  };

  const handleFillerModeChange = (value) => {
    setFillerMode(value); // Update local state immediately
    handleSettingChange('fillerMode', value);
  };

  const handleCustomWordsChange = (value) => {
    setCustomWords(value); // Update local state immediately
    handleSettingChange('customWords', value);
  };

  const handleFillerTriggerChange = (value) => {
    setFillerTrigger(value); // Update local state immediately
    handleSettingChange('fillerTrigger', value);
  };

  const calibrateVolume = async () => {
    if (isCalibrating) return;
    
    setIsCalibrating(true);
    setCalibrationStatus('Calibrating... Please remain silent for 5 seconds.');
    
    try {
      // Request permissions
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Create a new recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      // Wait for 5 seconds to measure ambient noise
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Stop recording
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      // Send to backend for analysis
      const formData = new FormData();
      formData.append('audio', {
        uri,
        name: 'calibration.m4a',
        type: 'audio/m4a',
      });

      const response = await fetch('http://192.168.4.118:5000/analyze_live', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to analyze calibration audio');
      }

      const data = await response.json();
      const ambientNoiseLevel = data.volume;

      // Create updated settings object with all current settings plus the new zero point
      const updatedSettings = {
        speedValue: userSettings.speedValue || "50-60",
        speedTrigger: userSettings.speedTrigger || "3",
        volumeValue: userSettings.volumeValue || "-70--50",
        volumeTrigger: userSettings.volumeTrigger || "3",
        fillerCount: userSettings.fillerCount || "1",
        fillerTrigger: userSettings.fillerTrigger || "3",
        fillerMode: userSettings.fillerMode || "default",
        customWords: userSettings.customWords || "",
        volumeZeroPoint: ambientNoiseLevel
      };

      // Save to Firebase
      await saveUserSettings(auth.currentUser.uid, updatedSettings);
      
      // Update local state
      setUserSettings(updatedSettings);
      
      setCalibrationStatus(`Calibration complete! Zero point set to ${ambientNoiseLevel.toFixed(1)} dB`);
      Alert.alert(
        'Calibration Complete',
        `Ambient noise level measured at ${ambientNoiseLevel.toFixed(1)} dB. This will be used as the zero point for volume measurements.`
      );
    } catch (error) {
      console.error('Calibration error:', error);
      setCalibrationStatus('Calibration failed. Please try again.');
      Alert.alert('Calibration Failed', 'There was an error during calibration. Please try again.');
    } finally {
      setIsCalibrating(false);
    }
  };

  const saveSettings = async () => {
    if (!auth.currentUser) {
      console.error('No authenticated user');
      return;
    }

    try {
      const settings = {
        speedValue: speedValue,
        volumeValue: volumeValue,
        fillerCount: fillerCount,
        speedTrigger: speedTrigger,
        volumeTrigger: volumeTrigger,
        fillerTrigger: fillerTrigger,
        volumeZeroPoint: userSettings.volumeZeroPoint,
        fillerMode: fillerMode,
        customWords: customWords
      };

      await saveUserSettings(auth.currentUser.uid, settings);
      setUserSettings(settings);
      Alert.alert('Success', 'Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
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
              <Text style={styles.settingText}>Trigger: {settings.fillerTrigger}s</Text>
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

  const renderFillerSettings = () => (
    <View style={styles.settingsContainer}>
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Filler Word Count</Text>
        <Picker
          selectedValue={fillerCount}
          onValueChange={handleFillerCountChange}
          style={styles.picker}
        >
          {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
            <Picker.Item key={num} label={num.toString()} value={num.toString()} />
          ))}
        </Picker>
      </View>

      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Filler Trigger (s)</Text>
        <Picker
          selectedValue={fillerTrigger}
          onValueChange={handleFillerTriggerChange}
          style={styles.picker}
        >
          {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
            <Picker.Item key={num} label={num.toString()} value={num.toString()} />
          ))}
        </Picker>
      </View>

      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Filler Word Mode</Text>
        <Picker
          selectedValue={fillerMode}
          onValueChange={handleFillerModeChange}
          style={styles.picker}
        >
          <Picker.Item label="Default" value="default" />
          <Picker.Item label="Custom" value="custom" />
        </Picker>
      </View>

      {fillerMode === 'custom' && (
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Custom Words</Text>
          <TextInput
            value={customWords}
            onChangeText={handleCustomWordsChange}
            placeholder="Enter words (comma-separated)"
            placeholderTextColor="#666"
            style={styles.input}
            multiline
          />
        </View>
      )}
    </View>
  );

  const renderLiveFeedbackSettings = () => (
    <View style={styles.settingsContainer}>
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Speed Range (WPM)</Text>
        <Picker
          selectedValue={speedValue}
          onValueChange={(itemValue) => setSpeedValue(itemValue)}
          style={styles.picker}
        >
          {Array.from({ length: 20 }, (_, i) => i * 10).map((num) => (
            <Picker.Item key={num} label={`${num}-${num + 10}`} value={`${num}-${num + 10}`} />
          ))}
        </Picker>
      </View>

      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Speed Trigger (s)</Text>
        <Picker
          selectedValue={speedTrigger}
          onValueChange={(itemValue) => setSpeedTrigger(itemValue)}
          style={styles.picker}
        >
          {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
            <Picker.Item key={num} label={num.toString()} value={num.toString()} />
          ))}
        </Picker>
      </View>

      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Volume Range (dB)</Text>
        <Picker
          selectedValue={volumeValue}
          onValueChange={handleVolumeValueChange}
          style={styles.picker}
        >
          {[
            { label: "-100 to -80 dB", value: "-100--80" },
            { label: "-95 to -75 dB", value: "-95--75" },
            { label: "-90 to -70 dB", value: "-90--70" },
            { label: "-85 to -65 dB", value: "-85--65" },
            { label: "-80 to -60 dB", value: "-80--60" },
            { label: "-75 to -55 dB", value: "-75--55" },
            { label: "-70 to -50 dB", value: "-70--50" },
            { label: "-65 to -45 dB", value: "-65--45" },
            { label: "-60 to -40 dB", value: "-60--40" },
            { label: "-55 to -35 dB", value: "-55--35" },
            { label: "-50 to -30 dB", value: "-50--30" },
            { label: "-45 to -25 dB", value: "-45--25" },
            { label: "-40 to -20 dB", value: "-40--20" },
            { label: "-35 to -15 dB", value: "-35--15" },
            { label: "-30 to -10 dB", value: "-30--10" },
            { label: "-25 to -5 dB", value: "-25--5" },
            { label: "-20 to 0 dB", value: "-20-0" },
            { label: "-15 to 5 dB", value: "-15-5" },
            { label: "-10 to 10 dB", value: "-10-10" },
            { label: "-5 to 15 dB", value: "-5-15" },
            { label: "0 to 20 dB", value: "0-20" }
          ].map((item) => (
            <Picker.Item 
              key={item.value}
              label={item.label}
              value={item.value}
              color={String(volumeValue) === String(item.value) ? '#ADD8E6' : '#000000'}
            />
          ))}
        </Picker>
      </View>

      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Volume Trigger (s)</Text>
        <Picker
          selectedValue={volumeTrigger}
          onValueChange={(itemValue) => setVolumeTrigger(itemValue)}
          style={styles.picker}
        >
          {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
            <Picker.Item key={num} label={num.toString()} value={num.toString()} />
          ))}
        </Picker>
      </View>

      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Filler Word Count</Text>
        <Picker
          selectedValue={fillerCount}
          onValueChange={(itemValue) => setFillerCount(itemValue)}
          style={styles.picker}
        >
          {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
            <Picker.Item key={num} label={num.toString()} value={num.toString()} />
          ))}
        </Picker>
      </View>

      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Filler Trigger (s)</Text>
        <Picker
          selectedValue={fillerTrigger}
          onValueChange={(itemValue) => setFillerTrigger(itemValue)}
          style={styles.picker}
        >
          {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
            <Picker.Item key={num} label={num.toString()} value={num.toString()} />
          ))}
        </Picker>
      </View>

      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Filler Word Mode</Text>
        <Picker
          selectedValue={fillerMode}
          onValueChange={(itemValue) => setFillerMode(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label="Default" value="default" />
          <Picker.Item label="Custom" value="custom" />
        </Picker>
      </View>

      {fillerMode === 'custom' && (
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Custom Words</Text>
          <TextInput
            value={customWords}
            onChangeText={setCustomWords}
            placeholder="Enter words (comma-separated)"
            placeholderTextColor="#666"
            style={styles.input}
            multiline
          />
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0B132B" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        scrollEventThrottle={16}
      >
        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Image source={require('../assets/logout.png')} style={styles.logoutIcon} />
        </TouchableOpacity>

        {/* Profile Image */}
        <TouchableOpacity onPress={pickImage}>
          <Image source={profileImage} style={styles.profilePic} />
        </TouchableOpacity>

        {/* Username */}
        <View style={styles.usernameContainer}>
          {isEditing ? (
            <TextInput
              value={username}
              onChangeText={setUsername}
              style={styles.usernameInput}
              onBlur={handleUsernameSave}
            />
          ) : (
            <Text style={styles.username}>{username}</Text>
          )}
          <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
            <Image source={require('../assets/pen.png')} style={styles.editIcon} />
          </TouchableOpacity>
        </View>

        {/* Live Feedback Section */}
        <TouchableOpacity
          onPress={() => setShowLiveSettings(!showLiveSettings)}
          style={styles.liveSettingsHeader}
        >
          <Text style={styles.liveSettingsTitle}>Live Feedback Settings</Text>
          <Text style={styles.liveSettingsToggle}>{showLiveSettings ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {showLiveSettings && (
          <View style={styles.settingsContainer}>
            {/* Speed Settings */}
            <TouchableOpacity
              onPress={() => setExpandedSpeed(!expandedSpeed)}
              style={styles.settingRow}
            >
              <View style={styles.settingPreview}>
                <Text style={styles.settingLabel}>Speed Settings:</Text>
                <Text style={styles.settingValue}>{speedValue} WPM</Text>
              </View>
            </TouchableOpacity>
            {expandedSpeed && (
              <View style={styles.dropdownContent}>
                <View style={styles.settingGroup}>
                  <Text style={styles.settingSubLabel}>Speed Range:</Text>
                  <Picker 
                    selectedValue={speedValue} 
                    onValueChange={handleSpeedValueChange} 
                    style={styles.picker}
                  >
                    {Array.from({ length: 16 }, (_, i) => {
                      const range = `${50 + i * 10}-${60 + i * 10}`;
                      return (
                        <Picker.Item 
                          key={range} 
                          label={`${range} WPM`} 
                          value={range}
                          color={range === speedValue ? '#ADD8E6' : '#000000'}
                        />
                      );
                    })}
                  </Picker>
                </View>
                <View style={styles.settingGroup}>
                  <Text style={styles.settingSubLabel}>Trigger Count:</Text>
                  <Picker 
                    selectedValue={speedTrigger} 
                    onValueChange={handleSpeedTriggerChange} 
                    style={styles.picker}
                  >
                    {Array.from({ length: 10 }, (_, i) => (
                      <Picker.Item 
                        key={i + 1} 
                        label={`${i + 1}`} 
                        value={`${i + 1}`}
                        color={`${i + 1}` === speedTrigger ? '#ADD8E6' : '#000000'}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
            )}

            {/* Filler Settings */}
            <TouchableOpacity
              onPress={() => setExpandedFiller(!expandedFiller)}
              style={styles.settingRow}
            >
              <View style={styles.settingPreview}>
                <Text style={styles.settingLabel}>Filler Settings:</Text>
                <Text style={styles.settingValue}>Count: {fillerCount}</Text>
              </View>
            </TouchableOpacity>
            {expandedFiller && (
              <View style={styles.dropdownContent}>
                <View style={styles.settingGroup}>
                  <Text style={styles.settingSubLabel}>Filler Count:</Text>
                  <Picker 
                    selectedValue={fillerCount} 
                    onValueChange={handleFillerCountChange} 
                    style={styles.picker}
                  >
                    {Array.from({ length: 20 }, (_, i) => (
                      <Picker.Item 
                        key={i + 1} 
                        label={`${i + 1}`} 
                        value={`${i + 1}`}
                        color={`${i + 1}` === fillerCount ? '#ADD8E6' : '#000000'}
                      />
                    ))}
                  </Picker>
                </View>
                <View style={styles.settingGroup}>
                  <Text style={styles.settingSubLabel}>Filler Trigger (s):</Text>
                  <Picker 
                    selectedValue={fillerTrigger} 
                    onValueChange={handleFillerTriggerChange} 
                    style={styles.picker}
                  >
                    {Array.from({ length: 10 }, (_, i) => (
                      <Picker.Item 
                        key={i + 1} 
                        label={`${i + 1}`} 
                        value={`${i + 1}`}
                        color={`${i + 1}` === fillerTrigger ? '#ADD8E6' : '#000000'}
                      />
                    ))}
                  </Picker>
                </View>
                <View style={styles.settingGroup}>
                  <Text style={styles.settingSubLabel}>Filler Mode:</Text>
                  <Picker 
                    selectedValue={fillerMode} 
                    onValueChange={handleFillerModeChange} 
                    style={styles.picker}
                  >
                    <Picker.Item 
                      label="Default" 
                      value="default"
                      color={fillerMode === "default" ? '#ADD8E6' : '#000000'}
                    />
                    <Picker.Item 
                      label="Custom" 
                      value="custom"
                      color={fillerMode === "custom" ? '#ADD8E6' : '#000000'}
                    />
                  </Picker>
                </View>
                {fillerMode === "custom" && (
                  <View style={styles.settingGroup}>
                    <Text style={styles.settingSubLabel}>Custom Words:</Text>
                    <TextInput
                      value={customWords}
                      onChangeText={handleCustomWordsChange}
                      placeholder="Enter custom filler words (comma-separated)"
                      style={styles.input}
                      multiline
                    />
                  </View>
                )}
              </View>
            )}

            {/* Volume Settings */}
            <TouchableOpacity
              onPress={() => setExpandedVolume(!expandedVolume)}
              style={styles.settingRow}
            >
              <View style={styles.settingPreview}>
                <Text style={styles.settingLabel}>Volume Settings:</Text>
                <Text style={styles.settingValue}>{volumeValue.replace(/(-?\d+)-(-?\d+)/, '$1 to $2')} dB</Text>
              </View>
            </TouchableOpacity>
            {expandedVolume && (
              <View style={styles.dropdownContent}>
                <View style={styles.settingGroup}>
                  <Text style={styles.settingSubLabel}>Volume Range:</Text>
                  <Picker 
                    selectedValue={volumeValue} 
                    onValueChange={handleVolumeValueChange} 
                    style={styles.picker}
                  >
                    {[
                      { label: "-100 to -80 dB", value: "-100--80" },
                      { label: "-95 to -75 dB", value: "-95--75" },
                      { label: "-90 to -70 dB", value: "-90--70" },
                      { label: "-85 to -65 dB", value: "-85--65" },
                      { label: "-80 to -60 dB", value: "-80--60" },
                      { label: "-75 to -55 dB", value: "-75--55" },
                      { label: "-70 to -50 dB", value: "-70--50" },
                      { label: "-65 to -45 dB", value: "-65--45" },
                      { label: "-60 to -40 dB", value: "-60--40" },
                      { label: "-55 to -35 dB", value: "-55--35" },
                      { label: "-50 to -30 dB", value: "-50--30" },
                      { label: "-45 to -25 dB", value: "-45--25" },
                      { label: "-40 to -20 dB", value: "-40--20" },
                      { label: "-35 to -15 dB", value: "-35--15" },
                      { label: "-30 to -10 dB", value: "-30--10" },
                      { label: "-25 to -5 dB", value: "-25--5" },
                      { label: "-20 to 0 dB", value: "-20-0" },
                      { label: "-15 to 5 dB", value: "-15-5" },
                      { label: "-10 to 10 dB", value: "-10-10" },
                      { label: "-5 to 15 dB", value: "-5-15" },
                      { label: "0 to 20 dB", value: "0-20" }
                    ].map((item) => (
                      <Picker.Item 
                        key={item.value}
                        label={item.label}
                        value={item.value}
                        color={String(volumeValue) === String(item.value) ? '#ADD8E6' : '#000000'}
                      />
                    ))}
                  </Picker>
                </View>
                <View style={styles.settingGroup}>
                  <Text style={styles.settingSubLabel}>Trigger Count:</Text>
                  <Picker 
                    selectedValue={volumeTrigger} 
                    onValueChange={handleVolumeTriggerChange} 
                    style={styles.picker}
                  >
                    {Array.from({ length: 10 }, (_, i) => (
                      <Picker.Item 
                        key={i + 1} 
                        label={`${i + 1}`} 
                        value={`${i + 1}`}
                        color={`${i + 1}` === volumeTrigger ? '#ADD8E6' : '#000000'}
                      />
                    ))}
                  </Picker>
                </View>
                <View style={styles.settingGroup}>
                  <Text style={styles.settingSubLabel}>Calibration:</Text>
                  <Text style={styles.settingValue}>
                    {userSettings.volumeZeroPoint ? `${userSettings.volumeZeroPoint.toFixed(1)} dB` : 'Not Calibrated'}
                  </Text>
                  <TouchableOpacity 
                    style={[styles.calibrateButton, isCalibrating && styles.calibratingButton]} 
                    onPress={calibrateVolume}
                    disabled={isCalibrating}
                  >
                    <Text style={styles.calibrateButtonText}>
                      {isCalibrating ? 'Calibrating...' : 'Calibrate Volume'}
                    </Text>
                  </TouchableOpacity>
                  {calibrationStatus ? (
                    <Text style={styles.calibrationStatus}>{calibrationStatus}</Text>
                  ) : null}
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
