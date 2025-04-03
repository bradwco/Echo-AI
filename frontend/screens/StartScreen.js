import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'react-native';

export default function StartScreen({ navigation }) {
      return (
        <View style={styles.container}>
          <View style={styles.topBackground} />
          <View style={styles.logoCircle} >
            <Image source={require('../assets/EchoLogoGray.png')} style={styles.logoImage} />
          </View>
          <Text style={styles.title}>echo</Text>
          <Text style={styles.subtitle}>Practice, improve, and teach with confidence</Text>
    
          <TouchableOpacity 
            style={styles.button}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.buttonText}>Get Started for Free</Text>
          </TouchableOpacity>
    
          <StatusBar style="auto" />
        </View>
      );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#fff',
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    topBackground: {
      backgroundColor: '#111B31',
      width: '100%',
      height: '38%', // slightly taller curve
      borderBottomLeftRadius: 92,
      borderBottomRightRadius: 92,
    },
    logoCircle: {
      position: 'absolute',
      top: '35%', // moved lower
      transform: [{ translateY: -40 }],
      width: 120,
      height: 120,
      backgroundColor: '#D9D9D9',
      borderRadius: 60,
      zIndex: 1,
    },
    logoImage: {
        width: 60,
        height: 60,
        resizeMode: 'contain',
        alignSelf: 'center',
        marginTop: 30, // Adjust vertically inside the circle
      },      
    title: {
      fontSize: 50,
      fontFamily: 'AveriaSerifLibre-Regular',
      marginTop: 90, // pushed lower
      color: '#000',
    },
    subtitle: {
      fontSize: 14,
      color: '#555',
      textAlign: 'center',
      marginTop: 10,
    },
    button: {
      backgroundColor: '#111B31',
      paddingVertical: 20,
      paddingHorizontal: 80,
      borderRadius: 999,
      marginTop: 90, // slightly lower
    },
    buttonText: {
      color: '#fff',
      fontSize: 14,
    },
  });