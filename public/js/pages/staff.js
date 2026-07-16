/* ══════════════════════════════════════════════════════
   員工資料
══════════════════════════════════════════════════════ */
function saveStaff(){
  const name=document.getElementById('sf-name').value.trim(),id=document.getElementById('sf-id').value.trim();
  if(!name||!id){showToast('⚠ 請填寫姓名與員工編號');return;}
  if(staff.find(s=>s.id===id)){showToast('⚠ 員工編號重複');return;}
  const sfLI=document.getElementById('sf-li').checked;
  const sfNHI=document.getElementById('sf-nhi').checked;
  staff.push({
    id,name,
    phone:document.getElementById('sf-phone').value.trim(),
    store:document.getElementById('sf-store').value,
    join:document.getElementById('sf-join').value,
    email:document.getElementById('sf-email').value.trim(),
    jobTitle:document.getElementById('sf-title').value.trim(),
    titleAllowance:Number(document.getElementById('sf-title-allowance').value||0),
    liInsured:sfLI,
    liAmt:sfLI?Number(document.getElementById('sf-li-amt').value||0):0,
    nhiInsured:sfNHI,
    nhiAmt:sfNHI?Number(document.getElementById('sf-nhi-amt').value||0):0,
    nhiDep:sfNHI?Number(document.getElementById('sf-nhi-dep').value||0):0,
    nhiReduce:sfNHI?Number(document.getElementById('sf-nhi-reduce').value||0):0,
    selfRetire:document.getElementById('sf-retire').checked,
    selfRetireRate:Math.min(6,Math.max(1,Number(document.getElementById('sf-retire-rate').value||1))),
    isIntern:document.getElementById('sf-intern').checked,
    isNewbie:document.getElementById('sf-newbie').checked,
    // legacy compat
    insured:sfLI||sfNHI,
    insuredAmt:sfLI?Number(document.getElementById('sf-li-amt').value||0):(sfNHI?Number(document.getElementById('sf-nhi-amt').value||0):0),
  });
  const isInternNew=document.getElementById('sf-intern').checked;
  const isNewbieNew=document.getElementById('sf-newbie').checked;
  logAction('新增員工',name+' ('+id+')'+(document.getElementById('sf-title').value.trim()?' 職稱:'+document.getElementById('sf-title').value.trim():'')+(isInternNew?' [實習生]':'')+(isNewbieNew?' [新進]':''));
  saveStaffKey();renderStaff();showToast('✅ 已新增 '+name+(isInternNew?' 🎓 實習生':'')+(isNewbieNew?' 🆕 新進':''));
  ['sf-name','sf-id','sf-phone','sf-email','sf-join','sf-title'].forEach(i=>document.getElementById(i).value='');
  document.getElementById('sf-title-allowance').value='0';
  document.getElementById('sf-intern').checked=false;
  document.getElementById('sf-newbie').checked=false;
  document.getElementById('sf-li').checked=false; sfToggleLI();
  document.getElementById('sf-nhi').checked=false; sfToggleNHI();
  document.getElementById('sf-retire').checked=false; sfToggleRetire();
}

