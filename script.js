/* SPDX-License-Identifier: MIT */
/* (c) 2026 Tatsuya Sawano */

/* globals JSINFO */
(function(){
  if(window.__PARTICIPANTS2_INIT__) return;
  window.__PARTICIPANTS2_INIT__ = true;

  function $(sel, ctx){ return (ctx||document).querySelector(sel); }
  function $all(sel, ctx){ return Array.prototype.slice.call((ctx||document).querySelectorAll(sel)); }
  function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function getI18N(root){
    try { return JSON.parse(root.querySelector('script[type="application/x-participants2-i18n"]').textContent); }
    catch(e){ return {}; }
  }

  // ========= AJAX wrapper with token auto-refresh =========
  var latestTok = null;
  function baseUrl(){
    return (window.DOKU_BASE ||
            (document.querySelector('base') && document.querySelector('base').getAttribute('href')) ||
            '/');
  }
  function ajaxURL(){ return baseUrl() + 'lib/exe/ajax.php?call=participants2'; }

  async function getToken(){
    const resp = await fetch(ajaxURL(), {
      method: 'POST',
      credentials: 'same-origin',
      headers: {'Accept':'application/json'},
      body: new URLSearchParams({cmd:'token'})
    });
    const j = await resp.json();
    if(j && j.ok && j.sectok) latestTok = j.sectok;
    return latestTok;
  }

  async function saveWithRetry(payload){
    // always fetch a fresh sectok before write
    await getToken();

    async function send(){
      const params = new URLSearchParams(Object.assign({}, payload, {cmd:'save', sectok: latestTok}));
      const resp = await fetch(ajaxURL(), {
        method: 'POST',
        credentials: 'same-origin',
        headers: {'Accept':'application/json'},
        body: params
      });
      return resp.json();
    }

    let j = await send();
    if(j && (j.error === 'bad_token' || j.code === 'bad_token')){
      await getToken(); // refresh once
      j = await send();
    }
    return j;
  }
  // ========================================================

  function openDialog(root, pill){
    var dict = getI18N(root);
    var name = pill.getAttribute('data-name');
    var status = pill.getAttribute('data-status') || 'absent';
    var desc = pill.getAttribute('data-desc') || '';

    // Build overlay
    var ov = document.createElement('div');
    ov.className = 'participants2-overlay';
    ov.style.display = 'flex';

    var dlg = document.createElement('div');
    dlg.className = 'participants2-dialog';
    dlg.innerHTML =
      '<div class="dlg-title">'+(dict.dlg_title||'Edit')+'</div>'+
      '<div class="row"><strong>'+escapeHtml(name)+'</strong></div>'+
      '<label>'+(dict.dlg_status||'Status')+': '+
        '<select class="pp2-status">'+
          '<option value="present"'+(status==='present'?' selected':'')+'>'+(dict.present_label||'present')+'</option>'+
          '<option value="absent"'+(status==='absent'?' selected':'')+'>'+(dict.absent_label||'absent')+'</option>'+
        '</select>'+
      '</label>'+
      '<label>'+(dict.dlg_desc||'Description')+'<br><input type="text" class="pp2-desc" style="width:100%" value="'+escapeHtml(desc)+'"></label>'+
      '<div class="actions">'+
        '<button type="button" class="pp2-cancel">'+(dict.dlg_cancel||'Cancel')+'</button>'+
        '<button type="button" class="pp2-save">'+(dict.dlg_save||'OK')+'</button>'+
      '</div>';

    ov.appendChild(dlg);
    document.body.appendChild(ov);

    function close(){ document.body.removeChild(ov); }

    ov.addEventListener('click', function(e){ if(e.target===ov) close(); });
    dlg.querySelector('.pp2-cancel').addEventListener('click', close);
    dlg.querySelector('.pp2-save').addEventListener('click', function(){
      saveChange(root, pill, {
        name: name,
        status: dlg.querySelector('.pp2-status').value,
        description: dlg.querySelector('.pp2-desc').value
      }).then(close).catch(function(err){
        alert(err && err.message || 'Error');
      });
    });
  }

  // ここを「token取得＋retry」対応に置き換え
  function saveChange(root, pill, payload){
    var page = root.getAttribute('data-pageid');

    return saveWithRetry({
      page: page,
      name: payload.name,
      status: payload.status,
      description: payload.description
    }).then(function(json){
      if(!json || json.ok !== true){ throw new Error((json && json.error) || 'save_failed'); }
      // Update DOM
      pill.setAttribute('data-status', payload.status);
      pill.setAttribute('data-desc', payload.description);
      var dict = getI18N(root);
      var title = (payload.status==='present' ? (dict.present_label||'present') : (dict.absent_label||'absent'));
      pill.setAttribute('data-title', title);
      pill.classList.toggle('is-present', payload.status==='present');
      pill.classList.toggle('is-absent', payload.status!=='present');
      rebuildComments(root);
    });
  }

  function rebuildComments(root){
    var dict = getI18N(root);
    var box = root.querySelector('.participants2-comments');
    if(!box) return;
    var lines = [];
    $all('.pp2-name', root).forEach(function(p){
      var d = (p.getAttribute('data-desc')||'').trim();
      if(d){
        var nm = p.getAttribute('data-name')||'';
        lines.push('<p>'+escapeHtml(nm)+': '+escapeHtml(d)+'</p>');
      }
    });
    box.innerHTML = '<p>'+escapeHtml(dict.comment_heading||'Attendance comments')+'</p>' + (lines.join(''));
  }

  function firstToken(name){
    var s = (name || '').trim();
    if(!s) return '';
    var parts = s.split(/[\u0020\u3000]+/);
    return parts[0] || s;
  }

  function collectNames(root, wantPresent, wantAbsent){
    var out = [];
    $all('.pp2-name', root).forEach(function(p){
      var st = p.getAttribute('data-status') || 'absent';
      if((st === 'present' && wantPresent) || (st === 'absent' && wantAbsent)){
        out.push(p.getAttribute('data-name') || '');
      }
    });
    return out;
  }

  function formatList(arr, delim){
    var sep = (delim === 'space') ? ' ' : (delim === 'comma' ? ', ' : '\n');
    return arr.join(sep);
  }

  function toast(msg){
    var t = document.createElement('div');
    t.className = 'pp2-toast';
    t.textContent = msg || 'Copied!';
    document.body.appendChild(t);
    setTimeout(function(){ t.classList.add('on'); }, 10);
    setTimeout(function(){ t.classList.remove('on'); t.remove(); }, 1500);
  }

  function copyToClipboard(text, copiedMsg){
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(function(){
        toast(copiedMsg || 'Copied!');
      }).catch(function(){
        fallbackCopy(text, copiedMsg);
      });
    }else{
      fallbackCopy(text, copiedMsg);
    }
  }

  function fallbackCopy(text, copiedMsg){
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    toast(copiedMsg || 'Copied!');
  }

  function openExportModal(root){
    var dict = getI18N(root);
    var L = {
      title: dict.export_title || 'Export options',
      range: dict.export_range || 'Range',
      present: dict.export_present || 'Present',
      absent: dict.export_absent || 'Absent',
      nameMode: dict.export_name_mode || 'Name mode',
      full: dict.export_full || 'Full name',
      first: dict.export_first || 'First token',
      delim: dict.export_delim || 'Delimiter',
      space: dict.export_space || 'Space',
      comma: dict.export_comma || 'Comma',
      newline: dict.export_newline || 'Newline',
      run: dict.export_run || 'Copy',
      output: dict.export_output || 'Output',
      copied: dict.export_copied || 'Copied!'
    };

    var existing = document.querySelector('.pp2-export-overlay');
    if(existing) existing.remove();

    var ov = document.createElement('div');
    ov.className = 'pp2-export-overlay';
    ov.innerHTML =
      '<div class="pp2-export-dialog">' +
        '<div class="pp2-export-head">' +
          '<span class="pp2-export-title"></span>' +
          '<button type="button" class="pp2-export-close">×</button>' +
        '</div>' +
        '<div class="pp2-export-body">' +
          '<div class="pp2-export-row">' +
            '<label>'+escapeHtml(L.range)+'</label>' +
            '<label><input type="checkbox" class="pp2-ex-present" checked> '+escapeHtml(L.present)+'</label>' +
            '<label><input type="checkbox" class="pp2-ex-absent"> '+escapeHtml(L.absent)+'</label>' +
          '</div>' +
          '<div class="pp2-export-row">' +
            '<label>'+escapeHtml(L.nameMode)+'</label>' +
            '<label><input type="radio" name="pp2-name-mode" value="first" checked> '+escapeHtml(L.first)+'</label>' +
            '<label><input type="radio" name="pp2-name-mode" value="full"> '+escapeHtml(L.full)+'</label>' +
          '</div>' +
          '<div class="pp2-export-row">' +
            '<label>'+escapeHtml(L.delim)+'</label>' +
            '<label><input type="radio" name="pp2-delim" value="comma" checked> '+escapeHtml(L.comma)+'</label>' +
            '<label><input type="radio" name="pp2-delim" value="space"> '+escapeHtml(L.space)+'</label>' +
            '<label><input type="radio" name="pp2-delim" value="newline"> '+escapeHtml(L.newline)+'</label>' +
          '</div>' +
          '<div class="pp2-export-row">' +
            '<label>'+escapeHtml(L.output)+'</label>' +
            '<textarea class="pp2-ex-out" readonly></textarea>' +
          '</div>' +
        '</div>' +
        '<div class="pp2-export-foot">' +
          '<button type="button" class="pp2-btn pp2-btn--primary pp2-ex-run">'+escapeHtml(L.run)+'</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(ov);
    ov.querySelector('.pp2-export-title').textContent = L.title;

    function close(){ ov.remove(); }
    ov.addEventListener('click', function(e){ if(e.target === ov) close(); });
    ov.querySelector('.pp2-export-close').addEventListener('click', close);

    function buildOutput(){
      var wantPresent = ov.querySelector('.pp2-ex-present').checked;
      var wantAbsent = ov.querySelector('.pp2-ex-absent').checked;
      var modeEl = ov.querySelector('input[name="pp2-name-mode"]:checked');
      var delimEl = ov.querySelector('input[name="pp2-delim"]:checked');
      var mode = modeEl ? modeEl.value : 'first';
      var delim = delimEl ? delimEl.value : 'comma';
      var names = collectNames(root, wantPresent, wantAbsent).map(function(n){
        var name = (n || '').trim();
        return mode === 'first' ? firstToken(name) : name;
      }).filter(Boolean);
      return formatList(names, delim);
    }

    function updateOutput(){
      ov.querySelector('.pp2-ex-out').value = buildOutput();
    }

    updateOutput();

    ov.addEventListener('change', function(e){
      if(e.target && e.target.matches('input[type="checkbox"], input[type="radio"]')){
        updateOutput();
      }
    });

    ov.querySelector('.pp2-ex-run').addEventListener('click', function(){
      updateOutput();
      var out = ov.querySelector('.pp2-ex-out').value;
      copyToClipboard(out, L.copied);
    });
  }

  function init(){
    $all('.participants2-root').forEach(function(root){
      // 旧HTMLに埋め込まれた data-sectok はもう使わない（陳腐化対策）
      root.removeAttribute('data-sectok');

      root.addEventListener('click', function(e){
        var pill = e.target && e.target.closest('.pp2-name');
        if(!pill) return;
        // ACL check
        if(root.getAttribute('data-canedit') !== '1'){
          var dict = getI18N(root);
          alert(dict.no_permission || 'No permission');
          return;
        }
        openDialog(root, pill);
      });

      root.addEventListener('click', function(e){
        var btn = e.target && e.target.closest('[data-pp2-export="1"]');
        if(!btn) return;
        openExportModal(root);
      });
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
