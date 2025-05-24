// firebase-config.js
// IMPORTANT: Make sure this file is included BEFORE your auth.js or blog.js

const firebaseConfig = {
  apiKey: "AIzaSyAcGV4zQzJ_-fqR2V0tSWVKB3uzMV6oxTU",
  authDomain: "mcicts-web.firebaseapp.com",
  databaseURL: "https://mcicts-web-default-rtdb.firebaseio.com",
  projectId: "mcicts-web",
  storageBucket: "mcicts-web.appspot.com",
  messagingSenderId: "651633177347",
  appId: "1:651633177347:web:c4c1eb64a8c0c8fcd2af36",
  measurementId: "G-1TW4C34SYG"
};

// Initialize Firebase (do this once per page load)
// Check if Firebase is already initialized to avoid errors on multiple script loads
if (!firebase.apps.length) {
  try {
    firebase.initializeApp(firebaseConfig);
  } catch (e) {
    console.error("Firebase initialization error in firebase-config.js:", e);
    alert('Critical error: Firebase could not be initialized. Please contact support.');
  }
}

const auth = firebase.auth();
const database = firebase.database();
const storage = firebase.storage(); // If you use storage on the blog page too