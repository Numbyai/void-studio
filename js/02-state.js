// KITS
const KITS={trap:{tracks:[{id:'t_808',name:'808 Bass',color:'#ff2d6b',type:'bass808',vel:.9},{id:'t_kick',name:'Kick',color:'#ff6b35',type:'kick',vel:.85},{id:'t_snr',name:'Snare',color:'#00d4aa',type:'snare',vel:.75},{id:'t_clap',name:'Clap',color:'#f5c842',type:'clap',vel:.65},{id:'t_hh',name:'Hi-Hat',color:'#a8d8ff',type:'hihat',vel:.5},{id:'t_ohh',name:'Open HH',color:'#ff2d6b',type:'openhat',vel:.45},{id:'t_perc',name:'Perc',color:'#ff6b35',type:'perc',vel:.55}],defs:{t_kick:[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],t_snr:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],t_hh:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],t_clap:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],t_808:[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0]}},rnb:{tracks:[{id:'r_kick',name:'Soft Kick',color:'#ff2d6b',type:'kick_soft',vel:.7},{id:'r_snr',name:'Snare',color:'#00d4aa',type:'snare',vel:.65},{id:'r_rim',name:'Rim',color:'#f5c842',type:'rim',vel:.55},{id:'r_shk',name:'Shaker',color:'#a8d8ff',type:'shaker',vel:.4},{id:'r_snap',name:'F.Snap',color:'#ff6b35',type:'snap',vel:.6},{id:'r_brsh',name:'Brush',color:'#00d4aa',type:'brush',vel:.35},{id:'r_bass',name:'Sub Bass',color:'#ff2d6b',type:'subbass',vel:.8}],defs:{r_kick:[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],r_snr:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],r_shk:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],r_snap:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0]}},psychedelic:{tracks:[{id:'p_kick',name:'Proc Kick',color:'#ff2d6b',type:'kick_dist',vel:.75},{id:'p_snr',name:'Lo-Fi Snr',color:'#00d4aa',type:'snare_lofi',vel:.65},{id:'p_vnl',name:'Vinyl Crk',color:'#f5c842',type:'vinyl',vel:.3},{id:'p_eth',name:'Ethnic',color:'#ff6b35',type:'ethnic',vel:.6},{id:'p_rev',name:'Rev Hit',color:'#a8d8ff',type:'reverse',vel:.5},{id:'p_tamb',name:'Tambourin',color:'#ff2d6b',type:'tambourine',vel:.45},{id:'p_drn',name:'Sub Drone',color:'#00d4aa',type:'drone',vel:.5}],defs:{p_kick:[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],p_snr:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],p_vnl:[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],p_tamb:[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0]}},boombap:{tracks:[{id:'b_kick',name:'Kick',color:'#ff6b35',type:'kick_boom',vel:.9},{id:'b_snr',name:'Snare',color:'#00d4aa',type:'snare_fat',vel:.8},{id:'b_hh',name:'Vinyl HH',color:'#f5c842',type:'hihat_vin',vel:.45},{id:'b_scr',name:'Scratch',color:'#a8d8ff',type:'scratch',vel:.55},{id:'b_ohh',name:'Open HH',color:'#ff2d6b',type:'openhat',vel:.4},{id:'b_bass',name:'Sub Bass',color:'#ff6b35',type:'subbass',vel:.8},{id:'b_perc',name:'Perc',color:'#00d4aa',type:'perc_hard',vel:.5}],defs:{b_kick:[1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0],b_snr:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],b_hh:[1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1],b_bass:[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}},drill:{tracks:[{id:'d_808',name:'Slide 808',color:'#ff2d6b',type:'bass808slide',vel:.9},{id:'d_kick',name:'Kick',color:'#ff6b35',type:'kick_hard',vel:.88},{id:'d_snr',name:'Agg Snare',color:'#00d4aa',type:'snare_crack',vel:.8},{id:'d_hh',name:'Rapid HH',color:'#a8d8ff',type:'hihat_fast',vel:.45},{id:'d_perc',name:'Dark Perc',color:'#f5c842',type:'perc_dark',vel:.5},{id:'d_clap',name:'Clap',color:'#ff6b35',type:'clap',vel:.65},{id:'d_fx',name:'FX Hit',color:'#ff2d6b',type:'fx_dark',vel:.6}],defs:{d_kick:[1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0],d_snr:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],d_hh:[1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1],d_808:[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],d_clap:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0]}}};
const ITYPES={
  synth_lead:{label:'Synth Lead',color:'#ff2d6b',notes:['C','D','E','G','A','B'],desc:'Classic analog lead'},
  synth_pad:{label:'Dream Pad',color:'#00d4aa',notes:['C','E','G','B'],desc:'Lush floating chords'},
  supersaw:{label:'Supersaw',color:'#ff2d6b',notes:['C','D','E','G','A','B'],desc:'Detuned 7-osc EDM lead'},
  supersaw_pad:{label:'Supersaw Pad',color:'#7c3aed',notes:['C','E','G','B'],desc:'Wide detuned EDM pad'},
  acid_bass:{label:'Acid Bass',color:'#ff6b35',notes:['C','D','E','F','G','A'],desc:'TB-303 resonant filter slide'},
  rave_stab:{label:'Rave Stab',color:'#ff2d6b',notes:['C','D','E','G'],desc:'Sharp house chord hit'},
  bass:{label:'Bass',color:'#ff6b35',notes:['C','D','E','F','G','A'],desc:'Deep low-end foundation'},
  deep_bass:{label:'Deep House Bass',color:'#7c3aed',notes:['C','D','E','F','G','A'],desc:'Filtered sine bass with slow attack'},
  dub_bass:{label:'Dub Bass',color:'#00d4aa',notes:['C','D','E','F','G','A'],desc:'Heavy reggae sub with wobble'},
  sub_mel:{label:'Sub Melody',color:'#c084fc',notes:['C','D','E','F','G','A','B'],desc:'Pure sine sub'},
  rhodes:{label:'Rhodes',color:'#f5c842',notes:['C','D','E','F','G','A','B'],desc:'Warm vintage electric piano'},
  lofi_piano:{label:'Lo-Fi Piano',color:'#ff9b6a',notes:['C','D','E','F','G','A','B'],desc:'Dusty tape-saturated keys'},
  choir:{label:'Choir',color:'#a8d8ff',notes:['C','E','G','B'],desc:'Ghostly vocal pads'},
  strings:{label:'Strings',color:'#00d4aa',notes:['C','E','G','B'],desc:'Rich orchestral strings'},
  pluck:{label:'Pluck',color:'#a8d8ff',notes:['C','D','E','G','A'],desc:'Sharp attack melodic stabs'},
  harp:{label:'Harp',color:'#c084fc',notes:['C','D','E','G','A','B'],desc:'Cascading arpeggiated plucks'},
  guitar:{label:'Guitar',color:'#ff6b35',notes:['C','D','E','F','G','A'],desc:'Clean muted electric'},
  skank_guitar:{label:'Skank Guitar',color:'#f5c842',notes:['C','D','E','F','G','A'],desc:'Muted reggae offbeat chop'},
  flute:{label:'Flute',color:'#00d4aa',notes:['C','D','E','F','G','A','B'],desc:'Breathy melodic lead'},
  marimba:{label:'Marimba',color:'#f5c842',notes:['C','D','E','G','A'],desc:'Hollow wooden mallet'},
  vibraphone:{label:'Vibraphone',color:'#a8d8ff',notes:['C','D','E','G','A'],desc:'Metallic shimmering mallet'},
  steelpan:{label:'Steel Pan',color:'#00d4aa',notes:['C','D','E','F','G','A','B'],desc:'Caribbean steel drum'},
  organ:{label:'Organ',color:'#ff2d6b',notes:['C','D','E','F','G','A','B'],desc:'Warm sustained organ'},
  bell:{label:'Bell',color:'#f5c842',notes:['C','E','G','A'],desc:'Crystal clear bell tones'},
  brass:{label:'Brass',color:'#ff6b35',notes:['C','D','E','G'],desc:'Full brass section hits'},
  theremin:{label:'Theremin',color:'#ff2d6b',notes:['C','D','E','F','G','A','B'],desc:'Eerie wobbling lead'},
  dub_siren:{label:'Dub Siren',color:'#00d4aa',notes:['C','D','E','F','G','A','B'],desc:'Descending reggae siren'},
  sitar:{label:'Sitar',color:'#f5c842',notes:['C','D','E','G','A'],desc:'Indian plucked string with buzz'},
  mbira:{label:'Mbira',color:'#ff6b35',notes:['C','D','E','G','A'],desc:'African thumb piano'},
  gamelan:{label:'Gamelan',color:'#a8d8ff',notes:['C','D','E','G','A'],desc:'Indonesian metallic bell cluster'},
  noise_sweep:{label:'Noise Sweep',color:'#7c3aed',notes:['C','E','G'],desc:'Filtered white noise riser'},
  texture:{label:'Texture',color:'#7c3aed',notes:['C','E','G'],desc:'Ambient noise atmosphere'},
  fx:{label:'FX',color:'#a8d8ff',notes:['C','E','G'],desc:'Risers impacts sweeps'}
};
// STATE
let isPlaying=false,curStep=0,stepCount=16,bpm=140,swing=0,seqInt=null,nextNT=0;
let dGrid={},dVols={},dMuted={},dSD={},curKit='trap';
let iTracks=[],iCtr=0,curProjId=null;
let selId=null,selType=null,detMode='edit';

