// TIMELINE
function buildBM(){const bm=document.getElementById('bmarks');bm.style.gridTemplateColumns=`repeat(${stepCount},1fr)`;bm.innerHTML='';for(let i=0;i<stepCount;i++){const d=document.createElement('div');d.className='bm'+(i%4===0?' b1':'');d.id=`bm${i}`;d.textContent=i%4===0?(Math.floor(i/4)+1):'·';bm.appendChild(d);}}
function buildSI(){const sr=document.getElementById('sindRow');sr.style.gridTemplateColumns=`repeat(${stepCount},1fr)`;sr.innerHTML='';for(let i=0;i<stepCount;i++){const d=document.createElement('div');d.className='si';d.id=`si${i}`;sr.appendChild(d);}}
function buildAllTracks(){const c=document.getElementById('trackRows');c.innerHTML='';KITS[curKit].tracks.forEach((tr,ti)=>{const key=`${curKit}_${ti}`;if(!dGrid[key])dGrid[key]=Array.from({length:stepCount},(_,i)=>(KITS[curKit].defs[tr.id]||[])[i]?{on:1,vel:.8}:{on:0,vel:.8});if(dVols[key]===undefined)dVols[key]=tr.vel;if(dMuted[key]===undefined)dMuted[key]=false;if(!dSD[key])dSD[key]={};buildDrumRow(tr,ti,key,c);});iTracks.forEach(t=>buildInstRow(t,c));refreshSampler();}
function buildDrumRow(tr,ti,key,c){
  const row=document.createElement('div');row.className='tl-tr'+(selId===key?' sel':'');row.id=`tlr_${key}`;
  const left=document.createElement('div');left.className='tl-tl';
  const cb=document.createElement('div');cb.className='tcb';cb.style.cssText=`background:${tr.color};box-shadow:0 0 6px ${tr.color}55;`;
  const nm=document.createElement('div');nm.className='tnm';nm.textContent=tr.name;
  const vol=document.createElement('input');vol.type='range';vol.min=0;vol.max=1;vol.step=.01;vol.value=dVols[key];vol.className='tvol';
  vol.style.background=`linear-gradient(to right,${tr.color} ${vol.value*100}%,rgba(255,255,255,.06) ${vol.value*100}%)`;
  vol.addEventListener('input',e=>{e.stopPropagation();dVols[key]=parseFloat(vol.value);vol.style.background=`linear-gradient(to right,${tr.color} ${vol.value*100}%,rgba(255,255,255,.06) ${vol.value*100}%)`;markDirty();});
  const mt=document.createElement('button');mt.className='tmt'+(dMuted[key]?' on':'');mt.textContent='M';
  mt.addEventListener('click',e=>{e.stopPropagation();dMuted[key]=!dMuted[key];mt.className='tmt'+(dMuted[key]?' on':'');});
  left.append(cb,nm,vol,mt);
  const right=document.createElement('div');right.className='tl-tr-r';
  const grid=document.createElement('div');grid.className='mgrid';grid.style.gridTemplateColumns=`repeat(${stepCount},1fr)`;
  for(let s=0;s<stepCount;s++){
    const cell=document.createElement('div');const sd=dGrid[key][s];
    cell.className='ms'+(s%4===0?' ba':'')+(sd&&sd.on?' on':'');cell.dataset.s=s;
    if(sd&&sd.on){cell.style.background=tr.color;cell.style.opacity='.82';}
    const vb=document.createElement('div');vb.className='vb';vb.style.height=`${(sd&&sd.vel||.8)*3}px`;cell.appendChild(vb);
    cell.addEventListener('click',e=>{e.stopPropagation();iCtx();const sd2=dGrid[key][s];const on=!(sd2&&sd2.on);dGrid[key][s]={on:on?1:0,vel:sd2?sd2.vel:.8};cell.classList.toggle('on',on);if(on){cell.style.background=tr.color;cell.style.opacity='.82';playDrum(tr.type,dVols[key]*(dGrid[key][s].vel||.8),null,dSD[key]);}else{cell.style.background='';cell.style.opacity='';}markDirty();syncDS(key,s);});
    cell.addEventListener('contextmenu',e=>{e.preventDefault();const sd2=dGrid[key][s];if(sd2&&sd2.on){sd2.vel=sd2.vel>=.9?.2:sd2.vel+.2;vb.style.height=`${sd2.vel*3}px`;markDirty();}});
    grid.appendChild(cell);
  }
  right.appendChild(grid);
  row.addEventListener('click',()=>selTrack(key,'drum',tr));
  row.append(left,right);c.appendChild(row);
}
function buildInstRow(track,c){
  const row=document.createElement('div');row.className='tl-tr'+(selId===track.id?' sel':'');row.id=`tlr_${track.id}`;
  const left=document.createElement('div');left.className='tl-tl';
  const cb=document.createElement('div');cb.className='tcb';cb.style.cssText=`background:${track.def.color};box-shadow:0 0 6px ${track.def.color}55;`;
  const nm=document.createElement('div');nm.className='tnm';nm.textContent=track.def.label;
  const vol=document.createElement('input');vol.type='range';vol.min=0;vol.max=1;vol.step=.01;vol.value=track.vol;vol.className='tvol';
  vol.style.background=`linear-gradient(to right,${track.def.color} ${track.vol*100}%,rgba(255,255,255,.06) ${track.vol*100}%)`;
  vol.addEventListener('input',e=>{e.stopPropagation();track.vol=parseFloat(vol.value);vol.style.background=`linear-gradient(to right,${track.def.color} ${track.vol*100}%,rgba(255,255,255,.06) ${track.vol*100}%)`;markDirty();});
  const mt=document.createElement('button');mt.className='tmt'+(track.muted?' on':'');mt.textContent='M';
  mt.addEventListener('click',e=>{e.stopPropagation();track.muted=!track.muted;mt.className='tmt'+(track.muted?' on':'');});
  const dl=document.createElement('button');dl.className='tmt';dl.textContent='✕';dl.style.marginLeft='2px';
  dl.addEventListener('click',e=>{e.stopPropagation();iTracks=iTracks.filter(t=>t.id!==track.id);buildAllTracks();if(selId===track.id){selId=null;showIdle();}markDirty();});
  left.append(cb,nm,vol,mt,dl);
  const right=document.createElement('div');right.className='tl-tr-r';
  const rr=document.createElement('div');rr.className='mrr';
  track.notes.slice(0,3).forEach(note=>{
    const rrow=document.createElement('div');rrow.className='mr-row';
    const lbl=document.createElement('div');lbl.className='mr-lbl';lbl.textContent=note;
    const cells=document.createElement('div');cells.className='mr-cells';cells.style.gridTemplateColumns=`repeat(${stepCount},1fr)`;cells.style.display='grid';cells.style.gap='2px';cells.style.flex='1';
    for(let s=0;s<stepCount;s++){
      const cell=document.createElement('div');const isOn=track.rollData[note]&&track.rollData[note][s];
      cell.className='mr-c'+(isOn?' on':'');cell.dataset.s=s;cell.dataset.note=note;
      if(isOn){cell.style.background=track.def.color;cell.style.opacity='.82';}
      cell.addEventListener('click',e=>{e.stopPropagation();iCtx();if(!track.rollData[note])track.rollData[note]=Array(stepCount).fill(0);const on=!track.rollData[note][s];track.rollData[note][s]=on?1:0;cell.classList.toggle('on',on);if(on){cell.style.background=track.def.color;cell.style.opacity='.82';playMel(track.type,note,track.octave,track.vol,null,track.sd);}else{cell.style.background='';cell.style.opacity='';}markDirty();syncPR(track.id,note,s);});
      cells.appendChild(cell);
    }
    rrow.append(lbl,cells);rr.appendChild(rrow);
  });
  right.appendChild(rr);
  row.addEventListener('click',()=>selTrack(track.id,'inst',track));
  row.append(left,right);c.appendChild(row);
}
// DETAIL PANEL
function selTrack(id,type,td){
  document.querySelectorAll('.tl-tr').forEach(r=>r.classList.remove('sel'));
  const row=document.getElementById(`tlr_${id}`);if(row)row.classList.add('sel');
  selId=id;selType=type;
  const color=type==='drum'?td.color:td.def.color;
  const name=type==='drum'?td.name:td.def.label;
  document.getElementById('dpDot').style.cssText=`background:${color};box-shadow:0 0 6px ${color};`;
  document.getElementById('dpTitle').textContent=name+(type==='drum'?' — Drum Track':' — Instrument Track');
  const tabs=document.getElementById('dtabs');tabs.innerHTML='';
  const tdefs=type==='drum'?[{id:'edit',l:'Sequencer'},{id:'sd',l:'Sound Design'},{id:'mix',l:'Mixer'}]:[{id:'edit',l:'Piano Roll'},{id:'sd',l:'Sound Design'},{id:'mix',l:'Mixer'}];
  tdefs.forEach(tab=>{const btn=document.createElement('button');btn.className='dtab'+(detMode===tab.id?' on':'');btn.textContent=tab.l;btn.addEventListener('click',()=>{detMode=tab.id;document.querySelectorAll('.dtab').forEach(b=>b.classList.remove('on'));btn.classList.add('on');renderDet(type,td,id);});tabs.appendChild(btn);});
  detMode='edit';renderDet(type,td,id);
}
function showIdle(){document.getElementById('dpTitle').textContent='Select a track above to edit';document.getElementById('dpDot').style.cssText='background:var(--teal);box-shadow:0 0 6px var(--teal);';document.getElementById('dtabs').innerHTML='';document.getElementById('dpContent').innerHTML='<div class="idle"><div class="idle-ic">↑</div><div class="idle-tx">Click any track in the timeline</div></div>';}
function renderDet(type,td,id){
  // Cancel any running mood animations before switching tabs
  if(window._activeAnimFrames){window._activeAnimFrames.forEach(f=>cancelAnimationFrame(f));window._activeAnimFrames.clear();}
  const dc=document.getElementById('dpContent');dc.innerHTML='';if(detMode==='mix'){renderMix(dc);return;}if(detMode==='sd'){type==='drum'?renderDSD(dc,id,td):renderISD(dc,td);return;}type==='drum'?renderDSeq(dc,id,td):renderPR(dc,td);}
