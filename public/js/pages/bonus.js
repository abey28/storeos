/* ══════════════════════════════════════════════════════
   個人薪資試算
══════════════════════════════════════════════════════ */
function calcBonus(){
  const month=document.getElementById('bon-month').value||thisMonth();
  const sel=document.getElementById('bon-staff'),cur=sel.value;
  sel.innerHTML='<option value="">全部員工</option>'+staff.map(s=>'<option value="'+escapeHtml(s.name)+'">'+escapeHtml(s.name)+'</option>').join('');
  sel.value=cur;
  const filterStaff=sel.value,mr=records.filter(r=>r.date.startsWith(month)),agg={};
  staff.forEach(s=>{agg[s.name]={sb:0,pb:0,deduct:0,wage:0,days:0,sales:0};});
  mr.forEach(r=>{
    const hc=r.staff.length||1;
    const bonusDist=distributeBonusForRecord(r,staff);
    r.staff.forEach(entry=>{
      const name=rsName(entry);
      if(!agg[name])agg[name]={sb:0,pb:0,deduct:0,wage:0,days:0,sales:0};
      agg[name].sb+=bonusDist[name]||0;
      agg[name].days+=1;
      agg[name].sales+=r.sales/hc;
      if(r.projPerStaff&&r.projPerStaff[name]){agg[name].pb+=r.projPerStaff[name].reduce((s,e)=>s+e.amt*e.count,0);}
      else{agg[name].pb+=(r.totalProjBonus||0)/hc;}
      if(r.deductData&&r.deductData[name])agg[name].deduct+=(r.deductData[name].amt||0);
      if(r.wageData&&r.wageData[name])agg[name].wage+=(r.wageData[name].wage||0);
    });
  });
  let filtered=Object.entries(agg);if(filterStaff)filtered=filtered.filter(([n])=>n===filterStaff);
  const el=document.getElementById('bonus-result');
  if(!filtered.length){el.innerHTML='<div class="empty-state"><div class="emo">💸</div>無資料</div>';return;}
  let html='<table><thead><tr><th>員工</th><th>出班</th><th>本薪</th><th>業績獎金</th><th>專案獎金</th><th>違規扣款</th><th style="color:var(--gold)">薪資總額</th></tr></thead><tbody>';
  filtered.sort((a,b)=>(b[1].wage+b[1].sb+b[1].pb-b[1].deduct)-(a[1].wage+a[1].sb+a[1].pb-a[1].deduct)).forEach(([name,v])=>{
    const total=Math.round(v.wage+v.sb+v.pb-v.deduct);
    html+='<tr>';
    html+='<td><div style="display:flex;align-items:center;gap:8px"><div class="avatar">'+escapeHtml(name[0])+'</div>'+escapeHtml(name)+'</div></td>';
    html+='<td style="font-family:DM Mono">'+v.days+'天</td>';
    html+='<td style="font-family:DM Mono;color:#5dade2">$'+fmt(Math.round(v.wage))+'</td>';
    html+='<td style="font-family:DM Mono;color:#82e0aa">$'+fmt(Math.round(v.sb))+'</td>';
    html+='<td style="font-family:DM Mono;color:#bb8fce">$'+fmt(Math.round(v.pb))+'</td>';
    html+='<td style="font-family:DM Mono;color:var(--red)">'+(v.deduct>0?'-$'+fmt(Math.round(v.deduct)):'—')+'</td>';
    html+='<td style="font-family:DM Mono;color:#f0b27a;font-size:17px;font-weight:700;">$'+fmt(total)+'</td>';
    html+='</tr>';
  });
  el.innerHTML=html+'</tbody></table>';
}
function printBonus(){
  const month=document.getElementById('bon-month').value||thisMonth();
  const mr=records.filter(r=>r.date.startsWith(month)),agg={};
  staff.forEach(s=>{agg[s.name]={sb:0,pb:0,deduct:0,wage:0,days:0,sales:0};});
  mr.forEach(r=>{
    const hc=r.staff.length||1;
    const bonusDist=distributeBonusForRecord(r,staff);
    r.staff.forEach(entry=>{
      const name=rsName(entry);
      if(!agg[name])agg[name]={sb:0,pb:0,deduct:0,wage:0,days:0,sales:0};
      agg[name].sb+=bonusDist[name]||0;agg[name].days+=1;agg[name].sales+=r.sales/hc;
      if(r.projPerStaff&&r.projPerStaff[name]){agg[name].pb+=r.projPerStaff[name].reduce((s,e)=>s+e.amt*e.count,0);}
      else{agg[name].pb+=(r.totalProjBonus||0)/hc;}
      if(r.deductData&&r.deductData[name])agg[name].deduct+=(r.deductData[name].amt||0);
      if(r.wageData&&r.wageData[name])agg[name].wage+=(r.wageData[name].wage||0);
    });
  });
  const rows=Object.entries(agg).sort((a,b)=>(b[1].wage+b[1].sb+b[1].pb-b[1].deduct)-(a[1].wage+a[1].sb+a[1].pb-a[1].deduct)).map(([name,v])=>'<tr><td>'+name+'</td><td style="text-align:center">'+v.days+'天</td><td style="text-align:right">$'+fmt(Math.round(v.wage))+'</td><td style="text-align:right">$'+fmt(Math.round(v.sb))+'</td><td style="text-align:right">$'+fmt(Math.round(v.pb))+'</td><td style="text-align:right;color:#c0392b">'+(v.deduct>0?'-$'+fmt(Math.round(v.deduct)):'—')+'</td><td style="text-align:right;font-weight:700">$'+fmt(Math.round(v.wage+v.sb+v.pb-v.deduct))+'</td></tr>').join('');
  printTable('薪資試算 '+month,['員工','出班','本薪','業績獎金','專案獎金','違規扣款','薪資總額'],rows);
}
