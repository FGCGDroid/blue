# v3/tools

工具适配层。规则：

```text
tools 只做参数整形、权限、调用 app、json 化
tools 不写 SQL
tools 不做业务判断
所有工具经 safe 包装，错误返回 { ok:false, error }
```

骨架阶段 0 个工具。  
M4 按 14 组迁入：现有 66 个 + 新增 7 个（策略 3、网关 1、响应执行 2、外锚 1）。

当前占位文件只有本 README，避免出现“注册了但没实现”的假工具。
