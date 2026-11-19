# ÉLAN

公开网站由 GitHub Pages 托管，账号、完整正文、品牌档案、美妆和图片权限由 CloudBase 提供。

运行 `npm run build` 或 `python3 scripts/build_gate.py` 生成公开站点。公开文件只包含两份试读、文章标题与分类、加密稿件和订阅周报发布数据。普通会员验证邮箱并设置密码后可以阅读趋势，管理员可授予或撤销高级会员权限。

趋势作者在私人工作目录编辑 JSON，保留出处及图像授权。运行 `node scripts/seal-trends.cjs ARTICLE.json trend-vault.json` 追加稿件，提交加密清单。公开仓库中不需要存放正文草稿。由会员后端验证权限并返回对应文章。

历年秀场用 `scripts/seal-history.cjs` 写入 `history-feed.json`。新增前用基础档案的 `archive-baseline-ids.json` 以及加密清单中的 ID 查重。两个清单均使用公开加密密钥，解密密钥仅在云函数私有部署包中。
