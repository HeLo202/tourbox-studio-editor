export const CONTROLS = [
  {id:'extra1',name:'新增键 1',ref:'主板 UA12',position:'R1 · C3'},
  {id:'extra2',name:'新增键 2',ref:'主板 UA14',position:'R1 · C5'},
  {id:'extra3',name:'新增键 3',ref:'主板 SW11',position:'R2 · C2'},
  {id:'extra4',name:'新增键 4',ref:'主板 SW12',position:'R3 · C2'},
  {id:'extra5',name:'新增键 5',ref:'副板 SW23',position:'R4 · C2'},
  {id:'stickPress',name:'摇杆按压',ref:'主板 VR1',position:'R2 · C1'},
  {id:'stickUp',name:'摇杆向上',ref:'VR1 Y 轴',position:'低电平'},
  {id:'stickDown',name:'摇杆向下',ref:'VR1 Y 轴',position:'高电平'},
  {id:'stickLeft',name:'摇杆向左',ref:'VR1 X 轴',position:'低电平'},
  {id:'stickRight',name:'摇杆向右',ref:'VR1 X 轴',position:'高电平'}
];
export const KEYS = [
  [0,'不发送普通按键'],
  ...Array.from({length:26},(_,i)=>[4+i,String.fromCharCode(65+i)]),
  ...Array.from({length:9},(_,i)=>[30+i,String(i+1)]),[39,'0'],
  [40,'Enter'],[41,'Esc'],[42,'Backspace'],[43,'Tab'],[44,'Space'],
  [45,'-'],[46,'='],[47,'['],[48,']'],[49,'\\'],[51,';'],[52,"'"],[53,'`'],[54,','],[55,'.'],[56,'/'],
  ...Array.from({length:12},(_,i)=>[58+i,`F${i+1}`]),
  [70,'Print Screen'],[71,'Scroll Lock'],[72,'Pause'],[73,'Insert'],[74,'Home'],[75,'Page Up'],[76,'Delete'],[77,'End'],[78,'Page Down'],[79,'右方向键'],[80,'左方向键'],[81,'下方向键'],[82,'上方向键'],
  ...Array.from({length:12},(_,i)=>[104+i,`F${i+13}`])
];
const MAGIC = new TextEncoder().encode('TBPRF001');
const isInt=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
export function newProfile(name='默认预设') {
  return {format:'tourbox-studio-profile',version:1,name,
    actions:CONTROLS.map(()=>({mod:0,key:0})),
    calibration:{centerX:2048,centerY:2048,threshold:900,hysteresis:150}};
}
export function validateProfile(p) {
  if (!p || p.format!=='tourbox-studio-profile' || p.version!==1 || typeof p.name!=='string' || !p.name.trim() || p.name.length>40 || !Array.isArray(p.actions) || p.actions.length!==10) throw Error('预设格式或名称无效');
  for (const a of p.actions) if (!a || !isInt(a.mod,0,15) || !isInt(a.key,0,115) || (a.key>0 && a.key<4) || !KEYS.some(([key])=>key===a.key)) throw Error('包含不支持的快捷键');
  const c=p.calibration;
  if (!c || !isInt(c.centerX,300,3795) || !isInt(c.centerY,300,3795) || !isInt(c.threshold,200,1800) || !isInt(c.hysteresis,0,Math.floor(c.threshold/2))) throw Error('摇杆校准参数超出范围');
  return {format:'tourbox-studio-profile',version:1,name:p.name.trim(),actions:p.actions.map(a=>({mod:a.mod,key:a.key})),calibration:{centerX:c.centerX,centerY:c.centerY,threshold:c.threshold,hysteresis:c.hysteresis}};
}
export function crc32(bytes) {
  let crc=0xffffffff;
  for (const byte of bytes) {crc^=byte;for(let i=0;i<8;i++) crc=(crc>>>1)^(0xedb88320 & -(crc&1));}
  return (~crc)>>>0;
}
export function encodeProfile(input) {
  const p=validateProfile(input), out=new Uint8Array(40), view=new DataView(out.buffer);
  out.set(MAGIC); p.actions.forEach((a,i)=>{out[8+2*i]=a.mod;out[9+2*i]=a.key;});
  ['centerX','centerY','threshold','hysteresis'].forEach((key,i)=>view.setUint16(28+2*i,p.calibration[key],true));
  view.setUint32(36,crc32(out.subarray(0,36)),true); return out;
}
export function decodeProfile(bytes,name='设备中的预设') {
  if (!(bytes instanceof Uint8Array) || bytes.length!==40 || !MAGIC.every((v,i)=>bytes[i]===v)) throw Error('固件预设标记无效');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if (view.getUint32(36,true)!==crc32(bytes.subarray(0,36))) throw Error('预设校验失败');
  return validateProfile({format:'tourbox-studio-profile',version:1,name,actions:CONTROLS.map((_,i)=>({mod:bytes[8+2*i],key:bytes[9+2*i]})),calibration:{centerX:view.getUint16(28,true),centerY:view.getUint16(30,true),threshold:view.getUint16(32,true),hysteresis:view.getUint16(34,true)}});
}
export function patchUf2(source,profile) {
  if (!(source instanceof Uint8Array) || !source.length || source.length%512) throw Error('固件文件不是有效的 UF2');
  const out=source.slice(), dv=new DataView(out.buffer), count=out.length/512, image=new Uint8Array(count*256);
  for (let i=0;i<count;i++) {
    const b=i*512, addr=dv.getUint32(b+12,true), len=dv.getUint32(b+16,true);
    if(dv.getUint32(b,true)!==0x0a324655||dv.getUint32(b+4,true)!==0x9e5d5157||dv.getUint32(b+508,true)!==0x0ab16f30||dv.getUint32(b+8,true)!==0x2000||dv.getUint32(b+28,true)!==0xada52840||len!==256||dv.getUint32(b+20,true)!==i||dv.getUint32(b+24,true)!==count||addr!==0x26000+i*256||addr+len>0xed000) throw Error('UF2 地址、机型或数据块不符合目标固件');
    image.set(out.subarray(b+32,b+288),i*256);
  }
  const matches=[];
  for(let i=0;i+40<=image.length;i++) {
    if(!MAGIC.every((v,j)=>image[i+j]===v)) continue;
    try {decodeProfile(image.slice(i,i+40)); matches.push(i);} catch { /* Other compiled constants are not profile records. */ }
  }
  if(matches.length!==1) throw Error('未找到唯一有效的固件预设区域');
  const replacement=encodeProfile(profile), at=matches[0];
  for(let i=0;i<40;i++) {const pos=at+i, block=Math.floor(pos/256);out[block*512+32+pos%256]=replacement[i];}
  return out;
}
export function actionLabel(action) {
  const parts=[]; for(const [bit,name] of [[1,'Ctrl'],[2,'Shift'],[4,'Alt'],[8,'Win / Cmd']]) if(action.mod&bit) parts.push(name);
  const key=KEYS.find(([value])=>value===action.key)?.[1]; if(action.key && key) parts.push(key);
  return parts.length?parts.join(' + '):'未设置';
}
