import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Activity, AudioLines, Captions, Check, ChevronDown, Clapperboard, Crop, Download, Film, FolderOpen, Gauge, ImagePlus, Layers, Music2, Play, Plus, Scissors, Settings2, Sparkles, Square, Type, Undo2, Volume2, WandSparkles, X } from "lucide-react";
import "./style.css";

function App() {
  const [files, setFiles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [caption, setCaption] = useState("Your next big edit starts here.");
  const [showCaption, setShowCaption] = useState(false);
  const [activeTool, setActiveTool] = useState("Media");
  const [zoom, setZoom] = useState(100);
  const [volume, setVolume] = useState(100);
  const [status, setStatus] = useState("Ready to create");
  const [duration, setDuration] = useState(0);
  const videoRef = useRef(null);
  const inputRef = useRef(null);
  const galleryRef = useRef(null);
  const selectedFile = files.find(f => f.id === selected);
  const mediaFiles = useMemo(() => files.filter(f => f.kind === "video" || f.kind === "image"), [files]);

  useEffect(() => {
    return () => files.forEach(f => URL.revokeObjectURL(f.url));
  }, []);

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = volume / 100;
  }, [volume, selected]);

  function importFiles(list) {
    const added = Array.from(list || []).map((file, i) => ({
      id: crypto.randomUUID(), name: file.name, file, url: URL.createObjectURL(file),
      kind: file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : "image",
      duration: 0
    }));
    setFiles(prev => [...prev, ...added]);
    if (added.length) { setSelected(added[0].id); setStatus(`${added.length} file(s) imported`); }
  }

  function addToTimeline(file) {
    if (!files.some(f => f.id === file.id)) setFiles(prev => [...prev, file]);
    setSelected(file.id);
    setStatus(`${file.name} selected`);
  }

  function removeSelected() {
    if (!selectedFile) return;
    URL.revokeObjectURL(selectedFile.url);
    setFiles(prev => prev.filter(f => f.id !== selected));
    setSelected(null);
    setStatus("Clip removed");
  }

  function splitSelected() {
    if (!selectedFile) return;
    setStatus("Split point set at the playhead — detailed multi-clip splitting is coming next.");
  }

  function exportCurrent() {
    const v = videoRef.current;
    if (!v || selectedFile?.kind !== "video") {
      setStatus("Choose a video clip first to preview and export it.");
      return;
    }
    try {
      const stream = v.captureStream();
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      const chunks = [];
      recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "plus-editor-export.webm"; a.click();
        URL.revokeObjectURL(url);
        setStatus("Video export downloaded");
      };
      v.currentTime = 0; v.play();
      recorder.start();
      v.onended = () => { recorder.stop(); v.pause(); setPlaying(false); };
      setStatus("Recording video playback for WebM export…");
    } catch {
      setStatus("This browser does not support video capture export.");
    }
  }

  const tools = [
    ["Media", FolderOpen], ["Audio", Music2], ["Text", Type], ["Captions", Captions],
    ["Effects", WandSparkles], ["Adjust", Gauge]
  ];

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#" aria-label="Plus Editor home">
        <span className="brand-mark"><span></span><i></i><em></em></span>
        <span className="brand-name"><b>PLUS</b><small>EDITOR</small></span>
      </a>
      <div className="project-name"><span className="live-dot"></span> Untitled project <ChevronDown size={14}/></div>
      <div className="top-actions"><button className="icon-btn" title="Undo"><Undo2 size={17}/></button><button className="icon-btn" title="Settings"><Settings2 size={17}/></button><button className="export-btn" onClick={exportCurrent}><Download size={15}/> Export</button></div>
    </header>

    <main className="workspace">
      <aside className="left-panel">
        <nav className="tool-rail">{tools.map(([name, Icon]) => <button key={name} className={activeTool === name ? "rail-item active" : "rail-item"} onClick={() => setActiveTool(name)}><Icon size={19}/><span>{name}</span></button>)}</nav>
        <section className="asset-panel">
          <div className="panel-heading"><div><span className="eyebrow">WORKSPACE</span><h2>{activeTool}</h2></div><button className="icon-btn small" onClick={() => inputRef.current?.click()}><Plus size={17}/></button></div>
          {activeTool === "Media" && <>
            <button className="import-card" onClick={() => galleryRef.current?.click()}><ImagePlus size={23}/><b>Choose from gallery</b><span>Pick videos or photos from your phone</span></button>
            <input ref={galleryRef} type="file" accept="video/*,image/*" multiple hidden onChange={e => importFiles(e.target.files)}/>
            <button className="audio-import" onClick={() => inputRef.current?.click()}><AudioLines size={15}/> Import audio files</button>
            <input ref={inputRef} type="file" accept="video/*,image/*,audio/*" multiple hidden onChange={e => importFiles(e.target.files)}/>
            <div className="asset-list">{files.map(f => <button key={f.id} className={selected === f.id ? "asset active" : "asset"} onClick={() => addToTimeline(f)}><span className="asset-thumb">{f.kind === "video" ? <Film size={17}/> : f.kind === "audio" ? <AudioLines size={17}/> : <ImagePlus size={17}/>}</span><span className="asset-info"><b>{f.name}</b><small>{f.kind.toUpperCase()}</small></span><Plus size={15}/></button>)}</div>
            {!files.length && <p className="empty-note">Your imported files will appear here.</p>}
          </>}
          {activeTool === "Text" && <div className="tool-content"><label>Text content</label><textarea value={caption} onChange={e => setCaption(e.target.value)}/><button className="wide-btn" onClick={() => {setShowCaption(true);setStatus("Text overlay added to preview");}}>Add text overlay</button><p className="hint">Text overlay appears in the preview. Timeline-based text editing is being developed.</p></div>}
          {activeTool === "Captions" && <div className="tool-content"><div className="feature-tile"><Captions/><b>Caption studio</b><small>Style and prepare captions</small></div><button className="wide-btn" onClick={() => {setShowCaption(true);setStatus("Caption overlay enabled");}}>Add caption</button><p className="hint">Automatic speech recognition and word-by-word caption timing are not enabled yet.</p></div>}
          {activeTool === "Audio" && <div className="tool-content"><div className="feature-tile"><AudioLines/><b>Audio controls</b><small>Adjust selected video volume</small></div><label>Clip volume · {volume}%</label><input type="range" min="0" max="100" value={volume} onChange={e => setVolume(+e.target.value)}/></div>}
          {activeTool === "Effects" && <div className="tool-content"><div className="feature-tile"><Sparkles/><b>Effects library</b><small>Visual effects are planned for the next build</small></div><p className="hint">The effect controls will be added with real preview and export rendering—not decorative buttons.</p></div>}
          {activeTool === "Adjust" && <div className="tool-content"><div className="feature-tile"><Gauge/><b>Preview settings</b><small>Workspace display scale</small></div><label>Preview scale · {zoom}%</label><input type="range" min="50" max="150" value={zoom} onChange={e => setZoom(+e.target.value)}/></div>}
        </section>
      </aside>

      <section className="center-panel">
        <div className="preview-toolbar"><span>PREVIEW</span><span className="preview-size">Fit <ChevronDown size={13}/></span></div>
        <div className="preview-stage"><div className="preview-frame" style={{transform:`scale(${zoom/100})`}}>
          {selectedFile?.kind === "video" ? <video ref={videoRef} key={selectedFile.id} src={selectedFile.url} controls={false} onLoadedMetadata={e => setDuration(e.target.duration || 0)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} /> :
           selectedFile?.kind === "image" ? <img src={selectedFile.url} alt="Selected media"/> :
           <div className="welcome-preview"><div className="large-mark"><span></span><i></i><em></em></div><b>Make something<br/>worth watching.</b><small>Import a video to begin editing.</small></div>}
          {showCaption && <div className="caption-overlay">{caption}</div>}
        </div></div>
        <div className="playback-bar"><button className="play-button" onClick={() => {if(videoRef.current){if(videoRef.current.paused) videoRef.current.play(); else videoRef.current.pause();}}}>{playing ? <Square size={15}/> : <Play size={16} fill="currentColor"/>}</button><span className="timecode">00:00:00</span><div className="playback-line"></div><span className="timecode">{duration ? new Date(duration*1000).toISOString().slice(11,19) : "00:00:00"}</span></div>
      </section>

      <aside className="inspector">
        <div className="panel-heading"><div><span className="eyebrow">PROPERTIES</span><h2>Inspector</h2></div><Settings2 size={17}/></div>
        {selectedFile ? <><div className="selected-file"><span className="file-icon"><Film size={19}/></span><div><b>{selectedFile.name}</b><small>{selectedFile.kind} clip</small></div></div><div className="property-group"><label>Volume</label><div className="range-row"><Volume2 size={15}/><input type="range" min="0" max="100" value={volume} onChange={e => setVolume(+e.target.value)}/><span>{volume}%</span></div></div><div className="property-group"><label>Clip actions</label><button className="action-row" onClick={splitSelected}><Scissors size={16}/> Split at playhead</button><button className="action-row danger" onClick={removeSelected}><X size={16}/> Remove clip</button></div></> : <div className="inspector-empty"><Layers size={24}/><b>Nothing selected</b><span>Select a clip to see its settings.</span></div>}
      </aside>
    </main>

    <section className="timeline-panel">
      <div className="timeline-header"><div><span className="eyebrow">SEQUENCE</span><b>Timeline</b></div><div className="timeline-controls"><button className="icon-btn small" onClick={() => setZoom(Math.max(50, zoom-10))}>−</button><span>{zoom}%</span><button className="icon-btn small" onClick={() => setZoom(Math.min(150, zoom+10))}>+</button></div></div>
      <div className="timeline-body"><div className="track-labels"><div><Film size={15}/> Video 1</div><div><AudioLines size={15}/> Audio 1</div><div><Type size={15}/> Text</div></div><div className="tracks">
        <div className="ruler"><span>00:00</span><span>00:05</span><span>00:10</span><span>00:15</span><span>00:20</span></div>
        <div className="track">{mediaFiles.map(f => <button key={f.id} className={selected === f.id ? "timeline-clip active" : "timeline-clip"} onClick={() => setSelected(f.id)}><span>{f.kind === "video" ? <Film size={13}/> : <ImagePlus size={13}/>}</span>{f.name}</button>)}</div>
        <div className="track audio-track">{files.filter(f => f.kind === "audio").map(f => <button key={f.id} className="timeline-clip audio-clip" onClick={() => setSelected(f.id)}><AudioLines size={13}/>{f.name}</button>)}</div>
        <div className="track text-track">{showCaption && <button className="timeline-clip text-clip" onClick={() => setActiveTool("Text")}><Type size={13}/>Text overlay</button>}</div>
      </div></div>
      <div className="statusbar"><span><span className="live-dot"></span>{status}</span><span>PLUS EDITOR · BETA</span></div>
    </section>
    <footer className="mobile-footer"><button onClick={() => galleryRef.current?.click()}><FolderOpen/>Gallery</button><button onClick={() => setActiveTool("Text")}><Type/>Text</button><button onClick={() => setActiveTool("Audio")}><Music2/>Audio</button><button onClick={exportCurrent}><Download/>Export</button></footer>
  </div>;
}

createRoot(document.getElementById("root")).render(<App/>);