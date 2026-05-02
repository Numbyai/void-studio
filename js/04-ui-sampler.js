// SAMPLER
// ══════════════════════════════════════════
const SMP_PADS=8;
let smpPads=Array.from({length:SMP_PADS},(_,i)=>({id:i,name:null,buffer:null,pitch:0,color:'#7c3aed'}));
let smpRecording=false,smpMediaRecorder=null,smpRecChunks=[],smpMixRecorder=null,smpMixChunks=[],smpMixRecording=false;

// SAMPLER STATE

function buildSmpSources(){
  const c=document.getElementById('smpSources');c.innerHTML='';
  if(!iTracks.length&&!KITS[curKit].tracks.length){c.innerHTML='<div style="padding:8px 12px;font-family:var(--fm);font-size:8px;color:var(--t3)">No tracks in Studio yet</div>';return;}
  // Drum tracks
  KITS[curKit].tracks.forEach((tr,ti)=>{
    const key=`${curKit}_${ti}`;
    const row=document.createElement('div');row.className='smp-src-row';
    const cb=document.createElement('div');cb.className='smp-src-cb';cb.style.background=tr.color;
    const nm=document.createElement('div');nm.className='smp-src-nm';nm.textContent=tr.name;
    const btn=document.createElement('button');btn.className='smp-src-send';btn.textContent='→ Pad';
    btn.addEventListener('click',()=>renderTrackToPad(tr,key,'drum'));
    row.append(cb,nm,btn);c.appendChild(row);
  });
  // Instrument tracks
  iTracks.forEach(track=>{
    const row=document.createElement('div');row.className='smp-src-row';
    const cb=document.createElement('div');cb.className='smp-src-cb';cb.style.background=track.def.color;
    const nm=document.createElement('div');nm.className='smp-src-nm';nm.textContent=track.def.label;
    const btn=document.createElement('button');btn.className='smp-src-send';btn.textContent='→ Pad';
    btn.addEventListener('click',()=>renderTrackToPad(track,track.id,'inst'));
    row.append(cb,nm,btn);c.appendChild(row);
  });
}

function renderTrackToPad(trackDef,key,type){
  iCtx();
  const slot=smpPads.findIndex(p=>!p.buffer);
  if(slot<0){alert('All 8 pads are full. Clear a pad first.');return;}
  // Use OfflineAudioContext to render silently
  const sS=60/bpm/4;
  const totalDur=stepCount*sS+1;
  const offCtx=new OfflineAudioContext(2,Math.ceil(totalDur*44100),44100);
  const oldCtx=ctx,oldGain=mGain;
  ctx=offCtx;mGain=offCtx.createGain();mGain.gain.value=1;mGain.connect(offCtx.destination);
  try{
    for(let s=0;s<stepCount;s++){
      const when=s*sS;
      if(type==='drum'){
        const sd=dGrid[key]&&dGrid[key][s];
        if(sd&&sd.on)playDrum(trackDef.type,(dVols[key]||trackDef.vel)*(sd.vel||.8),when,dSD[key]||{});
      }else{
        Object.keys(trackDef.rollData).forEach(rollKey=>{
          if(trackDef.rollData[rollKey]&&trackDef.rollData[rollKey][s]){
            const hasOct=/\d$/.test(rollKey);
            const note=hasOct?rollKey.slice(0,-1):rollKey;
            const oct=hasOct?parseInt(rollKey.slice(-1)):trackDef.octave;
            playMel(trackDef.type,note,oct,trackDef.vol,when,trackDef.sd);
          }
        });
      }
    }
  }finally{
    ctx=oldCtx;mGain=oldGain;
  }
  offCtx.startRendering().then(buf=>{
    smpPads[slot].buffer=buf;
    smpPads[slot].name=type==='drum'?trackDef.name:trackDef.def.label;
    smpPads[slot].color=type==='drum'?trackDef.color:trackDef.def.color;
    smpPads[slot].pitch=0;
    buildSmpPads();
  }).catch(e=>console.error('Render failed',e));
}

