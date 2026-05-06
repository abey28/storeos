/* ══════════════════════════════════════════════════════
   設定（業績獎金規則 / 彈性專案 / 班別 / 保費級距）
══════════════════════════════════════════════════════ */
function renderTiers(){
  document.getElementById('tier-list').innerHTML=[...tiers].sort((a,b)=>a.threshold-b.threshold).map((t,i)=>'<div class="tier-row"><input type="number" class="t-th" value="'+t.threshold+'" min="0" placeholder="門檻金額" oninput="previewTiers()"><input type="number" class="t-bo" value="'+t.bonus+'" min="0" placeholder="獎金額" oninput="previewTiers()"><button class="btn btn-danger btn-sm" onclick="removeTier('+i+')">✕</button></div>').join('');
  previewTiers();
}
function addTier(){const maxT=tiers.length?Math.max(...tiers.map(t=>t.threshold)):0;tiers.push({threshold:maxT+5000,bonus:0});tiers.sort((a,b)=>a.threshold-b.threshold);renderTiers();}
function removeTier(i){tiers.splice(i,1);renderTiers();}
function saveTiers(){
  tiers=[];document.querySelectorAll('#tier-list .tier-row').forEach(row=>{const th=Number(row.querySelector('.t-th').value),bo=Number(row.querySelector('.t-bo').value);if(th>0)tiers.push({threshold:th,bonus:bo});});
  tiers.sort((a,b)=>a.threshold-b.threshold);saveTiersKey();renderTiers();
  logAction('修改業績獎金規則',tiers.map(t=>'$'+fmt(t.threshold)+'→$'+t.bonus).join(' / '));
  showToast('✅ 階梯規則已儲存');
}
function previewTiers(){
  const temp=[];document.querySelectorAll('#tier-list .tier-row').forEach(row=>{const th=Number(row.querySelector('.t-th').value),bo=Number(row.querySelector('.t-bo').value);if(th>0)temp.push({threshold:th,bonus:bo});});temp.sort((a,b)=>a.threshold-b.threshold);
  if(!temp.length){document.getElementById('tier-preview').innerHTML='';return;}
  let html='<div style="font-size:10px;color:var(--text-muted);letter-spacing:2px;margin-bottom:10px;">規則預覽</div><div style="display:flex;flex-wrap:wrap;gap:8px;">';
  temp.forEach((t,i)=>{const next=temp[i+1],range=next?'$'+fmt(t.threshold)+' ～ $'+fmt(next.threshold-1):'$'+fmt(t.threshold)+' 以上';html+='<div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px 16px;"><div style="font-size:10px;color:var(--text-muted);margin-bottom:3px;">'+range+'</div><div style="font-family:DM Mono;color:var(--gold-light);">$'+fmt(t.bonus)+'</div></div>';});
  document.getElementById('tier-preview').innerHTML=html+'</div>';
}

function saveProjType(){
  const name=document.getElementById('pt-name').value.trim(),amt=Number(document.getElementById('pt-amt').value);
  if(!name||!amt){showToast('⚠ 請填寫名稱與每次獎金');return;}
  projTypes.push({id:'pt'+Date.now(),name,amt,desc:document.getElementById('pt-desc').value.trim(),from:document.getElementById('pt-from').value,to:document.getElementById('pt-to').value,active:true});
  saveProjTypesKey();renderProjTypes();
  logAction('新增彈性專案獎金',name+' +$'+amt+'/次');
  showToast('✅ 已新增：'+name);
  ['pt-name','pt-amt','pt-desc','pt-from','pt-to'].forEach(i=>document.getElementById(i).value='');
}
function toggleProj(id){const pt=projTypes.find(p=>p.id===id);if(pt){pt.active=!pt.active;saveProjTypesKey();renderProjTypes();logAction((pt.active?'啟用':'停用')+'彈性專案',pt.name);}}
function deleteProj(id){
  const pt=projTypes.find(p=>p.id===id);
  if(!confirm('確定刪除此專案？'))return;
  if(pt)logAction('刪除彈性專案',pt.name+' +$'+pt.amt+'/次');
  projTypes=projTypes.filter(p=>p.id!==id);saveProjTypesKey();renderProjTypes();showToast('🗑 已刪除');
}
function renderProjTypes(){
  const el=document.getElementById('proj-list');
  if(!projTypes.length){el.innerHTML='<div class="empty-state"><div class="emo">🎯</div>尚未建立彈性專案</div>';return;}
  el.innerHTML=projTypes.map(pt=>'<div class="proj-card"><div style="font-size:20px;">🎯</div><div class="proj-name"><div style="font-weight:600;">'+escapeHtml(pt.name)+'</div><div style="font-size:11px;color:var(--text-muted);margin-top:2px;">'+escapeHtml(pt.desc||'無說明')+' ／ '+(pt.from||pt.to?(pt.from||'—')+' ～ '+(pt.to||'—'):'長期有效')+'</div></div><div class="proj-amt">+$'+pt.amt+'/次</div><span class="badge '+(pt.active?'badge-green':'badge-red')+'" style="cursor:pointer;" onclick="toggleProj(\''+escapeHtml(pt.id)+'\')">'+(pt.active?'啟用中':'已停用')+'</span><button class="btn btn-danger btn-sm" style="margin-left:8px;" onclick="deleteProj(\''+escapeHtml(pt.id)+'\')">刪除</button></div>').join('');
}

