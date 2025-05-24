document.addEventListener('DOMContentLoaded', function () {
    // Firebase services are from firebase-config.js
    // const auth = firebase.auth();
    // const database = firebase.database();

    const loadingOverlay = document.getElementById('loading-overlay');
    const postDetailContainer = document.getElementById('post-detail-container');
    const postNotFoundDiv = document.getElementById('post-not-found');

    // Navbar elements
    const userProfilePictureNav = document.getElementById('user-profile-picture-nav');
    const profileDropdown = document.getElementById('profile-dropdown');
    const userNameNav = document.getElementById('user-name-nav');
    const signOutBtnNav = document.getElementById('sign-out-btn-nav');
    const navCreatePostBtn = document.getElementById('nav-create-post-btn');
    const defaultProfilePic = '../images/default-avatar.png';

    // Post elements
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

    let currentUser = null;
    let currentPostId = null;
    let currentPostData = null; // Store fetched post data

    // Get post ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    currentPostId = urlParams.get('id');

    auth.onAuthStateChanged(user => {
        currentUser = user;
        if (user) {
            loadUserProfile(user, true); // Load for navbar and for comment form
            addCommentFormContainer.style.display = 'block';
            commentLoginPrompt.style.display = 'none';
            if(navCreatePostBtn) navCreatePostBtn.style.display = 'inline-flex';
        } else {
            loadUserProfile(null, true); // Clear navbar user info
            addCommentFormContainer.style.display = 'none';
            commentLoginPrompt.style.display = 'block';
            if(navCreatePostBtn) navCreatePostBtn.style.display = 'none';
        }
        // Fetch post data regardless of login state, but actions might depend on it
        if (currentPostId) {
            fetchPostDetails(currentPostId);
            fetchComments(currentPostId);
        } else {
            showErrorState("No transmission ID provided.");
        }
        setupNavbarEventListeners();
    });


    function loadUserProfile(user, isForNavbar = false) {
        if (isForNavbar) {
            if (user) {
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
                    userProfilePictureNav.src = defaultProfilePic;
                    userNameNav.innerHTML = `<i class="fas fa-user-astronaut"></i> ${user ? (user.displayName || 'User') : 'Guest'}`;
                });
            } else { // No user logged in, clear navbar
                userProfilePictureNav.src = defaultProfilePic;
                userNameNav.innerHTML = `<i class="fas fa-user-astronaut"></i> Guest`;
            }
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
                auth.signOut().then(() => {
                    window.location.reload(); // Reload to reflect logged-out state
                }).catch(error => console.error('Sign out error:', error));
            });
        }
        window.addEventListener('click', function(e) {
            if (profileDropdown && profileDropdown.classList.contains('show') && 
                !userProfilePictureNav.contains(e.target) && !profileDropdown.contains(e.target)) {
                profileDropdown.classList.remove('show');
            }
        });
    }


    async function fetchPostDetails(postId) {
        loadingOverlay.style.display = 'flex';
        try {
            const snapshot = await database.ref('posts/' + postId).once('value');
            if (snapshot.exists()) {
                currentPostData = snapshot.val();
                document.title = currentPostData.title + " | Cosmic Chronicles";
                postTitleMain.textContent = currentPostData.title;
                postCategoryMain.textContent = currentPostData.category || 'Uncategorized';
                postDateMain.textContent = new Date(currentPostData.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                
                // Calculate read time (approx)
                const wordsPerMinute = 200; // Average reading speed
                const noHtmlContent = currentPostData.content.replace(/<[^>]+>/g, ''); // Strip HTML tags
                const wordCount = noHtmlContent.split(/\s+/).length;
                const readTime = Math.ceil(wordCount / wordsPerMinute);
                postReadTimeMain.textContent = `~ ${readTime} min read`;

                postContentMain.innerHTML = currentPostData.content; // Content from TinyMCE

                if (currentPostData.featuredImageUrl) {
                    featuredImageContainer.style.backgroundImage = `url(${currentPostData.featuredImageUrl})`;
                } else {
                    featuredImageContainer.style.backgroundImage = `url('../images/default-space-banner.jpg')`; // Provide a default banner
                     featuredImageContainer.style.backgroundColor = `var(--bg-dark-space)`; // Fallback color
                }

                // Fetch author details
                fetchAuthorDetails(currentPostData.authorId);

                // Show/hide Edit/Delete buttons
                if (currentUser && currentUser.uid === currentPostData.authorId) {
                    editPostBtn.style.display = 'inline-flex';
                    deletePostBtn.style.display = 'inline-flex';
                    editPostBtn.onclick = () => {
                        window.location.href = `../create-post/create-post.html?edit=true&id=${postId}`; // Need to implement edit mode in create-post
                    };
                    deletePostBtn.onclick = () => confirmDeletePost(postId, currentPostData.title);
                }


                postDetailContainer.style.display = 'block';
                postNotFoundDiv.style.display = 'none';
            } else {
                showErrorState("Transmission signal lost. This post could not be found.");
            }
        } catch (error) {
            console.error("Error fetching post details:", error);
            showErrorState("Error receiving transmission. Please try again later.");
        } finally {
            loadingOverlay.style.display = 'none';
        }
    }

    async function fetchAuthorDetails(authorId) {
        try {
            const authorSnapshot = await database.ref('users/' + authorId).once('value');
            if (authorSnapshot.exists()) {
                const authorData = authorSnapshot.val();
                postAuthorNameMain.textContent = authorData.name || 'Unknown Explorer';
                postAuthorAvatarMain.src = authorData.profilePictureURL || defaultProfilePic;

                authorBioName.textContent = authorData.name || 'Unknown Explorer';
                authorBioAvatar.src = authorData.profilePictureURL || defaultProfilePic;
                authorBioText.textContent = authorData.bio || 'A dedicated explorer of the cosmos, always seeking the next great discovery.'; // Assuming a 'bio' field in user profile
            }
        } catch (error) {
            console.error("Error fetching author details:", error);
            postAuthorNameMain.textContent = 'Error Loading Author';
            authorBioText.textContent = 'Could not load author information.';
        }
    }

    function confirmDeletePost(postId, postTitle) {
        if (confirm(`Are you sure you want to PERMANENTLY delete the transmission titled "${postTitle}"? This action cannot be undone.`)) {
            deletePost(postId);
        }
    }

    async function deletePost(postId) {
        if (!currentUser || currentUser.uid !== currentPostData.authorId) {
            alert("You are not authorized to delete this post.");
            return;
        }
        loadingOverlay.style.display = 'flex';
        try {
            // Optionally, delete associated images from storage here if you have their paths
            // await storage.refFromURL(currentPostData.featuredImageUrl).delete();
            // For TinyMCE images, you'd need to parse content, get URLs, and delete them - complex.

            await database.ref('posts/' + postId).remove();
            await database.ref('comments/' + postId).remove(); // Delete all comments for this post

            alert("Transmission successfully deleted.");
            window.location.href = '../blog/blog.html';
        } catch (error) {
            console.error("Error deleting post:", error);
            alert("Failed to delete transmission: " + error.message);
            loadingOverlay.style.display = 'none';
        }
    }


    async function fetchComments(postId) {
        const commentsRef = database.ref('comments/' + postId).orderByChild('createdAt');
        commentsRef.on('value', snapshot => {
            commentsList.innerHTML = ''; // Clear old comments
            let count = 0;
            if (snapshot.exists()) {
                snapshot.forEach(childSnapshot => {
                    const comment = childSnapshot.val();
                    renderComment(comment);
                    count++;
                });
            }
            commentCountSpan.textContent = count;
            if (count === 0) {
                commentsList.innerHTML = '<p class="no-comments-message">No resonance signals yet. Be the first to discuss!</p>';
            }
        });
    }

    function renderComment(comment) {
        const item = document.createElement('div');
        item.classList.add('comment-item');
        item.innerHTML = `
            <img src="${comment.authorProfilePic || defaultProfilePic}" alt="${comment.authorName}" class="comment-avatar">
            <div class="comment-content">
                <p class="comment-author">${comment.authorName} 
                    <span class="comment-date">${new Date(comment.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </p>
                <p class="comment-text">${escapeHTML(comment.text)}</p>
            </div>
        `;
        commentsList.appendChild(item);
    }

    addCommentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser) {
            alert("Please log in to comment.");
            return;
        }
        const commentText = commentTextInput.value.trim();
        if (!commentText) {
            alert("Comment cannot be empty.");
            return;
        }

        toggleButtonLoading(submitCommentBtn, true);

        const userProfileSnapshot = await database.ref('users/' + currentUser.uid).once('value');
        const userProfile = userProfileSnapshot.val() || {};

        const newComment = {
            text: commentText,
            authorId: currentUser.uid,
            authorName: userProfile.name || currentUser.displayName || 'Anonymous Cadet',
            authorProfilePic: userProfile.profilePictureURL || currentUser.photoURL || defaultProfilePic,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        };

        try {
            await database.ref('comments/' + currentPostId).push(newComment);
            commentTextInput.value = ''; // Clear textarea
        } catch (error) {
            console.error("Error adding comment:", error);
            alert("Failed to send signal: " + error.message);
        } finally {
            toggleButtonLoading(submitCommentBtn, false);
        }
    });
    
    function escapeHTML(str) {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }


    function showErrorState(message) {
        loadingOverlay.style.display = 'none';
        postDetailContainer.style.display = 'none';
        postNotFoundDiv.style.display = 'block';
        postNotFoundDiv.querySelector('p').innerHTML = message + ` Try returning to the <a href="../blog/blog.html">HoloNet Archives</a>.`;
        document.title = "Transmission Lost | Cosmic Chronicles";
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

});