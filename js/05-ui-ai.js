// ══════════════════════════════════════════
// AI AGENT SYSTEM
// ══════════════════════════════════════════
let aiAgent = null;
let aiChatBgAnim = null;
let aiChatBgState = {};
let aiChatBgFrame = null;
let _pollinationsAvailable = null; // null=untested — resets on each page load

// ── Environment detection — test once on first AI generation ──
async function checkPollinations() {
  if (_pollinationsAvailable !== null) return _pollinationsAvailable;
  try {
    // Tiny 32x32 test image — fast, minimal data
    const testUrl = 'https://image.pollinations.ai/prompt/test?width=32&height=32&model=flux&nologo=true&enhance=false&seed=1';
    const result = await new Promise((resolve) => {
      const img = new Image();
      const timer = setTimeout(() => { img.src=''; resolve(false); }, 25000);
      img.onload = () => { clearTimeout(timer); resolve(true); };
      img.onerror = () => { clearTimeout(timer); resolve(false); };
      img.src = testUrl;
    });
    _pollinationsAvailable = result;
  } catch(e) {
    _pollinationsAvailable = false;
  }
  return _pollinationsAvailable;
}

// ── Claude SVG avatar generation — fallback when Pollinations unavailable ──
async function generateSVGAvatar(parsed, name, prompt) {
  const response = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `Generate a detailed SVG portrait for an AI character described as: "${prompt}". Name: "${name}".

Return ONLY a raw SVG string, no markdown, no explanation. The SVG must:
- Be exactly viewBox="0 0 200 200"
- Be a circular portrait (clip to circle)
- Have a rich detailed background gradient matching the character
- Have a detailed face/figure matching the character description
- Use colors that match: skin=${parsed.avatarData?.skin||'#c8956c'}, hair=${parsed.avatarData?.hair||'#1a0a00'}, eyes=${parsed.avatarData?.eyes||'#2a6ef5'}, primary=${parsed.palette?.primary||'#7c3aed'}
- Include atmospheric glow, detailed eyes with highlights, expressive features
- Be creative and unique to this specific character
- No text elements

Start your response with: <svg`
      }]
    })
  });
  const data = await response.json();
  const svgText = data.content[0].text.trim();
  if (!svgText.startsWith('<svg')) throw new Error('Invalid SVG response');
  // Convert SVG to data URL
  const blob = new Blob([svgText], {type: 'image/svg+xml'});
  return URL.createObjectURL(blob);
}

// ── Claude SVG background generation ──
async function generateSVGBackground(parsed, prompt) {
  const style = parsed.chatTheme?.style || 'space';
  const primary = parsed.palette?.primary || '#7c3aed';
  const ambient = parsed.chatTheme?.ambientColor || primary;

  const response = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `Generate a detailed atmospheric SVG background scene for an AI character described as: "${prompt}". The scene style is: "${style}".

Return ONLY a raw SVG string, no markdown, no explanation. The SVG must:
- Be exactly viewBox="0 0 800 500" width="800" height="500"
- Be a rich atmospheric scene matching the character and style: ${style}
- Use these colors as the dominant palette: ${primary}, ${ambient}, dark backgrounds
- No people, no faces — just the environment/scene
- Include: layered background gradients, architectural or environmental elements, atmospheric particles or effects, depth and detail
- Be cinematic and immersive
- Creative, detailed, unique to this character

Examples by style:
- studio: mixing console, track lights, speaker grills, smoke, vinyl records
- space: nebula clouds, stars, planets, cosmic dust
- street: city skyline, neon signs, wet road reflections, rain
- temple: stone pillars, lanterns, cherry blossoms, moonlight
- cyberpunk: neon grid, buildings with glowing windows, digital rain
- jungle: canopy silhouettes, bioluminescent particles, mist
- ocean: waves, underwater glow, bubble streams
- desert: dune silhouettes, stars, moon

Start your response with: <svg`
      }]
    })
  });
  const data = await response.json();
  const svgText = data.content[0].text.trim();
  if (!svgText.startsWith('<svg')) throw new Error('Invalid SVG response');
  const blob = new Blob([svgText], {type: 'image/svg+xml'});
  return URL.createObjectURL(blob);
}

// Load saved AI on startup
function loadAI() {
  try {
    const saved = localStorage.getItem('void_ai');
    if (saved) {
      aiAgent = JSON.parse(saved);
      renderAIBubble();
      applyChatTheme();
      // If images were mid-generation when app closed, clear the incomplete state
      if (aiAgent && !aiAgent.imagesReady) {
        aiAgent = null;
        localStorage.removeItem('void_ai');
        renderAIBubble();
      }
    }
  } catch(e) { aiAgent = null; }
}

function saveAI() {
  try { localStorage.setItem('void_ai', JSON.stringify(aiAgent)); } catch(e) {}
}

// ── BUBBLE ──
function renderAIBubble() {
  const bubble = document.getElementById('aiBubble');
  const nameEl = document.getElementById('aiBubbleName');
  const createEl = document.getElementById('aiBubbleCreate');
  const canvas = document.getElementById('aiBubbleCanvas');
  const pulse = document.getElementById('aiBubblePulse');

  // Helper — clear injected children but keep canvas and pulse
  function clearBubbleExtras() {
    bubble.querySelectorAll('.ai-bubble-img,.ai-bubble-spinner').forEach(el => el.remove());
  }

  if (!aiAgent) {
    bubble.className = 'ai-bubble no-ai';
    nameEl.textContent = 'Create AI';
    createEl.style.display = 'block';
    clearBubbleExtras();
    canvas.style.display = 'block';
    drawDefaultBubble(canvas);
    return;
  }

  // ── Loading state — images not ready yet ──
  if (!aiAgent.imagesReady) {
    bubble.className = 'ai-bubble loading';
    pulse.style.borderColor = 'rgba(124,58,237,.5)';
    nameEl.textContent = aiAgent.name || '...';
    nameEl.style.color = 'var(--t3)';
    createEl.style.display = 'block';
    createEl.textContent = 'generating...';
    clearBubbleExtras();
    canvas.style.display = 'none';
    // Build spinner if not already there
    const spinner = document.createElement('div');
    spinner.className = 'ai-bubble-spinner';
    spinner.innerHTML = '<div class="ai-bubble-spinner-ring"></div><div class="ai-bubble-loading-txt">Building<br>your AI</div>';
    bubble.appendChild(spinner);
    return;
  }

  // ── Ready state ──
  bubble.className = 'ai-bubble has-ai';
  bubble.style.setProperty('--ai-color', aiAgent.palette?.primary || 'var(--ether)');
  pulse.style.borderColor = aiAgent.palette?.primary || 'var(--ether)';
  nameEl.textContent = aiAgent.name || 'My AI';
  nameEl.style.color = aiAgent.palette?.primary || 'var(--t2)';
  createEl.style.display = 'none';
  clearBubbleExtras();

  if (aiAgent.avatarImg) {
    canvas.style.display = 'none';
    const img = document.createElement('img');
    img.className = 'ai-bubble-img';
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;position:absolute;inset:0;';
    img.src = aiAgent.avatarImg;
    bubble.insertBefore(img, canvas);
  } else {
    canvas.style.display = 'block';
    drawAvatarCanvas(canvas, aiAgent.avatarData, 86);
  }
}

function drawDefaultBubble(canvas) {
  const cx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  cx.clearRect(0,0,w,h);
  // Dark bg
  cx.fillStyle = '#111520';
  cx.beginPath();cx.arc(w/2,h/2,w/2,0,Math.PI*2);cx.fill();
  // Simple question mark / plus icon
  cx.strokeStyle = 'rgba(124,58,237,.5)';cx.lineWidth = 1.5;
  cx.beginPath();cx.arc(w/2,h/2,w/2-2,0,Math.PI*2);cx.stroke();
  // Ether dot pulse
  cx.fillStyle = '#7c3aed';
  cx.beginPath();cx.arc(w/2,h/2,6,0,Math.PI*2);cx.fill();
  cx.fillStyle = 'rgba(124,58,237,.25)';
  cx.beginPath();cx.arc(w/2,h/2,12,0,Math.PI*2);cx.fill();
}

