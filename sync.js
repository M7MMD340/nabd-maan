/* نبض معاً — الحساب، الربط بين الشريكين، والحفظ في Supabase.
   app.js يرسم الصفحات من S؛ هذا الملف يعبّي S من قاعدة البيانات ويرجع أي تعديل لها. */
const SB_URL='https://ztcfzoqszbecrhpkdsue.supabase.co';
const SB_KEY='sb_publishable_VuKr15G9-HEn_Qmruyvchw_-xiFnIqc';
const sb=supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});

const pad2=n=>String(n).padStart(2,'0');
const dkey=d=>d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
const TODAY=dkey(new Date());
const WEEK0=(()=>{const d=new Date();d.setDate(d.getDate()-d.getDay());return dkey(d)})();
const startToday=()=>{const d=new Date();d.setHours(0,0,0,0);return d.toISOString()};
const hm=t=>{const d=new Date(t);return d.getHours()+':'+pad2(d.getMinutes())};
const PCOLS='id,couple_id,name,sex,color,photo,age,height,weight,start_weight,goal_weight,weeks,activity,target,protein,step_goal,hist,weights';
const emptyLog=()=>({'فطور':[],'غداء':[],'عشاء':[],'سناك':[]});
const ACT=[[1.2,'قليل الحركة'],[1.375,'خفيف (1–3 أيام)'],[1.55,'متوسط (3–5 أيام)'],[1.725,'عالي (6–7 أيام)']];

let uid=null,cid=null,pid=null,rows={},pens=[],synced={},channel=null;

/* ---------- daily plan (same formula as the prototype) ---------- */
function plan(o){const bmr=10*o.w+6.25*o.h-5*o.age+(o.sex==='m'?5:-161),tdee=bmr*o.act;
  const weeks=Math.max(2,o.weeks||12),kgLeft=o.w-o.goal;let daily=kgLeft*7700/(weeks*7);daily=Math.max(-500,Math.min(1000,daily));
  const target=Math.round(Math.max(o.sex==='m'?1500:1200,tdee-daily)/10)*10,protein=Math.round(1.8*Math.min(o.w,o.goal+5));
  return{target,protein,tooFast:Math.abs(kgLeft/weeks)>o.w*.01}}

/* ---------- screens before the app (login, profile, partner) ---------- */
function screen(html){S=null;document.body.classList.remove('sheet-open');$('#layer').innerHTML='';$('#app').innerHTML=`<div class="screen">${html}</div>`;
  document.querySelectorAll('#app .seg').forEach(sg=>placeInd(sg))}
const err=m=>{const e=$('#err');if(e)e.textContent=m||''};
const busy=(b,on)=>{if(b){b.disabled=on;b.style.opacity=on?.6:1}};

function authScreen(mode){mode=mode||'in';screen(`
  <div class="logo">${sv('today')}</div>
  <h1>نبض معاً</h1>
  <p class="lead">لياقة لشخصين: أكلكم وتمارينكم وخطواتكم، وتشجيع بينكم كل يوم.</p>
  <div class="seg wide" role="group" aria-label="الدخول">
   <button data-sact="authmode" data-m="in" aria-pressed="${mode==='in'}">دخول</button>
   <button data-sact="authmode" data-m="up" aria-pressed="${mode==='up'}">حساب جديد</button></div>
  <form id="authf" data-mode="${mode}" class="stack" style="gap:12px">
   <div class="group form">
    <label class="frow"><span>الإيميل</span><input class="wide" id="au-email" type="email" autocomplete="email" required dir="ltr"></label>
    <label class="frow"><span>كلمة السر</span><input class="wide" id="au-pass" type="password" minlength="6" required dir="ltr" autocomplete="${mode==='in'?'current-password':'new-password'}"></label>
   </div>
   <p class="err" id="err"></p>
   <button class="btn" type="submit">${mode==='in'?'دخول':'سوّ الحساب'}</button>
  </form>
  ${mode==='up'?'<p class="hint center" style="padding:0">كلمة السر 6 أحرف أو أكثر.</p>':''}`)}

