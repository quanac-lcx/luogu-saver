# Banner 功能说明

## 功能概述

为洛谷保存站添加了 Banner 横幅功能，可在页面顶部显示多条通知横幅，支持后台管理。

## 功能特性

- ✅ 支持多条 Banner，垂直排列显示
- ✅ 每个 Banner 可配置独立的背景颜色
- ✅ 支持 HTML 内容
- ✅ 圆角设计，美观大方
- ✅ 可通过点击 × 按钮关闭
- ✅ 关闭状态保存到 localStorage，刷新后不再显示
- ✅ 平滑的展开和收起动画
- ✅ 后台完整的 CRUD 管理功能
- ✅ 实时预览效果

## 配置说明

### settings.json 结构

```json
{
  "announcement": {
    "content": "欢迎使用洛谷保存站！如遇问题请及时反馈。",
    "enabled": true
  },
  "banners": [
    {
      "content": "🎉 欢迎来到洛谷保存站！",
      "color": "#667eea",
      "enabled": true
    },
    {
      "content": "📢 系统维护通知：本周末将进行系统升级维护",
      "color": "#f59e0b",
      "enabled": true
    }
  ]
}
```

### Banner 配置字段

- `content` (string): Banner 的内容，支持 HTML
- `color` (string): 背景颜色，使用十六进制颜色值，如 `#667eea`
- `enabled` (boolean): 是否启用该 Banner

## 使用方法

### 后台管理

1. 访问 `/admin/banners` 进入 Banner 管理页面
2. 点击"添加 Banner"按钮创建新的 Banner
3. 编辑 Banner 内容、设置背景颜色
4. 勾选"启用此 Banner"启用该横幅
5. 查看预览效果
6. 点击"保存所有更改"保存

### 删除 Banner

在 Banner 编辑区域右上角点击红色垃圾桶图标即可删除。

### 前台显示

- 启用的 Banner 会自动显示在页面顶部
- 用户可以点击 × 按钮关闭不想看到的 Banner
- 关闭状态会保存，刷新页面后不会再次显示

## 技术实现

### 新增文件

- `middleware/banners.js`: Banner 中间件，自动加载 banners 到所有页面
- `views/admin/banners.njk`: Banner 管理页面模板

### 修改文件

- `app.js`: 添加 banners 中间件
- `routes/admin.route.js`: 添加 Banner 管理路由
- `services/admin.service.js`: 添加 Banner CRUD 服务函数
- `services/settings.service.js`: 添加获取 banners 函数
- `views/layout.njk`: 添加 Banner 显示区域和样式
- `views/admin/dashboard.njk`: 添加 Banner 管理入口
- `settings.example.json`: 添加 banners 配置示例

### API 端点

- `GET /admin/banners`: 访问 Banner 管理页面
- `POST /admin/api/banners`: 更新 Banner 配置

## 注意事项

1. Banner 内容支持 HTML，请注意防止 XSS 攻击
2. 颜色值需使用十六进制格式，如 `#667eea`
3. 关闭的 Banner 信息存储在浏览器 localStorage 中
4. 只有启用的 Banner 才会在前台显示
5. Banner 配置存储在 settings.json 中，需要有文件写入权限
