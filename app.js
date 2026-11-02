const $=s=>document.querySelector(s);
const fmt=n=>Math.round(n).toLocaleString('en-US');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const norm=s=>s.replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/^ال/,'').replace(/\s+/g,' ').trim();
const now=()=>{const d=new Date();return d.getHours()+':'+String(d.getMinutes()).padStart(2,'0')};
function toast(m){const t=$('#toast');t.textContent=m;t.hidden=false;t.classList.remove('show');void t.offsetWidth;t.classList.add('show');
  clearTimeout(toast.h);toast.h=setTimeout(()=>{t.classList.remove('show');setTimeout(()=>{if(!t.classList.contains('show'))t.hidden=true},350)},2300)}
const it=(n,g,c)=>c!=null?{n,g,c}:{n,g};

/* ---- state: filled by sync.js from Supabase; 'a' is always me, 'b' my partner ---- */
let S=null;
const save=()=>{if(window.queueSync)queueSync()};
const g=(id,m,f)=>S.p[id].sex==='f'?f:m;
const me=()=>'a',them=()=>'b';
function pushFeed(o){pushFeed(o);if(o.who==='a'&&window.outEvent)outEvent(o.t)}
/* ---- logic ---- */
function itemK(x){const f=food(x.n);if(!f||!f.k&&f.k!==0)return{k:0,p:0};return{k:f.k*x.g/100,p:f.p*x.g/100}}
function tot(id,meal){const L=S.p[id].log;return(meal?[meal]:MEALT).reduce((t,m)=>{(L[m]||[]).forEach(x=>{const v=itemK(x);t.k+=v.k;t.p+=v.p});return t},{k:0,p:0})}
const eaten=id=>tot(id).k;
const total=()=>WORK[DOW].ex.length;
function dayScore(id){const p=S.p[id],e=eaten(id),st=Math.min(1,p.steps/p.stepGoal),wo=p.done.length/total();
  const eat=e<=p.target?Math.min(1,e/p.target):Math.max(0,1-(e-p.target)/p.target);return(st+wo+eat)/3}
function status(id){const p=S.p[id];const over=eaten(id)-p.target;
  if(S.pen&&S.pen.who===id&&!S.pen.done&&over>0)return['over','+'+fmt(over)+' سعرة'];
  if(dayScore(id)>.9)return['good',g(id,'يومه ممتاز','يومها ممتاز')];
  if(p.steps<p.stepGoal)return['','باقي '+fmt(p.stepGoal-p.steps)+' خطوة'];
  return['good','ماشي صح']}
function penOptions(kcal,w){const per=m=>m*3.5*w/200;
  return[[Math.ceil(kcal/per(4.3)),'دقيقة مشي سريع'],[Math.ceil(kcal/per(8.8)),'دقيقة صعود درج'],[Math.ceil(kcal/per(8)),'دقيقة جامبنغ جاك']]}
// unit words: 1 = singular, 2 = dual, 0 = plural (needs a number)
const UNITW={'حبه':1,'حبات':0,'حبتين':2,'شريحه':1,'شرائح':0,'شريحتين':2,'رغيف':1,'ارغفه':0,'رغيفين':2,'قطعه':1,'قطع':0,'قطعتين':2,'ملعقه':1,'ملاعق':0,'ملعقتين':2,'كوب':1,'اكواب':0,'كوبين':2,'سكوب':1,'سكوبين':2,'علبه':1,'علب':0,'علبتين':2,'فنجال':1,'فناجيل':0,'فنجالين':2,'سيخ':1,'اسياخ':0,'سيخين':2,'ساندويتش':1,'ساندويتشين':2};
const FRAC={'نص':.5,'نصف':.5,'ربع':.25};
const GRAMW=['جرام','جم','غرام','غ','g','gm','gram','جرامات','غرامات'];
function parse(text){const out=[];text.split(/[،,\n+]|\s+و\s*(?=[^\d\s])/).map(s=>s.trim()).filter(Boolean).forEach(raw=>{
  const c=raw.replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/(\d)([^\d\s.])/g,'$1 $2').replace(/([^\d\s.])(\d)/g,'$1 $2');
  let num=null,mode=null,unitN=null,frac=null;const name=[];
  norm(c).split(' ').forEach(t=>{if(/^\d+(\.\d+)?$/.test(t))num=+t;else if(GRAMW.includes(t))mode='g';else if(t in UNITW)unitN=UNITW[t];else if(t in FRAC)frac=FRAC[t];else if(t&&t!=='و')name.push(t)});
  const nm=name.join(' ');if(!nm)return;
  if(mode==='g'&&num===null)mode=null;
  if(mode!=='g'){if(unitN!==null){mode='u';num=(num===null?unitN||1:num)*(frac??1)}else if(frac!==null&&num===null){mode='f';num=frac}}
  // longest name found inside what was typed wins; only if none, the shortest name that contains it
  let best=null,len=0,part=null,plen=1e9;FOODS.forEach(f=>[f.n,...f.a].forEach(a=>{const n=norm(a);
    if(nm.includes(n)){if(n.length>len){best=f;len=n.length}}else if(nm.length>=3&&n.includes(nm)&&n.length<plen){part=f;plen=n.length}}));
  best=best||part;
  out.push({raw,num,mode,id:best?best.n:null})});return out}
function amount(f,e){const n=e.num;
  if(e.mode==='g')return{g:n};
  if(e.mode==='f'&&f.u==='ربع')return{g:n*4*f.ug,c:n*4};
  if(e.mode==='u'||e.mode==='f')return f.ug?{g:n*f.ug,c:n}:{g:n*100};
  if(n===null)return f.ug?{g:f.ug,c:1}:{g:100};
  return f.ug&&n<=12?{g:n*f.ug,c:n}:{g:n}}
const cnt=c=>c===.5?'نص':c===.25?'ربع':String(+c.toFixed(2));
const qty=(f,x)=>x.c!=null&&f.u?`${cnt(x.c)} ${f.u} · ${fmt(x.g)} جم`:`${fmt(x.g)} جم`;
const qtyItem=x=>qty(food(x.n),x);
// called after my food changes: open or clear a penalty for me
function checkOver(id,before){const p=S.p[id],e=eaten(id),o=them();
  if(e>p.target&&before<=p.target&&!(S.pen&&!S.pen.done)){S.pen={id:crypto.randomUUID(),who:id,kcal:Math.round(e-p.target),choice:null,done:false};pushFeed({who:id,t:g(id,'تجاوز','تجاوزت')+' هدف الأكل بـ '+fmt(e-p.target)+' سعرة',at:now()})}
  else if(S.pen&&S.pen.who===id&&!S.pen.choice&&!S.pen.done){if(e<=p.target)S.pen=null;else S.pen.kcal=Math.round(e-p.target)}}

