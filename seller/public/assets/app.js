const $ = (s) => document.querySelector(s)

function fmt(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function badge(status) {
  const map = { unsold: '未售', sold: '已售', activated: '已激活' }
  const el = document.createElement('span')
  el.className = 'badge ' + status
  el.textContent = map[status] || status
  return el
}

async function api(path, opts) {
  const res = await fetch(path, Object.assign({ headers: { 'content-type': 'application/json' } }, opts || {}))
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || ('HTTP ' + res.status))
  return json
}

function renderStats(s) {
  const items = [
    ['卡密总数', s.total],
    ['未售', s.unsold],
    ['已售', s.sold],
    ['已激活', s.activated],
    ['交易额', '¥' + fmt(s.revenue)],
  ]
  const box = $('#kpis')
  box.textContent = ''
  for (const [label, value] of items) {
    const el = document.createElement('div')
    el.className = 'kpi'
    const b = document.createElement('b')
    b.textContent = value
    const sp = document.createElement('span')
    sp.textContent = label
    el.append(b, sp)
    box.append(el)
  }
}

function renderCards(cards) {
  const box = $('#cards')
  box.textContent = ''
  if (!cards.length) {
    const p = document.createElement('p')
    p.style.color = '#7486a3'
    p.textContent = '没有卡密，先在上面生成'
    box.append(p)
    return
  }
  const table = document.createElement('table')
  const thead = document.createElement('thead')
  const htr = document.createElement('tr')
  for (const t of ['卡密', '客户', '产品', '价格', '状态', '创建', '激活', '操作']) {
    const th = document.createElement('th')
    th.textContent = t
    htr.append(th)
  }
  thead.append(htr)
  const tbody = document.createElement('tbody')
  for (const c of cards) {
    const tr = document.createElement('tr')
    const keyTd = document.createElement('td')
    const code = document.createElement('code')
    code.textContent = c.key.slice(0, 26) + '…'
    code.title = c.key
    keyTd.append(code)
    const cells = [keyTd]
    for (const v of [c.sub, c.product, '¥' + c.price]) {
      const td = document.createElement('td')
      td.textContent = v
      cells.push(td)
    }
    const st = document.createElement('td')
    st.append(badge(c.status))
    cells.push(st)
    for (const v of [(c.created_at || '').slice(0, 10), (c.activated_at || '').slice(0, 10)]) {
      const td = document.createElement('td')
      td.textContent = v || '-'
      cells.push(td)
    }
    const act = document.createElement('td')
    const copy = document.createElement('button')
    copy.className = 'ghost'
    copy.textContent = '复制'
    copy.addEventListener('click', () => {
      navigator.clipboard.writeText(c.key).then(() => { copy.textContent = '已复制' })
    })
    act.append(copy)
    if (c.status === 'unsold') {
      const sell = document.createElement('button')
      sell.textContent = '标记已售'
      sell.addEventListener('click', async () => {
        try { await api('/api/sell', { method: 'POST', body: JSON.stringify({ key: c.key }) }); load() } catch (e) { alert(e.message) }
      })
      act.append(sell)
    }
    if (c.status === 'sold') {
      const activate = document.createElement('button')
      activate.className = 'ghost'
      activate.textContent = '标记激活'
      activate.addEventListener('click', async () => {
        try { await api('/api/activate', { method: 'POST', body: JSON.stringify({ key: c.key }) }); load() } catch (e) { alert(e.message) }
      })
      act.append(activate)
    }
    cells.push(act)
    tr.append(...cells)
    tbody.append(tr)
  }
  table.append(thead, tbody)
  box.append(table)
}

function renderOrders(orders) {
  const box = $('#orders')
  box.textContent = ''
  if (!orders.length) { box.textContent = '暂无订单'; box.style.color = '#7486a3'; return }
  const table = document.createElement('table')
  const thead = document.createElement('thead')
  const htr = document.createElement('tr')
  for (const t of ['时间', '金额', '渠道']) { const th = document.createElement('th'); th.textContent = t; htr.append(th) }
  thead.append(htr)
  const tbody = document.createElement('tbody')
  for (const o of orders) {
    const tr = document.createElement('tr')
    for (const v of [o.at.slice(0, 19).replace('T', ' '), '¥' + fmt(o.amount), o.channel]) {
      const td = document.createElement('td'); td.textContent = v; tr.append(td)
    }
    tbody.append(tr)
  }
  table.append(thead, tbody)
  box.append(table)
}

async function load() {
  try {
    const [s, c, o] = await Promise.all([api('/api/stats'), api('/api/cards?q=' + encodeURIComponent($('#q').value) + '&status=' + $('#status').value), api('/api/orders')])
    renderStats(s.stats)
    renderCards(c.cards)
    renderOrders(o.orders)
    $('#upd').textContent = '更新于 ' + new Date().toLocaleTimeString('zh-CN')
  } catch (e) {
    $('#upd').textContent = '加载失败：' + e.message
  }
}

$('#gen').addEventListener('click', async () => {
  const msg = $('#genMsg')
  msg.className = 'msg'
  msg.textContent = '生成中…'
  try {
    const r = await api('/api/gen', {
      method: 'POST',
      body: JSON.stringify({ n: Number($('#n').value), days: Number($('#days').value), price: Number($('#price').value), product: $('#product').value }),
    })
    msg.textContent = '已生成 ' + r.count + ' 张'
    load()
  } catch (e) {
    msg.className = 'msg err'
    msg.textContent = e.message
  }
})

$('#refresh').addEventListener('click', load)
$('#search').addEventListener('click', load)
$('#q').addEventListener('keydown', (e) => { if (e.key === 'Enter') load() })
$('#status').addEventListener('change', load)

load()
setInterval(load, 15000)
