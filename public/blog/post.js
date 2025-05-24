document.addEventListener('DOMContentLoaded', function () {
    // Ensure Firebase services are initialized (expects firebase-config.js to set up firebase.auth() and firebase.database())
    const auth = firebase.auth();
    const database = firebase.database();

    const postTitleDisplay = document.getElementById('post-title-display');
    const postAuthorImg = document.getElementById('post-author-img');
    const postAuthorName = document.getElementById('post-author-name');
    const postDate = document.getElementById('post-date');
    const postCategoryDisplay = document.getElementById('post-category-display');
    const postFeaturedImageDisplay = document.getElementById('post-featured-image-display');
    const postContentDisplay = document.getElementById('post-content-display');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessageArea = document.getElementById('error-message-area');
    const postContainer = document.getElementById('post-container');

    // Navbar elements
    const userProfilePictureNav = document.getElementById('user-profile-picture-nav');
    const profileDropdown = document.getElementById('profile-dropdown');
    const userNameNav = document.getElementById('user-name-nav');
    const signOutBtnNav = document.getElementById('sign-out-btn-nav');
    const signInBtnNav = document.getElementById('sign-in-btn-nav'); // For non-logged in users
    const defaultProfilePic = '../images/default-avatar.png'; // Ensure path is correct

    let currentUser = null;

    auth.onAuthStateChanged(user => {
        if (user && user.emailVerified) {
            currentUser = user;
            loadUserProfileForNavbar(user);
            if (signInBtnNav) signInBtnNav.style.display = 'none';
            if (signOutBtnNav) signOutBtnNav.style.display = 'block';
            if (profileDropdown) setupNavbarEventListeners(); // Setup listeners only if user is logged in
        } else {
            currentUser = null;
            if (userNameNav) userNameNav.innerHTML = `<i class="fas fa-user-astronaut"></i> Guest`;
            if (userProfilePictureNav) userProfilePictureNav.src = defaultProfilePic;
            if (profileDropdown) profileDropdown.classList.remove('show');
            if (signInBtnNav) signInBtnNav.style.display = 'block';
            if (signOutBtnNav) signOutBtnNav.style.display = 'none';
            // For guests, ensure dropdown doesn't show sensitive links or works differently
            // In this simplified version, profile pic click won't open dropdown if not logged in.
             if (userProfilePictureNav) {
                userProfilePictureNav.removeEventListener('click', toggleDropdown); // Remove if previously added
                userProfilePictureNav.style.cursor = 'default';
            }
        }
        // Fetch post regardless of login state
        fetchPostData();
    });
    
    function toggleDropdown(e) {
        e.stopPropagation();
        if (profileDropdown) profileDropdown.classList.toggle('show');
    }

    function loadUserProfileForNavbar(user) {
        if (!userProfilePictureNav || !userNameNav) return;

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
            userProfilePictureNav.style.cursor = 'pointer';
        }).catch(error => {
            console.error("Error fetching user profile for navbar:", error);
            userProfilePictureNav.src = user.photoURL || defaultProfilePic;
            userNameNav.innerHTML = `<i class="fas fa-user-astronaut"></i> ${user.displayName || 'User'}`;
            userProfilePictureNav.style.cursor = 'pointer';
        });
    }

    function setupNavbarEventListeners() {
        if (userProfilePictureNav && profileDropdown) {
            userProfilePictureNav.addEventListener('click', toggleDropdown);
        }
        if (signOutBtnNav) {
            signOutBtnNav.addEventListener('click', () => {
                auth.signOut().then(() => {
                    window.location.href = '../auth/auth.html'; // Ensure path is correct
                }).catch(error => console.error('Sign out error:', error));
            });
        }
        // Global click to close dropdown
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

    function fetchPostData() {
        const postId = getPostIdFromUrl();
        if (!postId) {
            displayError("No post ID found in URL. Cannot load post.");
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            return;
        }

        if (loadingIndicator) loadingIndicator.style.display = 'block';
        if (postContainer) postContainer.style.display = 'none'; // Hide post container initially

        const postRef = database.ref('posts/' + postId);
        postRef.once('value')
            .then(snapshot => {
                if (loadingIndicator) loadingIndicator.style.display = 'none';
                if (snapshot.exists()) {
                    const postData = snapshot.val();
                    renderPost(postData);
                    if (postContainer) postContainer.style.display = 'block';
                } else {
                    displayError(`Post not found. It might have been abducted by aliens or never existed.`);
                }
            })
            .catch(error => {
                if (loadingIndicator) loadingIndicator.style.display = 'none';
                console.error("Error fetching post data:", error);
                displayError(`Failed to load post data. Error: ${error.message}`);
            });
    }

    function renderPost(data) {
        if (!data) return;

        document.title = `${data.title || 'Post'} | Cosmic Chronicles`;
        if (postTitleDisplay) postTitleDisplay.textContent = data.title || 'Untitled Post';
        
        if (postAuthorImg) postAuthorImg.src = data.authorProfilePic || defaultProfilePic;
        if (postAuthorName) postAuthorName.textContent = `By ${data.authorName || 'Anonymous Explorer'}`;
        
        if (postDate) {
            const date = data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Date Unknown';
            postDate.textContent = date;
        }
        
        if (postCategoryDisplay) postCategoryDisplay.textContent = data.category || 'Uncategorized';

        if (postFeaturedImageDisplay && data.featuredImageUrl) {
            postFeaturedImageDisplay.src = data.featuredImageUrl;
            postFeaturedImageDisplay.alt = data.title || 'Featured Image';
            postFeaturedImageDisplay.style.display = 'block';
        } else if (postFeaturedImageDisplay) {
            postFeaturedImageDisplay.style.display = 'none';
        }

        if (postContentDisplay) {
            // Assuming content is HTML from TinyMCE
            postContentDisplay.innerHTML = data.content || '<p>No content available for this transmission.</p>';
        }
    }

    function displayError(message) {
        if (errorMessageArea) {
            errorMessageArea.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
            errorMessageArea.className = 'message-area error'; // Ensure it uses error styling from CSS
            errorMessageArea.style.display = 'block';
        }
        if (postContainer) postContainer.style.display = 'none'; // Hide the main post area on error
    }

    // Initial call to fetch post data is done via onAuthStateChanged to ensure user state is known
});