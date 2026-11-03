# 开发与提交前机密检查

当前项目仅有文档。提交或推送前不强制运行单元测试；实现代码后可以按需编写并运行测试。

首次使用时安装 [Gitleaks](https://github.com/gitleaks/gitleaks)（例如 macOS 上运行 `brew install gitleaks`），确认 `gitleaks version` 可运行。

每次提交前，在仓库根目录依次执行：

1. `git add <本次要提交的文件>`：将新增文件、修改与删除都暂存；检查 `git status --short`，避免遗漏文件。
2. `git diff --cached --binary | gitleaks stdin --redact`：用 Gitleaks 扫描完整的暂存区补丁（包括新增文件）；扫描结束后确认 Gitleaks 以退出码 0 结束。
3. `git diff --cached --check` 和 `git diff --cached`：检查格式并人工复核暂存区，确认没有机密或其他不应公开的内容。对于新建的文件也要逐一查看。

机密检查失败、无法执行或在检查后修改了待提交文件时，修复问题并重新运行检查；检查通过后才可提交。不要将扫描输出中的真实机密复制到日志。不要将 GitHub 令牌或私钥提交到仓库。
