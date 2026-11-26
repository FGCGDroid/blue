/** 面向非专业用户的单页入口：/blue/protect。 */
const PAGE = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>保护我的服务器</title>
<style>
:root{color-scheme:light dark;--bg:#fff;--fg:#17181c;--muted:#5b6270;--line:#e3e6eb;--brand:#2f6feb;--mono:ui-monospace,"SFMono-Regular","JetBrains Mono",Menlo,Consolas,monospace;--sans:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",system-ui,sans-serif}
@media(prefers-color-scheme:dark){:root{--bg:#15171c;--fg:#e7e9ee;--muted:#a2a9b8;--line:#2c313a;--brand:#6f9bff}}
body{margin:0;background:var(--bg);color:var(--fg);font:13px/1.6 var(--sans);
  background-image:linear-gradient(to right,color-mix(in srgb,var(--fg) 6%,transparent) 1px,transparent 1px),
    linear-gradient(to bottom,color-mix(in srgb,var(--fg) 6%,transparent) 1px,transparent 1px);
  background-size:48px 48px}
main{max-width:720px;margin:0 auto;padding:40px 22px 56px}
.eyebrow{font:600 9px/1.6 var(--mono);letter-spacing:.18em;text-transform:uppercase;color:var(--muted)}
h1{font-size:22px;font-weight:700;letter-spacing:-.02em;margin:6px 0 4px}
p{color:var(--muted);margin:0 0 18px;font-size:12px}
form{display:flex;flex-direction:column;gap:10px;max-width:420px;margin:22px 0 18px;padding:14px;
  border:1px solid var(--line);border-radius:4px;background:color-mix(in srgb,var(--bg) 88%,transparent)}
label{font:600 9px/1.6 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
input,button{font:inherit;padding:9px 11px;border:1px solid var(--line);border-radius:3px;background:var(--bg);color:var(--fg)}
input{font-size:12.5px}
input:focus{outline:none;border-color:var(--brand);box-shadow:0 0 0 2px color-mix(in srgb,var(--brand) 20%,transparent)}
button{background:var(--brand);border-color:var(--brand);color:#fff;cursor:pointer;font-weight:600;font-size:12.5px}
button:hover{background:color-mix(in srgb,var(--brand) 86%,#000)}
pre{white-space:pre-wrap;background:var(--bg);color:var(--fg);border:1px solid var(--line);border-radius:4px;
  padding:14px;font:400 11px/1.7 var(--mono);margin:0 0 18px}
a{color:var(--brand);text-decoration:none;border-bottom:1px solid color-mix(in srgb,var(--brand) 40%,transparent);padding-bottom:1px}
</style></head><body><main>
<div class="eyebrow">BLUE TEAM / PROTECT</div>
<h1>保护我的服务器</h1>
<p>填 IP、域名或网址。会建立防护档案，并告诉你下一步做什么；这不是远程扫描，不会假装服务器已安全。</p>
<form id="f">
  <label>服务器地址</label>
  <input id="target" name="target" placeholder="https://你的服务器.com 或 1.2.3.4" required>
  <label>名称（可选）</label>
  <input id="name" name="name" placeholder="例如：公司官网">
  <button type="submit">开始保护</button>
</form>
<pre id="out">等待输入。</pre>
<p><a href="/">返回 DSH</a></p>
</main>
<script>
const f = document.getElementById('f');
const out = document.getElementById('out');
f.addEventListener('submit', async (event) => {
  event.preventDefault();
  out.textContent = '正在建立防护档案...';
  const target = document.getElementById('target').value.trim();
  const name = document.getElementById('name').value.trim();
  try {
    const response = await fetch('/blue/api', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ op: 'protectStart', target, name, session: 'protect-page' }),
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.error || '建立失败');
    const lines = [
      '已建立：' + data.engagement.name,
      '资产：' + (data.asset?.address || target),
      '',
      '先做这几件事：',
      ...data.checklist.map((item, index) => (index + 1) + '. ' + item.title + '：' + item.action),
      '',
      '然后：' + data.next_actions.join('；'),
    ];
    try {
      const statusResponse = await fetch('/blue/api', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ op: 'protectStatus', engagement: data.engagement.id, session: 'protect-page' }),
      });
      const status = await statusResponse.json();
      const cover = status && status.attack_coverage;
      if (status && status.ok && cover) {
        lines.push('', '常见 ' + cover.total + ' 种攻击打法：网关直接拦 ' + cover.blocked
          + ' 种，降指纹 ' + cover.reduced + ' 种，规则发现 ' + cover.detected
          + ' 种，需站点自己改 ' + cover.owner + ' 种。');
        if (status.advisories && status.advisories.length > 0) {
          lines.push('可再收紧：' + status.advisories.slice(0, 4).map((item) => item.path).join('、'));
        }
      }
    } catch (ignored) { /* 覆盖信息拿不到不影响建档 */ }
    out.textContent = lines.join('\\n');
  } catch (error) {
    out.textContent = '失败：' + (error.message || error);
  }
});
</script></body></html>`

export function registerProtectPage(ctx) {
  return ctx.webServer.register({
    kind: 'exact',
    path: '/blue/protect',
    handler(req, res) {
      if (req.method !== 'GET') {
        res.writeHead(405, { 'content-type': 'text/plain; charset=utf-8', allow: 'GET' })
        res.end('GET only')
        return
      }
      const body = Buffer.from(PAGE, 'utf8')
      res.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        'content-length': body.length,
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
      })
      res.end(body)
    },
  })
}
