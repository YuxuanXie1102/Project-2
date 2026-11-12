(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (v = '') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const key = d => d.toISOString().slice(0, 10);
  const parseDay = s => new Date(`${s}T12:00:00`);
  const today = new Date(); today.setHours(12, 0, 0, 0);
  const nextLocalMidnight = new Date(); nextLocalMidnight.setHours(24, 0, 1, 0);
  setTimeout(() => location.reload(), Math.max(1000, nextLocalMidnight.getTime() - Date.now()));
  const uid = () => `${Date.now()}${Math.random().toString(16).slice(2)}`;
  const defaults = () => ({
    todos: [], carry: [],
    checks: [], foods: [], assets: [], expenses: []
  });
  const read = () => { try { return JSON.parse(localStorage.getItem('gentle-static')) || {}; } catch { return {}; } };
  const store = read();
  const readExtra=()=>{try{return JSON.parse(localStorage.getItem('gentle-extra'))||{}}catch{return {}}};
  const extra=readExtra();
  extra.schedule ||= Array.from({length:7},()=>[]);
  extra.todoCats ||= [['作业','#8e82c4'],['商务','#68a4b8'],['日常','#e19b72'],['预约','#c97fa0'],['其他','#8da17e']];
  extra.foodCats ||= [['主食','#d7a46d'],['肉蛋','#dc8979'],['蔬菜','#78a889'],['水果','#c992ad'],['饮料','#6f9eb3'],['零食','#9b8ac2']];
  extra.expenseCats ||= [['饮食','#ef9d88'],['美妆','#c799c7'],['衣装','#eab1c4'],['出行','#77aeb9'],['游戏','#9b9bd1'],['其他','#d2aa73']];
  const defaultMeals=[['breakfast','早餐'],['lunch','午餐'],['dinner','晚餐'],['snack','加餐 / 饮水']];
  const seedChecks=[
    {id:'keys',text:'带好钥匙和手机',important:false},{id:'water',text:'带一杯水',important:false},
    {id:'door',text:'确认门已锁好',important:true},{id:'power',text:'确认电源已关闭',important:true}
  ];
  let selected = key(today), shown = new Date(today), pending = null, expenseCat = '饮食', todoCat = '日常';
  const day = (k = selected) => store[k] ||= defaults();
  const datePlus=(date,n)=>{const d=parseDay(date);d.setDate(d.getDate()+n);return key(d)};
  const save = () => {localStorage.setItem('gentle-static', JSON.stringify(store))};
  const saveExtra=()=>{localStorage.setItem('gentle-extra',JSON.stringify(extra))};
  const cnDate = d => `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
  const weekdays = '日一二三四五六';
  if(!Array.isArray(extra.checkTemplates)){
    extra.checkTemplates=[];
    Object.entries(store).sort(([a],[b])=>a.localeCompare(b)).forEach(([date,data])=>(data.checks||[]).forEach(x=>{if(!extra.checkTemplates.some(t=>t.id===x.id||t.text===x.text))extra.checkTemplates.push({id:x.id||uid(),text:x.text,important:!!x.important,start:date,repeat:'daily',weekdays:[]})}));
    if(!extra.checkTemplates.length)extra.checkTemplates=seedChecks.map(x=>({...x,start:key(today),repeat:'daily',weekdays:[]}));
  }
  if(!Array.isArray(extra.assetDefs)){
    extra.assetDefs=[];
    Object.entries(store).sort(([a],[b])=>a.localeCompare(b)).forEach(([date,data])=>(data.assets||[]).forEach(a=>{if(!extra.assetDefs.some(x=>x.name===a.name))extra.assetDefs.push({id:a.id||uid(),name:a.name||'未命名项目',start:date})}));
  }
  const normalizeAssetName=name=>String(name||'').trim().replace(/\s+/g,' ').toLocaleLowerCase();
  function normalizeAssets(stateStore=store,stateExtra=extra){
    const defs=Array.isArray(stateExtra.assetDefs)?stateExtra.assetDefs:[],kept=[],byName=new Map(),idMap=new Map();
    defs.slice().sort((a,b)=>(a.start||'').localeCompare(b.start||'')).forEach(def=>{const n=normalizeAssetName(def.name||'未命名项目');let base=byName.get(n);if(!base){base={...def,name:(def.name||'未命名项目').trim(),start:def.start||key(today),end:def.end||null};byName.set(n,base);kept.push(base)}else{base.start=[base.start,def.start].filter(Boolean).sort()[0]||base.start;if(def.end)base.end=!base.end?def.end:[base.end,def.end].sort()[0];idMap.set(def.id,base.id)}});
    Object.values(stateStore||{}).forEach(d=>(d.assets||[]).forEach(a=>{if(idMap.has(a.id))a.id=idMap.get(a.id);const def=byName.get(normalizeAssetName(a.name));if(def){a.id=def.id;a.name=def.name}}));stateExtra.assetDefs=kept;return {store:stateStore,extra:stateExtra};
  }
  normalizeAssets();
  if(!Array.isArray(extra.meals))extra.meals=defaultMeals.map(([id,name])=>({id,name}));
  if(!extra.mealCats)extra.mealCats={};
  extra.meals.forEach(m=>{if(!extra.mealCats[m.id])extra.mealCats[m.id]=(extra.mealCats[m.name]||extra.foodCats).map(x=>[...x])});
  Object.values(store).forEach(d=>(d.foods||[]).forEach(x=>{if(!x.mealId){const m=extra.meals.find(v=>v.name===x.meal);if(m)x.mealId=m.id}}));
  extra.carryDefaults ||= [];
  save();saveExtra();

  const icons = {
    home:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/></svg>',
    records:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M8 3v18M12 8h5M12 12h5M12 16h3"/></svg>',
    clock:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    pin:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    check:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>',
    sparkle:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 1.4 4.1L17.5 9l-4.1 1.9L12 15l-1.4-4.1L6.5 9l4.1-1.9Z"/></svg>',
    lock:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></svg>',
    trash:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/></svg>'
  };
  const iconizeDeletes=(root=document)=>$$('button',root).forEach(b=>{if(/^删除(?:这个项目)?$/.test(b.textContent.trim())){b.classList.add('del');b.setAttribute('aria-label',b.textContent.trim());b.innerHTML=icons.trash}});
  new MutationObserver(records=>records.forEach(r=>r.addedNodes.forEach(n=>{if(n.nodeType===1)iconizeDeletes(n)}))).observe(document.body,{childList:true,subtree:true});iconizeDeletes();
  const navs = [['home','Home'],['records','Records']];
  const navHTML = navs.map(([id,label]) => `<button data-page="${id}" class="nav ${id==='home'?'active':''}">${icons[id]}<span>${label}</span></button>`).join('');
  $('#desktopNav').innerHTML = navHTML; $('#mobileNav').innerHTML = navHTML;
  $$('[data-page]').forEach(b => b.onclick = () => {
    $$('.page').forEach(p => p.classList.toggle('active', p.id === b.dataset.page));
    $$('[data-page]').forEach(x => x.classList.toggle('active', x.dataset.page === b.dataset.page));
    window.scrollTo({top:0, behavior:'smooth'});
    randomizeCharacters();
  });

  const todoCats=extra.todoCats;
  extra.archivedColors ||= {todo:{},food:{},expense:{}};
  const label=(name,color)=>`<span class="colorTag" style="--tag:${color}"><i></i>${esc(name)}</span>`;
  const colorFor=(kind,name,list)=>list.find(x=>x[0]===name)?.[1]||extra.archivedColors[kind]?.[name]||'#8da17e';
  const checkApplies=(x,k)=>{if(k<x.start)return false;const dow=parseDay(k).getDay();return x.repeat==='daily'||(x.repeat==='once'&&k===x.start)||(x.repeat==='weekly'&&(x.weekdays||[]).includes(dow))};
  const checksFor=(k=selected)=>{
    const templates=extra.checkTemplates.filter(x=>checkApplies(x,k)).map(x=>{const state=(store[k]?.checks||[]).find(s=>s.id===x.id);return {...x,done:!!state?.done}});
    const ids=new Set(extra.checkTemplates.map(x=>x.id));const legacy=(store[k]?.checks||[]).filter(x=>!ids.has(x.id));return [...templates,...legacy];
  };
  const setCheckDone=(item,done)=>{let state=day().checks.find(x=>x.id===item.id);if(!state){state={id:item.id,text:item.text,important:item.important,done:false};day().checks.push(state)}state.done=done;save()};
  const assetRecord=(def,k=selected)=>(store[k]?.assets||[]).find(x=>x.id===def.id||x.name===def.name);
  const ensureAssetRecord=(def,k=selected)=>{const d=day(k);let item=d.assets.find(x=>x.id===def.id||x.name===def.name);if(!item){item={id:def.id,name:def.name,value:0};d.assets.push(item)}return item};
  function renderCalendar() {
    const y = shown.getFullYear(), m = shown.getMonth();
    $('#month').textContent = `${y}年 ${m+1}月`;
    const first = new Date(y,m,1).getDay(), total = new Date(y,m+1,0).getDate();
    let html = '<span></span>'.repeat(first);
    for (let n=1;n<=total;n++) {
      const d = new Date(y,m,n,12), k = key(d), info = store[k];
      const complete = d<today;
      const marks=[...new Set((info?.todos||[]).map(t=>t.cat||'日常'))].map(cat=>[cat,colorFor('todo',cat,todoCats)]);
      html += `<button data-date="${k}" class="${k===selected?'selected ':''}${k===key(today)?'today ':''}"><span>${n}</span>${complete?`<i class="pastMascot" style="${calendarMascot(k)}"></i>`:''}${marks.length?`<b class="dayMarks">${marks.map(x=>`<i style="background:${x[1]}"></i>`).join('')}</b>`:''}</button>`;
    }
    $('#days').innerHTML = html;
    $$('[data-date]').forEach(b => b.onclick = () => { selected=b.dataset.date; render(); });
  }
  $('#prev').onclick=()=>{shown=new Date(shown.getFullYear(),shown.getMonth()-1,1,12);renderCalendar()};
  $('#next').onclick=()=>{shown=new Date(shown.getFullYear(),shown.getMonth()+1,1,12);renderCalendar()};
  $('#todayBtn').onclick=()=>{selected=key(today);shown=new Date(today);render()};
  function setCalendarCollapsed(collapsed){$('.calendar').classList.toggle('isCollapsed',collapsed);$('#calendarToggle').textContent=collapsed?'展开日历':'收起日历';$('#calendarToggle').setAttribute('aria-expanded',String(!collapsed));localStorage.setItem('gentle-calendar-collapsed',collapsed?'1':'0')}
  setCalendarCollapsed(localStorage.getItem('gentle-calendar-collapsed')==='1');
  $('#calendarToggle').onclick=()=>setCalendarCollapsed(!$('.calendar').classList.contains('isCollapsed'));

  function renderTop() {
    const d=parseDay(selected), checks=checksFor(), done=checks.filter(x=>x.done).length, pct=checks.length?Math.round(done/checks.length*100):0;
    $('#state').textContent = selected===key(today)?'今天':d<today?'历史归档':'未来安排';
    $('#date').textContent=cnDate(d); $('#week').textContent=`星期${weekdays[d.getDay()]}`;
    $('#bar').style.width=`${pct}%`; $('#progress').textContent=`今日确认 ${done}/${checks.length} · ${pct}%`;
    $('#todoDate').textContent=cnDate(d); $('#todayBtn').classList.toggle('show',selected!==key(today)); $('#reportBtn').classList.toggle('visible',d<today);
  }
  function renderTodos() {
    $('#todoCats').innerHTML=todoCats.map(([n,c])=>`<button class="${n===todoCat?'active':''}" style="--tag:${c}" data-todo-cat="${n}"><i></i>${n}</button>`).join('')+'<button class="addTag" data-add-tag="todo">编辑标签</button>';
    $$('[data-todo-cat]').forEach(b=>b.onclick=()=>{todoCat=b.dataset.todoCat;renderTodos()});
    $('#todos').innerHTML = day().todos.length ? day().todos.map(t=>{const cat=t.cat||'日常',color=colorFor('todo',cat,todoCats);return `<div class="row ${t.done?'done':''}"><button class="tick" data-tick="${t.id}">${t.done?icons.check:''}</button>${label(cat,color)}<span data-no-translate>${esc(t.text)}</span><button class="del" data-del-todo="${t.id}">${icons.trash}</button></div>`}).join('') : '<p class="empty">这一天还没有特定待办。</p>';
    $$('[data-tick]').forEach(b=>b.onclick=()=>{const t=day().todos.find(x=>x.id===b.dataset.tick);t.done=!t.done;save();render()});
    $$('[data-del-todo]').forEach(b=>b.onclick=()=>{day().todos=day().todos.filter(x=>x.id!==b.dataset.delTodo);save();render()});
  }
  function addTodo(){const i=$('#todo'),v=i.value.trim();if(!v)return;day().todos.push({id:uid(),text:v,cat:todoCat,done:false});i.value='';save();render()}
  $('#addTodo').onclick=addTodo; $('#todo').onkeydown=e=>{if(e.key==='Enter')addTodo()};

  function carryFor(){const d=day();d.carry||=[];extra.carryDefaults.forEach(x=>{if(!d.carry.some(v=>v.id===x.id))d.carry.push({id:x.id,text:x.text,packed:false,position:'',hidden:false})});return d.carry.filter(x=>!x.hidden)}
  function renderCarry(){
    const items=carryFor();$('#carryList').innerHTML=items.map(x=>{const recurring=extra.carryDefaults.some(v=>v.id===x.id);return `<div class="carryRow ${x.packed?'done':''}"><button class="tick" data-carry-check="${x.id}">${x.packed?icons.check:''}</button><span data-no-translate>${esc(x.text)}</span><input data-carry-place="${x.id}" value="${esc(x.position||'')}" placeholder="放在哪里"><details><summary>···</summary><div><button data-carry-today="${x.id}">今天不带</button><button data-carry-always="${x.id}">${recurring?'取消常带':'设为常带'}</button><button data-carry-delete="${x.id}">删除</button></div></details></div>`}).join('')||'<p class="empty">今天还没有要带的物品。</p>';
    $$('[data-carry-check]').forEach(b=>b.onclick=()=>{const x=day().carry.find(x=>x.id===b.dataset.carryCheck);x.packed=!x.packed;save();renderCarry()});$$('[data-carry-place]').forEach(i=>i.onchange=()=>{day().carry.find(x=>x.id===i.dataset.carryPlace).position=i.value.trim();save()});
    $$('[data-carry-today]').forEach(b=>b.onclick=()=>{day().carry.find(x=>x.id===b.dataset.carryToday).hidden=true;save();renderCarry()});$$('[data-carry-always]').forEach(b=>b.onclick=()=>{const item=day().carry.find(x=>x.id===b.dataset.carryAlways),exists=extra.carryDefaults.some(x=>x.id===item.id);extra.carryDefaults=exists?extra.carryDefaults.filter(x=>x.id!==item.id):[...extra.carryDefaults,{id:item.id,text:item.text}];saveExtra();renderCarry()});$$('[data-carry-delete]').forEach(b=>b.onclick=()=>{const id=b.dataset.carryDelete;day().carry=day().carry.filter(x=>x.id!==id);extra.carryDefaults=extra.carryDefaults.filter(x=>x.id!==id);save();saveExtra();renderCarry()});
  }
  $('#addCarry').onclick=()=>{const text=$('#carryName').value.trim();if(!text)return;const item={id:uid(),text,packed:false,position:'',hidden:false},items=day().carry||=[];items.push(item);if($('#carryAlways').checked)extra.carryDefaults.push({id:item.id,text});$('#carryName').value='';$('#carryAlways').checked=false;save();saveExtra();renderCarry()};

  function renderChecks() {
    const items=checksFor();
    $('#checks').innerHTML=[false,true].map(important=>`<section class="checkBox ${important?'important':''}"><header>${important?icons.lock:icons.sparkle}<span><b>${important?'重要确认':'轻松打卡'}</b><small>${important?'确认后才会完成':'点一下就好'}</small></span></header>${items.filter(c=>c.important===important).map(c=>`<div class="checkRow ${c.done?'done':''}"><button class="tick" data-check="${c.id}">${c.done?icons.check:''}</button><span>${esc(c.text)}</span><button class="evidenceBtn" data-evidence="${c.id}" data-evidence-text="${esc(c.text)}">照片</button></div>`).join('')||'<p class="checkEmpty">这一天没有待确认事项</p>'}</section>`).join('');
    $$('[data-check]').forEach(b=>b.onclick=()=>{const c=items.find(x=>x.id===b.dataset.check);if(c.important&&!c.done){pending=c;$('#confirmText').textContent=`确定已经“${c.text}”了吗？`;$('#confirm').classList.add('open')}else{setCheckDone(c,!c.done);render()}});
    bindEvidenceButtons();
  }
  $('#cancel').onclick=()=>$('#confirm').classList.remove('open');
  $('#yes').onclick=()=>{if(pending){setCheckDone(pending,true);pending=null;render()}$('#confirm').classList.remove('open')};

  const evidenceCache=new Map();let evidenceTarget=null;
  const evidenceKey=(date,id)=>`${date}:${id}`;
  async function evidenceMeta(date,id){
    const k=evidenceKey(date,id);if(evidenceCache.has(k))return evidenceCache.get(k);
    try{const r=await fetch(`/api/evidence?day=${encodeURIComponent(date)}&checkId=${encodeURIComponent(id)}`,{cache:'no-store'});if(!r.ok)throw 0;const data=await r.json();evidenceCache.set(k,data);return data}catch{return {exists:false,error:true}}
  }
  function bindEvidenceButtons(){
    $$('[data-evidence]').forEach(button=>{
      const date=selected,id=button.dataset.evidence,text=button.dataset.evidenceText;
      evidenceMeta(date,id).then(meta=>{if(button.isConnected&&selected===date){button.textContent=meta.exists?'查看照片':'拍摄 / 上传';button.classList.toggle('hasPhoto',!!meta.exists)}});
      button.onclick=async()=>{evidenceTarget={date,id,text};const meta=await evidenceMeta(date,id);if(meta.exists)openEvidence(meta);else $('#photoChoice').classList.add('open')};
    });
  }
  function openEvidence(meta){
    if(!evidenceTarget)return;$('#photoTitle').textContent=evidenceTarget.text;$('#evidenceImage').src=`/api/evidence?day=${encodeURIComponent(evidenceTarget.date)}&checkId=${encodeURIComponent(evidenceTarget.id)}&view=1&t=${meta.uploadedAt}`;$('#photoTime').textContent=`拍摄或上传于 ${new Date(meta.uploadedAt).toLocaleString('zh-CN')}`;$('#photoChoice').classList.remove('open');$('#photoViewer').classList.add('open');
  }
  async function uploadEvidence(file){
    if(!file||!evidenceTarget)return;if(!file.type.startsWith('image/'))return alert(window.easyEverydayTranslate?.('请选择照片文件。')||'请选择照片文件。');if(file.size>8*1024*1024)return alert(window.easyEverydayTranslate?.('照片请控制在 8MB 以内。')||'照片请控制在 8MB 以内。');
    const target={...evidenceTarget};const buttons=$$(`[data-evidence="${CSS.escape(target.id)}"]`);buttons.forEach(b=>{b.disabled=true;b.textContent='上传中…'});$('#photoChoice').classList.remove('open');
    try{const r=await fetch(`/api/evidence?day=${encodeURIComponent(target.date)}&checkId=${encodeURIComponent(target.id)}&checkText=${encodeURIComponent(target.text)}`,{method:'PUT',headers:{'Content-Type':file.type},body:file});if(!r.ok)throw new Error();const meta=await r.json();evidenceCache.set(evidenceKey(target.date,target.id),meta);evidenceTarget=target;renderChecks();openEvidence(meta)}catch{alert(window.easyEverydayTranslate?.('照片暂时没有上传成功，请稍后再试。')||'照片暂时没有上传成功，请稍后再试。');renderChecks()}
  }
  $('#takePhoto').onclick=()=>$('#cameraInput').click();$('#uploadPhoto').onclick=()=>$('#uploadInput').click();
  $('#cameraInput').onchange=e=>{uploadEvidence(e.target.files?.[0]);e.target.value=''};$('#uploadInput').onchange=e=>{uploadEvidence(e.target.files?.[0]);e.target.value=''};
  $('#closePhotoChoice').onclick=()=>$('#photoChoice').classList.remove('open');$('#closePhotoViewer').onclick=()=>{$('#photoViewer').classList.remove('open');$('#evidenceImage').removeAttribute('src')};
  $('#replacePhoto').onclick=()=>{$('#photoViewer').classList.remove('open');$('#photoChoice').classList.add('open')};

  const repeatText=x=>x==='once'?'仅今天':x==='weekly'?'自定义':'每天';
  function renderCheckManager(){
    $('#checkRows').innerHTML=extra.checkTemplates.map((x,i)=>{
      const custom=x.repeat==='weekly'?`<div class="weekdayPicker">${[0,1,2,3,4,5,6].map(d=>`<button class="${(x.weekdays||[]).includes(d)?'active':''}" data-check-day="${i},${d}">${weekdays[d]}</button>`).join('')}</div>`:'';
      const timing=x.repeat==='weekly'?`每周 ${(x.weekdays||[]).map(d=>weekdays[d]).join('、')||'尚未选择'}`:repeatText(x.repeat);
      return `<div class="checkManageRow"><div class="checkManageMain"><input data-check-name="${i}" value="${esc(x.text)}" aria-label="待确认名称"><select data-check-important="${i}" aria-label="确认类型"><option value="false" ${!x.important?'selected':''}>轻松打卡</option><option value="true" ${x.important?'selected':''}>重要确认</option></select></div><label class="repeatSelect"><span>生效时间</span><select data-check-repeat="${i}"><option value="once" ${x.repeat==='once'?'selected':''}>仅今天</option><option value="daily" ${x.repeat==='daily'?'selected':''}>每天</option><option value="weekly" ${x.repeat==='weekly'?'selected':''}>自定义</option></select></label>${custom}<div class="checkManageFoot"><small>${timing} · 从 ${x.start} 开始</small><button class="del" data-delete-template="${i}" aria-label="删除">${icons.trash}</button></div></div>`;
    }).join('')||'<p class="empty">还没有待确认事项。</p>';
    $$('[data-check-name]').forEach(el=>el.onchange=()=>{extra.checkTemplates[+el.dataset.checkName].text=el.value.trim()||'未命名事项';saveExtra();render()});
    $$('[data-check-important]').forEach(el=>el.onchange=()=>{extra.checkTemplates[+el.dataset.checkImportant].important=el.value==='true';saveExtra();render()});
    $$('[data-check-repeat]').forEach(el=>el.onchange=()=>{const x=extra.checkTemplates[+el.dataset.checkRepeat];x.repeat=el.value;if(el.value==='once')x.start=selected;if(el.value==='weekly'&&!x.weekdays?.length)x.weekdays=[parseDay(selected).getDay()];saveExtra();renderCheckManager();render()});
    $$('[data-check-day]').forEach(b=>b.onclick=()=>{const [i,d]=b.dataset.checkDay.split(',').map(Number),days=extra.checkTemplates[i].weekdays||=[];extra.checkTemplates[i].weekdays=days.includes(d)?days.filter(x=>x!==d):[...days,d].sort();saveExtra();renderCheckManager();render()});
    $$('[data-delete-template]').forEach(b=>b.onclick=()=>{extra.checkTemplates.splice(+b.dataset.deleteTemplate,1);saveExtra();renderCheckManager();render()});
  }
  $('#manageChecks').onclick=()=>{renderCheckManager();$('#checkManager').classList.add('open')};
  $('#closeChecks').onclick=()=>$('#checkManager').classList.remove('open');
  $('#newCheckTemplate').onclick=()=>{extra.checkTemplates.push({id:uid(),text:'新的待确认事项',important:false,start:selected,repeat:'once',weekdays:[]});saveExtra();renderCheckManager();render()};

  function renderMeals(){
    $('#meals').innerHTML=extra.meals.map((meal,mi)=>{const mealCats=extra.mealCats[meal.id]||[];return `<section class="meal"><header><h3>${esc(meal.name)}</h3><button class="addTag" data-add-tag="food" data-tag-meal="${meal.id}">编辑标签</button></header><div class="miniadd"><select id="fc${mi}">${mealCats.map(x=>`<option>${esc(x[0])}</option>`).join('')}</select><input id="fi${mi}" placeholder="食物或饮品"><button data-add-food="${mi}" aria-label="添加">＋</button></div><div class="foodRows">${day().foods.filter(x=>x.mealId===meal.id||(!x.mealId&&x.meal===meal.name)).map(x=>`<div class="foodRow" data-food-row="${x.id}"><div class="foodView">${label(x.cat,colorFor('food',x.cat,mealCats))}<span data-no-translate>${esc(x.name)}</span><button data-edit-food="${x.id}">编辑</button><button class="del" data-del-food="${x.id}" aria-label="删除">${icons.trash}</button></div><div class="inlineEdit" hidden><select data-food-cat="${x.id}">${mealCats.map(([n])=>`<option ${n===x.cat?'selected':''}>${esc(n)}</option>`).join('')}</select><input data-food-name="${x.id}" value="${esc(x.name)}"><button data-save-food="${x.id}">保存</button><button data-cancel-food="${x.id}">取消</button></div></div>`).join('')||'<small>还没有记录</small>'}</div></section>`}).join('')||'<p class="empty">还没有餐次，点击“编辑餐次”添加。</p>';
    $$('[data-add-food]').forEach(b=>b.onclick=()=>{const i=+b.dataset.addFood,meal=extra.meals[i],n=$(`#fi${i}`).value.trim(),cat=$(`#fc${i}`).value;if(!n||!cat)return;day().foods.push({id:uid(),mealId:meal.id,meal:meal.name,cat,name:n});save();renderMeals()});
    $$('[data-del-food]').forEach(b=>b.onclick=()=>{day().foods=day().foods.filter(x=>x.id!==b.dataset.delFood);save();renderMeals()});
    $$('[data-edit-food]').forEach(b=>b.onclick=()=>{const row=b.closest('.foodRow');row.querySelector('.foodView').hidden=true;row.querySelector('.inlineEdit').hidden=false});$$('[data-cancel-food]').forEach(b=>b.onclick=()=>renderMeals());$$('[data-save-food]').forEach(b=>b.onclick=()=>{const id=b.dataset.saveFood,x=day().foods.find(v=>v.id===id),name=$(`[data-food-name="${id}"]`).value.trim();if(!x||!name)return;x.name=name;x.cat=$(`[data-food-cat="${id}"]`).value;save();renderMeals()});
  }
  function renderMealManager(){
    $('#mealRows').innerHTML=extra.meals.map((m,i)=>`<div class="mealManageRow"><input value="${esc(m.name)}" data-meal-name="${i}" aria-label="餐次名称"><button class="del" data-meal-delete="${i}" aria-label="删除">${icons.trash}</button></div>`).join('')||'<p class="empty">还没有餐次。</p>';
    $$('[data-meal-name]').forEach(input=>input.onchange=()=>{const m=extra.meals[+input.dataset.mealName],old=m.name,name=input.value.trim();if(!name||extra.meals.some(x=>x!==m&&x.name===name)){input.value=old;return}m.name=name;Object.values(store).forEach(d=>(d.foods||[]).forEach(x=>{if(x.mealId===m.id||(!x.mealId&&x.meal===old)){x.mealId=m.id;x.meal=name}}));save();saveExtra();render();renderMealManager()});
    $$('[data-meal-delete]').forEach(b=>b.onclick=()=>{extra.meals.splice(+b.dataset.mealDelete,1);saveExtra();render();renderMealManager()});
  }
  $('#manageMeals').onclick=()=>{renderMealManager();$('#mealManager').classList.add('open')};
  $('#closeMeals').onclick=()=>$('#mealManager').classList.remove('open');
  $('#newMeal').onclick=()=>{const id=`meal-${uid()}`;extra.meals.push({id,name:'新餐次'});extra.mealCats[id]=extra.foodCats.map(x=>[...x]);saveExtra();render();renderMealManager()};
  function renderAssets(){
    const defs=extra.assetDefs.filter(x=>x.start<=selected&&(!x.end||selected<x.end)),prev=new Date(parseDay(selected));prev.setDate(prev.getDate()-1);const prevKey=key(prev);
    $('#assetList').innerHTML=defs.length?defs.map(a=>{const current=assetRecord(a),yesterday=assetRecord(a,prevKey),value=current?.value??0,diff=yesterday?value-yesterday.value:null;return `<section class="asset"><input class="assetName" data-aname="${a.id}" value="${esc(a.name)}"><label>今日数值<input type="number" data-aval="${a.id}" value="${value}"></label><footer><span class="assetDelta ${diff===null?'neutral':diff>=0?'up':'down'}">${diff===null?'暂无昨日数据':`较昨日资产 ${diff>=0?'+':''}${diff.toFixed(2)}`}</span><button class="softBtn" data-asset-trend="${a.id}">⌁ 查看走势</button><button class="softBtn" data-copy="${a.id}">↶ 同昨日</button><button class="dangerBtn del" data-del-asset="${a.id}" aria-label="删除">${icons.trash}</button></footer></section>`}).join(''):'<p class="empty">还没有资产项目，点击右上角新增。</p>';
    $$('[data-aname]').forEach(i=>i.onchange=()=>{const def=extra.assetDefs.find(x=>x.id===i.dataset.aname),old=def.name;def.name=i.value.trim()||old;Object.values(store).forEach(d=>(d.assets||[]).forEach(x=>{if(x.id===def.id||x.name===old){x.id=def.id;x.name=def.name}}));save();saveExtra();renderAssets()});
    $$('[data-aval]').forEach(i=>i.onchange=()=>{const def=extra.assetDefs.find(x=>x.id===i.dataset.aval),item=ensureAssetRecord(def);item.value=Number(i.value)||0;item.name=def.name;save();renderAssets()});
    $$('[data-copy]').forEach(b=>b.onclick=()=>{const def=extra.assetDefs.find(x=>x.id===b.dataset.copy),previous=assetRecord(def,prevKey);if(previous){const item=ensureAssetRecord(def);item.value=previous.value;save();renderAssets()}});
    $$('[data-asset-trend]').forEach(b=>b.onclick=()=>openAssetTrend(b.dataset.assetTrend));
    $$('[data-del-asset]').forEach(b=>b.onclick=()=>{const def=extra.assetDefs.find(x=>x.id===b.dataset.delAsset);if(!def)return;if(def.start===selected){extra.assetDefs=extra.assetDefs.filter(x=>x.id!==def.id);day().assets=day().assets.filter(x=>x.id!==def.id)}else def.end=selected;save();saveExtra();renderAssets()});
  }
  $('#addAsset').onclick=()=>{const def={id:uid(),name:'新项目',start:selected};extra.assetDefs.push(def);ensureAssetRecord(def);save();saveExtra();renderAssets()};

  let trendAssetId='',trendDays=7;
  const trendMoney=n=>Number(n).toLocaleString('zh-CN',{maximumFractionDigits:2});
  function trendPoints(def,days){const start=datePlus(selected,1-days);return Object.entries(store).filter(([date])=>date>=start&&date<=selected).map(([date,d])=>{const row=(d.assets||[]).find(x=>x.id===def.id||normalizeAssetName(x.name)===normalizeAssetName(def.name));return row?{date,value:Number(row.value)||0}:null}).filter(Boolean).sort((a,b)=>a.date.localeCompare(b.date))}
  function renderAssetTrend(){
    if(trendAssetId==='__all__')return renderAllAssetTrend();const def=extra.assetDefs.find(x=>x.id===trendAssetId);if(!def)return;const points=trendPoints(def,trendDays),chart=$('#assetTrendChart');
    $('#assetTrendTitle').textContent=`${def.name} · 走势`;$('#assetTrendRange').textContent=`截至 ${selected}`;$$('[data-trend-days]').forEach(b=>b.classList.toggle('active',+b.dataset.trendDays===trendDays));
    $('#assetTrendLegend').innerHTML='';$('#assetTrendHead').innerHTML='<th>日期</th><th>金额</th><th>涨跌</th>';
    if(!points.length)chart.innerHTML='<p class="empty">这段时间还没有数值记录。</p>';
    else{const W=720,H=280,L=64,R=20,T=24,B=48,vals=points.map(p=>p.value),rawMin=Math.min(...vals),rawMax=Math.max(...vals),spread=Math.max(rawMax-rawMin,Math.max(Math.abs(rawMax),1)*.08),min=rawMin-spread*.18,max=rawMax+spread*.18,x=i=>points.length===1?(L+W-R)/2:L+i*(W-L-R)/(points.length-1),y=v=>T+(max-v)*(H-T-B)/(max-min),line=points.map((p,i)=>`${x(i)},${y(p.value)}`).join(' '),grid=[0,.25,.5,.75,1].map(r=>{const gy=T+r*(H-T-B),v=max-r*(max-min);return `<line x1="${L}" x2="${W-R}" y1="${gy}" y2="${gy}"/><text x="${L-8}" y="${gy+4}" text-anchor="end">${esc(trendMoney(v))}</text>`}).join(''),step=Math.max(1,Math.ceil(points.length/6)),labels=points.map((p,i)=>(i%step===0||i===points.length-1)?`<text x="${x(i)}" y="${H-16}" text-anchor="middle">${p.date.slice(5)}</text>`:'').join(''),dots=points.map((p,i)=>`<circle cx="${x(i)}" cy="${y(p.value)}" r="4"><title>${p.date}：${trendMoney(p.value)}</title></circle>`).join('');chart.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(def.name)}近${trendDays}日走势"><g class="trendGrid">${grid}${labels}</g><polyline class="trendLine" points="${line}"/>${dots}</svg>`}
    $('#assetTrendTable').innerHTML=points.length?points.map((p,i)=>{const diff=i?p.value-points[i-1].value:null;return `<tr><td>${p.date}</td><td>${trendMoney(p.value)}</td><td class="${diff===null?'neutral':diff>=0?'up':'down'}">${diff===null?'—':`${diff>=0?'+':''}${trendMoney(diff)}`}</td></tr>`}).join(''):'<tr><td colspan="3">暂无记录</td></tr>';
  }
  function renderAllAssetTrend(){
    const defs=extra.assetDefs.filter(x=>x.start<=selected&&(!x.end||selected<x.end)),series=defs.map((def,i)=>({def,color:`var(--trend-${i%8})`,points:trendPoints(def,trendDays)})).filter(x=>x.points.length),all=series.flatMap(x=>x.points),chart=$('#assetTrendChart');
    $('#assetTrendTitle').textContent='全部资产 · 对比走势';$('#assetTrendRange').textContent=`截至 ${selected}`;$$('[data-trend-days]').forEach(b=>b.classList.toggle('active',+b.dataset.trendDays===trendDays));$('#assetTrendHead').innerHTML='<th>资产</th><th>起始值</th><th>最新值</th><th>涨跌</th>';
    $('#assetTrendLegend').innerHTML=series.map(s=>`<span><i style="background:${s.color}"></i>${esc(s.def.name)}</span>`).join('');
    if(!all.length)chart.innerHTML='<p class="empty">这段时间还没有资产数值记录。</p>';
    else{const W=720,H=300,L=64,R=20,T=24,B=48,vals=all.map(p=>p.value),rawMin=Math.min(...vals),rawMax=Math.max(...vals),spread=Math.max(rawMax-rawMin,Math.max(Math.abs(rawMax),1)*.08),min=rawMin-spread*.18,max=rawMax+spread*.18,start=parseDay(datePlus(selected,1-trendDays)).getTime(),end=parseDay(selected).getTime(),x=d=>L+(parseDay(d).getTime()-start)*(W-L-R)/Math.max(1,end-start),y=v=>T+(max-v)*(H-T-B)/(max-min),grid=[0,.25,.5,.75,1].map(r=>{const gy=T+r*(H-T-B),v=max-r*(max-min);return `<line x1="${L}" x2="${W-R}" y1="${gy}" y2="${gy}"/><text x="${L-8}" y="${gy+4}" text-anchor="end">${esc(trendMoney(v))}</text>`}).join(''),dates=Array.from({length:Math.min(6,trendDays)},(_,i)=>datePlus(datePlus(selected,1-trendDays),Math.round(i*(trendDays-1)/(Math.min(6,trendDays)-1)))),labels=dates.map(d=>`<text x="${x(d)}" y="${H-16}" text-anchor="middle">${d.slice(5)}</text>`).join(''),lines=series.map(s=>`<polyline class="trendLine" style="stroke:${s.color}" points="${s.points.map(p=>`${x(p.date)},${y(p.value)}`).join(' ')}"/>${s.points.map(p=>`<circle style="stroke:${s.color}" cx="${x(p.date)}" cy="${y(p.value)}" r="4"><title>${esc(s.def.name)} · ${p.date}：${trendMoney(p.value)}</title></circle>`).join('')}`).join('');chart.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="全部资产近${trendDays}日对比走势"><g class="trendGrid">${grid}${labels}</g>${lines}</svg>`}
    $('#assetTrendTable').innerHTML=series.length?series.map(s=>{const first=s.points[0].value,last=s.points.at(-1).value,diff=last-first;return `<tr><td><span class="trendAssetName"><i style="background:${s.color}"></i>${esc(s.def.name)}</span></td><td>${trendMoney(first)}</td><td>${trendMoney(last)}</td><td class="${diff>=0?'up':'down'}">${diff>=0?'+':''}${trendMoney(diff)}</td></tr>`}).join(''):'<tr><td colspan="4">暂无记录</td></tr>';
  }
  function openAssetTrend(id){trendAssetId=id;trendDays=7;renderAssetTrend();$('#assetTrend').classList.add('open')}
  $('#allAssetTrend').onclick=()=>openAssetTrend('__all__');
  $('#closeAssetTrend').onclick=()=>$('#assetTrend').classList.remove('open');$$('[data-trend-days]').forEach(b=>b.onclick=()=>{trendDays=+b.dataset.trendDays;renderAssetTrend()});

  const cats=extra.expenseCats;
  const canonicalMerchant=s=>String(s||'').trim().replace(/\s+/g,' ').toLocaleLowerCase();
  const expenseEntries=()=>Object.entries(store).flatMap(([date,d])=>(d.expenses||[]).map(x=>({date,...x})));
  const expenseMonth=()=>selected.slice(0,7);
  const monthExpenses=()=>expenseEntries().filter(x=>x.date.startsWith(expenseMonth())).sort((a,b)=>b.date.localeCompare(a.date));
  function renderExpenses(){
    $('#expenseCats').innerHTML=cats.map(([n,c])=>`<button class="${n===expenseCat?'active':''}" style="--tag:${c}" data-ecat="${n}"><i></i>${n}</button>`).join('')+'<button class="addTag" data-add-tag="expense">编辑标签</button>';
    const entries=monthExpenses(),sums=Object.fromEntries(cats.map(([n])=>[n,0]));entries.forEach(x=>sums[x.cat]=(sums[x.cat]||0)+x.amount);const total=Object.values(sums).reduce((a,b)=>a+b,0);
    let cursor=0,parts=[];cats.forEach(([n,c])=>{const end=cursor+(total?sums[n]/total*360:0);if(end>cursor)parts.push(`${c} ${cursor}deg ${end}deg`);cursor=end});
    $('#donut').style.background=parts.length?`conic-gradient(${parts.join(',')})`:'var(--inner)'; $('#donutSum').textContent=`¥${total.toFixed(2)}`;$('#expenseSum').textContent=`${expenseMonth()} · 共 ${entries.length} 笔`;
    $('#legend').innerHTML=cats.map(([n,c])=>`<span><i style="background:${c}"></i>${n}<b>¥${sums[n].toFixed(2)}</b></span>`).join('');
    $('#expenses').innerHTML=entries.map(x=>`<div class="row expenseRow" data-exp-row="${x.id}"><div class="expenseView">${label(x.cat,colorFor('expense',x.cat,cats))}<div class="expenseDescription"><b class="expenseMerchant">${esc(x.merchant||'未填写商户')}</b><small class="expenseNote">${esc(x.note||'—')}</small></div><small class="expenseDate">${esc(x.date)}</small><b class="expenseAmount">¥${Number(x.amount).toFixed(2)}</b><button class="expenseEdit" data-edit-exp="${x.id}">编辑</button><button class="del" data-del-exp="${x.id}" aria-label="删除">${icons.trash}</button></div><div class="inlineEdit" hidden><input data-exp-amount="${x.id}" type="number" min="0" step="0.01" value="${x.amount}" aria-label="金额"><input data-exp-merchant="${x.id}" value="${esc(x.merchant||'')}" placeholder="商户"><input data-exp-note="${x.id}" value="${esc(x.note||'')}" placeholder="备注"><select data-exp-cat="${x.id}">${cats.map(([n])=>`<option ${n===x.cat?'selected':''}>${esc(n)}</option>`).join('')}</select><button data-save-exp="${x.id}">保存</button><button data-cancel-exp="${x.id}">取消</button></div></div>`).join('')||'<p class="empty">本月还没有消费记录。</p>';
    $$('[data-ecat]').forEach(b=>b.onclick=()=>{expenseCat=b.dataset.ecat;renderExpenses()});
    $$('[data-del-exp]').forEach(b=>b.onclick=()=>{const found=entries.find(x=>x.id===b.dataset.delExp);if(!found)return;store[found.date].expenses=store[found.date].expenses.filter(x=>x.id!==found.id);save();renderExpenses()});
    $$('[data-edit-exp]').forEach(b=>b.onclick=()=>{const row=b.closest('.expenseRow');row.querySelector('.expenseView').hidden=true;row.querySelector('.inlineEdit').hidden=false});$$('[data-cancel-exp]').forEach(b=>b.onclick=()=>renderExpenses());$$('[data-save-exp]').forEach(b=>b.onclick=()=>{const id=b.dataset.saveExp,found=entries.find(x=>x.id===id),x=store[found?.date]?.expenses.find(v=>v.id===id),amount=Number($(`[data-exp-amount="${id}"]`).value);if(!x||!(amount>0))return;x.amount=amount;x.merchant=$(`[data-exp-merchant="${id}"]`).value.trim();x.merchantKey=canonicalMerchant(x.merchant);x.note=$(`[data-exp-note="${id}"]`).value.trim();x.cat=$(`[data-exp-cat="${id}"]`).value;save();renderExpenses()});
  }
  $('#addExpense').onclick=()=>{const amount=Number($('#amount').value),note=$('#note').value.trim(),merchant=$('#merchant').value.trim();if(!(amount>0))return;day().expenses.push({id:uid(),cat:expenseCat,amount,note,merchant,merchantKey:canonicalMerchant(merchant)});$('#amount').value='';$('#merchant').value='';$('#note').value='';save();renderExpenses()};
  function renderBills(){const month=$('#billMonth').value||expenseMonth(),range=$('#billRange').value,cutoff=new Date(`${month}-01T12:00:00`);if(range!=='month')cutoff.setMonth(cutoff.getMonth()-(Number(range)-1));const earliest=key(cutoff).slice(0,7),cat=$('#billCat').value,merchant=canonicalMerchant($('#billMerchant').value),min=$('#billMin').value,max=$('#billMax').value;const items=expenseEntries().filter(x=>range==='month'?x.date.startsWith(month):x.date.slice(0,7)>=earliest&&x.date.slice(0,7)<=month).filter(x=>(!cat||x.cat===cat)&&(!merchant||canonicalMerchant(x.merchant||'').includes(merchant))&&(min===''||x.amount>=Number(min))&&(max===''||x.amount<=Number(max))).sort((a,b)=>b.date.localeCompare(a.date));$('#billSummary').textContent=`${items.length} 笔 · 合计 ¥${items.reduce((s,x)=>s+Number(x.amount||0),0).toFixed(2)}`;$('#billResults').innerHTML=items.map(x=>`<div class="row expenseRow">${label(x.cat,colorFor('expense',x.cat,cats))}<span><b>${esc(x.merchant||x.note||x.cat)}</b><small>${esc(x.date)}${x.merchant&&x.note?` · ${esc(x.note)}`:''}</small></span><b>¥${Number(x.amount).toFixed(2)}</b></div>`).join('')||'<p class="empty">没有符合条件的账单。</p>'}
  $('#openBills').onclick=()=>{const month=expenseMonth();$('#billMonth').value=month;$('#billCat').innerHTML='<option value="">全部</option>'+cats.map(([n])=>`<option>${esc(n)}</option>`).join('');renderBills();showPage('billsPage')};$('#closeBills').onclick=()=>showPage('records');$$('#billsPage input,#billsPage select').forEach(i=>{i.oninput=renderBills;i.onchange=renderBills});
  document.body.insertAdjacentHTML('afterbegin','<div class="geoShapes" aria-hidden="true"><i class="circle g1"></i><i class="star g2"></i><i class="circle g3"></i><i class="star g4"></i><i class="circle g5"></i><i class="star g6"></i><i class="circle g7"></i><i class="star g8"></i><i class="circle g9"></i><i class="star g10"></i><i class="circle g11"></i><i class="star g12"></i><i class="circle g13"></i></div><div class="themeCharacters" aria-hidden="true"><i></i><i></i><i></i></div>');
  $('.calendar').insertAdjacentHTML('afterbegin','<i class="todayMascot" aria-hidden="true"></i>');
  document.body.insertAdjacentHTML('beforeend','<div class="overlay" id="tagManager"><div class="modal tagModal"><div class="title"><h2 id="tagTitle">编辑标签</h2><button id="closeTags">✕</button></div><div id="tagRows"></div><div class="tagAdd"><input id="newTagName" placeholder="新标签名称"><button id="createTag">添加标签</button></div><p class="tagHint">新标签会自动获得柔和颜色；删除已使用的标签时，旧记录会保留原名称和颜色。</p></div></div>');
  let tagKind='todo',tagMeal=extra.meals[0]?.id||'';
  const tagTarget=()=>tagKind==='todo'?todoCats:tagKind==='food'?(extra.mealCats[tagMeal]||=[]):cats;
  const tagField=()=>tagKind==='todo'?'todos':tagKind==='food'?'foods':'expenses';
  function renderTagManager(){const target=tagTarget(),meal=extra.meals.find(x=>x.id===tagMeal);$('#tagTitle').textContent=`编辑${tagKind==='todo'?'待办':tagKind==='food'?(meal?.name||'饮食'):'记账'}标签`;$('#tagRows').innerHTML=target.map((x,i)=>`<div class="tagManageRow"><input type="color" value="${x[1]}" data-tag-color="${i}" aria-label="标签颜色"><input value="${esc(x[0])}" data-tag-name="${i}" aria-label="标签名称"><button data-tag-delete="${i}" ${target.length===1?'disabled':''}>删除</button></div>`).join('');$$('[data-tag-color]').forEach(i=>i.onchange=()=>{target[+i.dataset.tagColor][1]=i.value;saveExtra();render()});$$('[data-tag-name]').forEach(i=>i.onchange=()=>{const idx=+i.dataset.tagName,old=target[idx][0],name=i.value.trim();if(!name||target.some((x,j)=>j!==idx&&x[0]===name)){i.value=old;return}target[idx][0]=name;Object.values(store).forEach(d=>(d[tagField()]||[]).forEach(x=>{if((tagKind!=='food'||x.mealId===tagMeal)&&(x.cat||'日常')===old)x.cat=name}));if(todoCat===old)todoCat=name;if(expenseCat===old)expenseCat=name;save();saveExtra();render();renderTagManager()});$$('[data-tag-delete]').forEach(b=>b.onclick=()=>{const idx=+b.dataset.tagDelete,[name,color]=target[idx];if(!confirm(localStorage.getItem('gentle-language')==='en'?`Remove label “${name}”? Past records will keep it.`:`移除标签“${name}”？旧记录会继续保留这个标签。`))return;extra.archivedColors[tagKind][name]=color;target.splice(idx,1);if(todoCat===name)todoCat=todoCats[0]?.[0]||'';if(expenseCat===name)expenseCat=cats[0]?.[0]||'';saveExtra();render();renderTagManager()})}
  function bindAddTags(){ $$('[data-add-tag]').forEach(b=>b.textContent='编辑标签') }
  document.addEventListener('click',e=>{const b=e.target.closest('[data-add-tag]');if(!b)return;tagKind=b.dataset.addTag;tagMeal=b.dataset.tagMeal||extra.meals[0]?.id||'';renderTagManager();$('#tagManager').classList.add('open')});
  $('#closeTags').onclick=()=>$('#tagManager').classList.remove('open');$('#tagManager').onclick=e=>{if(e.target===$('#tagManager'))$('#tagManager').classList.remove('open')};$('#createTag').onclick=()=>{const name=$('#newTagName').value.trim(),target=tagTarget(),palette=['#d8a76d','#d8897c','#83a98f','#c78fab','#73a2b6','#9786c4'];if(!name||target.some(x=>x[0]===name))return;target.push([name,palette[target.length%palette.length]]);$('#newTagName').value='';saveExtra();render();renderTagManager()};
  $$('.tabs button').forEach(b=>b.onclick=()=>{$$('.tabs button,.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');$(`#${b.dataset.tab}`).classList.add('active')});

  $('#reportBtn').onclick=()=>{const d=day(),checks=checksFor(),done=checks.filter(x=>x.done).length,pct=checks.length?Math.round(done/checks.length*100):0,total=d.expenses.reduce((s,x)=>s+x.amount,0);$('#reportTitle').textContent=`${cnDate(parseDay(selected))} · 小报告`;$('#score').textContent=`${pct}%`;$('#rTodo').textContent=`${d.todos.filter(x=>x.done).length}/${d.todos.length}`;$('#rFood').textContent=`${d.foods.length} 项`;$('#rMoney').textContent=`¥${total.toFixed(2)}`;$('#rNote').textContent=pct>=75?'今天完成得很稳，剩下的明天再轻轻接住。':'记录本身就是一种整理，今天也已经留下了清晰的足迹。';$('#report').classList.add('open')};
  $('#close').onclick=()=>$('#report').classList.remove('open');
  $$('.overlay').forEach(x=>x.onclick=e=>{if(e.target===x)x.classList.remove('open')});

  const themes=[['mint','薄荷绿','#58a98a'],['blue','雾霭蓝','#6f9eb3'],['purple','芋泥紫','#967fae'],['pink','莓果粉','#c68597'],['forest','墨绿色','#6e9982']];
  const decorAssets={
    cat:{url:'assets/cat-stickers.png',cols:2,rows:3,ratio:1},
    matcha:{url:'assets/matcha-cats.png',cols:3,rows:3,ratio:1.5},
    foodcat:{url:'assets/food-cats.png',cols:3,rows:3,ratio:1.5},
    animals:{url:'assets/animal-alliance.png',cols:3,rows:4,ratio:1},
    mono:{url:'assets/mono-creatures.png',cols:4,rows:4,ratio:1.02},
    colorfun:{url:'assets/color-creatures.png',cols:3,rows:3,ratio:.96}
  };
  function spriteVars(data,cell){const col=cell%data.cols,row=Math.floor(cell/data.cols);return `--sprite:url('${data.url}');--size-x:${data.cols*100}%;--size-y:${data.rows*100}%;--pos-x:${data.cols===1?0:col/(data.cols-1)*100}%;--pos-y:${data.rows===1?0:row/(data.rows-1)*100}%;--ratio:${data.ratio}`}
  function calendarMascot(dateKey){const decor=document.documentElement.dataset.decor,asset=decorAssets[decor]||decorAssets.cat,hash=[...dateKey].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,7);return spriteVars(asset,hash%(asset.cols*asset.rows))}
  function randomizeCharacters(){
    const decor=document.documentElement.dataset.decor,asset=decorAssets[decor],box=$('.themeCharacters');
    if(!box)return;
    box.classList.toggle('visible',!!asset);
    const setSprite=(el,data,cell)=>el.setAttribute('style',spriteVars(data,cell));
    const mascotAsset=asset||decorAssets.cat,mascot=$('.todayMascot');setSprite(mascot,mascotAsset,Math.floor(Math.random()*mascotAsset.cols*mascotAsset.rows));
    if(!asset)return;
    const mobile=innerWidth<=780,spots=mobile?[[5,18],[82,38],[9,72],[78,84]]:[[3,18],[88,27],[7,67],[91,78],[76,48]],shuffled=[...spots].sort(()=>Math.random()-.5);
    $$('i',box).forEach((el,i)=>{const spot=shuffled[i];setSprite(el,asset,Math.floor(Math.random()*asset.cols*asset.rows));el.style.left=`${spot[0]}%`;el.style.top=`${spot[1]}%`;el.style.setProperty('--tilt',`${Math.round(Math.random()*14-7)}deg`);el.style.animationDelay=`${i*.7}s`});
  }
  function applyTheme(){const isDark=localStorage.getItem('gentle-dark')==='1';document.documentElement.dataset.theme=localStorage.getItem('gentle-theme')||'mint';document.documentElement.dataset.decor=localStorage.getItem('gentle-decor')||'simple';document.documentElement.dataset.dark=String(isDark);$('.modeText').textContent=isDark?'日间':'夜间';$('.modeIcon').textContent=isDark?'☼':'◐';$$('[data-decor-choice]').forEach(b=>b.classList.toggle('active',b.dataset.decorChoice===document.documentElement.dataset.decor));$$('#themes [data-theme]').forEach(b=>b.classList.toggle('active',document.documentElement.dataset.decor==='simple'&&b.dataset.theme===document.documentElement.dataset.theme));if($('#days').children.length)renderCalendar();randomizeCharacters()}
  $('#dark').onclick=()=>{localStorage.setItem('gentle-dark',document.documentElement.dataset.dark==='true'?'0':'1');applyTheme()};
  const weekNames=['周日','周一','周二','周三','周四','周五','周六'];
  function showPage(id){if(!['home','records','schedule'].includes(id))id='home';$$('.page').forEach(p=>p.classList.toggle('active',p.id===id));window.scrollTo({top:0,behavior:'smooth'});setTimeout(randomizeCharacters,0)}
  const scheduleHTML=(x,del='')=>`<div class="scheduleItem"><b>${esc(x.name)}</b>${x.time?`<span>${icons.clock}${esc(x.time)}</span>`:''}${x.place?`<span>${icons.pin}${esc(x.place)}</span>`:''}${del}</div>`;
  const scheduleEditHTML=(x,i,j)=>`<div class="scheduleEditItem"><input class="scheduleEditName" data-se="${i},${j},name" value="${esc(x.name)}" aria-label="课程或活动名称"><label>${icons.clock}<input data-se="${i},${j},time" value="${esc(x.time||'')}" placeholder="时间"></label><label>${icons.pin}<input data-se="${i},${j},place" value="${esc(x.place||'')}" placeholder="地点"></label><button class="del" data-sdel="${i},${j}" aria-label="删除">${icons.trash}</button></div>`;
  function renderSchedule(){const items=extra.schedule[parseDay(selected).getDay()]||[];$('#todaySchedule').innerHTML=items.length?items.slice(0,3).map(x=>scheduleHTML(x)).join('')+(items.length>3?`<small class="moreSchedule">还有 ${items.length-3} 项</small>`:''):'<p class="empty">这一天还没有固定安排。</p>';$('#weekEditor').innerHTML=weekNames.map((n,i)=>`<article class="card dayEdit"><h2>${n}</h2><div class="scheduleFields"><input data-sname="${i}" placeholder="课程或活动名称"><input data-stime="${i}" placeholder="时间，例如 10:00–11:30"><input data-splace="${i}" placeholder="地点"><button data-sadd="${i}">＋ 添加</button></div><div>${(extra.schedule[i]||[]).map((x,j)=>scheduleEditHTML(x,i,j)).join('')}</div></article>`).join('');$$('[data-sadd]').forEach(b=>b.onclick=()=>{const i=+b.dataset.sadd,name=$(`[data-sname="${i}"]`).value.trim(),time=$(`[data-stime="${i}"]`).value.trim(),place=$(`[data-splace="${i}"]`).value.trim();if(name){extra.schedule[i].push({name,time,place});renderSchedule()}});$$('[data-se]').forEach(input=>input.oninput=()=>{const [i,j,field]=input.dataset.se.split(',');extra.schedule[+i][+j][field]=input.value});$$('[data-sdel]').forEach(b=>b.onclick=()=>{const [i,j]=b.dataset.sdel.split(',').map(Number);extra.schedule[i].splice(j,1);renderSchedule()})}
  let scheduleSnapshot=null;
  $('.hero>div:first-child').append($('.schedulePreview'));$('#openSchedule').textContent='编辑每周安排';$('#openSchedule').onclick=()=>{scheduleSnapshot=JSON.stringify(extra.schedule);renderSchedule();showPage('schedule')};$('#cancelSchedule').onclick=()=>{if(scheduleSnapshot)extra.schedule=JSON.parse(scheduleSnapshot);scheduleSnapshot=null;renderSchedule();showPage('home')};$('#saveSchedule').onclick=()=>{saveExtra();scheduleSnapshot=null;renderSchedule();showPage('home')};
  function render(){renderTop();renderCalendar();renderTodos();renderCarry();renderChecks();renderMeals();renderAssets();renderExpenses();renderSchedule();bindAddTags();setTimeout(randomizeCharacters,0)}
  document.addEventListener('click',e=>{const button=e.target.closest('[data-edit-exp],[data-edit-food]');if(!button)return;e.preventDefault();e.stopImmediatePropagation();const row=button.closest('.expenseRow,.foodRow'),view=row.querySelector('.expenseView,.foodView'),edit=row.querySelector('.inlineEdit');if(!edit)return;view.hidden=true;edit.hidden=false;edit.classList.add('recordEditPopup');const labels=button.hasAttribute('data-edit-exp')?['金额','商户','备注','标签']:['标签','食物或饮品'];[...edit.querySelectorAll('input,select')].forEach((field,i)=>{if(field.parentElement?.classList.contains('recordEditField'))return;const wrap=document.createElement('label');wrap.className='recordEditField';wrap.append(document.createTextNode(labels[i]||'内容'));field.before(wrap);wrap.append(field)})},true);
  applyTheme();render();
})();
