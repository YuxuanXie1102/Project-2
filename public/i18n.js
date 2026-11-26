(() => {
  'use strict';
  const dictionary = {"夜间":"Dark","日间":"Light","今天，轻轻开始":"Start today gently","重要的事情都在这里，一次完成就好。":"Everything important is here. One step at a time.","今天":"Today","历史归档":"Past day","未来安排":"Plan ahead","每周安排":"Weekly schedule","编辑每周安排":"Edit weekly schedule","编辑安排 →":"Edit schedule →","这一天还没有固定安排。":"No scheduled activities for this day.","特定日期待办":"Tasks for this day","编辑标签":"Edit labels","写下一件需要记得的事…":"Write something to remember…","这一天还没有特定待办。":"No tasks for this day yet.","作业":"School","商务":"Business","日常":"Daily","预约":"Appointments","其他":"Other","出门检查 · 今天带了什么":"Before leaving · What to bring","位置每天清空":"Locations reset daily","添加今天要带的物品":"Add an item to bring","以后出门也带上":"Bring this next time too","今天还没有要带的物品。":"No items to bring today yet.","放在哪里":"Where is it?","今天不带":"Skip today","取消常带":"Stop bringing regularly","设为常带":"Bring regularly","待确认列表":"Confirmation list","编辑待确认":"Edit confirmations","轻松打卡":"Quick checks","点一下就好":"Just tap to check","重要确认":"Important confirmations","确认后才会完成":"Confirm before completing","带好钥匙和手机":"Bring keys and phone","带一杯水":"Bring some water","确认门已锁好":"Check the door is locked","确认电源已关闭":"Check the power is off","拍摄 / 上传":"Take / upload photo","查看照片":"View photo","日期":"Date","生成当日报告":"View daily report","回到今天":"Back to today","收起日历":"Collapse calendar","展开日历":"Expand calendar","待办完成":"Tasks completed","日常事项完成度":"Daily completion","今天完成得很稳，剩下的明天再轻轻接住。":"You made steady progress today. Take the rest one step at a time.","记录本身就是一种整理，今天也已经留下了清晰的足迹。":"Keeping a record is progress. You have left a clear trail today.","还没确认":"Not yet","确定完成":"Confirm done","待确认名称":"Confirmation name","确认类型":"Confirmation type","添加一项":"Add item","新的待确认事项":"New confirmation","未命名事项":"Untitled item","还没有待确认事项。":"No confirmations yet.","这一天没有待确认事项":"No confirmations for this day","仅今天":"Today only","每天":"Every day","自定义":"Custom","生效时间":"Starts on","可设置仅当天、每天，或自定义每周生效日期。":"Choose today only, every day, or specific weekdays.","添加标签":"Add label","新标签名称":"New label name","标签名称":"Label name","标签颜色":"Label color","标签":"Label","新标签会自动获得柔和颜色；删除已使用的标签时，旧记录会保留原名称和颜色。":"New labels receive a soft color. Past records keep their label names and colors when a label is removed.","课程、固定会议和活动都可以记录在这里。":"Add classes, regular meetings and activities here.","课程或活动名称":"Class or activity name","时间，例如 10:00–11:30":"Time, e.g. 10:00–11:30","时间":"Time","地点":"Location","周日":"Sunday","周一":"Monday","周二":"Tuesday","周三":"Wednesday","周四":"Thursday","周五":"Friday","周六":"Saturday","日":"Sun","一":"Mon","二":"Tue","三":"Wed","四":"Thu","五":"Fri","六":"Sat","添加确认照片":"Add confirmation photo","为这一次确认留下照片记录。":"Keep a photo of this confirmation.","拍摄照片":"Take a photo","上传照片":"Upload a photo","确认照片":"Confirmation photo","重新拍摄或上传":"Retake or upload","上传中…":"Uploading…","照片":"Photo","尚未选择":"Not selected","照片暂时没有上传成功，请稍后再试。":"The photo could not be uploaded. Please try again.","照片请控制在 8MB 以内。":"Please choose a photo smaller than 8 MB.","请选择照片文件。":"Please choose an image file.","保存":"Save","取消":"Cancel","删除":"Delete","编辑":"Edit","添加":"Add","返回":"Back","← 返回":"← Back","＋ 添加":"＋ Add","确认完成":"Confirmations completed","物品带齐":"Items packed"};
  let language = localStorage.getItem('gentle-language') === 'en' ? 'en' : 'zh-CN';
  const textCache = new WeakMap(), attributeCache = new WeakMap();
  const weekdays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const translate = source => {
    if (language !== 'en') return source;
    if (dictionary[source]) return dictionary[source];
    let m;
    if ((m=source.match(/^(\d{4})年\s*(\d{1,2})月(?:(\d{1,2})日)?$/))) return new Date(+m[1],+m[2]-1,+(m[3]||1),12).toLocaleDateString('en-CA',m[3]?{year:'numeric',month:'long',day:'numeric'}:{year:'numeric',month:'long'});
    if ((m=source.match(/^星期([日一二三四五六])$/))) return weekdays['日一二三四五六'.indexOf(m[1])];
    if ((m=source.match(/^今日确认 (.+)$/))) return `Today's checks ${m[1]}`;
    if ((m=source.match(/^还有 (\d+) 项$/))) return `${m[1]} more items`;
    if ((m=source.match(/^(\d+) 项$/))) return `${m[1]} items`;
    if ((m=source.match(/^(.+) · 小报告$/))) return `${translate(m[1])} · Daily report`;
    if ((m=source.match(/^确定已经“(.+)”了吗？$/))) return `Have you completed “${m[1]}”?`;
    if ((m=source.match(/^拍摄或上传于 (.+)$/))) return `Taken or uploaded at ${m[1]}`;
    if ((m=source.match(/^(.+) · 从 (.+) 开始$/))) return `${translate(m[1])} · From ${m[2]}`;
    if ((m=source.match(/^每周 (.+)$/))) return `Weekly: ${[...m[1]].map(c=>dictionary[c]||c).join('')}`;
    return source;
  };
  const observer = new MutationObserver(() => apply());
  const observe = () => observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['placeholder','aria-label','title']});
  function apply() {
    observer.disconnect();
    document.documentElement.lang=language;
    // Option labels may change, but their underlying category values must not.
    document.querySelectorAll('option:not([value])').forEach(option=>option.setAttribute('value',option.textContent));
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    let node;
    while ((node=walker.nextNode())) {
      if (!node.parentElement || node.parentElement.closest('script,style,[data-no-translate]')) continue;
      const previous=textCache.get(node);
      const source=previous&&node.nodeValue===previous.rendered?previous.source:node.nodeValue;
      const trimmed=source.trim(), rendered=trimmed?source.replace(trimmed,translate(trimmed)):source;
      textCache.set(node,{source,rendered});
      if(node.nodeValue!==rendered)node.nodeValue=rendered;
    }
    document.querySelectorAll('[placeholder],[aria-label],[title]').forEach(el=>{
      const cache=attributeCache.get(el)||{};
      for(const name of ['placeholder','aria-label','title']){
        if(!el.hasAttribute(name))continue;
        const current=el.getAttribute(name),old=cache[name],source=old&&current===old.rendered?old.source:current,rendered=translate(source);
        cache[name]={source,rendered};if(current!==rendered)el.setAttribute(name,rendered);
      }
      attributeCache.set(el,cache);
    });
    document.querySelectorAll('[data-language]').forEach(button=>{const selected=button.dataset.language===language;button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));});
    observe();
  }
  document.querySelectorAll('[data-language]').forEach(button=>button.onclick=()=>{language=button.dataset.language;localStorage.setItem('gentle-language',language);apply();});
  window.easyEverydayTranslate=translate;
  apply();
})();

