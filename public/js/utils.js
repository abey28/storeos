/* ── 工具函式 ── */
function fmt(n){return Number(n).toLocaleString('zh-TW');}
function isoToday(){const d=new Date(),z=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate());}
function thisMonth(){const d=new Date(),z=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+z(d.getMonth()+1);}
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600);}
function fmtLogTime(ts){
  const d=new Date(ts);
  const z=n=>String(n).padStart(2,'0');
  return d.getFullYear()+'/'+z(d.getMonth()+1)+'/'+z(d.getDate())+' '+z(d.getHours())+':'+z(d.getMinutes())+':'+z(d.getSeconds());
}
function dlCSV(rows,fn){const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,﻿'+encodeURIComponent(rows.map(r=>r.join(',')).join('\n'));a.download=fn+'.csv';a.click();}
function escapeHtml(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
// 支援新格式 {id,name} 與舊格式字串兩種 r.staff entry
function rsName(e){ return typeof e==='string'?e:(e&&e.name?e.name:(e&&e.id?e.id:'未知')); }
function rsId(e){   return typeof e==='string'?null:(e&&e.id?e.id:null); }