function onboardScreen(p){const c=p.color||'blue';screen(`
  <h1>عرّفنا عليك</h1>
  <p class="lead">نحسب منها احتياجك اليومي من السعرات والبروتين. تقدر تعدّلها بعدين من ملفك.</p>
  <form id="obf" class="stack" style="gap:14px">
   <div class="group form">
    <label class="frow"><span>اسمك</span><input class="wide" id="ob-name" required value="${esc(p.name||'')}" placeholder="مثلاً: محمد"></label>
   </div>
   <div class="seg wide" role="group" aria-label="الجنس" id="ob-sex">
    <button type="button" data-sact="obsex" data-s="m" aria-pressed="${p.sex!=='f'}">ذكر</button>
    <button type="button" data-sact="obsex" data-s="f" aria-pressed="${p.sex==='f'}">أنثى</button></div>
   <div class="group form">
    <label class="frow"><span>العمر</span><input id="ob-age" type="number" inputmode="numeric" min="14" max="90" required value="${p.age||''}"></label>
    <label class="frow"><span>الطول (سم)</span><input id="ob-h" type="number" inputmode="numeric" min="120" max="230" required value="${p.height||''}"></label>
    <label class="frow"><span>وزنك الحين (كجم)</span><input id="ob-w" type="number" inputmode="decimal" step="0.1" min="35" max="250" required value="${p.weight||''}"></label>
    <label class="frow"><span>الوزن اللي تبيه</span><input id="ob-goal" type="number" inputmode="decimal" step="0.1" min="35" max="250" required value="${p.goal_weight||''}"></label>
    <label class="frow"><span>خلال كم أسبوع</span><input id="ob-weeks" type="number" inputmode="numeric" min="2" max="104" required value="${p.weeks||16}"></label>
    <label class="frow"><span>نشاطك</span><select id="ob-act">${ACT.map(([v,t])=>`<option value="${v}" ${+p.activity===v?'selected':''}>${t}</option>`).join('')}</select></label>
   </div>
   <div class="stack" style="gap:8px"><span class="hint" style="padding:0">اختر لونك</span>
    <div class="colors" id="ob-colors">${Object.entries(COLORS).map(([k,v])=>`<button type="button" class="dot" style="--pc:${v}" data-sact="obcolor" data-c="${k}" aria-pressed="${k===c}" aria-label="لون"></button>`).join('')}</div></div>
   <p class="err" id="err"></p>
   <button class="btn" type="submit">احفظ وكمّل</button>
  </form>`)}

function pairScreen(){screen(`
  <div class="logo">${sv('heart')}</div>
  <h1>اربط شريكك</h1>
  <p class="lead">واحد منكم يسوي رمز ويرسله، والثاني يدخله. بعدها كل واحد يشوف صفحة الثاني، والعقاب والتشجيع يوصلون.</p>
  <button class="btn" data-sact="mkcode">أنا أول واحد، سوّ لي رمز</button>
  <div class="group form"><label class="frow"><span>عندي رمز من شريكي</span><input id="joincode" dir="ltr" maxlength="6" autocapitalize="characters" autocomplete="off" placeholder="A1B2C3"></label></div>
  <button class="btn tint" data-sact="join">اربطني</button>
  <p class="err" id="err"></p>
  <button class="inline-link center" data-sact="logout">تسجيل خروج</button>`)}

function problemScreen(msg){screen(`
  <h1>فيه مشكلة</h1><p class="lead">${msg}</p>
  <button class="btn" data-sact="retry">جرّب مرة ثانية</button>
  <button class="inline-link center" data-sact="logout">تسجيل خروج</button>`)}

