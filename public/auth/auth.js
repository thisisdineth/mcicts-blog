document.addEventListener('DOMContentLoaded', function () {
    // -------------------------------------------------------------------------
    // !! IMPORTANT: Firebase Configuration !!
    // User's Firebase Config (as provided)
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
    function showMessage(message, type = 'error', duration = 7000) { // Increased default duration
        clearTimeout(messageTimeout);
        messageArea.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i> <span>${message}</span>`; // Changed error icon
        messageArea.className = `message-area show ${type}`;
        if (duration > 0) {
            messageTimeout = setTimeout(clearMessages, duration);
        }
    }

    function clearMessages() {
        messageArea.className = 'message-area';
    }

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

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearMessages();
        toggleButtonLoading(signupSubmitBtn, true);

        const name = signupNameInput.value.trim();
        const email = signupEmailInput.value.trim();
        const password = signupPasswordInput.value;
        const confirmPassword = signupConfirmPasswordInput.value;
        const age = signupAgeInput.value;
        const studentClass = signupClassInput.value.trim();
        const stream = signupStreamInput.value.trim();
        const profilePictureFile = signupProfilePictureInput.files[0];

        if (password !== confirmPassword) {
            showMessage('Access Codes do not match, Cadet.');
            toggleButtonLoading(signupSubmitBtn, false);
            return;
        }
        if (password.length < 6) {
            showMessage('Access Code must be at least 6 characters, Explorer.');
            toggleButtonLoading(signupSubmitBtn, false);
            return;
        }
        if (!name || !email || !studentClass) {
            showMessage('Callsign, Email, and Class/Rank are mandatory for fleet registration.');
            toggleButtonLoading(signupSubmitBtn, false);
            return;
        }

        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            showMessage('Verification signal sent. Check your comms array (inbox).', 'success', 10000);
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

            showMessage('Registration successful! Verification signal dispatched. Confirm before logging in.', 'success', 10000);
            signupForm.reset();

        } catch (error) {
            console.error("Sign up error:", error);
            if (error.code === 'auth/email-already-in-use') {
                showMessage('This email signal is already registered. Try logging in or use a different frequency.');
            } else {
                showMessage(error.message || 'A cosmic anomaly occurred during sign up.');
            }
        } finally {
            toggleButtonLoading(signupSubmitBtn, false);
        }
    });

    signinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearMessages();
        toggleButtonLoading(signinSubmitBtn, true);

        const email = signinEmailInput.value.trim();
        const password = signinPasswordInput.value;

        if (!email || !password) {
            showMessage('Enter your Email/Callsign and Access Code to proceed.');
            toggleButtonLoading(signinSubmitBtn, false);
            return;
        }

        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            if (user.emailVerified) {
                showMessage('Access granted! Preparing for warp...', 'success');
                setTimeout(() => window.location.href = '../blog/', 2000);
            } else {
                await auth.signOut();
                showMessage('Comms link not verified. Please confirm your email signal. Resending verification.', 'error', 10000);
                await user.sendEmailVerification();
            }
        } catch (error) {
            console.error("Sign in error:", error);
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                showMessage('Invalid Callsign or Access Code. Check your credentials.');
            } else if (error.code === 'auth/too-many-requests') {
                showMessage('Too many login attempts. Security lockout initiated. Try later or reset code.');
            } else {
                showMessage(error.message || 'Unknown space-time distortion during login.');
            }
        } finally {
            toggleButtonLoading(signinSubmitBtn, false);
        }
    });

    const handleGoogleSignIn = async (button) => {
        clearMessages();
        button.disabled = true;
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
                    showMessage('Google Hyperspace link established! Redirecting...', 'success');
                     setTimeout(() => window.location.href = '../blog/', 2000);
                } else {
                    tempGoogleUser = user;
                    googleSignupClassInput.value = snapshot.val()?.class || '';
                    googleSignupAgeInput.value = snapshot.val()?.age || '';
                    googleSignupStreamInput.value = snapshot.val()?.subjectStream || '';
                    googleExtraModal.classList.add('show');
                }
            } else {
                await auth.signOut();
                showMessage('Google account signal not verified. Ensure your Google comms are active.');
            }
        } catch (error) {
            console.error("Google Sign-In error:", error);
            if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
                showMessage('Google connection attempt aborted by user.');
            } else if (error.code === 'auth/account-exists-with-different-credential') {
                showMessage('This email signal is already linked via another method. Try that one.');
            } else {
                showMessage('Error with Google Hyperspace link: ' + (error.message || 'Unknown interference.'));
            }
        } finally {
             button.disabled = false;
             otherGoogleButton.disabled = false;
        }
    };

    googleSigninBtnSignin.addEventListener('click', () => handleGoogleSignIn(googleSigninBtnSignin));
    googleSigninBtnSignup.addEventListener('click', () => handleGoogleSignIn(googleSigninBtnSignup));

    googleExtraForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const studentClass = googleSignupClassInput.value.trim();
        const age = googleSignupAgeInput.value;
        const stream = googleSignupStreamInput.value.trim();

        if (!studentClass || !age) {
            alert('Please provide your Class/Rank and Age (Cycles) to finalize Galactic ID.');
            return;
        }
        if (!tempGoogleUser) {
            showMessage('Error: No Google user data found. Please try initiating the Hyperspace link again.', 'error');
            googleExtraModal.classList.remove('show');
            return;
        }

        const submitButton = googleExtraForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Transmitting...';

        try {
            const user = tempGoogleUser;
            const userRef = database.ref('users/' + user.uid);
            const userData = {
                uid: user.uid,
                name: user.displayName || 'Google Explorer',
                email: user.email,
                profilePictureURL: user.photoURL || null,
                age: parseInt(age),
                class: studentClass,
                subjectStream: stream || null,
                provider: 'google',
                createdAt: firebase.database.ServerValue.TIMESTAMP
            };

            const snapshot = await userRef.once('value');
            if (snapshot.exists()) {
                await userRef.update(userData);
            } else {
                await userRef.set(userData);
            }

            googleExtraModal.classList.remove('show');
            googleExtraForm.reset();
            tempGoogleUser = null;
            showMessage('Galactic ID updated! Preparing for launch...', 'success');
            setTimeout(() => window.location.href = '../blog/', 2000);

        } catch (error) {
            console.error("Error saving Google user extra info:", error);
            alert('Failed to transmit data: ' + error.message);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    });

    if (closeModalButton) {
        closeModalButton.onclick = function() {
            googleExtraModal.classList.remove('show');
            googleExtraForm.reset();
            if (tempGoogleUser) {
                showMessage('Google registration sequence was not completed.', 'error');
            }
            tempGoogleUser = null;
        }
    }
    window.onclick = function(event) {
        if (event.target == googleExtraModal) {
            googleExtraModal.classList.remove('show');
            googleExtraForm.reset();
            if (tempGoogleUser) {
                showMessage('Google registration sequence incomplete.', 'error');
            }
            tempGoogleUser = null;
        }
    }

    forgotPasswordLink.addEventListener('click', async (e) => {
        e.preventDefault();
        clearMessages();
        const email = prompt("Enter your registered email signal to request a new Access Code:");

        if (email === null) return;

        if (email.trim()) {
            try {
                await auth.sendPasswordResetEmail(email.trim());
                showMessage('New Access Code request transmitted. Check your comms array.', 'success', 10000);
            } catch (error) {
                console.error("Password reset error:", error);
                if (error.code === 'auth/user-not-found') {
                    showMessage('No registered signal found for this email address.');
                } else {
                    showMessage('Error transmitting Access Code request: ' + (error.message || 'Unknown anomaly.'));
                }
            }
        } else {
             showMessage('Please enter a valid email signal.');
        }
    });

    auth.onAuthStateChanged(user => {
        if (user && user.emailVerified) {
            const currentPath = window.location.pathname.split("/").pop();
            if (currentPath === 'auth.html' && !googleExtraModal.classList.contains('show')) {
                // console.log("User is already logged in and verified on auth page.");
            }
        }
    });
});