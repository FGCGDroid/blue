/**
 * 3.0 依赖容器（骨架）。
 *
 * 只做名字到实例的映射。真正的装配在 M2 之后。
 * 这里刻意不做自动扫描、不做装饰器，避免早期引入隐式行为。
 */
export function createContainer(config = {}) {
  const services = new Map()
  return {
    config,
    register(name, service) {
      if (typeof name !== 'string' || name === '') throw new Error('container: name 不能为空')
      if (services.has(name)) throw new Error('container: 重复注册 ' + name)
      services.set(name, service)
      return service
    },
    get(name) {
      if (!services.has(name)) throw new Error('container: 未注册 ' + name)
      return services.get(name)
    },
    has(name) {
      return services.has(name)
    },
    list() {
      return Array.from(services.keys())
    },
  }
}