function renderDSeq(dc,key,tr){
  const w=document.createElement('div');w.className='sdc';
  const lbls=document.createElement('div');lbls.className='dlbls';lbls.style.gridTemplateColumns=`repeat(${stepCount},1fr)`;
  for(let i=0;i<stepCount;i++){const l=document.createElement('div');l.className='dlbl'+(i%4===0?' cur':'');l.id=`dl${i}`;l.textContent=i%4===0?(Math.floor(i/4)+1):'·';lbls.appendChild(l);}
  w.appendChild(lbls);
  const g=document.createElement('div');g.className='dseq-g';g.style.gridTemplateColumns=`repeat(${stepCount},1fr)`;
  for(let s=0;s<stepCount;s++){
    const cell=document.createElement('div');const sd=dGrid[key][s];
    cell.className='ds'+(s%4===0?' ba':'')+(sd&&sd.on?' on':'');cell.dataset.s=s;cell.id=`dsc_${key}_${s}`;
    if(sd&&sd.on){cell.style.background=tr.color;cell.style.boxShadow=`inset 0 0 12px ${tr.color}44`;}
    const vb=document.createElement('div');vb.className='ds-vb';vb.style.cssText=`background:${tr.color};width:${(sd&&sd.vel||.8)*100}%;`;cell.appendChild(vb);
    cell.addEventListener('click',()=>{iCtx();const sd2=dGrid[key][s];const on=!(sd2&&sd2.on);dGrid[key][s]={on:on?1:0,vel:sd2?sd2.vel:.8};cell.classList.toggle('on',on);if(on){cell.style.background=tr.color;cell.style.boxShadow=`inset 0 0 12px ${tr.color}44`;playDrum(tr.type,dVols[key]*(dGrid[key][s].vel||.8),null,dSD[key]);}else{cell.style.background='';cell.style.boxShadow='';}vb.style.width=`${(dGrid[key][s].vel||.8)*100}%`;syncMD(key,s);markDirty();});
    cell.addEventListener('contextmenu',e=>{e.preventDefault();const sd2=dGrid[key][s];if(sd2&&sd2.on){sd2.vel=sd2.vel>=.9?.2:sd2.vel+.2;vb.style.width=`${sd2.vel*100}%`;markDirty();}});
    g.appendChild(cell);
  }
  w.appendChild(g);
  const tip=document.createElement('div');tip.className='dtip';tip.textContent='Left click — toggle • Right click — cycle velocity • Sound Design tab for synthesis';w.appendChild(tip);
  dc.appendChild(w);
}
function renderPR(dc,track){
  // Build all 7 octaves × 12 notes = 84 rows, but show a windowed view
  // viewOct = lowest octave shown (shows viewOct and viewOct+1)
  if(track._prViewOct===undefined) track._prViewOct=Math.max(1,track.octave-1);
  const OCTAVES=7; // 1-7
  const SHOW=2; // show 2 octaves at a time

  function buildPRView(){
    dc.innerHTML='';
    const viewOct=track._prViewOct;
    const topOct=Math.min(OCTAVES,viewOct+SHOW-1);
    const wrap=document.createElement('div');wrap.className='pr-wrap';

    // Nav bar
    const nav=document.createElement('div');nav.className='pr-oct-nav';
    const upBtn=document.createElement('button');upBtn.className='pr-oct-btn';upBtn.textContent='↑';upBtn.title='Shift view up one octave';
    upBtn.disabled=topOct>=OCTAVES;
    upBtn.addEventListener('click',()=>{track._prViewOct=Math.min(OCTAVES-SHOW+1,track._prViewOct+1);buildPRView();});
    const info=document.createElement('div');info.className='pr-oct-info';
    info.innerHTML=`Showing <span class="pr-oct-range">Oct ${viewOct} – ${topOct}</span> &nbsp;·&nbsp; Click note name to preview &nbsp;·&nbsp; <span style="color:var(--t3)">Oct 1 = deepest · Oct 7 = highest</span>`;
    const dnBtn=document.createElement('button');dnBtn.className='pr-oct-btn';dnBtn.textContent='↓';dnBtn.title='Shift view down one octave';
    dnBtn.disabled=viewOct<=1;
    dnBtn.addEventListener('click',()=>{track._prViewOct=Math.max(1,track._prViewOct-1);buildPRView();});
    nav.append(upBtn,info,dnBtn);
    wrap.appendChild(nav);

    // Scrollable note grid
    const scroll=document.createElement('div');scroll.className='pr-scroll';
    const pr=document.createElement('div');pr.className='pr';pr.style.animation='none';

    // Build from top octave down to viewOct (high notes at top like a real piano)
    for(let oct=topOct;oct>=viewOct;oct--){
      // Octave header
      const octHdr=document.createElement('div');
      octHdr.style.cssText=`font-family:var(--fm);font-size:8px;letter-spacing:2px;text-transform:uppercase;color:var(--t3);padding:4px 36px 2px;border-top:1px solid var(--b1);margin-top:${oct===topOct?0:6}px;`;
      octHdr.textContent=`Octave ${oct}${oct===track.octave?' ← current':''}`;
      if(oct===track.octave) octHdr.style.color='var(--teal)';
      pr.appendChild(octHdr);

      // Notes in this octave (high to low)
      [...AN].reverse().forEach(note=>{
        const isSharp=note.includes('#');
        const rrow=document.createElement('div');rrow.className='pr-row';
        const key=document.createElement('div');
        key.className='pr-key'+(isSharp?' sh':'');
        key.textContent=note;
        key.title=`Play ${note}${oct}`;
        key.addEventListener('click',()=>{iCtx();playMel(track.type,note,oct,.75,null,track.sd);});
        const cells=document.createElement('div');cells.className='pr-cells';
        cells.style.gridTemplateColumns=`repeat(${stepCount},1fr)`;
        for(let s=0;s<stepCount;s++){
          // Key for rollData is note+octave so each octave is independent
          const rollKey=`${note}${oct}`;
          if(!track.rollData[rollKey]) track.rollData[rollKey]=Array(stepCount).fill(0);
          const isOn=track.rollData[rollKey][s];
          const cell=document.createElement('div');
          cell.className='pr-c'+(isSharp?' shr':'')+(isOn?' on':'');
          cell.dataset.s=s;cell.dataset.note=rollKey;
          cell.id=`prc_${track.id}_${rollKey.replace('#','s')}_${s}`;
          if(isOn){cell.style.background=track.def.color;cell.style.opacity='.85';}
          cell.addEventListener('click',()=>{
            iCtx();
            if(!track.rollData[rollKey])track.rollData[rollKey]=Array(stepCount).fill(0);
            const on=!track.rollData[rollKey][s];
            track.rollData[rollKey][s]=on?1:0;
            cell.classList.toggle('on',on);
            if(on){cell.style.background=track.def.color;cell.style.opacity='.85';playMel(track.type,note,oct,track.vol,null,track.sd);}
            else{cell.style.background='';cell.style.opacity='';}
            markDirty();
          });
          cells.appendChild(cell);
        }
        rrow.append(key,cells);pr.appendChild(rrow);
      });
    }
    scroll.appendChild(pr);
    wrap.appendChild(scroll);
    dc.appendChild(wrap);
  }
  buildPRView();
}
function renderDSD(dc,key,tr){const p=dSD[key]||{};const c=tr.color;dc.innerHTML=`<div class="sdc"><div class="sds"><div class="sdsect"><div class="sdstt" style="color:${c}">Envelope</div><div class="sdrow"><span class="sdlbl">Attack</span><input class="rng pk" style="flex:1" type="range" min="0" max="100" value="${Math.round((p.attack||.001)*1000)}" oninput="dSD['${key}'].attack=this.value/1000;this.nextElementSibling.textContent=this.value+'ms'"/><span class="sdval">${Math.round((p.attack||.001)*1000)}ms</span></div><div class="sdrow"><span class="sdlbl">Decay</span><input class="rng pk" style="flex:1" type="range" min="10" max="800" value="${Math.round((p.decay||.25)*1000)}" oninput="dSD['${key}'].decay=this.value/1000;this.nextElementSibling.textContent=this.value+'ms'"/><span class="sdval">${Math.round((p.decay||.25)*1000)}ms</span></div><div class="sdrow"><span class="sdlbl">Release</span><input class="rng pk" style="flex:1" type="range" min="5" max="500" value="${Math.round((p.release||.05)*1000)}" oninput="dSD['${key}'].release=this.value/1000;this.nextElementSibling.textContent=this.value+'ms'"/><span class="sdval">${Math.round((p.release||.05)*1000)}ms</span></div></div><div class="sdsect"><div class="sdstt" style="color:${c}">Filter</div><div class="sdrow"><span class="sdlbl">Cutoff</span><input class="rng tk" style="flex:1" type="range" min="50" max="18000" value="${p.filterCutoff||18000}" oninput="dSD['${key}'].filterCutoff=parseInt(this.value);this.nextElementSibling.textContent=Math.round(this.value)+'Hz'"/><span class="sdval">${p.filterCutoff||18000}Hz</span></div><div class="sdrow"><span class="sdlbl">Resonance</span><input class="rng tk" style="flex:1" type="range" min="0.1" max="20" value="${p.filterRes||1}" step="0.1" oninput="dSD['${key}'].filterRes=parseFloat(this.value);this.nextElementSibling.textContent=parseFloat(this.value).toFixed(1)"/><span class="sdval">${(p.filterRes||1).toFixed(1)}</span></div></div><div class="sdsect"><div class="sdstt" style="color:${c}">Character</div><div class="sdrow"><span class="sdlbl">Distortion</span><input class="rng ok" style="flex:1" type="range" min="0" max="100" value="${Math.round((p.dist||0)*100)}" oninput="dSD['${key}'].dist=this.value/100;this.nextElementSibling.textContent=this.value+'%'"/><span class="sdval">${Math.round((p.dist||0)*100)}%</span></div><div class="sdrow"><span class="sdlbl">Pitch</span><input class="rng gk" style="flex:1" type="range" min="-12" max="12" value="${p.pitch||0}" oninput="dSD['${key}'].pitch=parseInt(this.value);this.nextElementSibling.textContent=(this.value>0?'+':'')+this.value+'st'"/><span class="sdval">${p.pitch||0}st</span></div></div><div class="sdsect" style="max-width:100px"><div class="sdstt" style="color:${c}">Test</div><button class="btn tk" onclick="iCtx();playDrum('${tr.type}',${tr.vel},null,dSD['${key}'])">▶ Preview</button></div></div></div>`;}
function renderISD(dc,track){
  const p=track.sd;const c=track.def.color;const tid=track.id;
  // Mood presets
  const MOODS={
    'Warm':    {filterCutoff:1200,filterRes:1,attack:.02,decay:.2,sustain:.6,release:.4,reverb:.25,chorus:.1,dist:0,detune:4,lofi:.1},
    'Dark':    {filterCutoff:600,filterRes:1.5,attack:.05,decay:.15,sustain:.7,release:.3,reverb:.4,chorus:.05,dist:.08,detune:0,lofi:.15},
    'Bright':  {filterCutoff:6000,filterRes:1,attack:.005,decay:.1,sustain:.5,release:.2,reverb:.1,chorus:0,dist:0,detune:0,lofi:0},
    'Dirty':   {filterCutoff:2000,filterRes:3,attack:.01,decay:.1,sustain:.4,release:.15,reverb:.05,chorus:0,dist:.35,detune:8,lofi:.3},
    'Spacious':{filterCutoff:3000,filterRes:1,attack:.15,decay:.2,sustain:.7,release:.6,reverb:.6,chorus:.4,dist:0,detune:2,lofi:0},
    'Vintage': {filterCutoff:2000,filterRes:1.2,attack:.01,decay:.3,sustain:.4,release:.4,reverb:.2,chorus:.15,dist:.05,detune:10,lofi:.35},
    'Dreamy':  {filterCutoff:1500,filterRes:1,attack:.2,decay:.25,sustain:.8,release:.7,reverb:.55,chorus:.45,dist:0,detune:6,lofi:.05},
    'Crisp':   {filterCutoff:8000,filterRes:2,attack:.002,decay:.08,sustain:.2,release:.1,reverb:.08,chorus:0,dist:0,detune:0,lofi:0},
  };
  const w=document.createElement('div');w.className='sdc';

  // ── Mood Bubbles ──
  const moodSection=document.createElement('div');moodSection.style.cssText='margin-bottom:16px';
  const moodLbl=document.createElement('div');moodLbl.style.cssText='font-family:var(--fm);font-size:8px;letter-spacing:2px;text-transform:uppercase;color:var(--t3);margin-bottom:10px';moodLbl.textContent='Quick Vibe — pick a mood';
  const moodRow=document.createElement('div');moodRow.style.cssText='display:flex;gap:6px;flex-wrap:wrap;align-items:flex-end';

  function hexToRgb(hex){const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return{r,g,b};}
  const ic=hexToRgb(track.def.color);

  // ── Animation functions — only run when selected ──
  const MOOD_ANIMS={

    'Dreamy':(cv,cx,ic,st)=>{
      // Slow-breathing aurora + constellation of stars connected by faint lines
      st.t=(st.t||0)+.009;
      if(!st.stars){st.stars=Array.from({length:14},()=>({x:Math.random()*cv.width,y:Math.random()*cv.height,r:Math.random()*.9+.3,phase:Math.random()*Math.PI*2,drift:Math.random()*.25-.12}));}
      // Layered aurora background
      [[0,`rgba(${ic.r*.3},${ic.g*.2},${ic.b*.9},.9)`,'rgba(20,10,80,.95)'],[.5,`rgba(${Math.min(255,ic.r*.2+30)},${Math.min(255,ic.g*.15+15)},${Math.min(255,ic.b*.7+60)},.85)`,`rgba(${ic.r*.15},${ic.g*.1},${ic.b*.5},.9)`]].forEach(([off,a,b])=>{
        const g=cx.createLinearGradient(0,0,cv.width,cv.height);
        const p2=.75+Math.sin(st.t+off*3)*.25;
        g.addColorStop(0,a);g.addColorStop(1,b);
        cx.globalAlpha=p2;cx.fillStyle=g;cx.fillRect(0,0,cv.width,cv.height);cx.globalAlpha=1;
      });
      // Slow aurora wave bands
      for(let i=0;i<3;i++){
        const waveY=cv.height*(.2+i*.3)+Math.sin(st.t*.7+i*1.2)*cv.height*.12;
        const wg=cx.createLinearGradient(0,waveY-8,0,waveY+8);
        const wop=.06+Math.sin(st.t*.5+i)*.04;
        wg.addColorStop(0,'rgba(255,255,255,0)');
        wg.addColorStop(.5,`rgba(${ic.r*.6+80},${ic.g*.4+100},255,${wop})`);
        wg.addColorStop(1,'rgba(255,255,255,0)');
        cx.fillStyle=wg;cx.fillRect(0,waveY-8,cv.width,16);
      }
      // Constellation — draw faint lines between nearby stars
      st.stars.forEach((s,i)=>{s.phase+=.025;s.x+=s.drift;if(s.x>cv.width+3)s.x=-3;if(s.x<-3)s.x=cv.width+3;});
      st.stars.forEach((a2,i)=>{st.stars.slice(i+1).forEach(b2=>{const dx=a2.x-b2.x,dy=a2.y-b2.y,dist=Math.sqrt(dx*dx+dy*dy);if(dist<22){cx.strokeStyle=`rgba(255,255,255,${.04*(1-dist/22)})`;cx.lineWidth=.5;cx.beginPath();cx.moveTo(a2.x,a2.y);cx.lineTo(b2.x,b2.y);cx.stroke();}});});
      // Stars with sparkle
      st.stars.forEach((s,i)=>{const op=.3+Math.sin(s.phase)*.5;cx.fillStyle=`rgba(255,255,255,${Math.max(0,op)})`;cx.beginPath();cx.arc(s.x,s.y,s.r,0,Math.PI*2);cx.fill();if(i%3===0&&op>.5){const sl=s.r*3;cx.strokeStyle=`rgba(255,255,255,${op*.35})`;cx.lineWidth=.6;cx.beginPath();cx.moveTo(s.x-sl,s.y);cx.lineTo(s.x+sl,s.y);cx.moveTo(s.x,s.y-sl);cx.lineTo(s.x,s.y+sl);cx.stroke();}});
    },

    'Vintage':(cv,cx,ic,st)=>{
      // Aged photograph — sepia scan lines + vignette + floating dust motes + grain
      st.t=(st.t||0)+.005;
      if(!st.grains){st.grains=Array.from({length:12},(_,i)=>({y:i*(cv.height/11),wave:1.5+Math.random()*3,freq:.05+Math.random()*.06,phase:Math.random()*Math.PI*2,dark:Math.random()<.4}));}
      if(!st.dust){st.dust=Array.from({length:7},()=>({x:Math.random()*cv.width,y:Math.random()*cv.height,r:Math.random()*.7+.2,vy:-.06-Math.random()*.05,vx:Math.random()*.04-.02,twinkle:Math.random()*Math.PI*2}));}
      // Warm aged base
      cx.fillStyle=`rgb(${Math.max(18,Math.round(ic.r*.28+12))},${Math.max(10,Math.round(ic.g*.14+7))},${Math.max(4,Math.round(ic.b*.08+2))})`;
      cx.fillRect(0,0,cv.width,cv.height);
      // Wood grain — wavy horizontal lines
      st.grains.forEach(g=>{
        g.phase+=.003;
        const brightness=g.dark?.07:.13;
        const op=brightness+Math.sin(st.t*1.5+g.phase)*.03;
        cx.beginPath();cx.strokeStyle=`rgba(${Math.min(255,ic.r*.6+50)},${Math.min(255,ic.g*.35+20)},${Math.max(0,ic.b*.08)},${op})`;
        cx.lineWidth=g.dark?1.5:.8;
        for(let x=0;x<=cv.width;x+=2){const y=g.y+Math.sin(x*g.freq+g.phase+st.t*.2)*g.wave;x===0?cx.moveTo(x,y):cx.lineTo(x,y);}
        cx.stroke();
      });
      // Horizontal scan-line overlay (aged photo effect)
      for(let y=0;y<cv.height;y+=2){cx.fillStyle='rgba(0,0,0,.04)';cx.fillRect(0,y,cv.width,1);}
      // Warm sepia vignette — stronger at corners
      const vig=cx.createRadialGradient(cv.width/2,cv.height/2,cv.width*.1,cv.width/2,cv.height/2,cv.width*.85);
      vig.addColorStop(0,`rgba(${ic.r*.5+40},${ic.g*.3+15},0,0)`);
      vig.addColorStop(.7,`rgba(0,0,0,.15)`);
      vig.addColorStop(1,`rgba(0,0,0,.65)`);
      cx.fillStyle=vig;cx.fillRect(0,0,cv.width,cv.height);
      // Dust motes floating up slowly
      st.dust.forEach(d=>{d.y+=d.vy;d.x+=d.vx;d.twinkle+=.03;if(d.y<-2)d.y=cv.height+2;const op=.15+Math.sin(d.twinkle)*.12;cx.fillStyle=`rgba(${Math.min(255,ic.r*.9+90)},${Math.min(255,ic.g*.6+50)},20,${op})`;cx.beginPath();cx.arc(d.x,d.y,d.r,0,Math.PI*2);cx.fill();});
      // Film grain noise
      for(let i=0;i<25;i++){const gx=Math.random()*cv.width,gy=Math.random()*cv.height;cx.fillStyle=`rgba(0,0,0,${Math.random()*.15})`;cx.fillRect(gx,gy,1,1);}
    },

    'Warm':(cv,cx,ic,st)=>{
      // Living flame — heat shimmer + rising embers + glowing core
      st.t=(st.t||0)+.022;
      if(!st.embers){st.embers=Array.from({length:12},()=>({x:cv.width*.2+Math.random()*cv.width*.6,y:cv.height+Math.random()*cv.height*.5,r:Math.random()*.9+.3,vy:-(Math.random()*.5+.2),vx:(Math.random()-.5)*.15,life:Math.random(),maxLife:1+Math.random()*.5}));}
      if(!st.shimmer){st.shimmer=Array.from({length:6},(_,i)=>({phase:i*(Math.PI/3),amp:2+Math.random()*3}));}
      // Heat gradient base — breathing
      const breathe=.85+Math.sin(st.t*.8)*.15;
      const bg=cx.createRadialGradient(cv.width/2,cv.height*.7,1,cv.width/2,cv.height*.4,cv.width*.9);
      bg.addColorStop(0,`rgba(255,${Math.min(255,ic.g*.5+170)},${Math.max(0,ic.b*.1+20)},${breathe})`);
      bg.addColorStop(.35,`rgba(${Math.min(255,ic.r+20)},${Math.max(0,ic.g*.4+60)},${Math.max(0,ic.b*.1)},${breathe})`);
      bg.addColorStop(.7,`rgba(${Math.max(0,ic.r*.7)},${Math.max(0,ic.g*.2+10)},0,.95)`);
      bg.addColorStop(1,`rgba(${Math.max(0,ic.r*.3)},0,0,1)`);
      cx.fillStyle=bg;cx.fillRect(0,0,cv.width,cv.height);
      // Heat shimmer wavy lines
      st.shimmer.forEach(sh=>{sh.phase+=.04;const y=cv.height*.4+Math.sin(sh.phase)*cv.height*.35;const sg=cx.createLinearGradient(0,y-2,0,y+2);sg.addColorStop(0,'rgba(255,200,50,0)');sg.addColorStop(.5,`rgba(255,200,50,${.04+Math.sin(sh.phase)*.03})`);sg.addColorStop(1,'rgba(255,200,50,0)');cx.fillStyle=sg;cx.fillRect(0,y-2,cv.width,4);});
      // Embers
      st.embers.forEach(e=>{e.y+=e.vy;e.x+=e.vx+Math.sin(st.t*3+e.r)*0.08;e.life+=.012;if(e.life>e.maxLife){e.y=cv.height+2;e.x=cv.width*.15+Math.random()*cv.width*.7;e.life=0;e.vy=-(Math.random()*.5+.2);e.vx=(Math.random()-.5)*.15;}const fade=1-e.life/e.maxLife;const op=fade*.75;cx.fillStyle=`rgba(255,${Math.min(255,150+Math.random()*80)},${Math.random()*30},${op})`;cx.beginPath();cx.arc(e.x,e.y,e.r*fade*.8+.2,0,Math.PI*2);cx.fill();});
    },

    'Dark':(cv,cx,ic,st)=>{
      // Shadow realm — ink bleeding from edges + ghostly smoke + single ember
      st.t=(st.t||0)+.007;
      if(!st.smoke){st.smoke=Array.from({length:4},(_,i)=>({x:cv.width*(.2+i*.2),y:cv.height*.8,phase:Math.random()*Math.PI*2,r:cv.width*.28+Math.random()*cv.width*.1}));}
      if(!st.embers){st.embers=Array.from({length:2},()=>({x:Math.random()*cv.width,y:Math.random()*cv.height,phase:Math.random()*Math.PI*2}));}
      // Near-black base
      cx.fillStyle=`rgb(${Math.max(3,Math.round(ic.r*.06))},${Math.max(2,Math.round(ic.g*.04))},${Math.max(6,Math.round(ic.b*.1+4))})`;
      cx.fillRect(0,0,cv.width,cv.height);
      // Ink bleeds in from corners — deep color
      [[0,0],[cv.width,0],[0,cv.height],[cv.width,cv.height]].forEach(([cx2,cy2])=>{const ig=cx.createRadialGradient(cx2,cy2,0,cx2,cy2,cv.width*.7);ig.addColorStop(0,`rgba(${ic.r*.1},${ic.g*.05},${ic.b*.15},.35)`);ig.addColorStop(1,'rgba(0,0,0,0)');cx.fillStyle=ig;cx.fillRect(0,0,cv.width,cv.height);});
      // Ghostly smoke tendrils
      st.smoke.forEach(s=>{s.phase+=.008;const op=.04+Math.sin(s.phase)*.03;const sg=cx.createRadialGradient(s.x+Math.sin(s.phase)*8,s.y+Math.cos(s.phase*.7)*5,0,s.x,s.y,s.r);sg.addColorStop(0,`rgba(${ic.r*.2},${ic.g*.1},${ic.b*.25},${op})`);sg.addColorStop(1,'rgba(0,0,0,0)');cx.fillStyle=sg;cx.fillRect(0,0,cv.width,cv.height);});
      // Barely-there ember dots
      st.embers.forEach(e=>{e.phase+=.02;const op=.03+Math.sin(e.phase)*.03;cx.fillStyle=`rgba(${ic.r*.6+60},${ic.g*.3+40},${ic.b*.5+60},${op})`;cx.beginPath();cx.arc(e.x,e.y,.8,0,Math.PI*2);cx.fill();});
      // Dark center pulse — breathes inward
      const dp=cx.createRadialGradient(cv.width/2,cv.height/2,0,cv.width/2,cv.height/2,cv.width*.55);
      const dpOp=.1+Math.sin(st.t*.6)*.08;
      dp.addColorStop(0,'rgba(0,0,0,0)');dp.addColorStop(.5,`rgba(${ic.r*.08},${ic.g*.04},${ic.b*.12},${dpOp})`);dp.addColorStop(1,`rgba(0,0,0,${.35+Math.sin(st.t*.4)*.1})`);
      cx.fillStyle=dp;cx.fillRect(0,0,cv.width,cv.height);
    },

    'Bright':(cv,cx,ic,st)=>{
      // Solar flare — sunbeam rays rotating + prismatic light scatter
      st.t=(st.t||0)+.03;
      if(!st.rays){st.rays=Array.from({length:8},(_,i)=>({angle:i*(Math.PI/4),width:.12+Math.random()*.08,speed:.006+Math.random()*.004}));}
      if(!st.prisms){st.prisms=Array.from({length:8},()=>({x:Math.random()*cv.width,y:Math.random()*cv.height,phase:Math.random()*Math.PI*2,speed:.08+Math.random()*.06,hue:Math.random()*360}));}
      // White-hot base
      const bg=cx.createRadialGradient(cv.width*.5,cv.height*.5,0,cv.width*.5,cv.height*.5,cv.width*.8);
      bg.addColorStop(0,'rgba(255,255,255,1)');
      bg.addColorStop(.3,`rgba(${Math.min(255,ic.r*.5+200)},${Math.min(255,ic.g*.5+200)},255,.95)`);
      bg.addColorStop(.8,`rgba(${Math.min(255,ic.r*.4+160)},${Math.min(255,ic.g*.4+160)},${Math.min(255,ic.b*.4+200)},.9)`);
      bg.addColorStop(1,`rgba(${Math.min(255,ic.r*.3+120)},${Math.min(255,ic.g*.3+130)},255,.85)`);
      cx.fillStyle=bg;cx.fillRect(0,0,cv.width,cv.height);
      // Rotating sunbeam rays from center
      const cx2=cv.width/2,cy2=cv.height/2;
      st.rays.forEach(ray=>{ray.angle+=ray.speed;const rg=cx.createLinearGradient(cx2,cy2,cx2+Math.cos(ray.angle)*cv.width,cy2+Math.sin(ray.angle)*cv.height);rg.addColorStop(0,`rgba(255,255,255,.25)`);rg.addColorStop(1,'rgba(255,255,255,0)');cx.save();cx.translate(cx2,cy2);cx.rotate(ray.angle);cx.fillStyle=rg;cx.fillRect(0,-cv.width*ray.width,cv.width,cv.width*ray.width*2);cx.restore();});
      // Prismatic color flecks
      st.prisms.forEach(pr=>{pr.phase+=pr.speed;const op=Math.max(0,Math.sin(pr.phase))*.6;if(op<.05)return;cx.fillStyle=`hsla(${pr.hue},100%,75%,${op})`;cx.beginPath();cx.arc(pr.x,pr.y,1.2,0,Math.PI*2);cx.fill();});
      // Center flare bloom
      const flare=cx.createRadialGradient(cx2,cy2,0,cx2,cy2,cv.width*.3);
      flare.addColorStop(0,`rgba(255,255,255,${.4+Math.sin(st.t*1.5)*.2})`);
      flare.addColorStop(1,'rgba(255,255,255,0)');
      cx.fillStyle=flare;cx.fillRect(0,0,cv.width,cv.height);
    },

    'Dirty':(cv,cx,ic,st)=>{
      // Overdriven circuit — electrical sparks + glitch bands + noise static
      st.t=(st.t||0)+.04;
      if(!st.sparks){st.sparks=[];}
      if(!st.glitchBands){st.glitchBands=Array.from({length:4},()=>({y:Math.random()*cv.height,h:Math.random()*4+1,phase:Math.random()*Math.PI*2,speed:.15+Math.random()*.2}));}
      // Dark gritty base
      cx.fillStyle=`rgb(${Math.max(12,Math.round(ic.r*.35+8))},${Math.max(6,Math.round(ic.g*.15+4))},${Math.max(2,Math.round(ic.b*.08+1))})`;
      cx.fillRect(0,0,cv.width,cv.height);
      // Heavy scanline noise
      for(let y=0;y<cv.height;y++){if(Math.random()<.4){cx.fillStyle=`rgba(0,0,0,${Math.random()*.2})`;cx.fillRect(0,y,cv.width,1);}}
      // Salt noise
      for(let i=0;i<30;i++){const nx=Math.random()*cv.width,ny=Math.random()*cv.height;cx.fillStyle=`rgba(${Math.min(255,ic.r*.8+80)},${Math.min(255,ic.g*.4+40)},0,${Math.random()*.3})`;cx.fillRect(nx,ny,1,1);}
      // Glitch shift bands
      st.glitchBands.forEach(b=>{b.phase+=b.speed;b.y=(b.y+Math.sin(b.phase*.3)*.5+cv.height)%cv.height;if(Math.sin(b.phase)>.6){const safeY=Math.max(0,Math.min(cv.height-Math.ceil(b.h)-1,Math.floor(b.y)));try{const id=cx.getImageData(0,safeY,cv.width,Math.ceil(b.h));cx.putImageData(id,Math.sin(b.phase)*6,safeY);}catch(e){}}cx.fillStyle=`rgba(${Math.min(255,ic.r*.9+60)},0,0,${Math.abs(Math.sin(b.phase))*.08})`;cx.fillRect(0,b.y,cv.width,b.h);});
      // Electric sparks — random bolts
      if(Math.random()<.25){const sx=Math.random()*cv.width,sy=Math.random()*cv.height;cx.strokeStyle=`rgba(255,${Math.min(255,ic.g*.3+140)},50,${Math.random()*.7+.3})`;cx.lineWidth=.8;cx.beginPath();cx.moveTo(sx,sy);for(let i=0;i<3;i++){cx.lineTo(sx+(Math.random()-.5)*12,sy+(Math.random()-.5)*8);}cx.stroke();}
      // Burning vignette
      const vig=cx.createRadialGradient(cv.width/2,cv.height/2,0,cv.width/2,cv.height/2,cv.width*.8);
      vig.addColorStop(0,'rgba(0,0,0,0)');vig.addColorStop(1,`rgba(${Math.max(0,ic.r*.2)},0,0,.6)`);
      cx.fillStyle=vig;cx.fillRect(0,0,cv.width,cv.height);
    },

    'Spacious':(cv,cx,ic,st)=>{
      // Deep cosmos — parallax star layers + slow wormhole swirl + nebula breath
      st.t=(st.t||0)+.006;
      if(!st.layers){st.layers=Array.from({length:3},(_,li)=>({stars:Array.from({length:8+li*5},()=>({x:Math.random()*cv.width,y:Math.random()*cv.height,r:.3+Math.random()*.8,phase:Math.random()*Math.PI*2,vx:-(li+1)*.012})),speed:(li+1)*.012,colored:li===2}));}
      // Deep space base
      cx.fillStyle=`rgb(${Math.max(1,Math.round(ic.r*.04))},${Math.max(1,Math.round(ic.g*.03))},${Math.max(8,Math.round(ic.b*.14+6))})`;
      cx.fillRect(0,0,cv.width,cv.height);
      // Wormhole swirl in center
      const cx2=cv.width/2,cy2=cv.height/2;
      for(let ring=5;ring>=0;ring--){const ringR=Math.max(0.01,ring*cv.width*.065+Math.sin(st.t*.5+ring)*.8);const rg=cx.createRadialGradient(cx2,cy2,Math.max(0,ringR*.3),cx2,cy2,Math.max(0.01,ringR+2));const op=.04+ring*.012;rg.addColorStop(0,'rgba(0,0,0,0)');rg.addColorStop(.7,`rgba(${ic.r*.4+20},${ic.g*.3+15},${ic.b*.8+40},${op})`);rg.addColorStop(1,'rgba(0,0,0,0)');cx.fillStyle=rg;cx.beginPath();cx.arc(cx2+Math.cos(st.t*.4+ring)*1.5,cy2+Math.sin(st.t*.3+ring)*1,ringR+2,0,Math.PI*2);cx.fill();}
      // Parallax star layers — deeper layers move slower
      st.layers.forEach(layer=>{layer.stars.forEach(s=>{s.x+=s.vx;if(s.x<-2)s.x=cv.width+2;s.phase+=.018;const op=.3+Math.sin(s.phase)*.35;cx.fillStyle=layer.colored?`rgba(${ic.r*.7+60},${ic.g*.5+80},${ic.b*.9+100},${op})`:`rgba(255,255,255,${op})`;cx.beginPath();cx.arc(s.x,s.y,s.r,0,Math.PI*2);cx.fill();});});
      // Nebula breath
      const neb=cx.createRadialGradient(cx2+Math.sin(st.t*.3)*8,cy2+Math.cos(st.t*.2)*6,0,cx2,cy2,cv.width*.6);
      neb.addColorStop(0,`rgba(${ic.r*.35},${ic.g*.25},${ic.b*.6},${.08+Math.sin(st.t)*.04})`);
      neb.addColorStop(1,'rgba(0,0,0,0)');cx.fillStyle=neb;cx.fillRect(0,0,cv.width,cv.height);
    },

    'Crisp':(cv,cx,ic,st)=>{
      // Arctic precision — growing ice fractals + data stream lines + sterile scan
      st.t=(st.t||0)+.02;
      if(!st.crystals){st.crystals=Array.from({length:4},(_,i)=>({x:cv.width*(.15+i*.23),y:cv.height/2+Math.sin(i*1.3)*cv.height*.25,phase:i*(Math.PI/2),speed:.025+i*.008,maxLen:6+i*2}));}
      if(!st.dataLines){st.dataLines=Array.from({length:3},()=>({y:Math.random()*cv.height,phase:Math.random()*Math.PI*2,speed:.05+Math.random()*.04,dots:[]}));}
      // Clean white-to-ice base
      const bg=cx.createLinearGradient(0,0,cv.width,cv.height);
      bg.addColorStop(0,`rgb(${Math.min(255,ic.r*.15+215)},${Math.min(255,ic.g*.18+220)},255)`);
      bg.addColorStop(.5,`rgb(${Math.min(255,ic.r*.1+195)},${Math.min(255,ic.g*.15+205)},${Math.min(255,ic.b*.5+210)})`);
      bg.addColorStop(1,`rgb(${Math.min(255,ic.r*.12+180)},${Math.min(255,ic.g*.12+190)},${Math.min(255,ic.b*.6+195)})`);
      cx.fillStyle=bg;cx.fillRect(0,0,cv.width,cv.height);
      // Growing ice fractal arms
      st.crystals.forEach(k=>{k.phase+=k.speed;const growLen=k.maxLen*(0.5+Math.sin(k.phase)*.5);const fade=.5+Math.sin(k.phase)*.35;cx.strokeStyle=`rgba(${Math.min(255,ic.r*.2+160)},${Math.min(255,ic.g*.3+185)},255,${fade})`;cx.lineWidth=.9;cx.beginPath();for(let arm=0;arm<6;arm++){const ang=arm*(Math.PI/3)+st.t*.3;cx.moveTo(k.x,k.y);cx.lineTo(k.x+Math.cos(ang)*growLen,k.y+Math.sin(ang)*growLen);// Sub-branch
      const mx=k.x+Math.cos(ang)*growLen*.55,my=k.y+Math.sin(ang)*growLen*.55;cx.moveTo(mx,my);cx.lineTo(mx+Math.cos(ang+Math.PI/4)*growLen*.35,my+Math.sin(ang+Math.PI/4)*growLen*.35);cx.moveTo(mx,my);cx.lineTo(mx+Math.cos(ang-Math.PI/4)*growLen*.35,my+Math.sin(ang-Math.PI/4)*growLen*.35);}cx.stroke();});
      // Data stream horizontal lines — precise dots scrolling
      st.dataLines.forEach(dl=>{dl.phase+=dl.speed;const scanY=dl.y+Math.sin(dl.phase*.3)*2;const lineOp=.15+Math.sin(dl.phase)*.1;cx.fillStyle=`rgba(${ic.r*.3+100},${ic.g*.4+120},255,${lineOp})`;for(let x=0;x<cv.width;x+=4){if(Math.sin(x*.3+dl.phase*4)>.2)cx.fillRect(x,scanY,2,1);}});
      // Precision scan line sweep
      const sy=(st.t*18)%cv.height;
      const sg=cx.createLinearGradient(0,sy-2,0,sy+2);
      sg.addColorStop(0,'rgba(255,255,255,0)');sg.addColorStop(.5,`rgba(${ic.r*.2+160},${ic.g*.3+180},255,.4)`);
      sg.addColorStop(1,'rgba(255,255,255,0)');cx.fillStyle=sg;cx.fillRect(0,sy-2,cv.width,4);
    },
  };

  const allBubbles=[];

  Object.entries(MOODS).forEach(([moodName,moodVals])=>{
    const animFn=MOOD_ANIMS[moodName];
    const st={};
    let animFrame=null;
    let selected=false;

    // ── Default state: plain pill ──
    const pill=document.createElement('button');
    pill.textContent=moodName;
    pill.style.cssText=`font-family:var(--fm);font-size:9px;letter-spacing:1px;padding:5px 12px;border-radius:20px;border:1px solid var(--b1);background:var(--bg3);color:var(--t3);cursor:pointer;transition:height .25s cubic-bezier(.4,0,.2,1),width .25s cubic-bezier(.4,0,.2,1),padding .25s,border-color .2s,box-shadow .2s;white-space:nowrap;position:relative;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;height:28px;min-width:52px;`;

    // Canvas — hidden until selected
    const cv=document.createElement('canvas');
    cv.width=120;cv.height=44;
    cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;border-radius:20px;opacity:0;transition:opacity .3s ease;pointer-events:none;';
    pill.appendChild(cv);

    // Label on top of canvas
    const lbl=document.createElement('span');
    lbl.textContent=moodName;
    lbl.style.cssText=`position:relative;z-index:1;font-family:var(--fm);font-size:9px;letter-spacing:1px;color:var(--t3);transition:color .2s,font-weight .2s;pointer-events:none;`;
    // Remove text node, add span
    pill.innerHTML='';pill.appendChild(cv);pill.appendChild(lbl);
    const cx2=cv.getContext('2d');

    function stopAnim(){
      selected=false;
      cancelAnimationFrame(animFrame);
      if(window._activeAnimFrames)window._activeAnimFrames.delete(animFrame);
    }

    function startAnim(){
      if(!window._activeAnimFrames)window._activeAnimFrames=new Set();
      selected=true;
      function frame(){
        if(!selected)return;
        cx2.clearRect(0,0,cv.width,cv.height);
        animFn(cv,cx2,ic,st);
        animFrame=requestAnimationFrame(frame);
        window._activeAnimFrames.add(animFrame);
      }
      frame();
    }

    function deselect(){
      stopAnim();
      pill.style.height='28px';
      pill.style.minWidth='52px';
      pill.style.padding='5px 12px';
      pill.style.borderColor='var(--b1)';
      pill.style.boxShadow='none';
      cv.style.opacity='0';
      lbl.style.color='var(--t3)';
      lbl.style.fontWeight='normal';
      lbl.style.letterSpacing='1px';
      lbl.style.textShadow='none';
    }

    function selectThis(){
      // Deselect all others
      allBubbles.forEach(b=>{if(b!==currentBubble)b.deselect();});
      // Bloom open
      pill.style.height='44px';
      pill.style.minWidth='120px';
      pill.style.padding='0';
      pill.style.borderColor=track.def.color;
      pill.style.boxShadow=`0 0 14px ${track.def.color}55, 0 0 30px ${track.def.color}22`;
      cv.style.opacity='1';
      // Bright needs dark text to be readable against white canvas
      const isBright=moodName==='Bright';
      lbl.style.color=isBright?'rgba(30,30,60,0.85)':'#fff';
      lbl.style.textShadow=isBright?'0 1px 4px rgba(255,255,255,0.6)':'0 1px 6px rgba(0,0,0,0.6)';
      lbl.style.fontWeight='600';
      lbl.style.letterSpacing='1.5px';
      startAnim();
      // Apply preset to track sd WITHOUT re-rendering the whole panel
      const t=getIT(tid);if(!t||!t.sd)return;
      Object.assign(t.sd,JSON.parse(JSON.stringify(moodVals)));
      // Update each slider value and label in place
      const sc=w.querySelector('.sds');if(!sc)return;
      const p2=t.sd;
      const pairs=[
        ['input[min="1"][max="500"]', Math.round((p2.attack||.01)*1000), v=>v<10?'Instant':v<80?'Fast':v<250?'Medium':'Slow'],
        ['input[min="10"][max="3000"]', Math.round((p2.release||.2)*1000), v=>v<100?'Short':v<600?'Medium':'Long'],
        ['input[min="0"][max="100"].rng.pk', Math.round((p2.sustain||.5)*100), v=>v+'%'],
        ['input[min="80"]', p2.filterCutoff||3000, v=>v<400?'Very Dark':v<1200?'Dark':v<3500?'Mid':v<8000?'Bright':'Crystal'],
        ['input[min="0.1"][max="15"]', p2.filterRes||1, v=>v<2?'None':v<5?'Subtle':v<9?'Present':'Harsh'],
        ['input[min="-50"]', p2.detune||0, v=>Math.abs(v)<3?'Tight':Math.abs(v)<15?'Warm':Math.abs(v)<30?'Thick':'Wide'],
        ['input[min="0"][max="100"].rng.wk:nth-of-type(1)', Math.round((p2.reverb||0)*100), v=>v<5?'Dry':v<25?'Small':v<55?'Room':'Hall'],
        ['input[min="0"][max="100"].rng.wk:nth-of-type(2)', Math.round((p2.chorus||0)*100), v=>v<5?'Mono':v<30?'Wide':v<65?'Wider':'Huge'],
        ['input[min="0"][max="100"].rng.ok', Math.round((p2.dist||0)*100), v=>v<5?'Clean':v<20?'Warm':v<50?'Gritty':'Blown'],
        ['input[min="0"][max="100"].rng.gk:nth-of-type(1)', Math.round((p2.lofi||0)*100), v=>v<5?'Off':v<30?'Subtle':v<65?'Dusty':'Wrecked'],
        ['input[min="0"][max="20"]', p2.lfoRate||0, v=>v<.1?'None':v<2?'Slow':v<7?'Medium':'Fast'],
        ['input[min="0"][max="100"].rng.gk:nth-of-type(2)', Math.round((p2.lfoDepth||0)*100), v=>v<5?'None':v<30?'Subtle':v<65?'Strong':'Intense'],
      ];
      sc.querySelectorAll('input[type="range"]').forEach((inp,i)=>{if(pairs[i]){inp.value=pairs[i][1];const sib=inp.nextElementSibling;if(sib)sib.textContent=pairs[i][2](pairs[i][1]);}});
    }

    pill.addEventListener('mouseenter',()=>{if(!selected){pill.style.borderColor=track.def.color;lbl.style.color=track.def.color;}});
    pill.addEventListener('mouseleave',()=>{if(!selected){pill.style.borderColor='var(--b1)';lbl.style.color='var(--t3)';}});
    pill.addEventListener('click',selectThis);

    const currentBubble={deselect};
    allBubbles.push(currentBubble);
    moodRow.appendChild(pill);
  });

  moodSection.append(moodLbl,moodRow);
  w.appendChild(moodSection);
  // Slider sections via innerHTML (safe — no closures needed, uses global getIT)
  const sliders=document.createElement('div');
  sliders.innerHTML=`<div class="sds">
    <div class="sdsect">
      <div class="sdstt" style="color:${c}">🔊 Volume Shape</div>
      <div class="sdrow"><span class="sdlbl" title="How fast the note starts">Attack</span><input class="rng pk" style="flex:1" type="range" min="1" max="500" value="${Math.round((p.attack||.01)*1000)}" oninput="getIT('${tid}').sd.attack=this.value/1000;this.nextElementSibling.textContent=this.value<10?'Instant':this.value<80?'Fast':this.value<250?'Medium':'Slow'"/><span class="sdval">${p.attack<.01?'Instant':p.attack<.08?'Fast':p.attack<.25?'Medium':'Slow'}</span></div>
      <div style="font-family:var(--fm);font-size:7px;color:var(--t3);margin:-2px 0 4px 0">How fast the note starts</div>
      <div class="sdrow"><span class="sdlbl" title="How long it fades out after you release">Fade Out</span><input class="rng pk" style="flex:1" type="range" min="10" max="3000" value="${Math.round((p.release||.2)*1000)}" oninput="getIT('${tid}').sd.release=this.value/1000;this.nextElementSibling.textContent=this.value<100?'Short':this.value<600?'Medium':'Long'"/><span class="sdval">${p.release<.1?'Short':p.release<.6?'Medium':'Long'}</span></div>
      <div style="font-family:var(--fm);font-size:7px;color:var(--t3);margin:-2px 0 4px 0">How long it lingers after release</div>
      <div class="sdrow"><span class="sdlbl">Body</span><input class="rng pk" style="flex:1" type="range" min="0" max="100" value="${Math.round((p.sustain||.5)*100)}" oninput="getIT('${tid}').sd.sustain=this.value/100;this.nextElementSibling.textContent=this.value+'%'"/><span class="sdval">${Math.round((p.sustain||.5)*100)}%</span></div>
      <div style="font-family:var(--fm);font-size:7px;color:var(--t3);margin:-2px 0 0 0">How loud it stays while held</div>
    </div>
    <div class="sdsect">
      <div class="sdstt" style="color:${c}">🎚 Tone</div>
      <div class="sdrow"><span class="sdlbl" title="Brightness of the sound">Brightness</span><input class="rng tk" style="flex:1" type="range" min="80" max="18000" value="${p.filterCutoff||3000}" oninput="getIT('${tid}').sd.filterCutoff=parseInt(this.value);this.nextElementSibling.textContent=this.value<400?'Very Dark':this.value<1200?'Dark':this.value<3500?'Mid':this.value<8000?'Bright':'Crystal'"/><span class="sdval">${p.filterCutoff<400?'Very Dark':p.filterCutoff<1200?'Dark':p.filterCutoff<3500?'Mid':p.filterCutoff<8000?'Bright':'Crystal'}</span></div>
      <div style="font-family:var(--fm);font-size:7px;color:var(--t3);margin:-2px 0 4px 0">Dark = bassy &amp; muffled → Crystal = sharp &amp; airy</div>
      <div class="sdrow"><span class="sdlbl" title="Resonance / edge at the cutoff frequency">Edge</span><input class="rng tk" style="flex:1" type="range" min="0.1" max="15" value="${p.filterRes||1}" step=".1" oninput="getIT('${tid}').sd.filterRes=parseFloat(this.value);this.nextElementSibling.textContent=this.value<2?'None':this.value<5?'Subtle':this.value<9?'Present':'Harsh'"/><span class="sdval">${p.filterRes<2?'None':p.filterRes<5?'Subtle':p.filterRes<9?'Present':'Harsh'}</span></div>
      <div style="font-family:var(--fm);font-size:7px;color:var(--t3);margin:-2px 0 4px 0">Adds a sharp resonant peak at the brightness point</div>
      <div class="sdrow"><span class="sdlbl">Thickness</span><input class="rng ik" style="flex:1" type="range" min="-50" max="50" value="${p.detune||0}" oninput="getIT('${tid}').sd.detune=parseInt(this.value);this.nextElementSibling.textContent=Math.abs(this.value)<3?'Tight':Math.abs(this.value)<15?'Warm':Math.abs(this.value)<30?'Thick':'Wide'"/><span class="sdval">${Math.abs(p.detune||0)<3?'Tight':Math.abs(p.detune||0)<15?'Warm':Math.abs(p.detune||0)<30?'Thick':'Wide'}</span></div>
      <div style="font-family:var(--fm);font-size:7px;color:var(--t3);margin:-2px 0 0 0">Slightly detunes layers for a fuller sound</div>
    </div>
    <div class="sdsect">
      <div class="sdstt" style="color:${c}">✨ Space &amp; Character</div>
      <div class="sdrow"><span class="sdlbl">Room Size</span><input class="rng wk" style="flex:1" type="range" min="0" max="100" value="${Math.round((p.reverb||0)*100)}" oninput="getIT('${tid}').sd.reverb=this.value/100;this.nextElementSibling.textContent=this.value<5?'Dry':this.value<25?'Small':this.value<55?'Room':'Hall'"/><span class="sdval">${(p.reverb||0)<.05?'Dry':(p.reverb||0)<.25?'Small':(p.reverb||0)<.55?'Room':'Hall'}</span></div>
      <div style="font-family:var(--fm);font-size:7px;color:var(--t3);margin:-2px 0 4px 0">How far away the sound feels</div>
      <div class="sdrow"><span class="sdlbl">Width</span><input class="rng wk" style="flex:1" type="range" min="0" max="100" value="${Math.round((p.chorus||0)*100)}" oninput="getIT('${tid}').sd.chorus=this.value/100;this.nextElementSibling.textContent=this.value<5?'Mono':this.value<30?'Wide':this.value<65?'Wider':'Huge'"/><span class="sdval">${(p.chorus||0)<.05?'Mono':(p.chorus||0)<.3?'Wide':(p.chorus||0)<.65?'Wider':'Huge'}</span></div>
      <div style="font-family:var(--fm);font-size:7px;color:var(--t3);margin:-2px 0 4px 0">Spreads the sound left and right</div>
      <div class="sdrow"><span class="sdlbl">Grit</span><input class="rng ok" style="flex:1" type="range" min="0" max="100" value="${Math.round((p.dist||0)*100)}" oninput="getIT('${tid}').sd.dist=this.value/100;this.nextElementSibling.textContent=this.value<5?'Clean':this.value<20?'Warm':this.value<50?'Gritty':'Blown'"/><span class="sdval">${(p.dist||0)<.05?'Clean':(p.dist||0)<.2?'Warm':(p.dist||0)<.5?'Gritty':'Blown'}</span></div>
      <div style="font-family:var(--fm);font-size:7px;color:var(--t3);margin:-2px 0 4px 0">Adds harmonic saturation and crunch</div>
      <div class="sdrow"><span class="sdlbl">Lo-Fi</span><input class="rng gk" style="flex:1" type="range" min="0" max="100" value="${Math.round((p.lofi||0)*100)}" oninput="getIT('${tid}').sd.lofi=this.value/100;this.nextElementSibling.textContent=this.value<5?'Off':this.value<30?'Subtle':this.value<65?'Dusty':'Wrecked'"/><span class="sdval">${(p.lofi||0)<.05?'Off':(p.lofi||0)<.3?'Subtle':(p.lofi||0)<.65?'Dusty':'Wrecked'}</span></div>
      <div style="font-family:var(--fm);font-size:7px;color:var(--t3);margin:-2px 0 0 0">Tape saturation + vinyl noise + filtered warmth</div>
    </div>
    <div class="sdsect">
      <div class="sdstt" style="color:${c}">〰 Movement</div>
      <div class="sdrow"><span class="sdlbl">Wobble</span><input class="rng gk" style="flex:1" type="range" min="0" max="20" value="${p.lfoRate||0}" step=".1" oninput="getIT('${tid}').sd.lfoRate=parseFloat(this.value);this.nextElementSibling.textContent=this.value<.1?'None':this.value<2?'Slow':this.value<7?'Medium':'Fast'"/><span class="sdval">${(p.lfoRate||0)<.1?'None':(p.lfoRate||0)<2?'Slow':(p.lfoRate||0)<7?'Medium':'Fast'}</span></div>
      <div style="font-family:var(--fm);font-size:7px;color:var(--t3);margin:-2px 0 4px 0">Speed of the cyclical movement</div>
      <div class="sdrow"><span class="sdlbl">Depth</span><input class="rng gk" style="flex:1" type="range" min="0" max="100" value="${Math.round((p.lfoDepth||0)*100)}" oninput="getIT('${tid}').sd.lfoDepth=this.value/100;this.nextElementSibling.textContent=this.value<5?'None':this.value<30?'Subtle':this.value<65?'Strong':'Intense'"/><span class="sdval">${(p.lfoDepth||0)<.05?'None':(p.lfoDepth||0)<.3?'Subtle':(p.lfoDepth||0)<.65?'Strong':'Intense'}</span></div>
      <div style="font-family:var(--fm);font-size:7px;color:var(--t3);margin:-2px 0 4px 0">How much it wobbles</div>
      <div class="sdrow"><span class="sdlbl">Affects</span>
        <div style="display:flex;gap:3px">
          ${['filter','pitch','volume'].map(tgt=>`<button style="font-family:var(--fm);font-size:8px;padding:3px 7px;border-radius:4px;border:1px solid ${p.lfoTarget===tgt?'rgba(245,200,66,.5)':'var(--b1)'};background:${p.lfoTarget===tgt?'rgba(245,200,66,.1)':'var(--bg3)'};color:${p.lfoTarget===tgt?'var(--gold)':'var(--t3)'};cursor:pointer" onclick="getIT('${tid}').sd.lfoTarget='${tgt}';this.closest('.sdrow').querySelectorAll('button').forEach(b=>{b.style.borderColor='var(--b1)';b.style.background='var(--bg3)';b.style.color='var(--t3)'});this.style.borderColor='rgba(245,200,66,.5)';this.style.background='rgba(245,200,66,.1)';this.style.color='var(--gold)'">${tgt==='filter'?'Tone':tgt==='pitch'?'Pitch':'Volume'}</button>`).join('')}
        </div>
      </div>
    </div>
    <div class="sdsect" style="max-width:110px">
      <div class="sdstt" style="color:${c}">▶ Test</div>
      <div class="pvbts">${(ITYPES[track.type]?.notes||['C','E','G']).slice(0,6).map(n=>`<button class="pvb" onclick="iCtx();playMel('${track.type}','${n}',getIT('${track.id}').octave,.75,null,getIT('${track.id}').sd)">${n}</button>`).join('')}</div>
      <div style="display:flex;align-items:center;gap:5px;margin-top:8px">
        <button class="pvb" style="padding:2px 6px" onclick="getIT('${tid}').octave=Math.max(1,getIT('${tid}').octave-1);document.getElementById('od_${tid}').textContent='Oct '+getIT('${tid}').octave">−</button>
        <span class="sdval" id="od_${tid}">Oct ${track.octave}</span>
        <button class="pvb" style="padding:2px 6px" onclick="getIT('${tid}').octave=Math.min(7,getIT('${tid}').octave+1);document.getElementById('od_${tid}').textContent='Oct '+getIT('${tid}').octave">+</button>
      </div>
      <button class="btn tk" style="margin-top:8px;width:100%;font-size:8px" onclick="resetSD('${tid}')">↺ Reset</button>
    </div>
  </div>`;
  w.appendChild(sliders);
  dc.appendChild(w);
}
function resetSD(tid){
  // Cancel any running mood bubble animations before re-rendering
  if(window._activeAnimFrames){window._activeAnimFrames.forEach(f=>cancelAnimationFrame(f));window._activeAnimFrames.clear();}
  const t=getIT(tid);if(!t.type)return;t.sd=defSD(t.type);const dc=document.getElementById('dpContent');dc.innerHTML='';renderISD(dc,t);
}
// Expose MOODS globally for onclick fallback
// ══════════════════════════════════════════
