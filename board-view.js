import {PCB_LAYOUT} from './pcb-data.js';

// ref identifies a physical component; action selects the existing profile slot.
// Console labels are provisional, but the ref and electrical matrix are fixed.
export const PHYSICAL_CONTROLS = [
  {ref:'main.UA12',label:'新增键 1',matrix:'R1C3',shape:'key',action:0},
  {ref:'main.UA13',label:'Top',matrix:'R1C4',shape:'key'},
  {ref:'main.UA14',label:'新增键 2',matrix:'R1C5',shape:'key',action:1},
  {ref:'main.UA24',label:'Tall',matrix:'R2C4',shape:'key'},
  {ref:'main.UA25',label:'Short',matrix:'R2C5',shape:'key'},
  {ref:'main.UB32',label:'Tour',matrix:'R3C1',shape:'key'},
  {ref:'main.UB33',label:'上',matrix:'R3C3',shape:'key'},
  {ref:'main.UB34',label:'C1',matrix:'R3C4',shape:'key'},
  {ref:'main.UB35',label:'C2',matrix:'R3C5',shape:'key'},
  {ref:'main.UA42',label:'左',matrix:'R4C3',shape:'key'},
  {ref:'main.UA43',label:'下',matrix:'R4C4',shape:'key'},
  {ref:'main.UA44',label:'右',matrix:'R4C5',shape:'key'},
  {ref:'main.CE11-1',label:'Knob',matrix:'R2C3',shape:'dial',detail:'旋转与按压'},
  {ref:'main.VR1',label:'摇杆按压',matrix:'R2C1',shape:'joystick',action:5,detail:'按压与方向'},
  {ref:'main.SW11',label:'新增 3',matrix:'R2C2',shape:'side',action:2},
  {ref:'main.SW12',label:'新增 4',matrix:'R3C2',shape:'side',action:3},
  {ref:'sub.SW11',label:'Side',matrix:'R1C1',shape:'side'},
  {ref:'sub.SW22',label:'Scroll 按压',display:'滚轮按压',matrix:'R1C2',shape:'side'},
  {ref:'sub.SW23',label:'新增 5',matrix:'R4C2',shape:'side',action:4},
  {ref:'sub.SW41A',label:'Dial',matrix:'R4C1',shape:'dial',detail:'旋转与按压'},
  {ref:'sub.ENC3',label:'Scroll',shape:'roller',detail:'旋转'}
];

export const physicalControlByRef = ref => PHYSICAL_CONTROLS.find(control=>control.ref===ref);
export const refForAction = action => action>=6 && action<=9 ? 'main.VR1' : PHYSICAL_CONTROLS.find(control=>control.action===action)?.ref;

function shortRef(ref) {
  const [board,name]=ref.split('.');
  return `${board==='main'?'主':'副'} ${name}`;
}

export function boardMarkup(layout=PCB_LAYOUT) {
  const main=layout.main;
  const polygon=layout.subOutline.map(([x,y])=>`${x},${y}`).join(' ');
  const bridges=layout.junction.y.map(y=>`<rect x="${layout.junction.x-0.7}" y="${y-0.22}" width="1.4" height="0.44" rx="0.18"/>`).join('');
  const controls=PHYSICAL_CONTROLS.map(control=>{
    const {x,y}=layout.controls[control.ref];
    const editable=control.action!==undefined;
    const ref=shortRef(control.ref);
    const spoken=`${ref}，${control.label}${control.matrix?'，'+control.matrix:''}${editable?'，可配置':'，由 TourBox Console 配置，名称待核对'}`;
    const label=editable?(control.display||control.label):`${control.display||control.label}？`;
    const shape=control.shape==='key'
      ? '<rect class="pcb-body" x="-7.7" y="-7.7" width="15.4" height="15.4" rx="1.55"/>'
      : control.shape==='dial'
        ? '<circle class="pcb-body" r="7.1"/><circle class="pcb-inner" r="5.5"/>'
        : control.shape==='joystick'
          ? '<circle class="pcb-body" r="6.3"/><circle class="pcb-inner" r="4.9"/>'
          : control.shape==='roller'
            ? '<rect class="pcb-body" x="-5" y="-7" width="10" height="14" rx="3"/>'
            : '<rect class="pcb-body" x="-4.8" y="-3.7" width="9.6" height="7.4" rx="1.4"/>';
    const labelClass=control.shape==='side'?'pcb-label pcb-label-small':'pcb-label';
    const labelY=control.shape==='side'?-0.45:-0.65;
    const refY=control.shape==='side'?2.0:2.65;
    return `<g class="pcb-control ${editable?'editable':'console'} ${control.shape}" role="button" tabindex="0" aria-label="${spoken}" aria-pressed="false" data-physical="${control.ref}" transform="translate(${x} ${y})"><title>${spoken}</title>${shape}<text class="${labelClass}" y="${labelY}">${label}</text><text class="pcb-ref" y="${refY}">${ref}</text></g>`;
  }).join('');
  return `<polygon class="pcb-outline pcb-sub" points="${polygon}"/>
    <rect class="pcb-outline pcb-main" x="${main.x}" y="${main.y}" width="${main.width}" height="${main.height}" rx="${main.radius}"/>
    <g class="pcb-junction" aria-hidden="true">${bridges}</g>
    <text class="pcb-board-label" x="46" y="5">主板</text>
    <text class="pcb-board-label" x="16" y="56">副板</text>
    ${controls}`;
}
