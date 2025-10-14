# Save Profile Feature - Visual Guide

## Feature Overview

The Save Profile feature allows users to save and view Luogu user profiles, including their personal introduction/bio in markdown format.

## User Interface Elements

### 1. Profile Page Header
```
用户 - [Username]
最后更新于 [Timestamp]
```

### 2. User Information Section
- **User Avatar**: Displays the user's Luogu avatar (from cdn.luogu.com.cn)
- **Username**: Displayed with appropriate color coding (matching Luogu's user level colors)
- Located in a card with "用户信息" label

### 3. Action Buttons
When profile is saved (`not empty`):
- **查看原主页** - Links to `https://www.luogu.com.cn/user/<uid>`
- **复制原文** - Copies the markdown introduction to clipboard
- **更新资料** - Fetches and updates the profile from Luogu

When profile is not saved (`empty`):
- **更新资料** - Only this button is shown

### 4. Content Display Area
**When profile is saved:**
- Displays rendered markdown content of user's introduction
- Supports LaTeX math rendering via KaTeX
- Full markdown features (headers, lists, code blocks, etc.)

**When profile is not saved:**
```
🛈 (info icon)
尚未保存内容
请点击上方的"更新资料"按钮以保存用户资料
```

## User Flow

### Viewing a User Profile

1. **Navigate to profile**
   ```
   URL: /user/123456
   ```

2. **First time viewing (not saved)**
   - Shows empty state with user ID
   - "尚未保存内容" message displayed
   - Only "更新资料" button available

3. **After saving**
   - Shows user's name with colored badge
   - Displays last update timestamp
   - All three buttons available
   - Introduction rendered as HTML from markdown

### Saving/Updating a Profile

1. **User clicks "更新资料"**
   - Confirmation dialog: "确定要保存这个用户资料吗？"
   - User clicks "确定"

2. **Request processing**
   - Shows loading indicator: "正在保存..."
   - Request sent to `/user/save/123456`
   - Task queued with type 4

3. **Success response**
   - Dialog: "请求已入队"
   - Message: "您的请求已加入队列，任务 ID: [tid]"
   - Options: "查看进度" or "继续保存"

4. **Background processing**
   - Worker fetches `https://www.luogu.com/user/123456`
   - Extracts user data from `<script id="lentille-context">`
   - Saves to database with introduction

5. **View updated profile**
   - User refreshes page or navigates back
   - Profile now shows saved introduction content

## Data Extracted from Luogu

From the JSON in `<script id="lentille-context">`:
```json
{
  "data": {
    "user": {
      "uid": 123456,
      "name": "用户名",
      "color": "Blue",
      "introduction": "# 个人简介\n\n用户的自我介绍..."
    }
  }
}
```

## Technical Details

### URL Patterns
- View profile: `/user/<uid>` (e.g., `/user/123456`)
- Save profile: `/user/save/<uid>` (e.g., `/user/save/123456`)

### Database Fields
- `id` (int): User ID
- `name` (varchar): Username
- `color` (varchar): User level color
- `introduction` (mediumtext): Markdown bio/introduction
- `created_at` (timestamp): Record creation time
- `updated_at` (timestamp): Last update time

### Caching
- Cached for 30 minutes (TTL: 1800 seconds)
- Cache key: `user:{uid}`
- Invalidated on save operation

### Task Type
- Type: 4
- URL pattern: `https://www.luogu.com/user/<uid>`
- Processing mode: c3vk='new'

## Comparison with Article/Paste Features

| Feature | Article | Paste | User Profile (NEW) |
|---------|---------|-------|-------------------|
| View URL | `/article/<id>` | `/paste/<id>` | `/user/<uid>` |
| Save URL | `/article/save/<id>` | `/paste/save/<id>` | `/user/save/<uid>` |
| Task Type | 0 | 1 | 4 |
| Content Field | `content` | `content` | `introduction` |
| ID Format | 8-char string | 8-char string | Numeric UID |
| Original Link | luogu.com/article | luogu.com/paste | luogu.com.cn/user |
| Button Text | 查看原专栏 | 查看原剪贴板 | 查看原主页 |
| Update Button | 更新内容 | 更新内容 | 更新资料 |

## Language (zh-cn)

All UI text is in Chinese as required:
- 用户 - User
- 用户信息 - User Information
- 查看原主页 - View Original Homepage
- 复制原文 - Copy Original Text
- 更新资料 - Update Profile
- 尚未保存内容 - Not Yet Saved
- 请点击上方的"更新资料"按钮以保存用户资料 - Please click the "Update Profile" button above to save user profile
- 确定要保存这个用户资料吗？ - Are you sure you want to save this user profile?
- 正在保存... - Saving...
- 请求已入队 - Request Queued
- 最后更新于 - Last Updated At
