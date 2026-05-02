// PLAYGROUND
// ══════════════════════════════════════════
const BAR_W = 80; // px per bar
let pgSongLen = 32; // bars
let pgTracks = []; // [{id, name, color, active, type, drumKey}]
let pgBlocks = []; // [{id, trackId, bar, len}]
let pgPlaying = false;
let pgCurBar = 0;
let pgSeqInt = null;
let pgNextNT = 0;
let pgDragState = null;

function nav(s) {
  document.querySelectorAll('.screen').forEach(x=>x.classList.remove('on'));
  document.querySelectorAll('.ntab').forEach(x=>x.classList.remove('on'));
  document.getElementById('screen-'+s).classList.add('on');
  document.getElementById('nt-'+s).classList.add('on');
  if(s==='sb') buildSB();
  if(s==='smp') {buildSmpSources();buildSmpPads();}
  if(s==='pg') { pgSync(); buildPG(); }
  if(s==='ai') {
    if(!aiAgent){ document.getElementById('screen-ai').classList.remove('on'); document.getElementById('nt-ai').classList.remove('on'); document.getElementById('screen-hub').classList.add('on'); document.getElementById('nt-hub').classList.add('on'); openAIModal(); }
    else if(!aiAgent.imagesReady){ document.getElementById('screen-ai').classList.remove('on'); document.getElementById('nt-ai').classList.remove('on'); document.getElementById('screen-hub').classList.add('on'); document.getElementById('nt-hub').classList.add('on'); }
    else { applyChatTheme(); }
  }
}

// Pull current tracks from studio into playground
function pgSync() {
  const existing = new Map(pgTracks.map(t=>[t.id,t]));
  const next = [];
  KITS[curKit].tracks.forEach((tr,ti)=>{
    const id = `${curKit}_${ti}`;
    const prev = existing.get(id);
    next.push({ id, name:tr.name, color:tr.color, type:'drum', drumKey:id, active: prev ? prev.active : true });
  });
  iTracks.forEach(t=>{
    const prev = existing.get(t.id);
    next.push({ id:t.id, name:t.def.label, color:t.def.color, type:'inst', ref:t, active: prev ? prev.active : true });
  });
  // Remove blocks for tracks that no longer exist
  const ids = new Set(next.map(t=>t.id));
  pgBlocks = pgBlocks.filter(b=>ids.has(b.trackId));
  pgTracks = next;
  if(document.getElementById('screen-pg').classList.contains('on')) buildPG();
}

function adjSongLen(d) {
  pgSongLen = Math.max(8, Math.min(128, pgSongLen + d));
  document.getElementById('pgLenDisp').textContent = pgSongLen + ' bars';
  buildPG();
}

function buildPG() {
  buildPGTrackList();
  buildPGCanvas();
}

function buildPGTrackList() {
  const c = document.getElementById('pgTrackList'); c.innerHTML='';
  if(!pgTracks.length) {
    c.innerHTML='<div style="padding:16px;font-family:var(--fm);font-size:9px;color:var(--t3);text-align:center;letter-spacing:1px">Go to Studio first to build tracks</div>';
    return;
  }
  pgTracks.forEach(tr=>{
    const row=document.createElement('div'); row.className='pg-track-row'+(tr.active?'':' muted');
    const cb=document.createElement('div'); cb.className='pg-tcb'; cb.style.cssText=`background:${tr.color};box-shadow:0 0 5px ${tr.color}55;`;
    const nm=document.createElement('div'); nm.className='pg-tnm'; nm.textContent=tr.name;
    const act=document.createElement('button'); act.className='pg-tact'+(tr.active?' on':''); act.textContent=tr.active?'ON':'OFF';
    act.addEventListener('click',()=>{tr.active=!tr.active;row.classList.toggle('muted',!tr.active);act.className='pg-tact'+(tr.active?' on':'');act.textContent=tr.active?'ON':'OFF';buildPGCanvas();});
    row.append(cb,nm,act); c.appendChild(row);
  });
}