/* ---- pieces ---- */
const I={
 today:'<path d="M12 21s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 8a4.3 4.3 0 0 1 7.5 2.8C19.5 16.4 12 21 12 21z" fill="currentColor"/>',
 food:'<path d="M7 3v7a2 2 0 0 0 2 2v9M11 3v7a2 2 0 0 1-2 2M17 21V3c-2.2 1.4-3 4-3 8h3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
 gym:'<path d="M6.5 6.5v11M3.5 9v6M17.5 6.5v11M20.5 9v6M6.5 12h11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
 walk:'<circle cx="13" cy="4.5" r="2" fill="currentColor"/><path d="M10 21l2-6 3 3v3M9 12l2-4 4 2 2 3M11 8l-1 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
 flame:'<path d="M12 22c4 0 6.5-2.6 6.5-6.2 0-3.7-3-6-4-9.8-2.4 1.6-3.5 3.8-3.5 6-1-.6-1.8-1.7-2-3C7.3 10.6 5.5 13 5.5 15.8 5.5 19.4 8 22 12 22z" fill="currentColor"/>',
 heart:'<path d="M12 20s-7-4.3-7-9.6A4 4 0 0 1 12 8a4 4 0 0 1 7 2.4C19 15.7 12 20 12 20z" fill="currentColor"/>',
 bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7z" fill="currentColor"/>',
 leaf:'<path d="M5 19C5 10 10 5 20 4c0 10-5 15-14 15M5 19l7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
 scan:'<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M8 8v8M11 8v8M14 8v8M17 8v8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
 check:'<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>'
};
const sv=k=>`<svg viewBox="0 0 24 24" aria-hidden="true">${I[k]}</svg>`;
const ic=(k,bg)=>`<span class="ico" style="background:${bg}">${sv(k)}</span>`;
function ava(id,size){const p=S.p[id];return `<span class="ava" style="--pc:${COLORS[p.color]};width:${size}px;height:${size}px;font-size:${Math.round(size*.4)}px">${p.photo?`<img src="${p.photo}" alt="">`:esc(p.name.slice(0,1))}</span>`}
function ringSvg(v,col,r,w,box){const C=2*Math.PI*r,c=box/2;return `<svg viewBox="0 0 ${box} ${box}"><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${col}" stroke-opacity=".18" stroke-width="${w}"/><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" class="arc" style="--C:${C}" stroke-dasharray="${C*Math.min(1,v)} ${C}"/></svg>`}
const ringAva=id=>`<span class="rw">${ringSvg(dayScore(id),COLORS[S.p[id].color],50,9,112)}${ava(id,88)}</span>`;
const nav=(title,sub)=>`<div class="mininav" aria-hidden="true">${title}</div><header class="nav pad"><div class="t"><small>${sub}</small><h1>${title}</h1></div><button class="me" data-act="profile" aria-label="ملفي">${ava(me(),38)}</button></header>`;
const dateStr=()=>{const d=new Date();return `${DAYS[d.getDay()]}، ${d.getDate()} ${MON[d.getMonth()]}`};

/* ---- page: today ---- */
function todayPage(){
  const A=me(),B=them(),pa=S.p[A],pb=S.p[B];
  const person=id=>{const[c,t]=status(id);return `<button class="person" data-act="${id===A?'profile':'cheer'}" aria-label="${id===A?'ملفي':'شجّع '+esc(S.p[id].name)}">${ringAva(id)}<b>${esc(S.p[id].name)}</b><span class="st ${c}">${t}</span></button>`};
  const w=S.week,sa=w.mine,sb=w.theirs;
  let action='';const P=S.pen;
  if(P&&!P.done){
    if(P.who===B&&!P.choice){const o=penOptions(P.kcal,pb.w);
      action=`<div class="group action"><div class="h">${ic('flame','var(--red)')}<p><strong>${esc(pb.name)} ${g(B,'تجاوز','تجاوزت')} بـ ${fmt(P.kcal)} سعرة</strong>أنت اللي تختار العقاب. اختر واحد:</p></div>
       <div class="choices">${o.map(([m,l],i)=>`<button class="choice" data-act="choose" data-i="${i}"><b class="num">${m}</b><span>${l}</span></button>`).join('')}</div></div>`}
    else if(P.who===B)action=`<div class="group action"><div class="h">${ic('flame','var(--orange)')}<p><strong>أرسلت العقاب</strong>${esc(pb.name)} ${g(B,'عليه','عليها')} ${P.choice}. بنعلمك إذا ${g(B,'خلّص','خلّصت')}.</p></div></div>`;
    else if(!P.choice)action=`<div class="group action"><div class="h">${ic('flame','var(--orange)')}<p><strong>تجاوزت بـ ${fmt(P.kcal)} سعرة</strong>${esc(pb.name)} الحين ${g(B,'يختار','تختار')} عقابك… 😬</p></div></div>`;
    else action=`<div class="group action"><div class="h">${ic('flame','var(--red)')}<p><strong>عليك: ${P.choice}</strong>${g(B,'اختاره','اختارته')} لك ${esc(pb.name)}. خلّصه اليوم وتاخذ +10 نقاط.</p></div><button class="btn" data-act="pendone">خلّصته ✓</button></div>`;
  }
  const row=(icon,bg,label,fa,fb)=>`<div class="cell"><span class="lab">${ic(icon,bg)}${label}</span>${fa}${fb}</div>`;
  const v=(id,val,frac,sub,over)=>`<span class="v" style="--pc:${COLORS[S.p[id].color]}"><b class="num ${over?'over':''}">${val}</b><span class="mini"><i style="width:${Math.max(0,Math.min(100,frac*100))}%;${over?'background:var(--red)':''}"></i></span>${sub?`<small class="num">${sub}</small>`:''}</span>`;
  const eat=id=>{const p=S.p[id],e=eaten(id),o=e>p.target;return v(id,fmt(e),e/p.target,o?'+'+fmt(e-p.target):'من '+fmt(p.target),o)};
  const wo=id=>v(id,S.p[id].done.length+'/'+total(),S.p[id].done.length/total(),WORK[DOW].t);
  return nav('اليوم',dateStr())+`<main class="pad">
   <section class="group hero" style="--ca:${COLORS[pa.color]};--cb:${COLORS[pb.color]}">
    <div class="duo">${person(A)}<div class="score"><span class="n num"><span data-count="${pb.points}">${pb.points}</span><i>:</i><span data-count="${pa.points}">${pa.points}</span></span><small>نقاط الأسبوع</small></div>${person(B)}</div>
    <div class="together"><div class="r"><b>هدف الأسبوع مع بعض: ${fmt(w.goal/1000)} ألف خطوة</b><span class="num">باقي ${fmt((w.goal-w.steps)/1000)} ألف</span></div>
     <div class="tbar"><i style="width:${sa/w.goal*100}%;background:${COLORS[pa.color]}"></i><i style="width:${sb/w.goal*100}%;background:${COLORS[pb.color]}"></i></div></div>
   </section>
   ${S.solo?inviteCard():''}${action}
   <div class="btns"><button class="btn" data-act="log">سجّل أكلك</button><button class="btn tint" data-act="cheer">شجّع ${esc(pb.name)}</button></div>
   <section class="sec"><div class="cmp-head"><span></span><span>${esc(pa.name)}</span><span>${esc(pb.name)}</span></div>
    <div class="group">
     ${row('walk','var(--green)','الخطوات',v(A,fmt(pa.steps),pa.steps/pa.stepGoal,pa.healthAt?'':'لا بيانات'),v(B,fmt(pb.steps),pb.steps/pb.stepGoal,pb.healthAt?'':'لا بيانات'))}
     ${row('flame','var(--orange)','الأكل',eat(A),eat(B))}
     ${row('bolt','#5856D6','التمرين',wo(A),wo(B))}
     ${row('heart','var(--red)','نبض الراحة',v(A,pa.rest??'—',pa.rest?1-(pa.rest-50)/40:0),v(B,pb.rest??'—',pb.rest?1-(pb.rest-50)/40:0))}
    </div><p class="hint">${pa.healthAt?'الخطوات والنبض من Apple Health · آخر تحديث '+pa.healthAt:'الخطوات والنبض من Apple Health. <button class="inline-link" data-act="health">اربطه الحين</button>'}</p></section>
   <section class="sec"><h2>وش صار اليوم</h2>
    <div class="group feed">${S.feed.length?'':'<div class="item"><p style="color:var(--label2)">أول ما تسجلون أكل أو تمرين يطلع هنا.</p></div>'}${S.feed.slice().reverse().slice(0,8).map(f=>`<div class="item">${ava(f.who,34)}<p><b>${esc(S.p[f.who].name)}</b> ${esc(f.t)}</p><time class="num">${f.at}</time></div>`).join('')}</div></section>
  </main>`;
}

