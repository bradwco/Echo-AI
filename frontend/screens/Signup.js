// Signup.js

import React, { useState } from 'react';
import { signupUser } from '../firebase';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
} from 'react-native';

export default function Signup({ navigation }) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignupAttempt = async () => {
    const result = await signupUser(email, password);
    if (result.success) {
      alert(result.message);
      navigation.replace('Login');
    } else {
      alert(result.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoCircle}>
        <Image
          source={require('../assets/EchoLogoGray.png')}
          style={styles.logoImage}
        />
      </View>

      <Text style={styles.title}>Create Account</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        returnKeyType="next"
      />

      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Password"
          placeholderTextColor="#999"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          returnKeyType="done"
          onSubmitEditing={handleSignupAttempt}
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.eyeButton}
        >
          <Image
            source={
              showPassword
                ? require('../assets/eye-off.png')
                : require('../assets/eye.png')
            }
            style={styles.eyeIcon}
          />
        </TouchableOpacity>
      </View>

      {/* Sign Up Button */}
      <TouchableOpacity style={styles.signupButton} onPress={handleSignupAttempt}>
        <Text style={styles.signupButtonText}>Sign Up</Text>
      </TouchableOpacity>

      <View style={styles.dividerContainer}>
        <View style={styles.line} />
        <Text style={styles.orText}>or</Text>
        <View style={styles.line} />
      </View>

      <View style={styles.socialContainer}>
        <TouchableOpacity onPress={() => console.log('Google Signup')}>
          <Image source={require('../assets/google.png')} style={styles.socialIcon} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => console.log('GitHub Signup')}>
          <Image source={require('../assets/github.png')} style={styles.socialIcon} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => console.log('Facebook Signup')}>
          <Image source={require('../assets/facebook.png')} style={styles.socialIcon} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => navigation.replace('Login')}>
        <Text style={styles.signupText}>Have an account? Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 100,
    alignItems: 'center',
  },
  logoCircle: {
    width: 120,
    height: 120,
    backgroundColor: '#D9D9D9',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  logoImage: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    fontFamily: 'AveriaSerifLibre-Regular',
  },
  input: {
    width: '85%',
    height: 50,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '85%',
    height: 50,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  eyeButton: {
    paddingHorizontal: 8,
  },
  eyeIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
    tintColor: '#555',
  },
  signupButton: {
    backgroundColor: '#111B31',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 999,
    marginBottom: 20,
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'AveriaSerifLibre-Regular',
    textAlign: 'center',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '85%',
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#aaa',
  },
  orText: {
    marginHorizontal: 10,
    fontSize: 14,
    color: '#555',
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 25,
    marginBottom: 30,
  },
  socialIcon: {
    width: 45,
    height: 45,
    resizeMode: 'contain',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    padding: 8,
  },
  signupText: {
    fontSize: 14,
    color: '#000',
    marginTop: 10,
  },
});