/* ---------- boot ---------- */
async function boot(){
  const {data:{session}}=await sb.auth.getSession();
  if(!session)return authScreen();
  uid=session.user.id;await enterApp();
}
async function enterApp(){
  try{
    let {data:p,error}=await sb.from('profiles').select(PCOLS).eq('id',uid).maybeSingle();
    if(error)throw error;
    if(!p){const ins=await sb.from('profiles').insert({id:uid});if(ins.error)throw ins.error;
      ({data:p,error}=await sb.from('profiles').select(PCOLS).eq('id',uid).single());if(error)throw error}
    if(!p.name||!p.weight)return onboardScreen(p);
    if(!p.couple_id)return pairScreen();
    cid=p.couple_id;await loadAll();subscribe();
    lastKey=null;render();
  }catch(e){console.error(e);
    const missing=/relation|schema cache|does not exist|PGRST20/i.test((e&&(e.message||e.code))||'');
    problemScreen(missing?'قاعدة البيانات مو جاهزة. شغّل ملف setup.sql في Supabase ← SQL Editor، وبعدين اضغط «جرّب مرة ثانية».':'ما قدرت أوصل للبيانات. تأكد من الإنترنت وجرّب مرة ثانية.')}
}

/* ---------- loading everything for today and this week ---------- */
function person(p,id){const r=(rows[id]||{})[TODAY]||{};const done=r.done||[];
  return{id,name:p.name||'—',sex:p.sex||'m',color:p.color||'blue',photo:p.photo||null,
    w:+p.weight||70,goalW:+p.goal_weight||null,startW:+p.start_weight||null,age:p.age,h:p.height,weeks:p.weeks,act:+p.activity||1.375,
    target:p.target||2000,protein:p.protein||120,stepGoal:p.step_goal||8000,hist:p.hist||{},weights:p.weights||[],
    steps:r.steps||0,active:r.active??null,rest:r.rest_hr??null,avg:r.avg_hr??null,healthAt:r.health_at?hm(r.health_at):null,
    log:Object.assign(emptyLog(),r.log||{}),done,woBonus:done.length>=WORK[DOW].ex.length,points:0}}
function placeholder(mine){return{placeholder:true,name:'شريكك',sex:mine.sex==='f'?'m':'f',color:Object.keys(COLORS).find(k=>k!==mine.color),
  photo:null,w:70,target:2000,protein:120,stepGoal:8000,hist:{},weights:[],log:emptyLog(),done:[],steps:0,rest:null,healthAt:null,points:0}}
const penFromRow=r=>({id:r.id,who:r.who===uid?'a':'b',kcal:r.kcal,choice:r.choice,done:r.done});

async function loadAll(){
  const q=await Promise.all([
    sb.from('profiles').select(PCOLS).eq('id',uid).single(),
    sb.from('profiles').select(PCOLS).eq('couple_id',cid).neq('id',uid).maybeSingle(),
    sb.from('couples').select('code').eq('id',cid).single(),
    sb.from('days').select('*').gte('day',WEEK0),
    sb.from('events').select('*').eq('couple_id',cid).gte('created_at',startToday()).order('created_at'),
    sb.from('penalties').select('*').eq('couple_id',cid).gte('day',WEEK0).order('created_at'),
    sb.from('products').select('*').eq('couple_id',cid)]);
  const bad=q.find(r=>r.error);if(bad)throw bad.error;
  const [mp,pp,cpl,dys,evs,pns,prd]=q.map(r=>r.data);
  pid=pp?pp.id:null;rows={};(dys||[]).forEach(r=>{(rows[r.user_id]=rows[r.user_id]||{})[r.day]=r});pens=pns||[];
  const keep=S?{tab:S.tab,foodView:S.foodView,mealF:S.mealF,wday:S.wday,browse:S.browse,logMeal:S.logMeal,amt:S.amt}:{tab:'today',foodView:'me',mealF:'الكل',wday:DOW};
  S=Object.assign(keep,{code:cpl&&cpl.code,solo:!pid,p:{a:person(mp,uid),b:pid?person(pp,pid):placeholder(mp)},products:{},week:{goal:100000,mine:0,theirs:0,steps:0},pen:null,
    feed:(evs||[]).map(e=>({who:e.user_id===uid?'a':'b',t:e.text,at:hm(e.created_at)}))});
  (prd||[]).forEach(r=>{S.products[r.code]=r.data});registerProducts();
  const today=pens.filter(x=>x.day===TODAY);const open=today.filter(x=>!x.done).slice(-1)[0]||today.slice(-1)[0];
  S.pen=open?penFromRow(open):null;
  synced=snap();
}

