# dsh-web-background

DeepSeek Harness (dsh) Web 界面的**背景 + 主题色**定制插件。

安装后，设置面板（左下角齿轮）里出现「背景」页面，可自定义 Web 界面的背景（4 种模式）与主题色，所有改动持久化到 `$DSH_HOME/settings.yaml`，刷新 / 重启自动恢复。

## 功能

### 背景（4 种模式，可切换）

- **纯色**：浅色 / 深色模式分别指定背景色
- **渐变**：浅色 / 深色分别设置起止颜色 + 角度
- **图片**：http(s) 链接 / data URL / 本地导入（≤ 1 MB）；铺放方式 覆盖 / 包含 / 平铺；暗化程度 0–80%
- **视频**：本地 mp4 / webm / ogg / mov / m4v；**支持在设置页直接上传 / 删除 / 刷新列表**（不用手找目录）；暗化程度 0–80%；单文件上限 300 MB

### 主题色定制（可选，与背景独立）

启用后可分别覆盖**浅色 / 深色**模式下的：

- 品牌强调色（`--dsw-alias-brand-primary`）
- 主文字色（`--dsw-alias-label-primary`）
- 次文字色（`--dsw-alias-label-secondary`）
- 表面色（`--dsw-alias-bg-layer-1`）
- 边框色（`--dsw-alias-border-l2`）

每个字段**留空 = 使用 dsh 默认主题色**。

### 通用能力

- **浅色 / 深色独立取值**：通过主题系统 token 覆盖层实现，跟随 dsh 的明暗模式自动切换
- **侧边栏联动**：图片 / 视频模式下可勾选「侧边栏也应用」——图片背景会作为一张整图覆盖主区域和侧边栏（不出现拼接缝），视频模式则让侧边栏一起透出
- **即时响应**：所有改动乐观更新（界面立即生效），写入走防抖合并
- **持久化**：`$DSH_HOME/settings.yaml` 的 `web-background` 命名空间；刷新 / 重启后自动恢复
- **一键恢复默认**

## 兼容性

- 当前版本针对 **DeepSeek Harness `0.1.0-rc.6`** 验证
- Harness 仍处开发者预览阶段：设置白名单、主题 token、Loader 注册机制变更后可能需要同步适配（见下文「dsh 升级后」）

## 要求

- Node.js ≥ 20
- 至少成功运行过一次 `dsh web`（首次运行会创建 `$DSH_HOME/profiles` 与模块回退链接，安装脚本依赖它们定位 DSH 安装目录）
- Windows / macOS / Linux 均可

## 快速安装（推荐）

```sh
git clone https://gitee.com/stflys/dsh-web-background.git
cd dsh-web-background
node install.mjs
```

然后**重启 `dsh web`**（Ctrl+C 后重新运行），刷新页面，打开 设置 → 背景。

### install.mjs 可用参数

| 参数 | 作用 | 默认值 |
|---|---|---|
| `--dsh-home <path>` | 指定 Harness 数据目录 | `$DSH_HOME` 环境变量，否则 `~/.dsh` |
| `--profile <name>` | 要打补丁的 profile | `web` |
| `--uninstall` | 完整卸载并还原备份 | — |

## 安装脚本做了什么

`install.mjs` 共四步（**每步都幂等，可重复运行**）：

1. **复制插件本体**到 `$DSH_HOME/profiles/node_modules/dsh-web-background`（profile 共享模块目录）
2. **注册插件行**：在 `$DSH_HOME/profiles/<profile>/cordis.patch.yml` 中追加 Loader 的 `insert` 条目
3. **暴露设置命名空间（必须）**：`0.1.0-rc.6` 的 Web 设置通道只服务 `dsh-host-apiproxy` 里一份**硬编码白名单**（`WEB_SETTINGS_NAMESPACES`）。产品尚未提供第三方插件自声明暴露设置的机制（源码注释标注为 deferred work）。脚本把 `"web-background"` 加入该白名单——不做这步，设置页会一直显示「设置暂不可用」
4. **导航图标（可选，外观）**：设置面板导航行的图标由 `dsh-client-ui-settings-general` 硬编码，未知 id 一律回退成齿轮图标。脚本给 `background` 补一个图片图标分支

第 3、4 步会修改 DSH **安装目录**里的文件（通过 `$DSH_HOME/profiles/node_modules` 的引导回退链接定位真实位置）。每次修改前都会把原文件备份为 `<file>.dsh-wb-backup`，`--uninstall` 会原样还原。这两处补丁是当前产品版本的权宜之计，待 Harness 提供正式扩展点后即可移除。

