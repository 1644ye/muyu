# muyu

## 普通用户下载（Windows x64）

**推荐：[Muyu-1.0.0-beta.1-windows-x64-portable.zip](https://github.com/1644ye/muyu/releases/download/v1.0.0-beta.1/Muyu-1.0.0-beta.1-windows-x64-portable.zip)** · [发布页面](https://github.com/1644ye/muyu/releases/tag/v1.0.0-beta.1)

完整解压，双击“一键打开.bat”，即可在浏览器使用；便携版已内置 Node.js，无需安装开发环境或编译。仅发布 Windows x64 beta，应用未配置代码签名。GitHub 的 Source code ZIP 是源码，不是便携成品。

编辑器通过本机服务运行；作品保存在浏览器 IndexedDB，服务凭据和日志在 `%LOCALAPPDATA%\Muyu\.runtime`。升级前导出工程备份、停止旧服务再解压新版。CPU/内存壁纸依赖随包本机服务，音频/媒体依赖 WE，联网组件依赖网络与相应 API。WE 单独安装；编辑器导出的壁纸 ZIP 解压后将 index.html 导入 WE，不能把编辑器包当壁纸。

详见 [便携版使用说明](release/使用说明.txt)、[本次验证](release/VALIDATION.md)、[下次发布](release/PUBLISH.md) 和 [许可状态](RIGHTS.md)。尚未完成 WE 实机及全新 Windows 环境验证，因此本次为预发布。以下启动说明主要面向源码用户。

> 更新：CPU/内存等系统指标壁纸现默认本机自动连接导出，无需在 Wallpaper Engine 填连接码。导出会启用本机服务及当前用户登录启动；旧包需重新导出。详见 [自动连接说明](docs/桌面信息连接说明.md)。

# 幕予 · HTML 动态壁纸编辑器

一个中文、本地优先、无账号的 Windows 网页壁纸制作工具。原生 HTML/CSS/JavaScript，无运行时第三方依赖。编辑器与导出壁纸共用 `js/renderer.js`；工程数据不存于 DOM。

已增加可组合信息插件系统：共享数据源、15 种通用展示、10 种外观预设、CSS / JSON 工作区、真实系统指标伴随服务、Open-Meteo 天气、声明式插件、独立导出与凭据清理。见 [信息插件使用说明](docs/信息插件使用说明.md)、[逐项能力表](docs/插件能力表.md) 和 [声明式协议](docs/插件协议.md)。

本轮已补充完全透明背景、椭圆/胶囊、独立圆角、真实分段/液体与完整预设切换。操作、修复清单与复核范围见 [样式自定义与复核](docs/样式复核与使用.md)。十种可编辑样式示例在 `examples/styles/`。

## 启动

1. 安装 Node.js 20 或更高版本。
2. **双击 `一键打开.bat`**（`start.bat` 也可以）。它自动启动隐藏的后台服务，等待就绪后打开默认浏览器，重复双击会复用已有服务。
3. 在新版 Edge / Chrome 打开 **http://127.0.0.1:4173**。

无需执行 npm install，无需构建。服务仅监听本机回环地址。启动器优先使用系统 Node.js，也会检测当前电脑已有的 Codex 本地 Node.js 运行时。后台日志与进程号保存在 `.runtime/`。手动调试也可运行 `node server.cjs`，此时终端按 Ctrl+C 停止。端口冲突时在 PowerShell 运行 `$env:PORT=4180; node server.cjs`，然后打开对应端口。浏览器存储按来源隔离，更换端口或浏览器后请通过工程包迁移。

编辑器需通过上述本地 HTTP 服务打开；**导出的壁纸不需要 Node.js 或开发服务器**，可直接打开解压后的 `index.html`。

系统信息为可选功能：在“信息插件”点“连接本地服务”，或双击 `启用系统信息.bat` 后连接；`停止系统信息.bat` 停止服务。普通设计、时钟和 JSON 组件不依赖该服务。天气等联网插件仍需网络；真实 CPU/内存/网卡等插件在目标机器仍需运行伴随服务。

桌面显示 **—% / 需连接本地伴随服务**：双击 `连接桌面系统信息.bat`，点击启动并复制连接码，再粘贴到 Wallpaper Engine 当前壁纸右侧的“本机信息服务令牌 / 本机系统信息连接码”。[具体说明](docs/桌面信息连接说明.md)。

## 最快制作流程

1. 首次打开选择模板，或点击“新建空白”。应用模板可用撤销恢复。
2. 将本地图片、视频、字体拖到画布，或在“素材”面板导入。图片和视频默认作为新图层添加；点击素材的“作背景”可换背景，保留原布局。
3. 选中组件，拖动移动，角点缩放，顶部圆点旋转。右侧输入框即时生效。双击文字跳到内容编辑。
4. Shift 点击或在空白处框选多个图层，进行组合、对齐、均匀分布。图层面板支持拖动排序、隐藏、锁定、重命名和复制。
5. 用底部切换 16:9、21:9、竖屏预览。比例预览期间暂停拖动编辑，切回“设计画布”继续操作。
6. 顶部“预览”进入无控件全屏；Esc 返回。
7. 先导出可编辑工程备份，再导出 Wallpaper Engine 壁纸 ZIP。

### 尺寸与适配

预设：1080p、2K、4K、2560×1080 超宽屏、1080×1920 竖屏；支持 240–7680 像素自定义宽高。

| 模式 | 行为 |
| --- | --- |
| 等比完整显示 | 保留完整设计，比例不同时留边 |
| 等比铺满 | 等比放大到填满屏幕，超出部分居中裁切 |
| 响应式锚点 | 按短边等比缩放，背景铺满视口；组件按左上、中心、右下等九种锚点定位 |

前两种模式保留整幅构图。锚点仅在响应式模式下移动组件；组件不会被横向/纵向单独拉伸。跨比例设计建议让主要组件留出足够边距，并分别查看超宽与竖屏预览。改变画布设计尺寸会保留现有组件坐标。

### 快捷键

| 操作 | 快捷键 |
| --- | --- |
| 撤销 / 重做 | Ctrl+Z / Ctrl+Shift+Z，或 Ctrl+Y |
| 复制 / 粘贴 | Ctrl+C / Ctrl+V（编辑器内部图层剪贴板） |
| 复制图层 | Ctrl+D |
| 全选可编辑图层 | Ctrl+A |
| 组合 / 解组 | Ctrl+G / Ctrl+Shift+G |
| 删除 | Delete / Backspace |
| 微调 | 方向键 1px，Shift+方向键 10px |
| 保存本机 | Ctrl+S（焦点不在输入框时） |
| 临时关闭吸附 | Alt+拖动 |
| 旋转角度吸附 | Shift+拖动旋转手柄，15° 步长 |

输入文字、数值时使用系统文本编辑快捷键。一次连续拖动只产生一次历史记录，连续方向键和文字输入会合并。历史最多 80 个场景快照；重新打开工程后开启新的历史。

## 内容与素材

- 六类真实可编辑模板：静谧时分、山海来信、流光之间、星野漫游、夜的频率、专注倒计时。每类有不同的字体、排版、组件或动画组合。
- 背景：纯色、渐变、图片、静音循环视频；可开启渐变流动。
- 组件：文字、透明图片、视频、矩形、圆形/椭圆、线条、数字/堆叠/模拟时钟、日期、倒计时、音频频谱。
- 文字：内容、系统/本地字体、字号、字重、字距、行高、对齐、描边、阴影。
- 图片：等比完整显示/铺满裁切、圆角、边框、阴影。裁切目前以素材中心为焦点。
- 动态：呼吸、淡入淡出、漂浮、鼠标视差、星空、粒子、雨、雪。右侧调节速度、强度、数量。
- 五组配色预设、四组系统字体搭配；可将当前作品存为本机个人模板。

图片接受 PNG / JPG / WebP / GIF；SVG 不作为可导入素材，以避免引入外部资源与脚本。视频仅接受 **WebM / Ogg / OGV**，并在导入时实际检查浏览器能否解码。建议使用 VP8/VP9 WebM；不要把 MP4 改后缀。容器格式相同不代表所有编码均兼容。

本地字体接受 WOFF2 / WOFF / TTF / OTF，导入时用 FontFace 检查解码。字体授权由使用者确认；更换电脑时推荐使用工程内打包字体。中文系统字体在其他机器可能有外观差异。

文件名可以包含中文、空格或重复名称。资源按唯一 ID 保存并打包为安全的相对路径，不使用原电脑绝对路径。素材“替换”只接受相同类型，保留布局、样式和相关引用；缺失或损坏素材会显示错误，缺失引用会阻止导出。未使用素材可手动移除，壁纸导出只收集实际引用的素材。

限制：单文件 500MB，工程 ZIP 1GB，图层/素材各最多 500 个。ZIP 为无压缩存储格式，避免已经压缩的媒体重复压缩带来的等待。大型视频打包仍会占用额外内存；建议日常使用短小视频。导入兼容存储和 Deflate ZIP，拒绝加密、分卷、ZIP64、路径穿越及校验失败文件。

## 保存与备份

本机自动保存使用 IndexedDB，二进制资源单独存 Blob，不塞入 localStorage。停止修改约 650ms 后自动保存，顶部显示状态。刷新恢复作品和素材。“文件”中可新建、打开本机项目、另存为副本、导入工程包。

**浏览器数据不是可靠的唯一备份。** 清理网站数据、无痕模式、存储空间不足或浏览器策略都可能影响恢复。保存失败会明确提示，当前画布仍可手动导出。

可编辑工程包为 `.muyu.zip`，包括：

```text
muyu-project.json   # format: muyu-project, version: 2
scene.json          # format: muyu-scene, version: 2
assets/             # 全部工程素材
```

打开损坏或不兼容工程时保留当前作品。v1 自动迁移为 v2，未知版本明确拒绝。新建/打开前保留当前工程的本机保存；应用模板还可立即撤销恢复。导出会清除常见敏感凭据；接收者重新配置自己的本机令牌或代理。

## Wallpaper Engine 导入

**下载 ZIP 只是文件交付，并未安装或应用壁纸。**

1. 将 `.wallpaper.zip` **完整解压到专用文件夹**，避免夹带其他工程或大量无关文件。
2. 打开 Windows 版 Wallpaper Engine 的壁纸编辑器。
3. 将该文件夹中的 `index.html` 拖到“创建壁纸”按钮。WE 会复制整个目录及子目录到自己的项目目录。
4. 保存项目并应用壁纸。在“已安装”的作品右侧调整实际提供的属性。
5. 如果导入时 WE 重建配置导致属性消失，选择“编辑 → 在资源管理器中打开”，关闭编辑器，把包内 `project.json` 覆盖到 **WE 复制后的项目目录**，然后重新打开项目。不要覆盖其他作品。

每个包内都有 `导入说明.txt`。输出结构：

```text
index.html          # 干净的独立壁纸入口
scene.js            # 场景与布局模型
renderer.js         # 与编辑器相同的核心渲染器
adapter.js          # Wallpaper Engine 接口适配
info-*.js           # 插件协议、CSS、数据采集与通用展示
scene.json          # 可阅读的配置协议（运行从内嵌脚本读取）
插件依赖.json        # 离线、网络、本地服务等依赖清单
scene-data.js       # 内嵌场景与相对素材路径，无 fetch JSON
project.json        # type=web, file=index.html, general.properties
preview.png         # 从作品渲染数据生成的缩略图
assets/             # 只收集实际引用素材
导入说明.txt
```

使用经典脚本加载本地资源，不依赖 ES Module、远程 CDN、在线字体、blob URL 或开发服务器。壁纸核心不需要 Node.js，系统插件的可选伴随服务需要本机 Node.js。导出中没有编辑器工具栏、参考线或选中框。天气/HTTP 等插件自身有外部数据依赖，会在导出前列出。

按作品实际组件生成用户属性：主题色、动画速度、效果强度、时钟开关、粒子开关。没有对应效果就不输出无效选项。主题色映射到初始使用主题色的组件及粒子。动画速度作用于程序动画；效果强度作用于漂浮/呼吸/淡入、视差、粒子、频谱幅度。

频谱在编辑器中明确标注为“模拟音频”。导出壁纸在普通浏览器里显示静音频谱，在 WE 中通过一次 `wallpaperRegisterAudioListener` 注册接收真实 128 频段；清单的 `general.supportsaudioprocessing` 仅在有频谱时启用。普通浏览器没有 WE API 时正常运行。

通过全局 `wallpaperPropertyListener` 接入 `applyUserProperties`、`applyGeneralProperties.fps` 和 `setPaused`。暂停停止程序调度与视频；恢复继续运行。全局 FPS 限制与画质上限取较小值。时钟采用系统时间，倒计时按输入的本地时间计算。

官方参考（实现前已查阅）：

- [创建网页壁纸与目录导入](https://docs.wallpaperengine.io/en/web/first/gettingstarted.html)
- [用户属性与颜色/滑块/布尔接口](https://docs.wallpaperengine.io/en/web/customization/properties.html)
- [官方 project.json 嵌套结构示例](https://docs.wallpaperengine.io/en/web/customization/localization.html)
- [真实音频接口](https://docs.wallpaperengine.io/en/web/audio/visualizer.html)
- [帧率限制](https://docs.wallpaperengine.io/en/web/performance/fps.html)
- [属性监听与暂停接口](https://docs.wallpaperengine.io/en/web/api/propertylistener.html)
- [网页视频格式范围](https://docs.wallpaperengine.io/en/web/overview.html)

## 示例和验证

`examples/` 含六套工程 ZIP、六套壁纸 ZIP，以及带原始 TTF / VP9 WebM 的 `compatibility` 验证工程。每个模板还提供已解压的 `wallpaper/`，可直接测试或导入。

另有 `info-demo`（离线 JSON 示例值、四种 CPU 展示、CSS 与阈值联合自定义）、`info-live`（真实系统 / 天气信息桌面），以及可导入的声明式插件和 CSS 示例。插件专项浏览器测试：打开 http://127.0.0.1:4173/tests/plugins.html ，点击运行。使用独立测试数据库，不覆盖编辑器作品。

运行自动测试：`node --test tests/*.test.cjs`。

真实浏览器集成测试：启动服务后打开 http://127.0.0.1:4173/tests/browser.html ，点击“运行集成测试”。可下载完整报告。测试使用单独的 `muyu-browser-test` IndexedDB，不覆盖编辑器作品。

点击“生成六套示例与验证壁纸”可以重新捕获缩略图与全部示例。已有预览下也可执行 `node scripts/examples.cjs` 重新打包；修改视觉后应先在浏览器测试页更新预览。原创素材可通过 `node scripts/fixtures.cjs` 重新生成；测试视频使用 FFmpeg 将原创图片编码为 3 秒 VP9 WebM，无需联网。

开发验证时可用 `node server.cjs --qa-write` 启动，在测试页生成示例/报告后直接写到 `examples/muyu-examples.zip` 和 `docs/browser-results.json`，再运行 `node scripts/unpack-examples.cjs`。此写入接口在普通启动时关闭，仅允许同源请求和两个固定目标，不能写任意路径。

详见 [验证报告](docs/验证报告.md) 和 [浏览器原始测量](docs/browser-results.json)。

## 实现结构

| 文件 | 责任 |
| --- | --- |
| js/scene.js | 版本化模型、验证、历史、比例布局与旋转包围盒 |
| js/renderer.js | 背景/组件渲染、粒子、媒体、字体与统一调度 |
| js/adapter.js | WE 用户属性、音频、暂停、帧率 |
| js/info-model.js / info-runtime.js | 插件声明、Schema、共享数据调度、来源适配与派生计算 |
| js/info-view.js / info-css.js | 通用展示、Shadow DOM 隔离、CSS 校验和资源解析 |
| js/code-editor.js / info-editor.js | CSS/JSON 代码工作区、插件目录、功能与外观面板 |
| companion/ | 可选的只读本机指标、固定 JSON 文件和私密凭据代理 |
| js/storage.js | IndexedDB 原子保存、Blob 素材、本机项目与个人模板 |
| js/zip.js | UTF-8 ZIP32、CRC32、路径安全、存储/Deflate 读取 |
| js/package.js | 工程与壁纸打包、素材收集、清单校验 |
| js/templates.js | 六套组件化模板 |
| js/app.js | 编辑器交互、选区、属性、素材管理和文件流程 |
| server.cjs | 仅本机静态服务，支持视频 Range 请求 |

程序动画采用单个调度循环，按画质限制为 20/30/60 FPS，粒子最多 300 个、Canvas 单边最高 2048 像素、像素比最高 1.5。静态文字场景没有持续帧循环，时钟和倒计时每秒更新。被移除的渲染实例释放事件、计时器、视频源和字体；不再被当前作品、历史或个人模板引用的临时 URL 会被释放。移除素材后，磁盘 Blob 仅在没有任何本机项目或模板引用时回收。

## 明确的验证边界

当前交付通过浏览器与文件结构验证；**没有执行 Wallpaper Engine 实机导入、真实系统音频采集、WE 版本差异或显卡长时间负载测试**。模拟回调通过只能证明接口逻辑正确，不能替代 WE 实机验证。自定义字体和本地视频通过当前 Chromium 的解码/播放测试，仍需在目标机器上用 `compatibility` 示例进行验证。

内置测试浏览器的安全策略只允许 HTTP/HTTPS，拒绝了 `file://` 访问。因此实际浏览器验证针对本机 HTTP 下的独立导出目录；磁盘直接双击和完全断网启动尚未实测。结构测试已确认导出只使用同目录经典脚本和相对媒体/字体路径，没有远程依赖。

尚不包含自由裁切焦点、嵌套组合、曲线路径编辑和任意时间轴。GPU、温度/风扇、进程排行、磁盘读写、电池健康/多电池、节气/法定假日、歌词、时域波形、轮播和 ICS 明确标为规划中。组合采用平面组，支持整体移动、缩放和旋转。缩略图为紧凑 Canvas 近似绘制，插件图表、CSS、字距和阴影可能有差异；实际壁纸与编辑画布共享完整渲染逻辑。

## 从 Git 仓库生成示例与测试

仓库保留源代码、原始资源和示例预览；不提交本机连接凭据、私人导出与生成的 ZIP。运行 `npm run examples` 生成所有通用示例与示例合集，运行 `npm test` 会先生成示例再执行测试。项目没有第三方 npm 依赖，无需安装依赖；没有依赖锁文件。
