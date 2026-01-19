# PointSelecter - 图像坐标标注与导出工具

一个基于 Node.js + Express 的网页应用，用于上传图片、设置三点坐标系进行校准、添加识别点并进行标签管理与数据导出。界面简洁美观，操作高效友好。

## 目录
- 项目简介
- 功能介绍
- 快速开始
- 使用说明
- 键盘与鼠标操作
- 界面结构
- 坐标系统与算法说明
- 数据结构与导出格式
- 接口与后端说明
- 项目结构
- 常见问题与排错
- 安全与隐私
- 后续规划
- 许可证

## 项目简介
- 通过在图片上设置三个定位点（红色），建立图片像素到真实世界坐标的映射关系（仿射变换）。
- 校准完成后，可添加识别点（蓝色），自动计算其真实坐标，并对识别点进行勾选、批量删除、标签管理与数据导出（JSON/XML）。

## 功能介绍
- 图片上传：支持 JPG、PNG，上传后立即展示。
- 三点校准：
  - 必须设置三类参考点：
    - 原点：`(0, 0)`
    - X 轴顶点：`(x, 0)`（例如 `7000, 0`）
    - Y 轴顶点：`(0, y)`（例如 `0, 800`）
  - 校验通过后，允许添加识别点。
- 识别点（蓝色）：
  - 点击图片添加，ID 从 1 自增。
  - 自动计算真实坐标，表格展示坐标与标签。
  - 可单选、多选（Ctrl/Command/c 键）、批量删除。
- 标签管理：
  - 勾选识别点后，支持批量添加标签；标签在表格和图片点位旁显示。
- 数据导出：
  - 导出 JSON 或 XML，按标签分组。
  - 未设置标签的点归为 `Unlabeled`。

