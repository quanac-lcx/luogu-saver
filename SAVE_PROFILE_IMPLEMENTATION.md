# Save Profile Feature - Implementation Documentation

## Overview
This document describes the implementation of the "Save Profile" feature, which allows users to save Luogu user profiles with their introduction/bio in markdown format, similar to how articles and pastes are saved.

## Changes Made

### 1. Database Schema (`entities/user.entity.json`)
Added new columns to the `user` table:
- `introduction` (mediumtext): Stores the user's profile introduction/bio in markdown
- `created_at` (timestamp): Record creation timestamp
- `updated_at` (timestamp): Last update timestamp
- Index on `updated_at` for efficient queries

### 2. User Model (`models/user.js`)
Enhanced the User model with:
- `formatDate()`: Formats timestamps for display
- `loadRelationships()`: Placeholder for future relationship loading

### 3. User Service (`services/user.service.js`)
Added new service functions:
- `saveUserProfile(task, obj)`: Saves or updates user profile with introduction
- `getUserProfileById(id)`: Retrieves user profile with rendered markdown (cached for 30 minutes)

### 4. Response Parser (`core/response.js`)
Added support for type 4 (user profiles):
- Parses HTML from `https://www.luogu.com/user/<uid>`
- Extracts user data from `<script id="lentille-context">` JSON
- Returns user object with uid, name, color, and introduction fields

### 5. Fetch Handler (`handlers/common.fetch.handler.js`)
Updated to handle type 4:
- For user profiles, extracts introduction directly from user object
- Creates userData object from user's own data (not from author field)
- Calls upsertUser to ensure user record exists

### 6. Task Processor (`workers/processor.worker.js`)
Added type 4 support:
- Imports `saveUserProfile` from user service
- Added type 4 to c3vkMode mapping (uses 'new' mode)
- Calls `saveUserProfile` for type 4 tasks

### 7. User Routes (`routes/user.route.js`)
Complete rewrite:
- **GET `/user/:uid`**: Displays saved user profile (replaces redirect)
  - Shows profile page with rendered introduction
  - Displays "未保存" state if profile not saved yet
- **GET `/user/save/:uid`**: Queues task to save/update user profile
  - Validates UID
  - Creates task with type 4
  - Returns task ID for progress tracking

### 8. User Profile View (`views/content/user.njk`)
New template for displaying user profiles:
- Shows user avatar and colored username
- Displays "查看原主页" link to https://www.luogu.com.cn/user/<uid>
- "复制原文" button to copy markdown introduction
- "更新资料" button to refresh profile
- Renders markdown introduction with KaTeX support
- Shows "尚未保存内容" message for unsaved profiles

### 9. Request Utilities (`static/self/js/request_utils.js`)
Updated URL parsing and handling:
- `parseUrl()`: Now recognizes `user/123456` format
- Save button: Updated confirmation text to include "用户资料"
- Supports all three content types: article, paste, and user

## Task Type System

The application uses numeric task types:
- **Type 0**: Articles
- **Type 1**: Pastes
- **Type 2**: Benben (crawler callbacks)
- **Type 3**: Judgement records
- **Type 4**: User profiles (NEW)

## API Endpoints

### Save User Profile
```
GET /user/save/:uid
```
- Parameters: `uid` (numeric user ID)
- Returns: `{ success: true, message: "请求已入队", result: taskId }`
- Queues a task to fetch and save the user's profile

### View User Profile
```
GET /user/:uid
```
- Parameters: `uid` (numeric user ID)
- Renders the user profile page with saved introduction
- Shows empty state if not yet saved

## Data Flow

1. User visits `/user/123456`
2. If profile exists in DB:
   - Retrieves from cache/database
   - Renders markdown introduction
   - Displays profile page
3. If profile doesn't exist:
   - Shows empty state
4. User clicks "更新资料":
   - Calls `/user/save/123456`
   - Creates task with type 4
   - Worker fetches `https://www.luogu.com/user/123456`
   - Extracts introduction from `<script id="lentille-context">`
   - Saves to database
   - User refreshes to see updated profile

## Caching Strategy

- User profiles cached for 30 minutes (TTL: 1800)
- Cache key: `user:{uid}`
- Invalidated on profile save
- Statistics cache also invalidated on save

## Migration Notes

To apply the database schema changes:
1. The entity definition in `user.entity.json` will be automatically picked up
2. TypeORM will sync the schema when the application starts
3. Existing user records will have NULL for new columns (introduction, timestamps)
4. No data migration needed as this is a new feature

## Testing

Core functionality tested:
- ✓ Response parsing (type 4) correctly extracts user data
- ✓ All syntax checks pass
- ✓ Entity JSON is valid

Database-dependent features require full application setup with database.

## Language

All user-facing text is in Chinese (zh-cn) as per requirements:
- "用户资料" (user profile)
- "查看原主页" (view original homepage)
- "更新资料" (update profile)
- "个人简介" (personal introduction)
