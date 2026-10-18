# 下次发布

1. 修改 package.json 的语义版本、release/NOTES.md 和 release/使用说明.txt。验证记录更新到 release/VALIDATION.md。开发中使用 `-beta.N`；不要仅因构建成功就改成稳定版。
2. 更新运行时时，核实 Node 官方 Windows ZIP 的 SHA-256 并更新 release/runtime-lock.json 及工作流的 node-version。项目没有 npm 第三方依赖，无需安装步骤或虚构锁文件；运行时由精确版本和哈希锁定。
3. `npm test` 生成示例并运行测试。`npm run release:build` 构建便携包（Windows PowerShell），输出到 dist；同名输出存在时停止，保留旧输出。构建参数 `-RuntimeArchive` 可使用事先下载的官方 ZIP，但仍强制校验哈希。
4. 提交并正常推送。先在 Actions 的 Windows portable release 中手动 Run workflow 进行构建验证，手动运行只生成 Artifact，不创建 Release。
5. 创建未使用的 `v<package.version>` Tag，推送该 Tag。工作流先运行测试及最终包校验，再创建草稿、上传全部文件，最后公开。带连字符的 Tag 自动标为预发布。
6. 检查 Actions 成功、Release 附件及下载校验。已有 Release（包括失败留下的草稿）会使工作流停止，不覆盖任何同名资产；需维护者检查后选择新的版本或处理草稿。

发布权限仅 publish job 的 contents:write；build job contents:read。不需要新增个人 Token 或付费服务。所有官方 Actions 固定到提交；不在普通分支推送时自动发布。仓库整体许可证仍未指定，不应在发布说明中声称已开源授权。