/* ---------- points and the shared weekly goal, from this week's data ---------- */
function logK(log){return MEALT.reduce((s,m)=>(log[m]||[]).reduce((t,x)=>t+itemK(x).k,s),0)}
function weekFor(key){const p=S.p[key];if(p.placeholder)return{pts:0,steps:0};const id=p.id,days=rows[id]||{};let pts=0,steps=0;
  for(let d=new Date(WEEK0+'T12:00');dkey(d)<=TODAY;d.setDate(d.getDate()+1)){const k=dkey(d),dow=d.getDay();
    const r=k===TODAY?{steps:p.steps,done:p.done,log:p.log}:days[k];if(!r)continue;steps+=r.steps||0;
    if((r.steps||0)>=p.stepGoal)pts+=10;
    if((r.done||[]).length>=WORK[dow].ex.length)pts+=20;
    const kc=logK(r.log||{});if(kc>0&&kc<=p.target)pts+=15;
    const penDone=k===TODAY?(S.pen&&S.pen.who===key&&S.pen.done):pens.some(x=>x.who===id&&x.day===k&&x.done);if(penDone)pts+=10}
  return{pts,steps}}
function recalc(){if(!S)return;const a=weekFor('a'),b=weekFor('b');S.p.a.points=a.pts;S.p.b.points=b.pts;
  S.week={goal:100000,mine:a.steps,theirs:b.steps,steps:a.steps+b.steps}}
const _render=render;render=function(){if(!S)return;recalc();_render()};

/* ---------- saving: every change goes to Supabase shortly after ---------- */
let flushT=null,flushing=false,dirty=false;const evQueue=[];
window.outEvent=t=>evQueue.push(t);
window.queueSync=()=>{dirty=true;clearTimeout(flushT);flushT=setTimeout(flush,450)};
function snap(){const a=S.p.a;return{profile:JSON.stringify([a.name,a.sex,a.color,a.photo,a.hist]),day:JSON.stringify([a.log,a.done]),pen:JSON.stringify(S.pen),products:JSON.stringify(S.products)}}
async function flush(){
  if(!S)return;if(flushing){flushT=setTimeout(flush,300);return}
  flushing=true;const s=snap(),a=S.p.a,jobs=[],evs=evQueue.splice(0);
  try{
    if(s.profile!==synced.profile)jobs.push(sb.from('profiles').update({name:a.name,sex:a.sex,color:a.color,photo:a.photo,hist:a.hist}).eq('id',uid));
    if(s.day!==synced.day)jobs.push(sb.from('days').upsert({user_id:uid,day:TODAY,log:a.log,done:a.done,updated_at:new Date().toISOString()}));
    if(s.pen!==synced.pen)jobs.push(syncPen(synced.pen?JSON.parse(synced.pen):null));
    if(s.products!==synced.products){const old=JSON.parse(synced.products||'{}');
      Object.entries(S.products).forEach(([code,d])=>{if(JSON.stringify(old[code])!==JSON.stringify(d))jobs.push(sb.from('products').upsert({couple_id:cid,code,data:d}))})}
    evs.forEach(t=>jobs.push(sb.from('events').insert({couple_id:cid,user_id:uid,text:t})));
    const res=await Promise.all(jobs);const bad=res.find(r=>r&&r.error);if(bad)throw bad.error;
    synced=s;dirty=evQueue.length>0;setOffline(false);if(dirty)queueSync();
  }catch(e){console.error(e);evQueue.unshift(...evs);setOffline(true);flushT=setTimeout(flush,6000)}
  finally{flushing=false}
}
async function syncPen(prev){const P=S.pen;
  if(!P){if(prev&&prev.id&&prev.who==='a'&&!prev.choice){pens=pens.filter(x=>x.id!==prev.id);return sb.from('penalties').delete().eq('id',prev.id)}return null}
  if(!P.id)P.id=crypto.randomUUID();
  const who=P.who==='a'?uid:pid;if(!who)return null;
  const row={id:P.id,couple_id:cid,who,day:TODAY,kcal:P.kcal,choice:P.choice||null,done:!!P.done};
  const i=pens.findIndex(x=>x.id===P.id);
  if(i>-1){pens[i]=row;return sb.from('penalties').update({kcal:row.kcal,choice:row.choice,done:row.done}).eq('id',row.id)}
  pens.push(row);return sb.from('penalties').insert(row)}