/* ---- page: food ---- */
function foodPage(){
  const A=me(),B=them(),view=S.foodView;
  const seg=`<div class="seg wide" role="group" aria-label="العرض">${[['me',S.p[A].name],['them',S.p[B].name],['ideas','اقتراحات']].map(([k,l])=>`<button data-act="foodview" data-v="${k}" aria-pressed="${view===k}">${esc(l)}</button>`).join('')}</div>`;
  let body='';
  if(view==='ideas')body=ideas(A);
  else{const id=view==='me'?A:B,own=id===A,p=S.p[id],T=tot(id),left=p.target-T.k,over=left<0,pg=Math.max(0,p.protein-T.p);
    let tip='';
    if(over){const P=S.pen&&S.pen.who===id&&!S.pen.done?S.pen:null;const msg=own?(P&&P.choice?`عقابك: ${P.choice}. تلقاه في صفحة التمرين.`:P?`${esc(S.p[B].name)} ${g(B,'بيختار','بتختار')} عقابك الحين.`:'تجاوزت اليوم، خلّ العشا خفيف.'):(P&&!P.choice?`${g(id,'تجاوز','تجاوزت')} اليوم. اختر ${g(id,'عقابه','عقابها')} من صفحة «اليوم».`:P?`${g(id,'عليه','عليها')}: ${P.choice}.`:`${g(id,'تجاوز','تجاوزت')} اليوم.`);tip=`<div class="tipbox over">${ic('flame','var(--red)')}<span>${msg}</span></div>`}
    else if(pg>15)tip=`<div class="tipbox">${ic('leaf','var(--green)')}<span>${own?'ينقصك':g(id,'ينقصه','ينقصها')} <b class="num">${Math.round(pg)}</b> جم بروتين. تقريباً <b class="num">${Math.round(pg/.31/10)*10}</b> جم صدور دجاج تكمّلها.</span></div>`;
    body=`<section class="group sum">
      <div><div class="big num ${over?'over':''}" data-count="${Math.round(Math.abs(left))}" data-pre="${over?'+':''}">${over?'+'+fmt(-left):fmt(left)}</div><div class="sub">${over?'سعرة فوق الهدف':'سعرة باقية ل'+(own?'ك':g(id,'ه','ها'))+' اليوم'}</div></div>
      <div class="lbar ${over?'over':''}"><i style="width:${Math.min(100,T.k/p.target*100)}%"></i></div>
      <div class="macros"><div><b class="num">${fmt(T.k)}</b><span>أكل</span></div><div><b class="num">${fmt(p.target)}</b><span>الهدف</span></div><div><b class="num">${Math.round(T.p)}/${p.protein}</b><span>بروتين جم</span></div></div>
     </section>${tip}
     ${MEALT.map(m=>{const L=p.log[m]||[],mt=tot(id,m);if(!own&&!L.length)return'';return `<section class="sec"><div class="cap"><span>${m}</span><span class="num">${L.length?fmt(mt.k)+' سعرة':''}</span></div><div class="group">
       ${L.map((x,i)=>{const v=itemK(x);return own?`<button class="row plain" data-act="delitem" data-m="${m}" data-i="${i}"><span class="tx"><b>${esc(food(x.n).n)}</b><span class="num">${qtyItem(x)} · ${Math.round(v.p)} بروتين</span></span><span class="end num">${fmt(v.k)}</span></button>`:`<div class="row plain"><span class="tx"><b>${esc(food(x.n).n)}</b><span class="num">${qtyItem(x)}</span></span><span class="end num">${fmt(v.k)}</span></div>`}).join('')}
       ${own?`<button class="row add" data-act="log" data-m="${m}">+ أضف ${m==='سناك'?'سناك':m}</button>`:''}</div></section>`}).join('')}`;
  }
  return nav('الأكل',dateStr())+`<main class="pad">${seg}${body}</main>`;
}
function ideas(A){const left=S.p[A].target-eaten(A),f=S.mealF;
  return `<div class="seg wide" role="group" aria-label="نوع الوجبة">${['الكل',...MEALT].map(x=>`<button data-act="mealf" data-f="${x}" aria-pressed="${x===f}">${x}</button>`).join('')}</div>
  <section class="sec"><div class="cap"><span>${left>0?'باقي لك '+fmt(left)+' سعرة':'خلّصت سعراتك اليوم، الأفضل شي خفيف'}</span></div><div class="group">
  ${MEALS.map((m,i)=>[m,i]).filter(([m])=>f==='الكل'||m.t===f).map(([m,i])=>{const T=m.items.reduce((t,[n,gr])=>{const v=itemK({n,g:gr});t.k+=v.k;t.p+=v.p;return t},{k:0,p:0});
   return `<button class="row plain" data-act="meal" data-i="${i}"><span class="tx"><b>${m.n} ${T.k<=left?'<span class="badge">تناسبك</span>':''}</b><span class="num">${m.t} · ${fmt(T.k)} سعرة · ${Math.round(T.p)} بروتين · ${m.min} د</span></span><span class="chev">‹</span></button>`}).join('')}
  </div></section>`}

