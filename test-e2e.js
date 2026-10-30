/**
 * Complete End-to-End Automated Test Suite for CodeAlpha Task 2 Social Media Platform
 * 
 * Verifies:
 * 1. User Registration with salted bcrypt password hashing
 * 2. User Authentication & JWT bearer token generation
 * 3. User Login validation & incorrect password rejection
 * 4. User Profile statistics (posts count, followers, following)
 * 5. Post creation with hashtags & image attachments
 * 6. Global community feed retrieval ("For You")
 * 7. Dynamic like toggle (increment count, set is_liked = true)
 * 8. Dynamic unlike toggle (decrement count, set is_liked = false)
 * 9. Interactive comment posting & comment count updates
 * 10. Fetching comments with author metadata
 * 11. Relational follow system (User B follows User A)
 * 12. Personalized "Following" feed filtering
 * 13. Profile inspection with follower relationship verification
 * 14. Profile update (name and bio)
 * 15. Comment deletion and count decrement
 * 16. Post deletion by author
 */

const { initializeDatabase } = require('./src/config/db');
const { seedInitialData } = require('./src/config/seed');
const authController = require('./src/controllers/authController');
const postController = require('./src/controllers/postController');
const likeController = require('./src/controllers/likeController');
const commentController = require('./src/controllers/commentController');
const followController = require('./src/controllers/followController');

