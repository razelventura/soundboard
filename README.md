# soundboard-razel

Mobile App Devt (CIT2269)  
Assignment 3   
Author: Razel Ventura, s0541328  
Date: 2024-03-10  
//.readme  
Brief: An explanation of the thinking process / considerations for the Soundboard app.


DEPENDENCIES  
Make sure to install SQLite and AV using the following terminal commands:    
`npx expo install expo-sqlite`   
`npx expo install expo-av`


WHAT IS THE VISION FOR THE APP   
- It could be used as a simple sound effect generator for casual conversations. For example, play a laugh track when somebody makes a joke to make things awkward.  
- It could be used like a looper pedal so create amazing music.


HOW IS THIS VISION ACHIEVED  
- The app has two sets of sounds: pre-loaded and recorded  
- There are four pre-loaded sounds included in this repository.  
- The recorded sounds are saved in a database.  
- All sounds can be played and stopped on press.  
- They can be played at the same time.  
- There's a toggle switch to control loopback settings.  
- Long press of a specific recording will allow the user to delete that recording.  
- User will not be able to delete a pre-loaded sound.  
- The user can record as many sounds as they like.  
- The view will become scrollable to accommodate many recordings.


WISHLIST  
These are the things that can be done to improve the app:  
- Limit the length of the recording
- Allow the user to rename their recording so it's easier to manage sounds
