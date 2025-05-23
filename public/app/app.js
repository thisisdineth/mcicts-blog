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

    // --- Initialize Firebase ---
    try {
        firebase.initializeApp(firebaseConfig);
    } catch (e) {
        console.error("Firebase initialization error:", e);
        alert('Critical error: Could not connect to services. Please try again later.');
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
    const crewSuggestionsList = document.getElementById('crew-suggestions-list'); // For suggestions
    document.getElementById('current-year').textContent = new Date().getFullYear();

    const imageFullViewModal = document.getElementById('image-full-view-modal');
    const closeImageFullViewModalBtn = document.getElementById('close-image-modal-btn'); // Corrected ID
    const fullViewImage = document.getElementById('full-view-image');

    let currentUser = null;
    let currentUserData = null;
    let selectedModalImageFile = null;
    let selectedInlineImageFile = null;
    let displayedThreads = new Set(); // To keep track of threads already in UI

    // --- Authentication State Observer ---
    auth.onAuthStateChanged(user => {
        if (user && user.emailVerified) {
            currentUser = user;
            fetchUserProfile(currentUser.uid);
            fetchThreadsAndListen();
            loadUserSuggestions(); // Load actual suggestions
            // loadDummySuggestions(); // Remove this
        } else {
            currentUser = null;
            currentUserData = null;
            window.location.replace('auth.html');
        }
    });

    // --- Fetch User Profile ---
    function fetchUserProfile(userId) {
        const userRef = database.ref('users/' + userId);
        userRef.on('value', snapshot => {
            if (snapshot.exists()) {
                currentUserData = snapshot.val();
                currentUserData.uid = userId;
                if (sidebarUserName) sidebarUserName.textContent = currentUserData.name || 'Explorer';
                if (sidebarUserCallsign) sidebarUserCallsign.textContent = currentUserData.callsign || `@${generateCallsign(currentUserData.name || 'User')}`;
                if (sidebarUserAvatar && currentUserData.profilePictureURL) {
                    sidebarUserAvatar.src = currentUserData.profilePictureURL;
                } else if (sidebarUserAvatar) {
                    sidebarUserAvatar.src = '../img/avatar.png';
                }
            } else {
                // Fallback if user data is not yet in DB (e.g., right after Google Sign-Up)
                currentUserData = { uid: userId, name: currentUser.displayName, profilePictureURL: currentUser.photoURL }; // Basic data
                if (sidebarUserName) sidebarUserName.textContent = currentUser.displayName || 'Explorer';
                if (sidebarUserCallsign) sidebarUserCallsign.textContent = `@${generateCallsign(currentUser.displayName || 'User')}`;
                if (sidebarUserAvatar && currentUser.photoURL) sidebarUserAvatar.src = currentUser.photoURL;
                else if (sidebarUserAvatar) sidebarUserAvatar.src = '../img/avatar.png';
            }
        }, error => console.error("Error fetching user profile:", error));
    }

    function generateCallsign(name) {
        return name.toLowerCase().replace(/\s+/g, '_').substring(0, 15);
    }

    // --- Modal Logic & Image Handling --- (Keep existing functions: resetModalForm, resetInlineForm, handleImageSelect, removeImage)
    if (openPostModalBtn) openPostModalBtn.addEventListener('click', () => postThreadModal.classList.add('show'));
    if (closePostModalBtn) {
        closePostModalBtn.addEventListener('click', () => {
            postThreadModal.classList.remove('show');
            resetModalForm();
        });
    }
    window.addEventListener('click', (event) => {
        if (event.target === postThreadModal) {
            postThreadModal.classList.remove('show');
            resetModalForm();
        }
        if (event.target === imageFullViewModal) {
            imageFullViewModal.classList.remove('show');
        }
    });

    function resetModalForm() { /* ... */ } // Keep definition from previous version
    function resetInlineForm() { /* ... */ } // Keep definition
    function handleImageSelect(isModal) { /* ... */ return function(event) { /* ... */ } } // Keep definition
    function removeImage(isModal) { /* ... */ } // Keep definition

    // --- Unified Post Submission Logic ---
    async function handlePostSubmit(content, imageFile, formType) {
        if (!currentUser || !currentUserData) {
            alert("Authentication error or user data not loaded. Please try again.");
            return;
        }
        if (!content && !imageFile) {
            alert("Please write something or attach an image to transmit.");
            return;
        }

        let submitButton, originalButtonText;
        if (formType === 'modal') {
            submitButton = postThreadForm.querySelector('button[type="submit"]');
            originalButtonText = 'Transmit Signal';
        } else {
            submitButton = inlineSubmitPostBtn;
            originalButtonText = 'Transmit';
        }
        submitButton.disabled = true;
        submitButton.textContent = 'Transmitting...';

        try {
            let imageURL = null;
            if (imageFile) {
                const imageName = `${Date.now()}_${imageFile.name}`;
                const imageRef = storage.ref(`thread_images/${currentUser.uid}/${imageName}`);
                const snapshot = await imageRef.put(imageFile);
                imageURL = await snapshot.ref.getDownloadURL();
            }

            const threadData = {
                userId: currentUser.uid,
                userName: currentUserData.name || currentUser.displayName || 'Explorer',
                userAvatar: currentUserData.profilePictureURL || currentUser.photoURL || '../img/avatar.png',
                callsign: currentUserData.callsign || `@${generateCallsign(currentUserData.name || currentUser.displayName || 'User')}`,
                content: content,
                imageURL: imageURL,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                likes: {},
                replyCount: 0
            };
            await database.ref('threads').push().set(threadData);
            alert("Signal transmitted successfully!");
            if (formType === 'modal') {
                postThreadModal.classList.remove('show'); resetModalForm();
            } else {
                resetInlineForm();
            }
        } catch (error) {
            console.error("Error transmitting signal:", error);
            alert("Failed to transmit signal: " + error.message);
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        }
    }
    if (postThreadForm) postThreadForm.addEventListener('submit', (e) => { e.preventDefault(); handlePostSubmit(modalPostContent.value.trim(), selectedModalImageFile, 'modal'); });
    if (inlineSubmitPostBtn) inlineSubmitPostBtn.addEventListener('click', () => handlePostSubmit(inlinePostTextarea.value.trim(), selectedInlineImageFile, 'inline'));

    // --- Timestamp Formatting ---
    function formatTimestamp(firebaseTimestamp) {
        if (!firebaseTimestamp) return 'Sending...'; // Changed from 'Just now' for optimistic updates
        const date = new Date(firebaseTimestamp);
        // ... (rest of the timestamp logic remains the same)
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

    // --- Render Thread Item (Improved for quality and profile links) ---
    function renderThreadItem(threadId, threadData, prepend = false) {
        const threadDiv = document.createElement('div');
        threadDiv.className = 'thread-item';
        threadDiv.setAttribute('data-thread-id', threadId);

        let imageHTML = '';
        if (threadData.imageURL) {
            imageHTML = `<img src="${threadData.imageURL}" alt="Thread image" class="thread-image" data-full-src="${threadData.imageURL}">`;
        }

        const likesCount = threadData.likes ? Object.keys(threadData.likes).length : 0;
        const isLikedByCurrentUser = currentUser && threadData.likes && threadData.likes[currentUser.uid];
        let deleteThreadBtnHTML = '';
        if (currentUser && currentUser.uid === threadData.userId) {
            deleteThreadBtnHTML = `<button class="btn-delete-thread" title="Delete Transmission"><i class="fas fa-trash-alt"></i></button>`;
        }

        // Link for profile picture and name
        const profileLink = `profiles.html?uid=${threadData.userId}`;

        threadDiv.innerHTML = `
            <div class="thread-header">
                <a href="${profileLink}" class="thread-user-link">
                    <img src="${threadData.userAvatar || '../img/avatar.png'}" alt="${threadData.userName}" class="thread-avatar">
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
                <button class="thread-action-btn btn-like ${isLikedByCurrentUser ? 'liked' : ''}" data-action="like">
                    <i class="fas ${isLikedByCurrentUser ? 'fa-heart-crack' : 'fa-heart'}"></i> <span class="like-count">${likesCount}</span>
                </button>
                <button class="thread-action-btn btn-reply" data-action="reply">
                    <i class="fas fa-comment-dots"></i> <span class="reply-count">${threadData.replyCount || 0}</span>
                </button>
                <button class="thread-action-btn btn-share" data-action="share">
                    <i class="fas fa-share-alt"></i> Share
                </button>
            </div>
            <div class="thread-comments-section">
                <div class="add-comment-form">
                    <textarea class="add-comment-input" placeholder="Transmit your reply..."></textarea>
                    <button class="btn-primary btn-submit-comment">Reply</button>
                </div>
                <ul class="comments-list"></ul>
            </div>
        `;

        // Attach event listeners
        threadDiv.querySelector('.btn-like').addEventListener('click', () => toggleLike(threadId));
        threadDiv.querySelector('.btn-share').addEventListener('click', () => handleShare(threadId, threadData.content));
        threadDiv.querySelector('.btn-reply').addEventListener('click', () => threadDiv.querySelector('.add-comment-input').focus());
        threadDiv.querySelector('.btn-submit-comment').addEventListener('click', () => handleAddComment(threadId, threadDiv.querySelector('.add-comment-input')));
        if (deleteThreadBtnHTML) {
            threadDiv.querySelector('.btn-delete-thread').addEventListener('click', () => handleDeleteThread(threadId, threadData.imageURL));
        }
        const threadImageElement = threadDiv.querySelector('.thread-image');
        if (threadImageElement) {
            threadImageElement.addEventListener('click', (e) => openImageFullView(e.target.getAttribute('data-full-src')));
        }

        const placeholder = feedThreadsContainer.querySelector('.thread-item-placeholder');
        if (placeholder) placeholder.remove();

        if (prepend) {
            feedThreadsContainer.insertBefore(threadDiv, feedThreadsContainer.firstChild);
        } else {
            feedThreadsContainer.appendChild(threadDiv);
        }
        fetchAndRenderComments(threadId, threadDiv.querySelector('.comments-list'));
    }

    // --- Update Thread Element (for child_changed) ---
    function updateThreadElement(threadElement, threadData) {
        // Update likes
        const likesCount = threadData.likes ? Object.keys(threadData.likes).length : 0;
        const isLikedByCurrentUser = currentUser && threadData.likes && threadData.likes[currentUser.uid];
        const likeButton = threadElement.querySelector('.btn-like');
        if (likeButton) {
            likeButton.querySelector('.like-count').textContent = likesCount;
            likeButton.classList.toggle('liked', isLikedByCurrentUser);
            const likeIcon = likeButton.querySelector('i');
            likeIcon.classList.toggle('fa-heart-crack', isLikedByCurrentUser);
            likeIcon.classList.toggle('fa-heart', !isLikedByCurrentUser);
        }
        // Update reply count
        const replyCountSpan = threadElement.querySelector('.reply-count');
        if (replyCountSpan) replyCountSpan.textContent = threadData.replyCount || 0;
        // Update timestamp (if it changed, though less likely for existing posts)
        const timestampSpan = threadElement.querySelector('.thread-timestamp');
        if(timestampSpan) timestampSpan.textContent = formatTimestamp(threadData.timestamp);
    }

    // --- Fetch Threads and Listen for Changes (Revised) ---
    function fetchThreadsAndListen() {
        const threadsRef = database.ref('threads').orderByChild('timestamp');
        // Clear container and show placeholder only once at the beginning
        feedThreadsContainer.innerHTML = `<div class="thread-item-placeholder"><p>Scanning for transmissions...</p><div class="spinner"></div></div>`;
        displayedThreads.clear(); // Reset the set of displayed threads

        threadsRef.on('child_added', snapshot => {
            const threadId = snapshot.key;
            const threadData = snapshot.val();
            if (threadId && threadData && !displayedThreads.has(threadId)) {
                renderThreadItem(threadId, threadData, true); // Prepend new threads
                displayedThreads.add(threadId);
            }
            if (feedThreadsContainer.children.length > 0 && feedThreadsContainer.querySelector('.thread-item-placeholder')) {
                 feedThreadsContainer.querySelector('.thread-item-placeholder').remove();
            }
        });

        threadsRef.on('child_changed', snapshot => {
            const threadId = snapshot.key;
            const threadData = snapshot.val();
            const existingThreadElement = document.querySelector(`.thread-item[data-thread-id="${threadId}"]`);
            if (existingThreadElement && threadData) {
                updateThreadElement(existingThreadElement, threadData);
            }
        });

        threadsRef.on('child_removed', snapshot => {
            const threadId = snapshot.key;
            const threadElement = document.querySelector(`.thread-item[data-thread-id="${threadId}"]`);
            if (threadElement) {
                threadElement.remove();
                displayedThreads.delete(threadId);
            }
            if (feedThreadsContainer.children.length === 0 && !feedThreadsContainer.querySelector('.thread-item-placeholder')) {
                feedThreadsContainer.innerHTML = `<div class="thread-item-placeholder"><p>No transmissions detected in this sector. Be the first!</p></div>`;
            }
        });
        // Initial check for emptiness
        threadsRef.once('value', snapshot => {
            if (!snapshot.exists() && feedThreadsContainer.querySelector('.thread-item-placeholder')) {
                 feedThreadsContainer.innerHTML = `<div class="thread-item-placeholder"><p>No transmissions detected in this sector. Be the first!</p></div>`;
            } else if (snapshot.exists() && feedThreadsContainer.querySelector('.thread-item-placeholder')) {
                // If data exists but placeholder is still there (e.g. child_added hasn't fired fast enough)
                // This might be redundant if child_added is quick
                // feedThreadsContainer.querySelector('.thread-item-placeholder').remove();
            }
        });
    }

    // --- Toggle Like --- (Keep existing logic, UI updates handled by child_changed)
    function toggleLike(threadId) { /* ... */ }

    // --- Share Functionality --- (Keep existing)
    function handleShare(threadId, threadContent) { /* ... */ }

    // --- Delete Thread --- (Keep existing)
    async function handleDeleteThread(threadId, imageURL) { /* ... */ }

    // --- Comment Functionality --- (Keep existing: handleAddComment, fetchAndRenderComments, renderCommentItem, handleDeleteComment)
    async function handleAddComment(threadId, commentInputElement) { /* ... */ }
    function fetchAndRenderComments(threadId, commentsListElement) { /* ... */ }
    function renderCommentItem(commentId, commentData, commentsListElement, threadId) { /* ... */ }
    async function handleDeleteComment(threadId, commentId) { /* ... */ }

    // --- Image Full View Modal ---
    if (closeImageFullViewModalBtn) { // Corrected variable name
        closeImageFullViewModalBtn.addEventListener('click', () => {
            imageFullViewModal.classList.remove('show');
        });
    }
    function openImageFullView(imageSrc) {
        if (fullViewImage && imageFullViewModal && imageSrc) {
            fullViewImage.src = imageSrc;
            imageFullViewModal.classList.add('show');
        }
    }

    // --- Load ACTUAL User Suggestions ---
    async function loadUserSuggestions() {
        if (!crewSuggestionsList) return;
        crewSuggestionsList.innerHTML = '<li><div class="spinner-small"></div></li>'; // Loading state

        try {
            const usersRef = database.ref('users');
            const snapshot = await usersRef.limitToFirst(10).once('value'); // Get a few users
            if (snapshot.exists()) {
                const users = [];
                snapshot.forEach(childSnapshot => {
                    const userData = childSnapshot.val();
                    // Exclude current user and users without a name
                    if (childSnapshot.key !== currentUser.uid && userData.name) {
                        users.push({ uid: childSnapshot.key, ...userData });
                    }
                });

                // Simple shuffle and take top 3-4
                const shuffledUsers = users.sort(() => 0.5 - Math.random());
                const suggestions = shuffledUsers.slice(0, Math.min(4, shuffledUsers.length));

                crewSuggestionsList.innerHTML = ''; // Clear loading/previous
                if (suggestions.length > 0) {
                    suggestions.forEach(user => {
                        const li = document.createElement('li');
                        const profileLink = `profiles.html?uid=${user.uid}`;
                        li.innerHTML = `
                            <a href="${profileLink}" class="suggestion-user-link">
                                <img src="${user.profilePictureURL || '../img/avatar.png'}" alt="${user.name}" class="suggestion-avatar">
                                <div class="suggestion-user-info">
                                    <strong>${user.name}</strong>
                                    <span>${user.callsign || '@' + generateCallsign(user.name)}</span>
                                </div>
                            </a>`;
                        crewSuggestionsList.appendChild(li);
                    });
                } else {
                    crewSuggestionsList.innerHTML = '<li>No new crew to suggest.</li>';
                }
            } else {
                crewSuggestionsList.innerHTML = '<li>No other explorers found.</li>';
            }
        } catch (error) {
            console.error("Error loading user suggestions:", error);
            crewSuggestionsList.innerHTML = '<li>Error loading suggestions.</li>';
        }
    }

    // --- Logout ---
    if (logoutBtn) logoutBtn.addEventListener('click', () => auth.signOut().catch(error => console.error("Sign out error:", error)));

});