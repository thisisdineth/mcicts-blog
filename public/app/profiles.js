document.addEventListener('DOMContentLoaded', () => {
    // --- Firebase Configuration --- (User's existing config)
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

    try {
        firebase.initializeApp(firebaseConfig);
    } catch (e) {
        console.error("Firebase initialization error:", e);
        alert('Critical error: Could not connect to profile services.');
        return;
    }

    const auth = firebase.auth();
    const database = firebase.database();

    // DOM Elements for Profile Page
    const profileHeaderPlaceholder = document.getElementById('profile-header-placeholder');
    const profileHeaderContent = document.querySelector('.profile-header-content');
    const profilePageAvatar = document.getElementById('profile-page-avatar');
    const profilePageName = document.getElementById('profile-page-name');
    const profilePageCallsign = document.getElementById('profile-page-callsign');
    const profilePageEmail = document.getElementById('profile-page-email').querySelector('span');
    const profilePageClass = document.getElementById('profile-data-class');
    const profilePageAge = document.getElementById('profile-data-age');
    const profilePageStream = document.getElementById('profile-data-stream');
    const profileThreadsContainer = document.getElementById('profile-threads-container');
    const editProfileButtonContainer = document.getElementById('edit-profile-button-container');

    const imageFullViewModal = document.getElementById('image-full-view-modal');
    const closeImageFullViewModalBtn = document.getElementById('close-profile-image-modal-btn');
    const fullViewImage = document.getElementById('profile-full-view-image');


    let currentProfileUid = null;
    let loggedInUser = null;
    let displayedProfileThreads = new Set();


    // Get UID from URL query parameter
    const urlParams = new URLSearchParams(window.location.search);
    currentProfileUid = urlParams.get('uid');

    if (!currentProfileUid) {
        profileHeaderPlaceholder.innerHTML = '<p>Error: User ID not provided.</p>';
        profileHeaderContent.style.display = 'none';
        return;
    }

    auth.onAuthStateChanged(user => {
        loggedInUser = user; // Store logged-in user info
        fetchProfileData(currentProfileUid);
        fetchUserThreads(currentProfileUid);
        // Add edit button if it's the logged-in user's profile
        if (loggedInUser && loggedInUser.uid === currentProfileUid) {
            const editButton = document.createElement('button');
            editButton.className = 'btn-primary btn-edit-profile';
            editButton.innerHTML = '<i class="fas fa-pencil-alt"></i> Edit Profile';
            editButton.addEventListener('click', () => {
                // TODO: Implement edit profile functionality (e.g., open a modal or redirect to an edit page)
                alert('Edit profile functionality coming soon!');
            });
            if(editProfileButtonContainer) editProfileButtonContainer.appendChild(editButton);
        }
    });

    function fetchProfileData(userId) {
        const userRef = database.ref('users/' + userId);
        userRef.on('value', snapshot => {
            if (snapshot.exists()) {
                const userData = snapshot.val();
                profileHeaderPlaceholder.style.display = 'none';
                profileHeaderContent.style.display = 'flex';

                if (profilePageAvatar) profilePageAvatar.src = userData.profilePictureURL || 'placeholder-avatar.png';
                if (profilePageName) profilePageName.textContent = userData.name || 'Explorer';
                if (profilePageCallsign) profilePageCallsign.textContent = userData.callsign || `@${(userData.name || 'User').toLowerCase().replace(/\s+/g, '_')}`;
                if (profilePageEmail) profilePageEmail.textContent = userData.email || 'Not available';
                if (profilePageClass) profilePageClass.textContent = userData.class || 'N/A';
                if (profilePageAge) profilePageAge.textContent = userData.age || 'N/A';
                if (profilePageStream) profilePageStream.textContent = userData.subjectStream || 'N/A';

            } else {
                profileHeaderPlaceholder.innerHTML = '<p>Profile not found for this explorer.</p>';
                profileHeaderContent.style.display = 'none';
            }
        }, error => {
            console.error("Error fetching profile data:", error);
            profileHeaderPlaceholder.innerHTML = '<p>Error loading profile.</p>';
            profileHeaderContent.style.display = 'none';
        });
    }

    function fetchUserThreads(userId) {
        const threadsRef = database.ref('threads').orderByChild('userId').equalTo(userId);
        profileThreadsContainer.innerHTML = `<div class="thread-item-placeholder"><p>Scanning user's transmissions...</p><div class="spinner"></div></div>`;
        displayedProfileThreads.clear();

        threadsRef.on('value', snapshot => { // Use 'value' for initial load and then manage updates if needed
            profileThreadsContainer.innerHTML = ''; // Clear before rendering all user's threads
            displayedProfileThreads.clear();
            if (snapshot.exists()) {
                const threads = [];
                snapshot.forEach(childSnapshot => {
                    threads.push({ id: childSnapshot.key, ...childSnapshot.val() });
                });
                // Sort by timestamp client-side (descending)
                threads.sort((a, b) => b.timestamp - a.timestamp);

                threads.forEach(thread => {
                    renderProfileThreadItem(thread.id, thread);
                    displayedProfileThreads.add(thread.id);
                });
                 if (profileThreadsContainer.children.length === 0) { // Should not happen if snapshot.exists()
                     profileThreadsContainer.innerHTML = `<div class="thread-item-placeholder"><p>This explorer hasn't transmitted any signals yet.</p></div>`;
                 }

            } else {
                profileThreadsContainer.innerHTML = `<div class="thread-item-placeholder"><p>This explorer hasn't transmitted any signals yet.</p></div>`;
            }
            const placeholder = profileThreadsContainer.querySelector('.thread-item-placeholder');
            if (placeholder && profileThreadsContainer.children.length > 1) placeholder.remove(); // Remove if content exists
        });
    }

    // --- Timestamp Formatting (Copied from app.js) ---
    function formatTimestamp(firebaseTimestamp) {
        // ... (Same as in app.js)
        if (!firebaseTimestamp) return 'Sending...';
        const date = new Date(firebaseTimestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffSecs = Math.round(diffMs / 1000);
        const diffMins = Math.round(diffSecs / 60);
        const diffHours = Math.round(diffMins / 60);
        const diffDays = Math.round(diffHours / 24);

        if (diffSecs < 2) return 'Just now';
        if (diffSecs < 60) return `${diffSecs}s ago`;
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }


    // --- Render Thread Item for Profile Page (Simplified, no comment section shown here) ---
    // This function is similar to app.js's renderThreadItem but adapted for profile page
    // You might want to share a common rendering component in a more complex app
    function renderProfileThreadItem(threadId, threadData) {
        const threadDiv = document.createElement('div');
        threadDiv.className = 'thread-item'; // Re-use .thread-item styles
        threadDiv.setAttribute('data-thread-id', threadId);

        let imageHTML = '';
        if (threadData.imageURL) {
            imageHTML = `<img src="${threadData.imageURL}" alt="Thread image" class="thread-image" data-full-src="${threadData.imageURL}">`;
        }

        const likesCount = threadData.likes ? Object.keys(threadData.likes).length : 0;
        const isLikedByCurrentUser = loggedInUser && threadData.likes && threadData.likes[loggedInUser.uid];
        let deleteThreadBtnHTML = '';
        if (loggedInUser && loggedInUser.uid === threadData.userId) {
            deleteThreadBtnHTML = `<button class="btn-delete-thread profile-delete-btn" title="Delete Transmission"><i class="fas fa-trash-alt"></i></button>`;
        }
         const profileLink = `profiles.html?uid=${threadData.userId}`;

        threadDiv.innerHTML = `
            <div class="thread-header">
                 <a href="${profileLink}" class="thread-user-link">
                    <img src="${threadData.userAvatar || 'placeholder-avatar.png'}" alt="${threadData.userName}" class="thread-avatar">
                </a>
                <div class="thread-user-info">
                     <a href="${profileLink}" class="thread-user-link">
                        <strong>${threadData.userName || 'Anonymous Explorer'}</strong>
                    </a>
                    <span>${threadData.callsign || '@explorer'}</span>
                </div>
                <span class="thread-timestamp">${formatTimestamp(threadData.timestamp)}</span>
                ${deleteThreadBtnHTML}
            </div>
            <div class="thread-content">
                <p>${(threadData.content || '').replace(/\n/g, '<br>')}</p>
                ${imageHTML}
            </div>
            <div class="thread-actions">
                <button class="thread-action-btn btn-like ${isLikedByCurrentUser ? 'liked' : ''}" data-profile-action="like">
                    <i class="fas ${isLikedByCurrentUser ? 'fa-heart-crack' : 'fa-heart'}"></i> <span class="like-count">${likesCount}</span>
                </button>
                <button class="thread-action-btn btn-reply" data-profile-action="reply">
                    <i class="fas fa-comment-dots"></i> <span class="reply-count">${threadData.replyCount || 0}</span>
                </button>
                <button class="thread-action-btn btn-share" data-profile-action="share">
                    <i class="fas fa-share-alt"></i> Share
                </button>
            </div>
            `;

        // Attach event listeners (adapt from app.js if needed, or make them simpler for profile view)
        threadDiv.querySelector('.btn-like[data-profile-action="like"]').addEventListener('click', () => toggleProfileLike(threadId));

        const threadImageElement = threadDiv.querySelector('.thread-image');
        if (threadImageElement) {
            threadImageElement.addEventListener('click', (e) => openProfileImageFullView(e.target.getAttribute('data-full-src')));
        }
        if (deleteThreadBtnHTML) {
            threadDiv.querySelector('.profile-delete-btn').addEventListener('click', () => handleDeleteProfileThread(threadId, threadData.imageURL));
        }

        // Share and Reply on profile page might link back to main app view of the thread or be simplified
        threadDiv.querySelector('.btn-share[data-profile-action="share"]').addEventListener('click', () => {
             alert(`Share functionality: Would share thread ID ${threadId}`); // Simplified for profile page
        });
         threadDiv.querySelector('.btn-reply[data-profile-action="reply"]').addEventListener('click', () => {
             alert(`Reply functionality: Would open reply for thread ID ${threadId}`); // Simplified
        });


        const placeholder = profileThreadsContainer.querySelector('.thread-item-placeholder');
        if (placeholder) placeholder.remove();
        profileThreadsContainer.appendChild(threadDiv); // Append, as we sort before rendering all
    }

    // --- Toggle Like on Profile Page (needs to update DB same as app.js) ---
    function toggleProfileLike(threadId) {
        if (!loggedInUser) {
            alert("Please log in to interact.");
            return;
        }
        const threadLikesRef = database.ref(`threads/${threadId}/likes/${loggedInUser.uid}`);
        const currentThreadRef = database.ref(`threads/${threadId}`);

        currentThreadRef.once('value', snapshot => {
            if (snapshot.exists()) {
                const threadData = snapshot.val();
                const currentLikes = threadData.likes || {};
                if (currentLikes[loggedInUser.uid]) {
                    threadLikesRef.remove(); // Unlike
                } else {
                    threadLikesRef.set(true); // Like
                }
                // UI update will be handled by re-fetching or a listener if we add one for profile threads
                // For now, a manual update after a short delay or upon a 'value' listener on the specific thread
                // Simpler: just update the button and count locally after DB operation.
                const threadElement = profileThreadsContainer.querySelector(`.thread-item[data-thread-id="${threadId}"]`);
                if (threadElement) {
                    const likeButton = threadElement.querySelector('.btn-like');
                    const likeIcon = likeButton.querySelector('i');
                    const likeCountSpan = likeButton.querySelector('.like-count');
                    let likesCount = threadData.likes ? Object.keys(threadData.likes).length : 0;

                    if (currentLikes[loggedInUser.uid]) { // Was liked, now unliked
                        likesCount--;
                        likeButton.classList.remove('liked');
                        likeIcon.classList.add('fa-heart');
                        likeIcon.classList.remove('fa-heart-crack');
                    } else { // Was not liked, now liked
                        likesCount++;
                        likeButton.classList.add('liked');
                        likeIcon.classList.remove('fa-heart');
                        likeIcon.classList.add('fa-heart-crack');
                    }
                    likeCountSpan.textContent = likesCount;
                }
            }
        });
    }

    // --- Delete Thread on Profile Page ---
    async function handleDeleteProfileThread(threadId, imageURL) {
        if (!loggedInUser || loggedInUser.uid !== currentProfileUid) { // Ensure only owner can delete from their profile
            alert("Action not permitted.");
            return;
        }
        if (confirm("Are you sure you want to delete this transmission and all its comments? This action cannot be undone.")) {
            try {
                if (imageURL) {
                    try {
                        const imageFileRef = storage.refFromURL(imageURL);
                        await imageFileRef.delete();
                    } catch (storageError) {
                        console.warn("Could not delete image from storage:", storageError);
                    }
                }
                await database.ref(`comments/${threadId}`).remove();
                await database.ref(`threads/${threadId}`).remove();
                // Remove from UI
                const threadElement = profileThreadsContainer.querySelector(`.thread-item[data-thread-id="${threadId}"]`);
                if (threadElement) threadElement.remove();
                if(profileThreadsContainer.children.length === 0) {
                     profileThreadsContainer.innerHTML = `<div class="thread-item-placeholder"><p>This explorer hasn't transmitted any signals yet.</p></div>`;
                }
                alert("Transmission deleted.");
            } catch (error) {
                console.error("Error deleting thread from profile:", error);
                alert("Failed to delete transmission: " + error.message);
            }
        }
    }


    // --- Image Full View Modal on Profile Page ---
    if (closeImageFullViewModalBtn) {
        closeImageFullViewModalBtn.addEventListener('click', () => {
            imageFullViewModal.classList.remove('show');
        });
    }
    // Also close on clicking backdrop
     window.addEventListener('click', (event) => {
        if (event.target === imageFullViewModal) {
            imageFullViewModal.classList.remove('show');
        }
    });

    function openProfileImageFullView(imageSrc) {
        if (fullViewImage && imageFullViewModal && imageSrc) {
            fullViewImage.src = imageSrc;
            imageFullViewModal.classList.add('show');
        }
    }

});