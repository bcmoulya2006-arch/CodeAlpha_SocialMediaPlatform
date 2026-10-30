/**
 * PulseSphere Application Controller
 * Handles routing, events, interactive workflows, and DOM reactivity
 */

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  setupEventListeners();

  // 1. Check existing authentication session
  const token = API.getToken();
  if (token) {
    try {
      const data = await API.getMe();
      if (data.success && data.user) {
        State.setState({ currentUser: data.user });
      }
    } catch (err) {
      console.warn('Session expired or invalid, clearing token.');
      API.setToken(null);
      State.setState({ currentUser: null });
    }
  }

  // 2. Initial state synchronization
  UI.updateSidebarUser(State.getState().currentUser);

  // 3. Load initial feeds & suggested users
  await Promise.all([
    loadFeedPosts(),
    loadSuggestedUsers()
  ]);

  // Subscribe to state changes for reactive header/sidebar updates
  State.subscribe((state) => {
    UI.updateSidebarUser(state.currentUser);
  });
}

/**
 * Global Event Listeners Setup
 */
function setupEventListeners() {
  // Brand logo / Home click -> Reset to Home feed
  const brandLogo = document.getElementById('brand-logo');
  if (brandLogo) {
    brandLogo.addEventListener('click', () => switchView('feed'));
  }

  const navFeed = document.getElementById('nav-feed');
  if (navFeed) {
    navFeed.addEventListener('click', () => switchView('feed'));
  }

  const navMyProfile = document.getElementById('nav-my-profile');
  if (navMyProfile) {
    navMyProfile.addEventListener('click', () => {
      const { currentUser } = State.getState();
      if (currentUser) {
        openProfile(currentUser.username);
      }
    });
  }

  const navCreateBtn = document.getElementById('nav-create-btn');
  if (navCreateBtn) {
    navCreateBtn.addEventListener('click', () => {
      switchView('feed');
      const input = document.getElementById('post-content-input');
      if (input) {
        input.focus();
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }

  // Feed tabs (For You vs Following)
  const tabAllFeed = document.getElementById('tab-all-feed');
  const tabFollowingFeed = document.getElementById('tab-following-feed');

  if (tabAllFeed && tabFollowingFeed) {
    tabAllFeed.addEventListener('click', () => {
      tabAllFeed.classList.add('active');
      tabFollowingFeed.classList.remove('active');
      State.setState({ activeFeedTab: 'all' });
      loadFeedPosts();
    });

    tabFollowingFeed.addEventListener('click', () => {
      const { currentUser } = State.getState();
      if (!currentUser) {
        UI.showToast('Please log in to view your following feed.', 'info');
        UI.openAuthModal('login');
        return;
      }
      tabFollowingFeed.classList.add('active');
      tabAllFeed.classList.remove('active');
      State.setState({ activeFeedTab: 'following' });
      loadFeedPosts();
    });
  }

  // Profile back button
  const profileBackBtn = document.getElementById('profile-back-btn');
  if (profileBackBtn) {
    profileBackBtn.addEventListener('click', () => switchView('feed'));
  }

  // Create post character counter & publish
  const postContentInput = document.getElementById('post-content-input');
  const charCounter = document.getElementById('char-counter');
  const publishBtn = document.getElementById('publish-post-btn');

  if (postContentInput && charCounter) {
    postContentInput.addEventListener('input', () => {
      const length = postContentInput.value.length;
      charCounter.textContent = `${length} / 2000`;
      if (length > 1900) {
        charCounter.style.color = 'var(--danger)';
      } else {
        charCounter.style.color = 'var(--text-dim)';
      }
    });
  }

  // Image URL attachment drawer toggle
  const toggleImageBtn = document.getElementById('toggle-image-drawer-btn');
  const imageDrawer = document.getElementById('image-url-drawer');
  const imageUrlInput = document.getElementById('post-image-url-input');
  const applyImageBtn = document.getElementById('apply-image-btn');
  const previewContainer = document.getElementById('image-preview-container');
  const previewImg = document.getElementById('image-preview');
  const removePreviewBtn = document.getElementById('remove-preview-btn');

  if (toggleImageBtn && imageDrawer) {
    toggleImageBtn.addEventListener('click', () => {
      const isVisible = imageDrawer.style.display === 'flex';
      imageDrawer.style.display = isVisible ? 'none' : 'flex';
      if (!isVisible && imageUrlInput) imageUrlInput.focus();
    });
  }

  if (applyImageBtn && imageUrlInput && previewContainer && previewImg) {
    applyImageBtn.addEventListener('click', () => {
      const url = imageUrlInput.value.trim();
      if (!url) return;
      previewImg.src = url;
      previewContainer.style.display = 'block';
      imageDrawer.style.display = 'none';
    });
  }

  if (removePreviewBtn && previewContainer && imageUrlInput) {
    removePreviewBtn.addEventListener('click', () => {
      previewContainer.style.display = 'none';
      previewImg.src = '';
      imageUrlInput.value = '';
    });
  }

  if (publishBtn) {
    publishBtn.addEventListener('click', handlePublishPost);
  }

  // Search input handler (debounced)
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  let searchTimer = null;

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (clearSearchBtn) clearSearchBtn.style.display = val ? 'block' : 'none';

      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        State.setState({ searchQuery: val });
        loadFeedPosts();
      }, 350);
    });
  }

  if (clearSearchBtn && searchInput) {
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearSearchBtn.style.display = 'none';
      State.setState({ searchQuery: '' });
      loadFeedPosts();
    });
  }

  // Guest Banner actions
  const guestLoginBtn = document.getElementById('guest-login-btn');
  const guestRegisterBtn = document.getElementById('guest-register-btn');
  if (guestLoginBtn) guestLoginBtn.addEventListener('click', () => UI.openAuthModal('login'));
  if (guestRegisterBtn) guestRegisterBtn.addEventListener('click', () => UI.openAuthModal('register'));

  // Modals event delegation
  document.addEventListener('click', (e) => {
    // Open auth modal from sidebar or inline link
    if (e.target.closest('#sidebar-login-btn') || e.target.closest('.open-login-link')) {
      e.preventDefault();
      UI.openAuthModal('login');
      return;
    }

    // Modal close buttons
    if (e.target.closest('#auth-modal-close') || e.target.id === 'auth-modal') {
      UI.closeAuthModal();
      return;
    }

    if (e.target.closest('#edit-profile-close') || e.target.closest('#edit-profile-cancel') || e.target.id === 'edit-profile-modal') {
      UI.closeEditProfileModal();
      return;
    }

    // Switch auth modal tabs
    if (e.target.closest('#tab-show-login')) {
      UI.openAuthModal('login');
      return;
    }
    if (e.target.closest('#tab-show-register')) {
      UI.openAuthModal('register');
      return;
    }

    // Logout
    if (e.target.closest('#logout-btn')) {
      handleLogout();
      return;
    }

    // Click on user profile triggers (avatars or names)
    const userTrigger = e.target.closest('[data-username]');
    if (userTrigger && !e.target.closest('button')) {
      const username = userTrigger.dataset.username;
      if (username) {
        openProfile(username);
        return;
      }
    }

    // Like Post Button
    const likeBtn = e.target.closest('[data-action="like-post"]');
    if (likeBtn) {
      const postId = likeBtn.dataset.postId;
      handleLikeToggle(postId, likeBtn);
      return;
    }

    // Toggle Comments Button
    const commentToggleBtn = e.target.closest('[data-action="toggle-comments"]');
    if (commentToggleBtn) {
      const postId = commentToggleBtn.dataset.postId;
      handleToggleComments(postId, commentToggleBtn);
      return;
    }

    // Submit Comment Button
    const submitCommentBtn = e.target.closest('[data-action="submit-comment"]');
    if (submitCommentBtn) {
      const postId = submitCommentBtn.dataset.postId;
      handleSubmitComment(postId);
      return;
    }

    // Delete Post Button
    const deletePostBtn = e.target.closest('[data-action="delete-post"]');
    if (deletePostBtn) {
      const postId = deletePostBtn.dataset.postId;
      handleDeletePost(postId);
      return;
    }

    // Delete Comment Button
    const deleteCommentBtn = e.target.closest('[data-action="delete-comment"]');
    if (deleteCommentBtn) {
      const commentId = deleteCommentBtn.dataset.commentId;
      const postId = deleteCommentBtn.dataset.postId;
      handleDeleteComment(commentId, postId);
      return;
    }

    // Follow / Unfollow Button (Profile or Suggestions)
    const followBtn = e.target.closest('[data-action="toggle-follow"]');
    if (followBtn) {
      const userId = followBtn.dataset.userId;
      handleFollowToggle(userId, followBtn);
      return;
    }

    // Edit Profile Modal Open Button
    if (e.target.closest('#open-edit-profile-btn')) {
      const { currentUser } = State.getState();
      if (currentUser) {
        UI.openEditProfileModal(currentUser);
      }
      return;
    }

    // Demo Account Login Buttons
    const demoBtn = e.target.closest('.demo-btn');
    if (demoBtn) {
      const account = demoBtn.dataset.account;
      handleDemoLogin(account);
      return;
    }
  });

  // Enter key in comment input
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.classList.contains('comment-input-field')) {
      e.preventDefault();
      const postId = e.target.dataset.postId;
      handleSubmitComment(postId);
    }
  });

  // Auth Form Submissions
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLoginSubmit);
  }

  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegisterSubmit);
  }

  const editProfileForm = document.getElementById('edit-profile-form');
  if (editProfileForm) {
    editProfileForm.addEventListener('submit', handleEditProfileSubmit);
  }
}

