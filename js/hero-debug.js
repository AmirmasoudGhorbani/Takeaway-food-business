/* Opt-in, device-local diagnostics. No data is sent or stored. */
(function () {
  'use strict';
  if (new URLSearchParams(location.search).get('heroDebug') !== '1') return;
  var video = document.getElementById('hero-video');
  var poster = document.getElementById('hero-poster');
  if (!video) return;
  var panel = document.createElement('section');
  panel.setAttribute('aria-label', 'Hero diagnostics');
  panel.style.cssText = 'position:fixed;bottom:8px;left:8px;right:8px;z-index:9999;padding:12px;background:#fff;color:#111;border:2px solid #e44b16;border-radius:8px;font:12px/1.4 monospace;max-height:46vh;overflow:auto;';
  var text = document.createElement('pre');
  text.style.cssText = 'white-space:pre-wrap;margin:0 0 8px;font:inherit;';
  panel.appendChild(text);
  var events = [];
  var recovery = [];
  var frameCount = 0;
  var frameMediaTime = null;
  var frameAt = null;
  var frameId = null;
  var closed = false;
  window.__heroRecoveryLog = function (message) {
    recovery.push((performance.now() / 1000).toFixed(2) + 's ' + message);
    if (recovery.length > 24) recovery.shift();
  };
  function observeFrame(now, metadata) {
    if (closed) return;
    frameCount++;
    frameMediaTime = metadata.mediaTime;
    frameAt = performance.now();
    frameId = video.requestVideoFrameCallback(observeFrame);
  }
  if (video.requestVideoFrameCallback) frameId = video.requestVideoFrameCallback(observeFrame);
  var outcome = 'not tested';
  var priorTime = video.currentTime;
  var advances = 0;
  ['loadedmetadata', 'loadeddata', 'canplay', 'seeking', 'seeked', 'waiting', 'stalled', 'playing', 'pause', 'error'].forEach(function (name) {
    video.addEventListener(name, function () { events.push(name); if (events.length > 8) events.shift(); });
  });
  function render() {
    if (Math.abs(video.currentTime - priorTime) > 0.01) advances++;
    priorTime = video.currentTime;
    text.textContent = [
      'HERO DIAGNOSTICS v2 (frame-wait-2)',
      'Page: ' + document.visibilityState + ' | browser: ' + navigator.userAgent,
      'Scroll: ' + Math.round(window.scrollY),
      'Time: ' + video.currentTime.toFixed(3) + ' / ' + video.duration + ' (changes: ' + advances + ')',
      'Ready: ' + video.readyState + ' | network: ' + video.networkState,
      'Seeking: ' + video.seeking + ' | paused: ' + video.paused,
      'Poster: ' + (poster ? getComputedStyle(poster).visibility : 'absent'),
      'Reduce motion: ' + matchMedia('(prefers-reduced-motion: reduce)').matches,
      'Save data: ' + !!(navigator.connection && navigator.connection.saveData),
      'Frame callback API: ' + !!video.requestVideoFrameCallback,
      'Presented callbacks: ' + frameCount + ' | media time: ' + (frameMediaTime === null ? 'none' : frameMediaTime.toFixed(3)) + ' | age: ' + (frameAt === null ? 'none' : Math.round(performance.now() - frameAt) + 'ms'),
      'Source: ' + (video.getAttribute('src') || 'none'),
      'Error: ' + (video.error ? video.error.code + ' ' + video.error.message : 'none'),
      'Play test: ' + outcome,
      'Events: ' + events.join(', '),
      'Recovery log:\n' + recovery.join('\n')
    ].join('\n');
  }
  function button(label, action) {
    var button = document.createElement('button');
    button.textContent = label;
    button.style.cssText = 'padding:10px;margin:3px;border:1px solid #666;color:#111;background:#eee;border-radius:4px;font:14px sans-serif;';
    button.addEventListener('click', function (event) { event.stopPropagation(); action(); });
    button.addEventListener('touchend', function (event) { event.stopPropagation(); });
    panel.appendChild(button);
  }
  button('Copy details', function () {
    render();
    if (navigator.clipboard) navigator.clipboard.writeText(text.textContent).catch(function () { outcome = 'Copy unavailable; take a screenshot'; render(); });
  });
  button('Hide/show poster', function () {
    if (poster) poster.classList.toggle('is-hidden');
    render();
  });
  button('Test playback', function () {
    window.__heroRecoveryLog('TEST: user playback requested');
    video.muted = true;
    var result = video.play();
    if (result && result.then) result.then(function () {
      outcome = 'allowed'; window.__heroRecoveryLog('TEST: play resolved'); render();
      setTimeout(function () { video.pause(); window.__heroRecoveryLog('TEST: paused after 500ms'); render(); }, 500);
    }, function (error) { outcome = error.name + ': ' + error.message; render(); });
  });
  var timer = setInterval(render, 250);
  button('Close', function () {
    closed = true;
    clearInterval(timer);
    if (frameId !== null && video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(frameId);
    delete window.__heroRecoveryLog;
    panel.remove();
  });
  document.body.appendChild(panel);
  render();
})();
