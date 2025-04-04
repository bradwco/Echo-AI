import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';

import StartScreen from '../screens/StartScreen';
import PracticeScreen from '../screens/PracticeScreen';
import LoginScreen from '../screens/Login';
import SignupScreen from '../screens/Signup';
import HomeScreen from '../screens/Home';
import RecordScreen from '../screens/Record';
import SessionsScreen from '../screens/ViewSessions';
import LiveScreen from '../screens/LiveFeedback';
import ProfileScreen from '../screens/ProfileScreen';
import HeaderRightProfile from '../components/HeaderRightProfile';

const Stack = createNativeStackNavigator();

export default function Navigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
        headerRight: () => <HeaderRightProfile />,
        headerShadowVisible: true,
    }}>
        <Stack.Screen 
            name="Start" 
            component={StartScreen} 
            options={{
                headerShown: false,
              }}
        />
        <Stack.Screen name="Practice" component={PracticeScreen} />
        <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            options={{
                headerShown: false,
              }}
        />
        <Stack.Screen 
            name="Signup" 
            component={SignupScreen} 
            options={{
                headerShown: false,
              }}
        />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen 
          name="Record" 
          component={RecordScreen} 
          options={{
            headerTitle: '',
          }}
          />
        <Stack.Screen 
          name="Sessions" 
          component={SessionsScreen}
          options={{
            headerTitle: '',
          }}
          />
        <Stack.Screen 
          name="Live" 
          component={LiveScreen} 
          options={{
            headerTitle: '',
          }}
          />
        <Stack.Screen 
            name="Profile" 
            component={ProfileScreen} 
            options={{
                headerRight: () => null,
              }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
