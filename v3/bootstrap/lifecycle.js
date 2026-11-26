/**
 * 3.0 生命周期（骨架）。
 *
 * startup 现在不做任何事；shutdown 会按注册顺序反向调用 close()。
 * 这样 M2 接 SQLite 时不用改调用方。
 */
export async function startup(container) {
  return container
}

export async function shutdown(container) {
  const names = container.list().slice().reverse()
  for (const name of names) {
    const service = container.get(name)
    if (service && typeof service.close === 'function') {
      await service.close()
    }
  }
}
