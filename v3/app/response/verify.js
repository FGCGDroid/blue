/** 响应执行后验证（M3.5）。 */
export function verifyResponse(store, id) {
  return store.responses.verify(String(id || ''))
}