// Draw avatar from avatarData onto any canvas at given size
function drawAvatarCanvas(canvas, data, size) {
  if (!data) { drawDefaultBubble(canvas); return; }
  const cx = canvas.getContext('2d');
  const w = canvas.width = size, h = canvas.height = size;
  cx.clearRect(0,0,w,h);

  cx.save();
  cx.beginPath(); cx.arc(w/2,h/2,w/2,0,Math.PI*2); cx.clip();

  // ── Rich background gradient ──
  const bg = cx.createLinearGradient(0,0,w*0.3,h);
  bg.addColorStop(0, data.bgTop || '#0d1018');
  bg.addColorStop(0.6, data.bgBot || '#050608');
  bg.addColorStop(1, '#020305');
  cx.fillStyle = bg; cx.fillRect(0,0,w,h);

  // Subtle bg texture lines
  cx.strokeStyle = 'rgba(255,255,255,.025)'; cx.lineWidth = 0.5;
  for(let i=0;i<6;i++){cx.beginPath();cx.moveTo(0,h*(0.1+i*0.15));cx.lineTo(w,h*(0.05+i*0.17));cx.stroke();}

  // ── Clothing / body ──
  const cloth = data.clothingColor || '#1a1a2e';
  cx.fillStyle = cloth;
  // Shoulders and chest as a trapezoid
  cx.beginPath();
  cx.moveTo(w*-0.05, h);
  cx.lineTo(w*1.05, h);
  cx.lineTo(w*0.85, h*0.72);
  cx.lineTo(w*0.15, h*0.72);
  cx.closePath(); cx.fill();
  // Collar detail
  const collarLight = hexAlpha(cloth, 0.6);
  cx.fillStyle = hexAlpha('#fff', 0.04);
  cx.beginPath();
  cx.moveTo(w*0.35, h*0.72); cx.lineTo(w*0.5, h*0.85);
  cx.lineTo(w*0.65, h*0.72); cx.closePath(); cx.fill();
  // Clothing shadow at top
  const clothShadow = cx.createLinearGradient(0,h*0.7,0,h*0.78);
  clothShadow.addColorStop(0,'rgba(0,0,0,.35)'); clothShadow.addColorStop(1,'rgba(0,0,0,0)');
  cx.fillStyle = clothShadow; cx.fillRect(0,h*0.7,w,h*0.08);

  // ── Neck ──
  const skin = data.skin || '#c8956c';
  const skinDark = data.shadow || 'rgba(120,65,30,.5)';
  cx.fillStyle = skin;
  cx.beginPath();
  cx.moveTo(w*0.41,h*0.72); cx.lineTo(w*0.59,h*0.72);
  cx.lineTo(w*0.56,h*0.62); cx.lineTo(w*0.44,h*0.62); cx.closePath(); cx.fill();
  // Neck shadow sides
  cx.fillStyle = skinDark;
  cx.beginPath(); cx.moveTo(w*0.41,h*0.72); cx.lineTo(w*0.44,h*0.62); cx.lineTo(w*0.44,h*0.72); cx.closePath(); cx.fill();
  cx.beginPath(); cx.moveTo(w*0.59,h*0.72); cx.lineTo(w*0.56,h*0.62); cx.lineTo(w*0.56,h*0.72); cx.closePath(); cx.fill();

  // ── Face base ──
  const faceX = w*0.5, faceY = h*0.44;
  const faceRx = w*0.28, faceRy = h*0.3;
  // Face shadow (depth under jaw)
  cx.fillStyle = hexAlpha(skinDark, 0.4);
  cx.beginPath(); cx.ellipse(faceX, faceY+h*0.02, faceRx*1.02, faceRy*1.02, 0, 0, Math.PI*2); cx.fill();
  // Face skin
  cx.fillStyle = skin;
  cx.beginPath(); cx.ellipse(faceX, faceY, faceRx, faceRy, 0, 0, Math.PI*2); cx.fill();
  // Cheek blush
  const blush = hexAlpha(data.lips||'#d4756a', 0.09);
  cx.fillStyle = blush;
  cx.beginPath(); cx.ellipse(faceX-faceRx*0.55, faceY+h*0.04, faceRx*0.28, faceRy*0.18, 0, 0, Math.PI*2); cx.fill();
  cx.beginPath(); cx.ellipse(faceX+faceRx*0.55, faceY+h*0.04, faceRx*0.28, faceRy*0.18, 0, 0, Math.PI*2); cx.fill();
  // Forehead subtle highlight
  const fhGrad = cx.createRadialGradient(faceX, faceY-faceRy*0.5, 0, faceX, faceY-faceRy*0.3, faceRx*0.7);
  fhGrad.addColorStop(0,'rgba(255,255,255,.08)'); fhGrad.addColorStop(1,'rgba(255,255,255,0)');
  cx.fillStyle = fhGrad; cx.beginPath(); cx.ellipse(faceX,faceY,faceRx,faceRy,0,0,Math.PI*2); cx.fill();

  // ── Hair ──
  cx.fillStyle = data.hair || '#1a0a00';
  // Main hair mass behind head
  cx.beginPath(); cx.ellipse(faceX, faceY-faceRy*0.4, faceRx*1.12, faceRy*0.85, 0, Math.PI, 0); cx.fill();
  // Hair sides
  cx.beginPath(); cx.ellipse(faceX-faceRx*0.92, faceY+faceRy*0.1, faceRx*0.28, faceRy*0.55, -0.15, 0, Math.PI*2); cx.fill();
  cx.beginPath(); cx.ellipse(faceX+faceRx*0.92, faceY+faceRy*0.1, faceRx*0.28, faceRy*0.55, 0.15, 0, Math.PI*2); cx.fill();
  // Hair highlight strand
  const hairHL = hexAlpha(data.hair||'#1a0a00', 0);
  const hairHLGrad = cx.createLinearGradient(faceX-faceRx*0.3, faceY-faceRy*0.7, faceX+faceRx*0.3, faceY-faceRy*0.4);
  hairHLGrad.addColorStop(0,'rgba(255,255,255,.07)'); hairHLGrad.addColorStop(0.5,'rgba(255,255,255,.02)'); hairHLGrad.addColorStop(1,'rgba(255,255,255,0)');
  cx.fillStyle = hairHLGrad;
  cx.beginPath(); cx.ellipse(faceX, faceY-faceRy*0.5, faceRx*0.8, faceRy*0.5, 0, Math.PI, 0); cx.fill();

  // ── Ears ──
  cx.fillStyle = skin;
  [faceX-faceRx*0.97, faceX+faceRx*0.97].forEach((ex,i) => {
    const flip = i===0?-1:1;
    cx.beginPath(); cx.ellipse(ex, faceY+h*0.01, w*0.045, h*0.058, flip*0.2, 0, Math.PI*2); cx.fill();
    cx.fillStyle = hexAlpha(skinDark, 0.3);
    cx.beginPath(); cx.ellipse(ex+flip*w*0.008, faceY+h*0.01, w*0.025, h*0.036, flip*0.2, 0, Math.PI*2); cx.fill();
    cx.fillStyle = skin;
  });

  // ── Eyebrows ──
  const eyeY = faceY - faceRy*0.18;
  const browColor = data.hair || '#1a0a00';
  cx.strokeStyle = browColor; cx.lineWidth = h*0.022; cx.lineCap = 'round';
  [[faceX-faceRx*0.45, faceX-faceRx*0.12, -0.06],[faceX+faceRx*0.12, faceX+faceRx*0.45, 0.06]].forEach(([x1,x2,tilt])=>{
    cx.beginPath();
    cx.moveTo(x1, eyeY-h*0.055+tilt*h);
    cx.quadraticCurveTo((x1+x2)/2, eyeY-h*0.072, x2, eyeY-h*0.055-tilt*h);
    cx.stroke();
  });

  // ── Eyes ──
  const eyePositions = [faceX-faceRx*0.32, faceX+faceRx*0.32];
  const eyeRx = faceRx*0.18, eyeRy = faceRy*0.13;
  eyePositions.forEach(ex => {
    // Eye socket shadow
    cx.fillStyle = hexAlpha(skinDark, 0.18);
    cx.beginPath(); cx.ellipse(ex, eyeY+h*0.005, eyeRx*1.3, eyeRy*1.6, 0, 0, Math.PI*2); cx.fill();
    // Eyelid top (upper lid shape)
    cx.fillStyle = '#fff';
    cx.beginPath(); cx.ellipse(ex, eyeY, eyeRx, eyeRy, 0, 0, Math.PI*2); cx.fill();
    // Iris — larger, more detail
    cx.fillStyle = data.eyes || '#2a6ef5';
    cx.beginPath(); cx.arc(ex, eyeY, eyeRx*0.7, 0, Math.PI*2); cx.fill();
    // Iris depth ring
    cx.fillStyle = hexAlpha(data.eyes||'#2a6ef5', 0.5);
    cx.beginPath(); cx.arc(ex, eyeY, eyeRx*0.55, 0, Math.PI*2); cx.fill();
    // Pupil
    cx.fillStyle = '#050608';
    cx.beginPath(); cx.arc(ex, eyeY, eyeRx*0.35, 0, Math.PI*2); cx.fill();
    // Primary highlight
    cx.fillStyle = 'rgba(255,255,255,.85)';
    cx.beginPath(); cx.arc(ex+eyeRx*0.22, eyeY-eyeRy*0.35, eyeRx*0.14, 0, Math.PI*2); cx.fill();
    // Secondary smaller highlight
    cx.fillStyle = 'rgba(255,255,255,.35)';
    cx.beginPath(); cx.arc(ex-eyeRx*0.18, eyeY+eyeRy*0.2, eyeRx*0.07, 0, Math.PI*2); cx.fill();
    // Upper eyelid line
    cx.strokeStyle = hexAlpha(browColor, 0.55); cx.lineWidth = h*0.016;
    cx.beginPath();
    cx.moveTo(ex-eyeRx*1.0, eyeY+eyeRy*0.1);
    cx.quadraticCurveTo(ex, eyeY-eyeRy*1.1, ex+eyeRx*1.0, eyeY+eyeRy*0.1);
    cx.stroke();
    // Lower lash line subtle
    cx.strokeStyle = hexAlpha(browColor, 0.2); cx.lineWidth = h*0.008;
    cx.beginPath(); cx.ellipse(ex, eyeY+eyeRy*0.15, eyeRx*0.95, eyeRy*0.55, 0, 0, Math.PI); cx.stroke();
  });

  // ── Nose ──
  const noseY = faceY + faceRy*0.18;
  cx.strokeStyle = hexAlpha(skinDark, 0.5); cx.lineWidth = h*0.016; cx.lineCap='round';
  cx.beginPath();
  cx.moveTo(faceX-faceRx*0.07, eyeY+h*0.01);
  cx.quadraticCurveTo(faceX-faceRx*0.12, noseY, faceX-faceRx*0.16, noseY+h*0.01);
  cx.stroke();
  cx.beginPath();
  cx.moveTo(faceX+faceRx*0.07, eyeY+h*0.01);
  cx.quadraticCurveTo(faceX+faceRx*0.12, noseY, faceX+faceRx*0.16, noseY+h*0.01);
  cx.stroke();
  // Nostrils
  cx.fillStyle = hexAlpha(skinDark, 0.35);
  cx.beginPath(); cx.ellipse(faceX-faceRx*0.15, noseY+h*0.015, faceRx*0.065, faceRy*0.042, 0.3, 0, Math.PI*2); cx.fill();
  cx.beginPath(); cx.ellipse(faceX+faceRx*0.15, noseY+h*0.015, faceRx*0.065, faceRy*0.042, -0.3, 0, Math.PI*2); cx.fill();
  // Nose bridge highlight
  cx.fillStyle = hexAlpha('#fff', 0.06);
  cx.beginPath(); cx.ellipse(faceX, noseY-h*0.01, faceRx*0.06, faceRy*0.1, 0, 0, Math.PI*2); cx.fill();

  // ── Lips / Mouth ──
  const mouthY = faceY + faceRy*0.45;
  const lipColor = data.lips || '#c0605a';
  const mouthW = faceRx*0.52;
  if (data.expression === 'smile') {
    // Upper lip
    cx.fillStyle = hexAlpha(lipColor, 0.85);
    cx.beginPath();
    cx.moveTo(faceX-mouthW, mouthY);
    cx.quadraticCurveTo(faceX-mouthW*0.5, mouthY-h*0.012, faceX, mouthY-h*0.005);
    cx.quadraticCurveTo(faceX+mouthW*0.5, mouthY-h*0.012, faceX+mouthW, mouthY);
    cx.quadraticCurveTo(faceX, mouthY+h*0.01, faceX-mouthW, mouthY);
    cx.fill();
    // Lower lip
    cx.fillStyle = hexAlpha(lipColor, 0.7);
    cx.beginPath();
    cx.moveTo(faceX-mouthW*0.85, mouthY+h*0.002);
    cx.quadraticCurveTo(faceX, mouthY+h*0.042, faceX+mouthW*0.85, mouthY+h*0.002);
    cx.quadraticCurveTo(faceX, mouthY+h*0.052, faceX-mouthW*0.85, mouthY+h*0.002);
    cx.fill();
    // Smile corners
    cx.strokeStyle = hexAlpha(skinDark, 0.4); cx.lineWidth = h*0.01;
    cx.beginPath(); cx.arc(faceX-mouthW*0.95, mouthY+h*0.012, h*0.02, Math.PI*1.4, Math.PI*1.9); cx.stroke();
    cx.beginPath(); cx.arc(faceX+mouthW*0.95, mouthY+h*0.012, h*0.02, Math.PI*1.1, Math.PI*1.6); cx.stroke();
    // Lip highlight
    cx.fillStyle = hexAlpha('#fff', 0.15);
    cx.beginPath(); cx.ellipse(faceX, mouthY+h*0.025, mouthW*0.28, h*0.01, 0, 0, Math.PI*2); cx.fill();
  } else {
    // Neutral mouth
    cx.fillStyle = hexAlpha(lipColor, 0.8);
    cx.beginPath();
    cx.moveTo(faceX-mouthW, mouthY);
    cx.quadraticCurveTo(faceX, mouthY-h*0.01, faceX+mouthW, mouthY);
    cx.quadraticCurveTo(faceX, mouthY+h*0.008, faceX-mouthW, mouthY);
    cx.fill();
    cx.fillStyle = hexAlpha(lipColor, 0.6);
    cx.beginPath();
    cx.moveTo(faceX-mouthW*0.8, mouthY+h*0.003);
    cx.quadraticCurveTo(faceX, mouthY+h*0.03, faceX+mouthW*0.8, mouthY+h*0.003);
    cx.quadraticCurveTo(faceX, mouthY+h*0.038, faceX-mouthW*0.8, mouthY+h*0.003);
    cx.fill();
    // Cupid's bow crease
    cx.strokeStyle = hexAlpha(skinDark, 0.3); cx.lineWidth = h*0.008;
    cx.beginPath(); cx.moveTo(faceX-mouthW*0.85, mouthY); cx.lineTo(faceX+mouthW*0.85, mouthY); cx.stroke();
  }

  // ── Face-wide lighting ──
  // Side rim light (opposite side)
  const rimGrad = cx.createRadialGradient(faceX+faceRx*0.95, faceY-faceRy*0.1, 0, faceX+faceRx*0.7, faceY, faceRx*0.9);
  rimGrad.addColorStop(0, hexAlpha(data.glowColor||'#a8d8ff', 0.18));
  rimGrad.addColorStop(1, 'rgba(0,0,0,0)');
  cx.fillStyle = rimGrad;
  cx.beginPath(); cx.ellipse(faceX,faceY,faceRx,faceRy,0,0,Math.PI*2); cx.fill();

  // ── Atmospheric glow ──
  if (data.glowColor) {
    const gl = cx.createRadialGradient(faceX, faceY-faceRy*0.5, 0, faceX, faceY, faceRx*1.1);
    gl.addColorStop(0, hexAlpha(data.glowColor, 0.1));
    gl.addColorStop(0.7, hexAlpha(data.glowColor, 0.04));
    gl.addColorStop(1, 'rgba(0,0,0,0)');
    cx.fillStyle = gl;
    cx.fillRect(0,0,w,h);
  }

  // ── Vignette frame ──
  const vig = cx.createRadialGradient(w/2,h/2,w*0.3,w/2,h/2,w*0.7);
  vig.addColorStop(0,'rgba(0,0,0,0)');
  vig.addColorStop(1,'rgba(0,0,0,.35)');
  cx.fillStyle = vig; cx.fillRect(0,0,w,h);

  cx.restore();
}