function setOffline(on){let b=$('#offline');if(on&&!b){b=document.createElement('div');b.id='offline';b.className='offline';b.textContent='ما فيه اتصال، بنحفظ أول ما يرجع';document.body.appendChild(b)}
  if(!on&&b)b.remove()}

/* ---------- live updates from the partner ---------- */
function subscribe(){if(channel)sb.removeChannel(channel);
  channel=sb.channel('couple-'+cid)
   .on('postgres_changes',{event:'*',schema:'public',table:'events',filter:'couple_id=eq.'+cid},refreshSoon)
   .on('postgres_changes',{event:'*',schema:'public',table:'penalties',filter:'couple_id=eq.'+cid},refreshSoon)
   .on('postgres_changes',{event:'*',schema:'public',table:'days'},p=>{const r=p.new||p.old;if(r&&(r.user_id===pid||r.user_id===uid))refreshSoon()})
   .subscribe()}
let rT=null;function refreshSoon(){clearTimeout(rT);rT=setTimeout(()=>refresh(false),700)}
async function refresh(manual){if(!S)return;
  if(dirty||flushing){refreshSoon();return}
  try{await loadAll();render();if(manual)toast('تحدّث')}catch(e){console.error(e);setOffline(true)}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='visible'||!S)return;
  if(dkey(new Date())!==TODAY)return location.reload();refresh(false)});
window.addEventListener('online',()=>{if(dirty)queueSync();refresh(false)});

/* ---------- sheets that need the account ---------- */
const copyRow=(label,v)=>`<div class="stack" style="gap:4px"><span class="hint" style="padding:0">${label}</span><div class="copyrow"><span class="mono">${esc(v)}</span><button class="btn sm tint" style="width:auto" data-act="copy" data-v="${esc(v)}">نسخ</button></div></div>`;
function copyText(v){navigator.clipboard.writeText(v).then(()=>toast('انسخ ✓'),()=>toast('اضغط مطوّل على النص وانسخه'))}
function inviteCard(){return `<div class="group invite"><div class="h" style="display:flex;gap:12px;align-items:flex-start">${ic('heart','var(--accent)')}<p style="margin:0;font-size:15px;color:var(--label2)"><strong style="display:block;color:var(--label);font-size:17px">ادعُ شريكك</strong>يحمّل التطبيق من نفس الرابط، ويسوي حساب، ويدخل هذا الرمز.</p></div>
  <div class="codebox">${esc(S.code||'')}</div><button class="btn tint" data-act="copy" data-v="${esc(S.code||'')}">انسخ الرمز</button></div>`}
function inviteSheet(){sheet(sheetBar('رمز الشريك')+`<p class="hint" style="padding:0;text-align:center">${S.solo?'أرسل الرمز لشريكك. يفتح الرابط نفسه، ويسوي حساب، ويدخل الرمز.':'أنتم مرتبطين. هذا رمزكم المشترك.'}</p>
  <div class="codebox">${esc(S.code||'')}</div>${copyRow('رابط التطبيق',location.origin+location.pathname)}<button class="btn tint" data-act="copy" data-v="${esc(S.code||'')}">انسخ الرمز</button>`)}
