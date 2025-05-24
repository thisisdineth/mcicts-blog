document.addEventListener('DOMContentLoaded', function () {
    // Firebase services are now initialized in firebase-config.js and available globally.
    // const auth = firebase.auth(); (available from firebase-config.js)
    // const database = firebase.database(); (available from firebase-config.js)

    const userProfilePictureNav = document.getElementById('user-profile-picture-nav');
    const profileDropdown = document.getElementById('profile-dropdown');
    const signOutBtnNav = document.getElementById('sign-out-btn-nav');
    const createPostBtn = document.getElementById('create-post-btn');
    const blogPostsContainer = document.getElementById('blog-posts-container');
    const loadingIndicator = document.getElementById('loading-indicator');
    const userNameNav = document.getElementById('user-name-nav');

    const defaultProfilePic = '../images/default-avatar.png'; // Path to your default avatar

    // Check authentication state
    auth.onAuthStateChanged(user => {
        if (user) {
            if (user.emailVerified) {
                console.log("User is logged in and verified:", user.uid);
                loadUserProfile(user);
                loadBlogPosts(); // Load blog posts for the logged-in user
                setupEventListeners(user);
            } else {
                console.log("User email not verified. Redirecting to auth page.");
                alert("Your email is not verified. Please check your inbox or sign in again to resend verification.");
                auth.signOut(); // Sign out the user if email is not verified to force re-login/verification
                window.location.href = '../auth/auth.html'; // Adjust path if needed
            }
        } else {
            console.log("No user logged in. Redirecting to auth page.");
            window.location.href = '../auth/auth.html'; // Adjust path if needed
        }
    });

    function setupEventListeners(user) {
        // Toggle profile dropdown
        userProfilePictureNav.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent click from immediately closing dropdown
            profileDropdown.classList.toggle('show');
        });

        // Sign out
        signOutBtnNav.addEventListener('click', () => {
            auth.signOut().then(() => {
                console.log('User signed out.');
                window.location.href = '../auth/auth.html'; // Redirect to auth page after sign out
            }).catch(error => {
                console.error('Sign out error:', error);
                alert('Error signing out. Please try again.');
            });
        });

        // Create Post button
        createPostBtn.addEventListener('click', () => {
            // You'll need to create a create-post.html page or a modal
            console.log('Create post button clicked. User:', user.uid);
            alert('Redirecting to create post page (not implemented yet).');
            // Example: window.location.href = 'create-post.html';
        });
    }

    function loadUserProfile(user) {
        const userRef = database.ref('users/' + user.uid);
        userRef.once('value').then(snapshot => {
            if (snapshot.exists()) {
                const userData = snapshot.val();
                console.log("User data from DB:", userData);
                if (userData.profilePictureURL) {
                    userProfilePictureNav.src = userData.profilePictureURL;
                } else {
                    userProfilePictureNav.src = defaultProfilePic;
                }
                userNameNav.textContent = userData.name || user.displayName || 'User';
            } else {
                console.warn("User data not found in database for UID:", user.uid);
                userProfilePictureNav.src = defaultProfilePic;
                userNameNav.textContent = user.displayName || 'User';
            }
        }).catch(error => {
            console.error("Error fetching user profile:", error);
            userProfilePictureNav.src = defaultProfilePic;
            userNameNav.textContent = user.displayName || 'User';
        });
    }

    // --- Blog Post Functionality (Example) ---
    // This is a placeholder. You'll need to implement how posts are created and stored.
    // For now, it will just show a message.
    function loadBlogPosts() {
        loadingIndicator.style.display = 'block';
        blogPostsContainer.innerHTML = ''; // Clear existing posts

        // Example: Fetching posts from a 'posts' node in Firebase
        const postsRef = database.ref('posts').orderByChild('createdAt').limitToLast(10); // Get latest 10 posts

        postsRef.once('value')
            .then(snapshot => {
                loadingIndicator.style.display = 'none';
                if (snapshot.exists()) {
                    const posts = [];
                    snapshot.forEach(childSnapshot => {
                        posts.push({ id: childSnapshot.key, ...childSnapshot.val() });
                    });
                    posts.reverse(); // To show newest first if not using .orderByChild('timestamp').limitToLast()

                    displayPosts(posts);
                } else {
                    blogPostsContainer.innerHTML = '<p>No blog posts found yet. Be the first to create one!</p>';
                }
            })
            .catch(error => {
                console.error("Error loading blog posts:", error);
                loadingIndicator.style.display = 'none';
                blogPostsContainer.innerHTML = '<p>Error loading posts. Please try again later.</p>';
            });
    }

    function displayPosts(posts) {
        if (!posts || posts.length === 0) {
            blogPostsContainer.innerHTML = '<p>No blog posts found yet.</p>';
            return;
        }

        posts.forEach(post => {
            const postElement = document.createElement('article');
            postElement.classList.add('blog-post');

            const title = document.createElement('h2');
            title.textContent = post.title || 'Untitled Post';

            const meta = document.createElement('p');
            meta.classList.add('post-meta');
            const postDate = post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Some time ago';
            // You might want to fetch author details if 'authorId' is stored
            meta.textContent = `By ${post.authorName || 'Unknown Author'} on ${postDate}`;

            const contentSnippet = document.createElement('div');
            contentSnippet.classList.add('post-content');
            // Create a snippet, e.g., first 150 characters
            contentSnippet.innerHTML = `<p>${(post.content || '').substring(0, 150)}...</p>`;

            const readMoreLink = document.createElement('a');
            readMoreLink.classList.add('read-more-btn');
            readMoreLink.textContent = 'Read More';
            readMoreLink.href = `post.html?id=${post.id}`; // Link to a single post page (not created here)

            postElement.appendChild(title);
            postElement.appendChild(meta);
            postElement.appendChild(contentSnippet);
            postElement.appendChild(readMoreLink);

            blogPostsContainer.appendChild(postElement);
        });
    }

    // Close dropdown if clicked outside
    window.addEventListener('click', function(e) {
        if (!userProfilePictureNav.contains(e.target) && !profileDropdown.contains(e.target)) {
            if (profileDropdown.classList.contains('show')) {
                profileDropdown.classList.remove('show');
            }
        }
    });
});