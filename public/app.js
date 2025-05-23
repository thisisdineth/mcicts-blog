document.addEventListener('DOMContentLoaded', () => {
    // --- Firebase Configuration --- (Keep your existing config)
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
    // (Keep existing DOM element selections)
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

    // NEW DOM Elements for Image Full View Modal
    const imageFullViewModal = document.getElementById('image-full-view-modal');
    const closeImageModalBtn = document.getElementById('close-image-modal-btn');
    const fullViewImage = document.getElementById('full-view-image');
    // const imageModalCaption = document.getElementById('image-modal-caption'); // If you add caption later

    let currentUser = null;
    let currentUserData = null;
    let selectedModalImageFile = null;
    let selectedInlineImageFile = null;

    // --- Authentication State Observer --- (Keep existing)
    auth.onAuthStateChanged(user => {
        if (user && user.emailVerified) {
            currentUser = user;
            console.log("User logged in:", currentUser.uid);
            fetchUserProfile(currentUser.uid);
            fetchThreadsAndListen();
            loadDummySuggestions();
        } else {
            console.log("No verified user logged in. Redirecting to auth page.");
            currentUser = null;
            currentUserData = null;
            window.location.replace('auth.html');
        }
    });

    // --- Fetch User Profile --- (Keep existing)
    function fetchUserProfile(userId) {
        const userRef = database.ref('users/' + userId);
        userRef.on('value', snapshot => {
            if (snapshot.exists()) {
                currentUserData = snapshot.val();
                currentUserData.uid = userId;
                if (sidebarUserName) sidebarUserName.textContent = currentUserData.name || 'Explorer';
                if (sidebarUserCallsign) sidebarUserCallsign.textContent = currentUserData.callsign || `@${(currentUserData.name || 'User').toLowerCase().replace(/\s+/g, '_')}`;
                if (sidebarUserAvatar && currentUserData.profilePictureURL) {
                    sidebarUserAvatar.src = currentUserData.profilePictureURL;
                } else if (sidebarUserAvatar) {
                    sidebarUserAvatar.src = 'placeholder-avatar.png';
                }
            } else {
                console.log("User data not found for UID:", userId);
                if (sidebarUserName) sidebarUserName.textContent = currentUser.displayName || 'Explorer';
                if (sidebarUserCallsign) sidebarUserCallsign.textContent = `@${(currentUser.displayName || 'User').toLowerCase().replace(/\s+/g, '_')}`;
                if (sidebarUserAvatar && currentUser.photoURL) sidebarUserAvatar.src = currentUser.photoURL;
            }
        }, error => {
            console.error("Error fetching user profile:", error);
        });
    }

    // --- Modal Logic --- (Keep existing)
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
        // NEW: Close image modal on outside click
        if (event.target === imageFullViewModal) {
            imageFullViewModal.classList.remove('show');
        }
    });

    function resetModalForm() { /* ... Keep existing ... */ }
    function resetInlineForm() { /* ... Keep existing ... */ }

    // --- Image Handling (Modal & Inline) --- (Keep existing)
    if (modalAttachImageBtn) modalAttachImageBtn.addEventListener('click', () => modalPostImageInput.click());
    if (modalPostImageInput) modalPostImageInput.addEventListener('change', handleImageSelect(true));
    if (modalRemoveImageBtn) modalRemoveImageBtn.addEventListener('click', () => removeImage(true));
    if (inlineAttachImageBtn) inlineAttachImageBtn.addEventListener('click', () => inlinePostImageUpload.click());
    if (inlinePostImageUpload) inlinePostImageUpload.addEventListener('change', handleImageSelect(false));
    if (inlineRemoveImageBtn) inlineRemoveImageBtn.addEventListener('click', () => removeImage(false));
    function handleImageSelect(isModal) { /* ... Keep existing ... */ }
    function removeImage(isModal) { /* ... Keep existing ... */ }

    // --- Unified Post Submission Logic --- (Keep existing)
    async function handlePostSubmit(content, imageFile, formType) { /* ... Keep existing ... */ }
    if (postThreadForm) { /* ... Keep existing ... */ }
    if (inlineSubmitPostBtn) { /* ... Keep existing ... */ }

    // --- Format Timestamp --- (Keep existing)
    function formatTimestamp(firebaseTimestamp) { /* ... Keep existing ... */ }


    // --- Render Thread Item --- (MODIFIED)
    function renderThreadItem(threadId, threadData, prepend = false) {
        const existingThreadElement = document.querySelector(`.thread-item[data-thread-id="${threadId}"]`);
        if (existingThreadElement) { // If element exists, update it (e.g., for child_changed)
            updateThreadElement(existingThreadElement, threadData);
            return; // Don't re-create the whole element
        }

        const threadDiv = document.createElement('div');
        threadDiv.className = 'thread-item';
        threadDiv.setAttribute('data-thread-id', threadId);

        let imageHTML = '';
        if (threadData.imageURL) {
            // Add data-src for full view modal
            imageHTML = `<img src="${threadData.imageURL}" alt="Thread image" class="thread-image" data-full-src="${threadData.imageURL}">`;
        }

        const likesCount = threadData.likes ? Object.keys(threadData.likes).length : 0;
        const isLikedByCurrentUser = currentUser && threadData.likes && threadData.likes[currentUser.uid];

        // NEW: Delete Thread Button (only if owner)
        let deleteThreadBtnHTML = '';
        if (currentUser && currentUser.uid === threadData.userId) {
            deleteThreadBtnHTML = `<button class="btn-delete-thread" title="Delete Transmission"><i class="fas fa-trash-alt"></i></button>`;
        }

        threadDiv.innerHTML = `
            <div class="thread-header">
                <img src="${threadData.userAvatar || 'placeholder-avatar.png'}" alt="${threadData.userName}" class="thread-avatar">
                <div class="thread-user-info">
                    <strong>${threadData.userName || 'Anonymous Explorer'}</strong>
                    <span>${threadData.callsign || '@explorer'}</span>
                </div>
                <span class="thread-timestamp">${formatTimestamp(threadData.timestamp)}</span>
                ${deleteThreadBtnHTML} {/* ADDED DELETE BUTTON */}
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

        // --- Event Listeners for Thread Actions ---
        const likeButton = threadDiv.querySelector('.btn-like');
        if(likeButton) likeButton.addEventListener('click', () => toggleLike(threadId));

        const shareButton = threadDiv.querySelector('.btn-share');
        if(shareButton) shareButton.addEventListener('click', () => handleShare(threadId, threadData.content));

        const replyButton = threadDiv.querySelector('.btn-reply'); // Could toggle comment input visibility
        if(replyButton) replyButton.addEventListener('click', () => {
            const commentInput = threadDiv.querySelector('.add-comment-input');
            if(commentInput) commentInput.focus();
        });

        const submitCommentButton = threadDiv.querySelector('.btn-submit-comment');
        const commentInput = threadDiv.querySelector('.add-comment-input');
        if(submitCommentButton && commentInput) {
            submitCommentButton.addEventListener('click', () => handleAddComment(threadId, commentInput));
        }

        if (deleteThreadBtnHTML) {
            const deleteThreadBtn = threadDiv.querySelector('.btn-delete-thread');
            if(deleteThreadBtn) deleteThreadBtn.addEventListener('click', () => handleDeleteThread(threadId, threadData.imageURL));
        }

        const threadImageElement = threadDiv.querySelector('.thread-image');
        if (threadImageElement) {
            threadImageElement.addEventListener('click', (e) => {
                const fullSrc = e.target.getAttribute('data-full-src');
                if (fullSrc) openImageFullView(fullSrc);
            });
        }

        const placeholder = feedThreadsContainer.querySelector('.thread-item-placeholder');
        if (placeholder) placeholder.remove();

        if (prepend && feedThreadsContainer.firstChild) {
            feedThreadsContainer.insertBefore(threadDiv, feedThreadsContainer.firstChild);
        } else {
            feedThreadsContainer.appendChild(threadDiv);
        }
        // After adding thread, fetch and render its comments
        fetchAndRenderComments(threadId, threadDiv.querySelector('.comments-list'));
    }

    // NEW: Function to update an existing thread element (e.g., for likes, reply count)
    function updateThreadElement(threadElement, threadData) {
        const likesCount = threadData.likes ? Object.keys(threadData.likes).length : 0;
        const isLikedByCurrentUser = currentUser && threadData.likes && threadData.likes[currentUser.uid];

        const likeButton = threadElement.querySelector('.btn-like');
        const likeIcon = likeButton.querySelector('i');
        const likeCountSpan = likeButton.querySelector('.like-count');

        likeCountSpan.textContent = likesCount;
        likeButton.classList.toggle('liked', isLikedByCurrentUser);
        likeIcon.classList.toggle('fa-heart-crack', isLikedByCurrentUser);
        likeIcon.classList.toggle('fa-heart', !isLikedByCurrentUser);

        const replyCountSpan = threadElement.querySelector('.reply-count');
        if (replyCountSpan) replyCountSpan.textContent = threadData.replyCount || 0;
    }

    // --- Fetch Threads and Listen for Changes --- (MODIFIED to call updateThreadElement)
    function fetchThreadsAndListen() {
        const threadsRef = database.ref('threads').orderByChild('timestamp');
        feedThreadsContainer.innerHTML = `<div class="thread-item-placeholder"><p>Scanning for transmissions...</p><div class="spinner"></div></div>`;

        threadsRef.on('child_added', snapshot => {
            const threadId = snapshot.key;
            const threadData = snapshot.val();
            if (threadId && threadData) {
                renderThreadItem(threadId, threadData, true);
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

        threadsRef.on('child_removed', snapshot => { /* ... Keep existing ... */ });
        threadsRef.once('value', snapshot => { /* ... Keep existing ... */ });
    }


    // --- Toggle Like --- (Keep existing)
    function toggleLike(threadId) { /* ... Keep existing, it works with child_changed now ... */ }

    // --- NEW: Share Functionality ---
    function handleShare(threadId, threadContent) {
        const shareUrl = `${window.location.origin}${window.location.pathname}?thread=${threadId}`; // Basic URL
        const shareText = threadContent ? `Check out this transmission on MCICT World: "${threadContent.substring(0,100)}..."` : 'Check out this transmission on MCICT World!';

        if (navigator.share) {
            navigator.share({
                title: 'MCICT World Transmission',
                text: shareText,
                url: shareUrl,
            })
            .then(() => console.log('Successful share'))
            .catch((error) => console.log('Error sharing', error));
        } else {
            // Fallback: Copy to clipboard or simple alert
            navigator.clipboard.writeText(shareUrl).then(() => {
                alert('Link copied to clipboard! (Share functionality limited on this browser)');
            }).catch(err => {
                alert('Could not copy link. Share this URL: ' + shareUrl);
            });
        }
    }

    // --- NEW: Delete Thread Functionality ---
    async function handleDeleteThread(threadId, imageURL) {
        if (!currentUser) return;
        const threadRef = database.ref(`threads/${threadId}`);
        const threadDataSnapshot = await threadRef.once('value');
        if (!threadDataSnapshot.exists() || threadDataSnapshot.val().userId !== currentUser.uid) {
            alert("You can only delete your own transmissions.");
            return;
        }

        if (confirm("Are you sure you want to delete this transmission and all its comments? This action cannot be undone.")) {
            try {
                // 1. Delete image from Storage (if exists)
                if (imageURL) {
                    // Create a reference from the URL. This is a bit tricky, need to parse.
                    // Simpler if you store the storage path, but for now, try to delete from URL.
                    try {
                        const imageFileRef = storage.refFromURL(imageURL);
                        await imageFileRef.delete();
                        console.log("Thread image deleted from storage.");
                    } catch (storageError) {
                        console.warn("Could not delete image from storage (it might not exist or rules prevent it):", storageError);
                    }
                }

                // 2. Delete comments associated with the thread
                const commentsRef = database.ref(`comments/${threadId}`);
                await commentsRef.remove();
                console.log("Comments for thread deleted.");

                // 3. Delete the thread itself
                await threadRef.remove();
                console.log("Thread deleted successfully.");
                // The 'child_removed' listener in fetchThreadsAndListen will remove it from UI.

            } catch (error) {
                console.error("Error deleting thread:", error);
                alert("Failed to delete transmission: " + error.message);
            }
        }
    }

    // --- NEW: Comment Functionality ---
    async function handleAddComment(threadId, commentInputElement) {
        if (!currentUser || !currentUserData) {
            alert("Please log in to comment.");
            return;
        }
        const text = commentInputElement.value.trim();
        if (!text) {
            alert("Comment cannot be empty.");
            return;
        }

        const originalButton = commentInputElement.nextElementSibling; // Assuming button is next sibling
        originalButton.disabled = true;
        const originalButtonText = originalButton.textContent;
        originalButton.textContent = 'Replying...';


        const commentData = {
            userId: currentUser.uid,
            userName: currentUserData.name || currentUser.displayName || 'Explorer',
            userAvatar: currentUserData.profilePictureURL || currentUser.photoURL || 'placeholder-avatar.png',
            callsign: currentUserData.callsign || `@${(currentUserData.name || currentUser.displayName || 'User').toLowerCase().replace(/\s+/g, '_')}`,
            text: text,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };

        try {
            const commentsRef = database.ref(`comments/${threadId}`);
            await commentsRef.push().set(commentData);

            // Update replyCount on the thread using a transaction
            const threadReplyCountRef = database.ref(`threads/${threadId}/replyCount`);
            await threadReplyCountRef.transaction(currentCount => {
                return (currentCount || 0) + 1;
            });

            commentInputElement.value = ''; // Clear input
            console.log("Comment added for thread:", threadId);
        } catch (error) {
            console.error("Error adding comment:", error);
            alert("Failed to add comment: " + error.message);
        } finally {
            originalButton.disabled = false;
            originalButton.textContent = originalButtonText;
        }
    }

    function fetchAndRenderComments(threadId, commentsListElement) {
        if (!commentsListElement) return;
        const commentsRef = database.ref(`comments/${threadId}`).orderByChild('timestamp');

        // Clear previous comments before adding new ones (important for re-renders or updates)
        commentsListElement.innerHTML = '';

        commentsRef.on('child_added', snapshot => {
            const commentId = snapshot.key;
            const commentData = snapshot.val();
            renderCommentItem(commentId, commentData, commentsListElement, threadId);
        });
        commentsRef.on('child_removed', snapshot => {
            const commentId = snapshot.key;
            const commentElement = commentsListElement.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
            if(commentElement) commentElement.remove();
        });
    }

    function renderCommentItem(commentId, commentData, commentsListElement, threadId) {
        if (!commentData) return;
        const li = document.createElement('li');
        li.className = 'comment-item';
        li.setAttribute('data-comment-id', commentId);

        let deleteCommentBtnHTML = '';
        if (currentUser && currentUser.uid === commentData.userId) {
            deleteCommentBtnHTML = `<button class="btn-delete-comment" title="Delete Reply"><i class="fas fa-times-circle"></i></button>`;
        }

        li.innerHTML = `
            <img src="${commentData.userAvatar || 'placeholder-avatar.png'}" alt="${commentData.userName}" class="comment-avatar">
            <div class="comment-content-wrapper">
                <div class="comment-header">
                    <span class="comment-user-name">${commentData.userName || 'Explorer'}</span>
                    <span class="comment-timestamp">${formatTimestamp(commentData.timestamp)}</span>
                </div>
                <p class="comment-text">${commentData.text.replace(/\n/g, '<br>')}</p>
            </div>
            ${deleteCommentBtnHTML}
        `;

        if (deleteCommentBtnHTML) {
            const deleteBtn = li.querySelector('.btn-delete-comment');
            if(deleteBtn) deleteBtn.addEventListener('click', () => handleDeleteComment(threadId, commentId));
        }
        commentsListElement.appendChild(li);
    }

    async function handleDeleteComment(threadId, commentId) {
        if (!currentUser) return;
        const commentRef = database.ref(`comments/${threadId}/${commentId}`);
        const commentSnapshot = await commentRef.once('value');

        if (!commentSnapshot.exists() || commentSnapshot.val().userId !== currentUser.uid) {
            alert("You can only delete your own replies.");
            return;
        }

        if (confirm("Are you sure you want to delete this reply?")) {
            try {
                await commentRef.remove();
                // Update replyCount on the thread using a transaction
                const threadReplyCountRef = database.ref(`threads/${threadId}/replyCount`);
                await threadReplyCountRef.transaction(currentCount => {
                    return (currentCount || 0) > 0 ? (currentCount || 0) - 1 : 0;
                });
                console.log("Comment deleted:", commentId);
                 // The 'child_removed' listener on comments will handle UI update.
            } catch (error) {
                console.error("Error deleting comment:", error);
                alert("Failed to delete reply: " + error.message);
            }
        }
    }

    // --- NEW: Image Full View Modal Logic ---
    if (closeImageModalBtn) {
        closeImageModalBtn.addEventListener('click', () => {
            imageFullViewModal.classList.remove('show');
        });
    }
    function openImageFullView(imageSrc) {
        if (fullViewImage && imageFullViewModal) {
            fullViewImage.src = imageSrc;
            imageFullViewModal.classList.add('show');
        }
    }


    // --- Load Dummy Suggestions --- (Keep existing)
    function loadDummySuggestions() { /* ... Keep existing ... */ }

    // --- Logout --- (Keep existing)
    if (logoutBtn) { /* ... Keep existing ... */ }

});