function buildSmpPads(){
  const c=document.getElementById('smpPads');c.innerHTML='';
  const KEYS=['1','2','3','4','5','6','7','8'];
  smpPads.forEach((pad,i)=>{
    const el=document.createElement('div');
    el.className='smp-pad'+(pad.buffer?' loaded':'');
    el.id=`spad_${i}`;

    // Key label
    const kl=document.createElement('div');kl.className='smp-pad-key';kl.textContent=KEYS[i];el.appendChild(kl);

    if(pad.buffer){
      const nm=document.createElement('div');nm.className='smp-pad-name';nm.textContent=pad.name;nm.style.borderLeft=`2px solid ${pad.color}`;nm.style.paddingLeft='5px';el.appendChild(nm);
      // Waveform
      const wv=document.createElement('div');wv.className='smp-waveform';
      const cv2=document.createElement('canvas');cv2.className='smp-wv-canvas';cv2.width=200;cv2.height=24;wv.appendChild(cv2);el.appendChild(wv);
      drawWaveform(cv2,pad.buffer,pad.color);
      // Actions row
      const acts=document.createElement('div');acts.className='smp-pad-actions';
      const playBtn=document.createElement('button');playBtn.className='smp-pad-btn play';playBtn.textContent='▶ Play';
      playBtn.addEventListener('click',e=>{e.stopPropagation();iCtx();playSmpPad(i);});
      const delBtn=document.createElement('button');delBtn.className='smp-pad-btn del';delBtn.textContent='✕';
      delBtn.addEventListener('click',e=>{e.stopPropagation();smpPads[i]={id:i,name:null,buffer:null,pitch:0,color:'#7c3aed'};buildSmpPads();});
      // Pitch
      const pitchWrap=document.createElement('div');pitchWrap.className='smp-pad-pitch';
      const pDn=document.createElement('button');pDn.className='smp-pitch-btn';pDn.textContent='−';
      pDn.addEventListener('click',e=>{e.stopPropagation();smpPads[i].pitch=Math.max(-12,smpPads[i].pitch-1);document.getElementById(`spitch_${i}`).textContent=smpPads[i].pitch+'st';});
      const pVal=document.createElement('span');pVal.className='smp-pitch-val';pVal.id=`spitch_${i}`;pVal.textContent=pad.pitch+'st';
      const pUp=document.createElement('button');pUp.className='smp-pitch-btn';pUp.textContent='+';
      pUp.addEventListener('click',e=>{e.stopPropagation();smpPads[i].pitch=Math.min(12,smpPads[i].pitch+1);document.getElementById(`spitch_${i}`).textContent=smpPads[i].pitch+'st';});
      const pLbl=document.createElement('span');pLbl.className='smp-pitch-lbl';pLbl.textContent='Pitch';
      pitchWrap.append(pLbl,pDn,pVal,pUp);
      acts.append(playBtn,pitchWrap,delBtn);el.appendChild(acts);
    }else{
      // Empty pad options
      const nm=document.createElement('div');nm.className='smp-pad-empty';nm.textContent='Empty';el.appendChild(nm);
      const acts=document.createElement('div');acts.className='smp-pad-actions';
      const micBtn=document.createElement('button');micBtn.className='smp-pad-btn mic';micBtn.textContent='⏺ Mic';
      micBtn.addEventListener('click',e=>{e.stopPropagation();startMicRecord(i);});
      const fileBtn=document.createElement('button');fileBtn.className='smp-pad-btn';fileBtn.textContent='↑ File';
      fileBtn.addEventListener('click',e=>{e.stopPropagation();const fi=document.getElementById('smpFileInput');fi.dataset.targetPad=i;fi.click();});
      acts.append(micBtn,fileBtn);el.appendChild(acts);
      // Upload zone
      const uz=document.createElement('div');uz.className='smp-upload-zone';uz.textContent='Drop audio here';el.appendChild(uz);
      el.addEventListener('dragover',e=>{e.preventDefault();el.classList.add('dragover');});
      el.addEventListener('dragleave',()=>el.classList.remove('dragover'));
      el.addEventListener('drop',e=>{e.preventDefault();el.classList.remove('dragover');const f=e.dataTransfer.files[0];if(f)loadFileIntoPad(f,i);});
    }
    // Click pad to play
    el.addEventListener('click',()=>{if(pad.buffer){iCtx();playSmpPad(i);}});
    c.appendChild(el);
  });
}

function drawWaveform(canvas,buffer,color){
  const cx2=canvas.getContext('2d');const w=canvas.width,h=canvas.height;
  cx2.clearRect(0,0,w,h);
  const data=buffer.getChannelData(0);
  const step=Math.ceil(data.length/w);
  cx2.strokeStyle=color||'#7c3aed';cx2.lineWidth=1;cx2.beginPath();
  for(let x=0;x<w;x++){let max=0;for(let j=0;j<step;j++){const v=Math.abs(data[x*step+j]||0);if(v>max)max=v;}cx2.moveTo(x,h/2-max*h/2*0.9);cx2.lineTo(x,h/2+max*h/2*0.9);}
  cx2.stroke();
}

function playSmpPad(i){
  const pad=smpPads[i];if(!pad.buffer||!ctx)return;
  const src=ctx.createBufferSource();src.buffer=pad.buffer;
  if(pad.pitch!==0)src.detune.value=pad.pitch*100;
  src.connect(mGain);src.start(Math.max(ctx.currentTime,ctx.currentTime));
  const el=document.getElementById(`spad_${i}`);if(el){el.classList.add('active');setTimeout(()=>el.classList.remove('active'),150);}
}

