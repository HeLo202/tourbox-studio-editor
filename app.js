import {CONTROLS,KEYS,newProfile,validateProfile,encodeProfile,decodeProfile,patchUf2,actionLabel} from './profile.js';

const $=selector=>document.querySelector(selector);
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STORE='tourbox-studio-profiles-v1';
let profiles, current=0, selected=0, device=null, toastTimer;
try {
  const saved=JSON.parse(localStorage.getItem(STORE)||'null');
  profiles=Array.isArray(saved)&&saved.length?saved.map(validateProfile):[newProfile()];
} catch { profiles=[newProfile()]; }
const matrix=[
  {title:'Side',ref:'副 SW11'}, {title:'Scroll 按压',ref:'副 SW22'}, {id:0}, {title:'Top',ref:'主 UA13'}, {id:1},
  {id:5}, {id:2}, {title:'Knob 按压',ref:'主 CE11-1'}, {title:'Tall',ref:'主 UA24'}, {title:'Short',ref:'主 UA25'},
  {title:'Tour',ref:'主 UB32'}, {id:3}, {title:'上',ref:'主 UB33'}, {title:'C1',ref:'主 UB34'}, {title:'C2',ref:'主 UB35'},
  {title:'Dial 按压',ref:'副 SW41A'}, {id:4}, {title:'左',ref:'主 UA42'}, {title:'下',ref:'主 UA43'}, {title:'右',ref:'主 UA44'}
];
function message(text) {const el=$('#toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),4800);}
function save() {try{localStorage.setItem(STORE,JSON.stringify(profiles));}catch{message('浏览器无法保存预设，请及时导出 JSON。');}}
function refresh() {
  const p=profiles[current];
  $('#profile-title').textContent=p.name;
  $('#profile-list').innerHTML=profiles.map((x,i)=>`<button class="profile ${i===current?'active':''}" data-profile="${i}"><span class="profile-icon">${String(i+1).padStart(2,'0')}</span>${escapeHtml(x.name)}</button>`).join('');
  $('#matrix').innerHTML=matrix.map((x,i)=>x.id===undefined?`<div class="matrix-key" aria-label="${escapeHtml(x.title)}，由原版 Console 设置">${escapeHtml(x.title)}<small>${escapeHtml(x.ref)}</small></div>`:`<button class="matrix-key extra ${selected===x.id?'selected':''}" data-control="${x.id}">${escapeHtml(CONTROLS[x.id].name)}<small>${escapeHtml(CONTROLS[x.id].ref)}</small></button>`).join('');
  $('#directions').innerHTML=[[6,'↑'],[7,'↓'],[8,'←'],[9,'→']].map(([id,label])=>`<button class="direction ${selected===id?'selected':''}" data-control="${id}" aria-label="${CONTROLS[id].name}">${label}</button>`).join('');
  const c=CONTROLS[selected], a=p.actions[selected];
  $('#inspector').innerHTML=`<div class="section-head"><span class="eyebrow">CONTROL SETTINGS</span><h2>${escapeHtml(c.name)}</h2><p>${escapeHtml(c.ref)} · ${escapeHtml(c.position)}</p></div>
    <h3>键盘快捷键</h3><p>按住实体控件时发送；松开时释放。</p>
    <label class="field-label" for="key-select">普通按键</label><select id="key-select" class="select">${KEYS.map(([value,label])=>`<option value="${value}" ${a.key===value?'selected':''}>${escapeHtml(label)}</option>`).join('')}</select>
    <span class="field-label">修饰键</span><div class="mods">${[[1,'Ctrl'],[2,'Shift'],[4,'Alt'],[8,'Win / Cmd']].map(([bit,label])=>`<label class="mod"><input type="checkbox" data-mod="${bit}" ${a.mod&bit?'checked':''}>${label}</label>`).join('')}</div>
    <div class="shortcut-preview"><small>当前动作</small><strong>${escapeHtml(actionLabel(a))}</strong></div>
    <p class="hint">快捷键由改版固件作为 USB 键盘发送。原版控件仍由 TourBox Console 处理。</p>
    <h3>摇杆校准</h3><p>数值为 12 位 ADC 读数。方向标签按当前约定显示，需以实物确认。</p>
    <div class="cal-grid">${[['centerX','X 中心'],['centerY','Y 中心'],['threshold','触发阈值'],['hysteresis','回中迟滞']].map(([key,label])=>`<label><span class="field-label">${label}</span><input class="number" data-cal="${key}" type="number" value="${p.calibration[key]}"></label>`).join('')}</div>
    <button class="text-button" id="read-center" style="margin-top:15px">读取当前摇杆中心</button>
    <div style="margin-top:30px"><button class="text-button" id="delete-profile">删除当前预设</button></div>`;
}
function download(name,bytes,type) {const blob=new Blob([bytes],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function fileName(name) {return name.replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').slice(0,40)||'preset';}
document.addEventListener('click',event=>{
  const profile=event.target.closest('[data-profile]'); if(profile){current=Number(profile.dataset.profile);refresh();return;}
  const control=event.target.closest('[data-control]'); if(control){selected=Number(control.dataset.control);refresh();return;}
  if(event.target.id==='delete-profile'){
    if(profiles.length===1){message('至少保留一个预设。');return;}
    if(confirm(`删除“${profiles[current].name}”？`)){profiles.splice(current,1);current=0;save();refresh();}
  }
});
$('#inspector').addEventListener('change',event=>{
  const p=profiles[current], el=event.target;
  if(el.id==='key-select') p.actions[selected].key=Number(el.value);
  else if(el.dataset.mod){const bit=Number(el.dataset.mod);p.actions[selected].mod=el.checked?p.actions[selected].mod|bit:p.actions[selected].mod&~bit;}
  else if(el.dataset.cal){const draft=structuredClone(p);draft.calibration[el.dataset.cal]=Number(el.value);try{profiles[current]=validateProfile(draft);}catch(error){message(error.message);refresh();return;}}
  else return;
  save();refresh();
});
$('#new-profile').addEventListener('click',()=>{const draft=structuredClone(profiles[current]);draft.name=`预设 ${profiles.length+1}`;profiles.push(draft);current=profiles.length-1;save();refresh();});
$('#rename').addEventListener('click',()=>{const name=prompt('预设名称（最多 40 字）',profiles[current].name);if(name===null)return;try{profiles[current]=validateProfile({...profiles[current],name});save();refresh();}catch(e){message(e.message);}});
$('#export-button').addEventListener('click',()=>download(`${fileName(profiles[current].name)}.tourbox.json`,JSON.stringify(profiles[current],null,2),'application/json'));
$('#import-button').addEventListener('click',()=>$('#import-file').click());
$('#import-file').addEventListener('change',async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>100000)throw Error('预设文件过大');const p=validateProfile(JSON.parse(await file.text()));profiles.push(p);current=profiles.length-1;save();refresh();message('预设已导入。');}catch(error){message(`导入失败：${error.message}`);}finally{e.target.value='';}});
function setConnection(value) {device=value;$('#device-status').textContent=value?'设备已连接':'设备未连接';$('#device-status').classList.toggle('connected',!!value);$('#connect').textContent=value?'断开设备':'连接设备';}
async function readDevice() {
  if(!device?.opened) throw Error('请先连接运行本项目固件的设备');
  const view=await device.receiveFeatureReport(0), bytes=new Uint8Array(view.buffer,view.byteOffset,view.byteLength);
  if(bytes.length!==64 || String.fromCharCode(...bytes.slice(0,4))!=='TBC1' || bytes[4]!==1 || bytes[7]!==40) throw Error('设备协议不匹配');
  return {bytes,profile:decodeProfile(bytes.slice(8,48)),status:bytes[5],write:bytes[6],x:bytes[48]|bytes[49]<<8,y:bytes[50]|bytes[51]<<8,adcValid:!!bytes[52]};
}
$('#connect').addEventListener('click',async()=>{
  if(device){try{await device.close();}catch{}setConnection(null);return;}
  if(!navigator.hid){message('请使用支持 WebHID 的桌面版 Chrome 或 Edge，并通过 HTTPS 或 localhost 打开。');return;}
  try{
    const choices=await navigator.hid.requestDevice({filters:[{vendorId:0xc251,productId:0x2005,usagePage:0xff60}]});
    if(!choices.length)return;
    const chosen=choices[0]; await chosen.open();setConnection(chosen);
    try {const state=await readDevice();if(state.status&32) message('设备已连接，但 NFC 复用模式阻止了矩阵扫描。');else message('设备已连接。');}
    catch(error){await chosen.close();setConnection(null);throw error;}
  }catch(error){message(`连接失败：${error.message}`);}
});
if(navigator.hid) navigator.hid.addEventListener('disconnect',event=>{if(event.device===device){setConnection(null);message('设备已断开。');}});
$('#apply').addEventListener('click',async()=>{
  try{
    if(!device?.opened)throw Error('请先连接设备');
    const desired=encodeProfile(profiles[current]), packet=new Uint8Array(64);packet[0]=1;packet.set(desired,1);
    await device.sendFeatureReport(0,packet);const state=await readDevice();
    if(state.write!==1 || !desired.every((v,i)=>v===state.bytes[8+i])) throw Error('设备未确认预设');
    message('已临时应用并读回；断电后恢复刷入固件中的预设。');
  }catch(error){message(`应用失败：${error.message}`);}
});
$('#inspector').addEventListener('click',async event=>{
  if(event.target.id!=='read-center')return;
  try {const state=await readDevice();if(!state.adcValid)throw Error('设备没有有效的摇杆读数，请先确认接板、扫描和 Console 会话');
    const draft=structuredClone(profiles[current]);draft.calibration.centerX=state.x;draft.calibration.centerY=state.y;profiles[current]=validateProfile(draft);save();refresh();message('已读取摇杆中心；请应用或下载固件保存。');
  }catch(error){message(`无法读取：${error.message}`);}
});
$('#download').addEventListener('click',async()=>{
  try {const response=await fetch('./assets/tourbox-studio-v1-app-26000.uf2');if(!response.ok)throw Error('无法加载固件模板');const bytes=patchUf2(new Uint8Array(await response.arrayBuffer()),profiles[current]);download(`${fileName(profiles[current].name)}-tourbox.uf2`,bytes,'application/octet-stream');message('固件已生成；请按说明核对板型后刷入。');}
  catch(error){message(`生成失败：${error.message}`);}
});
refresh();
