# 香港学校插班资讯系统 - 完整实现方案 (Implementation Plan)

## 1. 项目概述 (Project Overview)
**目标**：为香港家长提供一个免费、易用的工具，用于查询和管理学校插班（Transfer/Admission）信息。
**核心场景**：
- 家长可能有多个子女，需要针对不同的年级（如中二、中四）、性别（男/女）筛选学校。
- **管理员**需要维护学校基础信息及爬虫目标地址。
- 信息来源多样：学校官网网页（HTML）或 学校发布的通告（PDF）。

## 2. 技术架构 (Technical Architecture)
*   **开发语言**: Go (Golang) - 高性能，适合并发爬虫和 Web 服务。
*   **Web 框架**: Gin 或 Echo - 用于构建 RESTful API 和管理后台。
*   **数据库**: SQLite - 单文件数据库，易于持久化、备份和迁移。
*   **前端技术**:
    *   家长端: 移动端优先的响应式 Web (Mobile-First Web)，界面简洁，专注“档案管理”和“插班追踪”。
    *   管理后台: 简单 Web 界面 (Go Templates 或 React Admin)。
*   **认证机制**: JWT (JSON Web Tokens) + 验证码 (OTP)。
*   **AI/LLM 集成**: 调用 OpenAI/Claude/Gemini API 或本地模型。
    *   **自然语言理解 (NLU)**: 解析用户意图 ("帮我找九龙城 Band 1 男校")。
    *   **智能推荐 (RAG)**:
        *   **简历分析**: 解析用户上传的简历 (PDF/Image)，提取特长 (如: 钢琴八级, 篮球校队, 朗诵冠军)。
        *   **匹配逻辑**: 将学生特长与学校特色 (如: 音乐强校, 体育强校) 进行语义匹配。
    *   **查询生成**: 根据用户描述生成 SQL 查询或向量检索。

## 3. 详细功能设计 (Functional Design)

### 3.1 用户模型与认证 (User & Auth)
*   **家长 (Parent)**
    *   **登录方式**: 手机验证码 (SMS) 或 邮箱验证码 (Email)。
    *   **流程**: 输入手机/邮箱 -> 发送验证码 -> 验证 -> 签发 JWT Token。
*   **管理员 (Admin)**
    *   **登录方式**: 账号密码登录 (或预设的高权限账号)。
    *   **权限**: 管理学校数据、配置爬虫地址、查看系统日志。

### 3.2 核心业务功能 (Core Features)
*   **子女档案 (Child Profile)**: 解决“多子女”场景。
    *   关联家长账号。
    *   属性：姓名、当前年级、性别、目标偏好（地区、宗教、Banding）。
*   **Web 管理后台 (Admin Panel)**:
    *   **学校列表管理**: 增删改查学校基础信息。
    *   **数据源配置**: 编辑学校的 `插班信息 URL` (HTML/PDF 来源)。
    *   **数据修正**: 爬虫抓取失败或不准时，管理员可人工修正“申请时间”、“面试日期”。
*   **家长端 (Mobile Web)**:
    *   **AI 对话助手 (Chatbot)**: 核心入口。用户输入 "我儿子今年中二，想找九龙城的 Band 1 学校"，系统自动解析并返回列表。
    *   **简历匹配**: 上传 PDF/图片简历 -> AI 分析强项 -> 推荐“最匹配”的学校 (例如: "你儿子钢琴很强，推荐这所管弦乐团出色的学校")。
    *   **极简操作**: 手机验证码登录 -> 添加子女档案 (只需几步) -> 查看推荐学校。
    *   **插班进度追踪**: 收藏感兴趣的学校，标记状态（如：已报名、待面试、等待结果）。
    *   **通知**: 当收藏的学校有新动态（如公布面试时间）时提醒。

### 3.3 数据库模型 (Database Schema)

1.  **`users` (用户表 - 家长 & 管理员)**
    *   `id`: PK
    *   `role`: 'parent' | 'admin'
    *   `identifier`: 手机号或邮箱
    *   `password_hash`: (管理员用，家长为空)
    *   `created_at`: 时间戳

2.  **`otp_codes` (验证码临时表)**
    *   `identifier`: 手机号/邮箱
    *   `code`: 验证码
    *   `expires_at`: 过期时间

3.  **`child_profiles` (子女档案)**
    *   `id`: PK
    *   `parent_id`: FK -> users.id
    *   `name`: 昵称
    *   `current_grade`: 当前年级
    *   `gender`: 性别
    *   `target_districts`: 目标地区
    *   `resume_text`: 简历解析后的纯文本 (AI 提取的关键词，如 "Math Olympiad, Grade 8 Piano")

4.  **`schools` (学校基础表)**
    *   `id`: PK
    *   `name_cn`, `name_en`
    *   `category`, `gender`, `religion`, `district`, `school_net`, `banding`
    *   `tags`: 学校特色标签 (AI 生成，如 "STEM强校", "重视音乐", "田径")
    *   `website_home`: 学校官网主页
    *   `website_admission`: **插班资讯特定页面 URL** (管理员重点维护此字段)

5.  **`admission_events` (插班活动表)**
    *   `id`: PK
    *   `school_id`: FK
    *   `academic_year`, `target_grade`
    *   `application_start`, `application_end`
    *   `interview_date`
    *   `source_url`: 具体的通告链接 (PDF/HTML)

6.  **`applications` (申请追踪表)**
    *   `id`: PK
    *   `child_id`: FK -> child_profiles.id
    *   `school_id`: FK -> schools.id
    *   `status`: 'interested' (收藏) | 'applied' (已报名) | 'interview' (面试中) | 'offer' (录取) | 'rejected'
    *   `notes`: 家长备注
    *   `updated_at`: 最后更新时间

### 3.4 数据获取与处理 (Data Acquisition)
*   **A. 网页爬虫 (Web Crawler)**: 根据 `schools.website_admission` 字段定期抓取。
*   **B. PDF 解析器 (PDF Parser)**: 提取通告 PDF 中的关键日期。

## 4. 实施路线图 (Roadmap)

### 第一阶段：基础设施与数据库 (Phase 1: Infra & DB)
1.  初始化 Go + Gin 项目。
2.  实现 SQLite 数据库连接与建表 (GORM 或 sqlx)。
3.  实现 JWT 中间件和 OTP 发送接口 (Mock 模式，暂不接真实短信商)。

### 第二阶段：Web 管理后台 (Phase 2: Admin Panel)
1.  实现管理员登录 API。
2.  实现“学校管理”接口：CRUD 学校信息，特别是录入 `website_admission` 链接。
3.  开发简单的管理前端页面 (列表、编辑表单)。

### 第三阶段：核心业务 - 爬虫与档案 (Phase 3: Core Logic)
1.  实现爬虫逻辑：读取数据库中的 URL -> 抓取 -> 解析 -> 存入 `admission_events`。
2.  实现家长端的“子女档案”管理接口。
3.  实现基于档案的“插班信息查询”接口。

### 第四阶段：家长端 UI 与验证 (Phase 4: Client UI & Verify)
1.  开发家长端 Web 页面 (登录 -> 建档 -> 查询)。
2.  集成测试：管理员录入 URL -> 爬虫抓取 -> 家长端看到筛选后的结果。
