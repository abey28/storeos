/* ══════════════════════════════════════════════════════
   月報表
══════════════════════════════════════════════════════ */
function renderReport(){
  const month=document.getElementById('rpt-month').value||thisMonth(),mr=records.filter(r=>r.date.startsWith(month));
  const el=document.getElementById('report-content');
  if(!mr.length){el.innerHTML='<div class="empty-state"><div class="emo">📊</div>該月份尚無紀錄</div>';return;}
  const stores=getStores(),byStore={};
  stores.forEach(s=>{byStore[s]={sales:0,bonus:0,proj:0,days:0};});
  mr.forEach(r=>{if(!byStore[r.store])byStore[r.store]={sales:0,bonus:0,proj:0,days:0};byStore[r.store].sales+=r.sales;byStore[r.store].bonus+=(r.totalBonus||0);byStore[r.store].proj+=(r.totalProjBonus||0);byStore[r.store].days+=1;});
  const totalSales=mr.reduce((a,r)=>a+r.sales,0);
  let html='<div class="grid-3" style="margin-bottom:18px;">';
  stores.forEach(s=>{html+='<div class="stat-box"><div class="stat-label" style="color:'+sc(s)+'">'+s+'</div><div class="stat-value">$'+fmt(byStore[s].sales)+'</div><div class="stat-sub">'+byStore[s].days+'日 ／ 業績獎$'+fmt(byStore[s].bonus)+' ／ 專案$'+fmt(byStore[s].proj)+'</div><div class="progress-wrap" style="margin-top:8px"><div class="progress-bar" style="width:'+( totalSales?Math.round(byStore[s].sales/totalSales*100):0)+'%;background:'+sc(s)+'"></div></div></div>';});
  html+='</div><table><thead><tr><th>日期</th><th>門市</th><th>員工</th><th>營業額</th><th>業績獎金</th><th>專案獎金</th><th>每人合計</th></tr></thead><tbody>';
  [...mr].sort((a,b)=>a.date.localeCompare(b.date)).forEach(r=>{const hc=r.staff.length||1;html+='<tr><td style="font-family:DM Mono;font-size:12px">'+r.date+'</td><td><span class="dot" style="background:'+sc(r.store)+'"></span>'+escapeHtml(r.store)+'</td><td>'+r.staff.map(e=>escapeHtml(rsName(e))).join('、')+'</td><td style="font-family:DM Mono;color:var(--gold-light)">$'+fmt(r.sales)+'</td><td style="font-family:DM Mono;color:#82e0aa">$'+fmt(r.totalBonus||0)+'</td><td style="font-family:DM Mono;color:#bb8fce">$'+fmt(r.totalProjBonus||0)+'</td><td style="font-family:DM Mono;color:#f0b27a">$'+fmt(Math.round(((r.totalBonus||0)+(r.totalProjBonus||0))/hc))+'</td></tr>';});
  html+='<tr style="border-top:1px solid var(--gold-dim);"><td colspan="3" style="font-weight:700;color:var(--gold)">月合計</td><td style="font-family:DM Mono;color:var(--gold-light);font-weight:700">$'+fmt(totalSales)+'</td><td style="font-family:DM Mono;color:#82e0aa;font-weight:700">$'+fmt(mr.reduce((a,r)=>a+(r.totalBonus||0),0))+'</td><td style="font-family:DM Mono;color:#bb8fce;font-weight:700">$'+fmt(mr.reduce((a,r)=>a+(r.totalProjBonus||0),0))+'</td><td></td></tr></tbody></table>';
  el.innerHTML=html;
}
function exportReportCSV(){
  const month=document.getElementById('rpt-month').value||thisMonth();
  const mr=[...records].filter(r=>r.date.startsWith(month)).sort((a,b)=>a.date.localeCompare(b.date));
  const rows=[['日期','門市','員工','營業額','業績獎金','專案獎金','每人合計']];
  mr.forEach(r=>{const hc=r.staff.length||1;rows.push([r.date,r.store,r.staff.map(rsName).join('|'),r.sales,r.totalBonus||0,r.totalProjBonus||0,Math.round(((r.totalBonus||0)+(r.totalProjBonus||0))/hc)]);});
  dlCSV(rows,'月報表_'+month);
}
function printReport(){
  const month=document.getElementById('rpt-month').value||thisMonth();
  const mr=[...records].filter(r=>r.date.startsWith(month)).sort((a,b)=>a.date.localeCompare(b.date));
  const rows=mr.map(r=>{const hc=r.staff.length||1;return '<tr><td>'+r.date+'</td><td>'+r.store+'</td><td>'+r.staff.map(rsName).join('、')+'</td><td style="text-align:right">$'+fmt(r.sales)+'</td><td style="text-align:right">$'+fmt(r.totalBonus||0)+'</td><td style="text-align:right">$'+fmt(r.totalProjBonus||0)+'</td><td style="text-align:right">$'+fmt(Math.round(((r.totalBonus||0)+(r.totalProjBonus||0))/hc))+'</td></tr>';}).join('');
  printTable('月報表 '+month,['日期','門市','員工','營業額','業績獎金','專案獎金','每人合計'],rows);
}
