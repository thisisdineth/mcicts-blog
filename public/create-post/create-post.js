document.addEventListener('DOMContentLoaded', function () {
    // Firebase services (auth, database, storage) are expected to be initialized 
    // globally by firebase-config.js or defined locally if not.
    // For this script to work as is, firebase-config.js must define:
    // const auth = firebase.auth();
    // const database = firebase.database();
    // const storage = firebase.storage();

    const createPostForm = document.getElementById('create-post-form');
    const postTitleInput = document.getElementById('post-title');
    const postCategoryInput = document.getElementById('post-category');
    const postFeaturedImageInput = document.getElementById('post-featured-image');
    const featuredImagePreview = document.getElementById('featured-image-preview');
    const publishPostBtn = document.getElementById('publish-post-btn');
    const messageArea = document.getElementById('message-area');

    const userProfilePictureNav = document.getElementById('user-profile-picture-nav');
    const profileDropdown = document.getElementById('profile-dropdown');
    const userNameNav = document.getElementById('user-name-nav');
    const signOutBtnNav = document.getElementById('sign-out-btn-nav');
    const defaultProfilePic = '../images/default-avatar.png'; // Ensure path is correct

    let currentUser = null;
    let userData = null; // To store user's extended profile data (like name from DB)

    auth.onAuthStateChanged(user => {
        if (user && user.emailVerified) {
            currentUser = user;
            loadUserProfile(user);
            initializeTinyMCE(user); // Pass user for image upload path
            setupNavbarEventListeners();
        } else {
            console.log("User not logged in or email not verified. Redirecting to auth page.");
            window.location.href = '../auth/auth.html'; // Ensure path is correct
        }
    });

    function loadUserProfile(user) {
        if (!userProfilePictureNav || !userNameNav) return; // Defensive check for navbar elements

        const userRef = database.ref('users/' + user.uid);
        userRef.once('value').then(snapshot => {
            if (snapshot.exists()) {
                userData = snapshot.val();
                userProfilePictureNav.src = userData.profilePictureURL || defaultProfilePic;
                userNameNav.innerHTML = `<i class="fas fa-user-astronaut"></i> ${userData.name || user.displayName || 'User'}`;
            } else {
                userData = { name: user.displayName || 'User', profilePictureURL: user.photoURL || defaultProfilePic }; // Fallback if no DB entry
                userProfilePictureNav.src = userData.profilePictureURL;
                userNameNav.innerHTML = `<i class="fas fa-user-astronaut"></i> ${userData.name}`;
            }
        }).catch(error => {
            console.error("Error fetching user profile:", error);
            userData = { name: user.displayName || 'User', profilePictureURL: user.photoURL || defaultProfilePic }; // Fallback on error
            userProfilePictureNav.src = userData.profilePictureURL;
            userNameNav.innerHTML = `<i class="fas fa-user-astronaut"></i> ${userData.name}`;
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
                    window.location.href = '../auth/auth.html'; // Ensure path is correct
                }).catch(error => console.error('Sign out error:', error));
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

    if (postFeaturedImageInput && featuredImagePreview) {
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
    }

    function initializeTinyMCE(user) {
        tinymce.init({
            selector: '#post-content-editor',
            plugins: 'preview importcss searchreplace autolink autosave save directionality code visualblocks visualchars fullscreen image link media template codesample table charmap pagebreak nonbreaking anchor insertdatetime advlist lists wordcount help charmap quickbars emoticons accordion',
            menubar: 'file edit view insert format tools table help',
            toolbar: 'undo redo | accordion accordionremove | blocks fontfamily fontsize | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | numlist bullist | link image media table | lineheight outdent indent| forecolor backcolor removeformat | charmap emoticons | code fullscreen preview | save print | pagebreak anchor codesample | ltr rtl',
            toolbar_mode: 'sliding',
            height: 500,
            image_caption: true,
            quickbars_selection_toolbar: 'bold italic | quicklink h2 h3 blockquote quickimage quicktable',
            noneditable_class: 'mceNonEditable',
            contextmenu: 'link image table',
            content_style: `
                body { font-family: 'Poppins', sans-serif; font-size:16px; line-height: 1.6; background-color: #0A021F; color: #E0E0FF; }
                img { max-width: 100%; height: auto; border-radius: 8px; }
                .mce-content-body[data-mce-placeholder]:not(.mce-visualblocks):before { color: #707090; }
            `,
            skin: 'oxide-dark',
            content_css: 'dark', // or 'default' or path to custom CSS for content area
            autosave_ask_before_unload: true,
            autosave_interval: '30s',
            autosave_prefix: '{path}{query}-{id}-',
            autosave_restore_when_empty: false,
            autosave_retention: '2m',
            image_advtab: true,
            images_upload_handler: (blobInfo, progress) => new Promise((resolve, reject) => {
                if (!user) {
                    reject("User not authenticated for image upload.");
                    return;
                }
                // Ensure `storage` is available (either global from firebase-config.js or defined locally)
                if (!storage) {
                    reject("Firebase Storage service is not available. Check firebase-config.js and SDK loading.");
                    return;
                }
                const filename = `blog_images/${user.uid}/${Date.now()}_${blobInfo.filename()}`;
                const storageRef = storage.ref(filename);
                const uploadTask = storageRef.put(blobInfo.blob());

                uploadTask.on('state_changed',
                    (snapshot) => {
                        const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        progress(percent);
                    },
                    (error) => {
                        console.error("TinyMCE Image Upload Error:", error);
                        reject({ message: 'Image upload failed: ' + error.code + " - " + error.message, remove: true });
                    },
                    () => {
                        uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                            resolve(downloadURL);
                        }).catch(err => {
                             console.error("Error getting download URL for TinyMCE image:", err);
                             reject({ message: 'Could not get image URL: ' + err.message, remove: true });
                        });
                    }
                );
            }),
            setup: function(editor) {
                editor.on('init', function() {
                    const editorContainer = editor.getContainer();
                    if (editorContainer) { // Check if container exists
                        const editArea = editorContainer.querySelector('.tox-edit-area');
                        if (editArea) { // Check if edit area exists
                            const placeholder = document.createElement('div');
                            placeholder.innerHTML = 'Start typing your cosmic report here...';
                            placeholder.style.position = 'absolute';
                            placeholder.style.top = '10px'; // Adjust based on editor padding
                            placeholder.style.left = '10px'; // Adjust
                            placeholder.style.color = '#707090';
                            placeholder.style.pointerEvents = 'none';
                            placeholder.setAttribute('id', 'tinymce-placeholder');
                            editArea.appendChild(placeholder);
                        }
                    }
                    
                    editor.on('input SetContent ExecCommand Change keyup', function () {
                         const placeholderEl = editor.getContainer()?.querySelector('#tinymce-placeholder');
                         if (placeholderEl) {
                            placeholderEl.style.display = editor.getContent({ format: 'text' }).trim() ? 'none' : 'block';
                         }
                    });
                });
            }
        });
    }

    if (createPostForm) {
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
            const content = tinymce.get('post-content-editor') ? tinymce.get('post-content-editor').getContent() : ''; // Handle if TinyMCE not init
            const featuredImageFile = postFeaturedImageInput.files[0];

            if (!title || !content || !category) {
                showMessage('Title, Category, and Content are required fields.', 'error');
                toggleButtonLoading(publishPostBtn, false);
                return;
            }
            
            let featuredImageUrl = '';
            let featuredImageStoragePath = ''; // Store path for potential deletion later

            if (featuredImageFile) {
                // Ensure `storage` is available
                if (!storage) {
                    showMessage('Firebase Storage service is not available. Cannot upload featured image.', 'error');
                    toggleButtonLoading(publishPostBtn, false);
                    return;
                }
                try {
                    const imageFilename = `featured_images/${currentUser.uid}/${Date.now()}_${featuredImageFile.name}`;
                    const imageStorageRef = storage.ref(imageFilename);
                    const uploadResult = await imageStorageRef.put(featuredImageFile);
                    featuredImageUrl = await uploadResult.ref.getDownloadURL();
                    featuredImageStoragePath = imageFilename; // Save the path
                } catch (error) {
                    console.error("Featured image upload error: ", error);
                    showMessage('Failed to upload featured image: ' + error.message, 'error');
                    toggleButtonLoading(publishPostBtn, false);
                    return;
                }
            }

            const authorNameToSave = (userData && userData.name) ? userData.name : (currentUser.displayName || 'Anonymous Explorer');
            const authorProfilePicToSave = (userData && userData.profilePictureURL) ? userData.profilePictureURL : (currentUser.photoURL || defaultProfilePic);

            const postData = {
                title: title,
                content: content,
                category: category,
                featuredImageUrl: featuredImageUrl,
                featuredImageStoragePath: featuredImageStoragePath, // Store path
                authorId: currentUser.uid,
                authorName: authorNameToSave,
                authorProfilePic: authorProfilePicToSave,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                updatedAt: firebase.database.ServerValue.TIMESTAMP,
            };

            try {
                const newPostRef = database.ref('posts').push();
                await newPostRef.set(postData);
                showMessage('Transmission successfully sent to HoloNet!', 'success', 5000);
                
                createPostForm.reset();
                if (featuredImagePreview) featuredImagePreview.style.display = 'none';
                if (tinymce.get('post-content-editor')) tinymce.get('post-content-editor').setContent('');
                
                setTimeout(() => {
                     window.location.href = `../blog/post.html?id=${newPostRef.key}`;
                }, 2000);

            } catch (error) {
                console.error("Error creating post:", error);
                showMessage('Failed to send transmission: ' + error.message, 'error');
            } finally {
                toggleButtonLoading(publishPostBtn, false);
            }
        });
    }

    function showMessage(message, type = 'error', duration = 7000) {
        if (!messageArea) return;
        messageArea.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i> <span>${message}</span>`;
        messageArea.className = `message-area show ${type}`;
        if (duration > 0) {
            setTimeout(clearMessages, duration);
        }
    }

    function clearMessages() {
        if (messageArea) messageArea.className = 'message-area';
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