async function healthSheet(){
  sheet(sheetBar('ربط Apple Health')+`<div class="busy">${spinner}</div>`);
  const {data:tok,error}=await sb.rpc('my_health_token');if(error){toast('ما قدرت أجيب رمزك، جرّب بعدين');closeSheet();return}
  const url=SB_URL+'/rest/v1/rpc/ingest_health';
  sheet(sheetBar('ربط Apple Health')+`
  <p class="hint" style="padding:0">نسوي اختصار في تطبيق «الاختصارات» يقرأ خطواتك ونبضك وسعراتك النشطة ويرسلها هنا. تسويه مرة وحدة، وبعدها يشتغل لحاله.</p>
  <section class="sec"><div class="cap"><span>1. هذي اللي بتحتاجها</span></div><div class="group" style="padding:12px 16px;display:flex;flex-direction:column;gap:12px">
   ${copyRow('الرابط',url)}${copyRow('المفتاح (apikey)',SB_KEY)}${copyRow('رمزك الخاص (p_token)',String(tok))}</div></section>
  <section class="sec"><div class="cap"><span>2. سوّ الاختصار</span></div><div class="group"><ol class="steps">
   <li>افتح «الاختصارات»، اضغط <b>+</b>، وسمّه «نبض معاً».</li>
   <li>أضف إجراء <b>«البحث عن عينات الصحة»</b>: النوع <b>الخطوات</b>، وتاريخ البدء <b>اليوم</b>. بعده أضف <b>«حساب الإحصائيات»</b> واختر <b>المجموع</b>.</li>
   <li>كرّر نفس الشي مع <b>الطاقة النشطة</b> (المجموع)، ومع <b>نبض القلب أثناء الراحة</b> (المتوسط).</li>
   <li>أضف <b>«الحصول على محتويات URL»</b> والصق الرابط. افتح التفاصيل: الطريقة <b>POST</b>، وفي الترويسات أضف <code>apikey</code> وقيمته المفتاح، و<code>Content-Type</code> وقيمته <code>application/json</code>.</li>
   <li>نص الطلب <b>JSON</b> بأربع حقول: <code>p_token</code> (نص) = رمزك، و<code>p_steps</code> و<code>p_active</code> و<code>p_rest</code> (رقم) = نتائج الإحصائيات بالترتيب.</li>
   <li>شغّل الاختصار مرة واسمح له يقرأ بيانات الصحة. لازم يرد عليك بكلمة <b>«تم»</b>.</li>
  </ol></div></section>
  <section class="sec"><div class="cap"><span>3. خلّه يشتغل لحاله</span></div><div class="group"><ol class="steps">
   <li>في «الاختصارات» روح لـ <b>الأتمتة</b> ← <b>+</b> ← <b>وقت اليوم</b>.</li>
   <li>اختر وقت، مثلاً 9:00 الليل، ويومياً، وبعدين <b>تشغيل فوراً</b>، واختر اختصار «نبض معاً».</li>
   <li>سوّ أتمتة ثانية بوقت ثاني، مثلاً 1:00 الظهر، عشان تتحدث خطواتك مرتين.</li>
  </ol></div></section>
  <p class="hint" style="padding:0">الرمز خاص فيك، لا تعطيه أحد. وتقدر تضغط الاختصار بنفسك متى ما تبي تحدّث.</p>
  <button class="btn tint" data-act="refresh">شغّلته، حدّث البيانات</button>`)}
function weightSheet(){const p=S.p.a;sheet(sheetBar('وزني وهدفي','<button class="link" data-act="saveweight" style="font-weight:600">احفظ</button>','<button class="link" data-act="close">إلغاء</button>')+`
  <div class="group form">
   <label class="frow"><span>وزنك اليوم (كجم)</span><input id="ws-w" type="number" inputmode="decimal" step="0.1" value="${p.w}"></label>
   <label class="frow"><span>الوزن اللي تبيه</span><input id="ws-goal" type="number" inputmode="decimal" step="0.1" value="${p.goalW||''}"></label>
   <label class="frow"><span>خلال كم أسبوع من اليوم</span><input id="ws-weeks" type="number" inputmode="numeric" value="${p.weeks||12}"></label>
  </div>
  ${p.weights.length?`<section class="sec"><div class="cap"><span>أوزانك</span></div><div class="group">${p.weights.slice(-6).reverse().map(x=>`<div class="row plain"><span class="tx"><b class="num">${x.kg} كجم</b></span><span class="end num">${x.d}</span></div>`).join('')}</div></section>`:''}
  <p class="hint" style="padding:0">سجّل وزنك مرة بالشهر، ونعيد حساب سعراتك اليومية.</p>`)}
