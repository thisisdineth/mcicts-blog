document.addEventListener('DOMContentLoaded', () => {
    // --- Firebase Configuration ---
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

    // --- Initialize Firebase ---
    try {
        firebase.initializeApp(firebaseConfig);
    } catch (e) {
        console.error("Firebase initialization error:", e);
        alert('Critical error: Could not connect to services. Please try again later.');
        // Potentially redirect to a static error page or show a persistent message
        return;
    }

    const auth = firebase.auth();
    const database = firebase.database();
    const storage = firebase.storage();

    // --- DOM Elements ---
    const logoutBtn = document.getElementById('logout-btn');
    const openPostModalBtn = document.getElementById('open-post-modal-btn');
    const postThreadModal = document.getElementById('post-thread-modal');
    const closePostModalBtn = document.getElementById('close-post-modal-btn');
    const postThreadForm = document.getElementById('post-thread-form');
    const modalPostContent = document.getElementById('modal-post-content');
    const modalAttachImageBtn = document.getElementById('modal-attach-image-btn');
    const modalPostImageInput = document.getElementById('modal-post-image');
    const modalImagePreviewContainer = document.getElementById('modal-image-preview-container');
    const modalImagePreview = document.getElementById('modal-image-preview');
    const modalRemoveImageBtn = document.getElementById('modal-remove-image-btn');

    const inlinePostTextarea = document.getElementById('inline-post-textarea');
    const inlineAttachImageBtn = document.getElementById('inline-attach-image-btn');
    const inlinePostImageUpload = document.getElementById('inline-post-image-upload');
    const inlineSubmitPostBtn = document.getElementById('inline-submit-post-btn');
    const inlineImagePreviewContainer = document.getElementById('inline-image-preview-container');
    const inlineImagePreview = document.getElementById('inline-image-preview');
    const inlineRemoveImageBtn = document.getElementById('inline-remove-image-btn');


    const feedThreadsContainer = document.getElementById('feed-threads-container');
    const sidebarUserName = document.getElementById('sidebar-user-name');
    const sidebarUserCallsign = document.getElementById('sidebar-user-callsign');
    const sidebarUserAvatar = document.getElementById('sidebar-user-avatar');
    document.getElementById('current-year').textContent = new Date().getFullYear();

    let currentUser = null;
    let selectedModalImageFile = null;
    let selectedInlineImageFile = null;

    // --- Authentication State Observer ---
    auth.onAuthStateChanged(user => {
        if (user && user.emailVerified) {
            currentUser = user;
            console.log("User logged in:", currentUser.uid);
            fetchUserProfile(currentUser.uid);
            loadDummyThreads(); // Replace with fetchThreadsFromFirebase()
            loadDummySuggestions(); // Replace with actual suggestion fetching
        } else {
            console.log("No verified user logged in. Redirecting to auth page.");
            window.location.replace('auth.html');
        }
    });

    // --- Fetch User Profile (Basic) ---
    function fetchUserProfile(userId) {
        const userRef = database.ref('users/' + userId);
        userRef.once('value').then(snapshot => {
            if (snapshot.exists()) {
                const userData = snapshot.val();
                if (sidebarUserName) sidebarUserName.textContent = userData.name || 'Explorer';
                if (sidebarUserCallsign) sidebarUserCallsign.textContent = `@${(userData.name || 'User').toLowerCase().replace(/\s+/g, '_')}`; // Simple callsign
                if (sidebarUserAvatar && userData.profilePictureURL) {
                    sidebarUserAvatar.src = userData.profilePictureURL;
                } else if (sidebarUserAvatar) {
                    sidebarUserAvatar.src = 'placeholder-avatar.png'; // Default
                }
            }
        }).catch(error => {
            console.error("Error fetching user profile:", error);
        });
    }

    // --- Modal Logic ---
    if (openPostModalBtn) {
        openPostModalBtn.addEventListener('click', () => postThreadModal.classList.add('show'));
    }
    if (closePostModalBtn) {
        closePostModalBtn.addEventListener('click', () => {
            postThreadModal.classList.remove('show');
            resetModalForm();
        });
    }
    window.addEventListener('click', (event) => { // Close modal on outside click
        if (event.target === postThreadModal) {
            postThreadModal.classList.remove('show');
            resetModalForm();
        }
    });

    function resetModalForm() {
        postThreadForm.reset();
        selectedModalImageFile = null;
        modalImagePreview.src = '#';
        modalImagePreviewContainer.style.display = 'none';
    }

    // --- Image Handling (Modal) ---
    if (modalAttachImageBtn) {
        modalAttachImageBtn.addEventListener('click', () => modalPostImageInput.click());
    }
    if (modalPostImageInput) {
        modalPostImageInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                selectedModalImageFile = file;
                const reader = new FileReader();
                reader.onload = (e) => {
                    modalImagePreview.src = e.target.result;
                    modalImagePreviewContainer.style.display = 'block';
                }
                reader.readAsDataURL(file);
            }
        });
    }
    if (modalRemoveImageBtn) {
        modalRemoveImageBtn.addEventListener('click', () => {
            selectedModalImageFile = null;
            modalPostImageInput.value = ''; // Reset file input
            modalImagePreview.src = '#';
            modalImagePreviewContainer.style.display = 'none';
        });
    }

    // --- Post Submission (Modal) ---
    if (postThreadForm) {
        postThreadForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!currentUser) {
                alert("Authentication error. Please log in again.");
                return;
            }
            const content = modalPostContent.value.trim();
            if (!content && !selectedModalImageFile) {
                alert("Please write something or attach an image to transmit.");
                return;
            }

            const submitButton = postThreadForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Transmitting...';

            try {
                let imageURL = null;
                if (selectedModalImageFile) {
                    // ** TODO: Firebase Storage Upload **
                    // const imageRef = storage.ref(`thread_images/${currentUser.uid}/${Date.now()}_${selectedModalImageFile.name}`);
                    // const snapshot = await imageRef.put(selectedModalImageFile);
                    // imageURL = await snapshot.ref.getDownloadURL();
                    console.log("Simulating image upload for:", selectedModalImageFile.name);
                    imageURL = "https://via.placeholder.com/600x400.png?text=Simulated+Image"; // Placeholder
                }

                // ** TODO: Firebase Realtime Database Save **
                // const newThreadRef = database.ref('threads').push();
                // await newThreadRef.set({
                //     userId: currentUser.uid,
                //     userName: sidebarUserName.textContent, // Or fetch fresh user data
                //     userAvatar: sidebarUserAvatar.src,
                //     content: content,
                //     imageURL: imageURL,
                //     timestamp: firebase.database.ServerValue.TIMESTAMP,
                //     likes: 0,
                //     replies: 0
                // });

                console.log("Simulating post save:", { content, imageURL });
                alert("Signal transmitted successfully (Simulated)!");
                postThreadModal.classList.remove('show');
                resetModalForm();
                // Optimistically add to UI or reload threads
                addDummyThreadToUI({ // Simulate adding the new post
                    id: 'new-' + Date.now(),
                    userName: sidebarUserName.textContent,
                    userAvatar: sidebarUserAvatar.src,
                    callsign: sidebarUserCallsign.textContent,
                    timestamp: new Date().toLocaleTimeString(),
                    content: content,
                    imageURL: imageURL, // Use the placeholder imageURL for display
                    likes: 0,
                    replies: 0,
                    isLiked: false
                }, true);


            } catch (error) {
                console.error("Error transmitting signal:", error);
                alert("Failed to transmit signal: " + error.message);
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Transmit Signal';
            }
        });
    }

    // --- Image Handling (Inline Post) ---
     if (inlineAttachImageBtn) {
        inlineAttachImageBtn.addEventListener('click', () => inlinePostImageUpload.click());
    }
    if (inlinePostImageUpload) {
        inlinePostImageUpload.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                selectedInlineImageFile = file;
                const reader = new FileReader();
                reader.onload = (e) => {
                    inlineImagePreview.src = e.target.result;
                    inlineImagePreviewContainer.style.display = 'block';
                }
                reader.readAsDataURL(file);
            }
        });
    }
    if (inlineRemoveImageBtn) {
        inlineRemoveImageBtn.addEventListener('click', () => {
            selectedInlineImageFile = null;
            inlinePostImageUpload.value = ''; // Reset file input
            inlineImagePreview.src = '#';
            inlineImagePreviewContainer.style.display = 'none';
        });
    }

    // --- Post Submission (Inline) ---
    if (inlineSubmitPostBtn) {
        inlineSubmitPostBtn.addEventListener('click', async () => {
             if (!currentUser) {
                alert("Authentication error. Please log in again.");
                return;
            }
            const content = inlinePostTextarea.value.trim();
            if (!content && !selectedInlineImageFile) {
                alert("Please write something or attach an image to transmit.");
                return;
            }

            inlineSubmitPostBtn.disabled = true;
            inlineSubmitPostBtn.textContent = 'Transmitting...';

            try {
                let imageURL = null;
                if (selectedInlineImageFile) {
                    console.log("Simulating inline image upload for:", selectedInlineImageFile.name);
                    imageURL = "https://via.placeholder.com/600x400.png?text=Inline+Simulated+Image"; // Placeholder
                }

                console.log("Simulating inline post save:", { content, imageURL });
                alert("Signal transmitted successfully (Simulated - Inline)!");

                addDummyThreadToUI({
                    id: 'new-inline-' + Date.now(),
                    userName: sidebarUserName.textContent,
                    userAvatar: sidebarUserAvatar.src,
                    callsign: sidebarUserCallsign.textContent,
                    timestamp: new Date().toLocaleTimeString(),
                    content: content,
                    imageURL: imageURL,
                    likes: 0,
                    replies: 0,
                    isLiked: false
                }, true);

                // Reset inline form
                inlinePostTextarea.value = '';
                selectedInlineImageFile = null;
                inlinePostImageUpload.value = '';
                inlineImagePreview.src = '#';
                inlineImagePreviewContainer.style.display = 'none';


            } catch (error) {
                console.error("Error transmitting inline signal:", error);
                alert("Failed to transmit inline signal: " + error.message);
            } finally {
                inlineSubmitPostBtn.disabled = false;
                inlineSubmitPostBtn.textContent = 'Transmit';
            }
        });
    }


    // --- Render Thread Item ---
    function renderThreadItem(threadData, prepend = false) {
        const threadDiv = document.createElement('div');
        threadDiv.className = 'thread-item';
        threadDiv.setAttribute('data-thread-id', threadData.id);

        let imageHTML = '';
        if (threadData.imageURL) {
            imageHTML = `<img src="${threadData.imageURL}" alt="Thread image" class="thread-image">`;
        }

        threadDiv.innerHTML = `
            <div class="thread-header">
                <img src="${threadData.userAvatar || 'placeholder-avatar.png'}" alt="${threadData.userName}" class="thread-avatar">
                <div class="thread-user-info">
                    <strong>${threadData.userName || 'Anonymous Explorer'}</strong>
                    <span>${threadData.callsign || '@explorer'}</span>
                </div>
                <span class="thread-timestamp">${threadData.timestamp || 'Just now'}</span>
            </div>
            <div class="thread-content">
                <p>${threadData.content || ''}</p>
                ${imageHTML}
            </div>
            <div class="thread-actions">
                <button class="thread-action-btn btn-like ${threadData.isLiked ? 'liked' : ''}" data-action="like">
                    <i class="fas ${threadData.isLiked ? 'fa-heart-crack' : 'fa-heart'}"></i> <span class="like-count">${threadData.likes || 0}</span>
                </button>
                <button class="thread-action-btn btn-reply" data-action="reply">
                    <i class="fas fa-comment-dots"></i> ${threadData.replies || 0}
                </button>
                <button class="thread-action-btn btn-share" data-action="share">
                    <i class="fas fa-share-alt"></i> Share
                </button>
            </div>
        `;

        // Add event listeners for actions
        const likeButton = threadDiv.querySelector('.btn-like');
        likeButton.addEventListener('click', () => toggleLike(threadData.id, likeButton));

        // TODO: Add reply and share functionality

        if (prepend && feedThreadsContainer.firstChild) {
            feedThreadsContainer.insertBefore(threadDiv, feedThreadsContainer.firstChild);
        } else {
            feedThreadsContainer.appendChild(threadDiv);
        }
    }

    // Add a new dummy thread to UI (used by simulated post submissions)
    function addDummyThreadToUI(threadData, prepend = false) {
        const placeholder = feedThreadsContainer.querySelector('.thread-item-placeholder');
        if (placeholder) placeholder.remove();
        renderThreadItem(threadData, prepend);
    }


    // --- Toggle Like (UI only for now) ---
    function toggleLike(threadId, buttonElement) {
        // ** TODO: Firebase Realtime Database Update for likes **
        console.log("Toggling like for thread:", threadId);
        buttonElement.classList.toggle('liked');
        const icon = buttonElement.querySelector('i');
        const countSpan = buttonElement.querySelector('.like-count');
        let currentLikes = parseInt(countSpan.textContent);

        if (buttonElement.classList.contains('liked')) {
            icon.classList.remove('fa-heart');
            icon.classList.add('fa-heart-crack'); // Or fa-solid fa-heart if you prefer filled
            currentLikes++;
        } else {
            icon.classList.remove('fa-heart-crack');
            icon.classList.add('fa-heart');
            currentLikes--;
        }
        countSpan.textContent = currentLikes;
    }


    // --- Load Dummy/Placeholder Content ---
    function loadDummyThreads() {
        feedThreadsContainer.innerHTML = ''; // Clear any placeholders
        const dummyThreads = [
            { id: 't1', userName: 'Commander Zayden', callsign: '@CmdrZayden', userAvatar: 'https://randomuser.me/api/portraits/men/75.jpg', timestamp: '2h ago', content: 'Just discovered a new nebula formation in Sector Gamma-7. The colors are unreal! 🤩 #space #discovery #astronomy', imageURL: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8c3BhY2V8ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&w=800&q=60', likes: 125, replies: 12, isLiked: false },
            { id: 't2', userName: 'Lyra Comet', callsign: '@Lyra_C', userAvatar: 'https://randomuser.me/api/portraits/women/75.jpg', timestamp: '5h ago', content: 'Working on a theory about dark matter propulsion. Anyone have insights on quantum entanglement constraints at hyper-relativistic speeds? 🤔 #science #theory #physics', likes: 78, replies: 29, isLiked: true },
            { id: 't3', userName: 'Orion Pax', callsign: '@OrionTheBot', userAvatar: 'https://randomuser.me/api/portraits/lego/1.jpg', timestamp: '1d ago', content: 'My positronic net is calculating a 97.3% chance of meteor showers tonight visible from Terra Nova. Optimal viewing coordinates: 34.0522° N, 118.2437° W. 🌠', likes: 210, replies: 5, isLiked: false }
        ];
        dummyThreads.forEach(thread => renderThreadItem(thread));
    }

    function loadDummySuggestions() {
        const crewList = document.getElementById('crew-suggestions-list');
        const trendingList = document.getElementById('trending-signals-list');
        if (crewList) {
            crewList.innerHTML = `
                <li><i class="fas fa-user-plus"></i> @AstroAlex</li>
                <li><i class="fas fa-user-plus"></i> @GalaxyGirl</li>
                <li><i class="fas fa-user-plus"></i> @StarPilot7</li>`;
        }
        if (trendingList) {
            trendingList.innerHTML = `
                <li>#ExoPlanetFindings</li>
                <li>#BlackHoleTheories</li>
                <li>#MarsColonyUpdates</li>`;
        }
    }

    // --- Logout ---
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            auth.signOut().then(() => {
                console.log("User signed out.");
                window.location.replace('auth.html');
            }).catch(error => {
                console.error("Sign out error:", error);
                alert("Error signing out: " + error.message);
            });
        });
    }

    // Initial placeholder if no threads are loaded quickly
    if (feedThreadsContainer && feedThreadsContainer.children.length === 0) {
         feedThreadsContainer.innerHTML = `<div class="thread-item-placeholder"><p>Scanning for transmissions...</p><div class="spinner"></div></div>`;
    }
});