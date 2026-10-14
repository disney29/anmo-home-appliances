# ANMO HOME APPLIANCES — 美发个护电器出口 B2B 外贸独立站

一套完整可部署的静态外贸独立站源码（义乌安墨 ANMO 美发个护电器出口站，8 大分类 16 款产品：电推剪 / 剃须刀 / 鼻毛与修容 / 美容脱毛 / 宠物护理 / 直发造型 / 吹风机 / 套装配件）。深蓝 + 橙国际化版式，英文为主、八国语言（中 / 英 / 越 / 泰 / 印尼 / 西 / 法 / 葡），前端展示 + 可视化后台 + 海外支付三大模块，原生 SEO 与海外合规配置。所有版面文字、联系方式、公司信息、产品资料均可在后台增删改查。

## 核心功能（当前版本）

- **8 语全站**：英语为主，含简体中文、越南语、泰语、印尼语、西班牙语、法语、葡萄牙语；语言切换全站联动（导航、产品、询盘、购物车、后台弹窗）。
- **购物车**：多款产品加入购物车后一次性填写联系信息并结算；数量可改、低于 MOQ 红字提示；订单含全部产品明细；支付支持 PayPal（美元原值收款）与银行转账。
- **货币策略**：前台统一美元（USD）报价，符合外贸采购惯例；后台产品列表按汇率显示人民币参考价（仅供你核算成本），设置页保留汇率输入。
- **可视化后台**（admin.html，密码 admin123）：产品/分类/内容/询盘/订单/客服/设置全 CRUD；后台修改存本机，要让全站访客生效请用「设置 → 导出配置」生成 data-override.js 上传，或走在线 CMS。
- **外贸要素**：Incoterms 运输术语（FOB/EXW/FAS/FCA/CPT/CIP/CFR/CIF/DAP/DPU/DDP）+ 单位（pcs/pack/case/set/dozen）逐产品配置；MOQ、认证、交期、OEM/ODM 展示；谷歌地图、WhatsApp 直达、12 小时回复承诺。
- **合规与 SEO**：GDPR/CCPA Cookie 同意弹窗、隐私政策页、JSON-LD 结构化数据、sitemap/robots、8 语 hreflang、GA 代码预留位。

## 目录结构

```
外贸独立站/
├── index.html          首页（轮播/优势/产品分类/客户见证/市场/报价表单）
├── products.html       产品页（分类筛选/搜索/询价/在线下单支付）
├── product.html        产品独立详情页（?id=p1…p16，利于 Google 收录，可挂产品资料/说明书/认证文件）
├── about.html          关于我们（历程/工厂实景/质控/认证/OEM·ODM）
├── contact.html        联系页（询盘表+附件/谷歌地图/12小时承诺）
├── privacy.html        隐私政策（GDPR/COOKIE 合规）
├── admin.html          可视化后台（登录后管理全部数据）
├── css/style.css       全局样式（响应式）
├── js/
│   ├── i18n.js         多语言引擎
│   ├── data.js         默认数据 + localStorage 存储层
│   ├── content-data.js 首页/关于页全部文案数据（8 语）
│   ├── site-content.js 文案渲染引擎（后台改完全站实时生效）
│   ├── product-detail.js 产品详情页渲染器
│   ├── app.js          公共交互（导航/Cookie/聊天/表单）
│   ├── products.js     产品网格/筛选/询价/下单支付
│   └── admin.js        后台管理（内容/产品/询盘/订单/客服/设置 CRUD）
├── langs/              en/zh/vi/th/id/es/fr/pt 八个语言包
├── assets/
│   ├── images/         工厂实景 + 产品分类图（本地化，无外链）
│   ├── docs/           （可选）产品资料/认证 PDF，放这里后在后台填写相对路径
│   └── favicon.svg
├── sitemap.xml         站点地图（含 16 个产品详情页 URL）
├── robots.txt
└── .htaccess           Apache 安全/压缩/缓存配置
```

## 一键部署（海外服务器）

### 方式 A：Nginx（推荐，海外 VPS 常见）

1. 把整个文件夹内容上传到服务器站点目录（如 `/var/www/html`）。
2. Nginx 站点配置示例：

```
server {
    listen 80;
    server_name yourdomain.com www.anmo-kemei.com;
    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    location ~* \.(jpg|jpeg|png|svg|css|js)$ {
        expires 30d;
        add_header Cache-Control "public";
    }
}
```