async function saveWeight(){const p=S.p.a,w=+$('#ws-w').value,goal=+$('#ws-goal').value||p.goalW||w,weeks=+$('#ws-weeks').value||12;
  if(!(w>=35&&w<=250)){toast('اكتب وزن صحيح');return}
  const r=plan({w,h:p.h||170,age:p.age||30,sex:p.sex,act:p.act,goal,weeks});
  const weights=p.weights.filter(x=>x.d.slice(0,7)!==TODAY.slice(0,7)).concat([{d:TODAY,kg:w}]);
  const {error}=await sb.from('profiles').update({weight:w,goal_weight:goal,weeks,target:r.target,protein:r.protein,weights}).eq('id',uid);
  if(error){toast('ما انحفظ، جرّب مرة ثانية');return}
  const lost=p.w-w;Object.assign(p,{w,goalW:goal,weeks,target:r.target,protein:r.protein,weights});closeSheet();render();
  toast((lost>0?'نزلت '+lost.toFixed(1)+' كجم 👏 · ':'')+'هدفك اليومي '+fmt(r.target)+' سعرة')}
async function logout(){closeSheet();if(channel)sb.removeChannel(channel);channel=null;await sb.auth.signOut();uid=cid=pid=null;authScreen()}

/* ---------- live barcode scanning with the camera ---------- */
let stream=null,scanTimer=null;
function stopCam(){clearTimeout(scanTimer);if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}}
async function scanSheet(){
  sheet(sheetBar('امسح الباركود','<button class="link" data-act="close">إلغاء</button>')+`
  <div class="scanbox" id="scanbox"><video id="cam" playsinline muted autoplay></video><div class="aim"></div></div>
  <p class="hint" style="padding:0;text-align:center">قرّب الباركود داخل الإطار</p>
  <div class="scanrow"><label class="btn tint">${sv('scan')}من الصور<input type="file" id="scanfile" accept="image/*" hidden></label><button class="btn tint" data-act="manualcode">اكتب رقمه</button></div>`);
  try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});
    const v=$('#cam');if(!v){stopCam();return}v.srcObject=stream;await v.play();scanLoop(v)}
  catch(e){console.warn(e);const b=$('#scanbox');if(b)b.outerHTML='<p class="hint" style="padding:0;text-align:center">ما قدرت أفتح الكاميرا. اسمح للتطبيق بالكاميرا، أو اختر صورة الباركود من الصور.</p>'}}
function scanLoop(v){const Z=window.ZXing;let det=null,reader=null;
  if('BarcodeDetector' in window){try{det=new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e','code_128']})}catch(e){}}
  if(Z){const h=new Map();h.set(Z.DecodeHintType.TRY_HARDER,true);
    h.set(Z.DecodeHintType.POSSIBLE_FORMATS,[Z.BarcodeFormat.EAN_13,Z.BarcodeFormat.EAN_8,Z.BarcodeFormat.UPC_A,Z.BarcodeFormat.UPC_E,Z.BarcodeFormat.CODE_128]);
    reader=new Z.MultiFormatReader();reader.setHints(h)}
  const c=document.createElement('canvas'),x=c.getContext('2d',{willReadFrequently:true});
  const tick=async()=>{if(!stream||!document.body.contains(v))return;let code=null;
    if(v.videoWidth){
      if(det){try{const r=await det.detect(v);if(r[0])code=r[0].rawValue}catch(e){}}
      if(!code&&reader){const w=v.videoWidth,h=v.videoHeight,cw=Math.round(w*.8),ch=Math.round(h*.5);c.width=cw;c.height=ch;
        x.drawImage(v,(w-cw)/2,(h-ch)/2,cw,ch,0,0,cw,ch);
        try{code=reader.decode(new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.HTMLCanvasElementLuminanceSource(c)))).getText()}catch(e){}}}
    if(code){stopCam();if(navigator.vibrate)navigator.vibrate(40);openCode(code);return}
    scanTimer=setTimeout(tick,160)};
  tick()}

