import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Pressable,
} from 'react-native';
import { BlurView } from 'expo-blur';

export default function Home({ navigation }) {
  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/EchoLogoGray.png')}
        style={styles.logoTop}
      />

      <Pressable
        onPress={() => {
            console.log('Record Session');
            navigation.navigate('Record');
        }}
        style={({ pressed }) => [
          styles.button,
          styles.buttonBlue,
          pressed && styles.buttonPressed,
        ]}
      >
        <View style={styles.iconWrapper}>
          <Image source={require('../assets/microphone.png')} style={styles.logoIcon} />
        </View>
        <Text style={styles.buttonText}>Record Session</Text>
      </Pressable>

      <Pressable
        onPress={() => {
            console.log('View Sessions');
            navigation.navigate('Sessions');
        }}

        style={({ pressed }) => [
          styles.button,
          styles.buttonLightBlue,
          pressed && styles.buttonPressed,
        ]}
      >
        <View style={styles.iconWrapper}>
          <Image source={require('../assets/folder.png')} style={styles.logoIcon} />
        </View>
        <Text style={styles.buttonText}>View Sessions</Text>
      </Pressable>

      <Pressable
        onPress={() => {
            console.log('Live Feedback');
            navigation.navigate('Live');
        }}
        style={({ pressed }) => [
          styles.button,
          styles.buttonDarkBlue,
          pressed && styles.buttonPressed,
        ]}
      >
        <View style={styles.iconWrapper}>
          <Image source={require('../assets/live.png')} style={styles.logoIcon} />
        </View>
        <Text style={styles.buttonText}>Live Feedback</Text>
      </Pressable>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 80,
    alignItems: 'center',
  },
  logoTop: {
    width: 100,
    height: 100,
    marginBottom: 40,
    resizeMode: 'contain',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    width: width * 0.85,
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginBottom: 25,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  iconWrapper: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 50,
    padding: 12,
    marginRight: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 1, height: 2 },
    shadowRadius: 4,
  },
  logoIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  buttonText: {
    fontSize: 18,
    fontFamily: 'AveriaSerifLibre-Regular',
    color: '#111',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  buttonBlue: {
    backgroundColor: '#96B8CE',
  },
  buttonLightBlue: {
    backgroundColor: '#C5D3E0',
  },
  buttonDarkBlue: {
    backgroundColor: '#3F5994',
  },
});
