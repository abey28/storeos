/* ══════════════════════════════════════════════════════
   薪資單列印
══════════════════════════════════════════════════════ */
function dateWithWeekday(dateStr){
  if(!dateStr)return dateStr;
  const d=new Date(dateStr+'T00:00:00');
  return dateStr.replace(/-/g,'/')+' 週'+WEEKDAYS[d.getDay()];
}
function initPayslip(){
  document.getElementById('ps-staff').innerHTML='<option value="">請選擇員工</option>'+staff.map(s=>'<option value="'+escapeHtml(s.name)+'">'+escapeHtml(s.name)+'（'+escapeHtml(s.id)+'）</option>').join('');
  document.getElementById('ps-month').value=thisMonth();
  document.getElementById('pay-summary-month').value=thisMonth();
  updatePsChangeHint();
}
function togglePsChange(){
  const show=document.getElementById('ps-has-change').checked;
  document.getElementById('ps-change-detail').style.display=show?'block':'none';
  if(show)updatePsChangeHint();
}
function updatePsChangeHint(){
  const m=document.getElementById('ps-month').value||thisMonth();
  const[y,mo]=m.split('-').map(Number);
  const total=new Date(y,mo,0).getDate();
  document.getElementById('ps-days-hint').textContent='該月共 '+total+' 天';
  if(!document.getElementById('ps-has-change').checked)return;
  const joinDay=parseInt(document.getElementById('ps-join-day').value,10);
  const leaveDay=parseInt(document.getElementById('ps-leave-day').value,10);
  const hints=[];
  if(joinDay>=1&&joinDay<=total){
    const liDays=total-joinDay+1;
    hints.push('✅ 到職（第 '+joinDay+' 日）→ 勞保 '+liDays+'/'+total+' 天，健保整月');
  }
  if(leaveDay>=1&&leaveDay<=total){
    if(leaveDay===total){
      hints.push('✅ 離職（第 '+leaveDay+' 日，月底）→ 勞保整月，健保整月');
    } else {
      const liDays2=leaveDay;
      hints.push('✅ 離職（第 '+leaveDay+' 日）→ 勞保 '+liDays2+'/'+total+' 天，健保不扣');
    }
  }
  document.getElementById('ps-change-hint').innerHTML=hints.join('<br>')||'<span style="color:var(--text-muted)">請輸入到職日或離職日</span>';
}
function generatePayslip(){
  const sname=document.getElementById('ps-staff').value,month=document.getElementById('ps-month').value||thisMonth();
  if(!sname){showToast('⚠ 請選擇員工');return;}
  const _se=staff.find(s=>s.name===sname)||{};
  const se={name:sname,id:'',store:'',liInsured:false,liAmt:0,nhiInsured:false,nhiAmt:0,nhiDep:0,nhiReduce:0,selfRetire:false,selfRetireRate:0,insured:false,insuredAmt:0,..._se};
  const mr=records.filter(r=>r.date.startsWith(month)&&r.staff.some(e=>rsName(e)===sname)).sort((a,b)=>a.date.localeCompare(b.date));
  const rows=mr.map(r=>{
    const hc=r.staff.length||1;
    const staffPB=(r.projPerStaff&&r.projPerStaff[sname])?r.projPerStaff[sname].reduce((s,e)=>s+e.amt*e.count,0):Math.round((r.totalProjBonus||0)/hc);
    const staffPS=(r.projPerStaff&&r.projPerStaff[sname])?r.projPerStaff[sname].filter(e=>e.count>0).map(e=>e.name+'×'+e.count).join('、'):(r.projEntries||[]).filter(e=>e.count>0).map(e=>e.name+'×'+e.count).join('、');
    const wd=r.wageData&&r.wageData[sname]?r.wageData[sname]:{shift:'—',hours:0,wage:0};
    const dd=r.deductData&&r.deductData[sname]?r.deductData[sname]:{amt:0,reason:''};
    const ad=r.allowanceData&&r.allowanceData[sname]?r.allowanceData[sname]:{amt:0,reason:''};
    const rawSB=distributeBonusForRecord(r,staff)[sname]||0;
    const netSB=Math.max(0,rawSB-(dd.amt||0)); // 扣款先抵業績獎金
    return{date:r.date,store:r.store,hc,sales:r.sales,sb:netSB,pb:staffPB,ps:staffPS,shift:wd.shift||'—',hours:wd.hours||0,wage:wd.wage||0,doublePay:r.doublePay||false,allow:ad.amt||0,allowReason:ad.reason||''};
  });
  const tSB=rows.reduce((a,r)=>a+r.sb,0);
  const tPB=rows.reduce((a,r)=>a+r.pb,0);
  const tWage=rows.reduce((a,r)=>a+r.wage,0);
  const tHours=rows.reduce((a,r)=>a+r.hours,0);
  const tSales=rows.reduce((a,r)=>a+r.sales,0);
  const tAllow=rows.reduce((a,r)=>a+r.allow,0);
  const doublePayDays=rows.filter(r=>r.doublePay).length;
  const titleAllowance=Number(se.titleAllowance||0);
  const grossBonus=tSB+tPB;
  const grossTotal=tWage+grossBonus+titleAllowance+tAllow;

  /* ── 勞健保及補充保費計算 ── */
  const liInsured=se.liInsured||(se.insured&&!se.nhiInsured)||false;
  const nhiInsured=se.nhiInsured||false;
  const liInsuredAmt=Number(se.liAmt||se.insuredAmt||0);
  const nhiInsuredAmt=Number(se.nhiAmt||se.insuredAmt||0);
  const nhiDep=Number(se.nhiDep||0);
  const nhiReduce=Number(se.nhiReduce||0);
  const SUPP_BASE=29500; // 兼職所得補充保費門檻
  // ── 當月在職異動（到職 / 離職）──
  const[psYr,psMo]=month.split('-').map(Number);
  const totalDaysInMonth=new Date(psYr,psMo,0).getDate();
  const hasChange=document.getElementById('ps-has-change').checked;
  const joinDayRaw=hasChange?parseInt(document.getElementById('ps-join-day').value,10):NaN;
  const leaveDayRaw=hasChange?parseInt(document.getElementById('ps-leave-day').value,10):NaN;
  const joinDay=(joinDayRaw>=1&&joinDayRaw<=totalDaysInMonth)?joinDayRaw:null;
  const leaveDay=(leaveDayRaw>=1&&leaveDayRaw<=totalDaysInMonth)?leaveDayRaw:null;
  // 勞保：到職從到職日算到月底；離職從1日算到離職日；兩者取較少天數
  let liInsuredDays=totalDaysInMonth;
  if(joinDay)liInsuredDays=Math.min(liInsuredDays,totalDaysInMonth-joinDay+1);
  if(leaveDay)liInsuredDays=Math.min(liInsuredDays,leaveDay);
  const isPartialLI=liInsuredDays<totalDaysInMonth;
  // 健保：月中離職（非月底）不扣；月中到職或月底離職扣整月
  const nhiSkip=!!(leaveDay&&leaveDay<totalDaysInMonth);
  let liDeduct=0,nhiDeduct=0,liBase=0,nhiBase=0,suppPremium=0;
  const deductLines=[];

  // ── 勞保 ──
  if(liInsured&&liInsuredAmt>0){
    const liEntry=getLIEntry(liInsuredAmt,psYr.toString());
    liBase=liEntry.salary;
    const liFullMonth=liEntry.emp;
    liDeduct=isPartialLI?Math.round(liFullMonth*liInsuredDays/totalDaysInMonth):liFullMonth;
    const liDayNote=isPartialLI?' × '+liInsuredDays+'/'+totalDaysInMonth+' 天（依法比例計算）':'';
    deductLines.push({label:'勞保費（員工負擔）',amt:liDeduct,note:'投保薪資級距 $'+fmt(liBase)+'，員工負擔 $'+fmt(liFullMonth)+liDayNote});
  }

  // ── 健保 ──
  if(nhiInsured&&nhiInsuredAmt>0){
    const nhiEffAmt=Math.max(nhiInsuredAmt,NHI_MIN);
    const nhiCorrected=nhiInsuredAmt<NHI_MIN;
    if(nhiSkip){
      deductLines.push({label:'健保費（員工負擔）',amt:0,note:'月中離職（'+leaveDay+' 日，非月底）— 依《全民健康保險法》不扣，由退保次日起轉由新單位或地區人口接續投保',skip:true});
    } else {
      const nhiEntry=getNHIEntry(nhiEffAmt,psYr.toString());
      nhiBase=nhiEntry.salary;
      const reduceMulti=Math.max(0,1-(nhiReduce/100));
      const depMulti=1+nhiDep;
      nhiDeduct=Math.round(nhiEntry.emp*depMulti*reduceMulti);
      const depNote=nhiDep>0?'×(1+'+nhiDep+'眷)':'';
      const reduceNote=nhiReduce>0?'×(1-'+nhiReduce+'%)':'';
      const joinNote=joinDay?'（當月第 '+joinDay+' 日到職，健保整月計算）':'';
      const lastDayNote=(leaveDay&&leaveDay===totalDaysInMonth)?'（月底離職，健保整月計算）':'';
      const corrNote=nhiCorrected?'；設定薪資 $'+fmt(nhiInsuredAmt)+' 低於最低投保級距 $'+fmt(NHI_MIN)+'，自動上修':'';
      deductLines.push({label:'健保費（員工負擔）'+(nhiCorrected?' ⚠':''),amt:nhiDeduct,note:'投保薪資級距 $'+fmt(nhiBase)+'，員工負擔 $'+fmt(nhiEntry.emp)+depNote+reduceNote+(joinNote||lastDayNote)+corrNote});

      // 有投保健保：獎金超過投保薪資4倍補充保費
      const bonusCap=nhiEffAmt*4;
      if(grossBonus>bonusCap){
        const sp=Math.round((grossBonus-bonusCap)*0.0211);
        suppPremium+=sp;
        deductLines.push({label:'二代健保補充保費',amt:sp,note:'獎金 $'+fmt(grossBonus)+' 超過投保薪資4倍 $'+fmt(bonusCap)+'，超過部分 × 2.11%'});
      }
    }
  }

  // ── 未投保健保：兼職所得補充保費 ──
  const partTimeNote=[];
  if(!nhiInsured){
    if(tWage>SUPP_BASE){
      const sp=Math.round(tWage*0.0211);
      suppPremium+=sp;
      partTimeNote.push('底薪 $'+fmt(tWage)+' > $'+fmt(SUPP_BASE)+' → × 2.11% = $'+fmt(sp));
      deductLines.push({label:'兼職所得補充保費（底薪）',amt:sp,note:'底薪 $'+fmt(tWage)+' × 2.11%（單次發放超過 $'+fmt(SUPP_BASE)+'）'});
    }
    const totalBonus=tSB+tPB;
    if(totalBonus>SUPP_BASE){
      const sp=Math.round(totalBonus*0.0211);
      suppPremium+=sp;
      partTimeNote.push('獎金 $'+fmt(totalBonus)+' > $'+fmt(SUPP_BASE)+' → × 2.11% = $'+fmt(sp));
      deductLines.push({label:'兼職所得補充保費（獎金）',amt:sp,note:'獎金 $'+fmt(totalBonus)+' × 2.11%（單次發放超過 $'+fmt(SUPP_BASE)+'）'});
    }
  }

  const totalDeductIns=liDeduct+nhiDeduct+suppPremium;
  const partTimeSplitNote=(!nhiInsured&&partTimeNote.length>0)?
    '⚠ 未投保健保人員：底薪與獎金將分不同日期發放，各自超過 $'+fmt(SUPP_BASE)+' 時依 2.11% 計算補充保費。':'';

  // 員工自提勞工退休金（薪資減項）
  const selfRetire=se.selfRetire||false;
  const selfRetireRate=Number(se.selfRetireRate||0);
  let selfRetireAmt=0;
  if(selfRetire&&selfRetireRate>=1&&liInsured&&liInsuredAmt>0){
    selfRetireAmt=Math.round(liInsuredAmt*selfRetireRate/100);
    deductLines.push({label:'勞工退休金自提（'+selfRetireRate+'%）',amt:selfRetireAmt,note:'勞保投保薪資 $'+fmt(liInsuredAmt)+' × '+selfRetireRate+'%，存入個人勞退專戶'});
  }
  const totalDeduct=totalDeductIns+selfRetireAmt;
  const netTotal=grossTotal-totalDeduct;

  // 雇主退休金提撥（6%，雇主全額負擔，僅供參考，不列入薪資減項）
  const retireRef=liInsured&&liInsuredAmt>0?Math.round(liInsuredAmt*0.06):0;

  const tierNote=[...tiers].sort((a,b)=>a.threshold-b.threshold).map(t=>'$'+fmt(t.threshold)+'→$'+t.bonus+'元').join(' ／ ');
  const parts=month.split('-'),yr=parts[0],mo=parts[1];

  // ── 出班明細列 ──
  let bodyRows=rows.length?rows.map((r,i)=>{
    const dateLabel=dateWithWeekday(r.date);
    return '<tr style="background:'+(r.doublePay?'#fff8f0':(i%2?'#fafafa':'#fff'))+'">'+
      '<td style="padding:5px 6px;border-bottom:1px solid #eee;font-size:11px">'+dateLabel+(r.doublePay?'<span style="font-size:9px;background:#fff3e0;color:#e67e22;border:1px solid #f0b27a;border-radius:3px;padding:0 4px;margin-left:3px;">×2</span>':'')+'</td>'+
      '<td style="padding:5px 6px;border-bottom:1px solid #eee;font-size:11px">'+r.store+'</td>'+
      '<td style="padding:5px 6px;border-bottom:1px solid #eee;font-size:11px">'+r.shift+'</td>'+
      '<td style="padding:5px 6px;text-align:center;border-bottom:1px solid #eee;font-size:11px">'+r.hours+'h</td>'+
      '<td style="padding:5px 6px;text-align:right;border-bottom:1px solid #eee;font-size:11px;color:'+(r.doublePay?'#e67e22':'#1565c0')+';font-weight:600">$'+fmt(r.wage)+'</td>'+
      '<td style="padding:5px 6px;text-align:right;border-bottom:1px solid #eee;font-size:11px">$'+fmt(r.sales)+'</td>'+
      '<td style="padding:5px 6px;text-align:right;border-bottom:1px solid #eee;font-size:11px;color:#1a7a45">$'+fmt(r.sb)+'</td>'+
      '<td style="padding:5px 6px;text-align:right;border-bottom:1px solid #eee;font-size:11px;color:#6a3aaa">$'+fmt(r.pb)+'</td>'+
      '<td style="padding:5px 6px;text-align:right;border-bottom:1px solid #eee;font-size:11px;color:#c87941">'+(r.allow>0?'+$'+fmt(r.allow)+(r.allowReason?'<div style="font-size:9px;color:#aaa">'+r.allowReason+'</div>':''):'—')+'</td>'+
      '</tr>';
  }).join('')+
  '<tr style="background:#f0f0f0;font-weight:700;font-size:11px">'+
    '<td colspan="3" style="padding:7px 6px">合計'+(doublePayDays>0?' <span style="font-size:9px;color:#e67e22;font-weight:400;">(含 '+doublePayDays+' 天雙倍薪資)</span>':'')+'</td>'+
    '<td style="padding:7px 6px;text-align:center">'+tHours+'h</td>'+
    '<td style="padding:7px 6px;text-align:right;color:#1565c0">$'+fmt(tWage)+'</td>'+
    '<td style="padding:7px 6px;text-align:right">$'+fmt(tSales)+'</td>'+
    '<td style="padding:7px 6px;text-align:right;color:#1a7a45">$'+fmt(tSB)+'</td>'+
    '<td style="padding:7px 6px;text-align:right;color:#6a3aaa">$'+fmt(tPB)+'</td>'+
    '<td style="padding:7px 6px;text-align:right;color:#c87941">'+(tAllow>0?'+$'+fmt(tAllow):'—')+'</td>'+
  '</tr>'
  :'<tr><td colspan="9" style="padding:16px;color:#999">本月無出班紀錄</td></tr>';

  // ── 收入摘要卡 ──
  const incomeCards=
    '<div style="background:#e8f0fe;border-radius:8px;padding:14px;text-align:center;"><div style="font-size:10px;color:#888;margin-bottom:5px;">底薪</div><div style="font-size:22px;font-weight:700;color:#1565c0;">$'+fmt(tWage)+'</div></div>'+
    '<div style="background:#f0faf5;border-radius:8px;padding:14px;text-align:center;"><div style="font-size:10px;color:#888;margin-bottom:5px;">業績獎金</div><div style="font-size:22px;font-weight:700;color:#1a7a45;">$'+fmt(tSB)+'</div></div>'+
    '<div style="background:#f5f0fa;border-radius:8px;padding:14px;text-align:center;"><div style="font-size:10px;color:#888;margin-bottom:5px;">專案獎金</div><div style="font-size:22px;font-weight:700;color:#6a3aaa;">$'+fmt(tPB)+'</div></div>'+
    (tAllow>0?'<div style="background:#fff5ec;border-radius:8px;padding:14px;text-align:center;"><div style="font-size:10px;color:#888;margin-bottom:5px;">加項（誤餐費等）</div><div style="font-size:22px;font-weight:700;color:#c87941;">+$'+fmt(tAllow)+'</div></div>':'')+
    (titleAllowance>0?'<div style="background:#fff8e8;border-radius:8px;padding:14px;text-align:center;"><div style="font-size:10px;color:#888;margin-bottom:5px;">職稱加給'+(se.jobTitle?' ('+escapeHtml(se.jobTitle)+')':'')+'</div><div style="font-size:22px;font-weight:700;color:#b8860b;">$'+fmt(titleAllowance)+'</div></div>':'');

  // ── 減項列表（勞健保） ──
  let deductSection='';
  if(deductLines.length){
    const rows2=deductLines.map(d=>'<tr><td style="padding:6px 10px;font-size:12px;color:#555;">'+d.label+'</td><td style="padding:6px 10px;font-size:11px;color:#888;">'+d.note+'</td><td style="padding:6px 10px;text-align:right;font-size:13px;font-weight:700;'+(d.skip?'color:#888;">免扣':'color:#c0392b;">-$'+fmt(d.amt))+'</td></tr>').join('');
    deductSection='<div style="font-size:10px;letter-spacing:3px;color:#555;border-bottom:1px solid #ddd;padding-bottom:5px;margin:18px 0 12px;">勞健保扣除項目</div>'+
      '<table style="width:100%;border-collapse:collapse;margin-bottom:18px;background:#fdfafa;border-radius:8px;overflow:hidden;">'+
      '<thead><tr style="background:#f7f0f0;"><th style="padding:6px 10px;text-align:left;font-size:10px;color:#888;">項目</th><th style="padding:6px 10px;text-align:left;font-size:10px;color:#888;">說明</th><th style="padding:6px 10px;text-align:right;font-size:10px;color:#888;">金額</th></tr></thead>'+
      '<tbody>'+rows2+'</tbody></table>';
  }

  // ── 應領合計卡 ──
  const totalCard='<div style="background:#fffbf0;border:2px solid #c9a84c;border-radius:8px;padding:14px;text-align:center;"><div style="font-size:10px;color:#888;margin-bottom:5px;">本月實發合計</div><div style="font-size:26px;font-weight:700;color:#b8860b;">$'+fmt(netTotal)+'</div>'+(totalDeduct>0?'<div style="font-size:10px;color:#aaa;margin-top:4px;">應發 $'+fmt(grossTotal)+' − 各項扣除 $'+fmt(totalDeduct)+'</div>':'')+(titleAllowance>0&&totalDeduct===0?'<div style="font-size:10px;color:#aaa;margin-top:4px;">含職稱加給 $'+fmt(titleAllowance)+'</div>':'')+'</div>';

  // ── 退休金參考 ──
  const retireNote=retireRef>0?'<div style="background:#f0f7ff;border-radius:8px;padding:10px 14px;font-size:11px;color:#555;margin-bottom:18px;">🏦 <b>雇主退休金提撥（僅供參考，不列薪資減項）：</b>$'+fmt(retireRef)+' ／月（月投保薪資 $'+fmt(liInsuredAmt)+' × 6%，由雇主全額負擔，存入勞退個人專戶）</div>':'';

  const html='<div style="background:#fff;color:#111;padding:36px;border-radius:10px;font-family:serif;line-height:1.8;max-width:900px;">'+
    '<div style="text-align:center;padding-bottom:16px;border-bottom:2px solid #222;margin-bottom:22px;">'+
      '<div style="font-size:22px;font-weight:700;letter-spacing:5px;">員工薪資單</div>'+
      '<div style="font-size:12px;color:#888;margin-top:4px;">THE food co. 同興 ／ PAYSLIP</div>'+
    '</div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 40px;font-size:13px;margin-bottom:22px;">'+
      '<div><span style="color:#777">員工姓名：</span><b>'+escapeHtml(se.name)+'</b></div>'+
      '<div><span style="color:#777">員工編號：</span>'+escapeHtml(se.id||'—')+'</div>'+
      '<div><span style="color:#777">職稱：</span>'+(se.jobTitle?'<b>'+escapeHtml(se.jobTitle)+'</b>':'<span style="color:#aaa">—</span>')+'</div>'+
      '<div><span style="color:#777">主要門市：</span>'+escapeHtml(se.store||'—')+'</div>'+
      '<div><span style="color:#777">結算月份：</span><b>'+yr+'年'+mo+'月</b></div>'+
      '<div><span style="color:#777">出班天數：</span>'+rows.length+' 天（共 '+tHours+' 小時）</div>'+
      '<div><span style="color:#777">月份累計營業額：</span>$'+fmt(tSales)+'</div>'+
      '<div><span style="color:#777">勞保：</span>'+(liInsured?'<b style="color:#1a7a45">已投保（月薪資 $'+fmt(liInsuredAmt)+'）</b>':'<span style="color:#e67e22">未投保</span>')+'</div>'+
      '<div><span style="color:#777">健保：</span>'+(nhiInsured?'<b style="color:#1a7a45">已投保（月薪資 $'+fmt(nhiInsuredAmt)+'）'+(nhiDep?'，眷屬'+nhiDep+'人':'')+''+(nhiReduce?'，減免'+nhiReduce+'%':'')+'</b>':'<span style="color:#e67e22">未投保</span>')+'</div>'+
      (joinDay?'<div><span style="color:#777">到職日：</span><b style="color:#1a7a45">'+yr+'年'+mo+'月 '+joinDay+' 日（勞保 '+(totalDaysInMonth-joinDay+1)+'/'+totalDaysInMonth+' 天，健保整月）</b></div>':'')+
      (leaveDay&&leaveDay<totalDaysInMonth?'<div><span style="color:#777">離職日：</span><b style="color:#c0392b">'+yr+'年'+mo+'月 '+leaveDay+' 日（勞保 '+leaveDay+'/'+totalDaysInMonth+' 天，健保不扣）</b></div>':'')+
      (leaveDay&&leaveDay===totalDaysInMonth?'<div><span style="color:#777">離職日：</span><b style="color:#555">'+yr+'年'+mo+'月 '+leaveDay+' 日（月底，勞保整月，健保整月）</b></div>':'')+
    '</div>'+
    '<div style="font-size:10px;letter-spacing:3px;color:#555;border-bottom:1px solid #ddd;padding-bottom:5px;margin-bottom:12px;">出班明細</div>'+
    '<table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:18px;">'+
      '<thead><tr style="background:#f7f7f7;">'+
        '<th style="padding:6px;text-align:left;border-bottom:1px solid #e0e0e0;font-size:10px">日期</th>'+
        '<th style="padding:6px;text-align:left;border-bottom:1px solid #e0e0e0;font-size:10px">門市</th>'+
        '<th style="padding:6px;text-align:left;border-bottom:1px solid #e0e0e0;font-size:10px">班別</th>'+
        '<th style="padding:6px;text-align:center;border-bottom:1px solid #e0e0e0;font-size:10px">工時</th>'+
        '<th style="padding:6px;text-align:right;border-bottom:1px solid #e0e0e0;font-size:10px">底薪</th>'+
        '<th style="padding:6px;text-align:right;border-bottom:1px solid #e0e0e0;font-size:10px">當日營業額</th>'+
        '<th style="padding:6px;text-align:right;border-bottom:1px solid #e0e0e0;font-size:10px">業績獎金</th>'+
        '<th style="padding:6px;text-align:right;border-bottom:1px solid #e0e0e0;font-size:10px">專案獎金</th>'+
        '<th style="padding:6px;text-align:right;border-bottom:1px solid #e0e0e0;font-size:10px">加項</th>'+
      '</tr></thead><tbody>'+bodyRows+'</tbody>'+
    '</table>'+
    '<div style="font-size:10px;letter-spacing:3px;color:#555;border-bottom:1px solid #ddd;padding-bottom:5px;margin-bottom:14px;">應發薪資摘要</div>'+
    '<div style="display:grid;grid-template-columns:repeat('+([1,tAllow>0?1:0,tSB>0||tPB>0?1:0,titleAllowance>0?1:0].reduce((s,v)=>s+(v?1:0),3))+',1fr);gap:12px;margin-bottom:18px;">'+incomeCards+'</div>'+
    deductSection+
    retireNote+
    '<div style="display:grid;grid-template-columns:1fr;gap:12px;margin-bottom:18px;">'+totalCard+'</div>'+
    '<div style="margin-bottom:28px;"></div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:16px;">'+
      '<div style="border-top:1px solid #bbb;padding-top:10px;font-size:12px;color:#888;">主管確認簽章</div>'+
      '<div style="border-top:1px solid #bbb;padding-top:10px;font-size:12px;color:#888;">員工簽收</div>'+
    '</div>'+
    '<div style="margin-top:28px;font-size:10px;color:#ccc;text-align:center;">THE food co. 同興 ／ 結算月份：'+yr+'年'+mo+'月</div>'+
  '</div>';
  document.getElementById('payslip-preview').innerHTML=html;
  document.getElementById('payslip-print-area').innerHTML=html;
}
function printPayslip(){if(!document.getElementById('payslip-preview').innerHTML){showToast('⚠ 請先產出薪資單');return;}window.print();}

