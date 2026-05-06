/* ══════════════════════════════════════════════════════
   儀表板（總覽）— 區間分析 + 各店走勢 + 管理指標
══════════════════════════════════════════════════════ */
function pad2(n){return String(n).padStart(2,'0');}
function toISO(d){return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());}
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x;}
function diffDays(a,b){return Math.round((new Date(b)-new Date(a))/86400000)+1;}
function setDashRange(kind){
  _dashRangeKind=kind;
  document.querySelectorAll('#dash-range-tabs .range-tab').forEach(b=>b.classList.toggle('active',b.getAttribute('data-range')===kind));
  const cust=document.getElementById('range-custom-inputs');
  if(kind==='custom'){
    cust.style.display='';
    const today=new Date();
    if(!document.getElementById('dash-start').value)document.getElementById('dash-start').value=toISO(addDays(today,-29));
    if(!document.getElementById('dash-end').value)document.getElementById('dash-end').value=toISO(today);
  } else {
    cust.style.display='none';
  }
  renderDashboard();
}
function onDashCustomDate(){renderDashboard();}
function computeDashRange(){
  const today=new Date();today.setHours(0,0,0,0);
  let start,end,label;
  switch(_dashRangeKind){
    case 'thisMonth':{
      start=new Date(today.getFullYear(),today.getMonth(),1);
      end=today;
      label=(today.getMonth()+1)+' 月（'+toISO(start)+' ～ '+toISO(end)+'）';
      break;
    }
    case 'lastMonth':{
      start=new Date(today.getFullYear(),today.getMonth()-1,1);
      end=new Date(today.getFullYear(),today.getMonth(),0);
      label='上月（'+toISO(start)+' ～ '+toISO(end)+'）';
      break;
    }
    case 'last7':{start=addDays(today,-6);end=today;label='近 7 天（'+toISO(start)+' ～ '+toISO(end)+'）';break;}
    case 'last30':{start=addDays(today,-29);end=today;label='近 30 天（'+toISO(start)+' ～ '+toISO(end)+'）';break;}
    case 'last90':{start=addDays(today,-89);end=today;label='近 90 天（'+toISO(start)+' ～ '+toISO(end)+'）';break;}
    case 'thisYear':{start=new Date(today.getFullYear(),0,1);end=today;label=today.getFullYear()+' 年（'+toISO(start)+' ～ '+toISO(end)+'）';break;}
    case 'custom':{
      const s=document.getElementById('dash-start')?.value,e=document.getElementById('dash-end')?.value;
      start=s?new Date(s):addDays(today,-29);
      end=e?new Date(e):today;
      if(end<start){const t=start;start=end;end=t;}
      label='自訂（'+toISO(start)+' ～ '+toISO(end)+'）';
      break;
    }
    default:{start=new Date(today.getFullYear(),today.getMonth(),1);end=today;label='本月';}
  }
  // 前一個同長度區間
  const days=diffDays(start,end);
  const prevEnd=addDays(start,-1);
  const prevStart=addDays(prevEnd,-(days-1));
  return {start,end,prevStart,prevEnd,days,label,iso:{s:toISO(start),e:toISO(end),ps:toISO(prevStart),pe:toISO(prevEnd)}};
}
function recordsInRange(s,e){return records.filter(r=>r.date>=s&&r.date<=e);}
function sumRecords(rs){
  let sales=0,bonus=0,proj=0,wage=0;
  const dateSet=new Set();
  rs.forEach(r=>{
    sales+=r.sales||0;
    bonus+=r.totalBonus||0;
    proj+=r.totalProjBonus||0;
    wage+=r.totalWage||0;
    dateSet.add(r.date);
  });
  return {sales,bonus,proj,wage,days:dateSet.size,count:rs.length,records:rs};
}
function deltaHtml(cur,prev){
  if(!prev){return '<span class="store-card-delta delta-flat">前期無資料</span>';}
  const diff=cur-prev,pct=prev?Math.round(diff/prev*1000)/10:0;
  if(Math.abs(diff)<0.5)return '<span class="store-card-delta delta-flat">＝ 持平</span>';
  if(diff>0)return '<span class="store-card-delta delta-up">▲ +$'+fmt(Math.round(diff))+' ('+pct+'%)</span>';
  return '<span class="store-card-delta delta-down">▼ -$'+fmt(Math.abs(Math.round(diff)))+' ('+pct+'%)</span>';
}
function buildTrendSVG(dates,seriesMap){
  const W=Math.max(720,dates.length*48);
  const H=260,padL=56,padR=14,padT=16,padB=34;
  const innerW=W-padL-padR,innerH=H-padT-padB;
  let maxY=0;
  Object.values(seriesMap).forEach(arr=>arr.forEach(v=>{if(v>maxY)maxY=v;}));
  maxY=maxY>0?Math.ceil(maxY/1000)*1000:1000;
  const n=dates.length;
  const xFor=i=>padL+(n<=1?innerW/2:(i/(n-1))*innerW);
  const yFor=v=>padT+innerH-(v/maxY)*innerH;
  // Y 軸格線 5 條
  const gridLines=[];
  for(let i=0;i<=4;i++){
    const y=padT+(innerH/4)*i;
    const v=Math.round(maxY-(maxY/4)*i);
    gridLines.push('<line x1="'+padL+'" y1="'+y+'" x2="'+(padL+innerW)+'" y2="'+y+'" stroke="#3a3835" stroke-dasharray="2,4" stroke-width="1"/>');
    gridLines.push('<text x="'+(padL-8)+'" y="'+(y+4)+'" fill="#9a9590" font-size="10" text-anchor="end" font-family="DM Mono,monospace">$'+fmt(v)+'</text>');
  }
  // X 軸標籤（避免過密，取樣最多 ~12 個）
  const step=Math.max(1,Math.ceil(n/12));
  const xLabels=dates.map((d,i)=>{
    if(i%step!==0&&i!==n-1)return '';
    const md=d.slice(5);
    return '<text x="'+xFor(i)+'" y="'+(padT+innerH+18)+'" fill="#9a9590" font-size="10" text-anchor="middle" font-family="DM Mono,monospace">'+md+'</text>';
  }).join('');
  // 系列
  const stores=Object.keys(seriesMap);
  const paths=stores.map(store=>{
    const arr=seriesMap[store];
    const color=sc(store);
    let d='';
    arr.forEach((v,i)=>{d+=(i===0?'M':'L')+xFor(i)+' '+yFor(v)+' ';});
    let circles='';
    arr.forEach((v,i)=>{
      if(v>0||n<=31){circles+='<circle cx="'+xFor(i)+'" cy="'+yFor(v)+'" r="3" fill="'+color+'"><title>'+store+' '+dates[i]+'：$'+fmt(v)+'</title></circle>';}
    });
    return '<path d="'+d.trim()+'" fill="none" stroke="'+color+'" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>'+circles;
  }).join('');
  return '<div style="overflow-x:auto;"><svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" style="min-width:100%;background:var(--surface2);border-radius:8px;">'+gridLines.join('')+paths+xLabels+'</svg></div>';
}
function renderDashboard(){
  const R=computeDashRange();
  const info=document.getElementById('dash-range-info');
  const cur=sumRecords(recordsInRange(R.iso.s,R.iso.e));
  const prev=sumRecords(recordsInRange(R.iso.ps,R.iso.pe));
  if(info)info.textContent=R.label+' ／ 共 '+R.days+' 天';

  // ── KPI 卡片 ──
  const kpiAvg=cur.days?Math.round(cur.sales/cur.days):0;
  const laborCostPct=cur.sales?Math.round((cur.wage+cur.bonus+cur.proj)/cur.sales*1000)/10:0;
  const bonusPct=cur.sales?Math.round((cur.bonus+cur.proj)/cur.sales*1000)/10:0;
  const pctDiff=prev.sales?Math.round((cur.sales-prev.sales)/prev.sales*1000)/10:null;
  const prevDeltaLabel=pctDiff==null?'<span style="color:var(--text-muted)">前期無資料</span>':(pctDiff>=0?'<span style="color:#2ecc71">▲ '+pctDiff+'%</span>':'<span style="color:#e74c3c">▼ '+Math.abs(pctDiff)+'%</span>')+' vs 前期';
  const kpis=[
    {label:'總營業額',val:'$'+fmt(cur.sales),sub:cur.days+' 個營業日 ／ '+prevDeltaLabel},
    {label:'日均營業額',val:'$'+fmt(kpiAvg),sub:'前期日均 $'+fmt(prev.days?Math.round(prev.sales/prev.days):0)},
    {label:'發出獎金合計',val:'$'+fmt(cur.bonus+cur.proj),sub:'業績 $'+fmt(cur.bonus)+' ／ 專案 $'+fmt(cur.proj)},
    {label:'人事成本佔比',val:laborCostPct+' %',sub:'本薪 $'+fmt(cur.wage)+' + 獎金 $'+fmt(cur.bonus+cur.proj)},
  ];
  document.getElementById('dashboard-kpis').innerHTML=kpis.map(k=>
    '<div class="stat-box"><div class="stat-label">'+k.label+'</div><div class="stat-value">'+k.val+'</div><div class="stat-sub">'+k.sub+'</div></div>').join('');

  // ── 各店業績比較卡片 ──
  const stores=getStores();
  const curByStore={},prevByStore={};
  stores.forEach(s=>{curByStore[s]={sales:0,days:new Set(),bonus:0,proj:0,wage:0};prevByStore[s]={sales:0,days:new Set()};});
  cur.records.forEach(r=>{
    if(!curByStore[r.store])curByStore[r.store]={sales:0,days:new Set(),bonus:0,proj:0,wage:0};
    curByStore[r.store].sales+=r.sales||0;
    curByStore[r.store].days.add(r.date);
    curByStore[r.store].bonus+=r.totalBonus||0;
    curByStore[r.store].proj+=r.totalProjBonus||0;
    curByStore[r.store].wage+=r.totalWage||0;
  });
  prev.records.forEach(r=>{
    if(!prevByStore[r.store])prevByStore[r.store]={sales:0,days:new Set()};
    prevByStore[r.store].sales+=r.sales||0;
    prevByStore[r.store].days.add(r.date);
  });
  const allStoreNames=[...new Set([...stores,...Object.keys(curByStore)])];
  const totalSalesCur=cur.sales||1;
  const storeHtml=allStoreNames.map(s=>{
    const cs=curByStore[s]||{sales:0,days:new Set(),bonus:0,proj:0,wage:0};
    const ps=prevByStore[s]||{sales:0};
    const share=Math.round(cs.sales/totalSalesCur*1000)/10;
    const days=(cs.days&&cs.days.size)||0;
    const avg=days?Math.round(cs.sales/days):0;
    return '<div class="store-card" style="border-left-color:'+sc(s)+'">'+
      '<div class="store-card-name"><span class="dot" style="background:'+sc(s)+'"></span>'+escapeHtml(s)+'</div>'+
      '<div class="store-card-val">$'+fmt(cs.sales)+'</div>'+
      '<div class="store-card-sub">佔比 '+share+'% ／ '+days+' 日 ／ 日均 $'+fmt(avg)+'<br>獎金 $'+fmt(cs.bonus+cs.proj)+' ／ 本薪 $'+fmt(cs.wage)+'</div>'+
      deltaHtml(cs.sales,ps.sales)+
    '</div>';
  }).join('');
  document.getElementById('dash-stores').innerHTML=cur.records.length?('<div class="store-compare">'+storeHtml+'</div>'):'<div class="empty-state"><div class="emo">📊</div>本期間尚無紀錄</div>';

  // ── 走勢圖 ──
  const dates=[];
  for(let d=new Date(R.start);d<=R.end;d=addDays(d,1))dates.push(toISO(d));
  const seriesMap={};
  allStoreNames.forEach(s=>{seriesMap[s]=dates.map(()=>0);});
  cur.records.forEach(r=>{
    const i=dates.indexOf(r.date);
    if(i<0)return;
    if(!seriesMap[r.store])seriesMap[r.store]=dates.map(()=>0);
    seriesMap[r.store][i]+=r.sales||0;
  });
  const activeSeries={};
  Object.entries(seriesMap).forEach(([k,v])=>{if(v.some(x=>x>0))activeSeries[k]=v;});
  const trendEl=document.getElementById('dash-trend');
  const legendEl=document.getElementById('dash-trend-legend');
  if(Object.keys(activeSeries).length===0){
    trendEl.innerHTML='<div class="empty-state"><div class="emo">📈</div>本期間尚無營業額資料</div>';
    legendEl.innerHTML='';
  } else {
    trendEl.innerHTML=buildTrendSVG(dates,activeSeries);
    legendEl.innerHTML=Object.keys(activeSeries).map(s=>
      '<span class="trend-legend-item"><span class="trend-legend-dot" style="background:'+sc(s)+'"></span>'+s+'</span>').join('');
  }

  // ── 星期別平均 ──
  const wdNames=['週日','週一','週二','週三','週四','週五','週六'];
  const wdData=[0,0,0,0,0,0,0].map(()=>({sales:0,n:0}));
  cur.records.forEach(r=>{
    const d=new Date(r.date+'T00:00:00');
    const w=d.getDay();
    wdData[w].sales+=r.sales||0;
    wdData[w].n+=1;
  });
  const wdAvg=wdData.map(w=>w.n?Math.round(w.sales/w.n):0);
  const wdMax=Math.max(1,...wdAvg);
  const wdHtml=[1,2,3,4,5,6,0].map(i=>{
    const avg=wdAvg[i],cnt=wdData[i].n;
    const w=wdMax?Math.round(avg/wdMax*100):0;
    return '<div class="weekday-bar"><div class="weekday-bar-label">'+wdNames[i]+'</div><div class="weekday-bar-val">$'+fmt(avg)+'</div><div class="weekday-bar-fill-wrap"><div class="weekday-bar-fill" style="width:'+w+'%;background:'+(i===0||i===6?'#e2c27a':'var(--gold)')+'"></div></div><div style="font-size:10px;color:var(--text-muted);margin-top:5px;">'+cnt+' 筆</div></div>';
  }).join('');
  document.getElementById('dash-weekday').innerHTML=cur.records.length?('<div class="weekday-bars">'+wdHtml+'</div><div style="font-size:11px;color:var(--text-muted);margin-top:10px;">週六、週日以較淺色標示。數值為該星期的平均單店單日營業額。</div>'):'<div class="empty-state"><div class="emo">📆</div>本期間尚無紀錄</div>';

  // ── 人事成本分析 ──
  const laborRows=allStoreNames.map(s=>{
    const cs=curByStore[s]||{sales:0,bonus:0,proj:0,wage:0};
    const cost=(cs.wage||0)+(cs.bonus||0)+(cs.proj||0);
    const pct=cs.sales?Math.round(cost/cs.sales*1000)/10:0;
    return {store:s,sales:cs.sales||0,cost,pct};
  }).filter(r=>r.sales>0||r.cost>0).sort((a,b)=>b.sales-a.sales);
  if(laborRows.length){
    document.getElementById('dash-labor').innerHTML=
      '<table style="width:100%;"><thead><tr><th>門市</th><th>營業額</th><th>本薪</th><th>獎金（業績+專案）</th><th>人事成本合計</th><th>成本佔比</th></tr></thead><tbody>'+
      laborRows.map(r=>{
        const cs=curByStore[r.store]||{wage:0,bonus:0,proj:0};
        const color=r.pct<35?'#2ecc71':r.pct<50?'var(--gold-light)':'#e74c3c';
        return '<tr>'+
          '<td><span class="dot" style="background:'+sc(r.store)+'"></span>'+r.store+'</td>'+
          '<td style="font-family:DM Mono;color:var(--gold-light)">$'+fmt(r.sales)+'</td>'+
          '<td style="font-family:DM Mono;color:#5dade2">$'+fmt(cs.wage||0)+'</td>'+
          '<td style="font-family:DM Mono;color:#82e0aa">$'+fmt((cs.bonus||0)+(cs.proj||0))+'</td>'+
          '<td style="font-family:DM Mono;color:#f0b27a">$'+fmt(r.cost)+'</td>'+
          '<td style="font-family:DM Mono;color:'+color+';font-weight:700">'+r.pct+' %</td>'+
        '</tr>';
      }).join('')+'</tbody></table>'+
      '<div style="font-size:11px;color:var(--text-muted);margin-top:10px;">🟢 &lt; 35% 健康 ／ 🟡 35–50% 留意 ／ 🔴 &gt; 50% 偏高（建議檢視班表安排與業績提升方案）</div>';
  } else {
    document.getElementById('dash-labor').innerHTML='<div class="empty-state"><div class="emo">💼</div>本期間尚無資料可分析</div>';
  }

  // ── 員工貢獻排行（Top） ──
  const staffAgg={};
  cur.records.forEach(r=>{
    const hc=r.staff.length||1;
    const bonusDist=distributeBonusForRecord(r,staff);
    r.staff.forEach(entry=>{
      const name=rsName(entry);
      if(!staffAgg[name])staffAgg[name]={wage:0,sb:0,pb:0,deduct:0,days:0};
      staffAgg[name].sb+=bonusDist[name]||0;
      staffAgg[name].days+=1;
      if(r.projPerStaff&&r.projPerStaff[name])staffAgg[name].pb+=r.projPerStaff[name].reduce((s,e)=>s+e.amt*e.count,0);
      else staffAgg[name].pb+=(r.totalProjBonus||0)/hc;
      if(r.deductData&&r.deductData[name])staffAgg[name].deduct+=(r.deductData[name].amt||0);
      if(r.wageData&&r.wageData[name])staffAgg[name].wage+=(r.wageData[name].wage||0);
    });
  });
  const topArr=Object.entries(staffAgg).map(([n,v])=>({name:n,...v,total:Math.round(v.wage+v.sb+v.pb-v.deduct)})).sort((a,b)=>b.total-a.total).slice(0,8);
  if(topArr.length){
    const maxTotal=Math.max(1,...topArr.map(t=>t.total));
    document.getElementById('dash-top-staff').innerHTML=topArr.map((t,i)=>{
      const w=Math.round(t.total/maxTotal*100);
      const medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1);
      return '<div style="display:flex;align-items:center;gap:10px;padding:8px 4px;border-bottom:1px solid var(--border);">'+
        '<span style="width:24px;font-family:DM Mono;color:var(--gold);">'+medal+'</span>'+
        '<div class="avatar" style="width:30px;height:30px;font-size:13px;">'+t.name[0]+'</div>'+
        '<div style="flex:1;min-width:0;"><div style="font-size:13px;color:var(--text);">'+escapeHtml(t.name)+'</div>'+
        '<div style="font-size:10px;color:var(--text-muted);margin-top:2px;">出班 '+t.days+' 天 ／ 本薪 $'+fmt(Math.round(t.wage))+' ／ 獎金 $'+fmt(Math.round(t.sb+t.pb))+(t.deduct>0?' ／ 扣款 -$'+fmt(Math.round(t.deduct)):'')+'</div>'+
        '<div style="height:4px;background:var(--surface3);border-radius:2px;margin-top:6px;overflow:hidden;"><div style="height:100%;width:'+w+'%;background:linear-gradient(to right,var(--gold),var(--gold-light));"></div></div></div>'+
        '<div style="font-family:DM Mono;color:#f0b27a;font-weight:700;font-size:16px;min-width:90px;text-align:right;">$'+fmt(t.total)+'</div>'+
      '</div>';
    }).join('');
  } else {
    document.getElementById('dash-top-staff').innerHTML='<div class="empty-state"><div class="emo">🏆</div>本期間尚無員工出班資料</div>';
  }

  // ── 最新紀錄表 ──
  const sorted=[...records].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,12);
  document.getElementById('dash-tbody').innerHTML=sorted.map(r=>{
    const hc=r.staff.length||1;
    const totalHours=r.wageData?r.staff.reduce((s,entry)=>{const n=rsName(entry);return s+(r.wageData[n]?r.wageData[n].hours||0:0);},0):0;
    const avgSB=totalHours>0?'依工時比例':('÷'+hc);
    return '<tr><td><span style="font-family:DM Mono;font-size:12px">'+r.date+'</span></td><td><span class="dot" style="background:'+sc(r.store)+'"></span>'+escapeHtml(r.store)+'</td><td>'+r.staff.map(e=>escapeHtml(rsName(e))).join('、')+'</td><td style="font-family:DM Mono;color:var(--gold-light)">$'+fmt(r.sales)+'</td><td style="font-family:DM Mono;color:#82e0aa">$'+fmt(r.totalBonus||0)+'<span style="font-size:9px;color:var(--text-muted);margin-left:3px;">'+avgSB+'</span></td><td style="font-family:DM Mono;color:#bb8fce">$'+fmt(Math.round((r.totalProjBonus||0)/hc))+'</td></tr>';
  }).join('')||'<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px">尚無紀錄</td></tr>';
}
