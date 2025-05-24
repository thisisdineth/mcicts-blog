// post.js
document.addEventListener('DOMContentLoaded', function () {
    console.log("[DEBUG] DOMContentLoaded fired. Initializing script.");

    // Firebase services are initialized in firebase-config.js and should be globally available
    if (typeof firebase === 'undefined' || !firebase.app) {
        console.error("[DEBUG] Firebase App is not initialized! Check firebase-config.js and SDK loading order.");
        showErrorState("Critical Firebase App error. Cannot load transmission.");
        return;
    }
    if (typeof auth === 'undefined') console.error("[DEBUG] Firebase Auth is not available from firebase-config.js!");
    if (typeof database === 'undefined') console.error("[DEBUG] Firebase Database is not available from firebase-config.js!");

    const loadingOverlay = document.getElementById('loading-overlay');
    const postDetailContainer = document.getElementById('post-detail-container');
    const postNotFoundDiv = document.getElementById('post-not-found');
    const userProfilePictureNav = document.getElementById('user-profile-picture-nav');
    const profileDropdown = document.getElementById('profile-dropdown');
    const userNameNav = document.getElementById('user-name-nav');
    const signOutBtnNav = document.getElementById('sign-out-btn-nav');
    const navCreatePostBtn = document.getElementById('nav-create-post-btn');
    const defaultProfilePic = '../images/default-avatar.png';
    const postTitleMain = document.getElementById('post-title-main');
    const postCategoryMain = document.getElementById('post-category-main');
    const postDateMain = document.getElementById('post-date-main');
    const postReadTimeMain = document.getElementById('post-read-time-main');
    const postAuthorAvatarMain = document.getElementById('post-author-avatar-main');
    const postAuthorNameMain = document.getElementById('post-author-name-main');
    const featuredImageContainer = document.getElementById('featured-image-container');
    const postContentMain = document.getElementById('post-content-main'); // Key element
    const authorBioAvatar = document.getElementById('author-bio-avatar');
    const authorBioName = document.getElementById('author-bio-name');
    const authorBioText = document.getElementById('author-bio-text');
    const editPostBtn = document.getElementById('edit-post-btn');
    const deletePostBtn = document.getElementById('delete-post-btn');
    const commentsList = document.getElementById('comments-list');
    const commentCountSpan = document.getElementById('comment-count');
    const addCommentFormContainer = document.getElementById('add-comment-form-container');
    const addCommentForm = document.getElementById('add-comment-form');
    const commentTextInput = document.getElementById('comment-text');
    const submitCommentBtn = document.getElementById('submit-comment-btn');
    const commentLoginPrompt = document.getElementById('comment-login-prompt');

    let currentUser = null;
    let currentPostId = null;
    let currentPostData = null;

    const urlParams = new URLSearchParams(window.location.search);
    currentPostId = urlParams.get('id');
    console.log("[DEBUG] Extracted Post ID from URL:", currentPostId);

    if (typeof auth !== 'undefined') {
        auth.onAuthStateChanged(user => {
            console.log("[DEBUG] auth.onAuthStateChanged fired. User:", user ? user.uid : "No user");
            currentUser = user;
            updateNavbarUserInterface(user);
            
            if (user) {
                if (addCommentFormContainer) addCommentFormContainer.style.display = 'block';
                if (commentLoginPrompt) commentLoginPrompt.style.display = 'none';
                if (navCreatePostBtn) navCreatePostBtn.style.display = 'inline-flex';
            } else {
                if (addCommentFormContainer) addCommentFormContainer.style.display = 'none';
                if (commentLoginPrompt) commentLoginPrompt.style.display = 'block';
                if (navCreatePostBtn) navCreatePostBtn.style.display = 'none';
            }

            if (currentPostId) {
                console.log("[DEBUG] Valid Post ID found, attempting to fetch details and comments.");
                fetchPostDetails(currentPostId);
                fetchComments(currentPostId);
            } else {
                console.log("[DEBUG] No Post ID in URL or Post ID is invalid.");
                showErrorState("No transmission ID specified in the URL.");
            }
            setupNavbarEventListeners();
        });
    } else {
        console.error("[DEBUG] Firebase Auth service not available. Cannot proceed.");
        showErrorState("Authentication service error. Cannot load transmission.");
    }

    function updateNavbarUserInterface(user) {
        if (user && userProfilePictureNav && userNameNav) {
            if (typeof database === 'undefined') {
                 console.error("[DEBUG] Database service not available for updateNavbarUserInterface");
                 return;
            }
            const userRef = database.ref('users/' + user.uid);
            userRef.once('value').then(snapshot => {
                if (snapshot.exists()) {
                    const userData = snapshot.val();
                    userProfilePictureNav.src = userData.profilePictureURL || defaultProfilePic;
                    userNameNav.innerHTML = `<i class="fas fa-user-astronaut"></i> ${userData.name || user.displayName || 'User'}`;
                } else {
                    userProfilePictureNav.src = defaultProfilePic;
                    userNameNav.innerHTML = `<i class="fas fa-user-astronaut"></i> ${user.displayName || 'User'}`;
                }
            }).catch(error => {
                console.error("[DEBUG] Error fetching user profile for navbar:", error);
                if (userProfilePictureNav) userProfilePictureNav.src = defaultProfilePic;
                if (userNameNav) userNameNav.innerHTML = `<i class="fas fa-user-astronaut"></i> ${user ? (user.displayName || 'User') : 'Guest'}`;
            });
        } else if (userProfilePictureNav && userNameNav) {
            userProfilePictureNav.src = defaultProfilePic;
            userNameNav.innerHTML = `<i class="fas fa-user-astronaut"></i> Guest`;
        }
    }

    function setupNavbarEventListeners() {
        if (userProfilePictureNav && profileDropdown) {
            userProfilePictureNav.addEventListener('click', (e) => {
                e.stopPropagation();
                profileDropdown.classList.toggle('show');
            });
        }
        if (signOutBtnNav) {
            signOutBtnNav.addEventListener('click', () => {
                if (typeof auth !== 'undefined') {
                    auth.signOut().catch(error => console.error('[DEBUG] Sign out error:', error));
                }
            });
        }
        window.addEventListener('click', function(e) {
            if (profileDropdown && profileDropdown.classList.contains('show') &&
                userProfilePictureNav && !userProfilePictureNav.contains(e.target) && 
                !profileDropdown.contains(e.target)) {
                profileDropdown.classList.remove('show');
            }
        });
    }

    async function fetchPostDetails(postId) {
        console.log("[DEBUG] fetchPostDetails called for postId:", postId);
        if (typeof database === 'undefined') {
            console.error("[DEBUG] Database service not available for fetchPostDetails");
            showErrorState("Database service error. Cannot load transmission.");
            return;
        }
        if (loadingOverlay) loadingOverlay.style.display = 'flex';

        try {
            const postRef = database.ref('posts/' + postId);
            console.log("[DEBUG] Attempting to fetch from Firebase path:", postRef.toString());
            const snapshot = await postRef.once('value');
            console.log("[DEBUG] Firebase snapshot received. Exists?", snapshot.exists());

            if (snapshot.exists()) {
                currentPostData = snapshot.val();
                // ✨ ADDED DETAILED LOGS FOR POST DATA AND CONTENT ✨
                console.log("[DEBUG] Post data fetched (raw):", JSON.parse(JSON.stringify(currentPostData)));
                console.log("[DEBUG] Post content field value from Firebase:", currentPostData.content);

                document.title = (currentPostData.title || "Post") + " | Cosmic Chronicles";

                if (postTitleMain) postTitleMain.textContent = currentPostData.title;
                if (postCategoryMain) postCategoryMain.textContent = currentPostData.category || 'Uncategorized';
                if (postDateMain) postDateMain.textContent = new Date(currentPostData.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                
                if (postReadTimeMain && currentPostData.content) {
                    const wordsPerMinute = 200;
                    const noHtmlContent = String(currentPostData.content || '').replace(/<[^>]+>/g, '');
                    const wordCount = noHtmlContent.split(/\s+/).filter(Boolean).length;
                    const readTime = Math.ceil(wordCount / wordsPerMinute);
                    postReadTimeMain.textContent = `~ ${readTime} min read`;
                } else if (postReadTimeMain) {
                    postReadTimeMain.textContent = `~ 0 min read`;
                }

                // ✨ ADDED LOG FOR postContentMain ELEMENT AND CONTENT INJECTION ✨
                console.log("[DEBUG] postContentMain DOM element:", postContentMain);
                if (postContentMain) {
                    console.log("[DEBUG] Attempting to set innerHTML for postContentMain with content length:", (currentPostData.content || "").length);
                    postContentMain.innerHTML = currentPostData.content || "<p><em>Content is unavailable or empty for this transmission.</em></p>";
                } else {
                    console.warn("[DEBUG] CRITICAL: postContentMain element (id='post-content-main') NOT FOUND in the DOM.");
                }

                if (featuredImageContainer) {
                    if (currentPostData.featuredImageUrl) {
                        featuredImageContainer.style.backgroundImage = `url(${currentPostData.featuredImageUrl})`;
                    } else {
                        featuredImageContainer.style.backgroundImage = `url('../images/default-space-banner.jpg')`;
                        featuredImageContainer.style.backgroundColor = `var(--bg-dark-space)`;
                    }
                }

                if (currentPostData.authorId) {
                    fetchAuthorDetails(currentPostData.authorId);
                } else {
                    console.warn("[DEBUG] Post data missing authorId.");
                    if(postAuthorNameMain) postAuthorNameMain.textContent = 'Unknown Author';
                    if(postAuthorAvatarMain) postAuthorAvatarMain.src = defaultProfilePic;
                    if (authorBioName) authorBioName.textContent = 'Unknown Author';
                    if (authorBioAvatar) authorBioAvatar.src = defaultProfilePic;
                    if (authorBioText) authorBioText.textContent = 'Author information is unavailable.';
                }

                if (currentUser && currentPostData && currentUser.uid === currentPostData.authorId) {
                    if (editPostBtn) { /* ... edit button logic ... */ editPostBtn.style.display = 'inline-flex'; editPostBtn.onclick = () => { window.location.href = `../create-post/create-post.html?edit=true&id=${postId}`; }; }
                    if (deletePostBtn) { /* ... delete button logic ... */ deletePostBtn.style.display = 'inline-flex'; deletePostBtn.onclick = () => confirmDeletePost(postId, currentPostData.title); }
                } else {
                    if (editPostBtn) editPostBtn.style.display = 'none';
                    if (deletePostBtn) deletePostBtn.style.display = 'none';
                }

                if (postDetailContainer) postDetailContainer.style.display = 'block';
                if (postNotFoundDiv) postNotFoundDiv.style.display = 'none';
                console.log("[DEBUG] Post details processed and should be displayed.");

            } else {
                console.log(`[DEBUG] Snapshot does not exist for postId: ${postId}. Path: ${postRef.toString()}`);
                showErrorState(`Transmission signal lost (ID: ${postId}). This post could not be found or you may not have permission to view it.`);
            }
        } catch (error) {
            console.error("[DEBUG] Error during fetchPostDetails execution:", error);
            showErrorState("Error receiving transmission. Please check console for details.");
        } finally {
            if (loadingOverlay) loadingOverlay.style.display = 'none';
        }
    }

    async function fetchAuthorDetails(authorId) {
        // ... (same as your provided JS, with added console logs if needed for this part) ...
        console.log("[DEBUG] fetchAuthorDetails called for authorId:", authorId);
        if (typeof database === 'undefined') {
            console.error("[DEBUG] Database service not available for fetchAuthorDetails");
            return;
        }
        try {
            const authorRef = database.ref('users/' + authorId);
            const authorSnapshot = await authorRef.once('value');
            if (authorSnapshot.exists()) {
                const authorData = authorSnapshot.val();
                if (postAuthorNameMain) postAuthorNameMain.textContent = authorData.name || 'Unknown Explorer';
                if (postAuthorAvatarMain) postAuthorAvatarMain.src = authorData.profilePictureURL || defaultProfilePic;
                if (authorBioName) authorBioName.textContent = authorData.name || 'Unknown Explorer';
                if (authorBioAvatar) authorBioAvatar.src = authorData.profilePictureURL || defaultProfilePic;
                if (authorBioText) authorBioText.textContent = authorData.bio || 'A dedicated explorer of the cosmos, always seeking the next great discovery.';
            } else {
                if (postAuthorNameMain) postAuthorNameMain.textContent = 'Author Not Found';
                if (authorBioText) authorBioText.textContent = 'Author information is unavailable.';
            }
        } catch (error) {
            console.error("[DEBUG] Error fetching author details:", error);
            if (postAuthorNameMain) postAuthorNameMain.textContent = 'Error Loading Author';
            if (authorBioText) authorBioText.textContent = 'Could not load author information.';
        }
    }

    function confirmDeletePost(postId, postTitle) {
        if (window.confirm(`Are you sure you want to PERMANENTLY delete the transmission titled "${postTitle}"? This action cannot be undone.`)) {
            deletePost(postId);
        }
    }

    async function deletePost(postId) {
        // ... (same as your provided JS) ...
        if (!currentUser || !currentPostData || currentUser.uid !== currentPostData.authorId) {
            alert("You are not authorized to delete this post.");
            return;
        }
        if (typeof database === 'undefined') {
            console.error("[DEBUG] Database service not available for deletePost");
            alert("Database service error. Cannot delete post.");
            return;
        }
        if (loadingOverlay) loadingOverlay.style.display = 'flex';
        try {
            await database.ref('posts/' + postId).remove();
            await database.ref('comments/' + postId).remove();
            alert("Transmission successfully deleted from the HoloNet.");
            window.location.href = '../blog/blog.html';
        } catch (error) {
            console.error("[DEBUG] Error deleting post:", error);
            alert("Failed to delete transmission: " + error.message);
        } finally {
            if (loadingOverlay) loadingOverlay.style.display = 'none';
        }
    }

    function fetchComments(postId) {
        // ... (same as your provided JS, with added console logs if needed for this part) ...
        console.log("[DEBUG] fetchComments called for postId:", postId);
        if (typeof database === 'undefined') {
            console.error("[DEBUG] Database service not available for fetchComments");
            if (commentsList) commentsList.innerHTML = '<p class="no-comments-message error">Database service error. Cannot load comments.</p>';
            return;
        }
        const commentsRef = database.ref('comments/' + postId).orderByChild('createdAt');
        commentsRef.on('value', snapshot => {
            if (commentsList) commentsList.innerHTML = '';
            let count = 0;
            if (snapshot.exists()) {
                snapshot.forEach(childSnapshot => {
                    const comment = childSnapshot.val();
                    if (comment) { 
                        renderComment(comment);
                        count++;
                    }
                });
            }
            if (commentCountSpan) commentCountSpan.textContent = count;
            if (count === 0 && commentsList) {
                commentsList.innerHTML = '<p class="no-comments-message">No resonance signals yet. Be the first to discuss!</p>';
            }
        }, error => {
            console.error("[DEBUG] Error fetching comments:", error);
            if (commentsList) commentsList.innerHTML = '<p class="no-comments-message error">Could not load comments at this time.</p>';
        });
    }

    function renderComment(comment) {
        // ... (same as your provided JS) ...
        if (!commentsList) return;
        const item = document.createElement('div');
        item.classList.add('comment-item');
        const commentDate = comment.createdAt ? 
            new Date(comment.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) :
            'Timestamp unavailable';
        item.innerHTML = `
            <img src="${comment.authorProfilePic || defaultProfilePic}" alt="${comment.authorName || 'User'}" class="comment-avatar">
            <div class="comment-content">
                <p class="comment-author">${comment.authorName || 'Anonymous Cadet'} 
                    <span class="comment-date">${commentDate}</span>
                </p>
                <p class="comment-text">${escapeHTML(comment.text || '')}</p>
            </div>
        `;
        commentsList.appendChild(item);
    }

    if (addCommentForm) {
        addCommentForm.addEventListener('submit', async (e) => {
            // ... (same as your provided JS) ...
             e.preventDefault();
            if (!currentUser) {
                alert("Please log in to send a signal (comment).");
                return;
            }
            if (typeof database === 'undefined') {
                 console.error("[DEBUG] Database service not available for addCommentForm submit");
                 alert("Database service error. Cannot submit comment.");
                 return;
            }
            if (!commentTextInput) return;
            const commentText = commentTextInput.value.trim();
            if (!commentText) {
                alert("Signal (comment) cannot be empty.");
                return;
            }
            if (submitCommentBtn) toggleButtonLoading(submitCommentBtn, true);
            try {
                const userProfileSnapshot = await database.ref('users/' + currentUser.uid).once('value');
                const userProfile = userProfileSnapshot.exists() ? userProfileSnapshot.val() : {};
                const newComment = {
                    text: commentText,
                    authorId: currentUser.uid,
                    authorName: userProfile.name || currentUser.displayName || 'Anonymous Cadet',
                    authorProfilePic: userProfile.profilePictureURL || currentUser.photoURL || defaultProfilePic,
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                };
                await database.ref('comments/' + currentPostId).push(newComment);
                commentTextInput.value = ''; 
            } catch (error) {
                console.error("[DEBUG] Error adding comment:", error);
                alert("Failed to send signal: " + error.message);
            } finally {
                if (submitCommentBtn) toggleButtonLoading(submitCommentBtn, false);
            }
        });
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function showErrorState(message) {
        console.error("[DEBUG] showErrorState called with message:", message); // Changed to console.error
        if (loadingOverlay) loadingOverlay.style.display = 'none';
        if (postDetailContainer) postDetailContainer.style.display = 'none';
        if (postNotFoundDiv) {
            postNotFoundDiv.style.display = 'block';
            const pTag = postNotFoundDiv.querySelector('p');
            if (pTag) {
                pTag.innerHTML = `${escapeHTML(message)} Try returning to the <a href="../blog/blog.html">HoloNet Archives</a>.`;
            } else {
                postNotFoundDiv.innerHTML = `<h1><i class="fas fa-ghost"></i> Error</h1><p>${escapeHTML(message)} Try returning to the <a href="../blog/blog.html">HoloNet Archives</a>.</p>`;
            }
        }
        document.title = "Transmission Lost | Cosmic Chronicles";
    }

    function toggleButtonLoading(button, isLoading) {
        // ... (same as your provided JS) ...
        if (!button) return;
        const textSpan = button.querySelector('.btn-text');
        const loaderSpan = button.querySelector('.btn-loader');
        button.disabled = isLoading;
        if (textSpan) textSpan.style.display = isLoading ? 'none' : 'inline-block';
        if (loaderSpan) loaderSpan.style.display = isLoading ? 'inline-block' : 'none';
    }
});