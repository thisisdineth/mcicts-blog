document.addEventListener('DOMContentLoaded', () => {
    // --- Firebase Configuration --- (Keep your existing config)
    const firebaseConfig = {
        apiKey: "AIzaSyAcGV4zQzJ_-fqR2V0tSWVKB3uzMV6oxTU", // Replace with your actual config
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
        // Handle error
        return;
    }

    const auth = firebase.auth();
    const database = firebase.database();
    const storage = firebase.storage();

    // --- DOM Elements (Keep existing, add if any new static ones) ---
    // ... (all your existing DOM element selections) ...
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
    const modalAddPollBtn = document.getElementById('modal-add-poll-btn');
    const modalPollCreationArea = document.getElementById('modal-poll-creation-area');
    const modalPollOptionsContainer = document.getElementById('modal-poll-options-container');

    const inlinePostTextarea = document.getElementById('inline-post-textarea');
    const inlineAttachImageBtn = document.getElementById('inline-attach-image-btn');
    const inlinePostImageUpload = document.getElementById('inline-post-image-upload');
    const inlineSubmitPostBtn = document.getElementById('inline-submit-post-btn');
    const inlineImagePreviewContainer = document.getElementById('inline-image-preview-container');
    const inlineImagePreview = document.getElementById('inline-image-preview');
    const inlineRemoveImageBtn = document.getElementById('inline-remove-image-btn');
    const inlineAddPollBtn = document.getElementById('inline-add-poll-btn');
    const inlinePollCreationArea = document.getElementById('inline-poll-creation-area');
    const inlinePollOptionsContainer = document.getElementById('inline-poll-options-container');


    const feedThreadsContainer = document.getElementById('feed-threads-container');
    const sidebarUserName = document.getElementById('sidebar-user-name');
    const sidebarUserCallsign = document.getElementById('sidebar-user-callsign');
    const sidebarUserAvatar = document.getElementById('sidebar-user-avatar');
    const crewSuggestionsList = document.getElementById('crew-suggestions-list');
    const trendingSignalsList = document.getElementById('trending-signals-list');
    if(document.getElementById('current-year')) {
      document.getElementById('current-year').textContent = new Date().getFullYear();
    }

    const imageFullViewModal = document.getElementById('image-full-view-modal');
    const closeImageFullViewModalBtn = document.getElementById('close-image-modal-btn');
    const fullViewImage = document.getElementById('full-view-image');


    let currentUser = null;
    let currentUserData = null;
    let selectedModalImageFile = null;
    let selectedInlineImageFile = null;
    let displayedThreads = new Set();
    let openThreadOptionsMenu = null;

    // --- Auth State Observer (Keep existing) ---
    auth.onAuthStateChanged(user => {
        if (user && user.emailVerified) {
            currentUser = user;
            fetchUserProfile(currentUser.uid);
            fetchThreadsAndListen();
            loadUserSuggestions();
            loadTrendingSignals();
        } else {
            currentUser = null;
            currentUserData = null;
            if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
                 window.location.replace('auth.html');
            }
        }
    });

    // --- Fetch User Profile (Keep existing) ---
     function fetchUserProfile(userId) {
        const userRef = database.ref('users/' + userId);
        userRef.on('value', snapshot => {
            if (snapshot.exists()) {
                currentUserData = { uid: userId, ...snapshot.val() };
                if (sidebarUserName) sidebarUserName.textContent = currentUserData.name || 'Explorer';
                if (sidebarUserCallsign) sidebarUserCallsign.textContent = currentUserData.callsign || `@${generateCallsign(currentUserData.name || 'User')}`;
                if (sidebarUserAvatar) sidebarUserAvatar.src = currentUserData.profilePictureURL || 'placeholder-avatar.png';
            } else {
                // Fallback, e.g., for users signed up via Google not yet in DB
                const nameFromEmail = currentUser.email ? currentUser.email.split('@')[0] : 'User';
                currentUserData = {
                    uid: userId,
                    name: currentUser.displayName || nameFromEmail,
                    callsign: `@${generateCallsign(currentUser.displayName || nameFromEmail)}`,
                    profilePictureURL: currentUser.photoURL || 'placeholder-avatar.png'
                };
                if (sidebarUserName) sidebarUserName.textContent = currentUserData.name;
                if (sidebarUserCallsign) sidebarUserCallsign.textContent = currentUserData.callsign;
                if (sidebarUserAvatar) sidebarUserAvatar.src = currentUserData.profilePictureURL;
            }
        }, error => console.error("Error fetching user profile:", error));
    }

    function generateCallsign(name) {
        if (!name) return 'user';
        return name.toLowerCase().replace(/\s+/g, '_').substring(0, 15);
    }

    // --- Modal & Form Logic (Keep existing, ensure poll reset is fine) ---
    // ... (resetModalForm, resetInlineForm, handleImageSelect, removeImage etc. are mostly the same)
    if (openPostModalBtn) openPostModalBtn.addEventListener('click', () => postThreadModal.classList.add('show'));
    if (closePostModalBtn) {
        closePostModalBtn.addEventListener('click', () => {
            postThreadModal.classList.remove('show');
            resetModalForm();
        });
    }
    window.addEventListener('click', (event) => {
        if (event.target === postThreadModal) {
            postThreadModal.classList.remove('show'); resetModalForm();
        }
        if (event.target === imageFullViewModal) {
            imageFullViewModal.classList.remove('show');
        }
        if (openThreadOptionsMenu && !openThreadOptionsMenu.contains(event.target) && !event.target.closest('.thread-options-btn')) {
            openThreadOptionsMenu.remove();
            openThreadOptionsMenu = null;
        }
    });

    function resetForm(formType) {
        if (formType === 'modal') {
            if (modalPostContent) modalPostContent.value = '';
            if (modalImagePreviewContainer) modalImagePreviewContainer.style.display = 'none';
            if (modalImagePreview) modalImagePreview.src = '#';
            if (modalPostImageInput) modalPostImageInput.value = '';
            selectedModalImageFile = null;
            if (modalPollCreationArea) modalPollCreationArea.style.display = 'none';
            if (modalPollOptionsContainer) modalPollOptionsContainer.querySelectorAll('input').forEach(input => input.value = '');
        } else { // inline
            if (inlinePostTextarea) inlinePostTextarea.value = '';
            if (inlineImagePreviewContainer) inlineImagePreviewContainer.style.display = 'none';
            if (inlineImagePreview) inlineImagePreview.src = '#';
            if (inlinePostImageUpload) inlinePostImageUpload.value = '';
            selectedInlineImageFile = null;
            if (inlinePollCreationArea) inlinePollCreationArea.style.display = 'none';
            if (inlinePollOptionsContainer) inlinePollOptionsContainer.querySelectorAll('input').forEach(input => input.value = '');
        }
    }
    function resetModalForm() { resetForm('modal'); }
    function resetInlineForm() { resetForm('inline'); }


    function handleImageSelect(isModal, inputElement, previewElement, previewContainer, fileVariableSetter) {
        return function(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    previewElement.src = e.target.result;
                    previewContainer.style.display = 'block';
                    fileVariableSetter(file);
                };
                reader.readAsDataURL(file);
            }
        };
    }

    function removeImage(previewElement, previewContainer, inputElement, fileVariableSetter) {
        previewElement.src = '#';
        previewContainer.style.display = 'none';
        if (inputElement) inputElement.value = '';
        fileVariableSetter(null);
    }

    // Main post image handlers
    if (modalAttachImageBtn) modalAttachImageBtn.addEventListener('click', () => modalPostImageInput.click());
    if (modalPostImageInput) modalPostImageInput.addEventListener('change', handleImageSelect(true, modalPostImageInput, modalImagePreview, modalImagePreviewContainer, file => selectedModalImageFile = file));
    if (modalRemoveImageBtn) modalRemoveImageBtn.addEventListener('click', () => removeImage(modalImagePreview, modalImagePreviewContainer, modalPostImageInput, file => selectedModalImageFile = null));

    if (inlineAttachImageBtn) inlineAttachImageBtn.addEventListener('click', () => inlinePostImageUpload.click());
    if (inlinePostImageUpload) inlinePostImageUpload.addEventListener('change', handleImageSelect(false, inlinePostImageUpload, inlineImagePreview, inlineImagePreviewContainer, file => selectedInlineImageFile = file));
    if (inlineRemoveImageBtn) inlineRemoveImageBtn.addEventListener('click', () => removeImage(inlineImagePreview, inlineImagePreviewContainer, inlinePostImageUpload, file => selectedInlineImageFile = null));


    // Poll Creation Toggle
    if (modalAddPollBtn) modalAddPollBtn.addEventListener('click', () => {
        modalPollCreationArea.style.display = modalPollCreationArea.style.display === 'none' ? 'block' : 'none';
    });
    if (inlineAddPollBtn) inlineAddPollBtn.addEventListener('click', () => {
        inlinePollCreationArea.style.display = inlinePollCreationArea.style.display === 'none' ? 'block' : 'none';
    });

    // --- Post Submission (Keep existing, poll data should be fine) ---
    async function handlePostSubmit(content, imageFile, formType) {
        if (!currentUser || !currentUserData) {
            alert("Authentication error. Please sign in again.");
            return;
        }

        const isModal = formType === 'modal';
        const pollCreationArea = isModal ? modalPollCreationArea : inlinePollCreationArea;
        const pollOptionsContainer = isModal ? modalPollOptionsContainer : inlinePollOptionsContainer;
        let pollData = null;

        if (pollCreationArea.style.display === 'block') {
            const optionInputs = Array.from(pollOptionsContainer.querySelectorAll('input.poll-option-input'));
            const options = optionInputs
                .map(input => input.value.trim())
                .filter(text => text !== '');

            if (options.length < 2) {
                alert("A poll must have at least 2 options.");
                return;
            }
            if (options.length > 4) {
                alert("A poll can have at most 4 options.");
                return;
            }
            pollData = {
                options: options.map((text, index) => ({ id: `opt${index + 1}`, text: text, votes: 0 })),
                voters: {} // Initialize voters object
            };
        }

        if (!content && !imageFile && !pollData) {
            alert("Please write something, attach an image, or create a poll.");
            return;
        }

        let submitButton, originalButtonText;
        if (isModal) {
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
                userAvatar: currentUserData.profilePictureURL || 'placeholder-avatar.png',
                callsign: currentUserData.callsign || `@${generateCallsign(currentUserData.name || 'User')}`,
                content: content,
                imageURL: imageURL,
                poll: pollData, // This will be null if no poll was created
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                likes: {},
                replyCount: 0, // Will store top-level reply count
                reports: {}
            };
            await database.ref('threads').push().set(threadData);
            if (isModal) {
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


    // --- Timestamp Formatting (Keep existing) ---
    function formatTimestamp(firebaseTimestamp) {
        if (!firebaseTimestamp) return 'Sending...';
        const date = new Date(firebaseTimestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffSecs = Math.round(diffMs / 1000);
        const diffMins = Math.round(diffSecs / 60);
        const diffHours = Math.round(diffMins / 60);

        if (diffSecs < 2) return 'now';
        if (diffSecs < 60) return `${diffSecs}s`;
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }


    // --- Render Thread Item (Adjusted for poll rendering and comment toggle) ---
    function renderThreadItem(threadId, threadData, prepend = false) {
        // ... (previous implementation up to HTML structure)
        if (!currentUser || !currentUserData) return;

        const threadDiv = document.createElement('article');
        threadDiv.className = 'thread-item';
        threadDiv.setAttribute('data-thread-id', threadId);
        threadDiv.setAttribute('tabindex', '0');

        let imageHTML = '';
        if (threadData.imageURL) {
            imageHTML = `<img src="${threadData.imageURL}" alt="Thread image" class="thread-image" data-full-src="${threadData.imageURL}">`;
        }

        // Poll HTML: Pass threadId and pollData to renderPoll
        let pollHTML = '';
        if (threadData.poll) {
            pollHTML = renderPoll(threadId, threadData.poll); // Removed isOwner flag, not needed here
        }

        const likesCount = threadData.likes ? Object.keys(threadData.likes).length : 0;
        const isLikedByCurrentUser = currentUser && threadData.likes && threadData.likes[currentUser.uid];
        const replyCount = threadData.replyCount || 0; // Top-level reply count

        const profileLink = `profiles.html?uid=${threadData.userId}`;
        const optionsBtnId = `options-btn-${threadId}`;
        const commentsSectionId = `comments-section-${threadId}`;
        const viewRepliesBtnId = `view-replies-btn-${threadId}`;


        threadDiv.innerHTML = `
            <div class="thread-main-content">
                <div class="thread-avatar-container">
                    <a href="${profileLink}" class="thread-user-link">
                        <img src="${threadData.userAvatar || 'placeholder-avatar.png'}" alt="${threadData.userName}" class="thread-avatar">
                    </a>
                </div>
                <div class="thread-body">
                    <div class="thread-header">
                        <a href="${profileLink}" class="thread-user-link thread-user-info">
                            <strong>${threadData.userName || 'Anonymous Explorer'}</strong>
                            <span class="callsign">${threadData.callsign || '@explorer'}</span>
                            <span class="timestamp-separator">·</span>
                            <span class="thread-timestamp">${formatTimestamp(threadData.timestamp)}</span>
                        </a>
                        <button class="thread-options-btn" id="${optionsBtnId}" aria-label="Thread options" title="More options"><i class="fas fa-ellipsis-h"></i></button>
                    </div>
                    <div class="thread-content">
                        ${threadData.content ? `<p>${(threadData.content).replace(/\n/g, '<br>')}</p>` : ''}
                        ${imageHTML}
                        ${pollHTML}
                    </div>
                    <div class="thread-actions">
                        <button class="thread-action-btn btn-reply" id="${viewRepliesBtnId}" data-action="view-replies" aria-label="View Replies">
                            <i class="far fa-comment"></i> <span class="reply-count">${replyCount}</span>
                        </button>
                        <button class="thread-action-btn btn-like ${isLikedByCurrentUser ? 'liked' : ''}" data-action="like" aria-label="Like">
                            <i class="fa-${isLikedByCurrentUser ? 'solid' : 'regular'} fa-heart"></i> <span class="like-count">${likesCount}</span>
                        </button>
                        <button class="thread-action-btn btn-share" data-action="share" aria-label="Share">
                            <i class="fas fa-share-square"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="thread-comments-section" id="${commentsSectionId}" style="display: none;">
                </div>
        `;

        threadDiv.querySelector('.btn-like').addEventListener('click', (e) => { e.stopPropagation(); toggleLike(threadId); });
        threadDiv.querySelector('.btn-share').addEventListener('click', (e) => { e.stopPropagation(); handleShare(threadId, threadData.content); });
        
        // Make the "View Replies" button (which includes the count) toggle the comments section
        const viewRepliesButton = threadDiv.querySelector(`#${viewRepliesBtnId}`);
        viewRepliesButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const commentsSectionElement = threadDiv.querySelector(`#${commentsSectionId}`);
            toggleCommentsSection(threadId, commentsSectionElement);
        });

        const optionsButton = threadDiv.querySelector(`#${optionsBtnId}`);
        optionsButton.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleThreadOptionsMenu(threadId, threadData, optionsButton);
        });

        const threadImageElement = threadDiv.querySelector('.thread-image');
        if (threadImageElement) {
            threadImageElement.addEventListener('click', (e) => {
                e.stopPropagation();
                openImageFullView(e.target.getAttribute('data-full-src'), threadData.content);
            });
        }

        if (threadData.poll) {
            attachPollEventListeners(threadDiv, threadId);
        }
        // ... (rest of renderThreadItem, appending to DOM)
        const placeholder = feedThreadsContainer.querySelector('.thread-item-placeholder');
        if (placeholder) placeholder.remove();

        if (prepend) {
            feedThreadsContainer.insertBefore(threadDiv, feedThreadsContainer.firstChild);
        } else {
            feedThreadsContainer.appendChild(threadDiv);
        }
    }

    function attachPollEventListeners(threadElement, threadId) {
        threadElement.querySelectorAll('.poll-option').forEach(optionEl => {
            optionEl.addEventListener('click', (e) => {
                e.stopPropagation();
                // Only allow voting if the poll isn't already marked as voted by this user for this option
                // and also if the poll itself isn't marked as globally voted by the user (already-voted-poll)
                if (!optionEl.classList.contains('voted-by-user') && !optionEl.classList.contains('already-voted-poll')) {
                    handleVote(threadId, optionEl.dataset.optionId);
                }
            });
        });
    }
    
    function toggleThreadOptionsMenu(threadId, threadData, buttonElement) {
        // ... (keep existing implementation)
        if (openThreadOptionsMenu && openThreadOptionsMenu.dataset.threadId === threadId) {
            openThreadOptionsMenu.remove();
            openThreadOptionsMenu = null;
            return;
        }
        if (openThreadOptionsMenu) {
            openThreadOptionsMenu.remove();
        }

        const menu = document.createElement('div');
        menu.className = 'thread-options-menu';
        menu.dataset.threadId = threadId; // Keep track of which menu this is

        const reportButton = document.createElement('button');
        reportButton.innerHTML = `<i class="fas fa-flag"></i> Report Transmission`;
        reportButton.addEventListener('click', (e) => {
            e.stopPropagation();
            handleReportThread(threadId);
            menu.remove(); openThreadOptionsMenu = null;
        });
        menu.appendChild(reportButton);

        if (currentUser && currentUser.uid === threadData.userId) {
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-option';
            deleteButton.innerHTML = `<i class="fas fa-trash-alt"></i> Delete Transmission`;
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation();
                handleDeleteThread(threadId, threadData.imageURL, threadData.poll);
                menu.remove(); openThreadOptionsMenu = null;
            });
            menu.appendChild(deleteButton);
        }
        
        buttonElement.parentNode.appendChild(menu);
        openThreadOptionsMenu = menu;
    }

    // --- Update Thread Element (Adjusted for poll re-rendering) ---
    function updateThreadElement(threadElement, threadData) {
        if (!currentUser) return;
        // ... (update likes, reply count, timestamp as before)
         const likesCount = threadData.likes ? Object.keys(threadData.likes).length : 0;
        const isLikedByCurrentUser = currentUser && threadData.likes && threadData.likes[currentUser.uid];
        const likeButton = threadElement.querySelector('.btn-like');
        if (likeButton) {
            likeButton.querySelector('.like-count').textContent = likesCount;
            likeButton.classList.toggle('liked', isLikedByCurrentUser);
            const likeIcon = likeButton.querySelector('i');
            likeIcon.className = `fa-${isLikedByCurrentUser ? 'solid' : 'regular'} fa-heart`;
        }
        
        const replyCountSpan = threadElement.querySelector('.reply-count');
        if (replyCountSpan) replyCountSpan.textContent = threadData.replyCount || 0;

        const timestampSpan = threadElement.querySelector('.thread-timestamp');
        if (timestampSpan) timestampSpan.textContent = formatTimestamp(threadData.timestamp);


        // Update Poll if exists - More robust replacement
        const existingPollContainer = threadElement.querySelector('.thread-poll');
        if (threadData.poll) {
            const newPollHTML = renderPoll(threadElement.dataset.threadId, threadData.poll);
            const tempDiv = document.createElement('div'); // Create a temporary div to parse the new HTML
            tempDiv.innerHTML = newPollHTML;
            const newPollElement = tempDiv.querySelector('.thread-poll');

            if (newPollElement) {
                if (existingPollContainer) {
                    existingPollContainer.replaceWith(newPollElement);
                } else {
                    // If poll didn't exist before, find where to insert it (e.g., after content, before actions)
                    const contentDiv = threadElement.querySelector('.thread-content');
                    if (contentDiv) contentDiv.appendChild(newPollElement);
                }
                // Re-attach poll option listeners for the updated/new poll element
                attachPollEventListeners(threadElement, threadElement.dataset.threadId);
            }
        } else if (existingPollContainer) {
            existingPollContainer.remove(); // Remove poll if it no longer exists in data
        }
    }

    // --- Fetch Threads and Listen (Keep existing) ---
    function fetchThreadsAndListen() {
        const threadsRef = database.ref('threads').orderByChild('timestamp');
        if (feedThreadsContainer.children.length === 0 || feedThreadsContainer.querySelector('.thread-item-placeholder')) {
            feedThreadsContainer.innerHTML = `<div class="thread-item-placeholder"><p>Scanning for transmissions...</p><div class="spinner"></div></div>`;
        }
        // displayedThreads.clear(); // Don't clear if you want to avoid full re-render on auth changes, but might be needed if listeners are duplicated

        threadsRef.on('child_added', snapshot => {
            const threadId = snapshot.key;
            const threadData = snapshot.val();
            if (threadId && threadData && !displayedThreads.has(threadId)) {
                renderThreadItem(threadId, threadData, true);
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
                feedThreadsContainer.innerHTML = `<div class="thread-item-placeholder"><p>No transmissions detected. Be the first!</p></div>`;
            }
        });
        threadsRef.once('value', snapshot => {
            if (!snapshot.exists() && feedThreadsContainer.querySelector('.thread-item-placeholder')) {
                 feedThreadsContainer.innerHTML = `<div class="thread-item-placeholder"><p>No transmissions detected. Be the first!</p></div>`;
            } else if (snapshot.exists() && feedThreadsContainer.children.length === 1 && feedThreadsContainer.querySelector('.thread-item-placeholder')) {
                // If only placeholder exists but data is there, child_added should handle it.
                // This case might be redundant.
            }
        });
    }

    // --- Like, Share, Delete, Report (Keep existing) ---
    function toggleLike(threadId) {
        if (!currentUser) { alert("Please sign in to like posts."); return; }
        const threadRef = database.ref(`threads/${threadId}/likes/${currentUser.uid}`);
        threadRef.once('value', snapshot => {
            if (snapshot.exists()) {
                threadRef.remove(); // Unlike
            } else {
                threadRef.set(true); // Like
            }
        });
    }

    async function handleShare(threadId, threadContent) {
        const shareURL = `${window.location.origin}${window.location.pathname}?thread=${threadId}`;
        const shareData = {
            title: 'Check out this transmission!',
            text: threadContent ? `${threadContent.substring(0, 100)}...` : 'Interesting signal from MCICT World',
            url: shareURL,
        };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                navigator.clipboard.writeText(`${shareData.text} \nLink: ${shareData.url}`)
                    .then(() => alert('Content & Link copied to clipboard! (Web Share API not available)'))
                    .catch(err => alert('Could not copy content.'));
            }
        } catch (error) {
            console.error('Error sharing:', error);
        }
    }

    async function handleDeleteThread(threadId, imageURL, pollData) {
        if (!currentUser) { alert("Authentication error."); return; }
        const threadRef = database.ref(`threads/${threadId}`);
        const threadSnapshot = await threadRef.once('value');
        if (!threadSnapshot.exists() || threadSnapshot.val().userId !== currentUser.uid) {
            alert("You can only delete your own transmissions."); return;
        }

        if (confirm("Are you sure you want to permanently delete this transmission and all its replies? This action cannot be undone.")) {
            try {
                if (imageURL) {
                    await storage.refFromURL(imageURL).delete().catch(e => console.warn("Image delete failed", e));
                }
                if (pollData && pollData.options) { // Check if poll has images (conceptual for now)
                    // for (const option of pollData.options) {
                    //     if (option.imageURL) await storage.refFromURL(option.imageURL).delete().catch(e=>console.warn("Poll img delete failed",e));
                    // }
                }
                // Delete all comments and their sub-replies/images
                const commentsRef = database.ref(`threads/${threadId}/comments`);
                const commentsSnapshot = await commentsRef.once('value');
                if (commentsSnapshot.exists()) {
                    const deletionPromises = [];
                    commentsSnapshot.forEach(commentSnap => {
                        const commentData = commentSnap.val();
                        if(commentData.imageURL) {
                            deletionPromises.push(storage.refFromURL(commentData.imageURL).delete().catch(e=>console.warn("Comment img delete failed",e)));
                        }
                        // Delete nested replies and their images
                        const nestedRepliesRef = database.ref(`threads/${threadId}/comments/${commentSnap.key}/replies`);
                        deletionPromises.push(nestedRepliesRef.once('value').then(nestedSnaps => {
                            if (nestedSnaps.exists()) {
                                nestedSnaps.forEach(nestedSnap => {
                                    if (nestedSnap.val().imageURL) {
                                        deletionPromises.push(storage.refFromURL(nestedSnap.val().imageURL).delete().catch(e=>console.warn("Nested reply img delete failed", e)));
                                    }
                                });
                            }
                            return nestedRepliesRef.remove();
                        }));
                        deletionPromises.push(commentSnap.ref.remove());
                    });
                    await Promise.all(deletionPromises);
                }
                await threadRef.remove();
            } catch (error) {
                console.error("Error deleting thread:", error);
                alert("Failed to delete transmission: " + error.message);
            }
        }
    }
    async function handleReportThread(threadId) {
        if (!currentUser) { alert("Please sign in to report posts."); return; }
        if (confirm("Are you sure you want to report this transmission?")) {
            const reportData = {
                reportedBy: currentUser.uid,
                reporterName: currentUserData.name,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                threadId: threadId,
                status: "new" // "new", "reviewed", "action_taken"
            };
            try {
                await database.ref(`reportedContent/threads/${threadId}/${currentUser.uid}`).set(reportData);
                alert("Transmission reported. Our team will review it.");
            } catch (error) {
                console.error("Error reporting thread:", error);
                alert("Failed to report transmission: " + error.message);
            }
        }
    }


    // --- Poll Functionality (renderPoll and handleVote updated) ---
    function renderPoll(threadId, pollData) {
        if (!pollData || !pollData.options) return '';
        let totalVotes = 0;
        pollData.options.forEach(opt => totalVotes += (opt.votes || 0));

        const userVotedOptionId = currentUser && pollData.voters ? pollData.voters[currentUser.uid] : null;

        let optionsHTML = pollData.options.map(option => {
            const percentage = totalVotes > 0 ? Math.round(((option.votes || 0) / totalVotes) * 100) : 0;
            let optionClass = "poll-option";

            if (userVotedOptionId) { // If current user has voted in this poll
                optionClass += " already-voted-poll";
                if (option.id === userVotedOptionId) {
                    optionClass += " voted-by-user";
                }
            }
            
            const canVote = !userVotedOptionId; // User can vote if they haven't voted yet

            return `
                <div class="${optionClass}" 
                     data-option-id="${option.id}" 
                     role="button" 
                     tabindex="${canVote ? '0' : '-1'}" 
                     aria-label="${option.text} - ${percentage}% votes. ${userVotedOptionId === option.id ? 'You voted for this.' : (userVotedOptionId ? 'Results shown.' : 'Click to vote.')}">
                    <span class="poll-option-text">${option.text}</span>
                    ${totalVotes > 0 ? `<span class="poll-option-percent">${percentage}%</span>` : ''}
                    ${totalVotes > 0 ? `<div class="poll-option-fill" style="width: ${percentage}%;"></div>` : ''}
                </div>
            `;
        }).join('');

        return `
            <div class="thread-poll" data-thread-id="${threadId}">
                ${optionsHTML}
                ${totalVotes > 0 ? `<div class="poll-total-votes">${totalVotes} vote${totalVotes !== 1 ? 's' : ''}</div>` : '<div class="poll-total-votes">No votes yet.</div>'}
            </div>
        `;
    }


    async function handleVote(threadId, optionIdToVote) {
        if (!currentUser) { alert("Please sign in to vote."); return; }
        const pollRef = database.ref(`threads/${threadId}/poll`);

        try {
            const pollSnapshot = await pollRef.once('value');
            let pollData = pollSnapshot.val();

            if (!pollData) { console.error("Poll data not found."); return; }
            if (pollData.voters && pollData.voters[currentUser.uid]) {
                // User has already voted. UI should ideally prevent this, but good to double check.
                // alert("You have already voted in this poll.");
                return;
            }

            const updates = {};
            let optionIndex = pollData.options.findIndex(opt => opt.id === optionIdToVote);

            if (optionIndex === -1) {
                console.error("Invalid option ID:", optionIdToVote); return;
            }

            // Ensure voters object exists
            if (!pollData.voters) {
                pollData.voters = {};
            }
            updates[`voters/${currentUser.uid}`] = optionIdToVote;
            updates[`options/${optionIndex}/votes`] = (pollData.options[optionIndex].votes || 0) + 1;

            await pollRef.update(updates);
            // UI update will be handled by 'child_changed' on the thread.
        } catch (error) {
            console.error("Error voting:", error);
            alert("Failed to cast vote: " + error.message);
        }
    }

    // --- Comment Functionality (Updated for Nested Replies) ---
    function toggleCommentsSection(threadId, commentsSectionElement, forceOpen = false) {
        const shouldOpen = forceOpen || commentsSectionElement.style.display === 'none';
        if (shouldOpen) {
            commentsSectionElement.style.display = 'block';
            if (!commentsSectionElement.innerHTML.trim()) {
                loadCommentsAndForm(threadId, commentsSectionElement);
            }
            const textarea = commentsSectionElement.querySelector('.add-comment-input');
            if (textarea && forceOpen) textarea.focus(); // Focus only if forced open (e.g., reply button click)
        } else {
            commentsSectionElement.style.display = 'none';
        }
    }

    function loadCommentsAndForm(threadId, commentsSectionElement) {
        if (!currentUserData) return;
        commentsSectionElement.innerHTML = ''; // Clear previous content (like loading spinner)

        const formDiv = document.createElement('div');
        formDiv.className = 'add-comment-form'; // Top-level reply form
        formDiv.innerHTML = `
            <img src="${currentUserData.profilePictureURL || 'placeholder-avatar.png'}" alt="Your avatar" class="comment-user-avatar">
            <div class="add-comment-input-wrapper">
                <textarea class="add-comment-input" placeholder="Transmit your reply..."></textarea>
                <div class="comment-image-preview-container" style="display:none;">
                    <img class="comment-image-preview" src="#" alt="Reply image preview"/>
                    <button class="remove-image-btn remove-comment-image-btn" title="Remove Image">&times;</button>
                </div>
                <div class="comment-form-actions">
                    <div>
                        <input type="file" class="comment-image-upload" accept="image/*" style="display: none;">
                        <button class="action-btn attach-comment-image-btn" title="Attach Image"><i class="fas fa-image"></i></button>
                    </div>
                    <button class="btn-primary btn-submit-comment">Reply</button>
                </div>
            </div>
        `;
        commentsSectionElement.appendChild(formDiv);

        const commentsListUl = document.createElement('ul');
        commentsListUl.className = 'comments-list';
        commentsListUl.innerHTML = `<li><div class="spinner-small"></div></li>`;
        commentsSectionElement.appendChild(commentsListUl);

        // Setup for the main reply form
        const commentInputElement = formDiv.querySelector('.add-comment-input');
        const submitCommentBtn = formDiv.querySelector('.btn-submit-comment');
        const attachCommentImageBtn = formDiv.querySelector('.attach-comment-image-btn');
        const commentImageUploadInput = formDiv.querySelector('.comment-image-upload');
        const commentImagePreviewContainer = formDiv.querySelector('.comment-image-preview-container');
        const commentImagePreview = formDiv.querySelector('.comment-image-preview');
        const removeCommentImageBtn = formDiv.querySelector('.remove-comment-image-btn');
        let selectedCommentImageFile = null;

        attachCommentImageBtn.addEventListener('click', () => commentImageUploadInput.click());
        commentImageUploadInput.addEventListener('change', handleImageSelect(false, commentImageUploadInput, commentImagePreview, commentImagePreviewContainer, file => selectedCommentImageFile = file));
        removeCommentImageBtn.addEventListener('click', () => removeImage(commentImagePreview, commentImagePreviewContainer, commentImageUploadInput, file => selectedCommentImageFile = null));
        
        submitCommentBtn.addEventListener('click', async () => {
            const commentText = commentInputElement.value.trim();
            if (!commentText && !selectedCommentImageFile) return;
            submitCommentBtn.disabled = true; submitCommentBtn.textContent = 'Replying...';
            try {
                await handleAddComment(threadId, null, commentText, selectedCommentImageFile, commentInputElement, () => selectedCommentImageFile = null, commentImageUploadInput, commentImagePreviewContainer, commentImagePreview);
            } finally {
                submitCommentBtn.disabled = false; submitCommentBtn.textContent = 'Reply';
            }
        });
        fetchAndRenderComments(threadId, commentsListUl);
    }

    async function handleAddComment(threadId, parentCommentId, commentText, imageFile, inputElement, imageFileSetter, imageUploadInputElement, imagePreviewContainerElement, imagePreviewImgElement) {
        if (!currentUser || !currentUserData) { alert("Please sign in."); return; }
        let imageURL = null;
        if (imageFile) {
            try {
                const imagePath = parentCommentId ? `nested_comment_images/${threadId}/${parentCommentId}` : `comment_images/${threadId}`;
                const imageName = `${Date.now()}_${imageFile.name}`;
                const imageRef = storage.ref(`${imagePath}/${currentUser.uid}/${imageName}`);
                const snapshot = await imageRef.put(imageFile);
                imageURL = await snapshot.ref.getDownloadURL();
            } catch (imgError) {
                console.error("Error uploading comment image:", imgError);
                alert("Failed to upload image for reply: " + imgError.message); return;
            }
        }

        const commentData = {
            userId: currentUser.uid,
            userName: currentUserData.name || 'Explorer',
            userAvatar: currentUserData.profilePictureURL || 'placeholder-avatar.png',
            callsign: currentUserData.callsign || `@${generateCallsign(currentUserData.name || 'User')}`,
            text: commentText,
            imageURL: imageURL,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            replyCount: 0 // For nested replies under this comment
        };
        if (parentCommentId && inputElement.dataset.replyingToUserId) { // Store mention info for nested
            commentData.replyingToUserId = inputElement.dataset.replyingToUserId;
            commentData.replyingToUserName = inputElement.dataset.replyingToUserName;
        }


        const basePath = `threads/${threadId}/comments`;
        const finalPath = parentCommentId ? `${basePath}/${parentCommentId}/replies` : basePath;
        const commentsRef = database.ref(finalPath);

        try {
            await commentsRef.push().set(commentData);
            if (parentCommentId) { // Increment replyCount on parent comment
                await database.ref(`${basePath}/${parentCommentId}/replyCount`).set(firebase.database.ServerValue.increment(1));
            } else { // Increment replyCount on main thread for top-level comment
                await database.ref(`threads/${threadId}/replyCount`).set(firebase.database.ServerValue.increment(1));
            }
            inputElement.value = '';
            if (imageUploadInputElement) imageUploadInputElement.value = '';
            if (imagePreviewContainerElement) imagePreviewContainerElement.style.display = 'none';
            if (imagePreviewImgElement) imagePreviewImgElement.src = '#';
            if (imageFileSetter) imageFileSetter(null); // Reset the file variable

            // If it's a nested reply form, hide it after submitting
            if(parentCommentId && inputElement.closest('.nested-reply-form')) {
                inputElement.closest('.nested-reply-form').remove();
            }

        } catch (error) {
            console.error("Error adding comment:", error);
            alert("Failed to add reply: " + error.message);
        }
    }

    function fetchAndRenderComments(threadId, commentsListElement) {
        const commentsRef = database.ref(`threads/${threadId}/comments`).orderByChild('timestamp');
        commentsListElement.innerHTML = `<li><div class="spinner-small"></div></li>`;

        commentsRef.on('value', snapshot => {
            commentsListElement.innerHTML = '';
            if (snapshot.exists()) {
                snapshot.forEach(childSnapshot => {
                    renderCommentItem(childSnapshot.key, childSnapshot.val(), commentsListElement, threadId, false); // false for isNested
                });
                 if(commentsListElement.innerHTML === '') {
                     commentsListElement.innerHTML = '<li>Be the first to reply!</li>';
                }
            } else {
                commentsListElement.innerHTML = '<li>Be the first to reply!</li>';
            }
        }, error => {
            console.error("Error fetching comments:", error);
            commentsListElement.innerHTML = '<li>Could not load replies.</li>';
        });
    }
    
    function renderCommentItem(commentId, commentData, parentListElement, threadId, isNested) {
        const li = document.createElement('li');
        li.className = isNested ? 'comment-item nested-comment-item' : 'comment-item';
        li.setAttribute('data-comment-id', commentId);

        let deleteBtnHTML = '';
        if (currentUser && currentUser.uid === commentData.userId) {
            deleteBtnHTML = `<button class="btn-delete-comment" title="Delete Reply"><i class="fas fa-times"></i></button>`;
        }
        let commentImageHTML = '';
        if (commentData.imageURL) {
            commentImageHTML = `<img src="${commentData.imageURL}" alt="Comment image" class="comment-image" data-full-src="${commentData.imageURL}">`;
        }
        const profileLink = `profiles.html?uid=${commentData.userId}`;
        const nestedReplyCount = commentData.replyCount || 0;

        li.innerHTML = `
            <a href="${profileLink}">
                <img src="${commentData.userAvatar || 'placeholder-avatar.png'}" alt="${commentData.userName}" class="comment-avatar">
            </a>
            <div class="comment-body">
                <div class="comment-header">
                    <a href="${profileLink}" class="comment-user-name">${commentData.userName || 'Explorer'}</a>
                    <span class="comment-callsign">${commentData.callsign || ''}</span>
                    <span class="comment-timestamp-separator">·</span>
                    <span class="comment-timestamp">${formatTimestamp(commentData.timestamp)}</span>
                    ${deleteBtnHTML}
                </div>
                ${commentData.text ? `<p class="comment-text">${(commentData.text).replace(/\n/g, '<br>')}</p>` : ''}
                ${commentImageHTML}
                <div class="comment-item-actions">
                    <button class="action-btn btn-reply-to-comment" title="Reply to this comment">
                        <i class="far fa-comment-dots"></i> <span class="nested-reply-count">${nestedReplyCount}</span>
                    </button>
                    </div>
                <div class="nested-reply-form-container"></div> <ul class="nested-replies-list" style="display: ${nestedReplyCount > 0 ? 'block' : 'none'};">
                    ${nestedReplyCount > 0 ? '<li><div class="spinner-small"></div></li>' : ''}
                </ul>
            </div>
        `;
        parentListElement.appendChild(li);

        const replyToCommentBtn = li.querySelector('.btn-reply-to-comment');
        const nestedReplyFormContainer = li.querySelector('.nested-reply-form-container');
        const nestedRepliesList = li.querySelector('.nested-replies-list');

        replyToCommentBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Toggle nested reply form OR toggle visibility of existing nested replies
            if (nestedReplyFormContainer.innerHTML.trim() === '') { // If form not there, add it
                addNestedReplyForm(threadId, commentId, commentData, nestedReplyFormContainer);
            } else { // If form is there, remove it (or toggle)
                nestedReplyFormContainer.innerHTML = '';
            }
            // Toggle visibility of nested replies list
            if (nestedReplyCount > 0) {
                 nestedRepliesList.style.display = nestedRepliesList.style.display === 'none' ? 'block' : 'none';
            }
        });
        
        if (nestedReplyCount > 0) { // Fetch nested replies if count is > 0
            fetchAndRenderNestedReplies(threadId, commentId, nestedRepliesList);
        }


        if (deleteBtnHTML) {
            li.querySelector('.btn-delete-comment').addEventListener('click', (e) => {
                e.stopPropagation();
                handleDeleteComment(threadId, commentId, commentData.imageURL, isNested, parentListElement.closest('.comment-item')?.dataset.commentId);
            });
        }
        const commentImageElement = li.querySelector('.comment-image');
        if (commentImageElement) {
            commentImageElement.addEventListener('click', (e) => {
                e.stopPropagation();
                openImageFullView(e.target.getAttribute('data-full-src'), commentData.text);
            });
        }
    }

    function addNestedReplyForm(threadId, parentCommentId, parentCommentData, containerElement) {
        if (!currentUserData) return;
        containerElement.innerHTML = ''; // Clear previous form if any

        const formDiv = document.createElement('div');
        formDiv.className = 'nested-reply-form add-comment-form'; // Reuse some styling
        formDiv.innerHTML = `
            <div class="add-comment-input-wrapper">
                <textarea class="add-comment-input" placeholder="Reply to ${parentCommentData.userName}..."></textarea>
                <div class="comment-image-preview-container" style="display:none;">
                    <img class="comment-image-preview" src="#" alt="Nested reply image"/>
                    <button class="remove-image-btn remove-comment-image-btn">&times;</button>
                </div>
                <div class="comment-form-actions">
                    <div>
                        <input type="file" class="comment-image-upload" accept="image/*" style="display: none;">
                        <button class="action-btn attach-comment-image-btn"><i class="fas fa-image"></i></button>
                    </div>
                    <button class="btn-primary btn-submit-comment">Reply</button>
                </div>
            </div>
        `;
        containerElement.appendChild(formDiv);

        const inputElement = formDiv.querySelector('.add-comment-input');
        inputElement.value = `@${parentCommentData.userName} `; // Pre-fill mention
        inputElement.dataset.replyingToUserId = parentCommentData.userId; // Store for saving
        inputElement.dataset.replyingToUserName = parentCommentData.userName;
        inputElement.focus();


        const submitBtn = formDiv.querySelector('.btn-submit-comment');
        const attachBtn = formDiv.querySelector('.attach-comment-image-btn');
        const imageUpload = formDiv.querySelector('.comment-image-upload');
        const previewContainer = formDiv.querySelector('.comment-image-preview-container');
        const previewImg = formDiv.querySelector('.comment-image-preview');
        const removeBtn = formDiv.querySelector('.remove-comment-image-btn');
        let selectedNestedImageFile = null;

        attachBtn.addEventListener('click', () => imageUpload.click());
        imageUpload.addEventListener('change', handleImageSelect(false, imageUpload, previewImg, previewContainer, file => selectedNestedImageFile = file));
        removeBtn.addEventListener('click', () => removeImage(previewImg, previewContainer, imageUpload, file => selectedNestedImageFile = null));

        submitBtn.addEventListener('click', async () => {
            const text = inputElement.value.trim();
            if (!text && !selectedNestedImageFile) return;
            submitBtn.disabled = true; submitBtn.textContent = 'Replying...';
            try {
                await handleAddComment(threadId, parentCommentId, text, selectedNestedImageFile, inputElement, () => selectedNestedImageFile = null, imageUpload, previewContainer, previewImg);
                // Form will be removed by handleAddComment on success if it's a nested form
            } finally {
                 submitBtn.disabled = false; submitBtn.textContent = 'Reply';
            }
        });
    }

    function fetchAndRenderNestedReplies(threadId, parentCommentId, nestedListElement) {
        const nestedRepliesRef = database.ref(`threads/${threadId}/comments/${parentCommentId}/replies`).orderByChild('timestamp');
        nestedListElement.innerHTML = `<li><div class="spinner-small"></div></li>`;

        nestedRepliesRef.on('value', snapshot => {
            nestedListElement.innerHTML = ''; // Clear before re-rendering
            if (snapshot.exists()) {
                snapshot.forEach(childSnapshot => {
                    renderCommentItem(childSnapshot.key, childSnapshot.val(), nestedListElement, threadId, true); // true for isNested
                });
            } else {
                // If no nested replies, keep the list empty or add a placeholder like "No replies yet"
                // For now, if opened and empty, it implies no replies.
            }
             // Update the direct reply count on the parent comment item UI
            const parentCommentLi = nestedListElement.closest('li.comment-item');
            if(parentCommentLi) {
                const nestedReplyCountSpan = parentCommentLi.querySelector('.nested-reply-count');
                if(nestedReplyCountSpan) nestedReplyCountSpan.textContent = snapshot.numChildren();
            }
        });
    }


    async function handleDeleteComment(threadId, commentId, commentImageURL, isNested, parentCommentIdForNested) {
        if (!currentUser) { alert("Authentication error."); return; }
        const basePath = `threads/${threadId}/comments`;
        const commentPath = isNested ? `${basePath}/${parentCommentIdForNested}/replies/${commentId}` : `${basePath}/${commentId}`;
        const commentRef = database.ref(commentPath);

        const commentSnapshot = await commentRef.once('value');
        if (!commentSnapshot.exists() || commentSnapshot.val().userId !== currentUser.uid) {
            alert("You can only delete your own replies."); return;
        }

        if (confirm("Are you sure you want to delete this reply?")) {
            try {
                if (commentImageURL) {
                    await storage.refFromURL(commentImageURL).delete().catch(e => console.warn("Comment image delete failed", e));
                }
                // If this comment itself has nested replies, delete them too (only for top-level comments in this simplified model)
                if (!isNested && commentSnapshot.val().replyCount && commentSnapshot.val().replyCount > 0) {
                     const nestedRepliesRef = database.ref(`${basePath}/${commentId}/replies`);
                     const nestedSnaps = await nestedRepliesRef.once('value');
                     if(nestedSnaps.exists()){
                         nestedSnaps.forEach(snap => {
                             if(snap.val().imageURL) storage.refFromURL(snap.val().imageURL).delete().catch(e => console.warn("Nested image delete failed during parent deletion", e));
                         });
                         await nestedRepliesRef.remove();
                     }
                }

                await commentRef.remove();
                // Decrement appropriate counter
                if (isNested) {
                    await database.ref(`${basePath}/${parentCommentIdForNested}/replyCount`).set(firebase.database.ServerValue.increment(-1));
                } else {
                    await database.ref(`threads/${threadId}/replyCount`).set(firebase.database.ServerValue.increment(-1));
                }
            } catch (error) {
                console.error("Error deleting comment:", error);
                alert("Failed to delete reply: " + error.message);
            }
        }
    }

    // --- Image Full View Modal (Keep existing) ---
    if (closeImageFullViewModalBtn) {
        closeImageFullViewModalBtn.addEventListener('click', () => imageFullViewModal.classList.remove('show'));
    }
    function openImageFullView(imageSrc, captionText = '') {
        if (fullViewImage && imageFullViewModal && imageSrc) {
            fullViewImage.src = imageSrc;
            const captionElement = document.getElementById('image-modal-caption');
            if (captionElement) captionElement.textContent = captionText || '';
            imageFullViewModal.classList.add('show');
        }
    }
    // --- Load User Suggestions (Keep existing) ---
    async function loadUserSuggestions() {
        if (!crewSuggestionsList || !currentUser) return;
        crewSuggestionsList.innerHTML = '<li><div class="spinner-small"></div></li>';

        try {
            const usersRef = database.ref('users');
            // Consider adding .orderByKey() and .limitToFirst(X) for pagination if many users
            const snapshot = await usersRef.limitToFirst(10).once('value');
            if (snapshot.exists()) {
                const users = [];
                snapshot.forEach(childSnapshot => {
                    const userData = childSnapshot.val();
                    if (childSnapshot.key !== currentUser.uid && userData.name) {
                        users.push({ uid: childSnapshot.key, ...userData });
                    }
                });

                const shuffledUsers = users.sort(() => 0.5 - Math.random());
                const suggestions = shuffledUsers.slice(0, Math.min(3, shuffledUsers.length));

                crewSuggestionsList.innerHTML = '';
                if (suggestions.length > 0) {
                    suggestions.forEach(user => {
                        const li = document.createElement('li');
                        const profileLink = `profiles.html?uid=${user.uid}`; // Make sure profiles.html exists
                        li.innerHTML = `
                            <a href="${profileLink}" class="suggestion-user-link">
                                <img src="${user.profilePictureURL || 'placeholder-avatar.png'}" alt="${user.name}" class="suggestion-avatar">
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

    // --- Load Trending Signals (Keep existing) ---
    async function loadTrendingSignals() {
        if (!trendingSignalsList) return;
        trendingSignalsList.innerHTML = '<li><div class="spinner-small"></div></li>';

        try {
            const threadsRef = database.ref('threads').orderByChild('timestamp').limitToLast(50);
            const snapshot = await threadsRef.once('value');

            if (snapshot.exists()) {
                const threads = [];
                snapshot.forEach(childSnapshot => {
                    threads.push({ id: childSnapshot.key, ...childSnapshot.val() });
                });

                const scoredThreads = threads.map(thread => {
                    const likes = thread.likes ? Object.keys(thread.likes).length : 0;
                    const replies = thread.replyCount || 0; // This is top-level reply count
                    // For a more accurate trending, you might sum all nested replies too
                    const recencyBoost = (thread.timestamp / Date.now()) * 0.05 + (Date.now() - thread.timestamp < 24*60*60*1000 ? 5 : 0) ; // Small boost for recency, bigger for last 24h
                    return { ...thread, score: (likes * 1.2) + (replies * 2.0) + recencyBoost };
                }).sort((a, b) => b.score - a.score);
                
                const topThreads = scoredThreads.slice(0, 5);

                trendingSignalsList.innerHTML = '';
                if (topThreads.length > 0) {
                    topThreads.forEach(thread => {
                        const li = document.createElement('li');
                        const threadContentPreview = thread.content ? (thread.content.substring(0, 50) + (thread.content.length > 50 ? '...' : ''))
                                                     : (thread.poll ? "Poll: " + thread.poll.options[0].text.substring(0,40) + "..." : (thread.imageURL ? "Image Post" : "Transmission"));
                        li.innerHTML = `
                            <a href="#thread-${thread.id}" class="trending-item-link" data-thread-id="${thread.id}">
                                <p>${threadContentPreview}</p>
                                <small>${(thread.likes ? Object.keys(thread.likes).length : 0)} Likes · ${thread.replyCount || 0} Replies</small>
                            </a>`;
                        // Add event listener to scroll to thread or open detail view later
                        trendingSignalsList.appendChild(li);
                    });
                } else {
                    trendingSignalsList.innerHTML = '<li>No strong signals detected.</li>';
                }
            } else {
                trendingSignalsList.innerHTML = '<li>No signals available.</li>';
            }
        } catch (error) {
            console.error("Error loading trending signals:", error);
            trendingSignalsList.innerHTML = '<li>Error loading signals.</li>';
        }
    }

    // --- Logout (Keep existing) ---
    if (logoutBtn) logoutBtn.addEventListener('click', () => {
        auth.signOut().catch(error => console.error("Sign out error:", error));
    });
});