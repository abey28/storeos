/* ── API / 資料層 ── */

/* ── 操作紀錄 ──
 * logAction：寫入一筆操作紀錄至後端 KV（失敗不影響主流程）
 * loadLogs：由後端拉取最近 N 筆紀錄
 */
async function logAction(action,detail){
  try{
    await fetch(API+'/logs',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action,detail:detail||'',user:currentUser})});
  }catch(e){/* 靜默失敗 */}
}
async function loadLogs(limit){
  try{
    const res=await fetch(API+'/logs?limit='+(limit||300));
    if(!res.ok)return;
    const d=await res.json();
    logs=d.logs||[];logsTotal=d.total||logs.length;
  }catch(e){logs=[];}
}
async function loadAllData(){
  try{
    const res=await fetch(API+'/data');
    if(!res.ok)throw new Error('HTTP '+res.status);
    const d=await res.json();
    staff=d.staff||[];records=d.records||[];
    tiers=normalizeTiers(d.tiers||[{threshold:5000,bonus:200},{threshold:10000,bonus:500},{threshold:14000,bonus:700}]);
    projTypes=d.projTypes||[];
    shifts=d.shifts||{'台北車站':[{name:'全天班',hours:8,hourlyRate:175}],'中山誠品':[{name:'全天班',hours:8,hourlyRate:175}],'松菸誠品':[{name:'全天班',hours:8,hourlyRate:175}]};
    if(d.insuranceBrackets){insuranceBrackets={...DEFAULT_INSURANCE_BRACKETS,...d.insuranceBrackets};}
  }catch(e){console.error('載入失敗:',e);showToast('⚠ 無法連線至伺服器，請重新整理頁面');}
}
function saveKey(key,data){
  if(_saveQueue[key])clearTimeout(_saveQueue[key]);
  setSyncBusy();
  _saveQueue[key]=setTimeout(async()=>{
    delete _saveQueue[key];
    try{
      const res=await fetch(API+'/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key,data})});
      if(!res.ok)throw new Error('HTTP '+res.status);
      const now=new Date(),h=document.getElementById('last-save-hint');
      if(h)h.textContent='上次儲存：'+now.getHours()+':'+String(now.getMinutes()).padStart(2,'0');
      setSyncOk();
    }catch(e){showToast('❌ 儲存失敗，請確認網路連線');setSyncDot('err');}
  },600);
}
function saveAll(){
  saveKey('staff',staff);saveKey('records',records);saveKey('tiers',tiers);
  saveKey('projTypes',projTypes);saveKey('shifts',shifts);saveKey('insuranceBrackets',insuranceBrackets);
  try{if(document.body.classList.contains('light-mode'))localStorage.setItem('themeMode','light');else localStorage.removeItem('themeMode');}catch(e){}
}
function saveStaffKey(){saveKey('staff',staff);}
function saveRecordsKey(){saveKey('records',records);}
function saveTiersKey(){saveKey('tiers',tiers);}
function saveProjTypesKey(){saveKey('projTypes',projTypes);}
function saveShiftsKey(){saveKey('shifts',shifts);}
function setSyncBusy(){const d=document.getElementById('sync-dot');if(d)d.className='busy';}
function setSyncOk(){const d=document.getElementById('sync-dot');if(d)d.className='ok';}
function setSyncDot(s){const d=document.getElementById('sync-dot');if(d)d.className=s;}
async function loadUserInfo(){
  try{
    const res=await fetch(API+'/whoami');if(!res.ok)return;
    const d=await res.json();
    const b=document.getElementById('user-badge');if(!b)return;
    if(d&&d.email){
      currentUser=d.email;
      b.textContent=d.email;
      b.title='Zero Trust 已登入：'+d.email;
    } else {
      // whoami 回應了但沒有 email → Zero Trust 未啟用或本機測試
      currentUser='訪客';
      b.textContent='訪客';
      b.title='未偵測到 Zero Trust 登入';
    }
  }catch(e){
    const b=document.getElementById('user-badge');
    if(b){b.textContent='離線';b.title='無法連線至 /api/whoami';}
  }
}
function startAutoRefresh(){
  setInterval(async()=>{
    if(Object.keys(_saveQueue).length>0)return;
    try{const res=await fetch(API+'/data');if(!res.ok)return;const d=await res.json();
      staff=d.staff||staff;records=d.records||records;tiers=d.tiers?normalizeTiers(d.tiers):tiers;
      projTypes=d.projTypes||projTypes;shifts=d.shifts||shifts;setSyncOk();
    }catch(e){setSyncDot('');}
  },30000);
}

function sc(s){if(SC[s])return SC[s];const keys=Object.keys(SC);SC[s]=EXTRA_COLORS[keys.length%EXTRA_COLORS.length];return SC[s];}
function getStores(){const ks=Object.keys(shifts);return ks.length?ks:['台北車站','中山誠品','松菸誠品'];}
function refreshStoreSelects(){
  const stores=getStores();
  const opts=stores.map(s=>'<option value="'+escapeHtml(s)+'">'+escapeHtml(s)+'</option>').join('');
  const optsWithAll='<option value="">全部</option>'+opts;
  const optsWithRota=opts+'<option value="輪調">輪調</option>';
  ['rec-store','sf-store'].forEach(id=>{const el=document.getElementById(id);if(!el)return;const cur=el.value;el.innerHTML=id==='sf-store'?optsWithRota:opts;if([...el.options].some(o=>o.value===cur))el.value=cur;});
  const hs=document.getElementById('hist-store');if(hs){const cur=hs.value;hs.innerHTML=optsWithAll;if([...hs.options].some(o=>o.value===cur))hs.value=cur;}
}
