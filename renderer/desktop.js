// Desktop additions are deliberately small: widgets never execute imported code.
(() => {
  const invoke = window.__TAURI__.core.invoke;
  window.monoDesktop = {
    exportDashboard: data => invoke('export_dashboard', { data }),
    importDashboard: () => invoke('import_dashboard')
  };
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (link && /^https?:/i.test(link.href)) { event.preventDefault(); invoke('open_link', { url: link.href }).catch(e => alert(String(e))); }
  });
  document.querySelector('#fullscreen').onclick = () => invoke('toggle_fullscreen');
  const actions = document.querySelector('.head-actions');
  const backup = document.createElement('button');
  backup.className = 'icon-btn'; backup.title = 'バックアップ / 復元'; backup.textContent = '⇅';
  actions.prepend(backup);
  backup.onclick = async () => {
    const choice = prompt('1：バックアップを書き出す\n2：バックアップから復元する', '1');
    try {
      if (choice === '1') await window.monoDesktop.exportDashboard(JSON.stringify({format:'mono-dashboard', version:1, cards:state.cards}, null, 2));
      if (choice === '2') {
        const raw = await window.monoDesktop.importDashboard(); if (raw === null) return;
        const data = JSON.parse(raw);
        if (data.format !== 'mono-dashboard' || data.version !== 1 || !Array.isArray(data.cards) || data.cards.length > 100) throw new Error('MONO のバックアップではありません。');
        const allowed = ['clock','quote','note','calendar','timer','links','embed','custom'];
        if (!data.cards.every(c => c && typeof c === 'object' && allowed.includes(c.type) && (typeof c.id === 'number' || typeof c.id === 'string') && (c.text === undefined || typeof c.text === 'string') && (c.url === undefined || typeof c.url === 'string') && (c.type !== 'links' || (Array.isArray(c.links) && c.links.length <= 100 && c.links.every(l => l && typeof l.name === 'string' && typeof l.url === 'string'))) && (c.type !== 'custom' || (typeof c.title === 'string' && typeof c.body === 'string')))) throw new Error('カードの形式が正しくありません。');
        if (!confirm('現在のレイアウトとメモをバックアップの内容で置き換えます。よろしいですか？')) return;
        state.cards = data.cards; save(); render();
      }
    } catch (e) { alert(`操作できませんでした：${e.message}`); }
  };
  const originalCard = card;
  card = function(c, i) {
    if (c.type !== 'custom') return originalCard(c, i);
    const url = safeUrl(c.url);
    return `<article class="card custom-card" draggable="${editing}" data-id="${esc(c.id)}"><div class="edit-controls"><button class="move-left" title="前へ移動">←</button><button class="move-right" title="後へ移動">→</button><button class="remove" title="削除">×</button></div><div class="card-top"><span class="card-label">CUSTOM WIDGET</span><span class="card-index">${pad(i+1)} / ✳</span></div><div class="custom-content"><h3>${esc(c.title)}</h3><p>${esc(c.body)}</p></div>${url ? `<a class="custom-link" target="_blank" rel="noopener noreferrer" href="${esc(url)}">${esc(c.linkLabel || 'OPEN LINK')} ↗</a>` : '<span class="card-meta">MADE FOR YOUR SPACE</span>'}</article>`;
  };
  const pluginButton = document.createElement('button');
  pluginButton.className = 'choice';
  pluginButton.innerHTML = '<i>✧</i><b>カスタムを読み込む</b><small>JSON ファイルから追加</small>';
  // Stop the choice list handler from treating this as a built-in widget.
  pluginButton.onclick = async e => {
    e.stopPropagation();
    try {
      const raw = await window.monoDesktop.importDashboard(); if (raw === null) return;
      const p = JSON.parse(raw);
      if (p.format !== 'mono-widget' || p.version !== 1 || typeof p.title !== 'string' || !p.title.trim() || p.title.length > 100 || typeof p.body !== 'string' || p.body.length > 1000 || (p.url && !safeUrl(p.url))) throw new Error('ウィジェットの形式を確認してください。');
      state.cards.push({id:Date.now()+Math.random(),type:'custom',title:p.title,body:p.body,url:p.url || '',linkLabel:typeof p.linkLabel === 'string' ? p.linkLabel.slice(0,80) : ''});
      save(); document.querySelector('#dialog').close(); editing=true; render();
    } catch (e) { alert(`読み込めませんでした：${e.message}`); }
  };
  document.querySelector('#choices').append(pluginButton);
  render();
})();