// Mic recording into a pad
async function startMicRecord(padIndex){
  iCtx();
  let stream;try{stream=await navigator.mediaDevices.getUserMedia({audio:true});}catch(e){alert('Microphone access denied. Please allow mic in your browser settings.');return;}
  const el=document.getElementById(`spad_${padIndex}`);if(el)el.classList.add('recording-target');
  document.getElementById('smpRecStatus').textContent=`Recording pad ${padIndex+1}...`;
  smpRecChunks=[];
  smpMediaRecorder=new MediaRecorder(stream);
  smpMediaRecorder.ondataavailable=e=>smpRecChunks.push(e.data);
  smpMediaRecorder.onstop=async()=>{
    stream.getTracks().forEach(t=>t.stop());
    const blob=new Blob(smpRecChunks,{type:'audio/webm'});
    const ab=await blob.arrayBuffer();
    const decoded=await ctx.decodeAudioData(ab);
    smpPads[padIndex].buffer=decoded;smpPads[padIndex].name='Recording '+(padIndex+1);smpPads[padIndex].pitch=0;
    if(el)el.classList.remove('recording-target');
    document.getElementById('smpRecStatus').textContent='';
    buildSmpPads();
  };
  smpMediaRecorder.start();
  // Show stop button in status
  document.getElementById('smpRecStatus').innerHTML='Recording... <button onclick="stopMicRecord()" style="font-family:var(--fm);font-size:7px;padding:2px 6px;border-radius:3px;border:1px solid var(--pink);background:rgba(255,45,107,.1);color:var(--pink);cursor:pointer;margin-left:6px;">■ Stop</button>';
}

function stopMicRecord(){if(smpMediaRecorder&&smpMediaRecorder.state!=='inactive')smpMediaRecorder.stop();}

// File import into a pad
function smpImportFile(evt){
  const f=evt.target.files[0];if(!f)return;
  const targetPad=parseInt(evt.target.dataset.targetPad)||0;
  loadFileIntoPad(f,targetPad);
  evt.target.value='';
}
function loadFileIntoPad(file,padIndex){
  iCtx();
  const reader=new FileReader();
  reader.onload=async e=>{
    try{const decoded=await ctx.decodeAudioData(e.target.result);smpPads[padIndex].buffer=decoded;smpPads[padIndex].name=file.name.replace(/\.[^/.]+$/,'').slice(0,18);smpPads[padIndex].pitch=0;buildSmpPads();}
    catch(err){alert('Could not decode audio file. Try WAV or MP3.');}
  };reader.readAsArrayBuffer(file);
}

// Record mix → new audio track
async function toggleSmpRec(){
  if(smpMixRecording){
    // Stop
    if(smpMixRecorder&&smpMixRecorder.state!=='inactive')smpMixRecorder.stop();
  }else{
    // Start — capture audio output via destination stream
    iCtx();
    if(!ctx.createMediaStreamDestination){alert('Mix recording not supported in this browser.');return;}
    const dest=ctx.createMediaStreamDestination();mGain.connect(dest);
    smpMixChunks=[];smpMixRecording=true;
    smpMixRecorder=new MediaRecorder(dest.stream);
    smpMixRecorder.ondataavailable=e=>smpMixChunks.push(e.data);
    smpMixRecorder.onstop=async()=>{
      mGain.disconnect(dest);smpMixRecording=false;
      document.getElementById('smpRecBtn').classList.remove('recording');
      document.getElementById('smpRecBtn').innerHTML='<div class="smp-rec-dot"></div>Rec Mix';
      const blob=new Blob(smpMixChunks,{type:'audio/webm'});
      const ab=await blob.arrayBuffer();
      const decoded=await ctx.decodeAudioData(ab);
      // Add as new sampler pad
      const slot=smpPads.findIndex(p=>!p.buffer);
      if(slot>=0){smpPads[slot].buffer=decoded;smpPads[slot].name='Mix Take';smpPads[slot].pitch=0;buildSmpPads();}
      else{alert('All pads full — clear one to save your mix recording.');}
    };
    smpMixRecorder.start();
    document.getElementById('smpRecBtn').classList.add('recording');
    document.getElementById('smpRecBtn').innerHTML='<div class="smp-rec-dot"></div>■ Stop';
  }
}

// Keyboard triggers 1-8 for sampler pads
document.addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')return;
  if(!document.getElementById('screen-smp').classList.contains('on'))return;
  const num=parseInt(e.key);
  if(num>=1&&num<=8&&smpPads[num-1]&&smpPads[num-1].buffer){iCtx();playSmpPad(num-1);}
});

// Rebuild sampler sources whenever studio tracks change
function refreshSampler(){if(document.getElementById('screen-smp').classList.contains('on')){buildSmpSources();buildSmpPads();}}

