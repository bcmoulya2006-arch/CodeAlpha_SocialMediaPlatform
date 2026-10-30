/**
 * PulseSphere Global State Store
 * Manages reactive application state across views
 */

const State = (() => {
  const store = {
    currentUser: null,
    activeView: 'feed', // 'feed' | 'profile'
    activeFeedTab: 'all', // 'all' | 'following'
    profileUsername: null,
    searchQuery: '',
    posts: [],
    userPosts: [],
    suggestedUsers: []
  };

  const listeners = [];

  function getState() {
    return store;
  }

  function setState(updates) {
    Object.assign(store, updates);
    listeners.forEach((listener) => {
      try {
        listener(store);
      } catch (e) {
        console.error('State listener error:', e);
      }
    });
  }

  function subscribe(fn) {
    listeners.push(fn);
    return () => {
      const idx = listeners.indexOf(fn);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }

  return {
    getState,
    setState,
    subscribe
  };
})();