function renderShifts(){
  const stores=getStores();
  let html='';
  stores.forEach(store=>{
    if(!shifts[store])shifts[store]=[];
    const isDefault=['台北車站','中山誠品','松菸誠品'].includes(store);
    html+='<div style="margin-bottom:22px;"><div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:10px;display:flex;align-items:center;gap:8px;"><span class="dot" style="background:'+sc(store)+'"></span>'+escapeHtml(store)+
      (!isDefault?'<button class="btn btn-danger btn-sm" style="margin-left:auto;" onclick="deleteStore(\''+escapeHtml(store)+'\')" title="刪除此門市（不影響已有紀錄）">刪除門市</button>':'')+'</div>';
    html+='<div id="shift-list-'+store.replace(/[^a-zA-Z一-鿿]/g,'')+'">';
    shifts[store].forEach((sh,i)=>{
      const hr=sh.hourlyRate||sh.wage||0;
      html+='<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">';
      html+='<input type="text" class="sh-name" data-store="'+escapeHtml(store)+'" data-idx="'+i+'" value="'+escapeHtml(sh.name)+'" placeholder="班別名稱" style="width:120px;">';
      html+='<input type="number" class="sh-hours" data-store="'+escapeHtml(store)+'" data-idx="'+i+'" value="'+sh.hours+'" step="0.5" min="0" placeholder="時數" style="width:80px;">';
      html+='<span style="font-size:11px;color:var(--text-muted)">小時</span>';
      html+='<input type="number" class="sh-rate" data-store="'+escapeHtml(store)+'" data-idx="'+i+'" value="'+hr+'" min="0" placeholder="時薪" style="width:90px;">';
      html+='<span style="font-size:11px;color:var(--text-muted)">元/時</span>';
      html+='<button class="btn btn-danger btn-sm" onclick="removeShift(\''+escapeHtml(store)+'\','+i+')">✕</button></div>';
    });
    html+='</div><button class="btn btn-ghost btn-sm" onclick="addShift(\''+escapeHtml(store)+'\')" style="margin-top:4px;">＋ 新增班別</button></div>';
  });
  html+='<div style="font-size:11px;color:var(--text-muted);margin-top:4px;margin-bottom:16px;">依勞基法：前8小時按時薪、第9-10小時 ×1.34、10小時以上 ×1.67</div>';
  html+='<div style="margin-top:16px;"><button class="btn btn-primary" onclick="saveShifts()">儲存班別設定</button></div>';
  document.getElementById('shifts-config').innerHTML=html;
}
function addShift(store){if(!shifts[store])shifts[store]=[];shifts[store].push({name:'新班別',hours:8,hourlyRate:175});renderShifts();}
function removeShift(store,idx){shifts[store].splice(idx,1);renderShifts();}
function deleteStore(store){
  if(['台北車站','中山誠品','松菸誠品'].includes(store)){showToast('⚠ 預設門市無法刪除');return;}
  if(!confirm('確定刪除門市「'+store+'」的班別設定？\n（歷史紀錄不受影響，但登記頁面將移除此門市選項）'))return;
  delete shifts[store];saveShiftsKey();refreshStoreSelects();renderShifts();
  logAction('刪除門市',store);
  showToast('✅ 已刪除門市：'+store);
}
function saveShifts(){
  const stores=getStores();
  stores.forEach(store=>{
    shifts[store]=[];
    document.querySelectorAll('.sh-name[data-store="'+store+'"]').forEach(el=>{
      const idx=el.getAttribute('data-idx');
      const hours=Number(document.querySelector('.sh-hours[data-store="'+store+'"][data-idx="'+idx+'"]').value);
      const hourlyRate=Number(document.querySelector('.sh-rate[data-store="'+store+'"][data-idx="'+idx+'"]').value);
      if(el.value.trim())shifts[store].push({name:el.value.trim(),hours,hourlyRate});
    });
  });
  saveShiftsKey();renderShifts();
  logAction('修改班別薪資設定',Object.keys(shifts).length+' 間門市');
  showToast('✅ 班別設定已儲存');
}

