/* ══════════════════════════════════════════════════════
   歷史紀錄
══════════════════════════════════════════════════════ */
function renderHistory(){
  const fs=document.getElementById('hist-store').value,fm=document.getElementById('hist-month').value;
  let data=[...records].sort((a,b)=>b.date.localeCompare(a.date));
  if(fs)data=data.filter(r=>r.store===fs);if(fm)data=data.filter(r=>r.date.startsWith(fm));
  const tbody=document.getElementById('hist-tbody'),empty=document.getElementById('hist-empty');
  if(!data.length){tbody.innerHTML='';empty.style.display='';return;}
  empty.style.display='none';
  tbody.innerHTML=data.map(r=>{
    const proj=r.projEntries&&r.projEntries.length?'<span style="font-size:10px;color:var(--text-muted);margin-left:4px">('+r.projEntries.map(e=>(e.staffName?e.staffName+':':'')+e.name+'×'+e.count).join('、')+')</span>':'';
    const wageSum=r.totalWage||0;
    const wageDetail=r.wageData?Object.entries(r.wageData).map(([n,w])=>n+':'+w.shift+' '+w.hours+'h $'+fmt(w.wage)).join('、'):'';
    const deductSum=r.totalDeduct||0;
    const deductDetail=r.deductData?Object.entries(r.deductData).filter(([,d])=>d.amt>0).map(([n,d])=>n+':-$'+fmt(d.amt)+(d.reason?' ('+d.reason+')':'')).join('、'):'';
    const deductCell=deductSum>0?'<span style="font-family:DM Mono;color:var(--red)">-$'+fmt(deductSum)+'</span>'+(deductDetail?'<span style="font-size:9px;color:var(--text-muted);display:block;">'+deductDetail+'</span>':''):'<span style="color:var(--text-muted)">—</span>';
    const doublebadge=r.doublePay?'<span style="font-size:9px;background:rgba(230,126,34,.15);color:#e67e22;border:1px solid rgba(230,126,34,.3);border-radius:8px;padding:1px 6px;margin-left:4px;">×2</span>':'';
    const allowSum=r.totalAllow||0;
    const allowDetail=r.allowanceData?Object.entries(r.allowanceData).filter(([,a])=>a.amt>0).map(([n,a])=>n+':+$'+fmt(a.amt)+(a.reason?' ('+a.reason+')':'')).join('、'):'';
    const allowCell=allowSum>0?'<span style="font-family:DM Mono;color:#f0b27a">+$'+fmt(allowSum)+'</span>'+(allowDetail?'<span style="font-size:9px;color:var(--text-muted);display:block;">'+allowDetail+'</span>':''):'<span style="color:var(--text-muted)">—</span>';
    return '<tr data-ts="'+r.ts+'"><td><span style="font-family:DM Mono;font-size:12px">'+r.date+'</span></td><td><span class="dot" style="background:'+sc(r.store)+'"></span>'+escapeHtml(r.store)+'</td><td><div class="tag-list">'+r.staff.map(e=>'<span class="tag">'+escapeHtml(rsName(e))+'</span>').join('')+'</div></td><td style="font-family:DM Mono;color:var(--gold-light)">$'+fmt(r.sales)+'</td><td style="font-family:DM Mono;color:var(--text-dim)">$'+fmt(wageSum)+doublebadge+(wageDetail?'<span style="font-size:9px;color:var(--text-muted);display:block;">'+wageDetail+'</span>':'')+'</td><td style="font-family:DM Mono;color:#82e0aa">$'+fmt(r.totalBonus||0)+(r.bonusOverride&&Object.keys(r.bonusOverride).length?'<br><span style="font-size:9px;background:rgba(230,126,34,.15);color:#e67e22;border:1px solid rgba(230,126,34,.3);border-radius:8px;padding:1px 5px;">⚡例外: '+Object.entries(r.bonusOverride).map(([n,v])=>escapeHtml(n)+' +$'+fmt(v)).join('、')+'</span>':'')+'</td><td style="font-family:DM Mono;color:#bb8fce">$'+fmt(r.totalProjBonus||0)+proj+'</td><td>'+allowCell+'</td><td>'+deductCell+'</td><td style="font-size:11px;color:var(--text-muted)">'+escapeHtml(r.note||'—')+'</td><td style="white-space:nowrap"><button class="btn btn-ghost btn-sm" onclick="editRecord('+r.ts+')">編輯</button> <button class="btn btn-danger btn-sm" onclick="deleteRecord('+r.ts+')">刪除</button></td></tr>';
  }).join('');
}
function editRecord(ts){
  const r=records.find(x=>x.ts===ts);if(!r)return;
  const tr=document.querySelector('tr[data-ts="'+ts+'"]');if(!tr)return;
  const storeOpts=getStores().map(s=>'<option value="'+escapeHtml(s)+'"'+(s===r.store?' selected':'')+'>'+escapeHtml(s)+'</option>').join('');
  const staffChecks=staff.map(s=>'<label style="font-size:11px;color:var(--text-dim);cursor:pointer;"><input type="checkbox" class="ed-rec-staff" value="'+escapeHtml(s.name)+'"'+(r.staff.some(e=>rsName(e)===s.name)?' checked':'')+'>'+escapeHtml(s.name)+'</label>').join(' ');
  let wageHtml='';
  r.staff.forEach(entry=>{
    const name=rsName(entry);
    const w=r.wageData&&r.wageData[name]?r.wageData[name]:{shift:'',hours:8,wage:0};
    wageHtml+='<div style="font-size:11px;margin-top:4px;">'+escapeHtml(name)+': <input type="number" class="ed-rec-hours" data-name="'+escapeHtml(name)+'" value="'+w.hours+'" step="0.5" style="width:90px;">h <span style="color:var(--text-muted);font-size:10px;">（薪資系統自動計算）</span></div>';
  });
  let deductHtml='';
  r.staff.forEach(entry=>{
    const name=rsName(entry);
    const d=r.deductData&&r.deductData[name]?r.deductData[name]:{amt:0,reason:''};
    deductHtml+='<div style="font-size:11px;margin-top:4px;display:flex;align-items:center;gap:6px;">'+escapeHtml(name)+': <input type="number" class="ed-rec-damt" data-name="'+escapeHtml(name)+'" value="'+(d.amt||0)+'" min="0" style="width:70px;">元 <input type="text" class="ed-rec-dreason" data-name="'+escapeHtml(name)+'" value="'+escapeHtml(d.reason||'')+'" placeholder="扣款說明" style="width:180px;"></div>';
  });
  let allowHtml='';
  r.staff.forEach(entry=>{
    const name=rsName(entry);
    const a=r.allowanceData&&r.allowanceData[name]?r.allowanceData[name]:{amt:0,reason:''};
    allowHtml+='<div style="font-size:11px;margin-top:4px;display:flex;align-items:center;gap:6px;">'+escapeHtml(name)+': <input type="number" class="ed-rec-aamt" data-name="'+escapeHtml(name)+'" value="'+(a.amt||0)+'" min="0" style="width:70px;">元 <input type="text" class="ed-rec-areason" data-name="'+escapeHtml(name)+'" value="'+escapeHtml(a.reason||'')+'" placeholder="例：誤餐費、代班補貼、車馬費" style="width:200px;"></div>';
  });
  let internBonusHtml='';
  r.staff.filter(entry=>{const name=rsName(entry);const s=staff.find(x=>x.name===name);return s&&s.isIntern;}).forEach(entry=>{
    const name=rsName(entry);
    const override=r.bonusOverride&&r.bonusOverride[name]!=null?r.bonusOverride[name]:0;
    internBonusHtml+='<div style="font-size:11px;margin-top:4px;display:flex;align-items:center;gap:6px;">🎓 '+escapeHtml(name)+': <input type="number" class="ed-rec-intern-bonus" data-name="'+escapeHtml(name)+'" value="'+(override||0)+'" min="0" style="width:90px;">元 <span style="font-size:9px;color:#e67e22;">⚡例外</span></div>';
  });
  tr.innerHTML='<td colspan="11" style="padding:14px;background:var(--surface2);border-radius:8px;"><div style="display:flex;flex-wrap:wrap;gap:10px;align-items:flex-start;"><div><label style="font-size:10px;color:var(--text-muted);">日期</label><input type="date" id="ed-rec-date" value="'+r.date+'" style="width:130px;"></div><div><label style="font-size:10px;color:var(--text-muted);">門市</label><select id="ed-rec-store">'+storeOpts+'</select></div><div><label style="font-size:10px;color:var(--text-muted);">營業額</label><input type="number" id="ed-rec-sales" value="'+r.sales+'" style="width:100px;"></div><div><label style="font-size:10px;color:var(--text-muted);">備註</label><input type="text" id="ed-rec-note" value="'+(r.note||'')+'" style="width:150px;"></div><div style="display:flex;align-items:flex-end;"><label style="font-size:11px;color:#e67e22;cursor:pointer;display:flex;align-items:center;gap:6px;"><input type="checkbox" id="ed-rec-double" '+(r.doublePay?'checked':'')+' style="width:auto;padding:0;background:transparent;border:none;"> 🎉 雙倍薪資</label></div></div><div style="margin-top:8px;"><label style="font-size:10px;color:var(--text-muted);">員工</label><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;">'+staffChecks+'</div></div><div style="margin-top:8px;"><label style="font-size:10px;color:var(--text-muted);">薪資</label>'+wageHtml+'</div><div style="margin-top:8px;"><label style="font-size:10px;color:#f0b27a;letter-spacing:1px;">➕ 個人加項</label>'+allowHtml+'</div>'+(internBonusHtml?'<div style="margin-top:8px;"><label style="font-size:10px;color:#e67e22;letter-spacing:1px;">🎓 實習生業績例外調整</label>'+internBonusHtml+'</div>':'')+'<div style="margin-top:8px;"><label style="font-size:10px;color:var(--red);letter-spacing:1px;">🚫 違規扣款</label>'+deductHtml+'</div><div style="margin-top:10px;display:flex;gap:8px;"><button class="btn btn-primary btn-sm" onclick="saveEditRecord('+ts+')">儲存</button><button class="btn btn-ghost btn-sm" onclick="renderHistory()">取消</button></div></td>';
}
function saveEditRecord(ts){
  const r=records.find(x=>x.ts===ts);if(!r)return;
  r.date=document.getElementById('ed-rec-date').value;
  r.store=document.getElementById('ed-rec-store').value;
  r.sales=Number(document.getElementById('ed-rec-sales').value);
  r.note=document.getElementById('ed-rec-note').value;
  r.staff=[...document.querySelectorAll('.ed-rec-staff:checked')].map(cb=>{const name=cb.value;const s=staff.find(x=>x.name===name);return s?{id:s.id,name}:{id:null,name};});
  const newWage={};
  document.querySelectorAll('.ed-rec-hours').forEach(el=>{
    const name=el.getAttribute('data-name');
    const hours=Number(el.value);
    const oldWD=r.wageData&&r.wageData[name]?r.wageData[name]:{};
    const hourlyRate=oldWD.hourlyRate||0;
    const wage=calcOTWage(hourlyRate,hours,r.doublePay||false);
    newWage[name]={shift:oldWD.shift||'',hours,wage,hourlyRate};
  });
  r.wageData=newWage;
  r.totalWage=Object.values(newWage).reduce((s,w)=>s+w.wage,0);
  const newDeduct={};
  document.querySelectorAll('.ed-rec-damt').forEach(el=>{
    const name=el.getAttribute('data-name');
    const reasonEl=document.querySelector('.ed-rec-dreason[data-name="'+name+'"]');
    const amt=Number(el.value||0);
    const reason=(reasonEl?.value||'').trim();
    if(amt>0||reason)newDeduct[name]={amt,reason};
  });
  r.deductData=newDeduct;
  r.totalDeduct=Object.values(newDeduct).reduce((s,d)=>s+(d.amt||0),0);
  const newAllow={};
  document.querySelectorAll('.ed-rec-aamt').forEach(el=>{
    const name=el.getAttribute('data-name');
    const reasonEl=document.querySelector('.ed-rec-areason[data-name="'+name+'"]');
    const amt=Number(el.value||0);
    const reason=(reasonEl?.value||'').trim();
    if(amt>0||reason)newAllow[name]={amt,reason};
  });
  r.allowanceData=newAllow;
  r.totalAllow=Object.values(newAllow).reduce((s,a)=>s+(a.amt||0),0);
  r.doublePay=document.getElementById('ed-rec-double')?.checked||false;
  const newInternBonus={};
  document.querySelectorAll('.ed-rec-intern-bonus').forEach(el=>{
    const name=el.getAttribute('data-name');
    const amt=Number(el.value||0);
    if(amt>0)newInternBonus[name]=amt;
  });
  r.bonusOverride=Object.keys(newInternBonus).length?newInternBonus:undefined;
  // v2.10.0：編輯後以新制重算並快照每人業績獎金（編輯過的舊紀錄轉為新制快照）
  r.bonusData=computeBonusPerPerson(r.sales,r.store,r.staff,staff,r.bonusOverride,r.wageData);
  r.totalBonus=Object.values(r.bonusData).reduce((s,v)=>s+v,0);
  const hasOverride=r.bonusOverride&&Object.keys(r.bonusOverride).length>0;
  logAction('編輯營業額紀錄',r.date+' '+r.store+' 營業額$'+fmt(r.sales)+' 員工:'+r.staff.map(rsName).join('、')+(hasOverride?' [含實習生例外:'+Object.entries(r.bonusOverride).map(([n,v])=>n+'$'+v).join(',')+ ']':''));
  saveAll();renderHistory();showToast('✅ 紀錄已更新');
}
function deleteRecord(ts){
  const r=records.find(x=>x.ts===ts);
  if(!confirm('確定刪除？'))return;
  if(r)logAction('刪除營業額紀錄',r.date+' '+r.store+' 營業額$'+fmt(r.sales)+' 員工:'+r.staff.map(rsName).join('、'));
  records=records.filter(r=>r.ts!==ts);saveAll();renderHistory();showToast('🗑 已刪除');
}
function printTable(title,headers,rows){
  const w=window.open('','_blank','width=900,height=700');
  w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>'+title+'</title><style>body{font-family:serif;padding:32px;color:#111;}h2{font-size:18px;margin-bottom:6px;}p{font-size:12px;color:#888;margin-bottom:18px;}table{width:100%;border-collapse:collapse;font-size:13px;}th{background:#f5f5f5;padding:8px 10px;text-align:left;border-bottom:2px solid #ddd;font-weight:600;}td{padding:7px 10px;border-bottom:1px solid #eee;}@media print{@page{margin:16mm;}}</style></head><body><h2>'+title+'</h2><p>THE food co. 同興 ／ 列印時間：'+new Date().toLocaleString('zh-TW')+'</p><table><thead><tr>'+headers.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+rows+'</tbody></table></body></html>');
  w.document.close();setTimeout(()=>w.print(),600);
}
function exportCSV(){
  const fs=document.getElementById('hist-store').value,fm=document.getElementById('hist-month').value;
  let data=[...records].sort((a,b)=>a.date.localeCompare(b.date));
  if(fs)data=data.filter(r=>r.store===fs);if(fm)data=data.filter(r=>r.date.startsWith(fm));
  const rows=[['日期','門市','員工','營業額','業績獎金','專案獎金','加項','加項說明','違規扣款','扣款說明','雙倍薪資','備註']];
  data.forEach(r=>{
    const deductSum=r.totalDeduct||0;
    const deductReasons=r.deductData?Object.entries(r.deductData).filter(([,d])=>d.amt>0).map(([n,d])=>n+(d.reason?':'+d.reason:'')).join('|'):'';
    const allowSum=r.totalAllow||0;
    const allowReasons=r.allowanceData?Object.entries(r.allowanceData).filter(([,a])=>a.amt>0).map(([n,a])=>n+(a.reason?':'+a.reason:'')).join('|'):'';
    rows.push([r.date,r.store,r.staff.map(rsName).join('|'),r.sales,r.totalBonus||0,r.totalProjBonus||0,allowSum,allowReasons,deductSum,deductReasons,r.doublePay?'是':'否',r.note]);
  });
  dlCSV(rows,'歷史紀錄_'+(fm||thisMonth()));
}
function printHistory(){
  const fs=document.getElementById('hist-store').value,fm=document.getElementById('hist-month').value;
  let data=[...records].sort((a,b)=>a.date.localeCompare(b.date));
  if(fs)data=data.filter(r=>r.store===fs);if(fm)data=data.filter(r=>r.date.startsWith(fm));
  const rows=data.map(r=>{
    const deductSum=r.totalDeduct||0;
    const deductDetail=r.deductData?Object.entries(r.deductData).filter(([,d])=>d.amt>0).map(([n,d])=>n+(d.reason?' ('+d.reason+')':'')).join('、'):'';
    const doubleTag=r.doublePay?'<span style="font-size:9px;background:#fff3e0;color:#e67e22;border:1px solid #f0b27a;border-radius:4px;padding:1px 5px;margin-left:4px;">×2</span>':'';
    return '<tr><td>'+r.date+'</td><td>'+r.store+'</td><td>'+r.staff.map(rsName).join('、')+'</td><td style="text-align:right">$'+fmt(r.sales)+'</td><td style="text-align:right">$'+fmt(r.totalBonus||0)+'</td><td style="text-align:right">$'+fmt(r.totalProjBonus||0)+'</td><td style="text-align:right;color:#c0392b">'+(deductSum>0?'-$'+fmt(deductSum)+(deductDetail?'<br><small style="font-size:10px">'+deductDetail+'</small>':''):'—')+'</td><td>'+(r.note||'')+doubleTag+'</td></tr>';
  }).join('');
  printTable('歷史紀錄 '+(fm||thisMonth())+(fs?' — '+fs:''),['日期','門市','員工','營業額','業績獎金','專案獎金','違規扣款','備註'],rows);
}