/* ---- page: workout ---- */
function gymPage(){
  const A=me(),B=them(),sel=S.wday,W=WORK[sel],isToday=sel===DOW,pa=S.p[A],pb=S.p[B];
  const mine=isToday?pa.done:[],theirs=isToday?pb.done:[];
  const P=S.pen,myPen=isToday&&P&&P.who===A&&P.choice?P:null;
  const tot2=W.ex.length+(myPen?1:0),cnt=mine.length+(myPen&&myPen.done?1:0);
  const date=k=>{const d=new Date();d.setDate(d.getDate()+(k-DOW));return d.getDate()};
  return nav('التمرين',isToday?'تمرين اليوم':DAYS[sel])+`<main class="pad">
   <div class="strip">${DAYL.map((l,i)=>`<button class="dayc ${i===DOW?'today':''}" data-act="wday" data-d="${i}" aria-pressed="${i===sel}" aria-label="${DAYS[i]}">${l}<b class="num">${date(i)}</b></button>`).join('')}</div>
   <section class="group wcard"><div class="tx"><h2>${W.t}</h2><span>${W.min} دقيقة · ${W.ex.length} تمارين</span>
     ${isToday?`<span class="partner-did">${ava(B,18)} ${esc(pb.name)} ${g(B,'خلّص','خلّصت')} ${theirs.length} من ${W.ex.length}</span>`:''}</div>
    <span class="pring">${ringSvg(isToday?cnt/tot2:0,'var(--green)',30,8,74)}<b class="num">${isToday?cnt+'/'+tot2:'–'}</b></span></section>
   ${myPen?`<section class="sec"><div class="cap"><span>العقاب من ${esc(pb.name)}</span><span>+10 نقاط</span></div><div class="group">
     <div class="row exrow ${myPen.done?'done':''}"><button class="chk" data-act="pendone" aria-pressed="${!!myPen.done}" aria-label="خلّصت العقاب">${sv('check')}</button><span class="tx"><b>${myPen.choice}</b><span>عشان ${fmt(myPen.kcal)} سعرة زيادة</span></span></div></div></section>`:''}
   <section class="sec"><div class="cap"><span>التمارين</span><span>${isToday?'اضغط الدائرة إذا خلّصت':'تقدر تشوفها، والتسجيل يوم التمرين'}</span></div><div class="group">
    ${W.ex.map((e,i)=>{const d=mine.includes(i);return `<div class="row exrow ${d?'done':''}">
      <button class="chk" data-act="exdone" data-i="${i}" aria-pressed="${d}" ${isToday?'':'disabled'} aria-label="خلّصت ${e.n}">${sv('check')}</button>
      <button class="open" data-act="howto" data-i="${i}"><span class="tx"><b>${e.n}</b><span class="num">${e.s}</span></span>${theirs.includes(i)?`<span class="partner-did">${ava(B,20)}</span>`:''}<span class="chev">‹</span></button></div>`}).join('')}
   </div><p class="hint">اضغط على أي تمرين وتشوف طريقته.</p></section>
   ${isToday&&cnt===tot2?`<div class="tipbox">${ic('check','var(--green)')}<span><b>خلّصت تمرين اليوم 💪</b> وصل لـ ${esc(pb.name)} إشعار.</span></div>`:''}
  </main>`;
}

/* ---- render ---- */
let lastKey=null,lastTab=null,after=null;
const calm=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function render(){
  const A=me();document.documentElement.style.setProperty('--accent',COLORS[S.p[A].color]);
  const segs=snapSegs();
  // a new view (tab, person, sub-view, day) plays the entry motion; a tap inside the same view does not
  const key=[S.tab,S.foodView,S.mealF,S.wday].join('|'),enter=key!==lastKey,tabbed=lastTab!==null&&S.tab!==lastTab;lastKey=key;lastTab=S.tab;
  const page={today:todayPage,food:foodPage,gym:gymPage}[S.tab]();
  const T=[['today','اليوم'],['food','الأكل'],['gym','التمرين']];
  $('#app').innerHTML=page+`<nav class="tabs${tabbed?' bump':''}">${T.map(([k,l])=>`<button data-act="tab" data-t="${k}" ${S.tab===k?'aria-current="page"':''}>${sv(k)}${l}</button>`).join('')}</nav>`;
  if(enter){$('#app main').classList.add('enter');countUp($('#app'))}
  document.querySelectorAll('.seg').forEach(sg=>placeInd(sg,segs[sg.getAttribute('aria-label')]));
  onScroll();
}
function countUp(root){if(calm())return;root.querySelectorAll('[data-count]').forEach(el=>{const to=+el.dataset.count,pre=el.dataset.pre||'',t0=performance.now();
  (function f(t){const k=Math.min(1,(t-t0)/900),e=1-Math.pow(1-k,3);el.textContent=pre+fmt(to*e);if(k<1)requestAnimationFrame(f)})(t0)})}
// segmented controls: one sliding pill; after a re-render it glides from where it was
function snapSegs(){const m={};document.querySelectorAll('.seg .ind').forEach(i=>{m[i.parentNode.getAttribute('aria-label')]={x:i._x,w:i._w}});return m}
function placeInd(sg,from){if(!sg)return;const b=sg.querySelector('[aria-pressed="true"]');let ind=sg.querySelector('.ind');
  if(!ind){ind=document.createElement('span');ind.className='ind';sg.prepend(ind);sg.classList.add('has-ind')}
  if(!b){ind.style.opacity=0;return}ind.style.opacity='';const x=b.offsetLeft,w=b.offsetWidth;
  if(from&&from.w){ind.style.transition='none';ind.style.transform='translateX('+from.x+'px)';ind.style.width=from.w+'px';void ind.offsetWidth;ind.style.transition=''}
  ind.style.transform='translateX('+x+'px)';ind.style.width=w+'px';ind._x=x;ind._w=w}
// large title collapses into a small blurred bar once it scrolls away
function onScroll(){const m=$('#app .mininav');if(m)m.classList.toggle('show',window.scrollY>$('#app').offsetTop+48)}
function confetti(){if(calm())return;const c=document.createElement('canvas'),dpr=window.devicePixelRatio||1;c.className='confetti';document.body.appendChild(c);
  const W=c.width=innerWidth*dpr,H=c.height=innerHeight*dpr,x=c.getContext('2d'),cols=[COLORS[S.p.a.color],COLORS[S.p.b.color],'#34C759','#FF9500','#FFD60A'];
  const P=Array.from({length:120},()=>({x:W/2+(Math.random()-.5)*W*.25,y:H*.42,vx:(Math.random()-.5)*W*.02,vy:-(Math.random()*H*.02+H*.007),r:(Math.random()*6+5)*dpr,a:Math.random()*6,va:(Math.random()-.5)*.35,c:cols[Math.random()*cols.length|0]}));
  const t0=performance.now();(function f(t){const k=(t-t0)/1700;x.clearRect(0,0,W,H);
   P.forEach(p=>{p.vy+=H*.0009;p.vx*=.985;p.x+=p.vx;p.y+=p.vy;p.a+=p.va;x.save();x.globalAlpha=Math.max(0,1-k*k);x.translate(p.x,p.y);x.rotate(p.a);x.fillStyle=p.c;x.fillRect(-p.r/2,-p.r/4,p.r,p.r/2);x.restore()});
   k<1?requestAnimationFrame(f):c.remove()})(t0)}

/* ---- sheets ---- */
// iOS sheet: slides up on a spring, the page behind shrinks back; a sheet opened from a sheet swaps content in place
function sheet(html){const L=$('#layer'),cur=L.querySelector('.scrim:not(.closing)');
  if(cur){const sh=cur.querySelector('.sheet');sh.innerHTML=html;sh.classList.remove('swap');void sh.offsetWidth;sh.classList.add('swap');sh.scrollTop=0;sh.querySelectorAll('.seg').forEach(sg=>placeInd(sg));return}
  L.querySelectorAll('.scrim').forEach(x=>x.remove());
  L.insertAdjacentHTML('beforeend',`<div class="scrim" data-act="close"><div class="sheet" role="dialog" aria-modal="true">${html}</div></div>`);
  const sc=L.lastElementChild,ph=$('#app');ph.style.transformOrigin='50% '+(window.scrollY+innerHeight/2-ph.offsetTop)+'px';
  sc.querySelectorAll('.seg').forEach(sg=>placeInd(sg));void sc.offsetWidth;sc.classList.add('open');document.body.classList.add('sheet-open')}
