/* ── 薪資計算 ── */

/* 勞保查詢：ceiling lookup（找第一個 salary ≥ 輸入值的級距）*/
function getLIEntry(salary,year){
  const tbl=(insuranceBrackets[year]||DEFAULT_INSURANCE_BRACKETS['2026']).li;
  return tbl.find(b=>b.salary>=salary)||tbl[tbl.length-1];
}
/* 健保查詢：ceiling lookup，自動下限 NHI_MIN */
function getNHIEntry(salary,year){
  const eff=Math.max(salary,NHI_MIN);
  const tbl=(insuranceBrackets[year]||DEFAULT_INSURANCE_BRACKETS['2026']).nhi;
  return tbl.find(b=>b.salary>=eff)||tbl[tbl.length-1];
}

/* ── 實習生感知業績獎金分配 ──
 * 邏輯：獎金池先扣實習生例外金額，剩餘由正職依工時比例分配。
 * staffArr 傳入當前 staff 陣列以判斷 isIntern。
 */
function distributeBonusForRecord(r,staffArr){
  const pool=r.totalBonus||0;
  const overrides=r.bonusOverride||{};
  // 計算實習生例外金額總和（只計入實際被標記為實習生者）
  let internTotal=0;
  (r.staff||[]).forEach(entry=>{ const name=rsName(entry); const id=rsId(entry);
    const s=staffArr.find(x=>(id&&x.id===id)||x.name===name);
    if(s&&s.isIntern&&overrides[name]>0)internTotal+=Number(overrides[name])||0;
  });
  const remaining=Math.max(0,pool-internTotal);
  // 正職員工工時總和
  const regularHours=(r.staff||[]).reduce((sum,entry)=>{
    const name=rsName(entry); const id=rsId(entry);
    const s=staffArr.find(x=>(id&&x.id===id)||x.name===name);
    if(s&&s.isIntern)return sum;
    return sum+((r.wageData&&r.wageData[name])?r.wageData[name].hours||0:0);
  },0);
  const regularCount=(r.staff||[]).filter(entry=>{ const name=rsName(entry); const id=rsId(entry); const s=staffArr.find(x=>(id&&x.id===id)||x.name===name);return!(s&&s.isIntern);}).length;
  const result={};
  (r.staff||[]).forEach(entry=>{ const name=rsName(entry); const id=rsId(entry);
    const s=staffArr.find(x=>(id&&x.id===id)||x.name===name);
    if(s&&s.isIntern){
      result[name]=Number(overrides[name])||0;
    } else {
      const myH=(r.wageData&&r.wageData[name])?r.wageData[name].hours||0:0;
      const ratio=regularHours>0?myH/regularHours:(regularCount>0?1/regularCount:0);
      result[name]=Math.round(remaining*ratio);
    }
  });
  return result;
}

/* ── 全員薪資總表計算（會計對帳用）── */
function calcStaffPaySummary(sname, month){
  const _se=staff.find(s=>s.name===sname)||{};
  const se={name:sname,id:'',store:'',liInsured:false,liAmt:0,nhiInsured:false,nhiAmt:0,nhiDep:0,nhiReduce:0,selfRetire:false,selfRetireRate:0,titleAllowance:0,..._se};
  const mr=records.filter(r=>r.date.startsWith(month)&&r.staff.some(e=>rsName(e)===sname));
  if(!mr.length)return null;

  let tWage=0,tSB=0,tPB=0,tAllow=0;
  mr.forEach(r=>{
    const hc=r.staff.length||1;
    const wd=r.wageData&&r.wageData[sname]?r.wageData[sname]:{hours:0,wage:0};
    const dd=r.deductData&&r.deductData[sname]?r.deductData[sname]:{amt:0};
    const ad=r.allowanceData&&r.allowanceData[sname]?r.allowanceData[sname]:{amt:0};
    const rawSB=distributeBonusForRecord(r,staff)[sname]||0;
    const netSB=Math.max(0,rawSB-(dd.amt||0));
    const staffPB=(r.projPerStaff&&r.projPerStaff[sname])?r.projPerStaff[sname].reduce((s,e)=>s+e.amt*e.count,0):Math.round((r.totalProjBonus||0)/hc);
    tWage+=wd.wage||0;
    tSB+=netSB;
    tPB+=staffPB;
    tAllow+=ad.amt||0;
  });

  const titleAllowance=Number(se.titleAllowance||0);
  const grossBonus=tSB+tPB;
  const liInsured=se.liInsured||false;
  const nhiInsured=se.nhiInsured||false;
  const liInsuredAmt=Number(se.liAmt||0);
  const nhiInsuredAmt=Number(se.nhiAmt||0);
  const nhiDep=Number(se.nhiDep||0);
  const nhiReduce=Number(se.nhiReduce||0);
  const SUPP_BASE=29500;
  let liDeduct=0,nhiDeduct=0,suppBonusPremium=0,selfRetireAmt=0,suppWagePremium=0;

  const calcYr=month.split('-')[0];
  if(liInsured&&liInsuredAmt>0){
    liDeduct=getLIEntry(liInsuredAmt,calcYr).emp;
  }
  if(nhiInsured&&nhiInsuredAmt>0){
    const nhiEffAmt=Math.max(nhiInsuredAmt,NHI_MIN);
    const nhiEntry=getNHIEntry(nhiEffAmt,calcYr);
    const reduceMulti=Math.max(0,1-(nhiReduce/100));
    nhiDeduct=Math.round(nhiEntry.emp*(1+nhiDep)*reduceMulti);
    const bonusCap=nhiEffAmt*4;
    if(grossBonus>bonusCap)suppBonusPremium=Math.round((grossBonus-bonusCap)*0.0211);
  }
  if(!nhiInsured){
    if(tWage>SUPP_BASE)suppWagePremium=Math.round(tWage*0.0211);
    if(grossBonus>SUPP_BASE)suppBonusPremium=Math.round(grossBonus*0.0211);
  }
  if(se.selfRetire&&Number(se.selfRetireRate)>=1&&liInsured&&liInsuredAmt>0){
    selfRetireAmt=Math.round(liInsuredAmt*Number(se.selfRetireRate)/100);
  }

  // 發放日 A（底薪日）
  const payA_gross=tWage+tAllow+titleAllowance;
  const payA_deduct=liDeduct+nhiDeduct+selfRetireAmt+suppWagePremium;
  const payA_net=payA_gross-payA_deduct;

  // 發放日 B（獎金日）
  const payB_gross=grossBonus;
  const payB_deduct=suppBonusPremium;
  const payB_net=payB_gross-payB_deduct;

  return{
    name:sname,id:se.id||'—',store:se.store||'—',jobTitle:se.jobTitle||'',
    tWage,tSB,tPB,tAllow,titleAllowance,grossBonus,
    liDeduct,nhiDeduct,selfRetireAmt,suppWagePremium,suppBonusPremium,
    payA_gross,payA_deduct,payA_net,
    payB_gross,payB_deduct,payB_net,
    netTotal:payA_net+payB_net
  };
}
