/**
 * PulseSphere API Client Service
 * Handles all REST communication with the Express/SQLite backend
 */

const API = (() => {
  const BASE_URL = '/api';

  function getToken() {
    return localStorage.getItem('pulse_token');
  }

  function setToken(token) {
    if (token) {
      localStorage.setItem('pulse_token', token);
    } else {
      localStorage.removeItem('pulse_token');
    }
  }

  async function request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'An error occurred while processing the request.');
      }

      return data;
    } catch (err) {
      console.error(`API Error on [${options.method || 'GET'} ${endpoint}]:`, err);
      throw err;
    }
  }

  return {
    getToken,
    setToken,

    // Auth
    register: (userData) => request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
    login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    getMe: () => request('/auth/me'),
    updateProfile: (profileData) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(profileData) }),
    getUserProfile: (username) => request(`/users/${encodeURIComponent(username)}`),

    // Posts
    getPosts: (params = {}) => {
      const query = new URLSearchParams();
      if (params.feed) query.set('feed', params.feed);
      if (params.username) query.set('username', params.username);
      if (params.search) query.set('search', params.search);
      const queryString = query.toString() ? `?${query.toString()}` : '';
      return request(`/posts${queryString}`);
    },
    getPost: (id) => request(`/posts/${id}`),
    createPost: (postData) => request('/posts', { method: 'POST', body: JSON.stringify(postData) }),
    deletePost: (id) => request(`/posts/${id}`, { method: 'DELETE' }),

    // Likes
    toggleLike: (postId) => request(`/posts/${postId}/like`, { method: 'POST' }),

    // Comments
    getComments: (postId) => request(`/posts/${postId}/comments`),
    addComment: (postId, content) => request(`/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify({ content }) }),
    deleteComment: (commentId) => request(`/comments/${commentId}`, { method: 'DELETE' }),

    // Follows
    toggleFollow: (userId) => request(`/users/${userId}/follow`, { method: 'POST' }),
    getFollowers: (userId) => request(`/users/${userId}/followers`),
    getFollowing: (userId) => request(`/users/${userId}/following`),
    getSuggestedUsers: () => request('/users/suggested')
  };
})();