function handleAIBubbleClick() {
  if (!aiAgent) { openAIModal(); return; }
  if (!aiAgent.imagesReady) {
    // Still generating — show a subtle pulse, don't navigate
    const bubble = document.getElementById('aiBubble');
    bubble.style.transform = 'scale(1.05)';
    setTimeout(() => { bubble.style.transform = ''; }, 300);
    return;
  }
  nav('ai');
}

// ── Hub polling — refreshes bubble every 2s while images are generating ──
let _hubPollTimer = null;
function startHubPoll() {
  stopHubPoll();
  _hubPollTimer = setInterval(() => {
    if (aiAgent && aiAgent.imagesReady) { stopHubPoll(); renderAIBubble(); return; }
    renderAIBubble();
  }, 2000);
}
function stopHubPoll() {
  if (_hubPollTimer) { clearInterval(_hubPollTimer); _hubPollTimer = null; }
}

// ── Change AI — confirm, preserve history in localStorage, reopen modal ──
function changeAI() {
  if (!aiAgent) { openAIModal(); return; }
  const confirmed = confirm(
    'Change your AI?\n\nYour conversation history will be removed. This cannot be undone.\n\nPress OK to continue.'
  );
  if (!confirmed) return;

  // Save old history separately in case user wants it later (keyed by AI name)
  try {
    const archiveKey = 'void_ai_history_' + (aiAgent.name || 'old').replace(/\s+/g,'_').toLowerCase();
    localStorage.setItem(archiveKey, JSON.stringify(aiAgent.chatHistory || []));
  } catch(e) {}

  // Clear AI
  aiAgent = null;
  localStorage.removeItem('void_ai');

  // Stop background animation
  if (aiChatBgFrame) { cancelAnimationFrame(aiChatBgFrame); aiChatBgFrame = null; }

  // Reset chat screen
  const msgs = document.getElementById('aiMessages');
  if (msgs) msgs.innerHTML = '';

  // Return to hub and open creation modal
  nav('hub');
  renderAIBubble();
  setTimeout(() => openAIModal(), 100);
}

// ── CREATION MODAL ──
function openAIModal() {
  document.getElementById('aiModalWrap').classList.add('on');
  document.getElementById('aiCreateForm').style.display = 'block';
  document.getElementById('aiLoading').classList.remove('on');
}

