document.addEventListener('DOMContentLoaded', function () {
    const auth = firebase.auth();
    const database = firebase.database();

    // --- DOM Elements ---
    const pageLoader = document.getElementById('page-loader');
    const postMainContent = document.getElementById('post-main-content');

    const postHeroSection = document.getElementById('post-hero');
    const heroImageContainer = postHeroSection.querySelector('.hero-image-container');
    const postTitleDisplayHero = document.getElementById('post-title-display-hero');

    const postAuthorImg = document.getElementById('post-author-img');
    const postAuthorName = document.getElementById('post-author-name');
    const postDate = document.getElementById('post-date');
    const postCategoryDisplay = document.getElementById('post-category-display');
    const postContentDisplay = document.getElementById('post-content-display');
    const errorMessageArea = document.getElementById('error-message-area');

    const likeButton = document.getElementById('like-button');
    const likeCountSpan = document.getElementById('like-count');
    const shareButton = document.getElementById('share-button');
    const shareTooltip = document.getElementById('share-tooltip');

    const commentLoginPrompt = document.getElementById('comment-login-prompt');
    // const commentFormPlaceholder = document.getElementById('comment-form-placeholder'); // Placeholder, can be enhanced later

    const userProfilePictureNav = document.getElementById('user-profile-picture-nav');
    const profileDropdown = document.getElementById('profile-dropdown');
    const userNameNav = document.getElementById('user-name-nav');
    const signOutBtnNav = document.getElementById('sign-out-btn-nav');
    const signInBtnNav = document.getElementById('sign-in-btn-nav');
    const profileLinkNav = document.getElementById('profile-link-nav');
    const dashboardLinkNav = document.getElementById('dashboard-link-nav');
    const defaultProfilePic = '../images/default-avatar.png';

    // --- Global State ---
    let currentUser = null;
    let currentPostId = null;
    let currentPostData = null; // Stores the latest full post data
    let mainPostFirebaseListener = null; // To hold the reference to the main .on() listener
    let isLoaderHidden = false; // Tracks if the main page loader has been hidden

    // --- Initializations ---
    if (pageLoader) pageLoader.style.display = 'flex'; // Ensure loader is visible initially
    if (postMainContent) postMainContent.style.display = 'none';

    currentPostId = getPostIdFromUrl();

    if (currentPostId) {
        initializePostView(currentPostId);
    } else {
        displayError("No post ID found in URL. Cannot load post.");
        hidePageLoader(); // Hide loader if no ID, as nothing will load
    }

    auth.onAuthStateChanged(user => {
        const previousUserId = currentUser ? currentUser.uid : null;
        
        if (user && user.emailVerified) {
            currentUser = user;
            loadUserProfileForNavbar(user);
            updateNavbarUI(true);
        } else {
            currentUser = null; // Handles guests or unverified users
            updateNavbarUI(false);
        }

        // Refresh user-specific post elements if user changed or if post data is already loaded
        if ((currentUser && currentUser.uid !== previousUserId) || (!currentUser && previousUserId) || currentPostData) {
             updateUserSpecificPostElements();
        }
    });

    // --- Core Functions ---
    function getPostIdFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('id');
    }

    function initializePostView(postId) {
        const postRef = database.ref('posts/' + postId);

        // If a listener already exists (e.g. from a hot-reload dev environment), detach it first.
        // This ensures only one listener is active for the main post data.
        if (mainPostFirebaseListener) {
            postRef.off('value', mainPostFirebaseListener);
        }

        mainPostFirebaseListener = postRef.on('value', snapshot => {
            if (snapshot.exists()) {
                currentPostData = snapshot.val();
                renderPostBaseUI(currentPostData, postId); // Render parts not dependent on logged-in user
                updateUserSpecificPostElements();        // Update parts dependent on user (like button, comments prompt)
                
                if (postMainContent) postMainContent.style.display = 'block';
                if (errorMessageArea) errorMessageArea.style.display = 'none'; // Hide error if data loads
            } else {
                currentPostData = null; // Post deleted or doesn't exist
                displayError(`Post not found. It might have been lost in a cosmic anomaly.`);
                if (postMainContent) postMainContent.style.display = 'none';
            }
            hidePageLoader(); // Hide loader after first successful data fetch or "not found"
        }, error => {
            console.error("Error fetching post data:", error);
            displayError(`Failed to beam down post data. Error: ${error.message}`);
            if (postMainContent) postMainContent.style.display = 'none';
            hidePageLoader(); // Hide loader on error too
        });
    }

    // Renders the main structure and content of the post (not user-specific things like "is liked")
    function renderPostBaseUI(data, postId) {
        document.title = `${data.title || 'Post'} | Cosmic Chronicles`;
        if (postTitleDisplayHero) postTitleDisplayHero.textContent = data.title || 'Untitled Post';

        if (heroImageContainer) {
            if (data.featuredImageUrl) {
                heroImageContainer.style.backgroundImage = `url('${data.featuredImageUrl}')`;
            } else {
                heroImageContainer.style.backgroundImage = `url('../images/default-post-hero.jpg')`; // Fallback
                heroImageContainer.style.backgroundColor = '#1A0F3B';
            }
        }

        if (postAuthorImg) postAuthorImg.src = data.authorProfilePic || defaultProfilePic;
        if (postAuthorName) postAuthorName.textContent = `By ${data.authorName || 'Anonymous Explorer'}`;
        
        if (postDate) {
            const dateObj = data.createdAt ? new Date(data.createdAt) : null;
            postDate.textContent = dateObj ? dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Date Unknown';
        }
        
        if (postCategoryDisplay) postCategoryDisplay.textContent = data.category || 'Uncategorized';
        if (postContentDisplay) postContentDisplay.innerHTML = data.content || '<p>This transmission seems to be empty...</p>';
        if (likeCountSpan) likeCountSpan.textContent = data.likeCount || 0;

        // Setup share button listener (it's not user-specific to set up)
        if (shareButton) {
            shareButton.onclick = () => handleSharePost(postId, data.title);
        }
    }

    // Updates UI elements that depend on the current logged-in user
    function updateUserSpecificPostElements() {
        if (!currentPostId) return; // No post to update elements for

        // Like Button State
        if (likeButton) {
            if (currentUser && currentUser.uid) {
                fetchLikeStatus(currentPostId, currentUser.uid);
            } else { // Guest user
                likeButton.classList.remove('liked');
                const icon = likeButton.querySelector('i');
                if (icon) icon.classList.replace('fas', 'far'); // Ensure outlined heart
            }
            // Ensure click listener is set (onclick overwrites, so it's safe to call)
            likeButton.onclick = () => handleLikePost(currentPostId);
        }

        // Comment Section Prompt
        if (commentLoginPrompt) {
            commentLoginPrompt.style.display = currentUser ? 'none' : 'block';
        }
        // If you had a commentFormPlaceholder to enable/disable:
        // if (commentFormPlaceholder) {
        //     commentFormPlaceholder.querySelector('textarea').disabled = !currentUser;
        //     commentFormPlaceholder.querySelector('button').disabled = !currentUser;
        // }
    }

    // --- Navbar and User Profile ---
    function updateNavbarUI(isLoggedIn) {
        if (isLoggedIn) {
            if (signInBtnNav) signInBtnNav.style.display = 'none';
            if (signOutBtnNav) signOutBtnNav.style.display = 'block';
            if (profileLinkNav) profileLinkNav.style.display = 'block';
            if (dashboardLinkNav) dashboardLinkNav.style.display = 'block';
            if (userProfilePictureNav) userProfilePictureNav.style.cursor = 'pointer';
        } else {
            if (userNameNav) userNameNav.innerHTML = `<i class="fas fa-user-astronaut"></i> Guest`;
            if (userProfilePictureNav) {
                 userProfilePictureNav.src = defaultProfilePic;
                 userProfilePictureNav.style.cursor = 'default';
            }
            if (profileDropdown) profileDropdown.classList.remove('show');
            if (signInBtnNav) signInBtnNav.style.display = 'block';
            if (signOutBtnNav) signOutBtnNav.style.display = 'none';
            if (profileLinkNav) profileLinkNav.style.display = 'none';
            if (dashboardLinkNav) dashboardLinkNav.style.display = 'none';
        }
        // Setup listeners for navbar interactions (dropdown toggle, sign out)
        // Pass isLoggedIn to ensure correct behavior for profile pic click
        setupNavbarEventListeners(isLoggedIn);
    }
    
    function toggleDropdown(e) { // Renamed for clarity
        e.stopPropagation();
        if (profileDropdown) profileDropdown.classList.toggle('show');
    }

    function loadUserProfileForNavbar(user) {
        if (!userProfilePictureNav || !userNameNav) return;
        const userRef = database.ref('users/' + user.uid);
        userRef.once('value').then(snapshot => {
            const uData = snapshot.exists() ? snapshot.val() : {};
            userProfilePictureNav.src = uData.profilePictureURL || user.photoURL || defaultProfilePic;
            userNameNav.innerHTML = `<i class="fas fa-user-astronaut"></i> ${uData.name || user.displayName || 'User'}`;
        }).catch(error => {
            console.error("Error fetching user profile for navbar:", error);
            userProfilePictureNav.src = user.photoURL || defaultProfilePic; // Fallback
            userNameNav.innerHTML = `<i class="fas fa-user-astronaut"></i> ${user.displayName || 'User'}`;
        });
    }

    function setupNavbarEventListeners(isLoggedIn) {
        // Remove any existing click listener on profile picture to avoid duplicates
        if (userProfilePictureNav) userProfilePictureNav.removeEventListener('click', toggleDropdown);

        if (isLoggedIn && userProfilePictureNav && profileDropdown) {
            userProfilePictureNav.addEventListener('click', toggleDropdown);
        }
        
        if (signOutBtnNav) { // Sign out button setup is independent of being logged in to attach listener
            signOutBtnNav.onclick = () => { // Use onclick for simple assignment
                auth.signOut().then(() => {
                    // onAuthStateChanged will handle UI updates
                }).catch(error => console.error('Sign out error:', error));
            };
        }

        // Global click to close dropdown - always active
        window.addEventListener('click', function(e) {
            if (profileDropdown && profileDropdown.classList.contains('show') &&
                userProfilePictureNav && !userProfilePictureNav.contains(e.target) &&
                !profileDropdown.contains(e.target)) {
                profileDropdown.classList.remove('show');
            }
        });
    }
    
    // --- Post Actions (Like, Share) ---
    function fetchLikeStatus(postId, userId) {
        if (!likeButton) return; // No button to update
        const likeRef = database.ref(`postLikes/${postId}/${userId}`);
        likeRef.once('value', snapshot => {
            const icon = likeButton.querySelector('i');
            if (snapshot.exists() && snapshot.val() === true) {
                likeButton.classList.add('liked');
                if (icon) icon.classList.replace('far', 'fas');
            } else {
                likeButton.classList.remove('liked');
                if (icon) icon.classList.replace('fas', 'far');
            }
        });
    }

    async function handleLikePost(postId) {
        if (!currentUser) {
            alert("Please log in or verify your email to like posts!");
            return;
        }

        const postLikesUserRef = database.ref(`postLikes/${postId}/${currentUser.uid}`);
        const postLikeCountRef = database.ref(`posts/${postId}/likeCount`);
        const currentlyLiked = likeButton.classList.contains('liked');

        // Optimistically update UI first for responsiveness
        const icon = likeButton.querySelector('i');
        if (currentlyLiked) {
            likeButton.classList.remove('liked');
            if (icon) icon.classList.replace('fas', 'far');
            if (likeCountSpan && parseInt(likeCountSpan.textContent) > 0) {
                 likeCountSpan.textContent = parseInt(likeCountSpan.textContent) - 1;
            }
        } else {
            likeButton.classList.add('liked');
            if (icon) icon.classList.replace('far', 'fas');
             if (likeCountSpan) {
                 likeCountSpan.textContent = (parseInt(likeCountSpan.textContent) || 0) + 1;
            }
        }
        
        try {
            await database.runTransaction(postLikeCountRef, (currentLikeCount) => {
                if (currentLikeCount === null) currentLikeCount = 0;
                return currentlyLiked ? currentLikeCount - 1 : currentLikeCount + 1;
            });
            if (currentlyLiked) { // Was liked, now unliking
                await postLikesUserRef.remove();
            } else { // Was not liked, now liking
                await postLikesUserRef.set(true);
            }
        } catch (error) {
            console.error("Like transaction failed: ", error);
            alert("Failed to update like. Please try again.");
            // Revert optimistic UI update on error
            if (currentlyLiked) { // It was liked, failed to unlike
                likeButton.classList.add('liked');
                if (icon) icon.classList.replace('far', 'fas');
                 if (likeCountSpan) likeCountSpan.textContent = (parseInt(likeCountSpan.textContent) || 0) + 1;


            } else { // It was not liked, failed to like
                likeButton.classList.remove('liked');
                if (icon) icon.classList.replace('fas', 'far');
                if (likeCountSpan && parseInt(likeCountSpan.textContent) > 0) likeCountSpan.textContent = parseInt(likeCountSpan.textContent) - 1;
            }
        }
    }

    function handleSharePost(postId, postTitle) {
        const postUrl = `${window.location.origin}${window.location.pathname}?id=${postId}`;
        if (navigator.share) {
            navigator.share({ title: postTitle || "Check out this post!", url: postUrl })
                .catch((error) => console.log('Error sharing:', error));
        } else {
            navigator.clipboard.writeText(postUrl).then(() => {
                if (shareTooltip) {
                    shareTooltip.classList.add('show');
                    setTimeout(() => { shareTooltip.classList.remove('show'); }, 2000);
                }
            }).catch(err => console.error('Failed to copy link: ', err));
        }
    }

    // --- Utility Functions ---
    function hidePageLoader() {
        if (pageLoader && !isLoaderHidden) { // Check if not already hidden
            pageLoader.style.opacity = '0';
            pageLoader.style.visibility = 'hidden';
            setTimeout(() => {
                // Check opacity again in case it was made visible again quickly
                if (pageLoader.style.opacity === '0') {
                    pageLoader.style.display = 'none';
                    isLoaderHidden = true; // Mark as hidden
                }
            }, 500); // Matches CSS transition
        }
    }

    function displayError(message) {
        if (errorMessageArea) {
            errorMessageArea.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
            errorMessageArea.style.display = 'block';
        }
    }

    // Set current year in footer
    const currentYearSpan = document.getElementById('current-year');
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }
});