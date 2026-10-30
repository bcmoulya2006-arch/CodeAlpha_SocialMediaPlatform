# PulseSphere — Mini Social Media Platform
### CodeAlpha Full Stack Web Development Internship — Task 2

PulseSphere is a complete, modern, and lightweight social media platform built to satisfy **Task 2 of the CodeAlpha Internship guidelines**. It features responsive Single Page Application (SPA) architecture, JWT authentication with salted bcrypt password hashing, dynamic relational likes and follows, interactive comments, and an out-of-the-box zero-configuration SQLite database.

---

## 🌟 Key Features

### 1. User Authentication & Profile Management
- **Registration & Login**: Secure account registration with email/username uniqueness checks and bcrypt password hashing.
- **JWT Session Tokens**: Persistent state management via secure token storage and Authorization headers.
- **Dedicated User Profiles**:
  - Displays user avatar, full name, username, bio, and joined date.
  - Real-time stat counters: **Posts**, **Followers**, and **Following**.
  - User can edit their full name, avatar URL, and bio description.
  - Tabular feed of individual posts created by the specific user.

### 2. Posts & Interactive Comments
- **Rich Post Creation**: Text-based posts supporting hashtags, line breaks, and optional image URL attachments with real-time preview and character counter.
- **Feed Filtering**:
  - **For You**: Global feed of community updates.
  - **Following**: Dynamic personalized feed containing updates exclusively from creators you follow.
  - **Live Search**: Instant keyword search for posts and creators.
- **Interactive Comment System**: Any authenticated user can expand the comment thread under any post and submit real-time comments. Comments display author details and timestamps. Post and comment owners can manage and delete comments.

### 3. Dynamic Relational Like & Follow System
- **Relational Like System**: Relational `likes` table with composite uniqueness (`post_id`, `user_id`). Liking a post toggles dynamically via AJAX/Fetch API with heart pulse animation and live counter updates.
- **Relational Follower/Following**: Dedicated `follows` relational table (`follower_id`, `following_id`). Users can follow/unfollow creators from their profile page or from the "Suggested People" sidebar widget.
- **Dynamic Counters**: Following or liking updates counts instantly across the UI without full page reloads.

---

## 🛠️ Tech Stack

- **Frontend**:
  - Semantic HTML5 & Responsive CSS3 (Glassmorphism dark theme, custom CSS variables, Plus Jakarta Sans typography).
  - Vanilla JavaScript (ES6+ Single Page Application with modular architecture: `api.js`, `state.js`, `ui.js`, `app.js`).
  - Font Awesome 6 icons via CDN.
- **Backend**:
  - Node.js & Express.js REST API.
  - `bcryptjs` for secure password hashing.
  - `jsonwebtoken` (JWT) for authentication and route guarding.
  - `cors` for cross-origin resource sharing.
- **Database**:
  - SQLite with `node:sqlite` (`DatabaseSync`), requiring zero external database installations or background servers.
  - Enforced foreign keys (`PRAGMA foreign_keys = ON;`) with `ON DELETE CASCADE` for referential integrity.
  - Pre-seeded with initial realistic demo creators, posts, comments, likes, and followers.

---

## 📁 Project Directory Structure

```
CodeAlpha_SocialMediaPlatform/
├── package.json               # Project manifest and scripts
├── server.js                  # Main Express application entrypoint
├── test-e2e.js                # Automated end-to-end test suite
├── README.md                  # Comprehensive documentation
├── .gitignore                 # Git ignore rules
├── social.db                  # SQLite database file
├── src/
│   ├── config/
│   │   ├── db.js              # SQLite database schema, constraints & indexes
│   │   └── seed.js            # Initial demo seed data generator
│   ├── middleware/
│   │   └── auth.js            # JWT verification & optional auth middlewares
│   ├── controllers/
│   │   ├── authController.js  # Registration, login, profile retrieval/update
│   │   ├── postController.js  # Post CRUD, feeds & search
│   │   ├── commentController.js # Comment addition, listing & deletion
│   │   ├── likeController.js  # Relational like toggle & queries
│   │   └── followController.js # Follow/unfollow, followers, following & suggestions
│   └── routes/
│       ├── authRoutes.js      # /api/auth endpoints
│       ├── postRoutes.js      # /api/posts endpoints
│       ├── commentRoutes.js   # /api/comments endpoints
│       └── userRoutes.js      # /api/users endpoints
└── public/                    # Frontend client assets (served statically)
    ├── index.html             # Main Single Page Application structure
    ├── css/
    │   └── styles.css         # Modern dark-mode responsive styling
    └── js/
        ├── api.js             # Fetch API service wrapper
        ├── state.js           # Reactive application state store
        ├── ui.js              # DOM rendering, cards & toast notifications
        └── app.js             # Event listeners & lifecycle management
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended; fully tested on Node.js v26)
- npm (v9+)

### Installation

1. Clone or navigate to the project directory:
   ```bash
   git clone https://github.com/bcmoulya2006-arch/CodeAlpha_SocialMediaPlatform.git
   cd CodeAlpha_SocialMediaPlatform
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the application:
   ```bash
   npm start
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:5000
   ```

---

## 👥 Demo Accounts (Pre-Seeded)

For quick testing and evaluation without manual signup, use any of the pre-seeded accounts:

| Username | Full Name | Password | Role / Bio |
| :--- | :--- | :--- | :--- |
| `alex_dev` | Alex Morgan | `password123` | Full Stack Engineer & open source contributor |
| `sarah_tech` | Sarah Lin | `password123` | UI/UX Designer & Frontend Specialist |
| `codealpha_team` | CodeAlpha Team | `password123` | Official CodeAlpha Internship Team |

*You can also click the quick-login buttons directly in the right sidebar or sign up with any new account.*

---

## 🧪 Running Automated Tests

To run the automated 17-point end-to-end verification test suite:

```bash
node test-e2e.js
```

---

## 📡 API Reference Overview

### Authentication
- `POST /api/auth/register` — Create a new user account.
- `POST /api/auth/login` — Sign in and receive JWT token.
- `GET /api/auth/me` — Retrieve authenticated user profile and stats.
- `PUT /api/auth/profile` — Update display name, bio, and avatar.

### Posts
- `GET /api/posts` — Get post stream (`?feed=all|following`, `?username=...`, `?search=...`).
- `POST /api/posts` — Create a new post (Auth required).
- `GET /api/posts/:id` — Get single post with all comments.
- `DELETE /api/posts/:id` — Delete author's post (Auth required).

### Likes
- `POST /api/posts/:postId/like` — Toggle like/unlike on a post (Auth required).
- `GET /api/posts/:postId/likes` — List users who liked a post.

### Comments
- `GET /api/posts/:postId/comments` — Get comments for a post.
- `POST /api/posts/:postId/comments` — Add comment to a post (Auth required).
- `DELETE /api/comments/:commentId` — Delete a comment (Auth required).

### Follows & Users
- `GET /api/users/:username` — Get public profile and follow status.
- `POST /api/users/:userId/follow` — Toggle follow/unfollow a user (Auth required).
- `GET /api/users/:userId/followers` — List user's followers.
- `GET /api/users/:userId/following` — List creators followed by user.
- `GET /api/users/suggested` — List suggested creators to follow.

---

## 📄 License
MIT License. Built for the CodeAlpha Full Stack Web Development Internship.