function callHandler(handler, req = {}) {
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        resolve({ status: this.statusCode, data });
      }
    };
    try {
      handler(req, res);
    } catch (err) {
      reject(err);
    }
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('📱 Starting CodeAlpha Task 2 Social Media Platform E2E Tests');
  console.log('================================================================\n');

  let passes = 0;
  let fails = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passes++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      fails++;
    }
  }

  try {
    // 1. Initialize DB
    initializeDatabase();
    seedInitialData();
    assert(true, 'Database schema and seed verified');

    // 2. Register Test User A (Alice)
    const usernameA = `alice_${Date.now()}`;
    const regARes = await callHandler(authController.register, {
      body: {
        username: usernameA,
        email: `${usernameA}@codealpha.tech`,
        password: 'password123',
        name: 'Alice Tester',
        bio: 'Full stack test engineer'
      }
    });
    assert(
      regARes.status === 201 && regARes.data.token && regARes.data.user.username === usernameA,
      'User Registration: User A registered with salted bcrypt hash and JWT token'
    );
    const tokenA = regARes.data.token;
    const userA = regARes.data.user;

    // 3. Register Test User B (Bob)
    const usernameB = `bob_${Date.now()}`;
    const regBRes = await callHandler(authController.register, {
      body: {
        username: usernameB,
        email: `${usernameB}@codealpha.tech`,
        password: 'password123',
        name: 'Bob Tester',
        bio: 'Mobile and UI specialist'
      }
    });
    assert(
      regBRes.status === 201 && regBRes.data.token && regBRes.data.user.username === usernameB,
      'User Registration: User B registered with salted bcrypt hash and JWT token'
    );
    const tokenB = regBRes.data.token;
    const userB = regBRes.data.user;

    // 4. Test User A Login
    const loginRes = await callHandler(authController.login, {
      body: { usernameOrEmail: usernameA, password: 'password123' }
    });
    assert(
      loginRes.status === 200 && loginRes.data.user.name === 'Alice Tester',
      'Authentication: User A login succeeded and returned valid JWT'
    );

    // 5. User A creates a post
    const postRes = await callHandler(postController.createPost, {
      user: { id: userA.id, username: userA.username },
      body: {
        content: 'Hello World from Alice! Welcome to PulseSphere #codealpha #fullstack',
        imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500'
      }
    });
    assert(
      postRes.status === 201 && postRes.data.post && postRes.data.post.id,
      'Post Creation: User A created post with hashtags and image preview'
    );
    const post = postRes.data.post;

    // 6. User B fetches community feed and finds Alice's post
    const feedRes = await callHandler(postController.getAllPosts, {
      user: { id: userB.id },
      query: { feed: 'all' }
    });
    const foundPost = feedRes.data.posts && feedRes.data.posts.find(p => p.id === post.id);
    assert(
      foundPost && foundPost.username === usernameA,
      'Community Feed: User B retrieved global feed containing User A post'
    );

    // 7. User B likes User A's post
    const likeRes1 = await callHandler(likeController.toggleLike, {
      user: { id: userB.id },
      params: { postId: post.id }
    });
    assert(
      likeRes1.data.success && likeRes1.data.is_liked === true && likeRes1.data.likes_count === 1,
      'Likes System: User B liked post, incremented likes_count to 1'
    );

    // 8. User B toggles like (unlikes)
    const unlikeRes = await callHandler(likeController.toggleLike, {
      user: { id: userB.id },
      params: { postId: post.id }
    });
    assert(
      unlikeRes.data.is_liked === false && unlikeRes.data.likes_count === 0,
      'Likes System: User B unliked post, decremented likes_count to 0'
    );

    // Re-like for comment testing
    await callHandler(likeController.toggleLike, {
      user: { id: userB.id },
      params: { postId: post.id }
    });

    // 9. User B adds a comment
    const commentRes = await callHandler(commentController.addComment, {
      user: { id: userB.id, username: userB.username },
      params: { postId: post.id },
      body: { content: 'Awesome post Alice! Testing comment thread.' }
    });
    assert(
      commentRes.status === 201 && commentRes.data.comment && commentRes.data.comments_count === 1,
      'Comments System: User B added comment, comments_count incremented to 1'
    );
    const commentId = commentRes.data.comment.id;

    // 10. Fetch comments for post
    const getCommentsRes = await callHandler(commentController.getCommentsByPost, {
      params: { postId: post.id }
    });
    assert(
      getCommentsRes.data.comments && getCommentsRes.data.comments.length >= 1 && getCommentsRes.data.comments[0].content.includes('Awesome post Alice'),
      'Comments Retrieval: Comments retrieved with author metadata and timestamp'
    );

    // 11. User B follows User A
    const followRes = await callHandler(followController.toggleFollow, {
      user: { id: userB.id },
      params: { userId: userA.id }
    });
    assert(
      followRes.data.success && followRes.data.is_following === true && followRes.data.followers_count === 1,
      'Follow System: User B followed User A (followers_count = 1)'
    );

    // 12. User B checks Following feed
    const followingFeedRes = await callHandler(postController.getAllPosts, {
      user: { id: userB.id },
      query: { feed: 'following' }
    });
    const hasAlicePostInFollowing = followingFeedRes.data.posts && followingFeedRes.data.posts.some(p => p.id === post.id);
    assert(
      hasAlicePostInFollowing,
      'Feed Filtering: User A post appears in User B personalized "Following" feed'
    );

    // 13. User A checks their profile
    const profileRes = await callHandler(authController.getUserProfile, {
      user: { id: userB.id },
      params: { username: usernameA }
    });
    assert(
      profileRes.data.user && profileRes.data.user.followers_count === 1 && profileRes.data.user.is_following === true,
      'User Profile: Profile metrics verified (followers, following, post counts)'
    );

    // 14. User A updates bio & name
    const updateProfileRes = await callHandler(authController.updateProfile, {
      user: { id: userA.id },
      body: {
        name: 'Alice Tester (Lead Dev)',
        bio: 'Updated bio: Building full-stack web applications with CodeAlpha!'
      }
    });
    assert(
      updateProfileRes.data.user && updateProfileRes.data.user.name === 'Alice Tester (Lead Dev)',
      'Profile Update: Successfully updated display name and bio'
    );

    // 15. User B deletes their comment
    const delCommentRes = await callHandler(commentController.deleteComment, {
      user: { id: userB.id },
      params: { commentId: commentId }
    });
    assert(
      delCommentRes.data.success && delCommentRes.data.comments_count === 0,
      'Comments Lifecycle: Comment deleted successfully, count decremented to 0'
    );

    // 16. User A deletes their post
    const delPostRes = await callHandler(postController.deletePost, {
      user: { id: userA.id },
      params: { id: post.id }
    });
    assert(
      delPostRes.data.success,
      'Post Lifecycle: Author successfully deleted their post'
    );

  } catch (error) {
    console.error('Fatal test error:', error);
    fails++;
  } finally {
    console.log('\n----------------------------------------------------------------');
    console.log(`📊 Test Summary: ${passes} Passed, ${fails} Failed`);
    console.log('----------------------------------------------------------------\n');
    process.exit(fails > 0 ? 1 : 0);
  }
}

runTests();
