import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowLeft, AudioLines, Captions, ChevronDown, ChevronRight, Crop, Download, Film, Folder, Image, ImagePlus, Layers, Mic, Music2, Pause, Play, Plus, Scissors, Search, Settings2, Sparkles, Type, Undo2, Redo2, Volume2, WandSparkles, X, ZoomIn, ZoomOut, RotateCcw, Trash2, MoveHorizontal, Check } from "lucide-react";
import "./style.css";

const uid=()=>globalThis.crypto?.randomUUID?.()||String(Date.now())+Math.random().toString(16).slice(2);
const fmt=n=>{n=Math.max(0,Number(n)||0);return String(Math.floor(n/60)).padStart(2,"0")+":"+String(Math.floor(n%60)).padStart(2,"0");};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const copyState=x=>JSON.parse(JSON.stringify(x));

function App(){
  const [screen,setScreen]=useState("home");
  const [assets,setAssets]=useState([]);
  const [clips,setClips]=useState([]);
  const [selected,setSelected]=useState(null);
  const [playhead,setPlayhead]=useState(0);
  const [playing,setPlaying]=useState(false);
  const [activeTool,setActiveTool]=useState("Edit");
  const [projectName,setProjectName]=useState("Untitled project");
  const [status,setStatus]=useState("Ready to create");
  const [zoom,setZoom]=useState(48);
  const [volume,setVolume]=useState(100);
  const [fit,setFit]=useState("contain");
  const [transform,setTransform]=useState({x:0,y:0,scale:1,rotation:0});
  const [crop,setCrop]=useState({top:0,right:0,bottom:0,left:0});
  const [caption,setCaption]=useState("Your text");
  const [showCaption,setShowCaption]=useState(false);
  const [fontFamily,setFontFamily]=useState("Arial");
  const [fontSize,setFontSize]=useState(46);
  const [captionColor,setCaptionColor]=useState("#ffffff");
  const [captionStart,setCaptionStart]=useState(0);
  const [captionEnd,setCaptionEnd]=useState(9999);
  const [exporting,setExporting]=useState(false);
  const [exportProgress,setExportProgress]=useState(0);
  const [aspectRatio,setAspectRatio]=useState("16:9");
  const [exportSize,setExportSize]=useState("1080");
  const [exportFps,setExportFps]=useState("30");
  const [captionStyle,setCaptionStyle]=useState("classic");
  const [captionAnimation,setCaptionAnimation]=useState("pop");
  const [captionShadow,setCaptionShadow]=useState(true);
  const [brightness,setBrightness]=useState(100);
  const [contrast,setContrast]=useState(100);
  const [saturation,setSaturation]=useState(100);
  const [voiceText,setVoiceText]=useState("");
  const [voiceChoice,setVoiceChoice]=useState("pNInz6obpgDQGcFmaJgB");
  const [voiceApiKey,setVoiceApiKey]=useState("");
  const [voiceBusy,setVoiceBusy]=useState(false);
  const inputRef=useRef(null);
  const videoRef=useRef(null);
  const timelineRef=useRef(null);
  const audioRefs=useRef({});
  const dragRef=useRef(null);
  const historyRef=useRef([]);
  const redoRef=useRef([]);
  const [historyVersion,setHistoryVersion]=useState(0);

  const mainClips=useMemo(()=>clips.filter(c=>c.kind!=="audio"),[clips]);
  const audioClips=useMemo(()=>clips.filter(c=>c.kind==="audio"),[clips]);
  const mainDuration=mainClips.reduce((n,c)=>n+c.duration,0);
  const totalDuration=Math.max(mainDuration,...audioClips.map(c=>(c.startTime||0)+c.duration),0);
  const selectedClip=clips.find(c=>c.id===selected)||null;
  const selectedAsset=selectedClip?assets.find(a=>a.id===selectedClip.assetId):null;
  const currentClip=useMemo(()=>{
    let start=0;
    for(const c of mainClips){if(playhead>=start&&playhead<start+c.duration)return {clip:c,start,offset:playhead-start};start+=c.duration;}
    if(mainClips.length&&playhead<=mainDuration){const c=mainClips[mainClips.length-1];return {clip:c,start:Math.max(0,mainDuration-c.duration),offset:c.duration};}
    return null;
  },[mainClips,playhead,mainDuration]);
  const currentAsset=currentClip?assets.find(a=>a.id===currentClip.clip.assetId):selectedAsset;
  const pxPerSec=zoom;
  const aspectMap={"16:9":[16,9],"9:16":[9,16],"1:1":[1,1],"4:5":[4,5],"4:3":[4,3],"21:9":[21,9]};
  const [aspectW,aspectH]=aspectMap[aspectRatio]||[16,9];
  const outputWidth=Number(exportSize);
  const outputHeight=Math.round(outputWidth*aspectH/aspectW);
  const timelineWidth=Math.max(640,totalDuration*pxPerSec+180);
  const canUndo=historyRef.current.length>0;
  const canRedo=redoRef.current.length>0;

  function remember(){
    historyRef.current=[...historyRef.current.slice(-39),{clips:copyState(clips),selected,playhead,caption,showCaption}];
    redoRef.current=[];
    setHistoryVersion(v=>v+1);
  }
  function undo(){
    if(!historyRef.current.length){setStatus("Nothing to undo.");return;}
    const previous=historyRef.current[historyRef.current.length-1];
    redoRef.current=[...redoRef.current,{clips:copyState(clips),selected,playhead,caption,showCaption}];
    historyRef.current=historyRef.current.slice(0,-1);
    setClips(previous.clips);setSelected(previous.selected);setPlayhead(previous.playhead);setCaption(previous.caption);setShowCaption(previous.showCaption);
    setHistoryVersion(v=>v+1);setStatus("Undo complete.");
  }
  function redo(){
    if(!redoRef.current.length){setStatus("Nothing to redo.");return;}
    const next=redoRef.current[redoRef.current.length-1];
    historyRef.current=[...historyRef.current,{clips:copyState(clips),selected,playhead,caption,showCaption}];
    redoRef.current=redoRef.current.slice(0,-1);
    setClips(next.clips);setSelected(next.selected);setPlayhead(next.playhead);setCaption(next.caption);setShowCaption(next.showCaption);
    setHistoryVersion(v=>v+1);setStatus("Redo complete.");
  }

  function chooseMedia(kind="all"){
    if(!inputRef.current)return;
    inputRef.current.accept=kind==="audio"?"audio/*":kind==="photo"?"image/*":kind==="video"?"video/*":"video/*,image/*";
    inputRef.current.value="";
    inputRef.current.click();
  }
  function startNew(){
    setPlaying(false);setAssets([]);setClips([]);setSelected(null);setPlayhead(0);setProjectName("Untitled project");
    setCaption("Your text");setShowCaption(false);setTransform({x:0,y:0,scale:1,rotation:0});setCrop({top:0,right:0,bottom:0,left:0});
    historyRef.current=[];redoRef.current=[];setHistoryVersion(v=>v+1);setScreen("editor");
    // The native Android/iOS file picker is opened directly from this tap.
    chooseMedia("all");
  }
  function makeThumbnail(asset){
    const el=document.createElement("video");el.muted=true;el.playsInline=true;el.preload="metadata";el.src=asset.url;
    el.onloadedmetadata=()=>{try{el.currentTime=Math.min(.25,Math.max(0,el.duration/3));}catch{}};
    el.onseeked=()=>{try{const canvas=document.createElement("canvas");canvas.width=240;canvas.height=135;canvas.getContext("2d").drawImage(el,0,0,240,135);const thumb=canvas.toDataURL("image/jpeg",.72);setAssets(old=>old.map(a=>a.id===asset.id?{...a,thumb}:a));}catch{}el.removeAttribute("src");el.load();};
    el.onerror=()=>{el.removeAttribute("src");el.load();};
  }
  function probeDuration(asset){
    if(asset.kind==="image")return;
    const el=document.createElement(asset.kind==="audio"?"audio":"video");
    el.preload="metadata";el.src=asset.url;
    el.onloadedmetadata=()=>{
      const d=Number.isFinite(el.duration)&&el.duration>0?el.duration:5;
      setAssets(old=>old.map(a=>a.id===asset.id?{...a,duration:d}:a));
      setClips(old=>old.map(c=>c.assetId===asset.id?{...c,duration:d,sourceOut:d}:c));
      el.removeAttribute("src");el.load();
    };
    el.onerror=()=>{setStatus("Could not read the duration of "+asset.name+". You can still try using the file.");};
  }
  function addImported(list){
    const incoming=Array.from(list||[]);
    if(!incoming.length){setStatus("No media selected. Choose a file to begin.");return;}
    const newAssets=incoming.map(file=>({id:uid(),name:file.name,file,url:URL.createObjectURL(file),kind:file.type.startsWith("video/")?"video":file.type.startsWith("audio/")?"audio":"image",duration:file.type.startsWith("image/")?5:0,thumb:null}));
    const newClips=newAssets.map(a=>({id:uid(),assetId:a.id,name:a.name,kind:a.kind,sourceIn:0,sourceOut:a.duration,duration:a.duration||5,startTime:0,volume:100,transform:{x:0,y:0,scale:1,rotation:0}}));
    setAssets(old=>[...old,...newAssets]);
    setClips(old=>[...old,...newClips]);
    const firstVideo=newClips.find(c=>c.kind!=="audio");
    setSelected(firstVideo?.id||newClips[0].id);
    setPlayhead(0);setScreen("editor");
    setStatus(incoming.length+" media item(s) imported. Select a clip to edit.");
    newAssets.forEach(asset=>{probeDuration(asset);if(asset.kind==="video")makeThumbnail(asset);});
  }
  function updateClip(id,patch){setClips(old=>old.map(c=>c.id===id?{...c,...patch}:c));}
  function clipStart(id){
    let start=0;
    for(const c of mainClips){if(c.id===id)return start;start+=c.duration;}
    return audioClips.find(c=>c.id===id)?.startTime||0;
  }
  function splitSelected(){
    if(!selectedClip){setStatus("Select a timeline clip first.");return;}
    const start=selectedClip.kind==="audio"?(selectedClip.startTime||0):clipStart(selectedClip.id);
    const local=playhead-start;
    if(local<=0.04||local>=selectedClip.duration-0.04){setStatus("Move the playhead inside the selected clip before splitting.");return;}
    remember();
    const cut=selectedClip.sourceIn+local;
    const left={...selectedClip,id:uid(),sourceOut:cut,duration:local};
    const right={...selectedClip,id:uid(),sourceIn:cut,duration:selectedClip.duration-local};
    setClips(old=>{const i=old.findIndex(c=>c.id===selectedClip.id);return [...old.slice(0,i),left,right,...old.slice(i+1)];});
    setSelected(right.id);setStatus("Split complete. The two pieces are now independent clips.");
  }
  function trimClip(id,edge,delta){
    const c=clips.find(x=>x.id===id);if(!c)return;
    const amount=Number(delta);
    if(edge==="left"){
      if(c.duration-amount<0.08){setStatus("A clip must be at least a fraction of a second long.");return;}
      remember();updateClip(id,{sourceIn:c.sourceIn+amount,duration:c.duration-amount});
      setPlayhead(p=>Math.max(0,p-amount));
    }else{
      if(c.duration-amount<0.08){setStatus("A clip must be at least a fraction of a second long.");return;}
      remember();updateClip(id,{sourceOut:Math.max(c.sourceIn+0.05,c.sourceOut-amount),duration:c.duration-amount});
    }
    setStatus("Trim applied.");
  }
  function removeClip(id){
    if(!clips.some(c=>c.id===id))return;
    remember();setClips(old=>old.filter(c=>c.id!==id));
    if(selected===id){const index=clips.findIndex(c=>c.id===id);setSelected(clips[index+1]?.id||clips[index-1]?.id||null);}
    setStatus("Clip deleted from the timeline.");
  }
  function reorderMain(id,targetTime){
    const list=[...mainClips];const from=list.findIndex(c=>c.id===id);if(from<0)return;
    const item=list[from];const remaining=list.filter(c=>c.id!==id);
    let cursor=0,index=remaining.length;
    for(let i=0;i<remaining.length;i++){if(targetTime<cursor+remaining[i].duration/2){index=i;break;}cursor+=remaining[i].duration;}
    const reordered=[...remaining.slice(0,index),item,...remaining.slice(index)];
    const audio=clips.filter(c=>c.kind==="audio");
    remember();setClips([...reordered,...audio]);setStatus("Clip order changed.");
  }
  function seekTo(time){
    const t=clamp(time,0,totalDuration);setPlayhead(t);
    let start=0,found=null;
    for(const c of mainClips){if(t>=start&&t<start+c.duration){found=c;break;}start+=c.duration;}
    if(found)setSelected(found.id);
  }
  function beginPlayheadDrag(e){
    e.stopPropagation();e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current={mode:"playhead",pointerId:e.pointerId};
  }
  function movePlayheadDrag(e){
    const d=dragRef.current;if(!d||d.mode!=="playhead"||d.pointerId!==e.pointerId)return;
    const el=timelineRef.current;if(!el)return;const rect=el.getBoundingClientRect();
    seekTo((e.clientX-rect.left+el.scrollLeft)/pxPerSec);
  }
  function endPlayheadDrag(e){
    if(dragRef.current?.mode==="playhead"&&dragRef.current.pointerId===e.pointerId)dragRef.current=null;
  }
  function onTimelineBackground(e){
    if(dragRef.current)return;
    if(e.target.closest(".timeline-clip")||e.target.closest("button"))return;
    const el=timelineRef.current;if(!el)return;
    const rect=el.getBoundingClientRect();const x=e.clientX-rect.left+el.scrollLeft;
    seekTo(clamp(x/pxPerSec,0,totalDuration));
  }
  function beginClipDrag(e,id,mode="move"){
    e.stopPropagation();e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const clip=clips.find(c=>c.id===id);if(!clip)return;
    dragRef.current={id,mode,pointerId:e.pointerId,startX:e.clientX,base:copyState(clip),moved:false};
    if(mode!=="move")remember();
    setSelected(id);
    if(mode==="move"){if(clip.kind==="audio")setPlayhead(clip.startTime||0);else setPlayhead(clipStart(id));}
  }
  function moveClipPointer(e){
    const d=dragRef.current;if(!d||d.pointerId!==e.pointerId)return;
    const delta=(e.clientX-d.startX)/pxPerSec;
    if(Math.abs(delta)>.02)d.moved=true;
    if(d.mode==="trim-left"){
      const amount=clamp(delta,-d.base.sourceIn,d.base.duration-.08);
      const nextIn=d.base.sourceIn+amount;
      const patch={sourceIn:nextIn,duration:d.base.duration-amount};
      if(d.base.kind==="audio")patch.startTime=Math.max(0,(d.base.startTime||0)+amount);
      updateClip(d.id,patch);
    }else if(d.mode==="trim-right"){
      const amount=clamp(delta,-d.base.duration+.08,Math.max(0,(d.base.sourceOut||d.base.duration)-.05));
      updateClip(d.id,{sourceOut:d.base.sourceOut-amount,duration:d.base.duration-amount});
    }
  }
  function endClipPointer(e){
    const d=dragRef.current;if(!d||d.pointerId!==e.pointerId)return;
    const delta=(e.clientX-d.startX)/pxPerSec;
    if(d.moved&&d.mode==="move"){
      if(d.base.kind==="audio"){remember();updateClip(d.id,{startTime:Math.max(0,(d.base.startTime||0)+delta)});setStatus("Audio clip repositioned.");}
      else reorderMain(d.id,Math.max(0,clipStart(d.id)+delta));
    }else if(d.moved){setStatus("Clip edge trimmed.");}
    dragRef.current=null;
  }
  function setTransformValue(key,value){
    const next={...transform,[key]:Number(value)};setTransform(next);
    if(selectedClip)updateClip(selectedClip.id,{transform:next});
  }
  function toggleFlip(axis){const next={...transform,[axis]:!transform[axis]};setTransform(next);if(selectedClip)updateClip(selectedClip.id,{transform:next});}
  async function generateVoice(){
    if(!voiceText.trim()){setStatus("Write a voice script first.");return;}
    if(!voiceApiKey.trim()){setStatus("Add your ElevenLabs API key to generate a realistic AI voice.");return;}
    setVoiceBusy(true);setStatus("Generating AI voice…");
    try{const response=await fetch("https://api.elevenlabs.io/v1/text-to-speech/"+voiceChoice,{method:"POST",headers:{"xi-api-key":voiceApiKey,"Content-Type":"application/json","Accept":"audio/mpeg"},body:JSON.stringify({text:voiceText,model_id:"eleven_multilingual_v2",voice_settings:{stability:.48,similarity_boost:.78,style:.25,use_speaker_boost:true}})});
      if(!response.ok)throw new Error("Voice service returned "+response.status+". Check your API key and available credits.");
      const blob=await response.blob();const url=URL.createObjectURL(blob);const id=uid(),clipId=uid();const duration=await new Promise(resolve=>{const a=new Audio();a.src=url;a.onloadedmetadata=()=>resolve(Number.isFinite(a.duration)?a.duration:Math.max(2,voiceText.length/14));a.onerror=()=>resolve(Math.max(2,voiceText.length/14));});
      const asset={id,name:"AI voiceover.mp3",url,kind:"audio",duration};const clip={id:clipId,assetId:id,name:"AI voiceover",kind:"audio",sourceIn:0,sourceOut:duration,duration,startTime:playhead,volume:100};setAssets(old=>[...old,asset]);setClips(old=>[...old,clip]);setSelected(clipId);setActiveTool("Audio");setStatus("AI voiceover generated and added to your timeline.");
    }catch(e){setStatus("AI voice failed: "+e.message);}finally{setVoiceBusy(false);}
  }
  function pointerDown(e){
    if(!currentAsset||currentAsset.kind==="audio"||e.target.closest(".canvas-controls"))return;
    e.currentTarget.setPointerCapture(e.pointerId);dragRef.current={mode:"canvas",pointerId:e.pointerId,x:e.clientX,y:e.clientY,tx:transform.x,ty:transform.y};
  }
  function pointerMove(e){
    const d=dragRef.current;if(!d||d.mode!=="canvas"||d.pointerId!==e.pointerId)return;
    const r=e.currentTarget.getBoundingClientRect();
    const next={...transform,x:clamp(d.tx+e.clientX-d.x,-r.width/2,r.width/2),y:clamp(d.ty+e.clientY-d.y,-r.height/2,r.height/2)};
    setTransform(next);if(selectedClip)updateClip(selectedClip.id,{transform:next});
  }
  function pointerUp(e){if(dragRef.current?.mode==="canvas"&&dragRef.current.pointerId===e.pointerId)dragRef.current=null;}
  useEffect(()=>{if(selectedClip?.transform)setTransform(selectedClip.transform);},[selectedClip?.id]);
  useEffect(()=>{
    if(!videoRef.current||!currentClip||currentAsset?.kind!=="video")return;
    const video=videoRef.current;
    const target=currentClip.clip.sourceIn+currentClip.offset;
    if(!playing&&Math.abs(video.currentTime-target)>.12){try{video.currentTime=target;}catch{}}
    video.volume=clamp(selectedClip?.volume??volume,0,100)/100;
    if(playing&&video.paused)video.play().catch(()=>setPlaying(false));else if(!playing)video.pause();
  },[currentClip?.clip.id,currentAsset?.url,playing,playhead,selectedClip?.volume,volume]);
  useEffect(()=>{
    audioClips.forEach(c=>{
      const el=audioRefs.current[c.id];if(!el)return;
      const start=c.startTime||0,end=start+c.duration,active=playhead>=start&&playhead<end;
      el.volume=clamp(c.volume??100,0,100)/100;
      if(playing&&active){
        const target=c.sourceIn+(playhead-start);
        if(Math.abs(el.currentTime-target)>.35){try{el.currentTime=target;}catch{}}
        el.play().catch(()=>{});
      }else el.pause();
    });
  },[playhead,playing,audioClips]);
  useEffect(()=>{
    if(!playing||currentAsset?.kind==="video")return;
    const timer=setInterval(()=>setPlayhead(p=>{const next=p+.1;if(next>=totalDuration){setPlaying(false);return totalDuration;}return next;}),100);
    return ()=>clearInterval(timer);
  },[playing,currentAsset?.kind,totalDuration]);
  function onVideoTime(){
    const el=videoRef.current;if(!el||!currentClip)return;
    const local=clamp(el.currentTime-currentClip.clip.sourceIn,0,currentClip.clip.duration);
    setPlayhead(currentClip.start+local);
    if(local>=currentClip.clip.duration-.04&&playing){
      const next=currentClip.start+currentClip.clip.duration;
      if(next>=totalDuration){setPlaying(false);setPlayhead(totalDuration);}
      else setPlayhead(next);
    }
  }
  function setCropValue(key,value){setCrop(old=>({...old,[key]:Number(value)}));}
  function cropStyle(){
    const c=crop;
    return {clipPath:"inset("+c.top+"% "+c.right+"% "+c.bottom+"% "+c.left+"%)"};
  }
  function addText(){
    remember();setShowCaption(true);setCaptionStart(playhead);setCaptionEnd(Math.max(playhead+.5,totalDuration));setActiveTool("Text");setStatus("Caption added. Adjust its timing and style below.");
  }
  function addSoundEffect(name,type){
    const sampleRate=22050,duration=type==="ambient"?5:type==="whoosh"?1.4:.55,count=Math.floor(sampleRate*duration);
    const buffer=new ArrayBuffer(44+count*2),view=new DataView(buffer);
    const write=(offset,value)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));};
    write(0,"RIFF");view.setUint32(4,36+count*2,true);write(8,"WAVE");write(12,"fmt ");view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);write(36,"data");view.setUint32(40,count*2,true);
    let lastNoise=0;
    for(let i=0;i<count;i++){const t=i/sampleRate,p=t/duration;let s=0;if(type==="click")s=Math.sin(2*Math.PI*1450*t)*Math.exp(-t*34)*.65;else if(type==="pop")s=(Math.sin(2*Math.PI*110*t)+.35*Math.sin(2*Math.PI*620*t))*Math.exp(-t*9)*.65;else if(type==="whoosh"){lastNoise=(Math.random()*2-1)*.65;s=lastNoise*Math.sin(Math.PI*p)*Math.min(1,t*14);}else if(type==="bell")s=(Math.sin(2*Math.PI*880*t)+.5*Math.sin(2*Math.PI*1320*t))*Math.exp(-t*2.8)*.5;else if(type==="bass")s=Math.sin(2*Math.PI*(65+30*Math.exp(-t*8))*t)*Math.exp(-t*3)*.85;else if(type==="impact")s=(Math.sin(2*Math.PI*70*t)+lastNoise*.5)*Math.exp(-t*7)*.9;else if(type==="riser")s=Math.sin(2*Math.PI*(180+900*p)*t)*p*.45;else if(type==="chime")s=(Math.sin(2*Math.PI*1046*t)+.6*Math.sin(2*Math.PI*1568*t))*Math.exp(-t*4)*.35;else if(type==="rain"){lastNoise=(Math.random()*2-1)*.3;s=lastNoise*(.5+.5*Math.sin(2*Math.PI*7*t));}else if(type==="swoosh"){lastNoise=(Math.random()*2-1)*.75;s=lastNoise*Math.sin(Math.PI*p)*Math.min(1,t*8);}else s=(Math.sin(2*Math.PI*220*t)+Math.sin(2*Math.PI*277.18*t)+Math.sin(2*Math.PI*329.63*t))*.12*(.65+.35*Math.sin(2*Math.PI*.4*t));const fade=Math.min(1,t*30,(duration-t)*18);view.setInt16(44+i*2,Math.round(clamp(s*fade,-1,1)*32767),true);}
    const assetId=uid(),clipId=uid(),url=URL.createObjectURL(new Blob([buffer],{type:"audio/wav"}));
    const asset={id:assetId,name:name+".wav",url,kind:"audio",duration,thumb:null};
    const clip={id:clipId,assetId,name,kind:"audio",sourceIn:0,sourceOut:duration,duration,startTime:playhead,volume:100};
    setAssets(old=>[...old,asset]);setClips(old=>[...old,clip]);setSelected(clipId);setActiveTool("Audio");setStatus(name+" added to the audio track.");
  }

  async function exportProject(){
    if(exporting)return;
    if(!mainClips.length){setStatus("Add a video or photo before exporting.");return;}
    if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream){setStatus("This browser does not support in-browser video export. Try the latest Chrome.");return;}
    setExporting(true);setExportProgress(0);setStatus("Preparing your video export…");
    let audioContext=null,recorder=null;
    try{
      const canvas=document.createElement("canvas");canvas.width=outputWidth;canvas.height=outputHeight;
      const ctx=canvas.getContext("2d");
      const stream=canvas.captureStream(Number(exportFps));
      const mime=["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm","video/mp4"].find(t=>MediaRecorder.isTypeSupported(t))||"";
      audioContext=new AudioContext();
      const audioOut=audioContext.createMediaStreamDestination();
      const chunks=[];
      const combined=new MediaStream([...stream.getVideoTracks(),...audioOut.stream.getAudioTracks()]);
      recorder=new MediaRecorder(combined,mime?{mimeType:mime,videoBitsPerSecond:8000000}:undefined);
      const finished=new Promise((resolve,reject)=>{recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};recorder.onerror=()=>reject(new Error("The browser stopped recording the export."));recorder.onstop=()=>resolve();});
      await audioContext.resume();
      const audioElements=[];
      for(const ac of audioClips){
        const asset=assets.find(a=>a.id===ac.assetId);if(!asset)continue;
        const audio=document.createElement("audio");audio.src=asset.url;audio.preload="auto";audio.volume=clamp(ac.volume??100,0,100)/100;
        const source=audioContext.createMediaElementSource(audio);source.connect(audioOut);
        audioElements.push({audio,clip:ac,source});
      }
      const drawFrame=(source,transformData,timelineTime=0,transitionType="none",transitionElapsed=timelineTime)=>{
        ctx.fillStyle="#000";ctx.fillRect(0,0,outputWidth,outputHeight);ctx.filter="brightness("+brightness+"%) contrast("+contrast+"%) saturate("+saturation+"%)";
        const w=source.videoWidth||source.naturalWidth||outputWidth,h=source.videoHeight||source.naturalHeight||outputHeight;
        const scale=Math.min(outputWidth/w,outputHeight/h)*(transformData?.scale||1);
        const dw=w*scale,dh=h*scale;
        const progress=clamp(transitionElapsed/.45,0,1);ctx.save();ctx.beginPath();ctx.rect(outputWidth*crop.left/100,outputHeight*crop.top/100,outputWidth*(100-crop.left-crop.right)/100,outputHeight*(100-crop.top-crop.bottom)/100);ctx.clip();if(transitionType==="wipe"){ctx.beginPath();ctx.rect(outputWidth*crop.left/100,0,outputWidth*progress,outputHeight);ctx.clip();}ctx.globalAlpha=transitionType==="fade"?progress:transitionType==="flash"?clamp(progress*1.8,0,1):1;const extraScale=transitionType==="zoom"?(1.12-.12*progress):1;const slide=transitionType==="slide"?(1-progress)*220:0;const glitch=transitionType==="glitch"?(1-progress)*Math.sin(transitionElapsed*90)*18:0;ctx.filter=transitionType==="blur"?"blur("+(1-progress)*14+"px)":"none";ctx.translate(outputWidth/2+(transformData?.x||0)*outputWidth/640+slide+glitch,outputHeight/2+(transformData?.y||0)*outputHeight/360);ctx.rotate((transformData?.rotation||0)*Math.PI/180);ctx.scale(transformData?.flipX?-1:1,transformData?.flipY?-1:1);ctx.drawImage(source,-dw*extraScale/2,-dh*extraScale/2,dw*extraScale,dh*extraScale);ctx.restore();ctx.filter="none";if(transitionType==="flash"&&progress<.22){ctx.fillStyle="rgba(255,255,255,"+((.22-progress)/.22*.7)+")";ctx.fillRect(0,0,outputWidth,outputHeight);}
        if(showCaption&&timelineTime>=captionStart&&timelineTime<=captionEnd){ctx.font="bold "+fontSize+"px "+fontFamily;ctx.textAlign="center";ctx.lineWidth=captionStyle==="clean"?0:captionStyle==="heavy"?8:4;ctx.strokeStyle=captionStyle==="neon"?"#00e5ff":"#000";ctx.fillStyle=captionStyle==="highlight"?"#ffe45c":captionColor;const capY=outputHeight*.88;ctx.shadowColor=captionShadow?"#000":"transparent";ctx.shadowBlur=captionShadow?12:0;if(captionStyle==="boxed"){const m=ctx.measureText(caption).width;ctx.fillStyle="#000b";ctx.fillRect(outputWidth/2-m/2-24,capY-fontSize-12,m+48,fontSize+28);ctx.fillStyle=captionColor;}if(captionAnimation==="pop")ctx.translate(outputWidth/2,capY);else ctx.translate(outputWidth/2,capY);if(captionAnimation==="pop"){const s=.8+.2*clamp(transitionElapsed/.2,0,1);ctx.scale(s,s);}if(captionAnimation==="fade")ctx.globalAlpha=clamp(transitionElapsed/.3,0,1);ctx.strokeText(caption,0,0,outputWidth*.9);ctx.fillText(caption,0,0,outputWidth*.9);ctx.setTransform(1,0,0,1,0,0);}
      };
      const drawStill=(source,transformData,duration,transitionType,startAt)=>{
        return new Promise(resolve=>{
          const started=performance.now();
          const tick=now=>{const elapsed=(now-started)/1000;drawFrame(source,transformData,startAt+elapsed,transitionType,elapsed);if(elapsed<duration)requestAnimationFrame(tick);else resolve();};
          requestAnimationFrame(tick);
        });
      };
      const videoElements=[];
      recorder.start(250);
      audioElements.forEach(({audio,clip})=>{
        const at=Math.max(0,clip.startTime||0);
        setTimeout(()=>{try{audio.currentTime=clip.sourceIn||0;audio.play();setTimeout(()=>audio.pause(),clip.duration*1000);}catch{}},at*1000);
      });
      let exportCursor=0;
      for(const c of mainClips){
        const asset=assets.find(a=>a.id===c.assetId);if(!asset)continue;
        if(c.kind==="image"){
          const img=new window.Image();img.src=asset.url;
          await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error("Could not load "+asset.name));});
          await drawStill(img,c.transform,c.duration,c.transition||"none",exportCursor);
        }else{
          const video=document.createElement("video");video.src=asset.url;video.playsInline=true;video.preload="auto";video.volume=clamp(c.volume??100,0,100)/100;
          await new Promise((resolve,reject)=>{video.onloadedmetadata=resolve;video.onerror=()=>reject(new Error("Could not load "+asset.name));});
          await new Promise(resolve=>{video.onseeked=resolve;video.currentTime=c.sourceIn;if(c.sourceIn===0)setTimeout(resolve,100);setTimeout(resolve,2000);});
          const source=audioContext.createMediaElementSource(video);source.connect(audioOut);videoElements.push(video);
          await video.play();
          await new Promise(resolve=>{
            const start=performance.now();
            const tick=()=>{
              const elapsed=(performance.now()-start)/1000;
              drawFrame(video,c.transform,exportCursor+elapsed,c.transition||"none",elapsed);
              if(elapsed>=c.duration||video.ended){video.pause();resolve();}else requestAnimationFrame(tick);
            };requestAnimationFrame(tick);
          });
        }
        exportCursor+=c.duration;
        setExportProgress(Math.round(exportCursor/Math.max(1,mainDuration)*90));
      }
      // Keep the recorder alive through any audio tail after the picture ends.
      const audioTail=Math.max(0,...audioClips.map(c=>(c.startTime||0)+c.duration))-mainDuration;
      if(audioTail>0)await new Promise(resolve=>setTimeout(resolve,audioTail*1000));
      recorder.stop();await finished;
      const type=recorder.mimeType||"video/webm";
      const blob=new Blob(chunks,{type});
      if(!blob.size)throw new Error("The export file was empty. Please try a shorter clip.");
      const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=(projectName||"plus-editor").replace(/[^\w-]+/g,"-")+(type.includes("mp4")?".mp4":".webm");document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
      setExportProgress(100);setStatus("Export complete. Your video has been downloaded.");
      videoElements.forEach(v=>{v.pause();v.removeAttribute("src");});
      audioElements.forEach(({audio})=>{audio.pause();audio.removeAttribute("src");});
    }catch(error){
      try{if(recorder&&recorder.state!=="inactive")recorder.stop();}catch{}
      setStatus("Export failed: "+(error?.message||"unsupported media format"));
    }finally{
      try{await audioContext?.close();}catch{}
      setTimeout(()=>setExportProgress(0),900);setExporting(false);
    }
  }

  const editorTools=[[Settings2,"Edit"],[Crop,"Crop"],[Music2,"Audio"],[Type,"Text"],[WandSparkles,"Transitions"],[Captions,"Captions"],[Film,"Canvas"],[Sparkles,"Effects"],[Image,"Color"]];
  if(screen==="home")return <div className="mobile-app home-screen">
    <input ref={inputRef} hidden type="file" accept="video/*,image/*" multiple onChange={e=>addImported(e.target.files)}/>
    <section className="home-hero"><div className="home-top"><div className="brand-lockup"><span className="plus-mark"><i></i><i></i></span><span><b>PLUS</b><small>EDITOR</small></span></div><button className="round-search" onClick={()=>setScreen("library")}><Search/></button></div>
      <div className="hero-copy"><span>MAKE SOMETHING YOURS</span><h1>Your next edit starts here.</h1><p>A focused creative workspace. Built around your ideas, not someone else's interface.</p></div>
      <div className="create-cards"><button className="create-card new-video" onClick={startNew}><span className="create-icon"><Plus/></span><b>New project</b><small>Choose videos, photos or audio</small></button><button className="create-card edit-photo" onClick={()=>chooseMedia("photo")}><span className="create-icon"><Image/></span><b>Edit photo</b><small>Start with an image</small></button></div>
    </section>
    <section className="home-content"><div className="recent-heading"><b>Creative tools</b><span>THE PLUS WORKSPACE</span></div><div className="home-tools">{[[AudioLines,"Audio tools","Audio"],[Captions,"Text & captions","Text"],[Image,"Crop tools","Crop"]].map(([Icon,label,tool])=><button key={label} className="home-tool" onClick={()=>{setActiveTool(tool);startNew();}}><Icon/><b>{label}</b></button>)}</div><div className="home-note"><b>Made to move with you.</b><p>Import from your phone, shape the timeline, and make every cut count.</p></div></section>
    <nav className="home-nav"><button className="active"><Film/>Create</button><button onClick={()=>setScreen("library")}><Folder/>Projects</button><button onClick={startNew}><Plus/>New</button></nav>
  </div>;

  if(screen==="library")return <div className="mobile-app feature-screen"><header><button onClick={()=>setScreen("home")}><ArrowLeft/></button><b>PLUS EDITOR · Projects</b></header><div className="feature-coming"><Folder/><h1>Your workspace</h1><p>Project saving and reopening is not available yet.</p><button className="cyan-button" onClick={startNew}>Create a project</button></div></div>;

  return <div className="mobile-app editor-screen">
    <input ref={inputRef} hidden type="file" accept="video/*,image/*" multiple onChange={e=>addImported(e.target.files)}/>
    <header className="editor-header"><button onClick={()=>{setPlaying(false);setScreen("home");}}><X/></button><button className="project-title" onClick={()=>{const n=window.prompt("Project name",projectName);if(n)setProjectName(n);}}>{projectName}<ChevronDown size={14}/></button><button className="history-button" disabled={!canUndo} onClick={undo}><Undo2/></button><button className="history-button" disabled={!canRedo} onClick={redo}><Redo2/></button><button className="editor-export" disabled={exporting} onClick={exportProject}><Download size={15}/>{exporting?"Exporting…":"Export"}</button></header>
    <section className="editor-preview"><div className="preview-canvas" style={{aspectRatio:aspectW+"/"+aspectH}} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
      {currentAsset?.kind==="video"?<video ref={videoRef} key={currentClip?.clip.id} src={currentAsset.url} playsInline onTimeUpdate={onVideoTime} onEnded={()=>{if(currentClip){const next=currentClip.start+currentClip.clip.duration;if(next<totalDuration)setPlayhead(next);else setPlaying(false);}}} style={{objectFit:fit,filter:"brightness("+brightness+"%) contrast("+contrast+"%) saturate("+saturation+"%)",opacity:currentClip?.clip.transition==="fade"?clamp(currentClip.offset/.45,0,1):1,clipPath:"inset("+crop.top+"% "+crop.right+"% "+crop.bottom+"% "+crop.left+"%)",transform:"translate(calc(-50% + "+(transform.x+(currentClip?.clip.transition==="slide"?(1-clamp(currentClip.offset/.45,0,1))*110:0))+"px),calc(-50% + "+transform.y+"px)) scale("+(currentClip?.clip.transition==="zoom"?transform.scale*(1.12-.12*clamp(currentClip.offset/.45,0,1)):transform.scale)+") scaleX("+(transform.flipX?-1:1)+") scaleY("+(transform.flipY?-1:1)+") rotate("+transform.rotation+"deg)"}}/>:
      currentAsset?.kind==="image"?<img src={currentAsset.url} alt="" style={{objectFit:fit,filter:"brightness("+brightness+"%) contrast("+contrast+"%) saturate("+saturation+"%)",opacity:currentClip?.clip.transition==="fade"?clamp(currentClip.offset/.45,0,1):1,clipPath:"inset("+crop.top+"% "+crop.right+"% "+crop.bottom+"% "+crop.left+"%)",transform:"translate(calc(-50% + "+transform.x+"px),calc(-50% + "+transform.y+"px)) scale("+(currentClip?.clip.transition==="zoom"?transform.scale*(1.12-.12*clamp(currentClip.offset/.45,0,1)):transform.scale)+") scaleX("+(transform.flipX?-1:1)+") scaleY("+(transform.flipY?-1:1)+") rotate("+transform.rotation+"deg)"}}/>:
      <div className="preview-placeholder"><Film/><b>{clips.length?"Select a video or photo clip":"Your preview will appear here"}</b><span>Import media to begin editing</span><button className="cyan-button" onClick={()=>chooseMedia("all")}>Import media</button></div>}
      {showCaption&&playhead>=captionStart&&playhead<=captionEnd&&<div className="caption-overlay" style={{fontFamily,fontSize:Math.max(12,fontSize*.45),color:captionStyle==="highlight"?"#ffe45c":captionColor,WebkitTextStroke:captionStyle==="clean"?"0":"1.5px #000",background:captionStyle==="boxed"?"#000b":"transparent",padding:captionStyle==="boxed"?"6px 14px":0,textShadow:captionShadow?"0 2px 9px #000":"none",animation:captionAnimation==="pop"?"plusPop .25s ease-out":captionAnimation==="fade"?"plusFade .35s ease-out":captionAnimation==="slide"?"plusSlide .35s ease-out":"none"}}>{caption}</div>}
      {currentAsset&&<div className="canvas-hud">DRAG TO POSITION</div>}
    </div></section>
    <div className="player-controls"><button onClick={()=>setActiveTool("Crop")} title="Crop"><Crop/></button><button className="play-main" onClick={()=>setPlaying(p=>!p)}>{playing?<Pause/>:<Play/>}</button><button onClick={undo} disabled={!canUndo} title="Undo"><Undo2/></button><button onClick={redo} disabled={!canRedo} title="Redo"><Redo2/></button><button onClick={()=>splitSelected()} title="Split clip"><Scissors/></button></div>
    <section className="timeline-area">
      <div className="timeline-top"><b>{fmt(playhead)} <span>/ {fmt(totalDuration)}</span></b><div className="timeline-actions"><button onClick={()=>setZoom(z=>clamp(z-8,16,140))}><ZoomOut/></button><input aria-label="Timeline zoom" type="range" min="16" max="140" value={zoom} onChange={e=>setZoom(+e.target.value)}/><button onClick={()=>setZoom(z=>clamp(z+8,16,140))}><ZoomIn/></button></div></div>
      {selectedClip&&<div className="clip-actions"><span>{selectedClip.name}</span><button onClick={splitSelected}><Scissors size={13}/> Split</button><button className="delete-action" onClick={()=>removeClip(selectedClip.id)}><Trash2 size={13}/> Delete</button></div>}
      <div className="timeline-scroll" ref={timelineRef} onPointerDown={onTimelineBackground}>
        <div className="timeline-content" style={{width:timelineWidth}}>
          <div className="timeline-ruler">{Array.from({length:Math.ceil(totalDuration)+2},(_,i)=><span key={i} style={{left:i*pxPerSec}}>{fmt(i)}</span>)}</div>
          <div className="track-row"><div className="track-label"><b>VIDEO</b><button onClick={()=>chooseMedia("video")}><Plus/></button></div><div className="track-lane">{mainClips.map(c=>{const left=clipStart(c.id);return <div key={c.id} className={"timeline-clip "+(selected===c.id?"selected":"")} style={{left:left*pxPerSec,width:Math.max(42,c.duration*pxPerSec)}} onPointerDown={e=>beginClipDrag(e,c.id)} onPointerMove={moveClipPointer} onPointerUp={endClipPointer} onPointerCancel={endClipPointer}><button className="trim-handle left" onPointerDown={e=>beginClipDrag(e,c.id,"trim-left")} onPointerMove={moveClipPointer} onPointerUp={endClipPointer} title="Drag to trim start"/><div className="clip-visual">{(assets.find(a=>a.id===c.assetId)?.thumb||assets.find(a=>a.id===c.assetId)?.kind==="image")?<img src={assets.find(a=>a.id===c.assetId)?.thumb||assets.find(a=>a.id===c.assetId)?.url} alt=""/>:<span><Film/></span>}<b>{c.name}</b></div><button className="trim-handle right" onPointerDown={e=>beginClipDrag(e,c.id,"trim-right")} onPointerMove={moveClipPointer} onPointerUp={endClipPointer} title="Drag to trim end"/></div>;})}</div></div>
          <div className="track-row"><div className="track-label"><b>AUDIO</b><button onClick={()=>chooseMedia("audio")}><Plus/></button></div><div className="track-lane audio-lane">{audioClips.map(c=><div key={c.id} className={"timeline-clip audio-clip "+(selected===c.id?"selected":"")} style={{left:(c.startTime||0)*pxPerSec,width:Math.max(70,c.duration*pxPerSec)}} onPointerDown={e=>beginClipDrag(e,c.id)} onPointerMove={moveClipPointer} onPointerUp={endClipPointer} onPointerCancel={endClipPointer}><AudioLines/><b>{c.name}</b><button className="trim-handle left" onPointerDown={e=>beginClipDrag(e,c.id,"trim-left")} onPointerMove={moveClipPointer} onPointerUp={endClipPointer}/><button className="trim-handle right" onPointerDown={e=>beginClipDrag(e,c.id,"trim-right")} onPointerMove={moveClipPointer} onPointerUp={endClipPointer}/></div>)}{audioClips.length===0&&<span className="lane-hint">Import music or voiceover</span>}</div></div>
          <div className="track-row"><div className="track-label"><b>TEXT</b><button onClick={addText}><Plus/></button></div><div className="track-lane text-lane">{showCaption?<div className="timeline-clip text-clip" style={{left:0,width:Math.max(100,mainDuration*pxPerSec)}} onClick={e=>{e.stopPropagation();setActiveTool("Text");}}><Type/><b>{caption}</b></div>:<span className="lane-hint">Add titles and captions</span>}</div></div>
          <div className="playhead-line" style={{left:playhead*pxPerSec-7}} onPointerDown={beginPlayheadDrag} onPointerMove={movePlayheadDrag} onPointerUp={endPlayheadDrag} onPointerCancel={endPlayheadDrag}><i/><span/></div>
        </div>
      </div>
    </section>
    <section className="tool-drawer">
      {activeTool==="Crop"?<div className="tool-detail crop-controls"><div className="crop-row"><label>Top</label><input type="range" min="0" max="45" value={crop.top} onChange={e=>setCropValue("top",e.target.value)}/><b>{crop.top}%</b></div><div className="crop-row"><label>Right</label><input type="range" min="0" max="45" value={crop.right} onChange={e=>setCropValue("right",e.target.value)}/><b>{crop.right}%</b></div><div className="crop-row"><label>Bottom</label><input type="range" min="0" max="45" value={crop.bottom} onChange={e=>setCropValue("bottom",e.target.value)}/><b>{crop.bottom}%</b></div><div className="crop-row"><label>Left</label><input type="range" min="0" max="45" value={crop.left} onChange={e=>setCropValue("left",e.target.value)}/><b>{crop.left}%</b></div><div className="transform-actions"><button onClick={()=>{setCrop({top:0,right:0,bottom:0,left:0});setFit("contain");}}>Reset crop</button><button onClick={()=>setFit("cover")}>Fill frame</button><button onClick={()=>setFit("contain")}>Fit frame</button></div></div>:
      activeTool==="Text"?<div className="tool-detail caption-tools"><label>Caption</label><input value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Type your caption"/><select value={fontFamily} onChange={e=>setFontFamily(e.target.value)}><option value="Arial">Arial</option><option value="Georgia">Georgia</option><option value="Impact">Impact</option><option value="Verdana">Verdana</option><option value="Trebuchet MS">Trebuchet</option><option value="Courier New">Courier</option><option value="Space Grotesk">Space Grotesk</option></select><label>Size</label><input type="range" min="24" max="84" value={fontSize} onChange={e=>setFontSize(+e.target.value)}/><label>Style</label><select value={captionStyle} onChange={e=>setCaptionStyle(e.target.value)}><option value="classic">Classic outline</option><option value="clean">Clean</option><option value="heavy">Heavy outline</option><option value="boxed">Boxed subtitle</option><option value="highlight">Highlight</option><option value="neon">Neon</option></select><label>Animation</label><select value={captionAnimation} onChange={e=>setCaptionAnimation(e.target.value)}><option value="none">None</option><option value="pop">Pop</option><option value="fade">Fade</option><option value="slide">Slide</option><option value="wipe">Wipe</option><option value="blur">Blur</option><option value="flash">Flash</option><option value="glitch">Glitch</option></select><label><input type="checkbox" checked={captionShadow} onChange={e=>setCaptionShadow(e.target.checked)}/> Shadow</label><input aria-label="Caption color" type="color" value={captionColor} onChange={e=>setCaptionColor(e.target.value)}/><label>In</label><input aria-label="Caption start time" type="number" min="0" step=".1" value={captionStart} onChange={e=>setCaptionStart(Math.max(0,+e.target.value||0))}/><label>Out</label><input aria-label="Caption end time" type="number" min=".1" step=".1" value={captionEnd} onChange={e=>setCaptionEnd(Math.max(captionStart+.1,+e.target.value||captionStart+.1))}/><button onClick={()=>{setShowCaption(true);setStatus("Caption applied.");}}>Apply</button><button onClick={()=>setShowCaption(false)}>Hide</button></div>:
      activeTool==="Canvas"?<div className="tool-detail canvas-tools"><label>Canvas ratio</label><div className="ratio-grid">{["9:16","16:9","1:1","4:5","4:3","21:9"].map(r=><button key={r} className={aspectRatio===r?"active":""} onClick={()=>setAspectRatio(r)}>{r}</button>)}</div><label>Export resolution</label><select value={exportSize} onChange={e=>setExportSize(e.target.value)}><option value="720">720p</option><option value="1080">1080p</option><option value="1440">1440p</option><option value="2160">4K</option></select><label>Frame rate</label><select value={exportFps} onChange={e=>setExportFps(e.target.value)}><option value="24">24 FPS</option><option value="30">30 FPS</option><option value="60">60 FPS</option></select><span>Output: {outputWidth} × {outputHeight}</span></div>:
      activeTool==="Color"?<div className="tool-detail effects-tools color-tools"><label>Color & light</label><label>Brightness · {brightness}%</label><input type="range" min="40" max="180" value={brightness} onChange={e=>setBrightness(+e.target.value)}/><label>Contrast · {contrast}%</label><input type="range" min="50" max="180" value={contrast} onChange={e=>setContrast(+e.target.value)}/><label>Saturation · {saturation}%</label><input type="range" min="0" max="200" value={saturation} onChange={e=>setSaturation(+e.target.value)}/><button onClick={()=>{setBrightness(100);setContrast(100);setSaturation(100);}}>Reset color</button></div>:
      activeTool==="Effects"?<div className="tool-detail effects-tools"><label>Flip & transform</label><div className="transform-actions"><button onClick={()=>toggleFlip("flipX")}>Flip horizontal</button><button onClick={()=>toggleFlip("flipY")}>Flip vertical</button><button onClick={()=>setTransformValue("rotation",transform.rotation+90)}>Rotate 90°</button></div><label>Scale</label><input type="range" min=".25" max="3" step=".01" value={transform.scale} onChange={e=>setTransformValue("scale",e.target.value)}/><label>Rotation</label><input type="range" min="-180" max="180" value={transform.rotation} onChange={e=>setTransformValue("rotation",e.target.value)}/><p>More visual effects and color grading are next in the editing engine upgrade.</p></div>:
      activeTool==="Audio"?<div className="tool-detail audio-tools"><div className="voice-generator"><b>AI voice studio</b><textarea value={voiceText} onChange={e=>setVoiceText(e.target.value)} placeholder="Paste your narration here…"/><select value={voiceChoice} onChange={e=>setVoiceChoice(e.target.value)}><option value="pNInz6obpgDQGcFmaJgB">Adam · Deep narration</option><option value="TxGEqnHWrfWFTfGW9XjX">Josh · Conversational</option><option value="ErXwobaYiN019PkySvjV">Antoni · Warm</option><option value="EXAVITQu4vr4xnSDxMaL">Bella · Expressive</option><option value="21m00Tcm4TlvDq8ikWAM">Rachel · Clear</option></select><input type="password" value={voiceApiKey} onChange={e=>setVoiceApiKey(e.target.value)} placeholder="ElevenLabs API key (not saved)"/><button disabled={voiceBusy} onClick={generateVoice}>{voiceBusy?"Generating…":"Generate AI voice"}</button><small>Requires your own ElevenLabs API key and available credits. Your key stays in this browser session.</small></div><div className="audio-library"><b>Sound effects</b><button onClick={()=>addSoundEffect("Soft click","click")}>Click</button><button onClick={()=>addSoundEffect("Pop","pop")}>Pop</button><button onClick={()=>addSoundEffect("Whoosh","whoosh")}>Whoosh</button><button onClick={()=>addSoundEffect("Ambient pad","ambient")}>Ambient</button><button onClick={()=>addSoundEffect("Bell","bell")}>Bell</button><button onClick={()=>addSoundEffect("Bass hit","bass")}>Bass</button><button onClick={()=>addSoundEffect("Impact","impact")}>Impact</button><button onClick={()=>addSoundEffect("Riser","riser")}>Riser</button><button onClick={()=>addSoundEffect("Chime","chime")}>Chime</button><button onClick={()=>addSoundEffect("Rain texture","rain")}>Rain</button><button onClick={()=>addSoundEffect("Swoosh","swoosh")}>Swoosh</button></div><label>Volume {selectedClip?.volume??volume}%</label><input type="range" min="0" max="100" value={selectedClip?.volume??volume} onChange={e=>selectedClip?updateClip(selectedClip.id,{volume:+e.target.value}):setVolume(+e.target.value)}/><button onClick={()=>chooseMedia("audio")}>Import audio</button></div>:
      activeTool==="Captions"?<div className="tool-detail"><p>Write and style captions in Text. Set the start and end time for each caption segment.</p><button onClick={()=>{addText();setActiveTool("Text");}}>Add caption</button></div>:
      activeTool==="Transitions"?<div className="tool-detail transition-tools"><label>Transition</label><select disabled={!selectedClip||selectedClip.kind==="audio"} value={selectedClip?.transition||"none"} onChange={e=>{remember();updateClip(selectedClip.id,{transition:e.target.value});}}><option value="none">None</option><option value="fade">Fade</option><option value="zoom">Zoom</option><option value="slide">Slide</option></select><span>Applied at the beginning of the selected clip</span></div>:
      activeTool==="Layers"?<div className="tool-detail"><p>Video, audio and caption tracks are separated below. Select any clip to split or delete it.</p></div>:
      <div className="tool-detail transform-controls"><div className="transform-row"><label>Scale</label><input type="range" min=".25" max="3" step=".01" value={transform.scale} onChange={e=>setTransformValue("scale",e.target.value)}/><b>{Math.round(transform.scale*100)}%</b></div><div className="transform-row"><label>Rotate</label><input type="range" min="-180" max="180" value={transform.rotation} onChange={e=>setTransformValue("rotation",e.target.value)}/><b>{transform.rotation}°</b></div><div className="transform-actions"><button onClick={()=>setTransformValue("rotation",0)}><RotateCcw/> Reset</button><button onClick={splitSelected}><Scissors/> Split</button><button onClick={()=>selectedClip&&removeClip(selectedClip.id)}><Trash2/> Delete</button></div></div>}
      <nav className="editor-toolbar">{editorTools.map(([Icon,label])=><button key={label} className={activeTool===label?"active":""} onClick={()=>setActiveTool(label)}><Icon/><span>{label}</span></button>)}</nav>
    </section>
    <div className="editor-status">{exporting?"Rendering video… "+exportProgress+"%":status}</div>
    {exporting&&<div className="export-overlay"><div className="export-card"><div className="export-spinner"/><b>Rendering your video</b><span>Keep PLUS EDITOR open while we prepare your export.</span><div className="export-progress"><i style={{width:exportProgress+"%"}}/></div><strong>{exportProgress}%</strong></div></div>}
    {audioClips.map(c=>{const a=assets.find(x=>x.id===c.assetId);return a?<audio key={c.id} ref={el=>{if(el)audioRefs.current[c.id]=el;else delete audioRefs.current[c.id];}} src={a.url} preload="auto"/>:null;})}
  </div>;
}
createRoot(document.getElementById("root")).render(<App/>);