function buildPGCanvas() {
  const inner = document.getElementById('pgLanesInner');
  const hdrInner = document.getElementById('pgBarHdrInner');
  const totalW = pgSongLen * BAR_W;

  // Bar header
  hdrInner.innerHTML='';
  hdrInner.style.width = totalW+'px';
  for(let b=1;b<=pgSongLen;b++){
    const lbl=document.createElement('div'); lbl.className='pg-bar-lbl'+(b%4===1?' b4':'');
    lbl.style.cssText=`width:${BAR_W}px;flex-shrink:0;text-align:center;font-family:var(--fm);font-size:8px;color:${b%4===1?'var(--t2)':'var(--t3)'};`;
    lbl.textContent=b; hdrInner.appendChild(lbl);
  }

  // Remove old lanes (keep playhead)
  const ph = document.getElementById('pgPlayhead');
  inner.innerHTML=''; inner.style.width=totalW+'px'; inner.style.position='relative';
  inner.appendChild(ph);
  inner.style.minHeight = (pgTracks.length * 40) + 'px';

  pgTracks.forEach((tr,ti)=>{
    const lane=document.createElement('div'); lane.className='pg-lane';
    lane.style.cssText=`height:40px;width:${totalW}px;position:relative;border-bottom:1px solid var(--b1);background:${tr.active?'transparent':'rgba(0,0,0,.2)'};`;
    lane.dataset.trackId=tr.id;

    // Grid lines
    for(let b=0;b<pgSongLen;b++){
      const cell=document.createElement('div');
      cell.style.cssText=`position:absolute;top:0;bottom:0;left:${b*BAR_W}px;width:${BAR_W}px;border-right:1px solid rgba(255,255,255,${b%4===3?'.05':'.02'});pointer-events:none;`;
      lane.appendChild(cell);
    }

    // Empty hint
    const blocks = pgBlocks.filter(bl=>bl.trackId===tr.id);
    if(!blocks.length) {
      const hint=document.createElement('div'); hint.className='pg-lane-hint';
      hint.textContent='click any bar to add loop';
      lane.appendChild(hint);
    }

    // Render existing blocks
    blocks.forEach(bl=>renderBlock(bl,lane,tr));

    // Click to add block (snapped)
    lane.addEventListener('click', e=>{
      if(e.target.classList.contains('pg-block')) return;
      if(pgDragState) return;
      const snap = parseInt(document.getElementById('pgSnap').value);
      const rect = lane.getBoundingClientRect();
      const x = e.clientX - rect.left + document.getElementById('pgLanes').scrollLeft;
      let bar = Math.floor(x / BAR_W);
      bar = Math.floor(bar / snap) * snap;
      bar = Math.max(0, Math.min(pgSongLen - snap, bar));
      // Check no overlap on this track
      const len = snap;
      const overlaps = pgBlocks.some(b=>b.trackId===tr.id && b.bar<bar+len && b.bar+b.len>bar);
      if(overlaps) return;
      const id = `bl_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
      pgBlocks.push({id, trackId:tr.id, bar, len:snap});
      buildPGCanvas();
    });

    inner.appendChild(lane);
  });
}

function renderBlock(bl, lane, tr) {
  const block = document.createElement('div');
  block.className = 'pg-block';
  block.id = `pgbl_${bl.id}`;
  block.style.cssText = `left:${bl.bar*BAR_W+2}px;width:${bl.len*BAR_W-4}px;background:${tr.color};opacity:${tr.active?.88:.35};color:#000;font-size:9px;font-weight:700;letter-spacing:.5px;box-shadow:0 2px 12px ${tr.color}55;`;
  block.textContent = tr.name;
  block.title = `${tr.name} — ${bl.len} bar${bl.len>1?'s':''} @ bar ${bl.bar+1} • Right-click to remove`;

  // Drag
  block.addEventListener('mousedown', e=>{
    if(e.button!==0) return;
    e.stopPropagation();
    const startX = e.clientX;
    const startBar = bl.bar;
    const snap = parseInt(document.getElementById('pgSnap').value);
    pgDragState = {bl, startX, startBar, snap};
    block.classList.add('dragging');
    const onMove = ev=>{
      const dx = ev.clientX - startX;
      const dBars = Math.round(dx / BAR_W / snap) * snap;
      let newBar = Math.max(0, Math.min(pgSongLen - bl.len, startBar + dBars));
      // Check no overlap (excluding self)
      const overlaps = pgBlocks.some(b=>b.id!==bl.id&&b.trackId===bl.trackId&&b.bar<newBar+bl.len&&b.bar+b.len>newBar);
      if(!overlaps) { bl.bar=newBar; block.style.left=`${newBar*BAR_W+2}px`; }
    };
    const onUp = ()=>{
      block.classList.remove('dragging');
      pgDragState=null;
      document.removeEventListener('mousemove',onMove);
      document.removeEventListener('mouseup',onUp);
      buildPGCanvas();
    };
    document.addEventListener('mousemove',onMove);
    document.addEventListener('mouseup',onUp);
  });

  // Right-click or dblclick to remove
  block.addEventListener('contextmenu',e=>{e.preventDefault();pgBlocks=pgBlocks.filter(b=>b.id!==bl.id);buildPGCanvas();});
  block.addEventListener('dblclick',e=>{e.stopPropagation();pgBlocks=pgBlocks.filter(b=>b.id!==bl.id);buildPGCanvas();});

  lane.appendChild(block);
}

// Sync lanes scroll with bar header
document.addEventListener('DOMContentLoaded',()=>{
  const lanes=document.getElementById('pgLanes');
  const hdr=document.getElementById('pgBarHdr');
  if(lanes&&hdr) lanes.addEventListener('scroll',()=>{hdr.scrollLeft=lanes.scrollLeft;});
});

// PLAYGROUND PLAYBACK
function pgStartPlay() {
  if(pgPlaying) return;
  iCtx(); pgPlaying=true; pgCurBar=0; pgNextNT=ctx.currentTime+.05;
  document.getElementById('pgPlayhead').style.display='block';
  document.getElementById('pgPlay').className='btn playing';
  document.getElementById('pgPlay').textContent='⏸ Pause';
  pgSeqInt=setInterval(pgScheduler, 25);
}

function pgStopPlay() {
  pgPlaying=false; clearInterval(pgSeqInt); pgCurBar=0;
  document.getElementById('pgPlayhead').style.display='none';
  document.getElementById('pgPlay').className='btn';
  document.getElementById('pgPlay').style.cssText='background:linear-gradient(135deg,var(--pink),#b01f4a);border-color:var(--pink);color:#fff;box-shadow:0 0 18px rgba(255,45,107,.3)';
  document.getElementById('pgPlay').textContent='▶ Play';
  document.getElementById('pgBarDisp').innerHTML='Bar <span>1</span>';
}

function pgScheduler() {
  const secsPerBar = (60/bpm) * 4; // 4 beats per bar
  if(pgNextNT < ctx.currentTime) pgNextNT = ctx.currentTime + .01;
  while(pgNextNT < ctx.currentTime + .15) {
    if(pgCurBar >= pgSongLen) { pgStopPlay(); return; }
    const bar = pgCurBar;
    const when = pgNextNT;

    // Find which tracks have a block covering this bar and are active
    pgTracks.forEach(tr=>{
      if(!tr.active) return;
      const bl = pgBlocks.find(b=>b.trackId===tr.id && bar>=b.bar && bar<b.bar+b.len);
      if(!bl) return;
      // Play one step-loop worth of audio at this bar
      const stepsPerBar = 4;
      const stepSec = secsPerBar / stepsPerBar;
      for(let s=0;s<stepCount;s++) {
        const stepWhen = when + (s/stepCount)*secsPerBar;
        if(tr.type==='drum') {
          const sd = dGrid[tr.drumKey] && dGrid[tr.drumKey][s];
          if(sd&&sd.on&&!dMuted[tr.drumKey]) {
            const ti = KITS[curKit].tracks.findIndex((_,i)=>`${curKit}_${i}`===tr.drumKey);
            if(ti>=0) { const t=KITS[curKit].tracks[ti]; playDrum(t.type,(dVols[tr.drumKey]||t.vel)*(sd.vel||.8),stepWhen,dSD[tr.drumKey]||{}); }
          }
        } else if(tr.type==='inst'&&tr.ref) {
          Object.keys(tr.ref.rollData).forEach(rollKey=>{
            if(tr.ref.rollData[rollKey]&&tr.ref.rollData[rollKey][s]){
              const hasOct=/\d$/.test(rollKey);
              const note=hasOct?rollKey.slice(0,-1):rollKey;
              const oct=hasOct?parseInt(rollKey.slice(-1)):tr.ref.octave;
              playMel(tr.ref.type,note,oct,tr.ref.vol,stepWhen,tr.ref.sd);
            }
          });
        }
      }
    });

    // UI update
    const snapBar = bar;
    setTimeout(()=>{
      if(!pgPlaying) return;
      const ph=document.getElementById('pgPlayhead');
      if(ph) ph.style.left=`${snapBar*BAR_W}px`;
      // Scroll to keep playhead visible
      const lanes=document.getElementById('pgLanes');
      if(lanes){const phX=snapBar*BAR_W;if(phX<lanes.scrollLeft||phX>lanes.scrollLeft+lanes.clientWidth-BAR_W*2)lanes.scrollLeft=Math.max(0,phX-100);}
      document.getElementById('pgBarDisp').innerHTML=`Bar <span>${snapBar+1}</span>`;
    }, Math.max(0,(when-ctx.currentTime)*1000-20));

    pgNextNT += secsPerBar;
    pgCurBar++;
  }
}

document.getElementById('pgPlay').addEventListener('click',()=>{ if(pgPlaying)pgStopPlay();else pgStartPlay(); });
document.getElementById('pgStop').addEventListener('click',pgStopPlay);