/**
 * Switch Active View (Feed vs Profile)
 */
function switchView(viewName) {
  State.setState({ activeView: viewName });

  const feedView = document.getElementById('feed-view');
  const profileView = document.getElementById('profile-view');
  const navFeed = document.getElementById('nav-feed');
  const navProfile = document.getElementById('nav-my-profile');
  const pageTitle = document.getElementById('page-title');

  if (viewName === 'feed') {
    feedView.style.display = 'flex';
    profileView.style.display = 'none';
    navFeed.classList.add('active');
    if (navProfile) navProfile.classList.remove('active');
    pageTitle.textContent = 'Home Feed';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (viewName === 'profile') {
    feedView.style.display = 'none';
    profileView.style.display = 'flex';
    navFeed.classList.remove('active');
    pageTitle.textContent = 'User Profile';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

/**
 * Load Feed Posts
 */
async function loadFeedPosts() {
  const container = document.getElementById('posts-stream');
  if (!container) return;

  container.innerHTML = `
    <div class="feed-loader">
      <div class="spinner"></div>
      <p>Loading posts...</p>
    </div>
  `;

  try {
    const { activeFeedTab, searchQuery, currentUser } = State.getState();
    const params = {
      feed: activeFeedTab,
      search: searchQuery
    };

    const res = await API.getPosts(params);
    const posts = res.posts || [];
    State.setState({ posts });

    renderPostsList(container, posts, currentUser);
  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <p>Failed to load posts: ${UI.escapeHTML(err.message)}</p>
        <button class="btn btn-secondary btn-sm" onclick="loadFeedPosts()">Retry</button>
      </div>
    `;
  }
}

/**
 * Render List of Post Cards
 */
function renderPostsList(container, posts, currentUser) {
  container.innerHTML = '';

  if (!posts || posts.length === 0) {
    const { searchQuery, activeFeedTab } = State.getState();
    let emptyMsg = 'No posts found.';
    if (searchQuery) {
      emptyMsg = `No posts matching "${UI.escapeHTML(searchQuery)}"`;
    } else if (activeFeedTab === 'following') {
      emptyMsg = 'Your following feed is quiet. Follow more creators to see their updates here!';
    } else {
      emptyMsg = 'No posts yet. Be the first one to share an update!';
    }

    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-regular fa-comments"></i>
        <p>${emptyMsg}</p>
      </div>
    `;
    return;
  }

  posts.forEach((post) => {
    const postEl = UI.createPostCardElement(post, currentUser);
    container.appendChild(postEl);
  });
}

/**
 * Load Suggested Users
 */
async function loadSuggestedUsers() {
  try {
    const res = await API.getSuggestedUsers();
    const users = res.users || [];
    State.setState({ suggestedUsers: users });
    UI.renderSuggestedUsers(users, State.getState().currentUser);
  } catch (err) {
    console.error('Failed to load suggested users:', err);
  }
}

/**
 * Handle Post Publishing
 */
async function handlePublishPost() {
  const { currentUser } = State.getState();
  if (!currentUser) {
    UI.openAuthModal('login');
    return;
  }

  const contentInput = document.getElementById('post-content-input');
  const imageUrlInput = document.getElementById('post-image-url-input');
  const publishBtn = document.getElementById('publish-post-btn');

  const content = contentInput.value.trim();
  const imageUrl = imageUrlInput ? imageUrlInput.value.trim() : '';

  if (!content) {
    UI.showToast('Post content cannot be empty!', 'error');
    contentInput.focus();
    return;
  }

  publishBtn.disabled = true;
  publishBtn.innerHTML = `<div class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></div> Publishing...`;

  try {
    const res = await API.createPost({ content, imageUrl });
    if (res.success && res.post) {
      UI.showToast('Post published successfully!', 'success');

      // Clear input and reset previews
      contentInput.value = '';
      if (imageUrlInput) imageUrlInput.value = '';
      const charCounter = document.getElementById('char-counter');
      if (charCounter) charCounter.textContent = '0 / 2000';
      const previewContainer = document.getElementById('image-preview-container');
      if (previewContainer) previewContainer.style.display = 'none';

      // Prepend newly created post to feed
      const container = document.getElementById('posts-stream');
      const emptyState = container.querySelector('.empty-state');
      if (emptyState) emptyState.remove();

      const newPostEl = UI.createPostCardElement(res.post, currentUser);
      container.prepend(newPostEl);

      // Refresh user profile stats if open
      refreshCurrentUserStats();
    }
  } catch (err) {
    UI.showToast(err.message || 'Failed to publish post.', 'error');
  } finally {
    publishBtn.disabled = false;
    publishBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> <span>Publish</span>`;
  }
}

/**
 * Handle Like Toggle
 */
async function handleLikeToggle(postId, buttonEl) {
  const { currentUser } = State.getState();
  if (!currentUser) {
    UI.showToast('Please log in to like posts.', 'info');
    UI.openAuthModal('login');
    return;
  }

  // Optimistic UI toggle
  const icon = buttonEl.querySelector('i');
  const countEl = buttonEl.querySelector('.likes-count');
  const wasLiked = buttonEl.classList.contains('liked');
  const prevCount = parseInt(countEl.textContent, 10) || 0;

  const nextLiked = !wasLiked;
  const nextCount = nextLiked ? prevCount + 1 : Math.max(0, prevCount - 1);

  buttonEl.classList.toggle('liked', nextLiked);
  if (nextLiked) {
    icon.className = 'fa-solid fa-heart';
  } else {
    icon.className = 'fa-regular fa-heart';
  }
  countEl.textContent = nextCount;

  try {
    const res = await API.toggleLike(postId);
    if (res.success) {
      buttonEl.classList.toggle('liked', res.is_liked);
      icon.className = res.is_liked ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
      countEl.textContent = res.likes_count;
    }
  } catch (err) {
    // Revert optimistic update
    buttonEl.classList.toggle('liked', wasLiked);
    icon.className = wasLiked ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
    countEl.textContent = prevCount;
    UI.showToast(err.message || 'Error toggling like.', 'error');
  }
}

/**
 * Handle Toggle Comments Drawer & Fetch Comments
 */
async function handleToggleComments(postId, buttonEl) {
  const section = document.getElementById(`comments-section-${postId}`);
  if (!section) return;

  const isVisible = section.style.display !== 'none';

  if (isVisible) {
    section.style.display = 'none';
    buttonEl.classList.remove('active');
  } else {
    section.style.display = 'flex';
    buttonEl.classList.add('active');
    loadCommentsForPost(postId);
  }
}

/**
 * Load Comments for Post
 */
async function loadCommentsForPost(postId) {
  const listEl = document.getElementById(`comments-list-${postId}`);
  if (!listEl) return;

  try {
    const res = await API.getComments(postId);
    const comments = res.comments || [];
    const { currentUser } = State.getState();

    if (comments.length === 0) {
      listEl.innerHTML = `<div style="font-size: 0.82rem; color: var(--text-dim); padding: 6px 0;">No comments yet. Start the conversation!</div>`;
      return;
    }

    listEl.innerHTML = comments
      .map((comment) => UI.renderCommentItem(comment, currentUser))
      .join('');
  } catch (err) {
    listEl.innerHTML = `<div style="font-size: 0.82rem; color: var(--danger); padding: 6px 0;">Failed to load comments.</div>`;
  }
}

/**
 * Submit New Comment
 */
async function handleSubmitComment(postId) {
  const { currentUser } = State.getState();
  if (!currentUser) {
    UI.showToast('Please log in to leave a comment.', 'info');
    UI.openAuthModal('login');
    return;
  }

  const section = document.getElementById(`comments-section-${postId}`);
  const input = section.querySelector('.comment-input-field');
  const content = input ? input.value.trim() : '';

  if (!content) return;

  input.disabled = true;

  try {
    const res = await API.addComment(postId, content);
    if (res.success && res.comment) {
      input.value = '';

      // Update comment count on post card
      const postCard = document.getElementById(`post-${postId}`);
      if (postCard) {
        const countEl = postCard.querySelector('.comments-count');
        if (countEl) countEl.textContent = res.comments_count;
      }

      // Append new comment to comments list
      const listEl = document.getElementById(`comments-list-${postId}`);
      if (listEl) {
        // If empty message is showing, clear it
        if (listEl.children.length === 1 && !listEl.children[0].classList.contains('comment-item')) {
          listEl.innerHTML = '';
        }
        const commentHTML = UI.renderCommentItem(res.comment, currentUser);
        listEl.insertAdjacentHTML('beforeend', commentHTML);
      }

      UI.showToast('Comment added!', 'success');
    }
  } catch (err) {
    UI.showToast(err.message || 'Failed to add comment.', 'error');
  } finally {
    input.disabled = false;
    input.focus();
  }
}

/**
 * Delete Comment
 */
async function handleDeleteComment(commentId, postId) {
  if (!confirm('Are you sure you want to delete this comment?')) return;

  try {
    const res = await API.deleteComment(commentId);
    if (res.success) {
      const commentEl = document.getElementById(`comment-${commentId}`);
      if (commentEl) commentEl.remove();

      // Update post card comment count
      const postCard = document.getElementById(`post-${postId}`);
      if (postCard && res.comments_count !== undefined) {
        const countEl = postCard.querySelector('.comments-count');
        if (countEl) countEl.textContent = res.comments_count;
      }

      UI.showToast('Comment deleted.', 'info');
    }
  } catch (err) {
    UI.showToast(err.message || 'Failed to delete comment.', 'error');
  }
}

/**
 * Delete Post
 */
async function handleDeletePost(postId) {
  if (!confirm('Are you sure you want to delete this post? This cannot be undone.')) return;

  try {
    const res = await API.deletePost(postId);
    if (res.success) {
      const card = document.getElementById(`post-${postId}`);
      if (card) {
        card.style.opacity = '0';
        card.style.transform = 'scale(0.95)';
        card.style.transition = 'all 0.25s ease-out';
        setTimeout(() => card.remove(), 250);
      }

      UI.showToast('Post deleted successfully.', 'info');
      refreshCurrentUserStats();
    }
  } catch (err) {
    UI.showToast(err.message || 'Failed to delete post.', 'error');
  }
}

/**
 * Open User Profile Page
 */
async function openProfile(username) {
  if (!username) return;

  switchView('profile');
  State.setState({ profileUsername: username });

  const stream = document.getElementById('user-posts-stream');
  stream.innerHTML = `
    <div class="feed-loader">
      <div class="spinner"></div>
      <p>Loading @${UI.escapeHTML(username)}'s profile...</p>
    </div>
  `;

  try {
    const profileRes = await API.getUserProfile(username);
    const user = profileRes.user;

    // Populate profile DOM
    document.getElementById('profile-full-name').textContent = user.name;
    document.getElementById('profile-username').textContent = `@${user.username}`;
    document.getElementById('profile-bio').textContent = user.bio || 'No bio provided yet.';
    document.getElementById('profile-posts-owner').textContent = user.name;

    const avatarEl = document.getElementById('profile-avatar');
    avatarEl.src = user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`;

    const joinedDate = user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Recently';
    document.getElementById('profile-joined-date').textContent = `Joined ${joinedDate}`;

    document.getElementById('profile-posts-count').textContent = user.posts_count || 0;
    document.getElementById('profile-followers-count').textContent = user.followers_count || 0;
    document.getElementById('profile-following-count').textContent = user.following_count || 0;

    // Action button: Edit profile vs Follow/Following
    const actionContainer = document.getElementById('profile-action-container');
    const { currentUser } = State.getState();

    if (currentUser && currentUser.username.toLowerCase() === user.username.toLowerCase()) {
      actionContainer.innerHTML = `
        <button class="btn btn-secondary btn-sm" id="open-edit-profile-btn">
          <i class="fa-solid fa-user-pen"></i>
          <span>Edit Profile</span>
        </button>
      `;
    } else {
      const isFollowing = Boolean(user.is_following);
      actionContainer.innerHTML = `
        <button class="follow-toggle-btn ${isFollowing ? 'following' : ''}" 
                data-action="toggle-follow" 
                data-user-id="${user.id}" 
                data-username="${UI.escapeHTML(user.username)}">
          ${isFollowing ? 'Following' : '+ Follow'}
        </button>
      `;
    }

    // Load user's individual posts
    const postsRes = await API.getPosts({ username: user.username });
    const userPosts = postsRes.posts || [];
    renderPostsList(stream, userPosts, currentUser);
  } catch (err) {
    stream.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-user-slash"></i>
        <p>User profile could not be found.</p>
        <button class="btn btn-secondary btn-sm" onclick="switchView('feed')">Back to Feed</button>
      </div>
    `;
  }
}

/**
 * Handle Follow / Unfollow Toggle
 */
async function handleFollowToggle(userId, buttonEl) {
  const { currentUser } = State.getState();
  if (!currentUser) {
    UI.showToast('Please log in to follow creators.', 'info');
    UI.openAuthModal('login');
    return;
  }

  if (currentUser.id === parseInt(userId, 10)) {
    UI.showToast('You cannot follow yourself.', 'info');
    return;
  }

  buttonEl.disabled = true;

  try {
    const res = await API.toggleFollow(userId);
    if (res.success) {
      const isFollowing = res.is_following;
      buttonEl.classList.toggle('following', isFollowing);
      buttonEl.textContent = isFollowing ? 'Following' : '+ Follow';

      // If viewing profile of this user, update follower count badge
      const profileUsernameEl = document.getElementById('profile-username');
      const followersCountEl = document.getElementById('profile-followers-count');
      if (profileUsernameEl && followersCountEl && res.followers_count !== undefined) {
        followersCountEl.textContent = res.followers_count;
      }

      UI.showToast(res.message, 'success');

      // Refresh current user stats & suggested users
      refreshCurrentUserStats();
      loadSuggestedUsers();
    }
  } catch (err) {
    UI.showToast(err.message || 'Failed to toggle follow status.', 'error');
  } finally {
    buttonEl.disabled = false;
  }
}

/**
 * Handle Login Form Submit
 */
async function handleLoginSubmit(e) {
  e.preventDefault();
  const usernameInput = document.getElementById('login-username');
  const passwordInput = document.getElementById('login-password');
  const errorEl = document.getElementById('login-error');
  const submitBtn = document.getElementById('login-submit-btn');

  const usernameOrEmail = usernameInput.value.trim();
  const password = passwordInput.value;

  errorEl.style.display = 'none';
  submitBtn.disabled = true;

  try {
    const res = await API.login({ usernameOrEmail, password });
    if (res.success && res.token) {
      API.setToken(res.token);
      State.setState({ currentUser: res.user });
      UI.closeAuthModal();
      UI.showToast(`Welcome back, ${res.user.name}!`, 'success');

      // Refresh feed & widgets
      loadFeedPosts();
      loadSuggestedUsers();
    }
  } catch (err) {
    errorEl.textContent = err.message || 'Invalid credentials.';
    errorEl.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
  }
}

/**
 * Handle Register Form Submit
 */
async function handleRegisterSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('register-name').value.trim();
  const username = document.getElementById('register-username').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;
  const bio = document.getElementById('register-bio').value.trim();
  const errorEl = document.getElementById('register-error');
  const submitBtn = document.getElementById('register-submit-btn');

  errorEl.style.display = 'none';
  submitBtn.disabled = true;

  try {
    const res = await API.register({ name, username, email, password, bio });
    if (res.success && res.token) {
      API.setToken(res.token);
      State.setState({ currentUser: res.user });
      UI.closeAuthModal();
      UI.showToast('Account created successfully! Welcome to PulseSphere.', 'success');

      // Refresh feed & widgets
      loadFeedPosts();
      loadSuggestedUsers();
    }
  } catch (err) {
    errorEl.textContent = err.message || 'Registration failed.';
    errorEl.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
  }
}

/**
 * Handle Edit Profile Submit
 */
async function handleEditProfileSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('edit-name').value.trim();
  const avatar = document.getElementById('edit-avatar').value.trim();
  const bio = document.getElementById('edit-bio').value.trim();
  const errorEl = document.getElementById('edit-profile-error');
  const saveBtn = document.getElementById('edit-profile-save');

  errorEl.style.display = 'none';
  saveBtn.disabled = true;

  try {
    const res = await API.updateProfile({ name, avatar, bio });
    if (res.success && res.user) {
      State.setState({ currentUser: res.user });
      UI.closeEditProfileModal();
      UI.showToast('Profile updated successfully!', 'success');

      // Update current profile page if open
      const { profileUsername } = State.getState();
      if (profileUsername) {
        openProfile(profileUsername);
      }
    }
  } catch (err) {
    errorEl.textContent = err.message || 'Failed to update profile.';
    errorEl.style.display = 'block';
  } finally {
    saveBtn.disabled = false;
  }
}

/**
 * Handle Logout
 */
function handleLogout() {
  API.setToken(null);
  State.setState({ currentUser: null });
  UI.showToast('Logged out successfully.', 'info');
  switchView('feed');
  loadFeedPosts();
  loadSuggestedUsers();
}

/**
 * Helper: Refresh Current User Stats
 */
async function refreshCurrentUserStats() {
  const token = API.getToken();
  if (!token) return;

  try {
    const res = await API.getMe();
    if (res.success && res.user) {
      State.setState({ currentUser: res.user });
    }
  } catch (e) {
    console.warn('Could not refresh user stats');
  }
}

/**
 * Quick Demo Login
 */
async function handleDemoLogin(account) {
  try {
    const res = await API.login({ usernameOrEmail: account, password: 'password123' });
    if (res.success && res.token) {
      API.setToken(res.token);
      State.setState({ currentUser: res.user });
      UI.showToast(`Logged in as demo user: ${res.user.name}`, 'success');
      loadFeedPosts();
      loadSuggestedUsers();
    }
  } catch (err) {
    UI.showToast('Demo login error: ' + err.message, 'error');
  }
}
