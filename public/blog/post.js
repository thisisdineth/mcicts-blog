// post.js
document.addEventListener('DOMContentLoaded', function () {
    // Firebase services are initialized in firebase-config.js and should be globally available
    // const auth = firebase.auth();
    // const database = firebase.database();

    // --- DOM Element Selection ---
    const loadingOverlay = document.getElementById('loading-overlay');
    const postDetailContainer = document.getElementById('post-detail-container');
    const postNotFoundDiv = document.getElementById('post-not-found');

    // Navbar elements
    const userProfilePictureNav = document.getElementById('user-profile-picture-nav');
    const profileDropdown = document.getElementById('profile-dropdown');
    const userNameNav = document.getElementById('user-name-nav');
    const signOutBtnNav = document.getElementById('sign-out-btn-nav');
    const navCreatePostBtn = document.getElementById('nav-create-post-btn');
    const defaultProfilePic = '../images/default-avatar.png'; // Ensure this path is correct

    // Post detail elements
    const postTitleMain = document.getElementById('post-title-main');
    const postCategoryMain = document.getElementById('post-category-main');
    const postDateMain = document.getElementById('post-date-main');
    const postReadTimeMain = document.getElementById('post-read-time-main');
    const postAuthorAvatarMain = document.getElementById('post-author-avatar-main');
    const postAuthorNameMain = document.getElementById('post-author-name-main');
    const featuredImageContainer = document.getElementById('featured-image-container');
    const postContentMain = document.getElementById('post-content-main');

    // Author Bio elements
    const authorBioAvatar = document.getElementById('author-bio-avatar');
    const authorBioName = document.getElementById('author-bio-name');
    const authorBioText = document.getElementById('author-bio-text');

    // Post Actions
    const editPostBtn = document.getElementById('edit-post-btn');
    const deletePostBtn = document.getElementById('delete-post-btn');

    // Comments elements
    const commentsList = document.getElementById('comments-list');
    const commentCountSpan = document.getElementById('comment-count');
    const addCommentFormContainer = document.getElementById('add-comment-form-container');
    const addCommentForm = document.getElementById('add-comment-form');
    const commentTextInput = document.getElementById('comment-text');
    const submitCommentBtn = document.getElementById('submit-comment-btn');
    const commentLoginPrompt = document.getElementById('comment-login-prompt');

    // --- Global State ---
    let currentUser = null;
    let currentPostId = null;
    let currentPostData = null;

    // --- Initialization ---
    const urlParams = new URLSearchParams(window.location.search);
    currentPostId = urlParams.get('id');

    // Firebase Auth State Change Listener
    auth.onAuthStateChanged(user => {
        currentUser = user;
        updateNavbarUserInterface(user); // Update navbar based on login state
        
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
            fetchPostDetails(currentPostId);
            fetchComments(currentPostId);
        } else {
            showErrorState("No transmission ID specified in the URL.");
        }
        setupNavbarEventListeners(); // Setup listeners after auth state is known
    });

    // --- Navbar Functions ---
    function updateNavbarUserInterface(user) {
        if (user && userProfilePictureNav && userNameNav) {
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
                console.error("Error fetching user profile for navbar:", error);
                if (userProfilePictureNav) userProfilePictureNav.src = defaultProfilePic; // Check if element exists
                if (userNameNav) userNameNav.innerHTML = `<i class="fas fa-user-astronaut"></i> ${user ? (user.displayName || 'User') : 'Guest'}`; // Check
            });
        } else if (userProfilePictureNav && userNameNav) { // No user logged in
            userProfilePictureNav.src = defaultProfilePic;
            userNameNav.innerHTML = `<i class="fas fa-user-astronaut"></i> Guest`;
        }
    }

    function setupNavbarEventListeners() {
        if (userProfilePictureNav && profileDropdown) {
            userProfilePictureNav.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent window click from closing it immediately
                profileDropdown.classList.toggle('show');
            });
        }
        if (signOutBtnNav) {
            signOutBtnNav.addEventListener('click', () => {
                auth.signOut().then(() => {
                    // UI updates are handled by onAuthStateChanged
                }).catch(error => console.error('Sign out error:', error));
            });
        }
        // Close dropdown if clicked outside
        window.addEventListener('click', function(e) {
            if (profileDropdown && profileDropdown.classList.contains('show') &&
                userProfilePictureNav && !userProfilePictureNav.contains(e.target) && 
                !profileDropdown.contains(e.target)) {
                profileDropdown.classList.remove('show');
            }
        });
    }

    // --- Post Fetching and Display ---
    async function fetchPostDetails(postId) {
        if (loadingOverlay) loadingOverlay.style.display = 'flex';

        try {
            const postRef = database.ref('posts/' + postId);
            const snapshot = await postRef.once('value');

            if (snapshot.exists()) {
                currentPostData = snapshot.val();
                document.title = (currentPostData.title || "Post") + " | Cosmic Chronicles";

                if (postTitleMain) postTitleMain.textContent = currentPostData.title;
                if (postCategoryMain) postCategoryMain.textContent = currentPostData.category || 'Uncategorized';
                if (postDateMain) postDateMain.textContent = new Date(currentPostData.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                
                if (postReadTimeMain && currentPostData.content) {
                    const wordsPerMinute = 200;
                    const noHtmlContent = currentPostData.content.replace(/<[^>]+>/g, '');
                    const wordCount = noHtmlContent.split(/\s+/).length;
                    const readTime = Math.ceil(wordCount / wordsPerMinute);
                    postReadTimeMain.textContent = `~ ${readTime} min read`;
                }

                if (postContentMain) postContentMain.innerHTML = currentPostData.content;

                if (featuredImageContainer) {
                    if (currentPostData.featuredImageUrl) {
                        featuredImageContainer.style.backgroundImage = `url(${currentPostData.featuredImageUrl})`;
                    } else {
                        featuredImageContainer.style.backgroundImage = `url('../images/default-space-banner.jpg')`; // Ensure this default banner exists
                        featuredImageContainer.style.backgroundColor = `var(--bg-dark-space)`;
                    }
                }

                if (currentPostData.authorId) {
                    fetchAuthorDetails(currentPostData.authorId);
                } else {
                    if(postAuthorNameMain) postAuthorNameMain.textContent = 'Unknown Author';
                    if(postAuthorAvatarMain) postAuthorAvatarMain.src = defaultProfilePic;
                     if (authorBioName) authorBioName.textContent = 'Unknown Author';
                    if (authorBioAvatar) authorBioAvatar.src = defaultProfilePic;
                    if (authorBioText) authorBioText.textContent = 'Author information is unavailable.';
                }

                // Setup Edit/Delete buttons
                if (currentUser && currentUser.uid === currentPostData.authorId) {
                    if (editPostBtn) {
                        editPostBtn.style.display = 'inline-flex';
                        editPostBtn.onclick = () => {
                            window.location.href = `../create-post/create-post.html?edit=true&id=${postId}`;
                        };
                    }
                    if (deletePostBtn) {
                        deletePostBtn.style.display = 'inline-flex';
                        deletePostBtn.onclick = () => confirmDeletePost(postId, currentPostData.title);
                    }
                } else {
                    if (editPostBtn) editPostBtn.style.display = 'none';
                    if (deletePostBtn) deletePostBtn.style.display = 'none';
                }

                if (postDetailContainer) postDetailContainer.style.display = 'block'; // 'article' in HTML
                if (postNotFoundDiv) postNotFoundDiv.style.display = 'none';

            } else {
                showErrorState(`Transmission signal lost (ID: ${postId}). This post could not be found.`);
            }
        } catch (error) {
            console.error("Error fetching post details:", error);
            showErrorState("Error receiving transmission. Please try again later.");
        } finally {
            if (loadingOverlay) loadingOverlay.style.display = 'none';
        }
    }

    async function fetchAuthorDetails(authorId) {
        try {
            const authorSnapshot = await database.ref('users/' + authorId).once('value');
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
                if (postAuthorAvatarMain) postAuthorAvatarMain.src = defaultProfilePic;
                if (authorBioAvatar) authorBioAvatar.src = defaultProfilePic;
                if (authorBioName) authorBioName.textContent = 'Author Not Found';

            }
        } catch (error) {
            console.error("Error fetching author details for post:", error);
            if (postAuthorNameMain) postAuthorNameMain.textContent = 'Error Loading Author';
            if (authorBioText) authorBioText.textContent = 'Could not load author information.';
        }
    }

    // --- Post Actions (Edit/Delete) ---
    function confirmDeletePost(postId, postTitle) {
        if (window.confirm(`Are you sure you want to PERMANENTLY delete the transmission titled "${postTitle}"? This action cannot be undone.`)) {
            deletePost(postId);
        }
    }

    async function deletePost(postId) {
        if (!currentUser || !currentPostData || currentUser.uid !== currentPostData.authorId) {
            alert("You are not authorized to delete this post.");
            return;
        }
        if (loadingOverlay) loadingOverlay.style.display = 'flex';
        try {
            // Note: Deleting images from Firebase Storage associated with the post is more complex.
            // It requires storing the full storage paths of all images (featured + TinyMCE uploads)
            // in your database post data, then iterating through them and deleting each.
            // For simplicity, this example only deletes the database entries.
            // Example for featured image if you stored its path:
            // if (currentPostData.featuredImageStoragePath && firebase.storage) { // Check if storage is available
            //    const imageRef = firebase.storage().ref(currentPostData.featuredImageStoragePath);
            //    await imageRef.delete().catch(err => console.warn("Could not delete featured image:", err));
            // }

            await database.ref('posts/' + postId).remove();
            await database.ref('comments/' + postId).remove(); // Also delete all comments for this post

            alert("Transmission successfully deleted from the HoloNet.");
            window.location.href = '../blog/blog.html';
        } catch (error) {
            console.error("Error deleting post:", error);
            alert("Failed to delete transmission: " + error.message);
        } finally {
            if (loadingOverlay) loadingOverlay.style.display = 'none';
        }
    }

    // --- Comments ---
    function fetchComments(postId) {
        const commentsRef = database.ref('comments/' + postId).orderByChild('createdAt');
        commentsRef.on('value', snapshot => {
            if (commentsList) commentsList.innerHTML = ''; // Clear old comments
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
            console.error("Error fetching comments:", error);
            if (commentsList) commentsList.innerHTML = '<p class="no-comments-message error">Could not load comments at this time.</p>';
        });
    }

    function renderComment(comment) {
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
            e.preventDefault();
            if (!currentUser) {
                alert("Please log in to send a signal (comment).");
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
                console.error("Error adding comment:", error);
                alert("Failed to send signal: " + error.message);
            } finally {
                if (submitCommentBtn) toggleButtonLoading(submitCommentBtn, false);
            }
        });
    }

    // --- Helper Functions ---
    function escapeHTML(str) {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function showErrorState(message) {
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
        if (!button) return;
        const textSpan = button.querySelector('.btn-text');
        const loaderSpan = button.querySelector('.btn-loader');
        
        button.disabled = isLoading;
        if (textSpan) textSpan.style.display = isLoading ? 'none' : 'inline-block';
        if (loaderSpan) loaderSpan.style.display = isLoading ? 'inline-block' : 'none';
    }
});