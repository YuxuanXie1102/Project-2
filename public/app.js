(async () => {
  'use strict';
  // 先加载后端数据，再生成页面；连接失败时保留备份，避免写入空数据。
  if (!window.GentleAPI || !await window.GentleAPI.init()) return;
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
    checks: []
  });
  const read = () => { try { return JSON.parse(localStorage.getItem('gentle-static')) || {}; } catch { return {}; } };
  const store = read();
  const readExtra=()=>{try{return JSON.parse(localStorage.getItem('gentle-extra'))||{}}catch{return {}}};
  const extra=readExtra();
  extra.schedule ||= Array.from({length:7},()=>[]);
  extra.todoCats ||= [['作业','#8e82c4'],['商务','#68a4b8'],['日常','#e19b72'],['预约','#c97fa0'],['其他','#8da17e']];
  const seedChecks=[
    {id:'keys',text:'带好钥匙和手机',important:false},{id:'water',text:'带一杯水',important:false},
    {id:'door',text:'确认门已锁好',important:true},{id:'power',text:'确认电源已关闭',important:true}
  ];
  let selected = key(today), shown = new Date(today), pending = null, todoCat = '日常';
  const day = (k = selected) => store[k] ||= defaults();
  const save = () => {localStorage.setItem('gentle-static', JSON.stringify(store));window.GentleAPI.save()};
  const saveExtra=()=>{localStorage.setItem('gentle-extra',JSON.stringify(extra));window.GentleAPI.save()};
  const cnDate = d => `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
  const weekdays = '日一二三四五六';
  if(!Array.isArray(extra.checkTemplates)){
    extra.checkTemplates=[];
    Object.entries(store).sort(([a],[b])=>a.localeCompare(b)).forEach(([date,data])=>(data.checks||[]).forEach(x=>{if(!extra.checkTemplates.some(t=>t.id===x.id||t.text===x.text))extra.checkTemplates.push({id:x.id||uid(),text:x.text,important:!!x.important,start:date,repeat:'daily',weekdays:[]})}));
    if(!extra.checkTemplates.length)extra.checkTemplates=seedChecks.map(x=>({...x,start:key(today),repeat:'daily',weekdays:[]}));
  }
  extra.carryDefaults ||= [];
  save();saveExtra();

  const icons = {
    clock:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    pin:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    check:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>',
    sparkle:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 1.4 4.1L17.5 9l-4.1 1.9L12 15l-1.4-4.1L6.5 9l4.1-1.9Z"/></svg>',
    lock:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></svg>',
    trash:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/></svg>'
  };
  const iconizeDeletes=(root=document)=>$$('button',root).forEach(b=>{if(/^删除(?:这个项目)?$/.test(b.textContent.trim())){b.classList.add('del');b.setAttribute('aria-label',b.textContent.trim());b.innerHTML=icons.trash}});
  new MutationObserver(records=>records.forEach(r=>r.addedNodes.forEach(n=>{if(n.nodeType===1)iconizeDeletes(n)}))).observe(document.body,{childList:true,subtree:true});iconizeDeletes();
  const todoCats=extra.todoCats;
  extra.archivedColors ||= {todo:{}};
  const label=(name,color)=>`<span class="colorTag" style="--tag:${color}"><i></i>${esc(name)}</span>`;
  const colorFor=(kind,name,list)=>list.find(x=>x[0]===name)?.[1]||extra.archivedColors[kind]?.[name]||'#8da17e';
  const checkApplies=(x,k)=>{if(k<x.start)return false;const dow=parseDay(k).getDay();return x.repeat==='daily'||(x.repeat==='once'&&k===x.start)||(x.repeat==='weekly'&&(x.weekdays||[]).includes(dow))};
  const checksFor=(k=selected)=>{
    const templates=extra.checkTemplates.filter(x=>checkApplies(x,k)).map(x=>{const state=(store[k]?.checks||[]).find(s=>s.id===x.id);return {...x,done:!!state?.done}});
    const ids=new Set(extra.checkTemplates.map(x=>x.id));const legacy=(store[k]?.checks||[]).filter(x=>!ids.has(x.id));return [...templates,...legacy];
  };
  const setCheckDone=(item,done)=>{let state=day().checks.find(x=>x.id===item.id);if(!state){state={id:item.id,text:item.text,important:item.important,done:false};day().checks.push(state)}state.done=done;save()};
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
    $('#checks').innerHTML=[false,true].map(important=>`<section class="checkBox ${important?'important':''}"><header>${important?icons.lock:icons.sparkle}<span><b>${important?'重要确认':'轻松打卡'}</b><small>${important?'确认后才会完成':'点一下就好'}</small></span></header>${items.filter(c=>c.important===important).map(c=>`<div class="checkRow ${c.done?'done':''}"><button class="tick" data-check="${c.id}">${c.done?icons.check:''}</button><span>${esc(c.text)}</span></div>`).join('')||'<p class="checkEmpty">这一天没有待确认事项</p>'}</section>`).join('');
    $$('[data-check]').forEach(b=>b.onclick=()=>{const c=items.find(x=>x.id===b.dataset.check);if(c.important&&!c.done){pending=c;$('#confirmText').textContent=`确定已经“${c.text}”了吗？`;$('#confirm').classList.add('open')}else{setCheckDone(c,!c.done);render()}});
  }
  $('#cancel').onclick=()=>$('#confirm').classList.remove('open');
  $('#yes').onclick=()=>{if(pending){setCheckDone(pending,true);pending=null;render()}$('#confirm').classList.remove('open')};

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

  document.body.insertAdjacentHTML('afterbegin','<div class="geoShapes" aria-hidden="true"><i class="circle g1"></i><i class="star g2"></i><i class="circle g3"></i><i class="star g4"></i><i class="circle g5"></i><i class="star g6"></i><i class="circle g7"></i><i class="star g8"></i><i class="circle g9"></i><i class="star g10"></i><i class="circle g11"></i><i class="star g12"></i><i class="circle g13"></i></div><div class="themeCharacters" aria-hidden="true"><i></i><i></i><i></i></div>');
  $('.calendar').insertAdjacentHTML('afterbegin','<i class="todayMascot" aria-hidden="true"></i>');
  document.body.insertAdjacentHTML('beforeend','<div class="overlay" id="tagManager"><div class="modal tagModal"><div class="title"><h2 id="tagTitle">编辑标签</h2><button id="closeTags">✕</button></div><div id="tagRows"></div><div class="tagAdd"><input id="newTagName" placeholder="新标签名称"><button id="createTag">添加标签</button></div><p class="tagHint">新标签会自动获得柔和颜色；删除已使用的标签时，旧记录会保留原名称和颜色。</p></div></div>');
  const tagKind='todo';
  const tagTarget=()=>todoCats;
  const tagField=()=>'todos';
  function renderTagManager(){const target=tagTarget();$('#tagTitle').textContent='编辑待办标签';$('#tagRows').innerHTML=target.map((x,i)=>`<div class="tagManageRow"><input type="color" value="${x[1]}" data-tag-color="${i}" aria-label="标签颜色"><input value="${esc(x[0])}" data-tag-name="${i}" aria-label="标签名称"><button data-tag-delete="${i}" ${target.length===1?'disabled':''}>删除</button></div>`).join('');$$('[data-tag-color]').forEach(i=>i.onchange=()=>{target[+i.dataset.tagColor][1]=i.value;saveExtra();render()});$$('[data-tag-name]').forEach(i=>i.onchange=()=>{const idx=+i.dataset.tagName,old=target[idx][0],name=i.value.trim();if(!name||target.some((x,j)=>j!==idx&&x[0]===name)){i.value=old;return}target[idx][0]=name;Object.values(store).forEach(d=>(d[tagField()]||[]).forEach(x=>{if((x.cat||'日常')===old)x.cat=name}));if(todoCat===old)todoCat=name;save();saveExtra();render();renderTagManager()});$$('[data-tag-delete]').forEach(b=>b.onclick=()=>{const idx=+b.dataset.tagDelete,[name,color]=target[idx];if(!confirm(localStorage.getItem('gentle-language')==='en'?`Remove label “${name}”? Past records will keep it.`:`移除标签“${name}”？旧记录会继续保留这个标签。`))return;extra.archivedColors[tagKind][name]=color;target.splice(idx,1);if(todoCat===name)todoCat=todoCats[0]?.[0]||'';saveExtra();render();renderTagManager()})}
  function bindAddTags(){ $$('[data-add-tag]').forEach(b=>b.textContent='编辑标签') }
  document.addEventListener('click',e=>{const b=e.target.closest('[data-add-tag]');if(!b)return;renderTagManager();$('#tagManager').classList.add('open')});
  $('#closeTags').onclick=()=>$('#tagManager').classList.remove('open');$('#tagManager').onclick=e=>{if(e.target===$('#tagManager'))$('#tagManager').classList.remove('open')};$('#createTag').onclick=()=>{const name=$('#newTagName').value.trim(),target=tagTarget(),palette=['#d8a76d','#d8897c','#83a98f','#c78fab','#73a2b6','#9786c4'];if(!name||target.some(x=>x[0]===name))return;target.push([name,palette[target.length%palette.length]]);$('#newTagName').value='';saveExtra();render();renderTagManager()};

  $('#reportBtn').onclick=()=>{const d=day(),checks=checksFor(),done=checks.filter(x=>x.done).length,pct=checks.length?Math.round(done/checks.length*100):0;$('#reportTitle').textContent=`${cnDate(parseDay(selected))} · 小报告`;$('#score').textContent=`${pct}%`;$('#rTodo').textContent=`${d.todos.filter(x=>x.done).length}/${d.todos.length}`;$('#rChecks').textContent=`${done}/${checks.length}`;const carry=carryFor();$('#rCarry').textContent=`${carry.filter(x=>x.packed).length}/${carry.length}`;$('#rNote').textContent=pct>=75?'今天完成得很稳，剩下的明天再轻轻接住。':'记录本身就是一种整理，今天也已经留下了清晰的足迹。';$('#report').classList.add('open')};
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
  function showPage(id){if(!['home','schedule'].includes(id))id='home';$$('.page').forEach(p=>p.classList.toggle('active',p.id===id));window.scrollTo({top:0,behavior:'smooth'});setTimeout(randomizeCharacters,0)}
  const scheduleHTML=(x,del='')=>`<div class="scheduleItem"><b>${esc(x.name)}</b>${x.time?`<span>${icons.clock}${esc(x.time)}</span>`:''}${x.place?`<span>${icons.pin}${esc(x.place)}</span>`:''}${del}</div>`;
  const scheduleEditHTML=(x,i,j)=>`<div class="scheduleEditItem"><input class="scheduleEditName" data-se="${i},${j},name" value="${esc(x.name)}" aria-label="课程或活动名称"><label>${icons.clock}<input data-se="${i},${j},time" value="${esc(x.time||'')}" placeholder="时间"></label><label>${icons.pin}<input data-se="${i},${j},place" value="${esc(x.place||'')}" placeholder="地点"></label><button class="del" data-sdel="${i},${j}" aria-label="删除">${icons.trash}</button></div>`;
  function renderSchedule(){const items=extra.schedule[parseDay(selected).getDay()]||[];$('#todaySchedule').innerHTML=items.length?items.slice(0,3).map(x=>scheduleHTML(x)).join('')+(items.length>3?`<small class="moreSchedule">还有 ${items.length-3} 项</small>`:''):'<p class="empty">这一天还没有固定安排。</p>';$('#weekEditor').innerHTML=weekNames.map((n,i)=>`<article class="card dayEdit"><h2>${n}</h2><div class="scheduleFields"><input data-sname="${i}" placeholder="课程或活动名称"><input data-stime="${i}" placeholder="时间，例如 10:00–11:30"><input data-splace="${i}" placeholder="地点"><button data-sadd="${i}">＋ 添加</button></div><div>${(extra.schedule[i]||[]).map((x,j)=>scheduleEditHTML(x,i,j)).join('')}</div></article>`).join('');$$('[data-sadd]').forEach(b=>b.onclick=()=>{const i=+b.dataset.sadd,name=$(`[data-sname="${i}"]`).value.trim(),time=$(`[data-stime="${i}"]`).value.trim(),place=$(`[data-splace="${i}"]`).value.trim();if(name){extra.schedule[i].push({name,time,place});renderSchedule()}});$$('[data-se]').forEach(input=>input.oninput=()=>{const [i,j,field]=input.dataset.se.split(',');extra.schedule[+i][+j][field]=input.value});$$('[data-sdel]').forEach(b=>b.onclick=()=>{const [i,j]=b.dataset.sdel.split(',').map(Number);extra.schedule[i].splice(j,1);renderSchedule()})}
  let scheduleSnapshot=null;
  $('.hero>div:first-child').append($('.schedulePreview'));$('#openSchedule').textContent='编辑每周安排';$('#openSchedule').onclick=()=>{scheduleSnapshot=JSON.stringify(extra.schedule);renderSchedule();showPage('schedule')};$('#cancelSchedule').onclick=()=>{if(scheduleSnapshot)extra.schedule=JSON.parse(scheduleSnapshot);scheduleSnapshot=null;renderSchedule();showPage('home')};$('#saveSchedule').onclick=()=>{saveExtra();scheduleSnapshot=null;renderSchedule();showPage('home')};
  function render(){renderTop();renderCalendar();renderTodos();renderCarry();renderChecks();renderSchedule();bindAddTags();setTimeout(randomizeCharacters,0)}
  applyTheme();render();
})();