/* ══════════════════════════════════════════════════════
   全員薪資總表 — 會計對帳用
══════════════════════════════════════════════════════ */
function generatePaySummary(){
  const month=document.getElementById('pay-summary-month').value||thisMonth();
  const parts=month.split('-'),yr=parts[0],mo=parts[1];
  const results=staff.map(s=>calcStaffPaySummary(s.name,month)).filter(Boolean);
  if(!results.length){
    document.getElementById('pay-summary-preview').innerHTML='<div class="empty-state"><div class="emo">📭</div>該月份無任何出班紀錄</div>';
    return;
  }

  // 合計列
  const tot={tWage:0,tSB:0,tPB:0,tAllow:0,titleAllowance:0,liDeduct:0,nhiDeduct:0,selfRetireAmt:0,suppWagePremium:0,suppBonusPremium:0,payA_gross:0,payA_deduct:0,payA_net:0,payB_gross:0,payB_deduct:0,payB_net:0,netTotal:0};
  results.forEach(r=>{Object.keys(tot).forEach(k=>{if(typeof r[k]==='number')tot[k]+=r[k];});});

  const tdS='padding:7px 10px;border-bottom:1px solid #eee;font-size:12px;';
  const thS='padding:8px 10px;font-size:10px;letter-spacing:1px;border-bottom:2px solid #ddd;text-align:right;white-space:nowrap;';
  const thLS='padding:8px 10px;font-size:10px;letter-spacing:1px;border-bottom:2px solid #ddd;text-align:left;white-space:nowrap;';
  const stickyTh='position:sticky;left:0;z-index:2;';
  const stickyTd='position:sticky;left:0;z-index:1;';

  function row(r,isTotal){
    const rowBg=isTotal?'#f0f0f0':'var(--surface)';
    const name=isTotal?'<b>合計</b>':escapeHtml(r.name)+(r.jobTitle?'<span style="font-size:10px;color:#888;margin-left:4px;">'+escapeHtml(r.jobTitle)+'</span>':'');
    const id=isTotal?'':escapeHtml(r.id);
    const store=isTotal?'':escapeHtml(r.store);
    return '<tr style="background:'+rowBg+';"'+( isTotal?'':' onmouseover="this.style.background=\'var(--surface2)\'" onmouseout="this.style.background=\''+rowBg+'\'"')+'>'+
      '<td style="'+tdS+stickyTd+'background:'+rowBg+';text-align:left;border-right:1px solid #ddd;font-weight:'+(isTotal?'700':'400')+'">'+name+'</td>'+
      '<td style="'+tdS+'text-align:left;color:#888;font-size:11px">'+id+'</td>'+
      '<td style="'+tdS+'text-align:left;color:#888;font-size:11px;border-right:2px solid #ddd;">'+store+'</td>'+
      '<td style="'+tdS+'text-align:right;color:#1565c0;font-family:DM Mono">$'+fmt(r.tWage)+'</td>'+
      '<td style="'+tdS+'text-align:right;color:#c87941;font-family:DM Mono">'+(r.tAllow>0?'+$'+fmt(r.tAllow):'—')+'</td>'+
      '<td style="'+tdS+'text-align:right;color:#b8860b;font-family:DM Mono">'+(r.titleAllowance>0?'+$'+fmt(r.titleAllowance):'—')+'</td>'+
      '<td style="'+tdS+'text-align:right;color:#c0392b;font-family:DM Mono">'+(r.liDeduct>0?'-$'+fmt(r.liDeduct):'—')+'</td>'+
      '<td style="'+tdS+'text-align:right;color:#c0392b;font-family:DM Mono">'+(r.nhiDeduct>0?'-$'+fmt(r.nhiDeduct):'—')+'</td>'+
      '<td style="'+tdS+'text-align:right;color:#c0392b;font-family:DM Mono">'+(r.selfRetireAmt>0?'-$'+fmt(r.selfRetireAmt):'—')+'</td>'+
      '<td style="'+tdS+'text-align:right;color:#c0392b;font-family:DM Mono">'+(r.suppWagePremium>0?'-$'+fmt(r.suppWagePremium):'—')+'</td>'+
      '<td style="'+tdS+'text-align:right;font-weight:700;color:#1565c0;font-family:DM Mono;background:#eef4ff">$'+fmt(r.payA_net)+'</td>'+
      '<td style="'+tdS+'text-align:right;color:#1a7a45;font-family:DM Mono">$'+fmt(r.tSB)+'</td>'+
      '<td style="'+tdS+'text-align:right;color:#6a3aaa;font-family:DM Mono">$'+fmt(r.tPB)+'</td>'+
      '<td style="'+tdS+'text-align:right;color:#c0392b;font-family:DM Mono">'+(r.suppBonusPremium>0?'-$'+fmt(r.suppBonusPremium):'—')+'</td>'+
      '<td style="'+tdS+'text-align:right;font-weight:700;color:#1a7a45;font-family:DM Mono;background:#eefaf5">$'+fmt(r.payB_net)+'</td>'+
      '<td style="'+tdS+'text-align:right;font-weight:700;color:#b8860b;font-family:DM Mono;background:#fffbee">$'+fmt(r.netTotal)+'</td>'+
    '</tr>';
  }

  const tableHTML=
    '<div class="tbl-scroll" style="border:1px solid var(--border);border-radius:8px;margin-top:4px;scrollbar-width:thin;scrollbar-color:var(--gold-dim) var(--surface2);">'+
    '<table style="border-collapse:collapse;font-size:12px;white-space:nowrap;">'+
    '<thead>'+
      '<tr style="background:#e8e8e8;">'+
        '<th colspan="3" style="'+thLS+stickyTh+'background:#e8e8e8;border-right:2px solid #ccc;">員工</th>'+
        '<th colspan="8" style="'+thS+'background:#e8f0fe;color:#1565c0;border-left:2px solid #bcd;">── 發放日 A（底薪日）──</th>'+
        '<th colspan="4" style="'+thS+'background:#e8faf0;color:#1a7a45;border-left:2px solid #9dc;">── 發放日 B（獎金日）──</th>'+
        '<th style="'+thS+'background:#fffbee;color:#b8860b;border-left:2px solid #e4c;">合計實發</th>'+
      '</tr>'+
      '<tr style="background:#f5f5f5;">'+
        '<th style="'+thLS+stickyTh+'background:#f5f5f5;border-right:1px solid #ddd;">姓名</th>'+
        '<th style="'+thLS+stickyTh+'background:#f5f5f5;left:64px;">編號</th>'+
        '<th style="'+thLS+'border-right:2px solid #ccc;">門市</th>'+
        '<th style="'+thS+'background:#f0f5ff">底薪</th>'+
        '<th style="'+thS+'background:#f0f5ff">加項</th>'+
        '<th style="'+thS+'background:#f0f5ff">職稱加給</th>'+
        '<th style="'+thS+'background:#f0f5ff">勞保費</th>'+
        '<th style="'+thS+'background:#f0f5ff">健保費</th>'+
        '<th style="'+thS+'background:#f0f5ff">退休金</th>'+
        '<th style="'+thS+'background:#f0f5ff">兼職補充</th>'+
        '<th style="'+thS+'background:#ddeeff;color:#1565c0;font-weight:700">A實付</th>'+
        '<th style="'+thS+'background:#eefaf5">業績獎金</th>'+
        '<th style="'+thS+'background:#eefaf5">專案獎金</th>'+
        '<th style="'+thS+'background:#eefaf5">補充保費</th>'+
        '<th style="'+thS+'background:#ddf5ea;color:#1a7a45;font-weight:700">B實付</th>'+
        '<th style="'+thS+'background:#fffbee;color:#b8860b;font-weight:700">合計</th>'+
      '</tr>'+
    '</thead>'+
    '<tbody>'+
      results.map(r=>row(r,false)).join('')+
      '<tr><td colspan="16" style="height:2px;background:linear-gradient(to right,#c9a84c,transparent);padding:0;"></td></tr>'+
      row(tot,true)+
    '</tbody>'+
    '</table></div>'+
    '<div style="margin-top:14px;display:flex;gap:12px;flex-wrap:wrap;">'+
      '<div style="font-size:12px;color:var(--text);background:#eef4ff;padding:10px 16px;border-radius:8px;border-left:3px solid #1565c0;flex:1;min-width:240px;">'+
        '<b style="color:#1565c0">發放日 A：$'+fmt(tot.payA_net)+'</b><br><span style="font-size:10px;color:#888;">底薪＋加項＋職稱加給－勞健保－退休金－兼職補充保費</span>'+
      '</div>'+
      '<div style="font-size:12px;color:var(--text);background:#eefaf5;padding:10px 16px;border-radius:8px;border-left:3px solid #1a7a45;flex:1;min-width:200px;">'+
        '<b style="color:#1a7a45">發放日 B：$'+fmt(tot.payB_net)+'</b><br><span style="font-size:10px;color:#888;">業績獎金＋專案獎金－補充保費</span>'+
      '</div>'+
      '<div style="font-size:12px;color:var(--text);background:#fffbee;padding:10px 16px;border-radius:8px;border-left:3px solid #b8860b;min-width:160px;">'+
        '<b style="color:#b8860b">本月總支出：$'+fmt(tot.netTotal)+'</b>'+
      '</div>'+
    '</div>';

  document.getElementById('pay-summary-preview').innerHTML=tableHTML;
  showToast('✅ '+yr+'年'+mo+'月全員薪資總表已產出（共 '+results.length+' 人）');
}

