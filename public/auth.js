// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function () {
    // -------------------------------------------------------------------------
    // !! IMPORTANT: Firebase Configuration !!
    // Replace with your actual Firebase project configuration
    // -------------------------------------------------------------------------
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

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const database = firebase.database();
    const storage = firebase.storage(); // For profile pictures

    // DOM Elements
    const showSigninBtn = document.getElementById('show-signin-btn');
    const showSignupBtn = document.getElementById('show-signup-btn');
    const signinFormContainer = document.getElementById('signin-form-container');
    const signupFormContainer = document.getElementById('signup-form-container');

    const signinForm = document.getElementById('signin-form');
    const signupForm = document.getElementById('signup-form');

    const signinEmailInput = document.getElementById('signin-email');
    const signinPasswordInput = document.getElementById('signin-password');

    const signupNameInput = document.getElementById('signup-name');
    const signupEmailInput = document.getElementById('signup-email');
    const signupPasswordInput = document.getElementById('signup-password');
    const signupConfirmPasswordInput = document.getElementById('signup-confirm-password');
    const signupAgeInput = document.getElementById('signup-age');
    const signupClassInput = document.getElementById('signup-class');
    const signupStreamInput = document.getElementById('signup-stream');
    const signupProfilePictureInput = document.getElementById('signup-profile-picture');

    const googleSigninBtnSignin = document.getElementById('google-signin-btn-signin');
    const googleSigninBtnSignup = document.getElementById('google-signin-btn-signup');
    const forgotPasswordLink = document.getElementById('forgot-password-link');

    const messageContainer = document.getElementById('message-container');

    // Modal for Google Sign Up - Additional Info
    const googleExtraModal = document.getElementById('google-signup-extra-modal');
    const googleExtraForm = document.getElementById('google-extra-info-form');
    const googleSignupClassInput = document.getElementById('google-signup-class');
    const googleSignupAgeInput = document.getElementById('google-signup-age');
    const googleSignupStreamInput = document.getElementById('google-signup-stream');
    const closeModalButton = document.querySelector('.modal .close-button');

    let tempGoogleUser = null; // To store Google user details temporarily

    // Toggle between Sign In and Sign Up forms
    showSigninBtn.addEventListener('click', () => {
        signinFormContainer.classList.add('active-form');
        signupFormContainer.classList.remove('active-form');
        showSigninBtn.classList.add('active');
        showSignupBtn.classList.remove('active');
        clearMessages();
    });

    showSignupBtn.addEventListener('click', () => {
        signupFormContainer.classList.add('active-form');
        signinFormContainer.classList.remove('active-form');
        showSignupBtn.classList.add('active');
        showSigninBtn.classList.remove('active');
        clearMessages();
    });

    // Display messages
    function showMessage(message, type = 'error') {
        messageContainer.textContent = message;
        messageContainer.className = `message ${type}`; // Apply 'error' or 'success' class
    }

    function clearMessages() {
        messageContainer.textContent = '';
        messageContainer.className = 'message';
    }

    // --- Sign Up with Email and Password ---
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearMessages();

        const name = signupNameInput.value.trim();
        const email = signupEmailInput.value.trim();
        const password = signupPasswordInput.value;
        const confirmPassword = signupConfirmPasswordInput.value;
        const age = signupAgeInput.value;
        const className = signupClassInput.value.trim(); // Changed variable name
        const stream = signupStreamInput.value.trim();
        const profilePictureFile = signupProfilePictureInput.files[0];

        if (password !== confirmPassword) {
            showMessage('Passwords do not match.');
            return;
        }
        if (password.length < 6) {
            showMessage('Password should be at least 6 characters long.');
            return;
        }
        if (!name || !email || !age || !className) {
            showMessage('Please fill in all required fields (Name, Email, Age, Class).');
            return;
        }

        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            showMessage('Verification email sent. Please check your inbox.', 'success');

            // Send email verification
            await user.sendEmailVerification();

            // Upload profile picture if selected
            let profilePictureURL = '';
            if (profilePictureFile) {
                const storageRef = storage.ref(`profile_pictures/${user.uid}/${profilePictureFile.name}`);
                const uploadTask = await storageRef.put(profilePictureFile);
                profilePictureURL = await uploadTask.ref.getDownloadURL();
            }

            // Store user data in Realtime Database
            await database.ref('users/' + user.uid).set({
                uid: user.uid,
                name: name,
                email: email,
                age: parseInt(age),
                class: className,
                subjectStream: stream || null, // Store null if empty
                profilePictureURL: profilePictureURL || null,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });

            showMessage('Sign up successful! A verification email has been sent. Please verify your email before signing in.', 'success');
            signupForm.reset();
            // Keep user on auth page until email is verified
            // Optional: redirect to a "please verify email" page or show persistent message

        } catch (error) {
            console.error("Sign up error:", error);
            showMessage(error.message);
        }
    });

    // --- Sign In with Email and Password ---
    signinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearMessages();

        const email = signinEmailInput.value.trim();
        const password = signinPasswordInput.value;

        if (!email || !password) {
            showMessage('Please enter both email and password.');
            return;
        }

        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            if (user.emailVerified) {
                showMessage('Sign in successful! Redirecting...', 'success');
                window.location.href = 'app.html'; // Redirect to app page
            } else {
                await auth.signOut(); // Sign out user if email not verified
                showMessage('Please verify your email before signing in. A new verification email has been sent.');
                await user.sendEmailVerification(); // Resend verification email
            }
        } catch (error) {
            console.error("Sign in error:", error);
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                showMessage('Invalid email or password.');
            } else if (error.code === 'auth/too-many-requests') {
                showMessage('Too many login attempts. Please try again later.');
            }
            else {
                showMessage(error.message);
            }
        }
    });

    // --- Google Sign-In/Sign-Up ---
    const handleGoogleSignIn = async () => {
        clearMessages();
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            const result = await auth.signInWithPopup(provider);
            const user = result.user;
            const additionalUserInfo = result.additionalUserInfo;

            if (user.emailVerified) { // Google accounts are typically pre-verified
                // Check if user exists in our database
                const userRef = database.ref('users/' + user.uid);
                const snapshot = await userRef.once('value');

                if (snapshot.exists() && snapshot.val().class) {
                    // User exists and has class info, proceed to app
                    showMessage('Google Sign in successful! Redirecting...', 'success');
                    window.location.href = 'app.html';
                } else {
                    // New user or existing user missing class info
                    tempGoogleUser = user; // Store user temporarily
                    // Prefill if possible
                    googleSignupAgeInput.value = ''; // Clear previous
                    googleSignupStreamInput.value = ''; // Clear previous
                    if (snapshot.exists()) {
                        const existingData = snapshot.val();
                        googleSignupAgeInput.value = existingData.age || '';
                        googleSignupStreamInput.value = existingData.subjectStream || '';
                    }

                    googleExtraModal.style.display = 'flex'; // Show modal
                }
            } else {
                // This case is unlikely with Google but good to handle
                await auth.signOut();
                showMessage('Google account not verified. Please ensure your Google account is active.');
            }
        } catch (error) {
            console.error("Google Sign-In error:", error);
            if (error.code === 'auth/popup-closed-by-user') {
                showMessage('Google Sign-In cancelled.');
            } else if (error.code === 'auth/account-exists-with-different-credential') {
                showMessage('An account already exists with this email address using a different sign-in method.');
            } else {
                showMessage('Error with Google Sign-In: ' + error.message);
            }
        }
    };

    googleSigninBtnSignin.addEventListener('click', handleGoogleSignIn);
    googleSigninBtnSignup.addEventListener('click', handleGoogleSignIn);


    // --- Handle Additional Info for Google Sign Up ---
    googleExtraForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const className = googleSignupClassInput.value.trim();
        const age = googleSignupAgeInput.value;
        const stream = googleSignupStreamInput.value.trim();

        if (!className || !age) {
            alert('Please provide your class and age.'); // Simple alert for modal
            return;
        }

        if (!tempGoogleUser) {
            showMessage('Error: No Google user data found. Please try signing in again.', 'error');
            googleExtraModal.style.display = 'none';
            return;
        }

        try {
            const user = tempGoogleUser;
            const userRef = database.ref('users/' + user.uid);

            await userRef.set({ // Use set to create or overwrite
                uid: user.uid,
                name: user.displayName || 'Google User',
                email: user.email,
                profilePictureURL: user.photoURL || null,
                age: parseInt(age),
                class: className,
                subjectStream: stream || null,
                provider: 'google', // Indicate Google sign-up
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });

            googleExtraModal.style.display = 'none';
            googleExtraForm.reset();
            tempGoogleUser = null;
            showMessage('Information saved! Redirecting...', 'success');
            window.location.href = 'app.html';

        } catch (error) {
            console.error("Error saving Google user extra info:", error);
            alert('Failed to save information: ' + error.message); // Alert in modal
        }
    });

    if (closeModalButton) {
        closeModalButton.onclick = function() {
            googleExtraModal.style.display = "none";
            googleExtraForm.reset();
            tempGoogleUser = null; // Clear temp user if modal is closed manually
            showMessage('Google sign up process was not completed.', 'error');
        }
    }
    // Close modal if user clicks outside of it
    window.onclick = function(event) {
        if (event.target == googleExtraModal) {
            googleExtraModal.style.display = "none";
            googleExtraForm.reset();
            tempGoogleUser = null;
            showMessage('Google sign up process was not completed.', 'error');
        }
    }


    // --- Forgot Password ---
    forgotPasswordLink.addEventListener('click', async (e) => {
        e.preventDefault();
        clearMessages();
        const email = prompt("Please enter your email address to reset your password:");

        if (email) {
            try {
                await auth.sendPasswordResetEmail(email);
                showMessage('Password reset email sent. Please check your inbox.', 'success');
            } catch (error) {
                console.error("Password reset error:", error);
                if (error.code === 'auth/user-not-found') {
                    showMessage('No user found with this email address.');
                } else {
                    showMessage('Error sending password reset email: ' + error.message);
                }
            }
        } else if (email !== null) { // User didn't cancel but entered empty string
             showMessage('Please enter a valid email address.');
        }
    });


    // --- Auth State Observer ---
    // Optional: You might want to redirect if user is already logged in and verified
    auth.onAuthStateChanged(user => {
        if (user && user.emailVerified) {
            // If user is on auth.html but already logged in and verified,
            // you could redirect them to app.html.
            // However, this might be disruptive if they intentionally navigated to auth.html
            // (e.g., to sign out or manage account).
            // For now, we'll only redirect after explicit sign-in/sign-up actions.
            // console.log("User is signed in and verified:", user.email);
        } else if (user && !user.emailVerified) {
            // console.log("User is signed in but email not verified:", user.email);
        } else {
            // console.log("No user is signed in.");
        }
    });

});