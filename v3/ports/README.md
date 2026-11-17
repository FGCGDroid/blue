# v3/ports

这里只放接口定义（JSDoc typedef），不放实现、不 import 任何模块。

规则：

```text
app 只依赖 ports
infra 实现 ports
domain 不知道 ports 存在
```

3.0 骨架阶段只登记接口，M2 再接 SQLite 实现。