function closeAIModal() {
  document.getElementById('aiModalWrap').classList.remove('on');
}

function handleAIModalBg(e) {
  if(e.target === document.getElementById('aiModalWrap')) closeAIModal();
}

function setAIHint(text) {
  document.getElementById('aiPromptInput').value = text;
}

async function generateAI() {
  const prompt = document.getElementById('aiPromptInput').value.trim();
  const name = document.getElementById('aiNameInput').value.trim();
  if (!prompt) { document.getElementById('aiPromptInput').focus(); return; }
  if (!name) { document.getElementById('aiNameInput').focus(); return; }

  // Switch to loading state
  document.getElementById('aiCreateForm').style.display = 'none';
  const loading = document.getElementById('aiLoading');
  loading.classList.add('on');

  const steps = [
    'Reading your description...',
    'Designing personality...',
    'Crafting the face...',
    'Building the chat world...',
    'Painting the environment...',
    'Almost ready...'
  ];
  let stepIdx = 0;
  const stepEl = document.getElementById('aiLoadingStep');
  const stepInterval = setInterval(() => {
    stepEl.textContent = steps[Math.min(stepIdx++, steps.length-1)];
  }, 900);

  try {
    const response = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `You are generating a complete AI companion profile for a music production app called VØID. The user described their AI as: "${prompt}". The AI's name is: "${name}".

Return ONLY valid JSON with NO markdown, no backticks, no explanation. Just the raw JSON object:

{
  "personality": "2-3 sentences describing how this AI talks and behaves. Match the character described.",
  "greeting": "A first message the AI would send. In character, personal, referencing who they are. 1-2 sentences max.",
  "avatarPrompt": "A detailed image generation prompt for a portrait of this character. Be specific about face, style, lighting, colors, mood. E.g. 'close-up portrait of a wise elderly Black man, dreadlocks with gold beads, dark brown eyes, warm amber lighting, low-key studio photography style, cinematic, sharp focus, detailed skin texture, purple tinted background'. Always end with: highly detailed, professional portrait photography, 8k.",
  "bgPrompt": "A detailed image generation prompt for an atmospheric background scene that fits this character's world. No people, no faces. Just the environment. E.g. 'a dark recording studio at night, mixing board glowing with amber and purple lights, smoke curling through air, vinyl records on shelves, dim track lighting, cinematic, atmospheric, moody'. Always end with: cinematic lighting, atmospheric, highly detailed, 4k.",
  "palette": {
    "primary": "#hexcolor",
    "secondary": "#hexcolor",
    "bg": "#hexcolor — very dark, near black, tinted toward character world",
    "bubble_ai": "#hexcolor — subtle bubble color",
    "bubble_user": "#hexcolor",
    "text": "#hexcolor — light, readable"
  },
  "avatarData": {
    "bgTop": "#hexcolor",
    "bgBot": "#hexcolor",
    "skin": "#hexcolor",
    "hair": "#hexcolor",
    "eyes": "#hexcolor",
    "lips": "#hexcolor",
    "shadow": "rgba(r,g,b,a)",
    "clothingColor": "#hexcolor",
    "glowColor": "#hexcolor",
    "expression": "smile or neutral"
  },
  "chatTheme": {
    "style": "one word — studio, space, street, temple, ocean, desert, cyberpunk, jungle, or nature",
    "particleColor": "#hexcolor",
    "ambientColor": "#hexcolor"
  },
  "systemPrompt": "You are the AI companion described. Stay fully in character at all times. You live inside VOID, a music production app, and help with music, creativity, and anything the user needs. Keep responses conversational and personal."
}`
        }]
      })
    });

    clearInterval(stepInterval);
    const data = await response.json();
    const raw = data.content[0].text;
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    aiAgent = { name, prompt, ...parsed, chatHistory: [], avatarImg: null, bgImg: null, imagesReady: false };

    // Save skeleton so bubble shows loading state immediately
    saveAI();
    renderAIBubble();
    startHubPoll();

    const cleanStr = s => s.replace(/[^\w\s,.\-']/g, '').trim().slice(0, 500);
    const seed = Math.floor(Math.random() * 999999);

    // ── Always try Pollinations first — fall back to SVG only if images fail ──
    stepEl.textContent = 'Generating images...';
    const canUsePollinations = true;

    let avatarResult = null;
    let bgResult = null;

    if (canUsePollinations) {
      // ── PATH A: Real image generation via Pollinations ──
      stepEl.textContent = 'Generating images... (~15–25s)';

      const avatarPromptStr = cleanStr(parsed.avatarPrompt || ('portrait of ' + prompt + ', detailed face, cinematic lighting, 8k, sharp focus'));
      const bgPromptStr = cleanStr(parsed.bgPrompt || ('atmospheric ' + (parsed.chatTheme?.style||'dark') + ' scene, cinematic, no people, moody lighting, 4k'));

      const avatarUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(avatarPromptStr)}?width=512&height=512&model=flux&nologo=true&enhance=false&seed=${seed}`;
      const bgUrl     = `https://image.pollinations.ai/prompt/${encodeURIComponent(bgPromptStr)}?width=896&height=512&model=flux&nologo=true&enhance=false&seed=${seed+1}`;

      async function waitForImg(url, retries = 2) {
      for (let attempt = 0; attempt <= retries; attempt++) {
        const result = await new Promise((resolve) => {
          const img = new Image();
          const timer = setTimeout(() => { img.src = ''; resolve(null); }, 45000);
          img.onload = () => { clearTimeout(timer); resolve(url); };
          img.onerror = () => { clearTimeout(timer); resolve(null); };
          // On retry, add a fresh seed to bust Pollinations cache
          img.src = attempt === 0 ? url : url.replace(/seed=\d+/, `seed=${Math.floor(Math.random()*999999)}`);
        });
        if (result) return result;
        if (attempt < retries) {
          stepEl.textContent = `Retrying image (attempt ${attempt + 2})...`;
          await new Promise(r => setTimeout(r, 2000)); // wait 2s before retry
        }
      }
      return null;
    }

      [avatarResult, bgResult] = await Promise.all([
        waitForImg(avatarUrl),
        waitForImg(bgUrl)
      ]);
    }

    if (!avatarResult && !bgResult) {
      // Both failed — generate both as SVG
      stepEl.textContent = 'Pollinations unavailable — generating illustrated portraits...';
      const [svgAvatar, svgBg] = await Promise.all([
        generateSVGAvatar(parsed, name, prompt),
        generateSVGBackground(parsed, prompt)
      ]);
      avatarResult = svgAvatar;
      bgResult = svgBg;
    } else if (!avatarResult) {
      // Only avatar failed — generate just avatar as SVG
      stepEl.textContent = 'Generating avatar illustration...';
      avatarResult = await generateSVGAvatar(parsed, name, prompt);
    } else if (!bgResult) {
      // Only background failed — generate just background as SVG
      stepEl.textContent = 'Generating background illustration...';
      bgResult = await generateSVGBackground(parsed, prompt);
    }

    if (!avatarResult && !bgResult) throw new Error('Image generation failed on all paths');

    aiAgent.avatarImg = avatarResult;
    aiAgent.bgImg = bgResult;
    aiAgent.imagesReady = true;

    saveAI();
    stopHubPoll();
    closeAIModal();

    // Update everything
    renderAIBubble();
    const msgs = document.getElementById('aiMessages');
    if (msgs) msgs.innerHTML = '';
    applyChatTheme();
    nav('ai');

  } catch(e) {
    clearInterval(stepInterval);
    stopHubPoll();
    console.error('AI generation failed:', e);
    // If skeleton was saved, clear it
    if (aiAgent && !aiAgent.imagesReady) { aiAgent = null; saveAI(); renderAIBubble(); }
    document.getElementById('aiCreateForm').style.display = 'block';
    loading.classList.remove('on');
    alert('Generation failed. Check your connection and try again.');
  }
}

// ── CHAT THEME ──
function applyChatTheme() {
  if (!aiAgent) return;
  const p = aiAgent.palette || {};

  const sendBtn = document.getElementById('aiSendBtn');
  if (sendBtn) sendBtn.style.background = p.primary || '#7c3aed';

  const nameEl = document.getElementById('aiChatName');
  if (nameEl) { nameEl.textContent = aiAgent.name; nameEl.style.color = p.primary || 'var(--t1)'; }

  // ── Chat header avatar ──
  const avatarWrap = document.getElementById('aiChatAvatar');
  if (avatarWrap) {
    avatarWrap.style.borderColor = p.primary || 'var(--ether)';
    avatarWrap.innerHTML = '';
    if (aiAgent.avatarImg) {
      const img = document.createElement('img');
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;';
      img.src = aiAgent.avatarImg;
      avatarWrap.appendChild(img);
    } else {
      const cv = document.createElement('canvas');
      cv.width = 110; cv.height = 110;
      drawAvatarCanvas(cv, aiAgent.avatarData, 110);
      avatarWrap.appendChild(cv);
    }
  }

  // ── Chat background real image ──
  const chatBg = document.getElementById('aiChatCanvas').parentElement;
  const oldBgImg = chatBg.querySelector('.ai-bg-img');
  if (oldBgImg) oldBgImg.remove();
  if (aiAgent.bgImg) {
    const bgImg = document.createElement('img');
    bgImg.className = 'ai-bg-img';
    bgImg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;opacity:0;transition:opacity 1.2s ease;';
    bgImg.src = aiAgent.bgImg;
    bgImg.onload = () => { bgImg.style.opacity = '0.65'; };
    chatBg.insertBefore(bgImg, chatBg.firstChild);
  }

  // ── Greeting / history ──
  const msgs = document.getElementById('aiMessages');
  if (msgs && msgs.children.length === 0) {
    if (aiAgent.chatHistory && aiAgent.chatHistory.length > 0) {
      aiAgent.chatHistory.slice(-20).forEach(m => addAIMessage(m.content, m.role === 'user' ? 'user' : 'ai'));
    } else if (aiAgent.greeting) {
      addAIMessage(aiAgent.greeting, 'ai');
    }
  }

  startChatBgAnim();
}

