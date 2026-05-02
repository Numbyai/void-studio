// EVENTS
document.getElementById('btnPlay').addEventListener('click',()=>{if(isPlaying)stopSeq();else startSeq();});
document.getElementById('btnStop').addEventListener('click',stopSeq);
document.getElementById('btnClear').addEventListener('click',()=>{KITS[curKit].tracks.forEach((_,ti)=>{const key=`${curKit}_${ti}`;dGrid[key]=Array(stepCount).fill(null).map(()=>({on:0,vel:.8}));});buildAllTracks();markDirty();});
document.getElementById('bpDn').addEventListener('click',()=>{bpm=Math.max(40,bpm-1);document.getElementById('bpDisp').textContent=bpm;markDirty();});
document.getElementById('bpUp').addEventListener('click',()=>{bpm=Math.min(300,bpm+1);document.getElementById('bpDisp').textContent=bpm;markDirty();});
document.getElementById('swRng').addEventListener('input',e=>{swing=parseInt(e.target.value);document.getElementById('swV').textContent=swing+'%';});
document.getElementById('mvolRng').addEventListener('input',e=>{mvol=parseInt(e.target.value)/100;if(mGain)mGain.gain.value=mvol;});
document.querySelectorAll('.stb').forEach(btn=>{btn.addEventListener('click',()=>{document.querySelectorAll('.stb').forEach(b=>b.classList.remove('on'));btn.classList.add('on');stepCount=parseInt(btn.dataset.s);KITS[curKit].tracks.forEach((_,ti)=>{const key=`${curKit}_${ti}`;if(stepCount===32&&dGrid[key]?.length===16)dGrid[key]=[...dGrid[key],...Array(16).fill(null).map(()=>({on:0,vel:.8}))];else if(stepCount===16&&dGrid[key]?.length===32)dGrid[key]=dGrid[key].slice(0,16);});iTracks.forEach(t=>{Object.keys(t.rollData).forEach(k=>{if(stepCount===32&&t.rollData[k].length===16)t.rollData[k]=[...t.rollData[k],...Array(16).fill(0)];else if(stepCount===16&&t.rollData[k].length===32)t.rollData[k]=t.rollData[k].slice(0,16);});});buildBM();buildSI();buildAllTracks();markDirty();});});
document.querySelectorAll('.kbtn[data-kit]').forEach(btn=>{btn.addEventListener('click',()=>{document.querySelectorAll('.kbtn[data-kit]').forEach(b=>b.classList.remove('on'));btn.classList.add('on');curKit=btn.dataset.kit;buildAllTracks();markDirty();});});

// ══════════════════════════════════════════

