# v3/app

用例层。规则：

```text
只依赖 domain 与 ports
不直接 import node:sqlite / node:http / node:fs
不写 SQL
```

骨架阶段已放：

```text
tasks/create.js
tasks/approve.js
policy/validate.js
response/execute.js
```

其余用例在 M4 按工具分组补齐。