## 手工安装（备选，不用安装脚本）

1. 复制本仓库内容到 `$DSH_HOME/profiles/node_modules/dsh-web-background`
2. 在 `$DSH_HOME/profiles/web/cordis.patch.yml` 中加入：
   ```yaml
   - insert:
       - id: web-background
         name: dsh-web-background
   ```
3. 在 DSH 安装目录的 `node_modules/@deepseek-ai/dsh-host-apiproxy/lib/index.js` 中，把 `"web-background"` 加入 `WEB_SETTINGS_NAMESPACES` 数组（**必做**，改前备份文件）
4. （可选）在 `node_modules/@deepseek-ai/dsh-client-ui-settings-general/lib/client.js` 的 `navIcon(id)` 中给 `id === "background"` 加一个图标分支
5. 重启 `dsh web`

## 卸载

```sh
node install.mjs --uninstall
```

还原两个产品文件与 profile 补丁文件、删除插件目录。`settings.yaml` 里的 `web-background:` 段可保留，无副作用。手工安装的按上述步骤逆向删除即可。

## 配置字段速查

持久化在 `$DSH_HOME/settings.yaml` 的 `web-background:` 段下：

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `enabled` | bool | `false` | 总开关；关掉时主题 token 不被覆盖 |
| `mode` | enum | `color` | `color` / `gradient` / `image` / `video` |
| `colorLight` / `colorDark` | color | `#f5f6f8` / `#0e1116` | 纯色模式：浅 / 深配色 |
| `gradientLightStart/End`, `gradientDarkStart/End` | color | 预设 | 渐变模式：浅 / 深起止色 |
| `gradientAngle` | 0–360 | `135` | 渐变角度（0=上，90=右） |
| `imageUrl` | string | `''` | 图片模式：URL 或 data URL |
| `imageFit` | enum | `cover` | `cover` / `contain` / `tile` |
| `imageOverlay` | 0–80 | `0` | 图片暗化遮罩百分比 |
| `videoFile` | string | `''` | 视频模式：背景视频文件名（留空=列表第一项） |
| `videoOverlay` | 0–80 | `35` | 视频暗化遮罩百分比 |
| `applyToSidebar` | bool | `false` | 图片 / 视频是否同时应用到侧边栏 |
| `themeEnabled` | bool | `false` | 主题色定制总开关 |
| `brandLight` / `brandDark` | color | `''` | 品牌强调色（留空=默认） |
| `labelPrimaryLight` / `labelPrimaryDark` | color | `''` | 主文字色（留空=默认） |
| `labelSecondaryLight` / `labelSecondaryDark` | color | `''` | 次文字色（留空=默认） |
| `surfaceLight` / `surfaceDark` | color | `''` | 表面色（留空=默认） |
| `borderLight` / `borderDark` | color | `''` | 边框色（留空=默认） |

## 视频目录与上传

- 视频文件统一存放在 `$DSH_HOME/background-videos/`（首次访问列表时自动创建）
- 支持的后缀：`.mp4` / `.webm` / `.ogg` / `.mov` / `.m4v`
- 单文件上传上限 **300 MB**（超过直接 413 拒）
- 设置页提供「上传本地视频 / 刷新列表 / 删除选中视频」三个按钮；删除会把磁盘文件一并移除

## dsh 升级后

Harness 升级（`npx` 缓存重建 / 重新安装）会覆盖两个产品补丁。**重新运行一次 `node install.mjs`** 即可：脚本会检测到补丁缺失并重新应用（备份不会重复覆盖原始文件）。插件本体在 `$DSH_HOME` 下不受影响。

## 已知限制

- 渐变 / 图片模式下，`--dsw-alias-bg-base` 不再是纯色，少量用 `color-mix(...)` 引用该 token 的加载扫光动画（消息行 shimmer）会停止绘制——不影响功能
- 远程浏览器（非本机回环地址）以内存模式运行，设置仅当次会话有效，不写入 `settings.yaml`
- 本地图片导入上限 1 MB（写入本地配置不宜过大）；更大的图片请用 http(s) 链接
- 修改插件代码后需要重启 `dsh web`（无 HMR watcher）；新插件集合本身也只在重启时扫描

## 开发

```sh
npm ci
npm run check
```

`npm run check` 会做语法检查 + 跑测试套件，覆盖客户端主题覆盖层与本地编辑合并、Host schema 默认值与边界、Host → 浏览器 schema 序列化、React 设置页渲染，以及安装器的安装 / 重复运行 / 卸载 / 白名单兼容 / profile 路径约束。

## 许可

MIT
