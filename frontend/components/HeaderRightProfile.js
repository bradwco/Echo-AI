import React, { useEffect, useState } from 'react';
import { TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function HeaderRightProfile() {
  const navigation = useNavigation();
  const [profileImage, setProfileImage] = useState(require('../assets/user.png'));

  useEffect(() => {
    const loadFromCacheFirst = async () => {
      const cachedUrl = await AsyncStorage.getItem('profileImageUrl');
      if (cachedUrl) {
        setProfileImage({ uri: cachedUrl }); // ✅ Show cached image immediately
      }
    };
  
    const syncWithFirebase = () => {
      return auth.onAuthStateChanged(async (user) => {
        if (!user) return;
  
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.imageUrl) {
              setProfileImage({ uri: data.imageUrl });
              await AsyncStorage.setItem('profileImageUrl', data.imageUrl);
            }
          }
        } catch (error) {
          console.error('Error loading profile image:', error);
        }
      });
    };
  
    loadFromCacheFirst();       // 🔹 Show something right away
    const unsubscribe = syncWithFirebase(); // 🔹 Sync afterward
    return unsubscribe;
  }, []);
  
  

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('Profile')}
      style={styles.container}
    >
      <Image
        source={profileImage}
        style={styles.avatar}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginRight: 15,
  },
  avatar: {
    width: 35,
    height: 35,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#0B132B',
  },
});
