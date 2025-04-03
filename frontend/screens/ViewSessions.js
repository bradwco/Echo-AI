import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ViewSessionsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>View Sessions</Text>
      <Text style={styles.subtitle}>Your past recordings and session metrics will appear here.</Text>
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
  title: {
    fontSize: 26,
    fontFamily: 'AveriaSerifLibre-Regular',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
