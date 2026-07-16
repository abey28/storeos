/* ── 應用程式入口 ── */
function exportBackup(){
  const data={version:'v2.9.0',exportAt:new Date().toISOString(),staff,records,tiers,projTypes,shifts,insuranceBrackets};
  const a=document.createElement('a');a.href='data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(data,null,2));a.download='StoreOS_備份_'+isoToday()+'.json';a.click();
  logAction('匯出資料備份','員工'+staff.length+'人 紀錄'+records.length+'筆');
  showToast('✅ 備份檔已下載');
}
function importBackup(event){
  const file=event.target.files[0];if(!file)return;
  if(!confirm('匯入備份將覆蓋現有所有資料，確定繼續？')){event.target.value='';return;}
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const data=JSON.parse(e.target.result);
      if(data.staff)staff=data.staff;if(data.records)records=data.records;
      if(data.tiers)tiers=normalizeTiers(data.tiers);if(data.projTypes)projTypes=data.projTypes;if(data.shifts)shifts=data.shifts;
      if(data.insuranceBrackets){insuranceBrackets={...DEFAULT_INSURANCE_BRACKETS,...data.insuranceBrackets};}
      logAction('匯入資料備份','版本:'+(data.version||'未標示')+' 員工'+staff.length+'人 紀錄'+records.length+'筆');
      saveAll();renderDashboard();showToast('✅ 資料已還原並同步至雲端（'+data.version+'）');
    }catch(err){showToast('❌ 檔案格式錯誤，匯入失敗');}
  };
  reader.readAsText(file);event.target.value='';
}

async function init(){
  const d=new Date(),z=n=>String(n).padStart(2,'0');
  document.getElementById('today-badge').textContent=d.getFullYear()+'/'+z(d.getMonth()+1)+'/'+z(d.getDate());
  document.getElementById('ver-badge').textContent='v2.9.0';
  ['hist-month','bon-month','rpt-month'].forEach(id=>document.getElementById(id).value=thisMonth());
  try{const saved=localStorage.getItem('themeMode');if(saved==='light'){document.body.classList.add('light-mode');document.getElementById('theme-toggle-btn').textContent='🌙 暗色模式';}}catch(e){}
  await loadAllData();await loadUserInfo();
  refreshStoreSelects();
  const overlay=document.getElementById('loading-overlay');
  if(overlay){overlay.classList.add('hidden');setTimeout(()=>overlay.remove(),500);}
  setSyncOk();startAutoRefresh();renderDashboard();
}
init();