function edToggle(type,id){
  const c=document.getElementById('ed-'+type+'-'+id).checked;
  if(type==='li'){document.getElementById('ed-li-amt-'+id).disabled=!c;}
  if(type==='nhi'){['ed-nhi-amt-'+id,'ed-nhi-dep-'+id,'ed-nhi-reduce-'+id].forEach(i=>document.getElementById(i).disabled=!c);}
}
function sfToggleLI(){const c=document.getElementById('sf-li').checked;['sf-li-amt'].forEach(i=>document.getElementById(i).disabled=!c);}
function sfToggleNHI(){const c=document.getElementById('sf-nhi').checked;['sf-nhi-amt','sf-nhi-dep','sf-nhi-reduce'].forEach(i=>document.getElementById(i).disabled=!c);}
function sfToggleRetire(){const c=document.getElementById('sf-retire').checked;document.getElementById('sf-retire-rate').disabled=!c;}
function deleteStaff(id){
  const s=staff.find(x=>x.id===id);
  if(!confirm('確定刪除？'))return;
  if(s)logAction('刪除員工',s.name+' ('+s.id+')');
  staff=staff.filter(s=>s.id!==id);saveStaffKey();renderStaff();showToast('🗑 已刪除');
}
function editStaff(id){
  const s=staff.find(x=>x.id===id);if(!s)return;
  const existing=document.getElementById('edit-panel-'+id);
  if(existing){existing.remove();return;}
  document.querySelectorAll('[id^="edit-panel-"]').forEach(el=>el.remove());
  const tr=document.querySelector('#staff-tbody tr[data-sid="'+id+'"]');
  if(!tr)return;
  const panel=document.createElement('tr');
  panel.id='edit-panel-'+id;
  const liChk  = s.liInsured  ? 'checked' : '';
  const nhiChk = s.nhiInsured ? 'checked' : '';
  const retChk = s.selfRetire ? 'checked' : '';
  const liDis  = s.liInsured  ? '' : 'disabled';
  const nhiDis = s.nhiInsured ? '' : 'disabled';
  const retDis = s.selfRetire ? '' : 'disabled';
  const storeOpts = ['台北車站','中山誠品','松菸誠品','輪調'].map(v=>
    `<option value="${escapeHtml(v)}"${s.store===v?' selected':''}>${escapeHtml(v)}</option>`).join('');
  panel.innerHTML = `<td colspan="9" style="padding:0;border-bottom:2px solid var(--gold-dim);">
    <div style="background:var(--surface2);padding:20px;border-radius:0 0 8px 8px;">
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;margin-bottom:16px;">
        <div><div class="form-label" style="margin-bottom:6px;">姓名</div><input type="text" id="ed-name-${id}" value="${s.name}" style="width:100%;"></div>
        <div><div class="form-label" style="margin-bottom:6px;">職稱</div><input type="text" id="ed-title-${id}" value="${s.jobTitle||''}" placeholder="店長、副店長…" style="width:100%;"></div>
        <div><div class="form-label" style="margin-bottom:6px;">職稱加給（元／月）</div><input type="number" id="ed-title-allowance-${id}" value="${s.titleAllowance||0}" min="0" style="width:100%;"></div>
        <div><div class="form-label" style="margin-bottom:6px;">聯絡電話</div><input type="text" id="ed-phone-${id}" value="${s.phone||''}" style="width:100%;"></div>
        <div><div class="form-label" style="margin-bottom:6px;">Email</div><input type="text" id="ed-email-${id}" value="${s.email||''}" style="width:100%;"></div>
        <div><div class="form-label" style="margin-bottom:6px;">主要門市</div><select id="ed-store-${id}" style="width:100%;">${storeOpts}</select></div>
        <div><div class="form-label" style="margin-bottom:6px;">到職日</div><input type="date" id="ed-join-${id}" value="${s.join||''}" style="width:100%;"></div>
        <div><div class="form-label" style="margin-bottom:6px;">身分類型</div>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;padding:9px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface3);margin-bottom:6px;">
            <input type="checkbox" id="ed-intern-${id}" ${s.isIntern?'checked':''} style="width:auto;padding:0;background:transparent;border:none;"> 🎓 實習生
          </label>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;padding:9px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface3);">
            <input type="checkbox" id="ed-newbie-${id}" ${s.isNewbie?'checked':''} style="width:auto;padding:0;background:transparent;border:none;"> 🆕 新進人員
          </label>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;padding-top:14px;border-top:1px solid var(--border);margin-bottom:16px;">
        <div>
          <div class="form-label" style="margin-bottom:6px;color:var(--gold);">勞保</div>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;margin-bottom:6px;">
            <input type="checkbox" id="ed-li-${id}" ${liChk} onchange="edToggle('li','${id}')" style="width:auto;padding:0;background:transparent;border:none;"> 已加入勞保
          </label>
          <input type="number" id="ed-li-amt-${id}" value="${s.liAmt||s.insuredAmt||0}" min="0" ${liDis} placeholder="月投保薪資" style="width:100%;">
        </div>
        <div>
          <div class="form-label" style="margin-bottom:6px;color:var(--gold);">健保</div>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;margin-bottom:6px;">
            <input type="checkbox" id="ed-nhi-${id}" ${nhiChk} onchange="edToggle('nhi','${id}')" style="width:auto;padding:0;background:transparent;border:none;"> 已加入健保
          </label>
          <input type="number" id="ed-nhi-amt-${id}" value="${s.nhiAmt||s.insuredAmt||0}" min="0" ${nhiDis} placeholder="月投保薪資" style="width:100%;margin-bottom:6px;">
          <div style="display:flex;gap:10px;align-items:center;">
            <div style="flex:1;"><div class="form-label" style="margin-bottom:4px;">眷屬人數</div><input type="number" id="ed-nhi-dep-${id}" value="${s.nhiDep||0}" min="0" max="9" ${nhiDis} style="width:100%;"></div>
            <div style="flex:1;"><div class="form-label" style="margin-bottom:4px;">減免%</div><input type="number" id="ed-nhi-reduce-${id}" value="${s.nhiReduce||0}" min="0" max="100" ${nhiDis} style="width:100%;"></div>
          </div>
        </div>
        <div>
          <div class="form-label" style="margin-bottom:6px;color:var(--gold);">勞工退休金自提</div>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;margin-bottom:6px;">
            <input type="checkbox" id="ed-selfRetire-${id}" ${retChk} onchange="document.getElementById('ed-selfRetireRate-${id}').disabled=!this.checked" style="width:auto;padding:0;background:transparent;border:none;"> 員工自提
          </label>
          <div style="display:flex;align-items:center;gap:8px;">
            <input type="number" id="ed-selfRetireRate-${id}" value="${s.selfRetireRate||1}" min="1" max="6" step="1" ${retDis} style="width:80px;">
            <span style="font-size:12px;color:var(--text-muted);">%（1–6%）</span>
          </div>
        </div>
      </div>
      <div style="display:flex;gap:10px;">
        <button class="btn btn-primary" onclick="updateStaff('${id}')">✅ 儲存</button>
        <button class="btn btn-ghost" onclick="document.getElementById('edit-panel-${id}').remove()">取消</button>
      </div>
    </div>
  </td>`;
  tr.after(panel);
}
function updateStaff(id){
  const s=staff.find(x=>x.id===id);if(!s)return;
  const name=document.getElementById('ed-name-'+id).value.trim();
  if(!name){showToast('⚠ 姓名不可為空');return;}
  const oldName=s.name;
  s.name=name;
  s.phone=document.getElementById('ed-phone-'+id).value.trim();
  s.email=document.getElementById('ed-email-'+id).value.trim();
  s.store=document.getElementById('ed-store-'+id).value;
  s.join=document.getElementById('ed-join-'+id).value;
  s.jobTitle=document.getElementById('ed-title-'+id)?.value.trim()||'';
  s.titleAllowance=Number(document.getElementById('ed-title-allowance-'+id)?.value||0);
  s.liInsured=document.getElementById('ed-li-'+id)?.checked||false;
  s.liAmt=Number(document.getElementById('ed-li-amt-'+id)?.value||0);
  s.nhiInsured=document.getElementById('ed-nhi-'+id)?.checked||false;
  s.nhiAmt=Number(document.getElementById('ed-nhi-amt-'+id)?.value||0);
  s.nhiDep=Number(document.getElementById('ed-nhi-dep-'+id)?.value||0);
  s.nhiReduce=Number(document.getElementById('ed-nhi-reduce-'+id)?.value||0);
  s.selfRetire=document.getElementById('ed-selfRetire-'+id)?.checked||false;
  s.selfRetireRate=Math.min(6,Math.max(1,Number(document.getElementById('ed-selfRetireRate-'+id)?.value||1)));
  s.isIntern=document.getElementById('ed-intern-'+id)?.checked||false;
  s.isNewbie=document.getElementById('ed-newbie-'+id)?.checked||false;
  // legacy compat
  s.insured=s.liInsured||s.nhiInsured;
  s.insuredAmt=s.liAmt||s.nhiAmt||0;
  logAction('修改員工資料',name+' ('+s.id+')'+(oldName!==name?' 原名:'+oldName:''));
  saveStaffKey();renderStaff();showToast('✅ 已更新 '+name);
}
function renderStaff(){
  const tbody=document.getElementById('staff-tbody'),empty=document.getElementById('staff-empty');
  if(!staff.length){tbody.innerHTML='';empty.style.display='';return;}
  empty.style.display='none';
  tbody.innerHTML=staff.map(s=>'<tr data-sid="'+escapeHtml(s.id)+'"><td><span style="font-family:DM Mono;font-size:11px;color:var(--gold)">'+escapeHtml(s.id)+'</span></td><td><div style="display:flex;align-items:center;gap:8px"><div class="avatar" style="background:'+(s.isIntern?'#7f8c8d':'var(--gold)')+'">'+escapeHtml(s.name[0])+'</div>'+escapeHtml(s.name)+(s.isIntern?'<span style="font-size:10px;background:rgba(127,140,141,.15);color:#95a5a6;border:1px solid rgba(127,140,141,.3);border-radius:10px;padding:1px 7px;margin-left:5px;">🎓 實習</span>':'')+(s.isNewbie?'<span style="font-size:10px;background:rgba(93,173,226,.15);color:#5dade2;border:1px solid rgba(93,173,226,.3);border-radius:10px;padding:1px 7px;margin-left:5px;">🆕 新進</span>':'')+'</div></td><td style="font-size:12px;">'+(s.jobTitle?'<span class="badge badge-gold">'+escapeHtml(s.jobTitle)+'</span>'+(s.titleAllowance?'<br><span style="font-size:10px;color:var(--text-muted);font-family:DM Mono;">+$'+(s.titleAllowance||0)+'/月</span>':''):'<span style="color:var(--text-muted)">—</span>')+'</td><td style="font-family:DM Mono;font-size:12px">'+escapeHtml(s.phone||'—')+'</td><td style="font-size:12px;color:var(--text-muted)">'+escapeHtml(s.email||'—')+'</td><td><span class="badge badge-gold">'+escapeHtml(s.store)+'</span></td><td style="font-family:DM Mono;font-size:12px">'+(s.join||'—')+'</td><td style="font-size:12px;">'+(s.liInsured?'<span class="badge badge-green" style="font-size:10px;">勞$'+fmt(s.liAmt||0)+'</span>':'<span class="badge" style="font-size:10px;background:rgba(192,57,43,.1);color:#e74c3c;border:1px solid rgba(192,57,43,.3);">勞未保</span>')+' '+(s.nhiInsured?'<span class="badge badge-green" style="font-size:10px;">健$'+fmt(s.nhiAmt||0)+(s.nhiDep?'+'+s.nhiDep+'眷':'')+''+(s.nhiReduce?'-'+s.nhiReduce+'%':'')+'</span>':'<span class="badge" style="font-size:10px;background:rgba(192,57,43,.1);color:#e74c3c;border:1px solid rgba(192,57,43,.3);">健未保</span>')+(s.selfRetire?'<br><span class="badge badge-gold" style="font-size:10px;">自提'+s.selfRetireRate+'%</span>':'')+'</td><td style="white-space:nowrap"><button class="btn btn-ghost btn-sm" onclick="editStaff(\''+escapeHtml(s.id)+'\')">修訂</button> <button class="btn btn-danger btn-sm" onclick="deleteStaff(\''+escapeHtml(s.id)+'\')">刪除</button></td></tr>').join('');
}
