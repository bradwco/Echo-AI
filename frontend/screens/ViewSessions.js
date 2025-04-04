import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  Alert,
  Image,
} from 'react-native';
import { format } from 'date-fns';
import { Audio } from 'expo-av';
import { auth, getUserSessions, deleteSession } from '../firebase';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental &&
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function ViewSessions() {
  const [sessions, setSessions] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [playingId, setPlayingId] = useState(null);
  const [sound, setSound] = useState(null);
  const [durations, setDurations] = useState({});

  useEffect(() => {
    const fetchSessions = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const data = await getUserSessions(user.uid);
      setSessions(data.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds));
    };
    fetchSessions();
  }, []);

  const toggleExpand = async (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleAudioPlayback = async (session) => {
    try {
      if (playingId === session.id && sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
        setPlayingId(null);
        return;
      }

      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });

      const { sound: newSound } = await Audio.Sound.createAsync({ uri: session.audioUrl });
      setSound(newSound);
      setPlayingId(session.id);
      await newSound.setVolumeAsync(1.0);
      await newSound.playAsync();

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setPlayingId(null);
          setSound(null);
        }
      });
    } catch (error) {
      console.error('Playback error:', error);
    }
  };

  const handleDelete = async (sessionId, audioUrl) => {
    Alert.alert(
      'Delete Session',
      'Are you sure you want to delete this session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteSession(sessionId, audioUrl);
            if (success) {
              setSessions((prev) => prev.filter((s) => s.id !== sessionId));
              if (expandedId === sessionId) setExpandedId(null);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Format and limit filler words to 10 unique words
  const formatFillerWords = (fillerWords) => {
    const uniqueFillerWords = [...new Set(fillerWords)].slice(0, 10);
    return uniqueFillerWords.join(', ') || 'None';
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {sessions.map((session) => {
        const dateObj = session.createdAt ? new Date(session.createdAt.seconds * 1000) : null;
        const formattedDate = dateObj ? format(dateObj, 'MMM d, yyyy') : 'Unknown Date';
        const formattedTime = dateObj ? format(dateObj, 'hh:mm a') : '';
        const displayDuration = session.duration || 'Loading...';
        const displayTranscript = session.transcript || 'Loading...';

        // Pull speed (WPM) and Filler Words directly from Firebase
        const wpm = session.speed || 'N/A'; // From Firebase
        const fillerWordsDisplay = formatFillerWords(session.fillerWords || []);

        return (
          <TouchableOpacity
            key={session.id}
            style={styles.card}
            onPress={() => toggleExpand(session.id)}
            activeOpacity={0.9}
          >
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>Session - {formattedDate}</Text>
                <Text style={styles.cardSubtitle}>{formattedTime}</Text>
              </View>
              <Text style={styles.expandIcon}>{expandedId === session.id ? '▲' : '▼'}</Text>
            </View>

            {expandedId === session.id && (
              <View style={styles.details}>
                <View style={styles.audioDeleteRow}>
                  <TouchableOpacity
                    style={styles.audioButton}
                    onPress={() => handleAudioPlayback(session)}
                  >
                    <Text style={styles.audioButtonText}>
                      {playingId === session.id ? '⏹ Stop Audio' : '▶ Play Audio'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(session.id, session.audioUrl)}
                  >
                    <Image
                      source={require('../assets/trash.png')}
                      style={styles.deleteIcon}
                    />
                  </TouchableOpacity>
                </View>

                <Text style={styles.metricTitle}>Metrics</Text>
                <View style={styles.sectionBox}>
                  <Text style={styles.metricText}>Speed: {wpm} WPM</Text>
                  <Text style={styles.metricText}>Volume: {session.volume || 'N/A'} dB</Text>
                  <Text style={styles.metricText}>
                    Filler Words ({session.fillerWordCount || 'N/A'}): {fillerWordsDisplay}
                  </Text>
                  <Text style={styles.metricText}>Duration: {displayDuration}</Text>
                </View>

                <Text style={styles.metricTitle}>Transcript</Text>
                <Text style={styles.sectionBox}>{displayTranscript}</Text>

                <Text style={styles.metricTitle}>AI Feedback</Text>
                <View style={styles.sectionBox}>
                  {(session.feedback || ['No feedback available.']).map((item, idx) => (
                    <Text key={idx}>{'\u2022'} {item}</Text>
                  ))}
                </View>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#1C2541',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
    fontFamily: 'AveriaSerifLibre-Regular',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#ccc',
    marginTop: 4,
  },
  expandIcon: {
    fontSize: 18,
    color: '#ccc',
  },
  details: {
    marginTop: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    padding: 12,
  },
  metricTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 8,
    fontFamily: 'AveriaSerifLibre-Regular',
  },
  metricText: {
    fontSize: 14,
    marginBottom: 4,
  },
  sectionBox: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
    fontSize: 14,
  },
  audioDeleteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  audioButton: {
    flex: 0.85,
    backgroundColor: '#0B132B',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  audioButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  deleteButton: {
    flex: 0.15,
    backgroundColor: '#FF4C4C',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
    tintColor: 'white',
  },
});
