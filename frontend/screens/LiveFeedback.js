import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TextInput,
  Image,
  ScrollView,
} from 'react-native';

export default function LiveFeedback() {
  const [enableSpeed, setEnableSpeed] = useState(false);
  const [enableVolume, setEnableVolume] = useState(false);
  const [enableFiller, setEnableFiller] = useState(false);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Image source={require('../assets/EchoLogoGray.png')} style={styles.logo} />
        <Text style={styles.title}>Live Feedback Settings</Text>

        {/* SPEED */}
        <View style={styles.settingRow}>
          <Text style={styles.label}>Speed</Text>
          <Switch
            trackColor={{ false: '#ccc', true: '#0B132B' }}
            thumbColor="#eee"
            value={enableSpeed}
            onValueChange={setEnableSpeed}
          />
        </View>
        {enableSpeed && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>BPM Range</Text>
            <TextInput placeholder="e.g., 100-140" style={styles.inputBox} />
          </View>
        )}

        {/* VOLUME */}
        <View style={styles.settingRow}>
          <Text style={styles.label}>Volume</Text>
          <Switch
            trackColor={{ false: '#ccc', true: '#0B132B' }}
            thumbColor="#eee"
            value={enableVolume}
            onValueChange={setEnableVolume}
          />
        </View>
        {enableVolume && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Decibel Range</Text>
            <TextInput placeholder="e.g., 60-90" style={styles.inputBox} />
          </View>
        )}

        {/* FILLER */}
        <View style={styles.settingRow}>
          <Text style={styles.label}>Filler</Text>
          <Switch
            trackColor={{ false: '#ccc', true: '#0B132B' }}
            thumbColor="#eee"
            value={enableFiller}
            onValueChange={setEnableFiller}
          />
        </View>
        {enableFiller && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Filler Word Cap</Text>
            <TextInput placeholder="e.g., 10" style={styles.inputBox} />
            <Text style={styles.inputLabel}>Filler Words (comma-separated)</Text>
            <TextInput placeholder="um, like, you know" style={styles.inputBox} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 25,
    alignItems: 'center',
  },
  logo: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'AveriaSerifLibre-Regular',
    marginBottom: 30,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginVertical: 12,
  },
  label: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'AveriaSerifLibre-Regular',
  },
  inputGroup: {
    width: '100%',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    marginTop: 10,
    marginBottom: 4,
    color: '#444',
  },
  inputBox: {
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
  },
});
