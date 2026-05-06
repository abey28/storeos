/* ══════════════════════════════════════════════════════
   操作紀錄（Audit Log）頁面
══════════════════════════════════════════════════════ */
async function initLogsPage(){
  await loadLogs(500);
  rebuildLogsFilters();
  renderLogs();
}
async function refreshLogs(){
  await loadLogs(500);
  rebuildLogsFilters();
  renderLogs();
  showToast('✅ 已更新操作紀錄');
}
function rebuildLogsFilters(){
  const users=[...new Set(logs.map(l=>l.user||'訪客'))].sort();
  const actions=[...new Set(logs.map(l=>l.action||''))].filter(Boolean).sort();
  const uSel=document.getElementById('logs-user');
  const aSel=document.getElementById('logs-action');
  if(uSel){
    const cur=uSel.value;
    uSel.innerHTML='<option value="">全部</option>'+users.map(u=>'<option value="'+u+'">'+u+'</option>').join('');
    if([...uSel.options].some(o=>o.value===cur))uSel.value=cur;
  }
  if(aSel){
    const cur=aSel.value;
    aSel.innerHTML='<option value="">全部</option>'+actions.map(a=>'<option value="'+a+'">'+a+'</option>').join('');
    if([...aSel.options].some(o=>o.value===cur))aSel.value=cur;
  }
}
function filteredLogs(){
  const u=document.getElementById('logs-user')?.value||'';
  const a=document.getElementById('logs-action')?.value||'';
  const kw=(document.getElementById('logs-kw')?.value||'').trim().toLowerCase();
  return logs.filter(l=>{
    if(u&&(l.user||'訪客')!==u)return false;
    if(a&&l.action!==a)return false;
    if(kw){
      const blob=((l.user||'')+' '+l.action+' '+(l.detail||'')).toLowerCase();
      if(!blob.includes(kw))return false;
    }
    return true;
  });
}
function actionBadgeClass(a){
  if(!a)return 'badge';
  if(a.indexOf('刪除')>=0)return 'badge badge-red';
  if(a.indexOf('新增')>=0)return 'badge badge-green';
  if(a.indexOf('匯入')>=0||a.indexOf('匯出')>=0)return 'badge badge-gold';
  return 'badge badge-gold';
}
function renderLogs(){
  const tbody=document.getElementById('logs-tbody');
  const empty=document.getElementById('logs-empty');
  const stat=document.getElementById('logs-stat');
  const data=filteredLogs();
  if(stat)stat.textContent=data.length+' / '+logs.length+' 筆（後端總計 '+logsTotal+' 筆）';
  if(!data.length){tbody.innerHTML='';empty.style.display='';return;}
  empty.style.display='none';
  tbody.innerHTML=data.map(l=>
    '<tr>'+
      '<td><span style="font-family:DM Mono;font-size:11px;color:var(--text-dim)">'+fmtLogTime(l.ts)+'</span></td>'+
      '<td style="font-size:12px;"><span class="badge badge-gold">'+escapeHtml(l.user||'訪客')+'</span></td>'+
      '<td><span class="'+actionBadgeClass(l.action)+'">'+escapeHtml(l.action)+'</span></td>'+
      '<td style="font-size:12px;color:var(--text-dim);max-width:520px;word-break:break-all;">'+escapeHtml(l.detail||'—')+'</td>'+
      '<td style="font-family:DM Mono;font-size:10px;color:var(--text-muted)">'+escapeHtml(l.ip||'')+'</td>'+
    '</tr>').join('');
}
function exportLogsCSV(){
  const data=filteredLogs();
  const rows=[['時間','使用者','動作','詳細內容','IP']];
  data.forEach(l=>rows.push([fmtLogTime(l.ts),l.user||'訪客',l.action||'',l.detail||'',l.ip||'']));
  dlCSV(rows,'操作紀錄_'+isoToday());
}
