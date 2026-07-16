/* ── 路由 / 共用工具 ── */
/* ── 業績獎金查表（v2.9.0：分門市 × 分身分）──
 * getTierTable：取得某門市某身分適用的階梯表。
 *   - 門市未設定專屬規則時沿用 tiers.default
 *   - category==='newbie' 且新進表為空時沿用 regular 表
 */
function getTierTable(store,category){
  const cfg=(tiers.stores&&tiers.stores[store])||tiers.default||{};
  if(category==='newbie'&&cfg.newbie&&cfg.newbie.length)return cfg.newbie;
  return cfg.regular||[];
}
/* 單人查表：取最高符合門檻的獎金（全額，不分池） */
function calcTierBonusFor(sales,store,category){
  const tbl=[...getTierTable(store,category)].sort((a,b)=>b.threshold-a.threshold);
  for(const t of tbl){if(sales>=t.threshold)return t.bonus;}
  return 0;
}
/* 舊 API 相容包裝：以預設表（正式人員）計算，僅供殘留呼叫兼容 */
function calcTierBonus(sales){return calcTierBonusFor(sales,null,'regular');}
function calcOTWage(hourlyRate,hours,isDouble){
  const r=hourlyRate||0;
  let w=0;
  const h=hours||0;
  if(h<=8){w=r*h;}
  else if(h<=10){w=r*8+r*1.34*(h-8);}
  else{w=r*8+r*1.34*2+r*1.67*(h-10);}
  return Math.round(isDouble?w*2:w);
}
function activeProjTypes(month){return projTypes.filter(pt=>{if(!pt.active)return false;if(pt.from&&month<pt.from)return false;if(pt.to&&month>pt.to)return false;return true;});}

function addNewStore(){
  const nameEl=document.getElementById('new-store-name');
  const name=(nameEl.value||'').trim();
  if(!name){showToast('⚠ 請輸入門市名稱');return;}
  if(shifts[name]){showToast('⚠ 此門市名稱已存在');return;}
  shifts[name]=[{name:'全天班',hours:8,hourlyRate:175}];
  saveShiftsKey();refreshStoreSelects();renderShifts();nameEl.value='';
  logAction('新增門市',name);
  showToast('✅ 已新增門市：'+name);
}

function toggleTheme(){
  const isLight=document.body.classList.toggle('light-mode');
  const btn=document.getElementById('theme-toggle-btn');
  btn.textContent=isLight?'🌙 暗色模式':'☀️ 亮色模式';
  try{localStorage.setItem('themeMode',isLight?'light':'dark');}catch(e){}
}

const TITLES={dashboard:'總覽儀表板',record:'營業額登記',history:'歷史紀錄',bonus:'個人薪資試算',report:'月報表',payslip:'薪資單列印',staff:'員工資料',rules:'業績獎金規則',projtypes:'彈性專案獎金',shifts:'班別薪資設定',brackets:'保費級距表',logs:'操作紀錄',help:'使用說明',changelog:'版本修訂記錄'};
function goto(page){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('page-'+page).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b=>{if(b.getAttribute('onclick')==="goto('"+page+"')")b.classList.add('active');});
  document.getElementById('topbar-title').textContent=TITLES[page]||page;
  const fns={dashboard:renderDashboard,record:initRecord,history:renderHistory,bonus:calcBonus,report:renderReport,payslip:initPayslip,staff:renderStaff,rules:renderTiers,projtypes:renderProjTypes,shifts:renderShifts,brackets:initBracketsPage,logs:initLogsPage,help:function(){},changelog:function(){}};
  if(fns[page])fns[page]();
}