function closeSheet(){stopCam();const sc=$('#layer .scrim:not(.closing)');if(!sc)return;document.body.classList.remove('sheet-open');
  const sh=sc.querySelector('.sheet');sh.classList.remove('dragging');sh.style.transform='';sc.classList.remove('open');sc.classList.add('closing');
  const done=()=>sc.remove();sh.addEventListener('transitionend',done,{once:true});setTimeout(done,600)}
const sheetBar=(title,right='<button class="link" data-act="close">تم</button>',left='<span class="link"></span>')=>`<div class="grab"></div><div class="bar">${left}<h3>${title}</h3>${right}</div>`;
let draft=[];
const EMPTY='<div class="item" style="color:var(--label2)">اكتبها مثل ما تقولها: «توست بر شريحتين»، «دجاج مقلي 150»</div>';
const cats=()=>[...new Set(FOODS.map(f=>f.cat))];
const times=n=>n===1?'مرة':n===2?'مرتين':n<=10?n+' مرات':n+' مرة';
const spinner='<span class="spin" aria-hidden="true"></span>';
// scanned products live in S.products and join the food list under «منتجاتي»
function registerProducts(){Object.values(S.products).forEach(p=>{const f=FD[p.n];
  if(f)Object.assign(f,{k:p.k,p:p.p,u:p.ug?'حبة':undefined,ug:p.ug||undefined});
  else{const nf={n:p.n,k:p.k,p:p.p,cat:'منتجاتي',a:[],u:p.ug?'حبة':undefined,ug:p.ug||undefined,code:p.code};FOODS.unshift(nf);FD[p.n]=nf}})}
function remember(id,items){const h=S.p[id].hist;items.forEach(x=>{const k=x.n+'|'+x.g;h[k]={n:x.n,g:x.g,c:x.c,count:((h[k]&&h[k].count)||0)+1,last:Date.now()}})}
const freq=id=>Object.values(S.p[id].hist).filter(x=>food(x.n)).sort((a,b)=>b.count-a.count||b.last-a.last).slice(0,6);
function addItems(A,items,label){const before=eaten(A),m=S.logMeal||guessMeal();S.p[A].log[m].push(...items);remember(A,items);
  const k=items.reduce((s,x)=>s+itemK(x).k,0);pushFeed({who:A,t:g(A,'سجّل','سجّلت')+' '+(label||m)+' · '+fmt(k)+' سعرة',at:now()});checkOver(A,before);return k}

function logSheet(meal){S.logMeal=meal||guessMeal();draft=[];S.browse=S.browse&&cats().includes(S.browse)?S.browse:cats()[0];const fr=freq(me());
  sheet(sheetBar('وش أكلت؟','<button class="link" data-act="addfood" style="font-weight:600">أضف</button>','<button class="link" data-act="close">إلغاء</button>')+`
  <div class="seg wide" role="group" aria-label="الوجبة" id="mealseg">${MEALT.map(m=>`<button data-act="logmeal" data-m="${m}" aria-pressed="${m===S.logMeal}">${m}</button>`).join('')}</div>
  <div class="scanrow"><button class="btn tint" data-act="livescan">${sv('scan')}امسح الباركود</button><button class="btn tint" data-act="manualcode">اكتب رقمه</button></div>
  <input class="field" id="food" placeholder="توست بر شريحتين، دجاج مقلي 150، رز 100" autocomplete="off">
  <div class="group parsed" id="parsed">${EMPTY}</div>
  ${fr.length?`<section class="sec"><div class="cap"><span>أكلاتك المتكررة</span><span>ضغطة وتنضاف</span></div><div class="group">${fr.map(x=>`<button class="row plain" data-act="addfreq" data-k="${esc(x.n+'|'+x.g)}"><span class="tx"><b>${esc(food(x.n).n)}</b><span class="num">${qtyItem(x)} · أكلتها ${times(x.count)}</span></span><span class="end num">${fmt(itemK(x).k)}</span></button>`).join('')}</div></section>`:''}
  <section class="sec"><div class="cap"><span>أو اختر من الأصناف</span><span class="num">${FOODS.length} صنف</span></div>
   <div class="hscroll" id="cats">${cats().map(c=>`<button class="chip" data-act="browse" data-c="${c}" aria-pressed="${c===S.browse}">${c}</button>`).join('')}</div>
   <div class="group" id="browse">${browseList()}</div></section>`);
  const f=$('#food');
  f.addEventListener('input',()=>{const prev=draft;draft=parse(f.value).map(e=>{const o=prev.find(p=>p.raw===e.raw&&p.ov);return o?{...e,id:o.id,ov:true}:e});drawDraft()});
  $('#parsed').addEventListener('change',e=>{const s=e.target.closest('select');if(!s)return;Object.assign(draft[+s.dataset.i],{id:s.value,ov:true});drawDraft()})}
function drawDraft(){const box=$('#parsed');if(!draft.length){box.innerHTML=EMPTY;return}let t=0;
  box.innerHTML=draft.map((e,i)=>{if(!e.id)return `<div class="item miss"><span>${esc(e.raw)}</span><span>ما عرفته</span></div>`;
   const f=FD[e.id],am=amount(f,e),k=f.k*am.g/100,alts=PICK.includes(f.cat)?FOODS.filter(x=>x.cat===f.cat):null;t+=k;
   return `<div class="item"><span class="dn">${alts?`<select data-i="${i}" aria-label="النوع">${alts.map(x=>`<option ${x===f?'selected':''}>${x.n}</option>`).join('')}</select>`:`<b>${esc(f.n)}</b>`}<small class="num">${qty(f,am)}</small></span><span class="num">${fmt(k)}</span></div>`}).join('')
   +`<div class="item tot"><span>المجموع</span><span class="num">${fmt(t)} سعرة</span></div>`}
function browseList(){return FOODS.filter(f=>f.cat===S.browse).map(f=>`<button class="row plain" data-act="pickfood" data-n="${esc(f.n)}"><span class="tx"><b>${esc(f.n)}</b><span class="num">${f.ug?fmt(f.k*f.ug/100)+' سعرة / '+f.u:fmt(f.k)+' سعرة / 100 جم'}</span></span><span class="end" style="color:var(--accent);font-size:22px">+</span></button>`).join('')}

/* ---- barcode ---- */
let _sample;
async function getSample(){if(_sample===undefined){try{_sample=window.claude?await claude.use('sample'):null}catch(e){_sample=null}}return _sample}
async function canSeeImages(){const s=await getSample();if(!s)return false;const l=await s.limits().catch(()=>null);return !!(l&&l.images)}
function loadImg(file){return new Promise((ok,no)=>{const img=new Image();img.onload=()=>ok(img);img.onerror=no;img.src=URL.createObjectURL(file)})}
function toCanvas(img,maxW,rot){const sc=Math.min(1,maxW/Math.max(img.width,img.height)),w=Math.round(img.width*sc),h=Math.round(img.height*sc);
  const c=document.createElement('canvas');c.width=rot?h:w;c.height=rot?w:h;const x=c.getContext('2d');if(rot){x.translate(h,0);x.rotate(Math.PI/2)}x.drawImage(img,0,0,w,h);return c}
