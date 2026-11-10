# PLUS EDITOR

A mobile-first video editing workspace with its own monochrome PLUS identity.

## Working in this build
- Import video, photo and audio files selected from the device.
- Arrange video/photo clips in a sequential timeline.
- Split a selected video/photo clip at the playhead (creates two non-destructive source ranges).
- Reorder clips by dragging them in the timeline or using Move left / Move right.
- Trim clip start/end in 0.5-second increments with the trim controls.
- Scrub the playhead, zoom the timeline, and preview the selected footage.
- Drag footage in the preview; adjust scale and rotation.
- Switch preview framing between Fit and Fill/Crop.
- Add an editable text overlay.
- Add audio media to a separate audio lane.

## Not implemented yet
- Combined sequence rendering/export (the Export control intentionally explains this limitation).
- Audio mixing/playback, waveform editing and audio trimming.
- Drag-to-trim handles, frame-by-frame precision, keyframes, transitions, filters, captions transcription, AI tools and background removal.
- Persistent project save/reopen.

## Run locally
```bash
npm install
npm run dev
npm run build
```

The editor is an in-progress browser-based project. It does not claim feature parity with Premiere Pro or CapCut.
