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
    try {
        firebase.initializeApp(firebaseConfig);
    } catch (e) {
        console.error("Firebase initialization error:", e);
        showMessage('Failed to initialize the application. Please contact support.', 'error', 0); // Persistent error
        return; // Stop script execution if Firebase fails to init
    }

    const auth = firebase.auth();
    const database = firebase.database();
    const storage = firebase.storage();

    // DOM Elements
    const showSigninBtn = document.getElementById('show-signin-btn');
    const showSignupBtn = document.getElementById('show-signup-btn');
    const signinFormContainer = document.getElementById('signin-form-container');
    const signupFormContainer = document.getElementById('signup-form-container');

    const signinForm = document.getElementById('signin-form');
    const signupForm = document.getElementById('signup-form');

    const signinEmailInput = document.getElementById('signin-email');
    const signinPasswordInput = document.getElementById('signin-password');
    const signinSubmitBtn = document.getElementById('signin-submit-btn');

    const signupNameInput = document.getElementById('signup-name');
    const signupEmailInput = document.getElementById('signup-email');
    const signupPasswordInput = document.getElementById('signup-password');
    const signupConfirmPasswordInput = document.getElementById('signup-confirm-password');
    const signupAgeInput = document.getElementById('signup-age');
    const signupClassInput = document.getElementById('signup-class');
    const signupStreamInput = document.getElementById('signup-stream');
    const signupProfilePictureInput = document.getElementById('signup-profile-picture');
    const signupSubmitBtn = document.getElementById('signup-submit-btn');

    const googleSigninBtnSignin = document.getElementById('google-signin-btn-signin');
    const googleSigninBtnSignup = document.getElementById('google-signin-btn-signup');
    const forgotPasswordLink = document.getElementById('forgot-password-link');

    const messageArea = document.getElementById('message-area');

    const googleExtraModal = document.getElementById('google-signup-extra-modal');
    const googleExtraForm = document.getElementById('google-extra-info-form');
    const googleSignupClassInput = document.getElementById('google-signup-class');
    const googleSignupAgeInput = document.getElementById('google-signup-age');
    const googleSignupStreamInput = document.getElementById('google-signup-stream');
    const closeModalButton = document.querySelector('.modal .close-button');

    let tempGoogleUser = null;
    let messageTimeout;

    // Toggle between Sign In and Sign Up forms
    showSigninBtn.addEventListener('click', () => switchForm('signin'));
    showSignupBtn.addEventListener('click', () => switchForm('signup'));

    function switchForm(formName) {
        clearMessages();
        if (formName === 'signin') {
            signinFormContainer.classList.add('active-form');
            signupFormContainer.classList.remove('active-form');
            showSigninBtn.classList.add('active');
            showSignupBtn.classList.remove('active');
        } else {
            signupFormContainer.classList.add('active-form');
            signinFormContainer.classList.remove('active-form');
            showSignupBtn.classList.add('active');
            showSigninBtn.classList.remove('active');
        }
    }

    // Display messages
    function showMessage(message, type = 'error', duration = 5000) {
        clearTimeout(messageTimeout);
        messageArea.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> <span>${message}</span>`;
        messageArea.className = `message-area show ${type}`;
        if (duration > 0) {
            messageTimeout = setTimeout(clearMessages, duration);
        }
    }

    function clearMessages() {
        messageArea.className = 'message-area';
        // messageArea.textContent = ''; // Keep structure for potential fixed height
    }

    // Toggle button loading state
    function toggleButtonLoading(button, isLoading) {
        const textSpan = button.querySelector('.btn-text');
        const loaderSpan = button.querySelector('.btn-loader');
        if (isLoading) {
            button.disabled = true;
            if(textSpan) textSpan.style.display = 'none';
            if(loaderSpan) loaderSpan.style.display = 'inline-block';
        } else {
            button.disabled = false;
            if(textSpan) textSpan.style.display = 'inline-block';
            if(loaderSpan) loaderSpan.style.display = 'none';
        }
    }


    // --- Sign Up with Email and Password ---
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearMessages();
        toggleButtonLoading(signupSubmitBtn, true);

        const name = signupNameInput.value.trim();
        const email = signupEmailInput.value.trim();
        const password = signupPasswordInput.value;
        const confirmPassword = signupConfirmPasswordInput.value;
        const age = signupAgeInput.value;
        const studentClass = signupClassInput.value.trim(); // Renamed to avoid conflict with 'class' keyword
        const stream = signupStreamInput.value.trim();
        const profilePictureFile = signupProfilePictureInput.files[0];

        if (password !== confirmPassword) {
            showMessage('Passwords do not match.');
            toggleButtonLoading(signupSubmitBtn, false);
            return;
        }
        if (password.length < 6) {
            showMessage('Password should be at least 6 characters long.');
            toggleButtonLoading(signupSubmitBtn, false);
            return;
        }
        if (!name || !email || !studentClass) { // Age is optional here if not explicitly required
            showMessage('Please fill in all required fields (Name, Email, Class).');
            toggleButtonLoading(signupSubmitBtn, false);
            return;
        }

        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            showMessage('Verification email sent. Please check your inbox.', 'success', 10000);
            await user.sendEmailVerification();

            let profilePictureURL = '';
            if (profilePictureFile) {
                const storageRef = storage.ref(`profile_pictures/${user.uid}/${profilePictureFile.name}`);
                const uploadTask = await storageRef.put(profilePictureFile);
                profilePictureURL = await uploadTask.ref.getDownloadURL();
            }

            await database.ref('users/' + user.uid).set({
                uid: user.uid,
                name: name,
                email: email,
                age: age ? parseInt(age) : null,
                class: studentClass,
                subjectStream: stream || null,
                profilePictureURL: profilePictureURL || null,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });

            showMessage('Sign up successful! A verification email has been sent. Please verify your email before signing in.', 'success', 10000);
            signupForm.reset();

        } catch (error) {
            console.error("Sign up error:", error);
            if (error.code === 'auth/email-already-in-use') {
                showMessage('This email address is already in use. Try signing in or use a different email.');
            } else {
                showMessage(error.message || 'An unknown error occurred during sign up.');
            }
        } finally {
            toggleButtonLoading(signupSubmitBtn, false);
        }
    });

    // --- Sign In with Email and Password ---
    signinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearMessages();
        toggleButtonLoading(signinSubmitBtn, true);

        const email = signinEmailInput.value.trim();
        const password = signinPasswordInput.value;

        if (!email || !password) {
            showMessage('Please enter both email and password.');
            toggleButtonLoading(signinSubmitBtn, false);
            return;
        }

        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            if (user.emailVerified) {
                showMessage('Sign in successful! Redirecting...', 'success');
                setTimeout(() => window.location.href = 'app.html', 1500);
            } else {
                await auth.signOut();
                showMessage('Please verify your email before signing in. A new verification email has been sent.', 'error', 10000);
                await user.sendEmailVerification();
            }
        } catch (error) {
            console.error("Sign in error:", error);
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                showMessage('Invalid email or password.');
            } else if (error.code === 'auth/too-many-requests') {
                showMessage('Too many login attempts. Please try again later or reset your password.');
            } else {
                showMessage(error.message || 'An unknown error occurred during sign in.');
            }
        } finally {
            toggleButtonLoading(signinSubmitBtn, false);
        }
    });

    // --- Google Sign-In/Sign-Up ---
    const handleGoogleSignIn = async (button) => {
        clearMessages();
        button.disabled = true; // Disable the clicked Google button
        const otherGoogleButton = (button === googleSigninBtnSignin) ? googleSigninBtnSignup : googleSigninBtnSignin;
        otherGoogleButton.disabled = true;


        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            const result = await auth.signInWithPopup(provider);
            const user = result.user;

            if (user.emailVerified) {
                const userRef = database.ref('users/' + user.uid);
                const snapshot = await userRef.once('value');

                if (snapshot.exists() && snapshot.val().class && snapshot.val().age) {
                    showMessage('Google Sign in successful! Redirecting...', 'success');
                     setTimeout(() => window.location.href = 'app.html', 1500);
                } else {
                    tempGoogleUser = user;
                    googleSignupClassInput.value = snapshot.val()?.class || '';
                    googleSignupAgeInput.value = snapshot.val()?.age || '';
                    googleSignupStreamInput.value = snapshot.val()?.subjectStream || '';
                    googleExtraModal.classList.add('show');
                }
            } else {
                await auth.signOut();
                showMessage('Google account not verified. Please ensure your Google account is active.');
            }
        } catch (error) {
            console.error("Google Sign-In error:", error);
            if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
                showMessage('Google Sign-In process was cancelled.');
            } else if (error.code === 'auth/account-exists-with-different-credential') {
                showMessage('An account already exists with this email address using a different sign-in method.');
            } else {
                showMessage('Error with Google Sign-In: ' + (error.message || 'Unknown error.'));
            }
        } finally {
             button.disabled = false; // Re-enable the clicked Google button
             otherGoogleButton.disabled = false;
        }
    };

    googleSigninBtnSignin.addEventListener('click', () => handleGoogleSignIn(googleSigninBtnSignin));
    googleSigninBtnSignup.addEventListener('click', () => handleGoogleSignIn(googleSigninBtnSignup));


    // --- Handle Additional Info for Google Sign Up ---
    googleExtraForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const studentClass = googleSignupClassInput.value.trim();
        const age = googleSignupAgeInput.value;
        const stream = googleSignupStreamInput.value.trim();

        if (!studentClass || !age) {
            alert('Please provide your class and age.');
            return;
        }

        if (!tempGoogleUser) {
            showMessage('Error: No Google user data found. Please try signing in again.', 'error');
            googleExtraModal.classList.remove('show');
            return;
        }

        const submitButton = googleExtraForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Saving...';


        try {
            const user = tempGoogleUser;
            const userRef = database.ref('users/' + user.uid);
            const userData = {
                uid: user.uid,
                name: user.displayName || 'Google User',
                email: user.email,
                profilePictureURL: user.photoURL || null,
                age: parseInt(age),
                class: studentClass,
                subjectStream: stream || null,
                provider: 'google',
                createdAt: firebase.database.ServerValue.TIMESTAMP
            };

            // Check if user data already exists to merge, otherwise set
            const snapshot = await userRef.once('value');
            if (snapshot.exists()) {
                await userRef.update(userData); // Update if exists
            } else {
                await userRef.set(userData); // Set if new
            }


            googleExtraModal.classList.remove('show');
            googleExtraForm.reset();
            tempGoogleUser = null;
            showMessage('Information saved! Redirecting...', 'success');
            setTimeout(() => window.location.href = 'app.html', 1500);

        } catch (error) {
            console.error("Error saving Google user extra info:", error);
            alert('Failed to save information: ' + error.message);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Save & Continue';
        }
    });

    if (closeModalButton) {
        closeModalButton.onclick = function() {
            googleExtraModal.classList.remove('show');
            googleExtraForm.reset();
            if (tempGoogleUser) {
                showMessage('Google sign up process was not completed.', 'error');
            }
            tempGoogleUser = null;
        }
    }
    window.onclick = function(event) {
        if (event.target == googleExtraModal) {
            googleExtraModal.classList.remove('show');
            googleExtraForm.reset();
            if (tempGoogleUser) {
                showMessage('Google sign up process was not completed.', 'error');
            }
            tempGoogleUser = null;
        }
    }


    // --- Forgot Password ---
    forgotPasswordLink.addEventListener('click', async (e) => {
        e.preventDefault();
        clearMessages();
        const email = prompt("Please enter your email address to reset your password:");

        if (email === null) return; // User cancelled prompt

        if (email.trim()) {
            try {
                await auth.sendPasswordResetEmail(email.trim());
                showMessage('Password reset email sent. Please check your inbox.', 'success', 10000);
            } catch (error) {
                console.error("Password reset error:", error);
                if (error.code === 'auth/user-not-found') {
                    showMessage('No user found with this email address.');
                } else {
                    showMessage('Error sending password reset email: ' + (error.message || 'Unknown error.'));
                }
            }
        } else {
             showMessage('Please enter a valid email address.');
        }
    });

    // Auth State Observer (Optional - for auto-redirect if already logged in and verified)
    auth.onAuthStateChanged(user => {
        if (user && user.emailVerified) {
            // If user is on auth.html but already logged in and verified,
            // and not in the middle of a Google extra info step.
            const currentPath = window.location.pathname.split("/").pop();
            if (currentPath === 'auth.html' && !googleExtraModal.classList.contains('show')) {
                // console.log("User already signed in and verified, redirecting from auth page.");
                // window.location.href = 'app.html';
                // Be cautious with auto-redirects as it might be unexpected.
                // The current flow handles redirection after explicit actions.
            }
        }
    });
});