/* ---------- screen events ---------- */
document.addEventListener('click',async e=>{const el=e.target.closest('[data-sact]');if(!el)return;const d=el.dataset;
  switch(d.sact){
   case 'authmode':authScreen(d.m);break;
   case 'obsex':document.querySelectorAll('#ob-sex button').forEach(b=>b.setAttribute('aria-pressed',b===el));placeInd(el.closest('.seg'));break;
   case 'obcolor':document.querySelectorAll('#ob-colors .dot').forEach(b=>b.setAttribute('aria-pressed',b===el));break;
   case 'mkcode':{busy(el,true);const {error}=await sb.rpc('create_couple');busy(el,false);if(error){err('ما قدرت أسوي الرمز، جرّب مرة ثانية');break}await enterApp();break}
   case 'join':{const code=($('#joincode').value||'').trim();if(code.length<6){err('الرمز 6 أحرف وأرقام');break}
     busy(el,true);const {data,error}=await sb.rpc('join_couple',{p_code:code});busy(el,false);
     if(error||!data){err('الرمز غلط، أو فيه شخصين مرتبطين فيه');break}await enterApp();break}
   case 'retry':enterApp();break;
   case 'logout':logout();break;
  }});
document.addEventListener('submit',async e=>{e.preventDefault();const f=e.target,btn=f.querySelector('[type=submit]');
  if(f.id==='authf'){const email=$('#au-email').value.trim(),password=$('#au-pass').value;err('');busy(btn,true);
    const r=f.dataset.mode==='up'?await sb.auth.signUp({email,password}):await sb.auth.signInWithPassword({email,password});busy(btn,false);
    if(r.error){const m=r.error.message||'';err(/Invalid login/i.test(m)?'الإيميل أو كلمة السر غلط':/already registered|exists/i.test(m)?'الإيميل مسجّل من قبل، اختر «دخول»':/Password/i.test(m)?'كلمة السر لازم تكون 6 أحرف أو أكثر':/rate|limit/i.test(m)?'محاولات كثيرة، انتظر شوي':'ما قدرت أدخلك: '+m);return}
    if(!r.data.session){err('');screen(`<h1>أكّد إيميلك</h1><p class="lead">أرسلنا لك رابط تأكيد على ${esc(email)}. افتحه، وبعدين ارجع هنا وادخل.</p><button class="btn" data-sact="authmode" data-m="in">رجوع للدخول</button>`);return}
    uid=r.data.session.user.id;await enterApp();return}
  if(f.id==='obf'){const v=id=>$(id).value,num=id=>+$(id).value;
    const sex=$('#ob-sex [aria-pressed="true"]').dataset.s,color=$('#ob-colors [aria-pressed="true"]').dataset.c;
    const o={name:v('#ob-name').trim(),sex,age:num('#ob-age'),h:num('#ob-h'),w:num('#ob-w'),goal:num('#ob-goal'),weeks:num('#ob-weeks'),act:num('#ob-act')};
    if(!o.name){err('اكتب اسمك');return}
    const r=plan(o);busy(btn,true);
    const {error}=await sb.from('profiles').update({name:o.name,sex,color,age:o.age,height:o.h,weight:o.w,start_weight:o.w,goal_weight:o.goal,weeks:o.weeks,activity:o.act,
      target:r.target,protein:r.protein,weights:[{d:TODAY,kg:o.w}]}).eq('id',uid);busy(btn,false);
    if(error){err('ما انحفظ، جرّب مرة ثانية');return}
    if(r.tooFast)toast('هدفك أسرع من الآمن (1٪ من وزنك بالأسبوع). فكّر تمدد المدة.');
    await enterApp();return}
});
sb.auth.onAuthStateChange(ev=>{if(ev==='SIGNED_OUT'&&S){S=null;authScreen()}});

if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
boot();