async function decodeBarcode(file){const img=await loadImg(file);
  if('BarcodeDetector' in window){try{const r=await new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e','code_128']}).detect(img);if(r[0])return r[0].rawValue}catch(e){}}
  if(window.ZXing){const Z=window.ZXing,hints=new Map();hints.set(Z.DecodeHintType.TRY_HARDER,true);
    hints.set(Z.DecodeHintType.POSSIBLE_FORMATS,[Z.BarcodeFormat.EAN_13,Z.BarcodeFormat.EAN_8,Z.BarcodeFormat.UPC_A,Z.BarcodeFormat.UPC_E,Z.BarcodeFormat.CODE_128]);
    const reader=new Z.MultiFormatReader();reader.setHints(hints);
    for(const [w,rot] of [[1400,0],[900,0],[1400,1]]){try{const src=new Z.HTMLCanvasElementLuminanceSource(toCanvas(img,w,rot));return reader.decode(new Z.BinaryBitmap(new Z.HybridBinarizer(src))).getText()}catch(e){}}}
  return null}
// if the decoder fails, Claude reads the digits printed under the bars
async function aiCode(file){if(!await canSeeImages())return null;
  try{const r=await (await getSample()).json('The image shows a product barcode. Read the digits printed under the barcode bars. Reply with only JSON like {"code":"6281234567890"}, or {"code":null} if they cannot be read.',{images:[file],modelTier:'quick'});
   return r&&r.code?String(r.code):null}catch(e){return null}}
async function onScan(file){sheet(sheetBar('الباركود','<button class="link" data-act="close">إلغاء</button>')+`<div class="busy">${spinner}نقرأ الباركود…</div>`);
  let code=null;try{code=await decodeBarcode(file)}catch(e){}
  if(!code)code=await aiCode(file);
  code?openCode(code):codeSheet('ما قدرت أقرأه','صوّره مرة ثانية قريب وواضح وفي إضاءة زينة، أو اكتب الأرقام اللي تحته.')}
function openCode(code){code=String(code).replace(/\D/g,'');if(code.length<6)return codeSheet('الرقم ناقص','أرقام الباركود عادة 8 أو 13 رقم. تأكد منها.');
  S.products[code]?amountSheet(code):newProdSheet(code)}
function codeSheet(title,msg){sheet(sheetBar(title)+`<p class="hint" style="padding:0;text-align:center">${msg}</p>
  <label class="btn tint" style="display:flex;justify-content:center;gap:8px;cursor:pointer">${sv('scan')}صوّر الباركود<input type="file" id="scanfile" accept="image/*" hidden></label>
  <div class="group form"><label class="frow"><span>رقم الباركود</span><input id="code-in" inputmode="numeric" dir="ltr" placeholder="6281234567890" style="width:170px"></label></div>
  <button class="btn" data-act="opencode">كمّل</button>`)}
function newProdSheet(code){sheet(sheetBar('منتج جديد')+`<p class="hint" style="padding:0">أول مرة نشوف الباركود <span class="num" dir="ltr">${code}</span>. عبّ بياناته مرة وحدة، والمرة الجاية بس صوّر.</p>
  <div id="aibox"><div class="busy" style="padding:8px 0">${spinner}</div></div>
  <div class="group form">
   <label class="frow"><span>الاسم</span><input id="np-n" placeholder="مثلاً: زبادي يوناني" style="width:60%;text-align:start"></label>
   <label class="frow"><span>سعرات لكل 100 جم</span><input id="np-k" type="number" inputmode="decimal" min="0"></label>
   <label class="frow"><span>بروتين لكل 100 جم</span><input id="np-p" type="number" inputmode="decimal" min="0"></label>
   <label class="frow"><span>وزن العبوة (جم)</span><input id="np-pkg" type="number" inputmode="decimal" min="0"></label>
   <label class="frow"><span>وزن الحبة <small>(إذا فيها حبات)</small></span><input id="np-ug" type="number" inputmode="decimal" min="0"></label>
  </div>
  <button class="btn" data-act="saveprod" data-code="${code}">احفظ المنتج</button>`);
  canSeeImages().then(ok=>{const b=$('#aibox');if(!b)return;b.innerHTML=ok
   ?`<label class="btn tint" style="display:flex;justify-content:center;gap:8px;cursor:pointer">${sv('scan')}صوّر ملصق القيم الغذائية وأنا أعبّيها<input type="file" id="labelfile" accept="image/*" hidden></label>`
   :'<p class="hint" style="padding:0">انقل الأرقام من ملصق القيم الغذائية على العبوة.</p>'})}
async function onLabel(file){const b=$('#aibox');b.innerHTML=`<div class="busy">${spinner}نقرأ الملصق… ياخذ ثواني</div>`;
  try{const r=await (await getSample()).json('The photo shows a food product package, ideally its nutrition facts label (Arabic or English). Extract: the product name if visible (keep Arabic if printed), energy in kcal per 100 g (or per 100 ml), protein in g per 100 g, the net weight of the whole package in g, and the weight of one piece if the product is sold as separate pieces. If only per-serving values are printed, convert them to per 100 g using the serving size. If energy is only in kJ, divide by 4.184. Reply with only JSON: {"name":string|null,"kcal100":number|null,"protein100":number|null,"package_g":number|null,"piece_g":number|null}',{images:[file]});
   const set=(id,v)=>{if(v!=null&&v!==''&&$(id))$(id).value=typeof v==='number'?Math.round(v*10)/10:v};
   set('#np-n',r&&r.name);set('#np-k',r&&r.kcal100);set('#np-p',r&&r.protein100);set('#np-pkg',r&&r.package_g);set('#np-ug',r&&r.piece_g);
   b.innerHTML=r&&r.kcal100!=null?'<div class="tipbox">'+ic('check','var(--green)')+'<span>عبّيتها من الملصق. راجع الأرقام قبل الحفظ.</span></div>':'<p class="hint" style="padding:0">ما لقيت الأرقام في الصورة. صوّر جدول القيم الغذائية نفسه، أو عبّها بيدك.</p>'}
  catch(e){b.innerHTML=e&&e.code==='not_granted'?'<p class="hint" style="padding:0">عبّ الأرقام بيدك من الملصق.</p>':`<p class="hint" style="padding:0">ما قدرت أقرأ الملصق الحين. جرّب مرة ثانية أو عبّها بيدك.</p><label class="btn tint" style="display:flex;justify-content:center;cursor:pointer">صوّر مرة ثانية<input type="file" id="labelfile" accept="image/*" hidden></label>`}}
function amountSheet(code){const pr=S.products[code];S.logMeal=S.logMeal||guessMeal();S.amt={code,g:pr.pkg||pr.ug||100};
  const opts=[];if(pr.pkg)opts.push(['العبوة كاملة',pr.pkg],['نص العبوة',pr.pkg/2],['ربعها',pr.pkg/4]);if(pr.ug)opts.push(['حبة',pr.ug],['حبتين',pr.ug*2],['3 حبات',pr.ug*3]);opts.push(['100 جم',100]);
  sheet(sheetBar('كم أكلت؟','<button class="link" data-act="addprod" style="font-weight:600">أضف</button>','<button class="link" data-act="close">إلغاء</button>')+`
  <div><h2>${esc(pr.n)}</h2><p class="hint num" style="padding:0;margin-top:4px">${fmt(pr.k)} سعرة · ${pr.p||0} جم بروتين لكل 100 جم${pr.pkg?' · العبوة '+fmt(pr.pkg)+' جم':''}</p></div>
  <div class="seg wide" role="group" aria-label="الوجبة" id="mealseg">${MEALT.map(m=>`<button data-act="logmeal" data-m="${m}" aria-pressed="${m===S.logMeal}">${m}</button>`).join('')}</div>
  <div class="chips" id="amtchips">${opts.map(([l,gr])=>`<button class="chip" data-act="amtq" data-g="${gr}">${l}</button>`).join('')}</div>
  <div class="group form"><label class="frow"><span>الكمية بالجرام</span><input id="amt-g" type="number" inputmode="decimal" min="1"></label></div>
  <div class="group sum" style="align-items:center;text-align:center"><div class="big num" id="amt-k"></div><div class="sub" id="amt-p"></div></div>`);updAmt()}
function updAmt(){const pr=S.products[S.amt.code],gr=S.amt.g||0;if(!$('#amt-k'))return;
  if(document.activeElement!==$('#amt-g'))$('#amt-g').value=+gr.toFixed(1);
  $('#amt-k').textContent=fmt(pr.k*gr/100);$('#amt-p').textContent='سعرة · '+Math.round((pr.p||0)*gr/100)+' جم بروتين';
  document.querySelectorAll('#amtchips .chip').forEach(b=>b.setAttribute('aria-pressed',Math.abs(+b.dataset.g-gr)<.01))}
const guessMeal=()=>{const h=new Date().getHours();return h<11?'فطور':h<16?'غداء':h<21?'عشاء':'سناك'};
function cheerSheet(){const b=S.p[them()];sheet(sheetBar('شجّع '+esc(b.name))+`<div class="group cheers">${CHEERS.map((c,i)=>`<button data-act="sendcheer" data-i="${i}">${c}</button>`).join('')}</div>`)}
function mealSheet(i){const m=MEALS[i];const T=m.items.reduce((t,[n,gr])=>{const v=itemK({n,g:gr});t.k+=v.k;t.p+=v.p;return t},{k:0,p:0});
  sheet(sheetBar(m.t)+`<div><h2>${m.n}</h2><p class="hint" style="padding:0;margin-top:4px">${fmt(T.k)} سعرة · ${Math.round(T.p)} جم بروتين · ${m.min} دقيقة</p></div>
  <section class="sec"><div class="cap"><span>المكونات</span></div><div class="group">${m.items.map(([n,gr])=>`<div class="row plain"><span class="tx"><b>${food(n).n}</b></span><span class="end num">${gr} جم</span></div>`).join('')}</div></section>
  <section class="sec"><div class="cap"><span>الطريقة</span></div><div class="group"><ol class="steps">${m.steps.map(s=>`<li>${s}</li>`).join('')}</ol></div></section>
  <button class="btn" data-act="addmeal" data-i="${i}">أضفها لل${m.t}</button>`)}
function howSheet(i){const e=WORK[S.wday].ex[i];
  sheet(sheetBar(WORK[S.wday].t)+`<div><h2>${e.n}</h2><p class="hint num" style="padding:0;margin-top:4px">${e.s}</p></div>
  <section class="sec"><div class="cap"><span>الطريقة</span></div><div class="group"><ol class="steps">${e.how.map(s=>`<li>${s}</li>`).join('')}</ol></div></section>
  <div class="tipbox">${ic('bolt','#5856D6')}<span>${e.tip}</span></div>`)}
function delSheet(m,i){const x=S.p[me()].log[m][i];
  sheet(sheetBar(m)+`<p style="margin:0;text-align:center;font-size:15px;color:var(--label2)">تحذف ${esc(food(x.n).n)} (${qtyItem(x)}) من ${m}؟</p>
  <button class="btn danger" data-act="dodel" data-m="${m}" data-i="${i}">احذف</button>`)}
function profileSheet(){const id=me(),p=S.p[id],taken=S.p[them()].color;sheet(sheetBar('ملفي')+`
  <div style="display:flex;flex-direction:column;align-items:center;gap:10px">${ava(id,96)}
   <label class="link" style="cursor:pointer">${p.photo?'غيّر الصورة':'أضف صورتك'}<input type="file" id="photo" accept="image/*" hidden></label></div>
  <input class="field" id="pname" value="${esc(p.name)}" aria-label="الاسم">
  <div class="seg wide" role="group" aria-label="الجنس">${[['m','ذكر'],['f','أنثى']].map(([k,l])=>`<button data-act="sex" data-s="${k}" aria-pressed="${p.sex===k}">${l}</button>`).join('')}</div>
  <div class="colors">${Object.entries(COLORS).map(([k,c])=>`<button class="dot" style="--pc:${c}" data-act="color" data-c="${k}" aria-pressed="${p.color===k}" ${k===taken?'disabled aria-label="لون شريكك"':'aria-label="لون"'}></button>`).join('')}</div>
  <p class="hint" style="text-align:center">اللون اللي اختاره شريكك ما يصير لك.</p>
  <div class="group">
   <button class="row plain" data-act="weight"><span class="tx"><b>وزني وهدفي</b><span class="num">${p.w} كجم · الهدف ${p.goalW||'—'} · ${fmt(p.target)} سعرة يومياً</span></span><span class="chev">‹</span></button>
   <button class="row plain" data-act="health"><span class="tx"><b>ربط Apple Health</b><span>${p.healthAt?'آخر تحديث اليوم '+p.healthAt:'ما وصل شي اليوم'}</span></span><span class="chev">‹</span></button>
   <button class="row plain" data-act="invite"><span class="tx"><b>رمز الشريك</b><span class="num" dir="ltr">${S.code||''}</span></span><span class="chev">‹</span></button>
  </div>
  <button class="btn danger" data-act="logout">تسجيل خروج</button>`);
  $('#pname').addEventListener('change',e=>{p.name=e.target.value.trim()||p.name;save();render()});
  $('#photo').addEventListener('change',e=>{const file=e.target.files[0];if(!file)return;const rd=new FileReader();rd.onload=()=>{const img=new Image();img.onload=()=>{
    const c=document.createElement('canvas'),s=200,m=Math.min(img.width,img.height);c.width=c.height=s;
    c.getContext('2d').drawImage(img,(img.width-m)/2,(img.height-m)/2,m,m,0,0,s,s);p.photo=c.toDataURL('image/jpeg',.82);save();render();profileSheet()};img.src=rd.result};rd.readAsDataURL(file)})}

/* ---- events ---- */
function woCheck(A){const p=S.p[A],all=p.done.length===total();
  if(all&&!p.woBonus){p.woBonus=true;pushFeed({who:A,t:g(A,'خلّص','خلّصت')+' تمرين '+WORK[DOW].t+' 💪 +20',at:now()});toast('كفو! +20 نقطة');confetti()}
  else if(!all&&p.woBonus){p.woBonus=false}}
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-act]');if(!el)return;
  if(!S||el.closest('.screen'))return;
  if(el.dataset.act==='close'&&e.target!==el&&el.classList.contains('scrim'))return;
  const A=me(),B=them(),d=el.dataset;
  switch(d.act){
   case 'tab':S.tab=d.t;window.scrollTo(0,0);break;
   case 'close':closeSheet();return;
   case 'log':logSheet(d.m);return;
   case 'logmeal':S.logMeal=d.m;document.querySelectorAll('#mealseg button').forEach(b=>b.setAttribute('aria-pressed',b===el));placeInd(el.closest('.seg'));return;
   case 'manualcode':codeSheet('رقم الباركود','اكتب الأرقام اللي تحت الخطوط.');return;
   case 'opencode':openCode(($('#code-in')||{}).value||'');return;
   case 'addfreq':{const x=S.p[A].hist[d.k];if(!x)return;const k=addItems(A,[it(x.n,x.g,x.c)],food(x.n).n);closeSheet();toast('+'+fmt(k)+' سعرة · '+food(x.n).n);break}
   case 'amtq':S.amt.g=+d.g;updAmt();return;
   case 'addprod':{const pr=S.products[S.amt.code],gr=Math.round(S.amt.g);if(!(gr>0)){toast('اكتب الكمية');return}
     const c=pr.ug&&Math.abs(gr/pr.ug-Math.round(gr/pr.ug))<.01?Math.round(gr/pr.ug):undefined;const k=addItems(A,[it(pr.n,gr,c)],pr.n);closeSheet();toast('+'+fmt(k)+' سعرة · '+pr.n);break}
   case 'saveprod':{const v=id=>{const x=$(id);return x?x.value.trim():''};let n=v('#np-n');const k=+v('#np-k');if(!n||v('#np-k')===''||!(k>=0)){toast('اكتب الاسم والسعرات');return}
     if(FD[n]&&FD[n].cat!=='منتجاتي')n+=' (منتج)';S.products[d.code]={code:d.code,n,k,p:+v('#np-p')||0,pkg:+v('#np-pkg')||0,ug:+v('#np-ug')||0};registerProducts();save();amountSheet(d.code);toast('انحفظ المنتج');return}
   case 'browse':S.browse=d.c;document.querySelectorAll('#cats .chip').forEach(b=>b.setAttribute('aria-pressed',b===el));$('#browse').innerHTML=browseList();return;
   case 'pickfood':{const f=FD[d.n],inp=$('#food');inp.value=(inp.value.trim()?inp.value.trim()+'، ':'')+(f.a[0]||f.n)+(f.ug?' 1 '+f.u:' 100 جم');inp.dispatchEvent(new Event('input'));toast('انضاف '+f.n+'، عدّل الكمية فوق');return}
   case 'cheer':if(S.solo){inviteSheet();return}cheerSheet();return;
   case 'profile':profileSheet();return;
   case 'meal':mealSheet(+d.i);return;
   case 'howto':howSheet(+d.i);return;
   case 'delitem':delSheet(d.m,+d.i);return;
   case 'foodview':S.foodView=d.v;break;
   case 'mealf':S.mealF=d.f;break;
   case 'wday':S.wday=+d.d;break;
   case 'sex':S.p[A].sex=d.s;save();render();profileSheet();return;
   case 'color':S.p[A].color=d.c;save();render();profileSheet();return;
   case 'livescan':scanSheet();return;
   case 'health':healthSheet();return;
   case 'invite':inviteSheet();return;
   case 'weight':weightSheet();return;
   case 'saveweight':saveWeight();return;
   case 'copy':copyText(d.v);return;
   case 'logout':logout();return;
   case 'refresh':refresh(true);return;
   case 'sendcheer':pushFeed({who:A,t:g(A,'شجّع ','شجّعت ')+S.p[B].name+': '+CHEERS[+d.i],at:now()});closeSheet();toast('وصلت لـ '+S.p[B].name);break;
   case 'choose':{const o=penOptions(S.pen.kcal,S.p[B].w)[+d.i];S.pen.choice=o[0]+' '+o[1];pushFeed({who:A,t:g(A,'اختار','اختارت')+' عقاب '+S.p[B].name+': '+S.pen.choice,at:now()});toast('انرسل العقاب 😈');break}
   case 'pendone':S.pen.done=!S.pen.done;if(S.pen.done){pushFeed({who:A,t:g(A,'خلّص','خلّصت')+' العقاب 💪 +10',at:now()});toast('كفو! +10 نقاط');confetti()}break;
   case 'exdone':{const p=S.p[A],i=+d.i,j=p.done.indexOf(i);if(j>-1)p.done.splice(j,1);else{p.done.push(i);after=()=>{const b=$('.chk[data-act="exdone"][data-i="'+i+'"]');if(b)b.classList.add('pop')}}woCheck(A);break}
   case 'dodel':{const before=eaten(A);S.p[A].log[d.m].splice(+d.i,1);checkOver(A,before);closeSheet();toast('انحذف');break}
   case 'addmeal':{const m=MEALS[+d.i];S.logMeal=m.t;addItems(A,m.items.map(([n,gr])=>it(n,gr)),m.n);closeSheet();toast('انضافت لل'+m.t);break}
   case 'addfood':{const r=draft.filter(x=>x.id).map(e=>{const f=FD[e.id],am=amount(f,e);return{f,am,k:f.k*am.g/100}});if(!r.length){toast('اكتب الأكل والكمية');return}
     const k=addItems(A,r.map(x=>it(x.f.n,Math.round(x.am.g),x.am.c)));closeSheet();toast('+'+fmt(k)+' سعرة');break}
  }
  save();render();if(after){after();after=null}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet()});
