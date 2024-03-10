//Mobile App Devt (CIT2269) Assignment 3
//author: Razel Ventura, s0541328
//date: 2024-03-10
//App.js
/**brief: 
      This app loads four pre-loaded sounds and allows users to record their own sounds. 
       All sounds can be played and stopped on press. They can be played at the same time. 
       There's a toggle switch to control loopback settings.  
       Long press of a specific recording will allow the user to delete that recording.
       User will not be able to delete a pre-loaded sound.
       **/

import { StatusBar } from 'expo-status-bar';
import { Alert, Button, Image, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useEffect, useState } from 'react';
import { Audio } from 'expo-av';
import * as SQLite from 'expo-sqlite';
import instructionsText from './components/instructions';


const openDb = () => {
  if (Platform.OS === 'web') {
    return {
      transaction: () => {
        return {
          executeSql: () => {}
        };
      }
    };
  } else {
    const db = SQLite.openDatabase('recordings.db');
    return db;
  }
};

export default function App() {
  const [recordings, setRecordings] = useState([]); // Array to hold multiple recordings
  const [playbacks, setPlaybacks] = useState([]); // Array to hold playback objects for each recording
  const [sounds, setSounds] = useState({}); // New state to track sound objects
  const [permissionResponse, requestPermission] = Audio.usePermissions(); // Handle permissions
  const [isPlaying, setIsPlaying] = useState({}); // Track playing state of each recording
  const [isRecording, setIsRecording] = useState(false); // New state to track if recording is in progress
  const [loopPlayback, setLoopPlayback] = useState(true); // State for loop playback toggle
  const [db, setDb] = useState(()=>openDb());
  const [preloadedSounds, setPreloadedSounds] = useState([
    { name: "Canned Laughter", uri: require("./data/sfx/cannedlaugh.mp3") },
    { name: "Boing", uri: require("./data/sfx/boing.mp3") },
    { name: "Whoop Up", uri: require('./data/sfx/whoopup.mp3')},
    { name: "Whoop Down", uri: require('./data/sfx/whoopdown.mp3')}
  ]);
  const [preloadedSoundObjects, setPreloadedSoundObjects] = useState({});
  const showInstructions = () => {
    Alert.alert("Instructions", instructionsText, [{ text: "OK" }]);
  };

  // First, create the table
  useEffect(() => {
    db.transaction(tx => {
      tx.executeSql(
        "create table if not exists recordings (id integer primary key not null, uri text);",
        [],
        () => {
          console.log("Table created");
          // After table creation, update the recording list
          updateRecordingList();
        },
        (_, err) => console.log("Error creating table:", err)
      );
    });
  }, []);

//Save recordings to database
const saveRecordingToDB = (uri) => {
  db.transaction(tx => {
    tx.executeSql('insert into recordings (uri) values (?);', [uri]);
  }, null, updateRecordingList);
};

//Update recording list
const updateRecordingList = () => {
  db.transaction(tx => {
    tx.executeSql('select * from recordings;', [], (_, result) => {
      console.log('Recordings fetched:', result.rows._array); 
      setPlaybacks(result.rows._array);
    },
    (_, error) => {
      console.error('Failed to fetch recordings:', error); 
    });
  });
};

  //Function to toggle recording on and off
  const toggleRecording = async () => {
    if (isRecording) {
      // Stop the current recording
      const index = recordings.length - 1; 
      const recording = recordings[index];
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      saveRecordingToDB(uri); // Save recording after getting the URI
      setIsRecording(false); // Update recording state after saving to DB
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    } else {
      // Start a new recording
      if (permissionResponse.status !== 'granted') {
        await requestPermission();
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecordings([...recordings, recording]);
      setIsRecording(true); // Update recording state
    }
  };


//Function to play a specific recording and manage sound object state
const togglePlayback = async (index) => {
  const playbackUri = playbacks[index].uri;
  if (isPlaying[index]) {
    // If currently playing, stop
    await sounds[index]?.stopAsync();
    setIsPlaying(prevState => ({ ...prevState, [index]: false }));
  } else {
    // If not playing, start
    const { sound } = await Audio.Sound.createAsync(
      { uri: playbackUri },
      { shouldPlay: true, isLooping: loopPlayback, playsInSilentModeIOS: true }
    );
    await sound.playAsync();
    setSounds(prevSounds => ({ ...prevSounds, [index]: sound }));
    setIsPlaying(prevState => ({ ...prevState, [index]: true }));

    // Set up the playback status update listener
    sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded) {
        setIsPlaying(prevState => ({ ...prevState, [index]: false }));
      }
      // When the playback is finished and not looping, reset the playing state
      if (status.didJustFinish && !loopPlayback) {
        setIsPlaying(prevState => ({ ...prevState, [index]: false }));
      }
    });
  }
};