## 快速开始
- 环境要求：安装 [Node.js](https://nodejs.org/)
- 安装依赖：
  ```bash
  npm install
  ```
- 启动服务：
  ```bash
  npm start
  ```
- 打开浏览器访问：`http://localhost:3000`

## 使用说明
- 1）上传图片：
  - 首页点击“Select Image”选择 JPG/PNG 文件。
  - 上传成功后进入工作区。
- 2）设置定位点（校准）：
  - 点击“Add Location Point”，在图片点击添加红色定位点。
  - 在右侧 “Location Points (Reference)” 面板中，为每个定位点输入真实坐标。
  - 必须同时包含：原点 `(0,0)`、X 轴顶点 `(x,0)`、Y 轴顶点 `(0,y)`。
  - 校准成功后，“Add Recognition Point”按钮变为可用（否则禁用）。
- 3）添加识别点：
  - 点击“Add Recognition Point”，在图片点击添加蓝色识别点。
  - 识别点的真实坐标自动计算并显示在右侧表格；每一行可删除该点。
- 4）选择与批量操作：
  - 使用表格中的“全选”复选框统一勾选/取消。
  - 使用“Delete Selected”批量删除已勾选识别点。
  - 点击识别点进行选择；与表格复选框状态联动。
  - 支持组合键与框选（详见下一节）。
- 5）标签管理：
  - 勾选目标识别点后，点击“Add Label”按钮添加标签。
  - 保存后，标签会显示在表格和图片点位旁。
- 6）导出数据：
  - 点击“Export JSON”或“Export XML”导出按标签分组的识别点坐标数据。

## 键盘与鼠标操作
- p：切换到“添加识别点”模式（需完成三点校准）
- d：删除所有“已选中”的识别点
- a：打开“添加标签”对话框（需至少选择一个识别点）
- 鼠标点击识别点：选中该点；按住 `Ctrl`（或 macOS 的 `Command`）再点击可多选/取消
- 按住 `c` 键：按住不放并点击识别点进行多选/取消选择（与 Ctrl/Command 行为一致）
 

## 界面结构
- 顶部导航：项目标题。
- 左侧图片区域：
  - 工具按钮：Add Location Point / Add Recognition Point。
  - 图片显示层与点位渲染层（红/蓝点），支持点选。
- 右侧控制面板：
  - Location Points (Reference)：定位点列表、坐标输入、删除。
  - Recognition Points：识别点表格（ID、坐标、标签、复选框、删除）、“Add Label” 和 “Delete Selected”。
  - Export：导出为 JSON 或 XML。

## 坐标系统与算法说明
- 三点仿射变换：
  - 目标：将图片像素坐标 `(x_img, y_img)` 映射为真实坐标 `(x, y)`。
  - 模型：
    ```
    x = a*x_img + b*y_img + c
    y = d*x_img + e*y_img + f
    ```
  - 使用三组已知对应点（图片像素坐标与真实坐标），构造 3x3 线性方程组，分别求解 `[a,b,c]` 与 `[d,e,f]`（见 [CoordinateSystem.js](file:///Users/luoruofeng/Desktop/PointSelecter/public/js/CoordinateSystem.js)）。
  - 校准失败的常见原因：三点共线、输入坐标不满足 `(0,0)、(x,0)、(0,y)` 规则。

## 数据结构与导出格式
- 识别点对象（简化）：
  ```
  { id: number, x: number, y: number, realX: number, realY: number, selected: boolean, label: string }
  ```
- JSON 导出示例（按标签分组）：
  ```json
  {
    "Connector_A": [
      { "id": 1, "x": 100.5, "y": 200.2 },
      { "id": 3, "x": 150.0, "y": 260.0 }
    ],
    "Unlabeled": [
      { "id": 2, "x": 120.0, "y": 240.0 }
    ]
  }
  ```
- XML 导出示例：
  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <points>
    <group label="Connector_A">
      <point id="1" x="100.5" y="200.2"/>
      <point id="3" x="150" y="260"/>
    </group>
    <group label="Unlabeled">
      <point id="2" x="120" y="240"/>
    </group>
  </points>
  ```

## 接口与后端说明
- 文件上传接口：`POST /upload`
  - 表单字段：`image`（文件）
  - 响应：
    ```json
    { "message": "File uploaded successfully", "filePath": "/uploads/xxx.png" }
    ```
  - 实现位置：[server.js](file:///Users/luoruofeng/Desktop/PointSelecter/server.js)
- 静态资源：
  - 前端页面与脚本：`/public` 目录（通过 Express 静态服务提供）。
  - 上传文件访问：`/uploads` 静态目录。

## 项目结构
- 后端
  - [server.js](file:///Users/luoruofeng/Desktop/PointSelecter/server.js)：Express 服务与上传处理
- 前端（public）
  - [index.html](file:///Users/luoruofeng/Desktop/PointSelecter/public/index.html)：页面结构与 UI
  - [style.css](file:///Users/luoruofeng/Desktop/PointSelecter/public/css/style.css)：样式与点位视觉
  - [ImageEditor.js](file:///Users/luoruofeng/Desktop/PointSelecter/public/js/ImageEditor.js)：图片交互与点位渲染、选择
  - [CoordinateSystem.js](file:///Users/luoruofeng/Desktop/PointSelecter/public/js/CoordinateSystem.js)：坐标变换与校准计算
  - [main.js](file:///Users/luoruofeng/Desktop/PointSelecter/public/js/main.js)：应用控制、事件绑定、导出逻辑

## 常见问题与排错
- “Add Recognition Point” 按钮不可用：
  - 请确认已添加至少 3 个定位点，且坐标分别满足 `(0,0)`、`(x,0)`、`(0,y)`。
- 识别点坐标不合理或无变化：
  - 检查三点是否不共线；重新输入并确保格式正确。
- 框选/多选无效：
  - 框选模式需点击 “Marquee Select” 按钮后进行；多选需按住 `Ctrl/Command` 或 `c` 键进行点击。
- 上传失败：
  - 确认图片格式为 JPG/PNG；检查后端控制台日志。

## 安全与隐私
- 上传的图片仅保存在本机的 `uploads/` 目录，通过本地服务器访问，不会外传。
- 请勿上传包含敏感信息的图片至公共环境。

## 后续规划
- 支持缩放/拖拽视图与小地图导航。
- 支持自定义导出字段与标签层级。
- 增加撤销/重做与快捷键自定义。

## 许可证
- 开源许可证见项目根目录 [LICENSE](file:///Users/luoruofeng/Desktop/PointSelecter/LICENSE)。

---

## 快捷键速查
- p：进入“添加识别点”模式（需完成三点校准）
- d：删除所有“已选中”的识别点
- a：打开“添加标签”弹窗（需至少选择一个识别点）
- c（按住不放）：点击识别点进行多选/取消选择（与 Ctrl/Command 行为一致）
- 鼠标点击识别点：选中该点；Ctrl/Command 点击多选

## 开发者指南
- 模块职责概览：
  - [server.js](file:///Users/luoruofeng/Desktop/PointSelecter/server.js)：Express 服务、静态资源提供、图片上传（multer），返回 `filePath` 供前端显示
  - [index.html](file:///Users/luoruofeng/Desktop/PointSelecter/public/index.html)：页面结构、按钮与面板布局、弹窗
  - [style.css](file:///Users/luoruofeng/Desktop/PointSelecter/public/css/style.css)：视觉样式、点位样式（红/蓝点、选择框）
  - [ImageEditor.js](file:///Users/luoruofeng/Desktop/PointSelecter/public/js/ImageEditor.js)：图片交互与点位渲染、选择模型（单选/多选/框选）、批量删除
  - [CoordinateSystem.js](file:///Users/luoruofeng/Desktop/PointSelecter/public/js/CoordinateSystem.js)：三点仿射变换校准与坐标转换
  - [main.js](file:///Users/luoruofeng/Desktop/PointSelecter/public/js/main.js)：应用控制、事件绑定、列表渲染、校准验证与导出
- 关键 API（前端）：
  - ImageEditor：
    - `setMode(mode)`：切换 `none/location/recognition`
    - `addLocationPoint(x,y)` / `addRecognitionPoint(x,y)`：添加点
    - `removeRecognitionPoint(id)` / `removeSelectedRecognitionPoints()`：删除单点/批量
    - `updateRecognitionPointsCoords(transformer)`：批量更新识别点真实坐标
    - `setLabelForSelected(label)`：为所有选中识别点设置标签
    - `renderPoints()` / `refreshPositions()`：渲染与在窗口大小变化时刷新
    - 事件回调：`onPointAdded(type, point)`、`onPointSelected(point?)`
  - CoordinateSystem：
    - `calibrate(imgPoints, realPoints)`：用 3 组点求变换参数（Cramer 方法），设置 `isValid`
    - `transform(x_img, y_img)`：将像素坐标映射为真实坐标
- 数据流：
  - 点击图片添加点 -> `ImageEditor` 更新内存数据并渲染 -> `main.js` 监听事件更新右侧列表
  - 输入定位点真实坐标 -> `main.js` 验证三点格式 -> `CoordinateSystem.calibrate` -> 更新识别点真实坐标并刷新列表
  - 选择 -> `ImageEditor` 更新 `selected` 状态 -> `main.js` 刷新表格勾选与“全选”

## 配置与扩展
- 端口号：
  - 默认 `3000`，修改位置：[server.js](file:///Users/luoruofeng/Desktop/PointSelecter/server.js) 中 `const port = 3000;`
- 上传类型与大小：
  - 允许 `image/png`、`image/jpeg`、`image/jpg`；可在 `multer` 的 `fileFilter` 中扩展
  - 上传目录为 `uploads/` 并通过 `/uploads` 静态提供
- 导出精度与格式：
  - 表格展示坐标使用 `toFixed(2)`，导出文件保留原始数值（如需统一保留小数位，可在 `main.js` 的导出逻辑中调整）
  - JSON 以标签为 key 分组；XML 以 `<group label=\"...\">` 分组
- 样式定制：
  - 点大小、颜色、选中高亮可在 [style.css](file:///Users/luoruofeng/Desktop/PointSelecter/public/css/style.css) 中 `.point*` 的样式调整
- 扩展建议：
  - 支持缩放/拖拽与小地图
  - 导出字段可配置（含时间戳、图像名称、单位等）
  - 撤销/重做与自定义快捷键

## 注意事项
- 三点请尽量选择在图像范围内且分散位置，避免共线以确保仿射变换可解
- 注意事项
- 若“Add Recognition Point”按钮不可用，检查定位点是否满足 `(0,0)、(x,0)、(0,y)` 且已全部输入完成

## 浏览器兼容
- 推荐使用最新版 Chrome / Edge / Safari 等现代浏览器

## 示例工作流程（简版）
- 上传图片 -> 设置三点坐标并校准 -> 进入识别点模式添加蓝点 -> 勾选识别点并添加标签 -> 导出 JSON/XML