document.addEventListener('change',e=>{const t=e.target,f=t.files&&t.files[0];if(!f)return;if(t.id==='scanfile')onScan(f);if(t.id==='labelfile')onLabel(f);t.value=''});
document.addEventListener('input',e=>{if(e.target.id==='amt-g'){S.amt.g=+e.target.value;updAmt()}});
window.addEventListener('scroll',onScroll,{passive:true});
// drag a sheet down by its handle or title bar to close it
let drag=null;
document.addEventListener('pointerdown',e=>{const sh=e.target.closest('.scrim.open .sheet');if(!sh||!e.target.closest('.grab,.bar')||e.target.closest('button,input,select,label'))return;
  drag={sh,y0:e.clientY,t0:performance.now(),dy:0};sh.classList.add('dragging')});
document.addEventListener('pointermove',e=>{if(!drag)return;const dy=e.clientY-drag.y0;drag.dy=dy>0?dy:dy/6;drag.sh.style.transform='translateY('+drag.dy+'px)'});
const endDrag=()=>{if(!drag)return;const{sh,dy,t0}=drag,v=dy/(performance.now()-t0);drag=null;sh.classList.remove('dragging');
  if(dy>120||(v>.6&&dy>30))closeSheet();else sh.style.transform=''};
document.addEventListener('pointerup',endDrag);document.addEventListener('pointercancel',endDrag);