function printPaySummary(){
  const month=document.getElementById('pay-summary-month').value||thisMonth();
  const parts=month.split('-'),yr=parts[0],mo=parts[1];
  const results=staff.map(s=>calcStaffPaySummary(s.name,month)).filter(Boolean);
  if(!results.length){showToast('⚠ 該月份無出班紀錄');return;}

  const tot={tWage:0,tSB:0,tPB:0,tAllow:0,titleAllowance:0,liDeduct:0,nhiDeduct:0,selfRetireAmt:0,suppWagePremium:0,suppBonusPremium:0,payA_gross:0,payA_deduct:0,payA_net:0,payB_gross:0,payB_deduct:0,payB_net:0,netTotal:0};
  results.forEach(r=>{Object.keys(tot).forEach(k=>{if(typeof r[k]==='number')tot[k]+=r[k];});});

  const PER_PAGE=15;
  const pages=[];
  for(let i=0;i<results.length;i+=PER_PAGE)pages.push(results.slice(i,i+PER_PAGE));

  const TH='padding:5px 7px;border-bottom:2px solid #ccc;font-size:13px;white-space:nowrap;';
  const colHeaders='<tr style="background:#e8e8e8;">'+
    '<th style="text-align:left;'+TH+'">姓名</th>'+
    '<th style="text-align:left;'+TH+'">編號</th>'+
    '<th style="text-align:left;'+TH+'">門市</th>'+
    '<th style="text-align:right;'+TH+'background:#ddeaff">底薪</th>'+
    '<th style="text-align:right;'+TH+'background:#ddeaff">加項</th>'+
    '<th style="text-align:right;'+TH+'background:#ddeaff">職稱加給</th>'+
    '<th style="text-align:right;'+TH+'background:#ddeaff">勞保</th>'+
    '<th style="text-align:right;'+TH+'background:#ddeaff">健保</th>'+
    '<th style="text-align:right;'+TH+'background:#ddeaff">退休金</th>'+
    '<th style="text-align:right;'+TH+'background:#ddeaff">兼職補充</th>'+
    '<th style="text-align:right;'+TH+'background:#b8d4f8;font-weight:700;">A實付</th>'+
    '<th style="text-align:right;'+TH+'background:#d5f0e2">業績獎金</th>'+
    '<th style="text-align:right;'+TH+'background:#d5f0e2">專案獎金</th>'+
    '<th style="text-align:right;'+TH+'background:#d5f0e2">補充保費</th>'+
    '<th style="text-align:right;'+TH+'background:#a8e0c0;font-weight:700;">B實付</th>'+
    '<th style="text-align:right;'+TH+'background:#ffe97a;font-weight:700;">合計</th>'+
  '</tr>';

  const TD='padding:5px 7px;border-bottom:1px solid #e0e0e0;font-size:13px;white-space:nowrap;';
  function printRow(r,isTotal){
    const bg=isTotal?'background:#f0f0f0;font-weight:700;border-top:2px solid #aaa;':'';
    const n=isTotal?'合計':escapeHtml(r.name)+(r.jobTitle?' ('+escapeHtml(r.jobTitle)+')':'');
    return '<tr style="'+bg+'">'+
      '<td style="'+TD+'">'+n+'</td>'+
      '<td style="'+TD+'color:#666;">'+(isTotal?'':escapeHtml(r.id))+'</td>'+
      '<td style="'+TD+'color:#666;">'+(isTotal?'':escapeHtml(r.store))+'</td>'+
      '<td style="'+TD+'text-align:right;background:#eef3ff">$'+fmt(r.tWage)+'</td>'+
      '<td style="'+TD+'text-align:right;background:#eef3ff">'+(r.tAllow>0?'+$'+fmt(r.tAllow):'—')+'</td>'+
      '<td style="'+TD+'text-align:right;background:#eef3ff">'+(r.titleAllowance>0?'+$'+fmt(r.titleAllowance):'—')+'</td>'+
      '<td style="'+TD+'text-align:right;color:#c0392b;background:#eef3ff">'+(r.liDeduct>0?'-$'+fmt(r.liDeduct):'—')+'</td>'+
      '<td style="'+TD+'text-align:right;color:#c0392b;background:#eef3ff">'+(r.nhiDeduct>0?'-$'+fmt(r.nhiDeduct):'—')+'</td>'+
      '<td style="'+TD+'text-align:right;color:#c0392b;background:#eef3ff">'+(r.selfRetireAmt>0?'-$'+fmt(r.selfRetireAmt):'—')+'</td>'+
      '<td style="'+TD+'text-align:right;color:#c0392b;background:#eef3ff">'+(r.suppWagePremium>0?'-$'+fmt(r.suppWagePremium):'—')+'</td>'+
      '<td style="'+TD+'text-align:right;font-weight:700;font-size:14px;color:#1145a0;background:#d5e8ff">$'+fmt(r.payA_net)+'</td>'+
      '<td style="'+TD+'text-align:right;color:#1a7a45;background:#edfaf4">$'+fmt(r.tSB)+'</td>'+
      '<td style="'+TD+'text-align:right;color:#6a3aaa;background:#edfaf4">$'+fmt(r.tPB)+'</td>'+
      '<td style="'+TD+'text-align:right;color:#c0392b;background:#edfaf4">'+(r.suppBonusPremium>0?'-$'+fmt(r.suppBonusPremium):'—')+'</td>'+
      '<td style="'+TD+'text-align:right;font-weight:700;font-size:14px;color:#1a7a45;background:#c3edda">$'+fmt(r.payB_net)+'</td>'+
      '<td style="'+TD+'text-align:right;font-weight:700;font-size:14px;color:#8a6000;background:#fff0a0">$'+fmt(r.netTotal)+'</td>'+
    '</tr>';
  }

  let bodyHTML='';
  pages.forEach((pg,pi)=>{
    bodyHTML+='<div style="page-break-after:'+(pi<pages.length-1?'always':'auto')+';">'+
      '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;">'+
        '<div>'+
          '<div style="font-size:22px;font-weight:700;letter-spacing:3px;">全員薪資總表</div>'+
          '<div style="font-size:13px;color:#666;margin-top:3px;">THE food co. 同興 ／ '+yr+' 年 '+mo+' 月 ／ 會計對帳用</div>'+
        '</div>'+
        '<div style="font-size:13px;color:#888;">第 '+(pi+1)+' 頁 / 共 '+pages.length+' 頁</div>'+
      '</div>'+
      '<div style="display:flex;gap:10px;margin-bottom:8px;">'+
        '<span style="font-size:13px;background:#ddeaff;padding:4px 12px;border-radius:4px;border-left:3px solid #1565c0;color:#1145a0;">📅 發放日 A（底薪日）：底薪 + 加項 + 職稱加給 − 勞健保 − 退休金</span>'+
        '<span style="font-size:13px;background:#d5f0e2;padding:4px 12px;border-radius:4px;border-left:3px solid #1a7a45;color:#1a7a45;">🎯 發放日 B（獎金日）：業績獎金 + 專案獎金 − 補充保費</span>'+
      '</div>'+
      '<table style="width:100%;border-collapse:collapse;">'+
        '<thead>'+colHeaders+'</thead>'+
        '<tbody>'+pg.map(r=>printRow(r,false)).join('')+
        (pi===pages.length-1?printRow(tot,true):'')+'</tbody>'+
      '</table>'+
      (pi===pages.length-1?
        '<div style="margin-top:16px;display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start;">'+
          '<div style="font-size:14px;background:#ddeaff;padding:10px 18px;border-radius:6px;border-left:4px solid #1565c0;"><b>發放日 A 總計：$'+fmt(tot.payA_net)+'</b></div>'+
          '<div style="font-size:14px;background:#d5f0e2;padding:10px 18px;border-radius:6px;border-left:4px solid #1a7a45;"><b>發放日 B 總計：$'+fmt(tot.payB_net)+'</b></div>'+
          '<div style="font-size:14px;background:#fff0a0;padding:10px 18px;border-radius:6px;border-left:4px solid #b8860b;"><b>本月總支出：$'+fmt(tot.netTotal)+'</b></div>'+
          '<div style="margin-top:14px;display:grid;grid-template-columns:1fr 1fr;gap:60px;width:100%;padding-top:16px;">'+
            '<div style="border-top:1.5px solid #999;padding-top:10px;font-size:13px;color:#555;">會計確認</div>'+
            '<div style="border-top:1.5px solid #999;padding-top:10px;font-size:13px;color:#555;">主管核准</div>'+
          '</div>'+
        '</div>'
      :'')+
    '</div>';
  });

  const w=window.open('','_blank','width=1400,height=900');
  w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>全員薪資總表 '+yr+'年'+mo+'月</title><style>*{box-sizing:border-box;}body{font-family:"PingFang TC","Noto Sans TC","Microsoft JhengHei",sans-serif;padding:20px;color:#111;font-size:13px;}table{font-variant-numeric:tabular-nums;}@media print{@page{size:A3 landscape;margin:10mm;}body{padding:0;}}</style></head><body>'+bodyHTML+'</body></html>');
  w.document.close();setTimeout(()=>w.print(),700);
}
