import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowLeft, AudioLines, Captions, ChevronDown, ChevronRight, Crop, Download, Film, Folder, Image, ImagePlus, Layers, Mic, Music2, Pause, Play, Plus, Scissors, Search, Settings2, Sparkles, Type, Undo2, Volume2, WandSparkles, X, ZoomIn, ZoomOut, RotateCcw, Trash2, MoveHorizontal } from "lucide-react";
import "./style.css";

const uid = () => globalThis.crypto?.randomUUID?.() || String(Date.now()) + Math.random().toString(16).slice(2);
const fmt = n => { n = Math.max(0, Number(n) || 0); return String(Math.floor(n/60)).padStart(2,"0")+":"+String(Math.floor(n%60)).padStart(2,"0"); };
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));

function App(){
  const [screen,setScreen]=useState("home");
  const [assets,setAssets]=useState([]);
  const [clips,setClips]=useState([]);
  const [selected,setSelected]=useState(null);
  const [galleryTab,setGalleryTab]=useState("Videos");
  const [playhead,setPlayhead]=useState(0);
  const [playing,setPlaying]=useState(false);
  const [activeTool,setActiveTool]=useState("Edit");
  const [projectName,setProjectName]=useState("Untitled project");
  const [status,setStatus]=useState("Ready to create");
  const [zoom,setZoom]=useState(48);
  const [volume,setVolume]=useState(100);
  const [fit,setFit]=useState("contain");
  const [caption,setCaption]=useState("Your text");
  const [showCaption,setShowCaption]=useState(false);
  const [transform,setTransform]=useState({x:0,y:0,scale:1,rotation:0});
  const [crop,setCrop]=useState({left:0,top:0,right:0,bottom:0});
  const inputRef=useRef(null);
  const videoRef=useRef(null);
  const timelineRef=useRef(null);
  const dragRef=useRef(null);
  const clipsRef=useRef(clips);
  useEffect(()=>{clipsRef.current=clips;},[clips]);
  useEffect(()=>()=>assets.forEach(a=>URL.revokeObjectURL(a.url)),[]);
  const selectedClip=clips.find(c=>c.id===selected)||clips[0]||null;
  const selectedAsset=selectedClip?assets.find(a=>a.id===selectedClip.assetId):null;
  const videoClips=clips.filter(c=>c.kind!=="audio");
  const audioClips=clips.filter(c=>c.kind==="audio");
  const totalDuration=videoClips.reduce((n,c)=>n+c.duration,0);
  const currentClip=useMemo(()=>{
    let t=0;
    for(const c of videoClips){ if(playhead>=t && playhead<t+c.duration) return {clip:c,offset:playhead-t,start:t}; t+=c.duration; }
    return videoClips.length?{clip:videoClips[videoClips.length-1],offset:videoClips[videoClips.length-1].duration,start:Math.max(0,totalDuration-videoClips[videoClips.length-1].duration)}:null;
  },[videoClips,playhead,totalDuration]);
  const currentAsset=currentClip?assets.find(a=>a.id===currentClip.clip.assetId):selectedAsset;
  const pxPerSec=zoom;
  const timelineWidth=Math.max(640,totalDuration*pxPerSec+240);

  function chooseMedia(kind="all"){
    if(!inputRef.current)return;
    inputRef.current.accept=kind==="audio"?"audio/*":kind==="photo"?"image/*":kind==="video"?"video/*":"video/*,image/*,audio/*";
    inputRef.current.value="";
    inputRef.current.click();
  }
  function addImported(list){
    const incoming=Array.from(list||[]);
    if(!incoming.length)return;
    const newAssets=incoming.map(file=>({id:uid(),name:file.name,file,url:URL.createObjectURL(file),kind:file.type.startsWith("video/")?"video":file.type.startsWith("audio/")?"audio":"image",duration: file.type.startsWith("image/")?5:0}));
    setAssets(old=>[...old,...newAssets]);
    const newClips=newAssets.map(a=>({id:uid(),assetId:a.id,name:a.name,kind:a.kind,sourceIn:0,sourceOut:a.duration||0,duration:a.duration||5,volume:100,transform:{x:0,y:0,scale:1,rotation:0}}));
    setClips(old=>[...old,...newClips]);
    setSelected(newClips.find(c=>c.kind!=="audio")?.id||newClips[0].id);
    setGalleryTab(newAssets.some(a=>a.kind==="video")?"Videos":"Photos");
    setScreen("editor");
    setStatus(incoming.length+" media item(s) added to timeline");
  }
  function startNew(){setAssets([]);setClips([]);setSelected(null);setPlayhead(0);setProjectName("Untitled project");setScreen("gallery");}
  function updateClip(id,patch){setClips(old=>old.map(c=>c.id===id?{...c,...patch}:c));}
  function splitSelected(){
    if(!selectedClip){setStatus("Select a timeline clip first.");return;}
    if(selectedClip.kind==="audio"){setStatus("Audio splitting is not enabled in this build yet.");return;}
    let start=0;for(const c of videoClips){if(c.id===selectedClip.id)break;start+=c.duration;}
    const local=playhead-start;
    const cutSource=selectedClip.sourceIn+local;
    if(local<=0.04||local>=selectedClip.duration-0.04){setStatus("Move the playhead inside the selected clip to split it.");return;}
    const left={...selectedClip,id:uid(),sourceOut:cutSource,duration:local};
    const right={...selectedClip,id:uid(),sourceIn:cutSource,duration:selectedClip.duration-local};
    setClips(old=>{const i=old.findIndex(c=>c.id===selectedClip.id);return [...old.slice(0,i),left,right,...old.slice(i+1)];});
    setSelected(right.id);setStatus("Clip split at "+fmt(playhead)+". Both pieces can now be edited separately.");
  }
  function trimClip(id,edge,delta){
    const c=clips.find(x=>x.id===id);if(!c)return;
    const d=Math.max(0.05,delta);
    if(edge==="left" && c.duration>d+0.05){updateClip(id,{sourceIn:c.sourceIn+d,duration:c.duration-d});setPlayhead(p=>Math.max(0,p-d));}
    if(edge==="right" && c.duration>d+0.05){updateClip(id,{sourceOut:c.sourceOut-d,duration:c.duration-d});}
    setStatus("Trim updated. Original media remains unchanged.");
  }
  function moveClip(id,delta){
    setClips(old=>{const from=old.findIndex(c=>c.id===id);const to=clamp(from+delta,0,old.length-1);if(from<0||to===from)return old;const next=[...old];const [item]=next.splice(from,1);next.splice(to,0,item);return next;});
    setStatus("Timeline order updated.");
  }
  function removeClip(id){
    setClips(old=>old.filter(c=>c.id!==id));
    if(selected===id)setSelected(clips.find(c=>c.id!==id)?.id||null);
    setStatus("Clip removed from timeline. Source media is kept in the project bin.");
  }
  function seekTo(time){
    const t=clamp(time,0,totalDuration);
    setPlayhead(t);
    let sum=0,found=null,offset=0;
    for(const c of clips){if(t>=sum&&t<sum+c.duration){found=c;offset=t-sum;break;}sum+=c.duration;}
    if(found){setSelected(found.id);const a=assets.find(x=>x.id===found.assetId);if(a?.kind==="video"&&videoRef.current){const target=found.sourceIn+offset;if(Math.abs(videoRef.current.currentTime-target)>0.15)videoRef.current.currentTime=target;}}
  }
  function onTimelinePointer(e){
    const el=timelineRef.current;if(!el)return;
    const r=el.getBoundingClientRect();const x=e.clientX-r.left+el.scrollLeft;
    seekTo(clamp(x/pxPerSec,0,totalDuration));
  }
  function onClipDragStart(e,id){e.dataTransfer.setData("text/plain",id);e.dataTransfer.effectAllowed="move";}
  function onClipDrop(e,targetId){
    e.preventDefault();const id=e.dataTransfer.getData("text/plain");if(!id||id===targetId)return;
    setClips(old=>{const from=old.findIndex(c=>c.id===id),to=old.findIndex(c=>c.id===targetId);if(from<0||to<0)return old;const next=[...old];const [item]=next.splice(from,1);next.splice(to,0,item);return next;});
    setStatus("Clip moved to a new timeline position.");
  }
  function setTransformValue(k,v){const next={...transform,[k]:Number(v)};setTransform(next);if(selectedClip)updateClip(selectedClip.id,{transform:next});}
  function pointerDown(e){if(!currentAsset||currentAsset.kind==="audio")return;e.currentTarget.setPointerCapture(e.pointerId);dragRef.current={x:e.clientX,y:e.clientY,tx:transform.x,ty:transform.y};}
  function pointerMove(e){if(!dragRef.current)return;const r=e.currentTarget.getBoundingClientRect();const next={...transform,x:clamp(dragRef.current.tx+e.clientX-dragRef.current.x,-r.width/2,r.width/2),y:clamp(dragRef.current.ty+e.clientY-dragRef.current.y,-r.height/2,r.height/2)};setTransform(next);if(selectedClip)updateClip(selectedClip.id,{transform:next});}
  function pointerUp(){dragRef.current=null;}
  useEffect(()=>{
    if(!playing)return;
    const timer=setInterval(()=>{
      setPlayhead(old=>{
        const next=old+0.05;
        if(next>=totalDuration){setPlaying(false);return 0;}
        return next;
      });
    },50);
    return ()=>clearInterval(timer);
  },[playing,totalDuration]);
  useEffect(()=>{
    if(!videoRef.current||!currentClip||currentAsset?.kind!=="video")return;
    const target=currentClip.clip.sourceIn+currentClip.offset;
    if(Math.abs(videoRef.current.currentTime-target)>0.25){try{videoRef.current.currentTime=target;}catch{}}
    videoRef.current.volume=clamp(volume,0,100)/100;
    if(playing)videoRef.current.play().catch(()=>setPlaying(false));else videoRef.current.pause();
  },[currentClip?.clip.id,playing,currentAsset?.url,volume]);
  useEffect(()=>{if(selectedClip?.transform)setTransform(selectedClip.transform);},[selectedClip?.id]);
  function exportNotice(){setStatus("Export rendering is not ready yet. The timeline edits are real, but this build does not yet render a combined MP4/WebM sequence.");}
  const homeTools=[[AudioLines,"Audio tools"],[Captions,"Captions"],[Image,"Photo tools"],[Mic,"Voiceover"],[Sparkles,"Effects"],[WandSparkles,"AI tools"]];
  const editorTools=[[Settings2,"Edit"],[Crop,"Crop"],[Music2,"Audio"],[Type,"Text"],[Layers,"Layers"],[Captions,"Captions"]];
  const currentIndex=videoClips.findIndex(c=>c.id===selectedClip?.id);

  if(screen==="home")return <div className="mobile-app home-screen">
    <input ref={inputRef} hidden type="file" multiple onChange={e=>addImported(e.target.files)}/>
    <section className="home-hero"><div className="home-top"><div className="brand-lockup"><span className="plus-mark"><i></i><i></i></span><span><b>PLUS</b><small>EDITOR</small></span></div><button className="round-search" onClick={()=>setScreen("library")}><Search/></button></div>
      <div className="hero-copy"><span>MAKE SOMETHING YOURS</span><h1>Your next edit starts here.</h1><p>A focused creative workspace. Built around your ideas, not someone else's interface.</p></div>
      <div className="create-cards"><button className="create-card new-video" onClick={startNew}><span className="create-icon"><Plus/></span><b>New project</b><small>Bring your footage together</small></button><button className="create-card edit-photo" onClick={()=>{setGalleryTab("Photos");setScreen("gallery");}}><span className="create-icon"><Image/></span><b>Edit photo</b><small>Work with a still image</small></button></div>
    </section>
    <section className="home-content"><div className="recent-heading"><b>Creative tools</b><span>THE PLUS WORKSPACE</span></div><div className="home-tools">{homeTools.map(([Icon,label])=><button key={label} className="home-tool" onClick={()=>{setActiveTool(label==="Audio tools"?"Audio":label==="Captions"?"Captions":label==="Photo tools"?"Crop":label);startNew();}}><Icon/><b>{label}</b></button>)}</div><div className="home-note"><b>Made to move with you.</b><p>Import from your phone, shape the timeline, and make every cut count.</p></div></section>
    <nav className="home-nav"><button className="active"><Film/>Create</button><button onClick={()=>setScreen("library")}><Folder/>Projects</button><button onClick={startNew}><Plus/>New</button></nav>
  </div>;

  if(screen==="gallery")return <div className="mobile-app gallery-screen">
    <input ref={inputRef} hidden type="file" multiple onChange={e=>addImported(e.target.files)}/>
    <header className="gallery-header"><button onClick={()=>setScreen("home")}><X/></button><b>Import media</b><span>PLUS EDITOR</span></header>
    <div className="gallery-tabs"><button className={galleryTab==="Videos"?"active":""} onClick={()=>setGalleryTab("Videos")}>Videos</button><button className={galleryTab==="Photos"?"active":""} onClick={()=>setGalleryTab("Photos")}>Photos</button><button onClick={()=>chooseMedia("audio")}>Audio</button></div>
    <div className="gallery-empty"><div className="gallery-empty-icon"><ImagePlus/></div><h2>Choose from your gallery</h2><p>Pick the videos, photos or audio you want to edit. PLUS EDITOR only receives the files you choose.</p><button className="cyan-button" onClick={()=>chooseMedia(galleryTab==="Photos"?"photo":"video")}>Open phone gallery</button><button className="browse-all" onClick={()=>chooseMedia("all")}>Browse any media file</button></div>
  </div>;

  if(screen==="library")return <div className="mobile-app feature-screen"><header><button onClick={()=>setScreen("home")}><ArrowLeft/></button><b>PLUS EDITOR · Projects</b></header><div className="feature-coming"><Folder/><h1>Your workspace</h1><p>Project saving and reopening will be added after the editing engine is stable.</p><button className="cyan-button" onClick={startNew}>Create a project</button></div></div>;

  return <div className="mobile-app editor-screen">
    <input ref={inputRef} hidden type="file" multiple onChange={e=>addImported(e.target.files)}/>
    <header className="editor-header"><button onClick={()=>setScreen("home")}><X/></button><button className="project-title" onClick={()=>{const n=window.prompt("Project name",projectName);if(n)setProjectName(n);}}>{projectName}<ChevronDown size={14}/></button><button className="editor-export" onClick={exportNotice}><Download size={15}/> Export</button></header>
    <section className="editor-preview"><div className="preview-canvas" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
      {currentAsset?.kind==="video"?<video ref={videoRef} key={currentClip?.clip.id} src={currentAsset.url} playsInline muted={volume===0} onLoadedMetadata={e=>{const c=currentClip?.clip;if(c&&c.sourceOut===0){const d=e.target.duration||5;updateClip(c.id,{sourceOut:d,duration:d});}}} style={{objectFit:fit,transform:"translate(calc(-50% + "+transform.x+"px),calc(-50% + "+transform.y+"px)) scale("+transform.scale+") rotate("+transform.rotation+"deg)"}}/>:
      currentAsset?.kind==="image"?<img src={currentAsset.url} alt="" style={{objectFit:fit,transform:"translate(calc(-50% + "+transform.x+"px),calc(-50% + "+transform.y+"px)) scale("+transform.scale+") rotate("+transform.rotation+"deg)"}}/>:
      <div className="preview-placeholder"><Film/><b>{clips.length?"Select a video or photo clip":"Your preview will appear here"}</b><span>Import media to begin editing</span><button className="cyan-button" onClick={()=>chooseMedia("all")}>Import media</button></div>}
      {showCaption&&<div className="caption-overlay">{caption}</div>}
      {currentAsset&&<div className="canvas-hud">DRAG TO POSITION</div>}
    </div></section>
    <div className="player-controls"><button onClick={()=>setFit(fit==="contain"?"cover":"contain")} title="Toggle fit / fill"><Crop/></button><button className="play-main" onClick={()=>setPlaying(p=>!p)}>{playing?<Pause/>:<Play/>}</button><button onClick={()=>seekTo(Math.max(0,playhead-1))}><Undo2/></button><button onClick={()=>seekTo(Math.min(totalDuration,playhead+1))}><ChevronRight/></button></div>
    <section className="timeline-area">
      <div className="timeline-top"><b>{fmt(playhead)} <span>/ {fmt(totalDuration)}</span></b><div className="timeline-actions"><button onClick={()=>setZoom(z=>clamp(z-8,16,120))}><ZoomOut/></button><input aria-label="Timeline zoom" type="range" min="16" max="120" value={zoom} onChange={e=>setZoom(+e.target.value)}/><button onClick={()=>setZoom(z=>clamp(z+8,16,120))}><ZoomIn/></button></div></div>
      <div className="timeline-scroll" ref={timelineRef} onPointerDown={onTimelinePointer}>
        <div className="timeline-ruler" style={{width:timelineWidth}}>{Array.from({length:Math.ceil(totalDuration)+2},(_,i)=><span key={i} style={{left:i*pxPerSec}}>{fmt(i)}</span>)}</div>
        <div className="track-label"><b>VIDEO</b><button onClick={()=>chooseMedia("video")}><Plus/></button></div>
        <div className="track-lane" style={{width:timelineWidth}}>{videoClips.map((c,i)=>{const left=videoClips.slice(0,i).reduce((n,x)=>n+x.duration,0);return <div key={c.id} draggable onDragStart={e=>onClipDragStart(e,c.id)} onDragOver={e=>e.preventDefault()} onDrop={e=>onClipDrop(e,c.id)} className={"timeline-clip "+(selected===c.id?"selected":"")} style={{left:left*pxPerSec,width:Math.max(38,c.duration*pxPerSec)}} onClick={e=>{e.stopPropagation();setSelected(c.id);seekTo(left);}}>
          <button className="trim-handle left" title="Trim start" onClick={e=>{e.stopPropagation();trimClip(c.id,"left",0.5);}}></button><div className="clip-visual"><span>{c.kind==="audio"?<AudioLines/>:<Film/>}</span><b>{c.name}</b></div><button className="trim-handle right" title="Trim end" onClick={e=>{e.stopPropagation();trimClip(c.id,"right",0.5);}}></button>
        </div>;})}</div>
        <div className="track-label"><b>AUDIO</b><button onClick={()=>chooseMedia("audio")}><Plus/></button></div>
        <div className="track-lane audio-lane" style={{width:timelineWidth}}>{audioClips.map((c,i)=><div key={c.id} className={"timeline-clip audio-clip "+(selected===c.id?"selected":"")} style={{left:audioClips.slice(0,i).reduce((n,x)=>n+x.duration,0)*pxPerSec,width:Math.max(90,c.duration*pxPerSec)}} onClick={e=>{e.stopPropagation();setSelected(c.id);}}><AudioLines/><b>{c.name}</b></div>)}<span className="lane-hint">Add a music track or voice recording</span></div>
        <div className="track-label"><b>TEXT</b><button onClick={()=>{setShowCaption(true);setActiveTool("Text");}}><Plus/></button></div>
        <div className="track-lane text-lane" style={{width:timelineWidth}}>{showCaption?<div className="timeline-clip text-clip" style={{left:0,width:Math.max(100,totalDuration*pxPerSec)}} onClick={()=>setActiveTool("Text")}><Type/><b>{caption}</b></div>:<span className="lane-hint">Add titles and captions</span>}</div>
        <div className="playhead-line" style={{left:playhead*pxPerSec}}><i/></div>
      </div>
    </section>
    <section className="tool-drawer">
      {activeTool==="Crop"?<div className="tool-detail"><label>Frame</label><button onClick={()=>setFit("contain")}>Fit</button><button onClick={()=>setFit("cover")}>Fill / Crop</button><button onClick={()=>setFit("contain")}>Reset crop</button></div>:
      activeTool==="Text"?<div className="tool-detail"><label>Text</label><input value={caption} onChange={e=>setCaption(e.target.value)}/><button onClick={()=>setShowCaption(true)}>Apply</button></div>:
      activeTool==="Audio"?<div className="tool-detail"><label>Volume {volume}%</label><input type="range" min="0" max="100" value={volume} onChange={e=>setVolume(+e.target.value)}/><button onClick={()=>chooseMedia("audio")}>Import audio</button></div>:
      activeTool==="Captions"?<div className="tool-detail"><p>Caption editor is planned. Automatic speech recognition is not included yet.</p></div>:
      activeTool==="Layers"?<div className="tool-detail"><p>Video, audio and text lanes are separate. Overlay compositing is next.</p></div>:
      <div className="tool-detail transform-controls"><div className="transform-row"><label>Scale</label><input type="range" min=".25" max="3" step=".01" value={transform.scale} onChange={e=>setTransformValue("scale",e.target.value)}/><b>{Math.round(transform.scale*100)}%</b></div><div className="transform-row"><label>Rotate</label><input type="range" min="-180" max="180" value={transform.rotation} onChange={e=>setTransformValue("rotation",e.target.value)}/><b>{transform.rotation}°</b></div><div className="transform-actions"><button onClick={()=>setTransformValue("rotation",0)}><RotateCcw/> Reset</button><button onClick={splitSelected}><Scissors/> Split at playhead</button><button onClick={()=>selectedClip&&removeClip(selectedClip.id)}><Trash2/> Delete</button></div><div className="transform-actions"><button onClick={()=>selectedClip&&moveClip(selectedClip.id,-1)}>Move left</button><button onClick={()=>selectedClip&&moveClip(selectedClip.id,1)}>Move right</button><button onClick={()=>selectedClip&&trimClip(selectedClip.id,"left",.5)}>Trim start −0.5s</button><button onClick={()=>selectedClip&&trimClip(selectedClip.id,"right",.5)}>Trim end −0.5s</button></div></div>}
      <nav className="editor-toolbar">{editorTools.map(([Icon,label])=><button key={label} className={activeTool===label?"active":""} onClick={()=>setActiveTool(label)}><Icon/><span>{label}</span></button>)}</nav>
    </section>
    <div className="editor-status">{status}</div>
  </div>;
}
createRoot(document.getElementById("root")).render(<App/>);