// ── CHAT BACKGROUND ANIMATION ──
function startChatBgAnim() {
  if (aiChatBgFrame) cancelAnimationFrame(aiChatBgFrame);
  const canvas = document.getElementById('aiChatCanvas');
  if (!canvas || !aiAgent) return;
  const cx = canvas.getContext('2d');
  const theme = aiAgent.chatTheme || {};
  const palette = aiAgent.palette || {};
  const style = (theme.style || 'space').toLowerCase();
  const pc = theme.particleColor || palette.primary || '#7c3aed';
  const ac = theme.ambientColor || pc;
  const bg = palette.bg || '#050608';

  if(window._aiResizeHandler) window.removeEventListener('resize', window._aiResizeHandler);
  function resize(){canvas.width=canvas.offsetWidth||window.innerWidth;canvas.height=canvas.offsetHeight||window.innerHeight;}
  window._aiResizeHandler = resize; resize();
  window.addEventListener('resize', resize);

  // If real bg image exists, only draw particle overlay on top of it
  const hasRealBg = !!(aiAgent.bgImg);
  const S = {t:0, pc, ac, bg, style, pts:[], hasRealBg};

  const cnt = style==='rain'?80:style==='space'||style==='stars'?120:55;
  for(let i=0;i<cnt;i++) S.pts.push(mkScenePt(canvas.width,canvas.height,style,pc));

  aiChatBgState = S;

  function frame(){
    S.t++;
    const W=canvas.width, H=canvas.height;
    if(!W||!H){aiChatBgFrame=requestAnimationFrame(frame);return;}
    cx.clearRect(0,0,W,H);
    if(hasRealBg){
      drawParticleOverlay(cx,W,H,S);
    } else {
      drawScene(cx,W,H,S);
    }
    aiChatBgFrame=requestAnimationFrame(frame);
  }
  frame();
}

function mkScenePt(W,H,style,color){
  const p={x:Math.random()*W,y:Math.random()*H,phase:Math.random()*Math.PI*2,color};
  if(style==='space'||style==='stars'){p.r=Math.random()*1.8+.3;p.twinkle=Math.random()*Math.PI*2;p.speed=Math.random()*.015;p.layer=Math.floor(Math.random()*3);}
  else if(style==='rain'){p.r=.6;p.vy=6+Math.random()*5;p.vx=-.8;p.len=8+Math.random()*14;}
  else if(style==='studio'){p.r=Math.random()*2+1;p.vy=-(Math.random()*.3+.1);p.life=Math.random();}
  else if(style==='street'||style==='city'){p.r=Math.random()*2+.5;p.vy=Math.random()*.4+.2;p.lane=Math.random();}
  else if(style==='temple'||style==='nature'){p.r=Math.random()*4+2;p.vy=.4+Math.random()*.5;p.rot=Math.random()*Math.PI*2;p.wobble=(Math.random()-.5)*.015;}
  else if(style==='ocean'||style==='water'){p.r=3+Math.random()*6;p.vy=-(Math.random()*.4+.2);p.opacity=Math.random()*.08+.02;}
  else if(style==='desert'){p.r=Math.random()*1.5+.5;p.vx=Math.random()*.8+.3;p.vy=(Math.random()-.5)*.2;}
  else if(style==='cyberpunk'){p.r=Math.random()*1.5+.5;p.vy=Math.random()*.6+.3;}
  else if(style==='jungle'||style==='forest'){p.r=Math.random()*3+1.5;p.vy=.3+Math.random()*.4;p.rot=Math.random()*Math.PI*2;}
  else{p.r=Math.random()*2+.5;p.vy=-(Math.random()*.4+.1);}
  return p;
}

function drawParticleOverlay(cx,W,H,S){
  const {t,pts,pc,ac,style} = S;
  // Ambient glow only — no opaque fill
  const ag=cx.createRadialGradient(W*.5,H*.4,0,W*.5,H*.4,W*.6);
  ag.addColorStop(0,hexAlpha(ac,.04+Math.sin(t*.012)*.02));
  ag.addColorStop(1,'rgba(0,0,0,0)');
  cx.fillStyle=ag;cx.fillRect(0,0,W,H);
  // Particles
  pts.forEach(p=>{
    updateParticleSim(p,W,H,style,t);
    drawParticleSim(cx,p,style,pc);
  });
  // Edge vignette
  const vig=cx.createRadialGradient(W/2,H/2,Math.min(W,H)*.25,W/2,H/2,Math.max(W,H)*.75);
  vig.addColorStop(0,'rgba(0,0,0,0)');
  vig.addColorStop(1,'rgba(0,0,0,.45)');
  cx.fillStyle=vig;cx.fillRect(0,0,W,H);
}

function updateParticleSim(p,W,H,style,t){
  p.phase+=.025;
  if(style==='stars'){p.twinkle=(p.twinkle||0)+.04;}
  else if(style==='rain'){p.y+=p.vy||5;p.x+=p.vx||-.5;if(p.y>H)p.y=0;if(p.x<0)p.x=W;}
  else if(style==='temple'||style==='nature'){p.y+=(p.vy||.5);p.x+=Math.sin(t*.02+p.phase)*.3;p.rot=(p.rot||0)+.02;if(p.y>H)p.y=-10;}
  else if(style==='jungle'||style==='forest'){p.y+=(p.vy||.4);p.x+=Math.sin(t*.02+p.phase)*.3;if(p.y>H)p.y=0;}
  else if(style==='cyberpunk'){p.y+=(p.vy||.5);if(p.y>H)p.y=0;}
  else{p.y+=(p.vy||-.3);p.x+=Math.sin(t*.015+p.phase)*.2;if(p.y<-10)p.y=H;if(p.y>H)p.y=0;}
  if(p.x>W+10)p.x=-10;if(p.x<-10)p.x=W+10;
}

function drawParticleSim(cx,p,style,color){
  cx.save();
  if(style==='stars'){
    const op=.15+Math.abs(Math.sin(p.twinkle||0))*.55;
    cx.fillStyle=hexAlpha(color,op);
    cx.beginPath();cx.arc(p.x,p.y,p.r||1,0,Math.PI*2);cx.fill();
  } else if(style==='rain'||style==='cyberpunk'){
    cx.strokeStyle=hexAlpha(color,.2);cx.lineWidth=.8;
    cx.beginPath();cx.moveTo(p.x,p.y);cx.lineTo(p.x-(p.vx||0)*3,p.y+(p.vy||5)*3);cx.stroke();
  } else if(style==='temple'||style==='nature'){
    cx.translate(p.x,p.y);cx.rotate(p.rot||0);
    cx.fillStyle=hexAlpha(color,.35);
    cx.beginPath();cx.ellipse(0,0,p.r||3,(p.r||3)*.5,0,0,Math.PI*2);cx.fill();
  } else {
    const op=.15+Math.abs(Math.sin(p.phase))*.3;
    cx.fillStyle=hexAlpha(color,op);
    cx.beginPath();cx.arc(p.x,p.y,p.r||1.5,0,Math.PI*2);cx.fill();
    const halo=cx.createRadialGradient(p.x,p.y,0,p.x,p.y,(p.r||1.5)*4);
    halo.addColorStop(0,hexAlpha(color,op*.25));halo.addColorStop(1,'rgba(0,0,0,0)');
    cx.fillStyle=halo;cx.beginPath();cx.arc(p.x,p.y,(p.r||1.5)*4,0,Math.PI*2);cx.fill();
  }
  cx.restore();
}

