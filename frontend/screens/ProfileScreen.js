import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  auth,
  saveUserProfile,
  getUserProfile,
  uploadProfilePicture,
  logoutUser,
} from '../firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileScreen({ navigation }) {
  const [username, setUsername] = useState('YourUsername');
  const [isEditing, setIsEditing] = useState(false);
  const [profileImage, setProfileImage] = useState(require('../assets/user.png'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const data = await getUserProfile(user.uid);
        if (data) {
          if (data.username) setUsername(data.username);
          if (data.imageUrl) {
            setProfileImage({ uri: data.imageUrl });
          } else {
            setProfileImage(require('../assets/user.png'));
          }
        }
        
      } catch (err) {
        console.error('Error fetching profile:', err);
      }
      setLoading(false);
    };

    const unsubscribe = auth.onAuthStateChanged(() => {
      fetchProfile();
    });

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

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0B132B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={pickImage}>
        <Image source={profileImage} style={styles.profilePic} />
      </TouchableOpacity>

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

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 20,
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
    fontFamily: 'AveriaSerifLibre-Regular',
    marginRight: 10,
  },
  usernameInput: {
    fontSize: 20,
    borderBottomWidth: 1,
    borderColor: '#aaa',
    paddingHorizontal: 6,
    marginRight: 10,
    fontFamily: 'AveriaSerifLibre-Regular',
  },
  editIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
    tintColor: '#0B132B',
  },
  logoutBtn: {
    backgroundColor: '#0B132B',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 999,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'AveriaSerifLibre-Regular',
  },
});
