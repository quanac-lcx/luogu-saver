# 公告管理功能说明

## 功能概述

为洛谷保存站主页添加了公告管理功能，管理员可以通过后台界面编辑和管理主页公告内容。

## 主要特性

- ✅ 支持 HTML 格式的公告内容
- ✅ 实时预览功能
- ✅ 可启用/禁用公告显示
- ✅ 使用 JSON 文件存储（settings.json）
- ✅ 集成到管理后台
- ✅ 使用 logError 函数记录错误

## 文件结构

### 新增文件

1. **services/settings.service.js**
   - `getSettings()`: 获取系统设置
   - `getAnnouncement()`: 获取公告内容

2. **views/admin/announcement.njk**
   - 公告编辑页面
   - 实时预览功能
   - 启用/禁用开关

3. **settings.example.json**
   - 示例配置文件

### 修改文件

1. **services/admin.service.js**
   - 添加 `getSettings()`: 获取系统设置
   - 添加 `updateAnnouncement()`: 更新公告内容

2. **routes/admin.route.js**
   - `GET /admin/announcement`: 公告管理页面
   - `POST /admin/api/announcement`: 更新公告 API

3. **routes/index.route.js**
   - 加载公告数据传递给首页视图

4. **views/index.njk**
   - 显示公告内容（支持 HTML）
   - 根据 enabled 状态控制显示

5. **views/admin/dashboard.njk**
   - 添加公告管理入口卡片

## 使用方法

### 管理员操作

1. 登录管理后台
2. 在仪表板点击"公告管理"卡片
3. 在编辑器中输入公告内容（支持 HTML）
4. 使用实时预览查看效果
5. 勾选"启用公告"复选框
6. 点击"保存"按钮

### 配置文件

settings.json 示例：
```json
{
	"announcement": {
		"content": "欢迎使用洛谷保存站！如遇问题请及时反馈。",
		"enabled": true
	}
}
```

## 技术说明

### 已挂载的全局变量
根据 app.js，以下变量已挂载到 global，无需 import：
- `logger`: 日志记录器
- `renderer`: Markdown 渲染器
- `worker`: 工作线程
- `redis`: Redis 管理器
- `listener`: WebSocket 监听器

### 错误处理
使用 `logError()` 函数记录错误（来自 core/errors.js）：
- 自动记录到数据库和控制台
- 根据错误类型选择日志级别
- 支持请求上下文信息

### 数据存储
采用 JSON 文件存储方式（类似 accounts.json）：
- 文件位置: `settings.json`
- 示例文件: `settings.example.json`
- 已添加到 .gitignore

## API 接口

### GET /admin/announcement
返回公告管理页面

### POST /admin/api/announcement
更新公告内容

请求体：
```json
{
  "content": "公告内容（支持 HTML）",
  "enabled": true
}
```

响应：
```json
{
  "success": true,
  "message": "公告更新成功"
}
```
