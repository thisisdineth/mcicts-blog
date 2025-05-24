document.addEventListener('DOMContentLoaded', function () {
    const auth = firebase.auth();
    const database = firebase.database();

    const pageLoader = document.getElementById('page-loader');
    const postMainContent = document.getElementById('post-main-content');

    // Hero elements
    const postHeroSection = document.getElementById('post-hero');
    const heroImageContainer = postHeroSection.querySelector('.hero-image-container');
    const postTitleDisplayHero = document.getElementById('post-title-display-hero');

    // Post meta and content elements
    const postAuthorImg = document.getElementById('post-author-img');
    const postAuthorName = document.getElementById('post-author-name');
    const postDate = document.getElementById('post-date');
    const postCategoryDisplay = document.getElementById('post-category-display');
    const postContentDisplay = document.getElementById('post-content-display');
    const errorMessageArea = document.getElementById('error-message-area');

    // Action elements
    const likeButton = document.getElementById('like-button');
    const likeCountSpan = document.getElementById('like-count');
    const commentButtonLink = document.getElementById('comment-button-link');
    const shareButton = document.getElementById('share-button');
    const shareTooltip = document.getElementById('share-tooltip');

    // Comments section
    const commentLoginPrompt = document.getElementById('comment-login-prompt');
    const commentFormPlaceholder = document.getElementById('comment-form-placeholder');


    // Navbar elements
    const userProfilePictureNav = document.getElementById('user-profile-picture-nav');
    const profileDropdown = document.getElementById('profile-dropdown');
    const userNameNav = document.getElementById('user-name-nav');
    const signOutBtnNav = document.getElementById('sign-out-btn-nav');
    const signInBtnNav = document.getElementById('sign-in-btn-nav');
    const profileLinkNav = document.getElementById('profile-link-nav');
    const dashboardLinkNav = document.getElementById('dashboard-link-nav');
    const defaultProfilePic = '../images/default-avatar.png';

    let currentUser = null;
    let currentPostId = null;
    let currentPostData = null; // To store fetched post data

    // Show loader initially
    if (pageLoader) pageLoader.style.display = 'flex';
    if (postMainContent) postMainContent.style.display = 'none';


    auth.onAuthStateChanged(user => {
        if (user && user.emailVerified) {
            currentUser = user;
            loadUserProfileForNavbar(user);
            if (signInBtnNav) signInBtnNav.style.display = 'none';
            if (signOutBtnNav) signOutBtnNav.style.display = 'block';
            if (profileLinkNav) profileLinkNav.style.display = 'block';
            if (dashboardLinkNav) dashboardLinkNav.style.display = 'block';
            if (commentLoginPrompt) commentLoginPrompt.style.display = 'none';
            if (commentFormPlaceholder) commentFormPlaceholder.style.display = 'block'; // Show (disabled) form
            setupNavbarEventListeners(true);
        } else {
            currentUser = null;
            if (userNameNav) userNameNav.innerHTML = `<i class="fas fa-user-astronaut"></i> Guest`;
            if (userProfilePictureNav) userProfilePictureNav.src = defaultProfilePic;
            if (profileDropdown) profileDropdown.classList.remove('show');
            if (signInBtnNav) signInBtnNav.style.display = 'block';
            if (signOutBtnNav) signOutBtnNav.style.display = 'none';
            if (profileLinkNav) profileLinkNav.style.display = 'none';
            if (dashboardLinkNav) dashboardLinkNav.style.display = 'none';
            if (commentLoginPrompt) commentLoginPrompt.style.display = 'block';
            if (commentFormPlaceholder) commentFormPlaceholder.style.display = 'block'; // Still show placeholder, but emphasize login
            setupNavbarEventListeners(false); // Setup limited listeners or clear existing ones
        }
        // Fetch post data after auth state is known
        currentPostId = getPostIdFromUrl();
        if (currentPostId) {
            fetchPostData(currentPostId);
        } else {
            displayError("No post ID found in URL. Cannot load post.");
            hidePageLoader();
        }
    });
    
    function toggleDropdown(e) {
        e.stopPropagation();
        if (profileDropdown) profileDropdown.classList.toggle('show');
    }

    function loadUserProfileForNavbar(user) {
        if (!userProfilePictureNav || !userNameNav) return;
        userProfilePictureNav.style.cursor = 'pointer';
        const userRef = database.ref('users/' + user.uid);
        userRef.once('value').then(snapshot => {
            if (snapshot.exists()) {
                const userData = snapshot.val();
                userProfilePictureNav.src = userData.profilePictureURL || defaultProfilePic;
                userNameNav.innerHTML = `<i class="fas fa-user-astronaut"></i> ${userData.name || user.displayName || 'User'}`;
            } else {
                userProfilePictureNav.src = user.photoURL || defaultProfilePic;
                userNameNav.innerHTML = `<i class="fas fa-user-astronaut"></i> ${user.displayName || 'User'}`;
            }
        }).catch(error => {
            console.error("Error fetching user profile for navbar:", error);
            userProfilePictureNav.src = user.photoURL || defaultProfilePic;
            userNameNav.innerHTML = `<i class="fas fa-user-astronaut"></i> ${user.displayName || 'User'}`;
        });
    }

    function setupNavbarEventListeners(isLoggedIn) {
        // Remove previous listener to avoid multiple attachments
        if (userProfilePictureNav) userProfilePictureNav.removeEventListener('click', toggleDropdown);

        if (isLoggedIn) {
            if (userProfilePictureNav && profileDropdown) {
                userProfilePictureNav.style.cursor = 'pointer';
                userProfilePictureNav.addEventListener('click', toggleDropdown);
            }
            if (signOutBtnNav) {
                signOutBtnNav.onclick = () => { // Use onclick to easily overwrite
                    auth.signOut().then(() => {
                        window.location.href = '../auth/auth.html';
                    }).catch(error => console.error('Sign out error:', error));
                };
            }
        } else {
             if (userProfilePictureNav) userProfilePictureNav.style.cursor = 'default';
             // For guests, clicking profile pic does nothing, sign out is hidden.
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

    function getPostIdFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('id');
    }

    function fetchPostData(postId) {
        const postRef = database.ref('posts/' + postId);
        postRef.on('value', snapshot => { // Use .on for real-time updates (e.g., likes)
            if (snapshot.exists()) {
                currentPostData = snapshot.val();
                renderPost(currentPostData, postId);
                if (postMainContent) postMainContent.style.display = 'block';
                fetchLikeStatus(postId); // Fetch like status after post data is loaded
            } else {
                displayError(`Post not found. It might have been abducted by aliens or never existed.`);
            }
            hidePageLoader();
        }, error => {
            console.error("Error fetching post data:", error);
            displayError(`Failed to load post data. Error: ${error.message}`);
            hidePageLoader();
        });
    }

    function renderPost(data, postId) {
        if (!data) return;

        document.title = `${data.title || 'Post'} | Cosmic Chronicles`;
        if (postTitleDisplayHero) postTitleDisplayHero.textContent = data.title || 'Untitled Post';
        
        if (heroImageContainer && data.featuredImageUrl) {
            heroImageContainer.style.backgroundImage = `url('${data.featuredImageUrl}')`;
        } else if (heroImageContainer) {
            heroImageContainer.style.backgroundImage = `url('../images/default-post-hero.jpg')`; // Fallback hero
            heroImageContainer.style.backgroundColor = '#1A0F3B'; // Fallback background color
        }

        if (postAuthorImg) postAuthorImg.src = data.authorProfilePic || defaultProfilePic;
        if (postAuthorName) postAuthorName.textContent = `By ${data.authorName || 'Anonymous Explorer'}`;
        
        if (postDate) {
            const dateObj = data.createdAt ? new Date(data.createdAt) : null;
            postDate.textContent = dateObj ? dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Date Unknown';
        }
        
        if (postCategoryDisplay) postCategoryDisplay.textContent = data.category || 'Uncategorized';

        if (postContentDisplay) {
            postContentDisplay.innerHTML = data.content || '<p>No content available for this transmission.</p>';
        }

        // Update like count display
        if (likeCountSpan) likeCountSpan.textContent = data.likeCount || 0;

        // Setup action buttons
        setupActionListeners(postId, data.title);
    }
    
    function hidePageLoader() {
        if (pageLoader) {
            pageLoader.style.opacity = '0';
            pageLoader.style.visibility = 'hidden';
            // A short delay to allow fade out before removing display:flex,
            // ensures main content doesn't jump if it appears too quickly.
            setTimeout(() => {
                 if (pageLoader.style.opacity === '0') { // Check if it wasn't reactivated
                    pageLoader.style.display = 'none';
                 }
            }, 500); // Matches CSS transition time
        }
    }

    function displayError(message) {
        if (errorMessageArea) {
            errorMessageArea.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
            errorMessageArea.className = 'message-area error';
            errorMessageArea.style.display = 'block';
        }
        if (postMainContent) postMainContent.style.display = 'none';
    }

    function setupActionListeners(postId, postTitle) {
        if (likeButton) {
            likeButton.onclick = () => handleLikePost(postId);
        }
        if (shareButton) {
            shareButton.onclick = () => handleSharePost(postId, postTitle);
        }
        // Comment button is an <a>, no specific JS needed beyond auth check for form.
    }

    async function fetchLikeStatus(postId) {
        if (currentUser && likeButton) {
            const likeRef = database.ref(`postLikes/${postId}/${currentUser.uid}`);
            likeRef.once('value', snapshot => {
                if (snapshot.exists() && snapshot.val() === true) {
                    likeButton.classList.add('liked');
                    likeButton.querySelector('i').classList.replace('far', 'fas'); // Solid heart
                } else {
                    likeButton.classList.remove('liked');
                    likeButton.querySelector('i').classList.replace('fas', 'far'); // Outline heart
                }
            });
        } else if (likeButton) { // Not logged in, ensure default state
             likeButton.classList.remove('liked');
             if (likeButton.querySelector('i')) {
                likeButton.querySelector('i').classList.replace('fas', 'far');
             }
        }
    }

    async function handleLikePost(postId) {
        if (!currentUser) {
            alert("Please log in to like posts!");
            // Optionally, redirect to login: window.location.href = '../auth/auth.html';
            return;
        }

        const postLikesUserRef = database.ref(`postLikes/${postId}/${currentUser.uid}`);
        const postRef = database.ref(`posts/${postId}/likeCount`);

        database.runTransaction(postRef, (currentLikeCount) => {
            if (currentLikeCount === null) {
                currentLikeCount = 0; // Initialize if not exists
            }
            const isCurrentlyLiked = likeButton.classList.contains('liked');
            if (isCurrentlyLiked) {
                return currentLikeCount - 1; // Unlike
            } else {
                return currentLikeCount + 1; // Like
            }
        }).then(result => {
            if (result.committed) {
                const isCurrentlyLiked = likeButton.classList.contains('liked');
                if (isCurrentlyLiked) { // User was liked, now unliking
                    postLikesUserRef.remove();
                    likeButton.classList.remove('liked');
                    likeButton.querySelector('i').classList.replace('fas', 'far');
                } else { // User was not liked, now liking
                    postLikesUserRef.set(true);
                    likeButton.classList.add('liked');
                    likeButton.querySelector('i').classList.replace('far', 'fas');
                }
                // The postRef.on('value') listener will update the likeCountSpan automatically
            }
        }).catch(error => {
            console.error("Like transaction failed: ", error);
            alert("Failed to update like. Please try again.");
        });
    }

    function handleSharePost(postId, postTitle) {
        const postUrl = `${window.location.origin}${window.location.pathname}?id=${postId}`;
        if (navigator.share) { // Use Web Share API if available
            navigator.share({
                title: postTitle || "Check out this post!",
                text: `I found this interesting post: ${postTitle}`,
                url: postUrl,
            })
            .then(() => console.log('Successful share'))
            .catch((error) => console.log('Error sharing', error));
        } else { // Fallback to copy to clipboard
            navigator.clipboard.writeText(postUrl).then(() => {
                if (shareTooltip) {
                    shareTooltip.classList.add('show');
                    setTimeout(() => { shareTooltip.classList.remove('show'); }, 2000);
                }
            }).catch(err => {
                console.error('Failed to copy: ', err);
                alert('Failed to copy link. You can manually copy the URL from your address bar.');
            });
        }
    }
    
    // Set current year in footer
    const currentYearSpan = document.getElementById('current-year');
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }

    // Initial call for auth state and post data is handled by onAuthStateChanged
});