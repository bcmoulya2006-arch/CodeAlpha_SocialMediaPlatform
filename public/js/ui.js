/**
 * PulseSphere UI Service
 * Handles rendering, DOM updates, notifications, and animations
 */

const UI = (() => {

  // Escape HTML helper to prevent XSS
  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Format relative timestamp
  function formatRelativeTime(dateStr) {
    if (!dateStr) return 'Recently';
    const date = new Date(dateStr.endsWith('Z') ? dateStr : `${dateStr}Z`);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Toast notifications
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-triangle-exclamation';

    toast.innerHTML = `
      <i class="fa-solid ${icon}"></i>
      <span>${escapeHTML(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // Render Post Card HTML
  function createPostCardElement(post, currentUser) {
    const card = document.createElement('article');
    card.className = 'post-card';
    card.id = `post-${post.id}`;
    card.dataset.postId = post.id;

    const isAuthor = currentUser && (currentUser.id === post.user_id || post.is_author);
    const isLiked = Boolean(post.is_liked);
    const timeAgo = formatRelativeTime(post.created_at);

    // Format hashtags in post body
    const formattedContent = escapeHTML(post.content).replace(
      /(#[a-zA-Z0-9_]+)/g,
      '<span style="color: var(--primary); font-weight: 600;">$1</span>'
    );

    // Optional image HTML
    const imageHTML = post.image_url && post.image_url.trim() !== ''
      ? `<div class="post-image-box"><img src="${escapeHTML(post.image_url)}" alt="Post attachment" loading="lazy" onerror="this.parentElement.style.display='none'"></div>`
      : '';

    // Delete post button HTML
    const deleteButtonHTML = isAuthor
      ? `<button class="post-delete-btn" data-action="delete-post" data-post-id="${post.id}" title="Delete post">
           <i class="fa-regular fa-trash-can"></i>
         </button>`
      : '';

    card.innerHTML = `
      <div class="post-header">
        <a class="post-author-link" data-username="${escapeHTML(post.username)}">
          <img src="${escapeHTML(post.avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=' + post.username)}" 
               alt="${escapeHTML(post.name)}" class="avatar post-author-avatar">
          <div class="post-author-meta">
            <span class="post-author-name">${escapeHTML(post.name)}</span>
            <span class="post-author-sub">
              @${escapeHTML(post.username)}
              <span class="post-bullet">•</span>
              <time>${timeAgo}</time>
            </span>
          </div>
        </a>
        ${deleteButtonHTML}
      </div>

      <div class="post-content">${formattedContent}</div>

      ${imageHTML}

      <div class="post-action-bar">
        <button class="action-btn like-btn ${isLiked ? 'liked' : ''}" data-action="like-post" data-post-id="${post.id}">
          <i class="${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
          <span class="likes-count">${post.likes_count || 0}</span>
        </button>

        <button class="action-btn comment-toggle-btn" data-action="toggle-comments" data-post-id="${post.id}">
          <i class="fa-regular fa-comment"></i>
          <span class="comments-count">${post.comments_count || 0}</span>
        </button>
      </div>

      <!-- Collapsible Comment Section -->
      <div class="comment-section" id="comments-section-${post.id}" style="display: none;">
        ${currentUser ? `
          <div class="comment-input-row">
            <img src="${escapeHTML(currentUser.avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=' + currentUser.username)}" 
                 alt="${escapeHTML(currentUser.name)}" class="avatar comment-avatar">
            <div class="comment-input-wrapper">
              <input type="text" class="comment-input-field" placeholder="Write a comment..." maxlength="500" data-post-id="${post.id}">
              <button class="comment-submit-btn" data-action="submit-comment" data-post-id="${post.id}">Reply</button>
            </div>
          </div>
        ` : `
          <p style="font-size: 0.85rem; color: var(--text-dim); text-align: center;">
            <a href="#" class="open-login-link" style="color: var(--primary); text-decoration: underline;">Log in</a> to join the conversation.
          </p>
        `}

        <div class="comments-list" id="comments-list-${post.id}">
          <div style="font-size: 0.8rem; color: var(--text-dim); padding: 8px 0;">Loading comments...</div>
        </div>
      </div>
    `;

    return card;
  }

  // Render Comment Item HTML
  function renderCommentItem(comment, currentUser) {
    const isCommentAuthor = currentUser && (currentUser.id === comment.user_id || comment.is_author);
    const timeAgo = formatRelativeTime(comment.created_at);

    const deleteBtn = isCommentAuthor
      ? `<button class="comment-delete-btn" data-action="delete-comment" data-comment-id="${comment.id}" data-post-id="${comment.post_id}" title="Delete comment">
           <i class="fa-solid fa-xmark"></i>
         </button>`
      : '';

    return `
      <div class="comment-item" id="comment-${comment.id}">
        <img src="${escapeHTML(comment.avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=' + comment.username)}" 
             alt="${escapeHTML(comment.name)}" class="avatar comment-avatar">
        <div class="comment-bubble">
          <div class="comment-bubble-header">
            <div class="comment-author-info">
              <strong class="comment-author-name" data-username="${escapeHTML(comment.username)}">${escapeHTML(comment.name)}</strong>
              <span class="comment-time">${timeAgo}</span>
            </div>
            ${deleteBtn}
          </div>
          <div class="comment-bubble-body">${escapeHTML(comment.content)}</div>
        </div>
      </div>
    `;
  }

  // Update Left Sidebar Auth/User Section
  function updateSidebarUser(currentUser) {
    const container = document.getElementById('sidebar-user-section');
    const myProfileNav = document.getElementById('nav-my-profile');
    const createPostNav = document.getElementById('nav-create-btn');
    const createPostCard = document.getElementById('create-post-container');
    const guestBanner = document.getElementById('guest-prompt-banner');
    const creatorAvatar = document.getElementById('creator-avatar');

    if (currentUser) {
      if (myProfileNav) myProfileNav.style.display = 'flex';
      if (createPostNav) createPostNav.style.display = 'flex';
      if (createPostCard) createPostCard.style.display = 'flex';
      if (guestBanner) guestBanner.style.display = 'none';

      if (creatorAvatar) {
        creatorAvatar.src = currentUser.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.username}`;
      }

      container.innerHTML = `
        <div class="sidebar-user-card">
          <div class="sidebar-user-info" id="sidebar-user-click" data-username="${escapeHTML(currentUser.username)}">
            <img src="${escapeHTML(currentUser.avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=' + currentUser.username)}" 
                 alt="${escapeHTML(currentUser.name)}" class="avatar">
            <div class="sidebar-user-names">
              <strong>${escapeHTML(currentUser.name)}</strong>
              <span>@${escapeHTML(currentUser.username)}</span>
            </div>
          </div>
          <button class="logout-icon-btn" id="logout-btn" title="Sign out">
            <i class="fa-solid fa-arrow-right-from-bracket"></i>
          </button>
        </div>
      `;
    } else {
      if (myProfileNav) myProfileNav.style.display = 'none';
      if (createPostNav) createPostNav.style.display = 'none';
      if (createPostCard) createPostCard.style.display = 'none';
      if (guestBanner) guestBanner.style.display = 'flex';

      container.innerHTML = `
        <div class="sidebar-guest-card">
          <button class="btn btn-primary btn-block" id="sidebar-login-btn">
            <i class="fa-solid fa-arrow-right-to-bracket"></i>
            <span>Log In / Sign Up</span>
          </button>
        </div>
      `;
    }
  }

  // Render Suggested Users Widget
  function renderSuggestedUsers(users, currentUser) {
    const container = document.getElementById('suggested-users-list');
    if (!container) return;

    if (!users || users.length === 0) {
      container.innerHTML = `<div style="font-size: 0.85rem; color: var(--text-dim); text-align: center; padding: 12px 0;">No suggestions available right now.</div>`;
      return;
    }

    container.innerHTML = users.map((u) => {
      return `
        <div class="suggested-user-item">
          <div class="suggested-user-info" data-username="${escapeHTML(u.username)}">
            <img src="${escapeHTML(u.avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=' + u.username)}" 
                 alt="${escapeHTML(u.name)}" class="avatar">
            <div class="suggested-user-names">
              <strong>${escapeHTML(u.name)}</strong>
              <span>@${escapeHTML(u.username)}</span>
            </div>
          </div>
          <button class="follow-toggle-btn" data-action="toggle-follow" data-user-id="${u.id}" data-username="${escapeHTML(u.username)}">
            + Follow
          </button>
        </div>
      `;
    }).join('');
  }

  // Modals
  function openAuthModal(mode = 'login') {
    const modal = document.getElementById('auth-modal');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const tabLogin = document.getElementById('tab-show-login');
    const tabRegister = document.getElementById('tab-show-register');
    const title = document.getElementById('auth-modal-title');
    const subtitle = document.getElementById('auth-modal-subtitle');

    // Reset error messages
    document.getElementById('login-error').style.display = 'none';
    document.getElementById('register-error').style.display = 'none';

    if (mode === 'login') {
      loginForm.style.display = 'flex';
      registerForm.style.display = 'none';
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      title.textContent = 'Sign In to PulseSphere';
      subtitle.textContent = 'Connect with developers and share your journey.';
    } else {
      loginForm.style.display = 'none';
      registerForm.style.display = 'flex';
      tabLogin.classList.remove('active');
      tabRegister.classList.add('active');
      title.textContent = 'Create Your Account';
      subtitle.textContent = 'Join the CodeAlpha developer community today.';
    }

    modal.style.display = 'flex';
  }

  function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    modal.style.display = 'none';
  }

  function openEditProfileModal(user) {
    const modal = document.getElementById('edit-profile-modal');
    document.getElementById('edit-name').value = user.name || '';
    document.getElementById('edit-avatar').value = user.avatar || '';
    document.getElementById('edit-bio').value = user.bio || '';
    document.getElementById('edit-profile-error').style.display = 'none';
    modal.style.display = 'flex';
  }

  function closeEditProfileModal() {
    const modal = document.getElementById('edit-profile-modal');
    modal.style.display = 'none';
  }

  return {
    escapeHTML,
    formatRelativeTime,
    showToast,
    createPostCardElement,
    renderCommentItem,
    updateSidebarUser,
    renderSuggestedUsers,
    openAuthModal,
    closeAuthModal,
    openEditProfileModal,
    closeEditProfileModal
  };
})();
