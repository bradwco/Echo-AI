import Navigation from './navigation/Navigation';
import { useFonts } from 'expo-font';

export default function App() {
  const [fontsLoaded] = useFonts({
    'AveriaSerifLibre-Regular': require('./assets/fonts/AveriaSerifLibre-Regular.ttf'),
  });
  if (!fontsLoaded) return null;
  return <Navigation/>;
}
