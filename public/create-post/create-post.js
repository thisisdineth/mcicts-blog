document.addEventListener('DOMContentLoaded', function () {
    // Firebase services are from firebase-config.js
    // const auth = firebase.auth();
    // const database = firebase.database();
    // const storage = firebase.storage();

    const createPostForm = document.getElementById('create-post-form');
    const postTitleInput = document.getElementById('post-title');
    const postCategoryInput = document.getElementById('post-category');
    const postFeaturedImageInput = document.getElementById('post-featured-image');
    const featuredImagePreview = document.getElementById('featured-image-preview');
    // TinyMCE will attach to #post-content-editor
    const publishPostBtn = document.getElementById('publish-post-btn');
    const messageArea = document.getElementById('message-area');

    // User profile elements in navbar
    const userProfilePictureNav = document.getElementById('user-profile-picture-nav');
    const profileDropdown = document.getElementById('profile-dropdown');
    const userNameNav = document.getElementById('user-name-nav');
    const signOutBtnNav = document.getElementById('sign-out-btn-nav');
    const defaultProfilePic = '../images/default-avatar.png';


    let currentUser = null;
    let userData = null; // To store user's name from DB

    auth.onAuthStateChanged(user => {
        if (user && user.emailVerified) {
            currentUser = user;
            loadUserProfile(user); // Load profile for navbar and for author details
            initializeTinyMCE(user);
            setupNavbarEventListeners();
        } else {
            console.log("User not logged in or email not verified. Redirecting to auth page.");
            window.location.href = '../auth/auth.html'; // Adjust path as needed
        }
    });

    function loadUserProfile(user) {
        const userRef = database.ref('users/' + user.uid);
        userRef.once('value').then(snapshot => {
            if (snapshot.exists()) {
                userData = snapshot.val(); // Store for authorName
                userProfilePictureNav.src = userData.profilePictureURL || defaultProfilePic;
                userNameNav.innerHTML = `<i class="fas fa-user-astronaut"></i> ${userData.name || user.displayName || 'User'}`;
            } else {
                userProfilePictureNav.src = defaultProfilePic;
                userNameNav.innerHTML = `<i class="fas fa-user-astronaut"></i> ${user.displayName || 'User'}`;
            }
        }).catch(error => {
            console.error("Error fetching user profile:", error);
            userProfilePictureNav.src = defaultProfilePic;
            userNameNav.innerHTML = `<i class="fas fa-user-astronaut"></i> ${user.displayName || 'User'}`;
        });
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
                    window.location.href = '../auth/auth.html';
                }).catch(error => console.error('Sign out error:', error));
            });
        }
        window.addEventListener('click', function(e) { // Close dropdown if clicked outside
            if (profileDropdown && profileDropdown.classList.contains('show') && 
                !userProfilePictureNav.contains(e.target) && !profileDropdown.contains(e.target)) {
                profileDropdown.classList.remove('show');
            }
        });
    }
    
    postFeaturedImageInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                featuredImagePreview.src = e.target.result;
                featuredImagePreview.style.display = 'block';
            }
            reader.readAsDataURL(file);
        } else {
            featuredImagePreview.src = '#';
            featuredImagePreview.style.display = 'none';
        }
    });


    function initializeTinyMCE(user) {
        tinymce.init({
            selector: '#post-content-editor',
            plugins: 'preview importcss searchreplace autolink autosave save directionality code visualblocks visualchars fullscreen image link media template codesample table charmap pagebreak nonbreaking anchor insertdatetime advlist lists wordcount help charmap quickbars emoticons accordion',
            menubar: 'file edit view insert format tools table help',
            toolbar: 'undo redo | accordion accordionremove | blocks fontfamily fontsize | bold italic underline strikethrough | align numlist bullist | link image media table | lineheight outdent indent| forecolor backcolor removeformat | charmap emoticons | code fullscreen preview | save print | pagebreak anchor codesample | ltr rtl',
            toolbar_mode: 'sliding', // or 'floating', 'wrap'
            height: 500,
            image_caption: true,
            quickbars_selection_toolbar: 'bold italic | quicklink h2 h3 blockquote quickimage quicktable',
            noneditable_class: 'mceNonEditable',
            contextmenu: 'link image table',
            content_style: `
                body { font-family: 'Poppins', sans-serif; font-size:16px; line-height: 1.6; background-color: #0A021F; color: #E0E0FF; }
                img { max-width: 100%; height: auto; }
                .mce-content-body[data-mce-placeholder]:not(.mce-visualblocks):before { color: #707090; }
            `, // Basic dark theme for editor content
            skin: 'oxide-dark', // Use dark skin for the UI
            content_css: 'dark', // Use dark content styling
            autosave_ask_before_unload: true,
            autosave_interval: '30s',
            autosave_prefix: '{path}{query}-{id}-',
            autosave_restore_when_empty: false,
            autosave_retention: '2m',
            image_advtab: true,
            // Setup image upload handler
            images_upload_handler: (blobInfo, progress) => new Promise((resolve, reject) => {
                if (!user) {
                    reject("User not authenticated for image upload.");
                    return;
                }
                const filename = `blog_images/${user.uid}/${Date.now()}_${blobInfo.filename()}`;
                const storageRef = storage.ref(filename);
                const uploadTask = storageRef.put(blobInfo.blob());

                uploadTask.on('state_changed',
                    (snapshot) => {
                        // Progress
                        const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        progress(percent); // TinyMCE progress
                    },
                    (error) => {
                        // Error
                        console.error("Image Upload Error:", error);
                        reject({ message: 'Image upload failed: ' + error.message, remove: true });
                    },
                    () => {
                        // Success
                        uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                            resolve(downloadURL);
                        }).catch(err => {
                             console.error("Error getting download URL:", err);
                             reject({ message: 'Could not get image URL: ' + err.message, remove: true });
                        });
                    }
                );
            }),
            setup: function(editor) {
                editor.on('init', function() {
                    // Set placeholder
                    const editorContainer = editor.getContainer();
                    const placeholder = document.createElement('div');
                    placeholder.innerHTML = 'Start typing your cosmic report here...';
                    placeholder.style.position = 'absolute';
                    placeholder.style.top = '45px'; // Adjust based on your toolbar height
                    placeholder.style.left = '10px';
                    placeholder.style.color = '#707090'; // --input-placeholder
                    placeholder.style.pointerEvents = 'none';
                    editorContainer.querySelector('.tox-edit-area').appendChild(placeholder);
                    
                    editor.on('input SetContent ExecCommand Change', function () {
                         placeholder.style.display = editor.getContent({ format: 'text' }).trim() ? 'none' : 'block';
                    });
                });
            }
        });
    }

    createPostForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        if (!currentUser) {
            showMessage('Error: You must be logged in to create a post.', 'error');
            return;
        }

        toggleButtonLoading(publishPostBtn, true);
        clearMessages();

        const title = postTitleInput.value.trim();
        const category = postCategoryInput.value.trim();
        const content = tinymce.get('post-content-editor').getContent();
        const featuredImageFile = postFeaturedImageInput.files[0];


        if (!title || !content || !category) {
            showMessage('Title, Category, and Content are required fields.', 'error');
            toggleButtonLoading(publishPostBtn, false);
            return;
        }
        
        let featuredImageUrl = '';
        if (featuredImageFile) {
            try {
                const imageFilename = `featured_images/${currentUser.uid}/${Date.now()}_${featuredImageFile.name}`;
                const imageStorageRef = storage.ref(imageFilename);
                const uploadResult = await imageStorageRef.put(featuredImageFile);
                featuredImageUrl = await uploadResult.ref.getDownloadURL();
            } catch (error) {
                console.error("Featured image upload error: ", error);
                showMessage('Failed to upload featured image: ' + error.message, 'error');
                toggleButtonLoading(publishPostBtn, false);
                return;
            }
        }


        const postData = {
            title: title,
            content: content,
            category: category,
            featuredImageUrl: featuredImageUrl, // Can be empty string
            authorId: currentUser.uid,
            authorName: userData ? userData.name : (currentUser.displayName || 'Anonymous Explorer'),
            authorProfilePic: userData ? userData.profilePictureURL : (currentUser.photoURL || defaultProfilePic),
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            updatedAt: firebase.database.ServerValue.TIMESTAMP,
            // Optional: Add likes, views, comments structure later
            // likes: 0,
            // views: 0,
        };

        try {
            const newPostRef = database.ref('posts').push();
            await newPostRef.set(postData);
            showMessage('Transmission successfully sent to HoloNet!', 'success', 5000);
            
            // Optionally clear form or redirect
            createPostForm.reset();
            featuredImagePreview.style.display = 'none';
            tinymce.get('post-content-editor').setContent('');
            
            setTimeout(() => {
                 window.location.href = `../blog/post.html?id=${newPostRef.key}`; // Redirect to the new post page
                 // OR window.location.href = '../blog/blog.html'; // Redirect to blog overview
            }, 2000);

        } catch (error) {
            console.error("Error creating post:", error);
            showMessage('Failed to send transmission: ' + error.message, 'error');
        } finally {
            toggleButtonLoading(publishPostBtn, false);
        }
    });

    function showMessage(message, type = 'error', duration = 7000) {
        messageArea.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i> <span>${message}</span>`;
        messageArea.className = `message-area show ${type}`;
        if (duration > 0) {
            setTimeout(clearMessages, duration);
        }
    }

    function clearMessages() {
        messageArea.className = 'message-area';
    }

    function toggleButtonLoading(button, isLoading) {
        const textSpan = button.querySelector('.btn-text');
        const loaderSpan = button.querySelector('.btn-loader');
        if (isLoading) {
            button.disabled = true;
            if (textSpan) textSpan.style.display = 'none';
            if (loaderSpan) loaderSpan.style.display = 'inline-block';
        } else {
            button.disabled = false;
            if (textSpan) textSpan.style.display = 'inline-block';
            if (loaderSpan) loaderSpan.style.display = 'none';
        }
    }
});