function drawScene(cx,W,H,S){
  const {t,style,pc,ac,bg} = S;

  // ── SPACE / STARS ──
  if(style==='space'||style==='stars'){
    const skyGrad=cx.createLinearGradient(0,0,0,H);
    skyGrad.addColorStop(0,bg||'#020308');
    skyGrad.addColorStop(.6,hexAlpha(ac,.15));
    skyGrad.addColorStop(1,'#020308');
    cx.fillStyle=skyGrad;cx.fillRect(0,0,W,H);
    // Nebula cloud
    const neb=cx.createRadialGradient(W*.4+Math.sin(t*.003)*30,H*.35+Math.cos(t*.004)*20,0,W*.5,H*.4,W*.5);
    neb.addColorStop(0,hexAlpha(pc,.09+Math.sin(t*.008)*.03));
    neb.addColorStop(.5,hexAlpha(ac,.04));
    neb.addColorStop(1,'rgba(0,0,0,0)');
    cx.fillStyle=neb;cx.fillRect(0,0,W,H);
    // Second nebula
    const neb2=cx.createRadialGradient(W*.7,H*.6,0,W*.65,H*.55,W*.4);
    neb2.addColorStop(0,hexAlpha(ac,.06));
    neb2.addColorStop(1,'rgba(0,0,0,0)');
    cx.fillStyle=neb2;cx.fillRect(0,0,W,H);
    // Stars
    S.pts.forEach(p=>{
      p.twinkle+=p.speed;
      const op=.15+Math.abs(Math.sin(p.twinkle))*.75;
      const layerR=[.5,1,1.8][p.layer];
      cx.fillStyle=p.layer===2?hexAlpha(pc,op):`rgba(255,255,255,${op})`;
      cx.beginPath();cx.arc(p.x,p.y,layerR,0,Math.PI*2);cx.fill();
      if(p.layer===2&&op>.6){const sl=layerR*3;cx.strokeStyle=hexAlpha(pc,op*.25);cx.lineWidth=.5;cx.beginPath();cx.moveTo(p.x-sl,p.y);cx.lineTo(p.x+sl,p.y);cx.moveTo(p.x,p.y-sl);cx.lineTo(p.x,p.y+sl);cx.stroke();}
    });
    // Moving planet/moon
    const px=W*.78+Math.sin(t*.005)*15,py=H*.22+Math.cos(t*.003)*8;
    const pr=Math.min(W,H)*.07;
    const plGrad=cx.createRadialGradient(px-pr*.3,py-pr*.3,0,px,py,pr);
    plGrad.addColorStop(0,hexAlpha(pc,.7));
    plGrad.addColorStop(.7,hexAlpha(ac,.4));
    plGrad.addColorStop(1,hexAlpha(bg,.9));
    cx.fillStyle=plGrad;cx.beginPath();cx.arc(px,py,pr,0,Math.PI*2);cx.fill();
    cx.strokeStyle=hexAlpha(pc,.3);cx.lineWidth=.8;cx.beginPath();cx.arc(px,py,pr,0,Math.PI*2);cx.stroke();
  }

  // ── STUDIO ──
  else if(style==='studio'){
    // Floor
    const floorY=H*.65;
    const wallGrad=cx.createLinearGradient(0,0,0,H);
    wallGrad.addColorStop(0,hexAlpha(bg,1)||'#0a0806');
    wallGrad.addColorStop(.6,adjustHex(bg,1.4)||'#1a120a');
    wallGrad.addColorStop(1,'#0a0806');
    cx.fillStyle=wallGrad;cx.fillRect(0,0,W,H);
    // Wood panel floor
    const floorGrad=cx.createLinearGradient(0,floorY,0,H);
    floorGrad.addColorStop(0,hexAlpha(ac,.08)||'#1c1208');
    floorGrad.addColorStop(1,'#0a0805');
    cx.fillStyle=floorGrad;cx.fillRect(0,floorY,W,H-floorY);
    // Ceiling track lights
    const lights=[W*.2,W*.5,W*.8];
    lights.forEach(lx=>{
      const lg=cx.createRadialGradient(lx,0,0,lx,H*.3,W*.25);
      lg.addColorStop(0,hexAlpha(ac,.14+Math.sin(t*.02+lx)*.03));
      lg.addColorStop(1,'rgba(0,0,0,0)');
      cx.fillStyle=lg;cx.fillRect(0,0,W,H);
      cx.fillStyle=hexAlpha(ac,.9);cx.beginPath();cx.arc(lx,4,3,0,Math.PI*2);cx.fill();
    });
    // Mixing console silhouette
    const consY=H*.55;
    cx.fillStyle='#0d0a07';
    cx.beginPath();cx.roundRect(W*.1,consY,W*.8,H*.18,8);cx.fill();
    cx.strokeStyle=hexAlpha(ac,.15);cx.lineWidth=1;cx.stroke();
    // Console faders
    for(let i=0;i<12;i++){
      const fx=W*.14+i*(W*.64/12),fh=H*.06+Math.sin(t*.04+i*.5)*H*.03;
      cx.fillStyle=hexAlpha(ac,.25);
      cx.fillRect(fx,consY+H*.04,4,fh);
      cx.fillStyle=hexAlpha(pc,.6);
      cx.fillRect(fx-2,consY+H*.04+fh-4,8,4);
    }
    // VU meter glow
    const meterX=W*.05,meterY=H*.35;
    for(let row=0;row<8;row++){
      const on=(row/8)<(.5+Math.sin(t*.1+row)*.45);
      const col=row<5?hexAlpha('#00d4aa',.7+on*.3):hexAlpha('#ff2d6b',.8);
      cx.fillStyle=on?col:hexAlpha('#333',.3);
      cx.fillRect(meterX,meterY+row*12,18,9);
    }
    // Speaker grill left
    cx.fillStyle='#0c0c0c';cx.fillRect(0,H*.1,W*.08,H*.45);
    for(let r=0;r<8;r++)for(let c=0;c<3;c++){cx.fillStyle='#1a1a1a';cx.beginPath();cx.arc(W*.02+c*W*.022,H*.18+r*H*.04,3,0,Math.PI*2);cx.fill();}
    // Smoke particles
    S.pts.forEach(p=>{
      p.life+=.004;p.y+=p.vy;p.x+=Math.sin(t*.02+p.phase)*.3;
      if(p.life>1){p.life=0;p.x=W*.3+Math.random()*W*.4;p.y=floorY-10;}
      const fade=p.life<.2?p.life/.2:1-p.life;
      cx.fillStyle=hexAlpha(ac,fade*.06);
      cx.beginPath();cx.arc(p.x,p.y,10+p.life*30,0,Math.PI*2);cx.fill();
    });
  }

  // ── STREET / CITY ──
  else if(style==='street'||style==='city'){
    // Night sky gradient
    const sky=cx.createLinearGradient(0,0,0,H);
    sky.addColorStop(0,'#040408');
    sky.addColorStop(.5,hexAlpha(ac,.12));
    sky.addColorStop(1,'#0a0308');
    cx.fillStyle=sky;cx.fillRect(0,0,W,H);
    // City skyline silhouette
    cx.fillStyle='#080810';
    const buildW=W/14;
    for(let i=0;i<14;i++){
      const bh=H*(.15+Math.sin(i*2.3)*.18+Math.cos(i*1.1)*.12);
      const bx=i*buildW;
      cx.fillRect(bx,H*.55-bh,buildW-3,bh+H*.1);
      // Windows
      for(let wy=0;wy<Math.floor(bh/16);wy++){
        for(let wx=0;wx<3;wx++){
          if(Math.sin(i*3+wy*7+wx*11)>.1){
            cx.fillStyle=hexAlpha(pc,.3+Math.sin(t*.02+i+wy)*.2);
            cx.fillRect(bx+4+wx*8,H*.55-bh+wy*16+6,5,8);
          }
        }
      }
      cx.fillStyle='#080810';
    }
    // Wet road reflection
    const roadY=H*.7;
    cx.fillStyle='#0a0a0a';cx.fillRect(0,roadY,W,H-roadY);
    // Neon reflections on road
    const neons=[{x:W*.2,color:pc},{x:W*.5,color:ac},{x:W*.8,color:pc}];
    neons.forEach(n=>{
      const rg=cx.createLinearGradient(n.x-50,roadY,n.x+50,H);
      rg.addColorStop(0,hexAlpha(n.color,.15+Math.sin(t*.03)*.05));
      rg.addColorStop(1,'rgba(0,0,0,0)');
      cx.fillStyle=rg;cx.fillRect(n.x-50,roadY,100,H-roadY);
    });
    // Neon signs
    [[W*.15,H*.42,'BAR'],[W*.6,H*.38,'STUDIO'],[W*.82,H*.45,'OPEN']].forEach(([sx,sy,txt])=>{
      cx.strokeStyle=hexAlpha(pc,.6+Math.sin(t*.08)*.3);cx.lineWidth=2;
      cx.strokeRect(sx-30,sy-14,60,28);
      cx.fillStyle=hexAlpha(pc,.7);cx.font=`bold ${Math.floor(W*.018)}px monospace`;
      cx.textAlign='center';cx.fillText(txt,sx,sy+5);
    });
    // Rain
    S.pts.forEach(p=>{
      p.y+=p.vy;p.x+=p.vx;
      if(p.y>H){p.y=0;p.x=Math.random()*W;}
      cx.strokeStyle=hexAlpha(ac,.15);cx.lineWidth=.6;
      cx.beginPath();cx.moveTo(p.x,p.y);cx.lineTo(p.x+p.vx*2,p.y+p.len);cx.stroke();
    });
    cx.textAlign='left';
  }

  // ── TEMPLE / NATURE ──
  else if(style==='temple'||style==='nature'||style==='japan'){
    // Sky
    const sky=cx.createLinearGradient(0,0,0,H);
    sky.addColorStop(0,'#0a0510');
    sky.addColorStop(.5,hexAlpha(ac,.1));
    sky.addColorStop(1,'#05080a');
    cx.fillStyle=sky;cx.fillRect(0,0,W,H);
    // Moon
    const moonX=W*.75,moonY=H*.15,moonR=Math.min(W,H)*.07;
    const moonG=cx.createRadialGradient(moonX-moonR*.3,moonY-moonR*.3,0,moonX,moonY,moonR);
    moonG.addColorStop(0,'rgba(255,250,230,.9)');
    moonG.addColorStop(1,'rgba(200,180,120,.4)');
    cx.fillStyle=moonG;cx.beginPath();cx.arc(moonX,moonY,moonR,0,Math.PI*2);cx.fill();
    // Moon glow
    const mg=cx.createRadialGradient(moonX,moonY,moonR,moonX,moonY,moonR*3);
    mg.addColorStop(0,hexAlpha(ac,.15));mg.addColorStop(1,'rgba(0,0,0,0)');
    cx.fillStyle=mg;cx.fillRect(0,0,W,H);
    // Temple pillars
    cx.fillStyle='#0c0810';
    [[W*.15,H*.3],[W*.35,H*.35],[W*.65,H*.35],[W*.85,H*.3]].forEach(([px,py])=>{
      cx.fillRect(px-12,py,24,H-py);
      cx.fillStyle=hexAlpha(ac,.1);cx.fillRect(px-14,py,28,6);cx.fillStyle='#0c0810';
    });
    // Torii gate or pagoda top
    cx.strokeStyle=hexAlpha(pc,.5);cx.lineWidth=3;
    cx.beginPath();cx.moveTo(W*.1,H*.3);cx.lineTo(W*.9,H*.3);cx.stroke();
    cx.beginPath();cx.moveTo(W*.08,H*.25);cx.lineTo(W*.92,H*.25);cx.stroke();
    // Ground mist
    const mist=cx.createLinearGradient(0,H*.75,0,H);
    mist.addColorStop(0,'rgba(0,0,0,0)');
    mist.addColorStop(1,hexAlpha(ac,.08));
    cx.fillStyle=mist;cx.fillRect(0,H*.75,W,H*.25);
    // Cherry blossom petals
    S.pts.forEach(p=>{
      p.y+=p.vy;p.x+=p.wobble*30+Math.sin(t*.02+p.phase)*0.5;p.rot+=.02;
      if(p.y>H+10)p.y=-10;if(p.x>W+10)p.x=-10;if(p.x<-10)p.x=W+10;
      cx.save();cx.translate(p.x,p.y);cx.rotate(p.rot);
      cx.fillStyle=hexAlpha(pc,.4);
      cx.beginPath();cx.ellipse(0,0,p.r,p.r*.5,0,0,Math.PI*2);cx.fill();
      cx.restore();
    });
  }

  // ── OCEAN / WATER ──
  else if(style==='ocean'||style==='water'){
    const sky=cx.createLinearGradient(0,0,0,H*.55);
    sky.addColorStop(0,'#020510');
    sky.addColorStop(1,hexAlpha(ac,.2));
    cx.fillStyle=sky;cx.fillRect(0,0,W,H*.55);
    // Water
    const water=cx.createLinearGradient(0,H*.5,0,H);
    water.addColorStop(0,hexAlpha(pc,.3));
    water.addColorStop(1,hexAlpha(bg,1));
    cx.fillStyle=water;cx.fillRect(0,H*.5,W,H*.5);
    // Horizon glow
    const hg=cx.createLinearGradient(0,H*.45,0,H*.6);
    hg.addColorStop(0,'rgba(0,0,0,0)');
    hg.addColorStop(.5,hexAlpha(ac,.12));
    hg.addColorStop(1,'rgba(0,0,0,0)');
    cx.fillStyle=hg;cx.fillRect(0,H*.45,W,H*.15);
    // Wave lines
    for(let wave=0;wave<5;wave++){
      const wy=H*(.55+wave*.08)+Math.sin(t*.02+wave)*8;
      cx.strokeStyle=hexAlpha(pc,.06+wave*.015);cx.lineWidth=1.5;
      cx.beginPath();
      for(let x=0;x<=W;x+=4){cx.lineTo(x,wy+Math.sin((x/W)*Math.PI*6+t*.04+wave)*12);}
      cx.stroke();
    }
    // Stars reflection
    S.pts.forEach(p=>{
      p.twinkle=(p.twinkle||0)+.03;
      const op=Math.abs(Math.sin(p.twinkle))*.08;
      cx.fillStyle=hexAlpha(pc,op);
      cx.beginPath();cx.arc(p.x,H*.5+p.y%(H*.4),p.r,0,Math.PI*2);cx.fill();
    });
  }

  // ── DESERT ──
  else if(style==='desert'){
    const sky=cx.createLinearGradient(0,0,0,H*.5);
    sky.addColorStop(0,'#050208');
    sky.addColorStop(1,hexAlpha(ac,.15));
    cx.fillStyle=sky;cx.fillRect(0,0,W,H*.5);
    // Sand dunes
    cx.fillStyle='#1a1008';
    cx.beginPath();cx.moveTo(0,H*.65);
    cx.quadraticCurveTo(W*.25,H*.45+Math.sin(t*.01)*8,W*.5,H*.58);
    cx.quadraticCurveTo(W*.75,H*.68,W,H*.5);
    cx.lineTo(W,H);cx.lineTo(0,H);cx.closePath();cx.fill();
    cx.fillStyle='#120d06';
    cx.beginPath();cx.moveTo(0,H*.8);
    cx.quadraticCurveTo(W*.3,H*.65,W*.6,H*.75);
    cx.quadraticCurveTo(W*.8,H*.8,W,H*.7);
    cx.lineTo(W,H);cx.lineTo(0,H);cx.closePath();cx.fill();
    // Stars
    S.pts.forEach(p=>{
      p.x+=p.vx;if(p.x>W)p.x=0;
      cx.fillStyle=hexAlpha(pc,.2+Math.sin(p.phase+t*.02)*.15);
      cx.beginPath();cx.arc(p.x,p.y%(H*.4),p.r,0,Math.PI*2);cx.fill();
    });
    // Moon
    const mg=cx.createRadialGradient(W*.2,H*.2,0,W*.2,H*.2,H*.1);
    mg.addColorStop(0,hexAlpha(ac,.5));mg.addColorStop(1,'rgba(0,0,0,0)');
    cx.fillStyle=mg;cx.fillRect(0,0,W*.4,H*.4);
  }

  // ── CYBERPUNK ──
  else if(style==='cyberpunk'){
    cx.fillStyle='#020408';cx.fillRect(0,0,W,H);
    // Grid floor
    const gridY=H*.6;
    cx.strokeStyle=hexAlpha(pc,.1);cx.lineWidth=.5;
    for(let x=0;x<W;x+=W/20){cx.beginPath();cx.moveTo(x,gridY);cx.lineTo(W/2+(x-W/2)*.1,H);cx.stroke();}
    for(let row=0;row<8;row++){
      const rowY=gridY+row*(H-gridY)/8;
      const scale=1-(row/8)*.9;
      cx.beginPath();cx.moveTo(W/2-W*scale,rowY);cx.lineTo(W/2+W*scale,rowY);cx.stroke();
    }
    // Buildings
    for(let i=0;i<8;i++){
      const bx=i*(W/8),bw=W/9,bh=H*.1+Math.sin(i*1.7)*.2*H;
      cx.fillStyle='#070a10';cx.fillRect(bx,H*.6-bh,bw,bh);
      // Neon edges
      cx.strokeStyle=hexAlpha(i%2===0?pc:ac,.35+Math.sin(t*.05+i)*.15);cx.lineWidth=1;
      cx.strokeRect(bx,H*.6-bh,bw,bh);
      // Windows
      for(let w2=0;w2<3;w2++)for(let r=0;r<5;r++){
        if(Math.random()>.6){cx.fillStyle=hexAlpha(pc,.4);cx.fillRect(bx+4+w2*8,H*.6-bh+r*14+4,5,8);}
      }
    }
    // Neon rain
    S.pts.forEach(p=>{
      p.y+=p.vy;if(p.y>H){p.y=0;p.x=Math.random()*W;}
      cx.strokeStyle=hexAlpha(pc,.2+Math.sin(p.phase)*.1);cx.lineWidth=.8;
      cx.beginPath();cx.moveTo(p.x,p.y);cx.lineTo(p.x,p.y+12);cx.stroke();
    });
    // Scan line
    const scanY=(t*2.5)%H;
    const sg=cx.createLinearGradient(0,scanY-3,0,scanY+3);
    sg.addColorStop(0,'rgba(0,0,0,0)');sg.addColorStop(.5,hexAlpha(pc,.12));sg.addColorStop(1,'rgba(0,0,0,0)');
    cx.fillStyle=sg;cx.fillRect(0,scanY-3,W,6);
  }

  // ── JUNGLE / FOREST ──
  else if(style==='jungle'||style==='forest'){
    cx.fillStyle='#020a05';cx.fillRect(0,0,W,H);
    // Deep canopy
    const canopy=cx.createLinearGradient(0,0,0,H*.4);
    canopy.addColorStop(0,'#010a02');
    canopy.addColorStop(1,hexAlpha(pc,.08));
    cx.fillStyle=canopy;cx.fillRect(0,0,W,H*.4);
    // Tree silhouettes
    for(let i=0;i<6;i++){
      const tx=W*(i/5);const th=H*(.35+Math.sin(i*1.3)*.15);
      cx.fillStyle='#040e06';
      cx.fillRect(tx-6,H*.4,12,th);
      cx.fillStyle='#020a03';
      cx.beginPath();cx.arc(tx,H*.4,30+Math.sin(i*2)*15,0,Math.PI*2);cx.fill();
    }
    // Ground mist
    const mist=cx.createLinearGradient(0,H*.7,0,H);
    mist.addColorStop(0,'rgba(0,0,0,0)');
    mist.addColorStop(1,hexAlpha(pc,.06));
    cx.fillStyle=mist;cx.fillRect(0,H*.7,W,H*.3);
    // Bioluminescent particles
    S.pts.forEach(p=>{
      p.y+=p.vy;p.x+=Math.sin(t*.02+p.phase)*.3;p.rot+=.015;
      if(p.y>H)p.y=0;if(p.x<0)p.x=W;if(p.x>W)p.x=0;
      const op=.2+Math.sin(p.phase+t*.04)*.2;
      cx.fillStyle=hexAlpha(pc,op);
      cx.beginPath();cx.arc(p.x,p.y,p.r,0,Math.PI*2);cx.fill();
      // Glow halo
      const halo=cx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*4);
      halo.addColorStop(0,hexAlpha(pc,op*.3));halo.addColorStop(1,'rgba(0,0,0,0)');
      cx.fillStyle=halo;cx.beginPath();cx.arc(p.x,p.y,p.r*4,0,Math.PI*2);cx.fill();
    });
  }

  // ── DEFAULT fallback — deep void with ambient orbs ──
  else {
    const base=cx.createLinearGradient(0,0,0,H);
    base.addColorStop(0,bg||'#050608');
    base.addColorStop(1,'#020305');
    cx.fillStyle=base;cx.fillRect(0,0,W,H);
    // Ambient orbs
    [[W*.3,H*.4,.12],[W*.7,H*.6,.08],[W*.5,H*.3,.06]].forEach(([ox,oy,op])=>{
      const og=cx.createRadialGradient(ox+Math.sin(t*.008)*20,oy+Math.cos(t*.006)*15,0,ox,oy,W*.35);
      og.addColorStop(0,hexAlpha(ac,op+Math.sin(t*.01)*.03));
      og.addColorStop(1,'rgba(0,0,0,0)');
      cx.fillStyle=og;cx.fillRect(0,0,W,H);
    });
    S.pts.forEach(p=>{
      p.twinkle=(p.twinkle||0)+.04;
      const op=.1+Math.abs(Math.sin(p.twinkle||0))*.5;
      cx.fillStyle=hexAlpha(pc,op);
      cx.beginPath();cx.arc(p.x,p.y,p.r,0,Math.PI*2);cx.fill();
    });
  }

  // ── Edge vignette always on top ──
  const vig=cx.createRadialGradient(W/2,H/2,Math.min(W,H)*.25,W/2,H/2,Math.max(W,H)*.75);
  vig.addColorStop(0,'rgba(0,0,0,0)');
  vig.addColorStop(1,'rgba(0,0,0,.55)');
  cx.fillStyle=vig;cx.fillRect(0,0,W,H);
}

