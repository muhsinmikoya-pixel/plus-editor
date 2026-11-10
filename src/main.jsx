import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft, AudioLines, Captions, ChevronDown, ChevronRight, CircleUserRound,
  Clapperboard, Crop, Download, Film, Folder, FolderOpen, Image, ImagePlus,
  Layers, Mic, Music2, Pause, Play, Plus, Search, Scissors, Settings2,
  Sparkles, Square, Type, Undo2, Volume2, WandSparkles, X, Zap
} from "lucide-react";
import "./style.css";

const formatTime = (seconds = 0) => {
  if (!Number.isFinite(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return mins + ":" + secs;
};

function App() {
  const [screen, setScreen] = useState("home");
  const [files, setFiles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [galleryTab, setGalleryTab] = useState("Videos");
  const [playing, setPlaying] = useState(false);
  const [caption, setCaption] = useState("Your next big edit starts here.");
  const [showCaption, setShowCaption] = useState(false);
  const [activeTool, setActiveTool] = useState("Edit");
  const [volume, setVolume] = useState(100);
  const [status, setStatus] = useState("Ready to create");
  const [duration, setDuration] = useState(0);
  const [playhead, setPlayhead] = useState(0);
  const [projectName, setProjectName] = useState("Untitled project");
  const [projectCount, setProjectCount] = useState(0);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1, rotation: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef(null);
  const inputRef = useRef(null);
  const videoRef = useRef(null);
  const selectedFile = files.find(file => file.id === selected) || files[0] || null;
  const videoFiles = useMemo(() => files.filter(file => file.kind === "video"), [files]);
  const audioFiles = useMemo(() => files.filter(file => file.kind === "audio"), [files]);
  const visibleGalleryFiles = useMemo(
    () => files.filter(file => galleryTab === "Videos" ? file.kind === "video" : file.kind === "image"),
    [files, galleryTab]
  );

  useEffect(() => {
    return () => files.forEach(file => URL.revokeObjectURL(file.url));
  }, []);

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = volume / 100;
  }, [volume, selected]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const update = () => setPlayhead(video.currentTime || 0);
    video.addEventListener("timeupdate", update);
    return () => video.removeEventListener("timeupdate", update);
  }, [selected, screen]);

  function chooseMedia(kind = "all") {
    if (inputRef.current) {
      inputRef.current.accept = kind === "audio" ? "audio/*" : kind === "photo" ? "image/*" : kind === "video" ? "video/*" : "video/*,image/*,audio/*";
      inputRef.current.click();
    }
  }

  function importFiles(list) {
    const added = Array.from(list || []).map(file => ({
      id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())),
      name: file.name,
      file,
      url: URL.createObjectURL(file),
      kind: file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : "image",
      duration: 0
    }));
    if (!added.length) return;
    setFiles(previous => [...previous, ...added]);
    setSelected(added.find(file => file.kind === "video")?.id || added[0].id);
    setGalleryTab(added.some(file => file.kind === "video") ? "Videos" : "Photos");
    setStatus(added.length + " item(s) added to your project");
    setProjectCount(count => count + 1);
    setScreen("editor");
  }

  function startNewVideo() {
    setFiles([]);
    setSelected(null);
    setProjectName("Untitled project");
    setGalleryTab("Videos");
    setScreen("gallery");
  }

  function addMore() {
    chooseMedia("all");
  }

  function removeFile(id) {
    const target = files.find(file => file.id === id);
    if (target) URL.revokeObjectURL(target.url);
    const remaining = files.filter(file => file.id !== id);
    setFiles(remaining);
    if (selected === id) setSelected(remaining[0]?.id || null);
    setStatus("Media removed");
  }

  function exportCurrent() {
    const video = videoRef.current;
    if (!video || selectedFile?.kind !== "video") {
      setStatus("Select a video clip before exporting.");
      return;
    }
    if (!video.captureStream || !window.MediaRecorder) {
      setStatus("Video export is not supported by this browser yet.");
      return;
    }
    try {
      const stream = video.captureStream();
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "plus-editor-export.webm";
        link.click();
        URL.revokeObjectURL(url);
        setStatus("Export downloaded");
      };
      video.currentTime = 0;
      video.play();
      recorder.start();
      video.onended = () => { if (recorder.state !== "inactive") recorder.stop(); video.pause(); setPlaying(false); };
      setStatus("Exporting video playback…");
    } catch {
      setStatus("Could not start export in this browser.");
    }
  }

  function splitClip() { setStatus("Split point selected. Frame-accurate slicing is being built."); }
  function updateTransform(key, value) { setTransform(old => ({ ...old, [key]: Number(value) })); }
  function onCanvasDown(e) { if (!selectedFile || selectedFile.kind === "audio") return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); const r=e.currentTarget.getBoundingClientRect(); dragRef.current={id:e.pointerId,x:e.clientX,y:e.clientY,bx:transform.x,by:transform.y,w:r.width,h:r.height}; setDragging(true); }
  function onCanvasMove(e) { if(!dragRef.current || dragRef.current.id!==e.pointerId)return; setTransform(old=>({...old,x:Math.max(-180,Math.min(180,dragRef.current.bx+(e.clientX-dragRef.current.x)*360/dragRef.current.w)),y:Math.max(-110,Math.min(110,dragRef.current.by+(e.clientY-dragRef.current.y)*202.5/dragRef.current.h))})); }
  function onCanvasUp(e) { if(dragRef.current && dragRef.current.id===e.pointerId){dragRef.current=null;setDragging(false);} }

  const homeTools = [
    [AudioLines, "AutoCut", "Create a quick edit"],
    [Sparkles, "Retouch", "Photo touch-ups"],
    [WandSparkles, "AI generator", "AI creative tools"],
    [Image, "Photo tools", "Crop and adjust"],
    [Mic, "Record", "Record a voiceover"],
    [Zap, "Auto enhance", "Improve your footage"],
    [AudioLines, "Audio tools", "Music and sound"],
    [Captions, "Auto captions", "Speech to captions"],
    [CircleUserRound, "Remove background", "Cut out a subject"]
  ];

  const editorTools = [
    [Scissors, "Edit"], [Music2, "Audio"], [Type, "Text"],
    [Sparkles, "Effects"], [Layers, "Overlay"], [Captions, "Captions"]
  ];

  if (screen === "home") {
    return <div className="mobile-app home-screen">
      <input ref={inputRef} type="file" accept="video/*,image/*,audio/*" multiple hidden onChange={event => importFiles(event.target.files)} />
      <section className="home-hero">
        <div className="home-top"><div className="trial-pill"><span className="diamond">◆</span> PLUS EDITOR · FREE TO CREATE</div><button className="round-search" aria-label="Search"><Search size={23}/></button></div>
        <div className="hero-copy"><span>VIDEO CREATE</span><h1>Get started <ChevronRight size={28}/></h1></div>
        <div className="create-cards">
          <button className="create-card new-video" onClick={startNewVideo}><span className="create-icon"><Plus size={30}/></span><b>New video</b><small>Start editing your clips</small></button>
          <button className="create-card edit-photo" onClick={() => {setScreen("gallery");setGalleryTab("Photos");}}><span className="create-icon"><Image size={27}/></span><b>Edit photo</b><small>Make a photo look better</small></button>
        </div>
      </section>
      <section className="home-content">
        <div className="recent-heading"><b>Recent projects</b><button onClick={() => setScreen("library")}>See all <ChevronRight size={15}/></button></div>
        {projectCount > 0 ? <div className="recent-empty"><Film size={24}/><span>Your new project is ready in the editor.</span><button onClick={() => setScreen("editor")}>Continue editing</button></div> : <div className="recent-strip"><div className="recent-placeholder"><Clapperboard/><span>Your projects will appear here</span></div><div className="recent-next"><ChevronRight/></div></div>}
        <div className="home-tools">{homeTools.map(([Icon, label, desc]) => <button key={label} className="home-tool" onClick={() => {if(label === "Audio tools") {startNewVideo();setActiveTool("Audio");} else if(label === "Auto captions") {startNewVideo();setActiveTool("Captions");} else if(label === "Photo tools" || label === "Edit photo") {setGalleryTab("Photos");setScreen("gallery");} else {setStatus(label + " is on the feature roadmap");setScreen("feature");}}}><Icon size={28}/><b>{label}</b></button>)}</div>
      </section>
      <nav className="home-nav"><button className="active"><Scissors/>Edit</button><button onClick={() => setScreen("feature")}><Layers/>Templates</button><button onClick={() => setScreen("feature")}><Sparkles/>AI Lab</button><button onClick={() => setScreen("library")}><Folder/>Library</button><button onClick={() => setScreen("feature")}><CircleUserRound/>Me</button></nav>
    </div>;
  }

  if (screen === "gallery") {
    return <div className="mobile-app gallery-screen">
      <input ref={inputRef} type="file" accept="video/*,image/*,audio/*" multiple hidden onChange={event => importFiles(event.target.files)} />
      <header className="gallery-header"><button onClick={() => setScreen("home")} aria-label="Close"><X/></button><b>Albums <ChevronDown size={18}/></b><span>Generated</span><span>Spaces <ChevronDown size={16}/></span><span>Library</span></header>
      <div className="gallery-tabs"><button className={galleryTab === "Videos" ? "active" : ""} onClick={() => setGalleryTab("Videos")}>Videos</button><button className={galleryTab === "Photos" ? "active" : ""} onClick={() => setGalleryTab("Photos")}>Photos</button></div>
      {files.length === 0 ? <div className="gallery-empty"><div className="gallery-empty-icon"><ImagePlus size={34}/></div><h2>Choose media from your phone</h2><p>PLUS EDITOR can import videos and photos you select from your Android gallery.</p><button className="cyan-button" onClick={() => chooseMedia(galleryTab === "Photos" ? "photo" : "video")}>Open phone gallery</button><button className="browse-all" onClick={() => chooseMedia("all")}>Browse photos, videos and audio</button></div> :
        <><div className="gallery-grid">{visibleGalleryFiles.map(file => <button key={file.id} className={selected === file.id ? "gallery-thumb selected" : "gallery-thumb"} onClick={() => setSelected(file.id)}>{file.kind === "video" ? <video src={file.url} muted preload="metadata"/> : <img src={file.url} alt={file.name}/>}<span className="select-circle">{selected === file.id ? "✓" : ""}</span>{file.kind === "video" && <small>{formatTime(file.duration)}</small>}</button>)}</div><div className="gallery-footer"><span>{files.length} selected/imported</span><button className="cyan-button" onClick={() => setScreen("editor")}>Add to project</button></div></>}
      <button className="gallery-add-more" onClick={() => chooseMedia(galleryTab === "Photos" ? "photo" : "video")}><Plus size={17}/> Add more from phone</button>
    </div>;
  }

  if (screen === "feature") {
    return <div className="mobile-app feature-screen"><header><button onClick={() => setScreen("home")}><ArrowLeft/></button><b>PLUS EDITOR</b></header><div className="feature-coming"><Sparkles size={38}/><h1>More creative tools are coming.</h1><p>We're building the editing tools step by step. Start with a video project to use the editor that's available now.</p><button className="cyan-button" onClick={startNewVideo}>Create a video</button></div></div>;
  }

  if (screen === "library") {
    return <div className="mobile-app feature-screen"><header><button onClick={() => setScreen("home")}><ArrowLeft/></button><b>Project library</b></header><div className="feature-coming"><Folder size={38}/><h1>Your projects</h1><p>Projects you create in this browser will be shown here as project saving is added.</p><button className="cyan-button" onClick={startNewVideo}>New video</button></div></div>;
  }

  return <div className="mobile-app editor-screen">
    <input ref={inputRef} type="file" accept="video/*,image/*,audio/*" multiple hidden onChange={event => importFiles(event.target.files)} />
    <header className="editor-header">
      <button onClick={() => setScreen("home")} aria-label="Back"><X size={25}/></button>
      <button className="project-title" onClick={() => {const name=window.prompt("Project name",projectName);if(name)setProjectName(name);}}>{projectName} <ChevronDown size={15}/></button>
      <button className="premium-icon" title="PLUS tools"><span>◆</span></button>
      <button className="quality-button">1080P <ChevronDown size={13}/></button>
      <button className="editor-export" onClick={exportCurrent}><Download size={16}/> Export</button>
    </header>
    <section className="editor-preview">
      <div className="preview-canvas">
        {selectedFile?.kind === "video" ? <video ref={videoRef} key={selectedFile.id} src={selectedFile.url} controls={false} onLoadedMetadata={event => {setDuration(event.target.duration || 0);const file=files.find(item=>item.id===selectedFile.id);if(file)file.duration=event.target.duration || 0;}} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}/> :
          selectedFile?.kind === "image" ? <img src={selectedFile.url} alt={selectedFile.name}/> :
          <div className="preview-placeholder"><Film size={36}/><b>Import a video to start</b><span>Your preview will appear here</span></div>}
        {showCaption && <div className="caption-overlay">{caption}</div>}
      </div>
    </section>
    <div className="player-controls">
      <button aria-label="Fullscreen"><Crop size={20}/></button>
      <button className="play-main" onClick={() => {if(videoRef.current){if(videoRef.current.paused)videoRef.current.play();else videoRef.current.pause();}}}>{playing ? <Pause size={23}/> : <Play size={23}/>}</button>
      <button aria-label="Undo"><Undo2 size={21}/></button><button aria-label="Redo"><Undo2 className="redo-icon" size={21}/></button>
    </div>
    <section className="timeline-area">
      <div className="timeline-time"><b>{formatTime(playhead)} / {formatTime(duration)}</b><span>{formatTime(playhead)}　 •　 {formatTime(playhead+2)}　 •　 {formatTime(playhead+4)}</span></div>
      <div className="timeline-scroll">
        <div className="track-tools"><button onClick={() => setVolume(volume===0?100:0)}><Volume2/><small>Mute clip</small></button><button onClick={() => chooseMedia("audio")}><Music2/><small>Add audio</small></button><button onClick={() => {setShowCaption(true);setActiveTool("Text");}}><Type/><small>Add text</small></button></div>
        <div className="track-stack">
          <div className="timeline-track video-track">{files.filter(file=>file.kind!=="audio").map(file=><button key={file.id} className={selected===file.id?"clip-tile chosen":"clip-tile"} onClick={()=>setSelected(file.id)}>{file.kind==="video"?<video src={file.url} muted preload="metadata"/>:<img src={file.url} alt=""/>}<span>{file.name}</span></button>)}<button className="add-clip" onClick={addMore}><Plus/></button></div>
          <div className="timeline-track audio-track">{audioFiles.map(file=><button key={file.id} className="audio-tile" onClick={()=>setSelected(file.id)}><AudioLines/>{file.name}</button>)}<button className="track-add" onClick={()=>chooseMedia("audio")}>＋ Add audio</button></div>
          <div className="timeline-track text-track">{showCaption&&<button className="text-tile" onClick={()=>setActiveTool("Text")}><Type/> Text overlay</button>}<button className="track-add" onClick={()=>{setShowCaption(true);setActiveTool("Text");}}>＋ Add text</button></div>
        </div>
        <div className="playhead"></div>
      </div>
    </section>
    <section className="tool-drawer">
      {activeTool==="Text" ? <div className="tool-detail"><label>Text overlay</label><input value={caption} onChange={event=>setCaption(event.target.value)}/><button onClick={()=>setShowCaption(true)}>Apply</button></div> :
       activeTool==="Audio" ? <div className="tool-detail"><label>Clip volume · {volume}%</label><input type="range" min="0" max="100" value={volume} onChange={event=>setVolume(+event.target.value)}/><button onClick={()=>chooseMedia("audio")}>Import audio</button></div> :
       activeTool==="Captions" ? <div className="tool-detail"><label>Captions</label><p>Automatic speech-to-text captions will be added in a later update.</p></div> :
       activeTool==="Effects" ? <div className="tool-detail"><label>Effects</label><p>Video effects and transitions are on the build roadmap.</p></div> :
       <div className="tool-detail"><label>{status}</label><button onClick={splitClip}>Split at playhead</button><button onClick={addMore}>Add media</button></div>}
      <nav className="editor-toolbar">{editorTools.map(([Icon,label])=><button key={label} className={activeTool===label?"active":""} onClick={()=>setActiveTool(label)}><Icon size={22}/><span>{label}</span></button>)}</nav>
    </section>
    <div className="editor-status">{status}</div>
  </div>;
}

createRoot(document.getElementById("root")).render(<App/>);
