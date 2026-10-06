# 时间地层 · Time Strata

把看过的番剧、读过的书、玩过的游戏，沉淀成自己的时间地层。

一个采用深色矿石风格的个人作品档案。按年份分层陈列，支持番剧、书籍、影视和游戏，并用「想看 / 在追 / 已看完」等状态记录进度。

## 功能

- 分类、状态筛选与数量统计
- 年份导航、分层折叠、展厅和抽屉两种视图
- 搜索作品、创作者和标签
- 添加作品、保存感想、修改观看 / 阅读 / 游戏状态
- 手机布局、键盘操作和减少动画支持
- Windows 桌面快捷方式与自定义图标

## 本地运行

安装 Node.js 22 或更高版本，在项目目录执行：

```bash
npm ci
npm start
```

打开 <http://localhost:3001/index.html>。首次启动会自动创建空的 `records.json`，之后可以通过页面添加自己的作品。

## Windows 桌面启动

先安装依赖，再在项目目录执行：

```powershell
powershell.exe -NoProfile -File .\Create-DesktopShortcut.ps1
```

双击桌面「时间地层」图标，会在后台启动服务并打开默认浏览器。重复打开会复用服务；关闭浏览器后服务仍会运行，电脑重启后可再次双击启动。

启动器通过系统 PATH 寻找 Node.js；也可以在本地创建 `node-path.txt`，填入 Node.js 可执行文件的完整路径。该文件不会提交到 Git。

## 数据与隐私

仓库不包含个人作品库、感想、观看记录、导入清单或备份。数据保存在本地 `records.json`；此文件及 `backups/` 已加入 `.gitignore`。备份时复制 `records.json` 即可。

这是个人本地工具，当前没有登录和权限控制。若要提供公网访问，需要先增加认证及访问限制。GitHub Pages 只能托管静态文件，不能运行本项目的数据服务。

## 验证

```bash
npm test
```

测试使用独立临时数据，不修改个人作品库。Windows 桌面启动测试在其他系统上自动跳过。

## 项目结构

| 文件 | 用途 |
| --- | --- |
| `index.html` | 网页、样式和交互 |
| `tracking.js` | 作品状态及分类用语 |
| `server.js` | Express 服务与 JSON 数据读写 |
| `Launch.ps1` | Windows 后台启动器 |
| `Create-DesktopShortcut.ps1` | 桌面快捷方式生成器 |
| `assets/` | 图标及生成提示词 |
| `tests/` | 状态和启动器测试 |

技术栈：原生 HTML / CSS / JavaScript、Node.js、Express。图标由 OpenAI 图像生成工具生成。