function makeAIAvatar(size) {
  const wrap = document.createElement('div');
  wrap.className = 'ai-msg-avatar';
  wrap.style.borderColor = aiAgent?.palette?.primary || '#7c3aed';
  if (aiAgent?.avatarImg) {
    const img = document.createElement('img');
    img.style.cssText = `width:${size}px;height:${size}px;object-fit:cover;border-radius:50%;display:block;`;
    img.src = aiAgent.avatarImg;
    wrap.appendChild(img);
  } else {
    const cv = document.createElement('canvas');
    cv.width = size; cv.height = size;
    drawAvatarCanvas(cv, aiAgent?.avatarData, size);
    wrap.appendChild(cv);
  }
  return wrap;
}
function addAIMessage(text, role) {
  const msgs = document.getElementById('aiMessages');
  const palette = aiAgent?.palette || {};

  const wrap = document.createElement('div');
  wrap.className = `ai-msg ${role}`;

  if (role === 'ai') {
    wrap.appendChild(makeAIAvatar(28));
  }

  const bubble = document.createElement('div');
  bubble.className = 'ai-msg-bubble';
  bubble.textContent = text;

  if (role === 'ai') {
    bubble.style.background = hexAlpha(palette.bubble_ai || palette.primary || '#7c3aed', 0.15);
    bubble.style.border = `1px solid ${hexAlpha(palette.primary || '#7c3aed', 0.2)}`;
    bubble.style.color = palette.text || 'var(--t1)';
  } else {
    bubble.style.background = hexAlpha(palette.bubble_user || '#00d4aa', 0.18);
    bubble.style.border = `1px solid ${hexAlpha(palette.bubble_user || '#00d4aa', 0.25)}`;
    bubble.style.color = 'var(--t1)';
  }

  wrap.appendChild(bubble);
  msgs.appendChild(wrap);
  msgs.scrollTop = msgs.scrollHeight;
}

