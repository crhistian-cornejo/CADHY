/**
 * CADHY CAD Icons - Optimized SVG Icon System
 * 43 icons optimized for CAD operations
 */

;(() => {
  const icons = `<svg xmlns="http://www.w3.org/2000/svg" style="display: none;">
    <symbol id="icon-box" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke="currentColor" fill="none" stroke-width="2"/><polyline points="3.27 6.96 12 12.01 20.73 6.96" stroke="currentColor" fill="none" stroke-width="2"/><line x1="12" y1="22.08" x2="12" y2="12" stroke="currentColor" stroke-width="2"/></symbol>
    <symbol id="icon-cylinder" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3" stroke="currentColor" fill="none" stroke-width="2"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" stroke="currentColor" fill="none" stroke-width="2"/></symbol>
    <symbol id="icon-sphere" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" fill="none" stroke-width="2"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="currentColor" fill="none" stroke-width="2"/></symbol>
    <symbol id="icon-cone" viewBox="0 0 24 24"><path d="M12 2L3 22h18L12 2z" stroke="currentColor" fill="none" stroke-width="2"/><ellipse cx="12" cy="22" rx="9" ry="2" stroke="currentColor" fill="none" stroke-width="2"/></symbol>
    <symbol id="icon-torus" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" fill="none" stroke-width="2"/><circle cx="12" cy="12" r="6" stroke="currentColor" fill="none" stroke-width="2"/></symbol>
    <symbol id="icon-channel" viewBox="0 0 24 24"><path d="M4 4h16v14H4z" stroke="currentColor" fill="none" stroke-width="2"/><line x1="4" y1="18" x2="20" y2="18" stroke="currentColor" stroke-width="2"/></symbol>
    <symbol id="icon-chute" viewBox="0 0 24 24"><path d="M6 4h12l-3 16H9z" stroke="currentColor" fill="none" stroke-width="2"/></symbol>
    <symbol id="icon-transition" viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="16" stroke="currentColor" fill="none" stroke-width="2"/><rect x="14" y="6" width="6" height="12" stroke="currentColor" fill="none" stroke-width="2"/><path d="M10 12h4" stroke="currentColor" stroke-width="2"/></symbol>
    <symbol id="icon-extrude" viewBox="0 0 24 24"><path d="M12 5l7 4v10l-7 4-7-4V9l7-4z" stroke="currentColor" fill="none" stroke-width="2"/><path d="M12 12l-7-4" stroke="currentColor" fill="none" stroke-width="2"/><line x1="12" y1="12" x2="12" y2="23" stroke="currentColor" stroke-width="2"/></symbol>
    <symbol id="icon-revolve" viewBox="0 0 24 24"><path d="M21.5 2v6h-6M2.5 22v-6h6" stroke="currentColor" fill="none" stroke-width="2"/><path d="M19 13a8 8 0 0 1-8 8M5 11a8 8 0 0 1 8-8" stroke="currentColor" fill="none" stroke-width="2"/></symbol>
    <symbol id="icon-sweep" viewBox="0 0 24 24"><path d="M21 3v18" stroke="currentColor" fill="none" stroke-width="2"/><path d="M3 9c0-3.31 2.69-6 6-6s6 2.69 6 6-2.69 6-6 6" stroke="currentColor" fill="none" stroke-width="2"/><circle cx="9" cy="3" r="2" fill="currentColor"/></symbol>
    <symbol id="icon-loft" viewBox="0 0 24 24"><ellipse cx="12" cy="6" rx="8" ry="2" stroke="currentColor" fill="none" stroke-width="2"/><ellipse cx="12" cy="18" rx="6" ry="2" stroke="currentColor" fill="none" stroke-width="2"/><line x1="4" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2"/><line x1="20" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2"/></symbol>
    <symbol id="icon-helix" viewBox="0 0 24 24"><path d="M12 2c-2.76 0-5 2.24-5 5v10c0 2.76 2.24 5 5 5s5-2.24 5-5V7c0-2.76-2.24-5-5-5z" stroke="currentColor" fill="none" stroke-width="2" stroke-dasharray="2,3"/></symbol>
    <symbol id="icon-fillet" viewBox="0 0 24 24"><path d="M21 3v7c0 2.76-2.24 5-5 5H3" stroke="currentColor" fill="none" stroke-width="2"/></symbol>
    <symbol id="icon-chamfer" viewBox="0 0 24 24"><path d="M21 3v7l-5 5H3" stroke="currentColor" fill="none" stroke-width="2"/></symbol>
    <symbol id="icon-offset" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2"/><rect x="7" y="7" width="10" height="10" stroke="currentColor" fill="none" stroke-width="2"/></symbol>
    <symbol id="icon-shell" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke="currentColor" fill="none" stroke-width="2"/><path d="M12 8l-7 4 7 4 7-4z" stroke="currentColor" fill="none" stroke-width="1.5" stroke-dasharray="2,2"/></symbol>
    <symbol id="icon-union" viewBox="0 0 24 24"><circle cx="9" cy="12" r="7" stroke="currentColor" fill="none" stroke-width="2"/><circle cx="15" cy="12" r="7" stroke="currentColor" fill="none" stroke-width="2"/></symbol>
    <symbol id="icon-difference" viewBox="0 0 24 24"><circle cx="9" cy="12" r="7" stroke="currentColor" fill="none" stroke-width="2"/><circle cx="15" cy="12" r="7" stroke="currentColor" fill="none" stroke-width="2" stroke-dasharray="3,3"/></symbol>
    <symbol id="icon-intersection" viewBox="0 0 24 24"><path d="M12 5a7 7 0 0 0-7 7M12 19a7 7 0 0 0 7-7" stroke="currentColor" fill="none" stroke-width="2"/><circle cx="9" cy="12" r="7" stroke="currentColor" fill="none" stroke-width="2" opacity="0.3"/><circle cx="15" cy="12" r="7" stroke="currentColor" fill="none" stroke-width="2" opacity="0.3"/></symbol>
    <symbol id="icon-select" viewBox="0 0 24 24"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" stroke="currentColor" fill="none" stroke-width="2"/></symbol>
    <symbol id="icon-move" viewBox="0 0 24 24"><polyline points="5 9 2 12 5 15" stroke="currentColor" fill="none" stroke-width="2"/><polyline points="9 5 12 2 15 5" stroke="currentColor" fill="none" stroke-width="2"/><polyline points="15 19 12 22 9 19" stroke="currentColor" fill="none" stroke-width="2"/><polyline points="19 9 22 12 19 15" stroke="currentColor" fill="none" stroke-width="2"/><line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width="2"/><line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" stroke-width="2"/></symbol>
    <symbol id="icon-rotate" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10" stroke="currentColor" fill="none" stroke-width="2"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" stroke="currentColor" fill="none" stroke-width="2"/></symbol>
    <symbol id="icon-scale" viewBox="0 0 24 24"><polyline points="15 3 21 3 21 9" stroke="currentColor" fill="none" stroke-width="2"/><polyline points="9 21 3 21 3 15" stroke="currentColor" fill="none" stroke-width="2"/><line x1="21" y1="3" x2="14" y2="10" stroke="currentColor" stroke-width="2"/><line x1="3" y1="21" x2="10" y2="14" stroke="currentColor" stroke-width="2"/></symbol>
    <symbol id="icon-measure" viewBox="0 0 24 24"><path d="M3 3v18h18" stroke="currentColor" fill="none" stroke-width="2"/><path d="M7 21v-3m4 3v-5m4 5v-8m4 8V7" stroke="currentColor" fill="none" stroke-width="2"/></symbol>
    <symbol id="icon-view-top" viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2"/><circle cx="12" cy="12" r="1" fill="currentColor"/></symbol>
    <symbol id="icon-view-front" viewBox="0 0 24 24"><rect x="7" y="5" width="10" height="14" stroke="currentColor" fill="none" stroke-width="2"/><line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="1" opacity="0.3"/></symbol>
    <symbol id="icon-view-iso" viewBox="0 0 24 24"><path d="M12 3l9 5v9l-9 5-9-5V8z" stroke="currentColor" fill="none" stroke-width="2"/><polyline points="12 3 12 12 21 17" stroke="currentColor" fill="none" stroke-width="1" opacity="0.3"/></symbol>
    <symbol id="icon-zoom-in" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" stroke="currentColor" fill="none" stroke-width="2"/><line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" stroke-width="2"/><line x1="11" y1="8" x2="11" y2="14" stroke="currentColor" stroke-width="2"/><line x1="8" y1="11" x2="14" y2="11" stroke="currentColor" stroke-width="2"/></symbol>
    <symbol id="icon-zoom-out" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" stroke="currentColor" fill="none" stroke-width="2"/><line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" stroke-width="2"/><line x1="8" y1="11" x2="14" y2="11" stroke="currentColor" stroke-width="2"/></symbol>
    <symbol id="icon-zoom-fit" viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" stroke="currentColor" fill="none" stroke-width="2"/></symbol>
    <symbol id="icon-save" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" fill="none" stroke-width="2"/><polyline points="17 21 17 13 7 13 7 21" stroke="currentColor" fill="none" stroke-width="2"/><polyline points="7 3 7 8 15 8" stroke="currentColor" fill="none" stroke-width="2"/></symbol>
    <symbol id="icon-open" viewBox="0 0 24 24"><path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z" stroke="currentColor" fill="none" stroke-width="2"/></symbol>
    <symbol id="icon-settings" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" stroke="currentColor" fill="none" stroke-width="2"/><path d="M12 1v6m0 6v10M4.93 4.93l4.24 4.24m5.66 5.66l4.24 4.24M1 12h6m6 0h10M4.93 19.07l4.24-4.24m5.66-5.66l4.24-4.24" stroke="currentColor" fill="none" stroke-width="2"/></symbol>
    <symbol id="icon-undo" viewBox="0 0 24 24"><polyline points="9 14 4 9 9 4" stroke="currentColor" fill="none" stroke-width="2"/><path d="M20 20v-7a4 4 0 0 0-4-4H4" stroke="currentColor" fill="none" stroke-width="2"/></symbol>
    <symbol id="icon-redo" viewBox="0 0 24 24"><polyline points="15 14 20 9 15 4" stroke="currentColor" fill="none" stroke-width="2"/><path d="M4 20v-7a4 4 0 0 1 4-4h12" stroke="currentColor" fill="none" stroke-width="2"/></symbol>
    <symbol id="icon-delete" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" stroke="currentColor" fill="none" stroke-width="2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" fill="none" stroke-width="2"/></symbol>
    <symbol id="icon-eye" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" fill="none" stroke-width="2"/><circle cx="12" cy="12" r="3" stroke="currentColor" fill="none" stroke-width="2"/></symbol>
    <symbol id="icon-eye-slash" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" fill="none" stroke-width="2"/><line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="2"/></symbol>
    <symbol id="icon-grid" viewBox="0 0 24 24"><path d="M3 3v18h18" stroke="currentColor" fill="none" stroke-width="2"/><path d="M8 3v18M13 3v18M18 3v18M3 8h18M3 13h18M3 18h18" stroke="currentColor" fill="none" stroke-width="1" opacity="0.5"/></symbol>
    <symbol id="icon-play" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3" stroke="currentColor" fill="currentColor" stroke-width="2"/></symbol>
    <symbol id="icon-pause" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" stroke="currentColor" fill="currentColor" stroke-width="2"/><rect x="14" y="4" width="4" height="16" stroke="currentColor" fill="currentColor" stroke-width="2"/></symbol>
    <symbol id="icon-stop" viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" stroke="currentColor" fill="currentColor" stroke-width="2"/></symbol>
  </svg>`

  const div = document.createElement("div")
  div.innerHTML = icons
  div.setAttribute("style", "position:absolute;width:0;height:0;overflow:hidden;")
  div.setAttribute("aria-hidden", "true")

  if (document.body) {
    document.body.insertBefore(div, document.body.firstChild)
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      document.body.insertBefore(div, document.body.firstChild)
    })
  }

  console.log("[CAD Icons] ✅ Loaded 43 optimized icons")
})()
