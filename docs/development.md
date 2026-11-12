# 开发与提交前机密检查

项目采用 Vite + TypeScript。安装依赖：`npm ci`；本地运行：`npm run dev`；生产构建与类型检查：`npm run build`；单元测试：`npm test`（使用 Node 内置测试器和现有 TypeScript 依赖，不需额外测试框架）。提交或推送前不强制运行单元测试。

试卷二维码使用版本号、出题设置和随机种子重建答案。`src/worksheet-link.ts` 管理解码和固定伪随机算法；v1～v3 使用 `src/generator.ts` 的旧版生成器，v4 使用 `src/advanced-generator.ts` 的混合题型生成器。已有版本的出题顺序、选项位掩码顺序和伪随机算法均不得改变；未来变化需新版本并保留旧解码。题型选项只可追加，不可重排。`src/problem-view.ts` 专门处理问题、答案和竖式展示。

题型测试覆盖 12 类题的答案、范围和换算、缺项唯一性、填运算符歧义、进退位、混合比例、重复计数、v1～v4 链接和损坏链接；`tests/fixtures/golden-worksheets.json` 固定两条种子回归；`print-templates.test.mjs` 检查打印页题量与转义。`tests/modules.mjs` 会编译 `src/problems/` 与相关 TypeScript 模块供 Node 测试使用。打印回归应分别检查带竖式的紧凑五列十行及普通两/三列卷面，八种底纹 × 50/100 题 × 答案开关，桌面与手机视口均须验证。

首次使用时安装 [Gitleaks](https://github.com/gitleaks/gitleaks)（例如 macOS 上运行 `brew install gitleaks`），确认 `gitleaks version` 可运行。

每次提交前，在仓库根目录依次执行：

1. `git add <本次要提交的文件>`：将新增文件、修改与删除都暂存；检查 `git status --short`，避免遗漏文件。
2. `git diff --cached --binary | gitleaks stdin --redact`：用 Gitleaks 扫描完整的暂存区补丁（包括新增文件）；扫描结束后确认 Gitleaks 以退出码 0 结束。
3. `git diff --cached --check` 和 `git diff --cached`：检查格式并人工复核暂存区，确认没有机密或其他不应公开的内容。对于新建的文件也要逐一查看。

机密检查失败、无法执行或在检查后修改了待提交文件时，修复问题并重新运行检查；检查通过后才可提交。不要将扫描输出中的真实机密复制到日志。不要将 GitHub 令牌或私钥提交到仓库。