function showTypingIndicator() {
  const msgs = document.getElementById('aiMessages');
  const palette = aiAgent?.palette || {};
  const wrap = document.createElement('div');
  wrap.className = 'ai-msg ai';
  wrap.id = 'aiTypingIndicator';

  const bubble = document.createElement('div');
  bubble.className = 'ai-typing';
  bubble.style.background = hexAlpha(palette.bubble_ai || palette.primary || '#7c3aed', 0.12);
  bubble.style.borderRadius = '4px 14px 14px 14px';
  bubble.style.border = `1px solid ${hexAlpha(palette.primary||'#7c3aed',0.15)}`;
  [1,2,3].forEach(()=>{const d=document.createElement('div');d.className='ai-typing-dot';bubble.appendChild(d);});

  wrap.append(makeAIAvatar(28), bubble);
  msgs.appendChild(wrap);
  msgs.scrollTop = msgs.scrollHeight;
}

function removeTypingIndicator() {
  const el = document.getElementById('aiTypingIndicator');
  if (el) el.remove();
}

async function sendAIMessage() {
  if (!aiAgent) { openAIModal(); return; }
  const input = document.getElementById('aiChatInput');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  input.style.height = '';

  addAIMessage(text, 'user');
  if (!aiAgent.chatHistory) aiAgent.chatHistory = [];
  aiAgent.chatHistory.push({ role: 'user', content: text });

  showTypingIndicator();

  try {
    const sysPrompt = aiAgent.systemPrompt || ('You are ' + aiAgent.name + '. ' + (aiAgent.personality||'') + ' Stay in character always.');
    const messages = [
      { role: 'user', content: '[SYSTEM: ' + sysPrompt + ']\n\nHello!' },
      { role: 'assistant', content: aiAgent.greeting || 'Hey.' },
      ...aiAgent.chatHistory.slice(-14)
    ];

    const response = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages
      })
    });

    const data = await response.json();
    const reply = data.content[0].text;
    removeTypingIndicator();
    addAIMessage(reply, 'ai');
    aiAgent.chatHistory.push({ role: 'assistant', content: reply });
    // Trim history to prevent bloat
    if (aiAgent.chatHistory.length > 40) aiAgent.chatHistory = aiAgent.chatHistory.slice(-30);
    saveAI();
  } catch(e) {
    removeTypingIndicator();
    addAIMessage("Something went wrong connecting. Try again in a moment.", 'ai');
  }
}

function handleAIChatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendAIMessage();
  }
}

function autoResizeAI(el) {
  el.style.height = '';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

// ── HELPERS ──
function hexAlpha(hex, alpha) {
  if (!hex || hex.startsWith('rgba') || hex.startsWith('rgb')) return hex;
  const r = parseInt(hex.slice(1,3),16)||0;
  const g = parseInt(hex.slice(3,5),16)||0;
  const b = parseInt(hex.slice(5,7),16)||0;
  return `rgba(${r},${g},${b},${alpha})`;
}

function adjustHex(hex, factor) {
  if (!hex || hex[0] !== '#') return hex;
  const r = Math.round(parseInt(hex.slice(1,3),16)*factor);
  const g = Math.round(parseInt(hex.slice(3,5),16)*factor);
  const b = Math.round(parseInt(hex.slice(5,7),16)*factor);
  return `rgb(${r},${g},${b})`;
}

// END

