/* ══════════════════════════════════════════════════════
   營業額登記
══════════════════════════════════════════════════════ */
function isWeekendOrHoliday(dateStr){const d=new Date(dateStr);const day=d.getDay();return day===0||day===6;}
function initRecord(){
  document.getElementById('rec-date').value=isoToday();
  renderStaffPicker();
  autoCheckWeekend();
  renderWageInputs();
  renderProjInputs();
  renderDeductInputs();
  renderAllowanceInputs();
  renderInternBonusInputs();
  updateBonusPreview();
}
function onDateChange(){autoCheckWeekend();renderWageInputs();renderProjInputs();renderDeductInputs();renderAllowanceInputs();renderInternBonusInputs();updateBonusPreview();}
function onDoublePayChange(){renderWageInputs();updateBonusPreview();}
function autoCheckWeekend(){
  const dateVal=document.getElementById('rec-date').value||isoToday();
  if(isWeekendOrHoliday(dateVal)&&staff.length>=2){
    const cbs=[...document.querySelectorAll('#staff-picker input[type=checkbox]')];
    const noneChecked=cbs.every(cb=>!cb.checked);
    if(noneChecked){cbs.slice(0,2).forEach(cb=>{cb.checked=true;cb.closest('.staff-chip').classList.add('checked');});}
  }
}
function renderStaffPicker(){
  document.getElementById('staff-picker').innerHTML=staff.map(s=>'<label class="staff-chip"><input type="checkbox" value="'+escapeHtml(s.id)+'" onchange="onStaffPickerChange()"><span>'+escapeHtml(s.name)+(s.isIntern?'<span style="font-size:9px;color:#95a5a6;margin-left:4px;">🎓</span>':(s.isNewbie?'<span style="font-size:9px;margin-left:4px;">🆕</span>':''))+'</span></label>').join('');
}
function renderProjInputs(){
  const month=(document.getElementById('rec-date').value||isoToday()).slice(0,7);
  const active=activeProjTypes(month),wrap=document.getElementById('proj-inputs-wrap');
  if(!active.length){wrap.innerHTML='';return;}
  const checked=getCheckedStaff();
  if(!checked.length){wrap.innerHTML='<div style="font-size:11px;color:var(--text-muted);letter-spacing:1px;">🎯 請先勾選上班員工以填寫彈性專案次數</div>';return;}
  let html='<div style="font-size:11px;color:var(--text-dim);letter-spacing:1px;margin-bottom:10px">🎯 彈性專案（各員工完成次數）</div>';
  html+='<div style="overflow-x:auto;"><table style="font-size:12px;border-collapse:collapse;"><thead><tr><th style="padding:6px 10px;text-align:left;color:var(--gold);font-size:10px;letter-spacing:1px;">員工</th>';
  active.forEach(pt=>{html+='<th style="padding:6px 10px;text-align:center;color:var(--text-dim);font-size:11px;">'+escapeHtml(pt.name)+'<div style="color:var(--gold-dim);font-size:10px;">+$'+pt.amt+'/次</div></th>';});
  html+='</tr></thead><tbody>';
  checked.forEach(name=>{
    const sid=staff.find(s=>s.name===name)?.id||name;
    html+='<tr><td style="padding:6px 10px;color:var(--text);">'+escapeHtml(name)+'</td>';
    active.forEach(pt=>{html+='<td style="padding:6px 10px;text-align:center;"><input type="number" id="proj-'+escapeHtml(pt.id)+'-'+escapeHtml(sid)+'" min="0" value="0" oninput="updateBonusPreview()" style="width:70px;text-align:center;"></td>';});
    html+='</tr>';
  });
  wrap.innerHTML=html+'</tbody></table></div>';
}
function getCheckedStaff(){return[...document.querySelectorAll('#staff-picker input:checked')].map(i=>{const s=staff.find(x=>x.id===i.value);return s?s.name:i.value;});}
function getCheckedStaffIds(){return[...document.querySelectorAll('#staff-picker input:checked')].map(i=>i.value);}
function onStaffPickerChange(){renderWageInputs();renderProjInputs();renderDeductInputs();renderAllowanceInputs();renderInternBonusInputs();updateBonusPreview();}
function renderWageInputs(){
  const wrap=document.getElementById('wage-inputs-wrap');
  const checked=getCheckedStaff();
  if(!checked.length){wrap.innerHTML='';return;}
  const store=document.getElementById('rec-store').value;
  const storeShifts=shifts[store]||[];
  if(!storeShifts.length){wrap.innerHTML='<div style="font-size:11px;color:var(--text-muted);">⚠ 此門市尚未設定班別，請至「班別薪資設定」新增</div>';return;}
  const dateVal=document.getElementById('rec-date').value||isoToday();
  const isWE=isWeekendOrHoliday(dateVal);
  const isDouble=document.getElementById('rec-double-pay')?.checked||false;
  let html='<div style="font-size:11px;color:var(--text-dim);letter-spacing:1px;margin-bottom:10px">🕐 班別與工時'+(isWE?' <span style="color:var(--gold);font-size:10px;">(假日)</span>':'')+(isDouble?' <span style="color:#e67e22;font-size:10px;font-weight:700;">× 2 雙倍日</span>':'')+'</div>';
  html+='<div style="overflow-x:auto;"><table style="font-size:12px;border-collapse:collapse;"><thead><tr>';
  html+='<th style="padding:6px 10px;text-align:left;color:var(--gold);font-size:10px;letter-spacing:1px;">員工</th>';
  html+='<th style="padding:6px 10px;text-align:center;color:var(--text-dim);font-size:11px;">班別</th>';
  html+='<th style="padding:6px 10px;text-align:center;color:var(--text-dim);font-size:11px;">工時（小時）</th>';
  html+='<th style="padding:6px 10px;text-align:center;color:var(--text-dim);font-size:11px;">預估薪資'+(isDouble?' <span style="color:#e67e22;">(×2後)</span>':'')+'</th>';
  html+='</tr></thead><tbody>';
  checked.forEach(name=>{
    const sid=staff.find(s=>s.name===name)?.id||name;
    const defShift=storeShifts[0];
    const hr=defShift.hourlyRate||defShift.wage||0;
    const previewWage=calcOTWage(hr,defShift.hours,isDouble);
    html+='<tr><td style="padding:6px 10px;color:var(--text);">'+escapeHtml(name)+'</td>';
    html+='<td style="padding:6px 10px;text-align:center;"><select id="wage-shift-'+escapeHtml(sid)+'" onchange="onShiftSelect(\''+escapeHtml(sid)+'\')" style="width:100px;">';
    storeShifts.forEach((sh,i)=>{html+='<option value="'+i+'">'+escapeHtml(sh.name)+'</option>';});
    html+='<option value="custom">自訂</option></select></td>';
    html+='<td style="padding:6px 10px;text-align:center;"><input type="number" id="wage-hours-'+escapeHtml(sid)+'" value="'+defShift.hours+'" min="0" step="0.5" style="width:70px;text-align:center;" oninput="updateBonusPreview()"></td>';
    html+='<td style="padding:6px 10px;text-align:center;font-family:DM Mono;color:'+(isDouble?'#e67e22':'var(--text-dim)')+';font-size:12px;" id="wage-preview-'+escapeHtml(sid)+'">$'+fmt(previewWage)+'</td>';
    html+='</tr>';
  });
  wrap.innerHTML=html+'</tbody></table></div>';
}
function onShiftSelect(sid){
  const store=document.getElementById('rec-store').value;
  const storeShifts=shifts[store]||[];
  const sel=document.getElementById('wage-shift-'+sid);
  const isDouble=document.getElementById('rec-double-pay')?.checked||false;
  if(sel.value!=='custom'){
    const sh=storeShifts[Number(sel.value)];
    if(sh){
      document.getElementById('wage-hours-'+sid).value=sh.hours;
      const hr=sh.hourlyRate||sh.wage||0;
      const previewEl=document.getElementById('wage-preview-'+sid);
      if(previewEl)previewEl.textContent='$'+fmt(calcOTWage(hr,sh.hours,isDouble));
    }
  }
  updateBonusPreview();
}
function renderDeductInputs(){
  const wrap=document.getElementById('deduct-inputs-wrap');
  const checked=getCheckedStaff();
  if(!checked.length){wrap.innerHTML='';return;}
  let html='<div style="font-size:11px;color:var(--text-dim);letter-spacing:1px;margin-bottom:10px">🚫 違規扣款（選填）</div>';
  html+='<div style="overflow-x:auto;"><table style="font-size:12px;border-collapse:collapse;"><thead><tr>';
  html+='<th style="padding:6px 10px;text-align:left;color:var(--gold);font-size:10px;letter-spacing:1px;">員工</th>';
  html+='<th style="padding:6px 10px;text-align:center;color:var(--text-dim);font-size:11px;">扣款金額（元）</th>';
  html+='<th style="padding:6px 10px;text-align:left;color:var(--text-dim);font-size:11px;">扣款說明</th>';
  html+='</tr></thead><tbody>';
  checked.forEach(name=>{
    const sid=staff.find(s=>s.name===name)?.id||name;
    html+='<tr>';
    html+='<td style="padding:6px 10px;color:var(--text);">'+escapeHtml(name)+'</td>';
    html+='<td style="padding:6px 10px;text-align:center;"><input type="number" id="deduct-amt-'+escapeHtml(sid)+'" min="0" value="0" oninput="updateBonusPreview()" style="width:90px;text-align:center;"></td>';
    html+='<td style="padding:6px 10px;"><input type="text" id="deduct-reason-'+escapeHtml(sid)+'" placeholder="例：遲到、違反規定…" style="width:200px;"></td>';
    html+='</tr>';
  });
  wrap.innerHTML=html+'</tbody></table></div>';
}
function getDeductData(){
  const checkedIds=getCheckedStaffIds(),result={};
  checkedIds.forEach(sid=>{
    const sname=staff.find(s=>s.id===sid)?.name||sid;
    const amt=Number(document.getElementById('deduct-amt-'+sid)?.value||0);
    const reason=(document.getElementById('deduct-reason-'+sid)?.value||'').trim();
    if(amt>0||reason)result[sname]={amt,reason};
  });
  return result;
}
function renderAllowanceInputs(){
  const wrap=document.getElementById('allowance-inputs-wrap');
  const checked=getCheckedStaff();
  if(!checked.length){wrap.innerHTML='';return;}
  let html='<div style="font-size:11px;color:var(--text-dim);letter-spacing:1px;margin-bottom:6px">➕ 個人加項（選填）</div>';
  html+='<div style="font-size:10px;color:var(--text-muted);margin-bottom:10px;line-height:1.6;">可填入誤餐費、緊急代班補貼、車馬費等非常規給付。此金額將連結至薪資單並計入實發合計。</div>';
  html+='<div style="overflow-x:auto;"><table style="font-size:12px;border-collapse:collapse;"><thead><tr>';
  html+='<th style="padding:6px 10px;text-align:left;color:var(--gold);font-size:10px;letter-spacing:1px;">員工</th>';
  html+='<th style="padding:6px 10px;text-align:center;color:var(--text-dim);font-size:11px;">金額（元）</th>';
  html+='<th style="padding:6px 10px;text-align:left;color:var(--text-dim);font-size:11px;">說明（例：誤餐費、緊急代班、車馬費）</th>';
  html+='</tr></thead><tbody>';
  checked.forEach(name=>{
    const sid=staff.find(s=>s.name===name)?.id||name;
    html+='<tr>';
    html+='<td style="padding:6px 10px;color:var(--text);">'+escapeHtml(name)+'</td>';
    html+='<td style="padding:6px 10px;text-align:center;"><input type="number" id="allow-amt-'+escapeHtml(sid)+'" min="0" value="0" oninput="updateBonusPreview()" style="width:90px;text-align:center;"></td>';
    html+='<td style="padding:6px 10px;"><input type="text" id="allow-reason-'+escapeHtml(sid)+'" placeholder="例：誤餐費、緊急代班補貼、車馬費…" style="width:220px;"></td>';
    html+='</tr>';
  });
  wrap.innerHTML=html+'</tbody></table></div>';
}
function getAllowanceData(){
  const checkedIds=getCheckedStaffIds(),result={};
  checkedIds.forEach(sid=>{
    const sname=staff.find(s=>s.id===sid)?.name||sid;
    const amt=Number(document.getElementById('allow-amt-'+sid)?.value||0);
    const reason=(document.getElementById('allow-reason-'+sid)?.value||'').trim();
    if(amt>0||reason)result[sname]={amt,reason};
  });
  return result;
}
function renderInternBonusInputs(){
  const wrap=document.getElementById('intern-bonus-wrap');
  if(!wrap)return;
  const checked=getCheckedStaff();
  const interns=checked.filter(name=>{const s=staff.find(x=>x.name===name);return s&&s.isIntern;});
  if(!interns.length){wrap.innerHTML='';return;}
  let html='<div style="font-size:11px;color:var(--text-dim);letter-spacing:1px;margin-bottom:6px;">🎓 實習生業績獎金例外調整（選填）</div>';
  html+='<div style="font-size:10px;color:var(--text-muted);margin-bottom:10px;line-height:1.6;">實習生預設不參與業績獎金查表（$0）。填入例外金額後，該實習生當日業績獎金即以此金額計算；其他員工仍各自依身分查表領全額，不受影響。</div>';
  html+='<div style="overflow-x:auto;"><table style="font-size:12px;border-collapse:collapse;"><thead><tr>';
  html+='<th style="padding:6px 10px;text-align:left;color:var(--gold);font-size:10px;letter-spacing:1px;">員工</th>';
  html+='<th style="padding:6px 10px;text-align:center;color:var(--text-dim);font-size:11px;">例外獎金（元，留空為 0）</th>';
  html+='</tr></thead><tbody>';
  interns.forEach(name=>{
    const sid=staff.find(s=>s.name===name)?.id||name;
    html+='<tr>';
    html+='<td style="padding:6px 10px;color:#95a5a6;">🎓 '+escapeHtml(name)+'</td>';
    html+='<td style="padding:6px 10px;text-align:center;"><input type="number" id="intern-bonus-'+escapeHtml(sid)+'" min="0" value="0" oninput="updateBonusPreview()" style="width:100px;text-align:center;border-color:#7f8c8d;"> <span style="font-size:9px;background:rgba(230,126,34,.15);color:#e67e22;border:1px solid rgba(230,126,34,.3);border-radius:8px;padding:1px 5px;margin-left:4px;">⚡例外</span></td>';
    html+='</tr>';
  });
  wrap.innerHTML=html+'</tbody></table></div>';
}
function getInternOverrideData(){
  const checkedIds=getCheckedStaffIds(),result={};
  checkedIds.forEach(sid=>{
    const sObj=staff.find(s=>s.id===sid);
    if(!sObj||!sObj.isIntern)return;
    const amt=Number(document.getElementById('intern-bonus-'+sid)?.value||0);
    if(amt>0)result[sObj.name]=amt;
  });
  return result;
}
function getWageData(){
  const checkedIds=getCheckedStaffIds(),result={};
  const isDouble=document.getElementById('rec-double-pay')?.checked||false;
  checkedIds.forEach(sid=>{
    const sname=staff.find(s=>s.id===sid)?.name||sid;
    const shiftEl=document.getElementById('wage-shift-'+sid);
    const store=document.getElementById('rec-store').value;
    const storeShifts=shifts[store]||[];
    const shiftIdx=shiftEl?shiftEl.value:'0';
    const shiftName=shiftIdx==='custom'?'自訂':(storeShifts[Number(shiftIdx)]?.name||'');
    const hours=Number(document.getElementById('wage-hours-'+sid)?.value||0);
    const sh=shiftIdx!=='custom'?storeShifts[Number(shiftIdx)]:null;
    const hourlyRate=sh?(sh.hourlyRate||sh.wage||0):0;
    const wage=calcOTWage(hourlyRate,hours,isDouble);
    result[sname]={shift:shiftName,hours,wage,hourlyRate};
  });
  return result;
}
function getCurrentProjEntries(){
  const month=(document.getElementById('rec-date').value||isoToday()).slice(0,7);
  const active=activeProjTypes(month),checkedIds=getCheckedStaffIds();
  const perStaff={};
  checkedIds.forEach(sid=>{
    const sname=staff.find(s=>s.id===sid)?.name||sid;
    const entries=active.map(pt=>{const el=document.getElementById('proj-'+pt.id+'-'+sid);return{typeId:pt.id,name:pt.name,amt:pt.amt,count:Number(el?.value||0)};}).filter(e=>e.count>0);
    if(entries.length)perStaff[sname]=entries;
  });
  return perStaff;
}
function getTotalProjBonus(){
  const pe=getCurrentProjEntries();
  let total=0;
  Object.values(pe).forEach(entries=>{entries.forEach(e=>{total+=e.amt*e.count;});});
  return total;
}
function getPerStaffProjBonus(){
  const pe=getCurrentProjEntries(),result={};
  Object.entries(pe).forEach(([name,entries])=>{result[name]=entries.reduce((s,e)=>s+e.amt*e.count,0);});
  return result;
}
function updateBonusPreview(){
  document.querySelectorAll('#staff-picker input[type=checkbox]').forEach(cb=>cb.closest('.staff-chip').classList.toggle('checked',cb.checked));
  const isDouble=document.getElementById('rec-double-pay')?.checked||false;
  const hint=document.getElementById('double-hint');if(hint)hint.style.display=isDouble?'inline':'none';
  // update wage preview cells
  const store=document.getElementById('rec-store').value;
  const storeShifts=shifts[store]||[];
  getCheckedStaffIds().forEach(sid=>{
    const shiftEl=document.getElementById('wage-shift-'+sid);
    const hoursEl=document.getElementById('wage-hours-'+sid);
    const previewEl=document.getElementById('wage-preview-'+sid);
    if(!shiftEl||!hoursEl||!previewEl)return;
    const shiftIdx=shiftEl.value;
    const hours=Number(hoursEl.value||0);
    const sh=shiftIdx!=='custom'?storeShifts[Number(shiftIdx)]:null;
    const hr=sh?(sh.hourlyRate||sh.wage||0):0;
    previewEl.textContent='$'+fmt(calcOTWage(hr,hours,isDouble));
    previewEl.style.color=isDouble?'#e67e22':'var(--text-dim)';
  });
  const sales=Number(document.getElementById('rec-sales').value)||0;
  const checked=getCheckedStaff();
  const internOD=getInternOverrideData();
  // v2.9.0：每人依自身身分與本紀錄門市各自查表領全額（不分池）
  const staffEntries=checked.map(name=>{const s=staff.find(x=>x.name===name);return s?{id:s.id,name}:{id:null,name};});
  const bonusData=computeBonusPerPerson(sales,store,staffEntries,staff,internOD);
  const sb=Object.values(bonusData).reduce((s,v)=>s+v,0);
  const pb=getTotalProjBonus(),perStaffPB=getPerStaffProjBonus();
  const wd=getWageData();
  const el=document.getElementById('bonus-live');
  if(!sales&&!pb){el.innerHTML='<span style="color:var(--text-muted);font-size:13px">輸入營業額或專案數量後顯示預覽</span>';return;}
  const mt=[...getTierTable(store,'regular')].sort((a,b)=>b.threshold-a.threshold).find(t=>sales>=t.threshold);
  const dd=typeof getDeductData==='function'?getDeductData():{};
  const ad=typeof getAllowanceData==='function'?getAllowanceData():{};
  const totalDeduct=Object.values(dd).reduce((s,d)=>s+(d.amt||0),0);
  const totalAllow=Object.values(ad).reduce((s,a)=>s+(a.amt||0),0);
  const totalWage=Object.values(wd).reduce((s,w)=>s+(w.wage||0),0);
  let html='<div style="display:flex;gap:24px;flex-wrap:wrap;margin-bottom:12px;">';
  html+='<div><div style="font-size:10px;color:var(--text-muted);letter-spacing:2px;margin-bottom:4px">營業額</div><div style="font-family:DM Mono;font-size:20px;color:var(--gold-light)">$'+fmt(sales)+'</div><div style="font-size:10px;margin-top:2px;color:'+(mt?'var(--text-muted)':'var(--red)')+'">'+(mt?'達 $'+fmt(mt.threshold)+' 階梯':'未達門檻，無業績獎金')+'</div></div>';
  html+='<div><div style="font-size:10px;color:var(--text-muted);letter-spacing:2px;margin-bottom:4px">本薪合計</div><div style="font-family:DM Mono;font-size:20px;color:#5dade2">$'+fmt(totalWage)+'</div></div>';
  html+='<div><div style="font-size:10px;color:var(--text-muted);letter-spacing:2px;margin-bottom:4px">業績獎金合計</div><div style="font-family:DM Mono;font-size:20px;color:#82e0aa">$'+fmt(sb)+'</div><div style="font-size:10px;margin-top:2px;color:var(--text-muted)">各自依身分查表領全額</div></div>';
  html+='<div><div style="font-size:10px;color:var(--text-muted);letter-spacing:2px;margin-bottom:4px">專案獎金合計</div><div style="font-family:DM Mono;font-size:20px;color:#bb8fce">$'+fmt(pb)+'</div></div>';
  if(totalAllow>0){html+='<div><div style="font-size:10px;color:var(--text-muted);letter-spacing:2px;margin-bottom:4px">加項合計</div><div style="font-family:DM Mono;font-size:20px;color:#f0b27a">+$'+fmt(totalAllow)+'</div></div>';}
  if(totalDeduct>0){html+='<div><div style="font-size:10px;color:var(--text-muted);letter-spacing:2px;margin-bottom:4px">扣款合計</div><div style="font-family:DM Mono;font-size:20px;color:var(--red)">-$'+fmt(totalDeduct)+'</div></div>';}
  html+='</div>';
  if(checked.length){
    html+='<div style="border-top:1px solid var(--border);padding-top:10px;margin-top:2px;">';
    html+='<div style="font-size:10px;color:var(--text-muted);letter-spacing:1px;margin-bottom:8px;">業績獎金採各自依身分（正式／🆕新進／🎓實習生）與門市規則查表，每人領全額</div>';
    checked.forEach(name=>{
      const sObj=staff.find(x=>x.name===name);
      const isInternFlag=!!(sObj&&sObj.isIntern);
      const isNewbieFlag=!isInternFlag&&!!(sObj&&sObj.isNewbie);
      const staffWage=(wd[name]&&wd[name].wage)||0;
      const staffPB=perStaffPB[name]||0;
      const staffDeduct=(dd[name]&&dd[name].amt)||0;
      const staffAllow=(ad[name]&&ad[name].amt)||0;
      const staffSB=bonusData[name]||0;
      const total=staffWage+staffSB+staffPB+staffAllow-staffDeduct;
      const catLabel=isInternFlag?'實習生':(isNewbieFlag?'新進':'正式');
      let detail='本薪$'+fmt(staffWage)+' + 業績$'+fmt(staffSB)+'('+catLabel+')';
      if(isInternFlag&&staffSB>0)detail+=' ⚡例外';
      else if(isInternFlag)detail+=' (實習生不查表)';
      if(staffPB)detail+=' + 專案$'+fmt(staffPB);
      if(staffAllow)detail+=' + 加項$'+fmt(staffAllow);
      if(staffDeduct)detail+=' - 扣款$'+fmt(staffDeduct);
      const avatarBg=isInternFlag?'background:#7f8c8d;':'';
      const catBadge=isInternFlag?'<span style="font-size:9px;color:#95a5a6;margin-left:4px;">🎓 實習生</span>':(isNewbieFlag?'<span style="font-size:9px;background:rgba(93,173,226,.15);color:#5dade2;border:1px solid rgba(93,173,226,.3);border-radius:8px;padding:1px 5px;margin-left:4px;">🆕 新進</span>':'<span style="font-size:9px;color:var(--text-muted);margin-left:4px;">正式</span>');
      const exceptionBadge=isInternFlag&&staffSB>0?'<span style="font-size:9px;background:rgba(230,126,34,.15);color:#e67e22;border:1px solid rgba(230,126,34,.3);border-radius:8px;padding:1px 5px;margin-left:4px;">⚡例外</span>':'';
      html+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><div class="avatar" style="width:26px;height:26px;font-size:11px;'+avatarBg+'">'+escapeHtml(name[0])+'</div>';
      html+='<span style="font-size:13px;">'+escapeHtml(name)+catBadge+'</span>';
      html+='<span style="font-family:DM Mono;color:#f0b27a;font-weight:700;margin-left:auto;font-size:16px;">$'+fmt(total)+'</span>'+exceptionBadge;
      html+='<span style="color:var(--text-muted);font-size:10px;margin-left:4px;">('+detail+')</span></div>';
    });
    html+='</div>';
  }
  el.innerHTML=html;
}
function saveRecord(){
  const date=document.getElementById('rec-date').value,store=document.getElementById('rec-store').value,sales=Number(document.getElementById('rec-sales').value),note=document.getElementById('rec-note').value,staffList=getCheckedStaff().map(name=>{const s=staff.find(x=>x.name===name);return s?{id:s.id,name}:{id:null,name};}),pe=getCurrentProjEntries(),wd=getWageData(),dd=getDeductData(),ad=getAllowanceData();
  const doublePay=document.getElementById('rec-double-pay')?.checked||false;
  const internBO=getInternOverrideData();
  if(!date||!store||!sales){showToast('⚠ 請填寫日期、門市與營業額');return;}
  if(!staffList.length){showToast('⚠ 請至少選擇一位上班員工');return;}
  const dup=records.find(r=>r.date===date&&r.store===store);
  if(dup){if(!confirm(date+' '+store+' 已有紀錄，確定覆蓋？'))return;records.splice(records.indexOf(dup),1);}
  const totalPB=Object.values(pe).reduce((s,entries)=>s+entries.reduce((a,e)=>a+e.amt*e.count,0),0);
  const flatEntries=[];
  Object.entries(pe).forEach(([name,entries])=>{entries.forEach(e=>{flatEntries.push({...e,staffName:name});});});
  const totalWage=Object.values(wd).reduce((s,w)=>s+w.wage,0);
  const totalDeduct=Object.values(dd).reduce((s,d)=>s+(d.amt||0),0);
  const totalAllow=Object.values(ad).reduce((s,a)=>s+(a.amt||0),0);
  const bonusOverride=Object.keys(internBO).length?internBO:undefined;
  // v2.9.0：儲存當下快照每人業績獎金（bonusData），歷史凍結；totalBonus 改為每人合計
  const bonusData=computeBonusPerPerson(sales,store,staffList,staff,internBO);
  const totalSB=Object.values(bonusData).reduce((s,v)=>s+v,0);
  records.push({date,store,sales,staff:staffList,totalBonus:totalSB,bonusData,totalProjBonus:totalPB,projEntries:flatEntries,projPerStaff:pe,wageData:wd,totalWage,deductData:dd,totalDeduct,allowanceData:ad,totalAllow,bonusOverride,doublePay,note,ts:Date.now()});
  saveRecordsKey();
  logAction(dup?'編輯營業額紀錄':'新增營業額紀錄',date+' '+store+' 營業額$'+fmt(sales)+' 員工:'+staffList.map(rsName).join('、')+(doublePay?' (雙倍薪資)':'')+(bonusOverride&&Object.keys(bonusOverride).length?' [實習生例外:'+Object.entries(bonusOverride).map(([n,v])=>n+'$'+v).join(',')+']':''));
  saveAll();showToast('✅ '+store+' '+date+' 已儲存'+(doublePay?' 🎉 雙倍薪資':''));
  document.getElementById('rec-sales').value='';document.getElementById('rec-note').value='';
  document.getElementById('rec-double-pay').checked=false;
  const label=document.getElementById('double-pay-label');if(label)label.style.borderColor='';
  document.querySelectorAll('#staff-picker input').forEach(i=>{i.checked=false;i.closest('.staff-chip').classList.remove('checked');});
  renderWageInputs();renderProjInputs();renderDeductInputs();renderAllowanceInputs();updateBonusPreview();
}