3. `sudo nginx -t && sudo systemctl reload nginx`，并配置 SSL（`certbot --nginx`）启用 HTTPS。

### 方式 B：Apache（共享主机 / cPanel）

1. 压缩整个文件夹 → 上传到 `public_html` → 解压。
2. `.htaccess` 已随包附带（安全头 / 压缩 / 缓存），确认主机已启用 mod_headers、mod_deflate、mod_expires。
3. 在主机面板申请免费 SSL 后，取消 `.htaccess` 中 HTTPS 跳转段的注释。

### 方式 C：对象存储静态托管（Cloudflare Pages / Vercel / Netlify）

直接把整个文件夹拖入对应平台的部署界面即可，零服务器配置。

### 方式 D（推荐上线方案）：Cloudflare Pages + GitHub + 在线 CMS

**在线上直接改文字、联系方式、产品、图片，保存后自动重新发布，全站（含 8 国语言）即时生效。**

数据流：在线后台（`https://你的域名/cms/`，Decap CMS）→ 保存自动提交 GitHub 仓库 → Cloudflare Pages 检测到推送自动执行 `node tools/build.js` → 生成 `js/data-override.js` 并发布 → 全站访客看到新内容。

**首次部署步骤（保姆式）：**

1. **注册 GitHub**（https://github.com/signup），登录后点右上角 `+` → New repository → 仓库名随意（如 `anmo-site`），选择 **Private（私有）**，不要勾选任何初始化选项 → Create。
2. **把本站源码推送到该仓库**：
   - 电脑上安装 Git（https://git-scm.com/download/win，一路 Next）。
   - 在项目文件夹地址栏输入 `cmd` 回车，依次粘贴执行：
     ```
     git init
     git add .
     git commit -m "first release"
     git branch -M main
     git remote add origin https://github.com/你的用户名/anmo-site.git
     git push -u origin main
     ```
   - 提示登录时选择"Sign in with your browser"，用 GitHub 账号授权即可。
3. **注册 Cloudflare**（https://dash.cloudflare.com/sign-up），添加你的域名并完成 DNS 接入（按要求去域名注册商把 Nameserver 改成 Cloudflare 给的两个）。
4. **创建 Pages 项目**：Workers & Pages → Create → Pages → Connect to Git → 授权并选择刚建的仓库 → 构建配置填：
   - 构建命令：`node tools/build.js`
   - 输出目录：`out`
   - 环境变量（Settings → Environment variables → Production）：`NODE_VERSION` = `22`
5. **给 CMS 创建 GitHub OAuth 应用**：GitHub → Settings → Developer settings → OAuth Apps → New OAuth App：
   - Homepage URL：`https://你的域名`
   - Authorization callback URL：`https://你的域名/api/callback`
   - 创建后记下 Client ID，点击 Generate a new client secret 复制 Client Secret。
6. **把两个密钥配到 Cloudflare**：Pages 项目 → Settings → Environment variables → 新增：
   - `OAUTH_GITHUB_CLIENT_ID` = 刚复制的 Client ID
   - `OAUTH_GITHUB_CLIENT_SECRET` = 刚复制的 Client Secret
   - 保存后点 **Retry deployment** 重新部署一次。
7. **修改两处真实信息**（部署前必须做）：
   - `cms/config.yml` 开头：`repo: 你的用户名/仓库名`、`base_url: https://你的域名`
   - 全部 HTML 里的占位域名、邮箱、WhatsApp、电话、地址、收款信息（见下方表格），**或**直接在线上后台改。
8. 重新 `git add . && git commit -m "config" && git push`，等待部署完成（约 1 分钟），打开 `https://你的域名/cms/` 用 GitHub 登录即可在线编辑。

**日常更新**：打开 `https://你的域名/cms/` → 选「产品管理 / 首页与关于页内容 / 联系方式与设置」→ 修改 → Publish。1 分钟内全站生效。新增产品点「产品列表」右上角 Add。上传图片会进入 `assets/uploads/`，路径会自动填入。

## 上线前必须替换的占位信息

