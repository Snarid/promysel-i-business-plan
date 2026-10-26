(function(){
const M=window.MODEL, R=M.rows, Y=R.map(r=>r.y);
const fmt=(v,d=0)=>v.toLocaleString('ru-RU',{minimumFractionDigits:d,maximumFractionDigits:d});
const $=id=>document.getElementById(id);

/* ---------- model recompute (sensitivity) ---------- */
function calc(revK,capK,rate){
  let dcum=0,cfs=[];
  const am=R.map((_,i)=>{let s=0;for(let j=Math.max(0,i-4);j<=i;j++)s+=R[j].capex*capK/5;return s;});
  R.forEach((r,i)=>{
    const rev=r.rev*revK, varc=r.var*revK, opex=varc+r.fot+r.other+r.mkt;
    const ebit=rev-opex-am[i], tax=Math.max(0,ebit)*0.25, cf=ebit-tax+am[i]-r.capex*capK;
    cfs.push(cf); dcum+=cf/Math.pow(1+rate,i+1);
  });
  return {npv:dcum,cfs};
}
function irr(c){let lo=-0.9,hi=5;for(let k=0;k<200;k++){const m=(lo+hi)/2;let v=0;c.forEach((x,i)=>v+=x/Math.pow(1+m,i+1));if(v>0)lo=m;else hi=m;}return lo;}

/* ---------- KPIs ---------- */
$('f-npv').textContent=fmt(M.npv); $('f-irr').textContent=fmt(M.irr*100,1)+'%';
$('f-pi').textContent=fmt(M.pi,2); $('f-pp').textContent=fmt(M.pp,1); $('f-dpp').textContent=fmt(M.dpp,1);
$('k-npv').textContent=fmt(M.npv); $('k-irr').textContent=fmt(M.irr*100,1)+'%'; $('k-dpp').textContent=fmt(M.dpp,1); $('k-inv').textContent=fmt(M.inv);

/* ---------- table ---------- */
const rows=[['Выручка','rev'],['Операционные затраты','opex'],['EBITDA','ebitda'],['Чистая прибыль','np'],['Инвестиции (CAPEX)','capex'],['Чистый денежный поток','cf'],['Накопленный ДП','cum'],['Дисконтированный ДП','dcf'],['Накопленный ДДП','dcum']];
$('t-fin').querySelector('thead').innerHTML='<tr><th>млн руб.</th>'+Y.map(y=>`<th class="n">${y}</th>`).join('')+'</tr>';
$('t-fin').querySelector('tbody').innerHTML=rows.map(([l,k])=>`<tr><td>${l}</td>`+R.map(r=>`<td class="n">${fmt(r[k])}</td>`).join('')+'</tr>').join('');

/* ---------- sensitivity ---------- */
function sens(){
  const rv=+$('s-rev').value, cp=+$('s-cap').value, rr=+$('s-r').value;
  $('o-rev').textContent=(rv>0?'+':'')+rv+'%'; $('o-cap').textContent=(cp>0?'+':'')+cp+'%'; $('o-r').textContent=rr+'%';
  const res=calc(1+rv/100,1+cp/100,rr/100);
  $('o-npv').textContent=fmt(res.npv); $('o-npv').style.color=res.npv<0?'var(--alarm)':'var(--accent)';
}
['s-rev','s-cap','s-r'].forEach(id=>$(id).addEventListener('input',sens)); sens();

/* ---------- HMI demo ---------- */
let apc=false, t=0; const hist=[];
const log=$('log');
function addLog(msg,warn){const d=document.createElement('div');if(warn)d.className='w';const ts=new Date().toLocaleTimeString('ru-RU');d.textContent=ts+'  '+msg;log.prepend(d);while(log.children.length>8)log.lastChild.remove();}
function setMode(on){apc=on;$('b-apc').setAttribute('aria-pressed',on);$('b-man').setAttribute('aria-pressed',!on);
  $('apc-badge').setAttribute('opacity',on?1:0);
  addLog(on?'СУУТП включена: управление уставками дросселя и подачи MeOH':'Переход в ручной режим',!on);}
$('b-apc').addEventListener('click',()=>{if(!apc)setMode(true)}); $('b-man').addEventListener('click',()=>{if(apc)setMode(false)});
addLog('Демо-режим: условные значения');
let meoh=412, temp=-24.6;
function step(){
  t+=1;
  const dist=Math.sin(t/7)*1.6+Math.sin(t/2.3)*0.6+(Math.random()-.5)*0.6;
  const target=-25;
  if(apc){ temp+= (target+dist*0.35-temp)*0.35; meoh+= (356+Math.abs(dist)*6-meoh)*0.15; }
  else { temp+= (target+dist-temp)*0.35; meoh+= (412+(Math.random()-.5)*6-meoh)*0.3; }
  const dev=Math.abs(temp-target);
  $('v-t2').textContent='T '+fmt(temp,1)+' °C'; $('v-meoh').textContent='MeOH '+fmt(meoh)+' кг/ч';
  $('v-p1').textContent='P '+fmt(10.8+dist*0.03,1)+' МПа'; $('v-dew').textContent='ТТРв '+fmt(temp+4.2,1)+' °C';
  $('t-meoh').textContent=fmt(meoh); $('t-dev').textContent='±'+fmt(dev,1);
  $('t-hyd').textContent=fmt(apc?3.1+Math.random()*0.3:6.2+Math.random()*0.4,1);
  const dm=(meoh-412)/412*100; $('d-meoh').textContent=apc?fmt(dm,1)+'%':''; $('d-meoh').className='d '+(dm<0?'good':'');
  if(!apc && dev>2.1 && Math.random()<.3) addLog('Отклонение T НТС '+fmt(dev,1)+' °C от уставки',true);
  hist.push({t:temp,a:apc}); if(hist.length>60)hist.shift();
  if(window.trendChart){trendChart.data.labels=hist.map((_,i)=>i);trendChart.data.datasets[0].data=hist.map(h=>h.t);trendChart.data.datasets[1].data=hist.map(()=>target);trendChart.update('none');}
  $('clock').textContent=new Date().toLocaleTimeString('ru-RU');
}
for(let i=0;i<40;i++)step();
const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
setInterval(step, reduce?3000:1000);

/* ---------- charts ---------- */
function charts(){
  if(!window.Chart){setTimeout(charts,100);return;}
  Chart.defaults.font.family="'Onest',sans-serif"; Chart.defaults.color='#56636F';
  const BLUE='#0B5CAD',INK='#16212B',LB='#9CC3EA',AMB='#B8730F',GR='#8A96A3';
  const base={responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{boxWidth:12,font:{size:11}}}},scales:{x:{grid:{display:false}},y:{grid:{color:'#ECE8E0'}}}};
  new Chart($('c-market'),{type:'bar',data:{labels:[2020,2021,2022,2023,2024,2025],datasets:[{label:'млрд руб.',data:[66.6,71.5,65.7,94.0,140.8,184.5],backgroundColor:[LB,LB,LB,LB,LB,BLUE]}]},options:{...base,plugins:{legend:{display:false}}}});
  new Chart($('c-sam'),{type:'bar',data:{labels:['Модерн. УКПГ Газпрома','Новые УКПГ Газпрома','Нефтяные УПН/УПСВ','Независимые, ГПЗ, СПГ','Сервис (7 лет)'],datasets:[{label:'млрд руб.',data:[10.7,6.3,12.0,3.1,3.0],backgroundColor:[BLUE,BLUE,INK,AMB,LB]}]},options:{...base,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{grid:{color:'#ECE8E0'}},y:{grid:{display:false},ticks:{font:{size:11}}}}}});
  const k=[['rev_mod','Модули',BLUE],['rev_pak','ПАК РСУ/ПАЗ',INK],['rev_sla','Сервис',LB],['rev_ktk','КТК',AMB],['rev_aud','Аудит',GR]];
  new Chart($('c-rev'),{type:'bar',data:{labels:Y,datasets:k.map(([key,l,c])=>({label:l,data:R.map(r=>Math.round(r[key])),backgroundColor:c}))},options:{...base,scales:{x:{stacked:true,grid:{display:false}},y:{stacked:true,grid:{color:'#ECE8E0'}}}}});
  new Chart($('c-cf'),{data:{labels:Y,datasets:[{type:'bar',label:'Чистый ДП',data:R.map(r=>Math.round(r.cf)),backgroundColor:R.map(r=>r.cf<0?AMB:BLUE),order:2},{type:'line',label:'Накопленный ДП',data:R.map(r=>Math.round(r.cum)),borderColor:INK,backgroundColor:INK,order:1},{type:'line',label:'Накопленный ДДП',data:R.map(r=>Math.round(r.dcum)),borderColor:GR,backgroundColor:GR,borderDash:[5,4],order:1}]},options:base});
  window.trendChart=new Chart($('trend'),{type:'line',data:{labels:[],datasets:[{label:'T НТС, °C',data:[],borderColor:'#7DB4EA',borderWidth:1.6,pointRadius:0,tension:.3},{label:'Уставка',data:[],borderColor:'#E0A040',borderDash:[4,4],borderWidth:1,pointRadius:0}]},options:{animation:false,responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#8FA6BA',boxWidth:10,font:{size:10}}}},scales:{x:{display:false},y:{min:-29,max:-21,grid:{color:'#1E3040'},ticks:{color:'#8FA6BA',font:{size:10}}}}}});
}
charts();
})();