// Function to confirm deletion of a recording
  const confirmDelete = (index) => {
    Alert.alert(
      "Delete Recording",
      "Are you sure you want to delete this recording?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { text: "OK", onPress: () => deleteRecording(index) }
      ]
    );
  };

  // Function to delete a specific recording and unload the sound
  const deleteRecording = async (index) => {
    const { uri } = playbacks[index];
    db.transaction(tx => {
      tx.executeSql('delete from recordings where uri = ?;', [uri], () => {
        setPlaybacks(current => current.filter((_, i) => i !== index));
        if (sounds[index]) {
          sounds[index].unloadAsync();
          delete sounds[index];
          setIsPlaying(current => {
            const newState = { ...current };
            delete newState[index];
            return newState;
          });
        }
      });
    });
  };

  //Function to play a specific preloaded sound and manage sound object state
const togglePreloadedSound = async (index) => {
  const soundName = preloadedSounds[index].name;
  if (preloadedSoundObjects[soundName] && isPlaying[soundName]) {
    // If currently playing, stop
    await preloadedSoundObjects[soundName]?.stopAsync();
    setIsPlaying(prevState => ({ ...prevState, [soundName]: false }));
  } else {
    // If not playing, start
  try {
    const { sound } = await Audio.Sound.createAsync(
      preloadedSounds[index].uri,
      { shouldPlay: true, isLooping: loopPlayback, playsInSilentModeIOS: true }
    );
    await sound.playAsync();
    setPreloadedSoundObjects(prevSounds => ({ ...prevSounds, [soundName]: sound }));
    setIsPlaying(prevState => ({ ...prevState, [soundName]: true }));

    // Setup the playback status update listener
    sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded) {
        setIsPlaying(prevState => ({ ...prevState, [soundName]: false }));
      }
      // When the playback is finished and not looping, reset the playing state
      if (status.didJustFinish && !loopPlayback) {
        setIsPlaying(prevState => ({ ...prevState, [soundName]: false }));
      }
    });
  } catch (error){
    console.error("Error playing sound",error)
  }
}
};

  // Function to unload all sounds when the component unmounts
  useEffect(() => {
    return () => {
      Object.values(preloadedSoundObjects).forEach(async (sound) => {
        await sound.unloadAsync();
      });
      Object.values(sounds).forEach(async (sound) => {
        await sound.unloadAsync();
      });
    };
  }, []);

return (
  <View style={styles.container}>
    <View style={styles.topSection}>
      <Image
        source={require('./assets/soundboardLogo.png')}
        style={styles.logo}
      />
      <Button title="How to Use Soundboard" onPress={showInstructions} />
      <TouchableOpacity 
        style={styles.recordButton} 
        onPress={toggleRecording}
      >
        <Text style={{ color: 'black' }}> {isRecording ? "Stop Recording" : "Start New Recording"} </Text>
      </TouchableOpacity>
      <View style={styles.loopToggleContainer}>
        <Text style={{color: 'white'}}>Loop Playback:</Text>
        <Switch
          trackColor={{ false: "#767577", true: "#81b0ff" }}
          thumbColor={loopPlayback ? "#1c2951" : "#f4f3f4"}
          ios_backgroundColor="#3e3e3e"
          onValueChange={() => setLoopPlayback(previousState => !previousState)}
          value={loopPlayback}
        />
      </View>
    <Text style={{color: 'white'}}>(Stop any playback before changing the loop setting)</Text>
    </View>
    <ScrollView style={styles.scrollContainer}>
    {playbacks.map((playback, index) => (
      <Pressable
        key={index}
        onPress={() => togglePlayback(index)}
        onLongPress={() => confirmDelete(index)}
        style={({ pressed }) => [
          {
            backgroundColor: pressed ? 'lightgray' : '#07eab2',
          },
          styles.playbackContainer,
        ]}
      >
        <Text>
          {isPlaying[index] ? `Stop Playback ${index + 1}` : `Play Recording ${index + 1}`}
        </Text>
      </Pressable>
    ))}

      <Text style={{color: 'white', alignSelf: 'center'}}>Pre-loaded Sounds:</Text>
      {preloadedSounds.map((sound, index) => (
        <Pressable
          key={sound.name}
          onPress={() => togglePreloadedSound(index)}
          style={({ pressed }) => [
            {
              backgroundColor: pressed ? 'lightgray' : '#ff15a8',
            },
            styles.playbackContainer,
          ]}
        >
          <Text>
            {isPlaying[sound.name] ? `Stop ${sound.name}` : `Play ${sound.name}`}
          </Text>
        </Pressable>
      ))}
  </ScrollView>
    <StatusBar style="auto" />
  </View>
);
      
      }
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#13002e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButton: {
    backgroundColor: '#c7f800',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    borderRadius: 20, 
  },
  playbackContainer: {
    padding: 10,
    marginVertical: 5,
    alignItems: 'center',
    width: '80%',
    alignSelf: 'center',
  },
  loopToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  logo: {
    height: 200, 
    resizeMode: 'contain', // To fit image within the dimensions without stretching
    marginTop: 40, 
  },
  topSection: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  scrollContainer: {
    width: '100%',
  },
});