| 项目 | 位置 |
| --- | --- |
| 域名 `https://www.anmo-kemei.com` | 全部 HTML 的 canonical / hreflang / og / JSON-LD 链接、sitemap.xml、robots.txt |
| 邮箱 `sales-yiwu@anmo-kemei.com` | 后台「设置」或 `js/data.js` 默认值 |
| 电话 / WhatsApp 号码 | 后台「设置」 |
| 地址 | 后台「设置」 |
| PayPal 收款邮箱 | 后台「设置」→ 支付 |
| 银行收款信息 | 后台「设置」→ 支付 |
| 谷歌地图嵌入地址 | 后台「设置」（当前为义乌荷叶塘） |
| Google Analytics ID | 后台「设置」→ 填入后自动启用 gtag（未填不加载） |
| 管理密码 | 默认 `admin123`，登录后在后台「设置」中修改 |

## 后台使用说明（重点）

后台地址：`admin.html`，默认密码 `admin123`（上线后请立即修改）。

### 1. 内容管理（新增：全站文字可改）

侧栏「Content」→ 三个子页签：

- **Homepage Blocks**：首页全部区块（轮播 3 张、数据栏 4 项、优势 3 项、产品分类说明、为什么选我们 6 项、客户见证 4 条、目标市场 6 条、报价表单特性 4 条），每条可增 / 删 / 上移 / 下移，每个字段支持 8 语。
- **About Blocks**：关于页（公司故事、发展时间轴、工厂实景、质控流程、认证展示、OEM/ODM 能力）。
- **Section Titles**：各区块的标题 / 副标题（8 语）。

### 2. 产品管理（新增：详情页与产品资料）

侧栏「Products」→ 编辑任一产品，折叠区可填：

- **多语言产品名 / 多语言描述**（8 语）
- **Gallery**：逗号分隔的图片路径（如 `assets/images/p1-a.jpg, assets/images/p1-b.jpg`），详情页显示缩略图切换
- **Datasheet / Cert File**：产品资料 / 认证 PDF 的相对路径（如 `assets/docs/p1-spec.pdf`）——把 PDF 放进 `assets/docs/` 后填路径，详情页即出现下载按钮，海外买家可下载说明书与认证文件

### 3. 设置 → 导出配置（新增：让全站访客看到你的修改）

后台所有修改默认保存在**当前浏览器 localStorage**（只有你自己看得到）。要让**所有访客**生效：

1. 改完内容 / 产品 / 设置后，打开「Settings」→ **Export Override**，会下载一个 `data-override.js` 文件；
2. 把该文件上传到网站根目录（与 index.html 同级）；
3. 全站访客访问时自动加载它，你的修改对所有人生效；以后再次修改只需重新导出覆盖即可。

### 4. 询盘 / 订单 / 客服

询盘、订单、聊天记录在后台对应页签查看与导出 CSV。注意：本交付为**纯前端静态站点**，数据保存在访客浏览器 localStorage，**未实现真实邮件发送与云端数据库**。上线后如需自动收邮件通知，建议把询盘表单接入 Formspree / EmailJS（后台「设置」→ 表单里填入你的 Formspree 地址即可，代码已预留），或后续自建 API。

## 功能说明与边界（如实声明）

- ✅ 前端展示、产品筛选搜索、产品独立详情页（Google 可收录 + 资料下载）、询盘表单（含附件提示）、在线聊天、Cookie 合规弹窗、八国语言切换、全站响应式
- ✅ 可视化后台：首页/关于页文字、产品（含 8 语名称描述、图册、资料 PDF）、询盘、订单、客服消息增删改查；设置；导出 CSV；导出全站配置
- ✅ 海外支付：PayPal 标准表单跳转 + 银行电汇（T/T）信息展示两种方式
- ✅ 原生 SEO：语义化 HTML、结构化数据 JSON-LD（Organization / WebSite / BreadcrumbList / Product）、hreflang 八语、sitemap、robots、SEO 关键词（Chinese Home Appliances 等）
- ⚠️ 纯前端静态站：询盘 / 订单数据存访客浏览器，未实现真实邮件发送、云数据库与支付回调对账（详见上文接入建议）
- ⚠️ 产品图/工厂实景图来自参考图册与工厂视频（部分带原厂 Kemei 品牌标识），如需 ANMO 自有品牌实拍请补充后在后台上传替换；产品价格、产能、成立年份等为参考值，请在后台修改为真实数据

## 本地预览

直接用浏览器打开 `index.html` 即可；或在本目录启动静态服务（如 `python -m http.server 8080`）后访问 `http://localhost:8080`。

---

© ANMO HOME APPLIANCES. 模板版权归原作者所有，可按需商用部署。