/* ── 保費級距表管理 ── */
function initBracketsPage(){
  const sel=document.getElementById('bracket-year-sel');
  const years=Object.keys(insuranceBrackets).sort().reverse();
  sel.innerHTML=years.map(y=>'<option value="'+y+'">'+y+' 年</option>').join('');
  renderBracketTables();
}
function renderBracketTables(){
  const year=document.getElementById('bracket-year-sel').value;
  const data=insuranceBrackets[year]||(insuranceBrackets[year]=JSON.parse(JSON.stringify(DEFAULT_INSURANCE_BRACKETS['2026'])));
  renderOneBracketTable('li',data.li,'li-bracket-wrap');
  renderOneBracketTable('nhi',data.nhi,'nhi-bracket-wrap');
  document.getElementById('bracket-del-btn').disabled=Object.keys(insuranceBrackets).length<=1;
}
function renderOneBracketTable(type,rows,wrapId){
  const el=document.getElementById(wrapId);if(!el)return;
  let html='<table style="width:100%;border-collapse:collapse;font-size:13px;">'+
    '<thead><tr>'+
    '<th style="padding:6px 8px;text-align:left;color:var(--gold);font-size:10px;letter-spacing:1px;border-bottom:1px solid var(--border);">投保薪資</th>'+
    '<th style="padding:6px 8px;text-align:right;color:var(--gold);font-size:10px;letter-spacing:1px;border-bottom:1px solid var(--border);">員工負擔</th>'+
    '<th style="width:28px;border-bottom:1px solid var(--border);"></th></tr></thead><tbody>';
  rows.forEach((r,i)=>{
    html+='<tr>'+
      '<td style="padding:3px 6px;"><input type="number" value="'+r.salary+'" min="0" onchange="updateBracketCell(\''+type+'\','+i+',\'salary\',this.value)" style="width:100px;"></td>'+
      '<td style="padding:3px 6px;text-align:right;"><input type="number" value="'+r.emp+'" min="0" onchange="updateBracketCell(\''+type+'\','+i+',\'emp\',this.value)" style="width:80px;text-align:right;"></td>'+
      '<td style="padding:3px 4px;"><button onclick="deleteBracketRow(\''+type+'\','+i+')" style="color:var(--red);background:none;border:none;cursor:pointer;font-size:16px;line-height:1;">×</button></td>'+
      '</tr>';
  });
  el.innerHTML=html+'</tbody></table>';
}
function getBracketYear(){return document.getElementById('bracket-year-sel').value;}
function updateBracketCell(type,idx,field,val){
  const year=getBracketYear();
  insuranceBrackets[year][type][idx][field]=Number(val);
}
function deleteBracketRow(type,idx){
  const year=getBracketYear();
  insuranceBrackets[year][type].splice(idx,1);
  renderBracketTables();
}
function addBracketRow(type){
  const year=getBracketYear();
  insuranceBrackets[year][type].push({salary:0,emp:0});
  renderBracketTables();
}
function addBracketYear(){
  const yr=prompt('請輸入年度（例：2027）');
  if(!yr||!/^\d{4}$/.test(yr.trim())){showToast('請輸入4位數年度');return;}
  if(insuranceBrackets[yr.trim()]){showToast('此年度已存在');return;}
  insuranceBrackets[yr.trim()]=JSON.parse(JSON.stringify(DEFAULT_INSURANCE_BRACKETS['2026']));
  initBracketsPage();
  document.getElementById('bracket-year-sel').value=yr.trim();
  renderBracketTables();
}
function deleteBracketYear(){
  const year=getBracketYear();
  if(Object.keys(insuranceBrackets).length<=1){showToast('至少保留一個年度');return;}
  if(!confirm('確定刪除 '+year+' 年度的級距表？此操作儲存後生效。'))return;
  delete insuranceBrackets[year];
  initBracketsPage();
}
function saveBrackets(){
  const year=getBracketYear();
  // 儲存前排序
  Object.values(insuranceBrackets).forEach(yr=>{
    yr.li.sort((a,b)=>a.salary-b.salary);
    yr.nhi.sort((a,b)=>a.salary-b.salary);
  });
  saveKey('insuranceBrackets',insuranceBrackets);
  renderBracketTables();
  showToast('✅ 級距表已儲存');
  logAction('更新保費級距表','年度：'+year);
}
function resetBracketsToDefault(){
  const year=getBracketYear();
  if(!confirm('確定將 '+year+' 年度重置為內建預設值？（尚未儲存）'))return;
  insuranceBrackets[year]=JSON.parse(JSON.stringify(DEFAULT_INSURANCE_BRACKETS['2026']));
  renderBracketTables();
  showToast('已重置（尚未儲存，請按「儲存級距表」）');
}
