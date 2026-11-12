/* Pauzza landing page: motion.
   Written for this page; no libraries, nothing fetched, nothing stored.
   The page is complete without this file.

   It follows the brandbook's Motion chapter: a dot appears, a line lights up,
   a cursor blinks; short, and once. Two things go further, both by design:
   the terminal replay in "how it works", and the falling code behind
   the headline on desktop. Reduced-motion visitors get the still page. */
(function () {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var root = document.documentElement;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  root.classList.add('motion');

  /* ---------- hero: comments type in, the dot appears, the line lights up, the cursor blinks three times ---------- */
  var hero = $('.hero');
  var typed = $$('.comment[data-type]', hero).map(function (el) {
    var text = el.textContent;
    el.textContent = '';
    var a = document.createElement('span'), b = document.createElement('span');
    b.className = 'untyped'; b.textContent = text;
    el.appendChild(a); el.appendChild(b);
    return { a: a, b: b, text: text };
  });
  function type(item, done) {
    var i = 0;
    (function step() {
      i += 2;
      item.a.textContent = item.text.slice(0, i);
      item.b.textContent = item.text.slice(i);
      if (i < item.text.length) setTimeout(step, 22); else done();
    })();
  }
  function hit() { hero.classList.add('is-hit'); }
  if (typed.length === 2) type(typed[0], function () { setTimeout(function () { type(typed[1], function () { setTimeout(hit, 180); }); }, 160); });
  else hit();

  /* ---------- blocks appear once as you reach them ---------- */
  var waiting = $$('[data-reveal]');
  function reveal() {
    var edge = window.innerHeight * 0.9;
    waiting = waiting.filter(function (el) {
      if (el.getBoundingClientRect().top > edge) return true;
      el.classList.add('in');
      return false;
    });
  }

  /* ---------- "how it works": a made-up session that replays by itself while it is on screen ---------- */
  var how = $('.how'), demo = $('#demo');
  var state = $('.demo-state'), typedCmd = $('#demo-typed'), btn = $('.demo-btn');
  var steps = $$('.how-steps .card');
  var timer = null, playing = false;
  function wait(ms, next) { timer = setTimeout(next, ms); }
  function step(n) { steps.forEach(function (c, i) { c.classList.toggle('is-on', i === n); }); }
  function phase(n) { demo.setAttribute('data-phase', n); }
  function done38() { state.textContent = 'done in 38s'; }

  function play() {                  // 1 · the tool is working; the seconds count up
    phase(1); step(0);
    typedCmd.textContent = ''; btn.textContent = 'Get code';
    var s = 0;
    (function tick() {
      s += 1;
      state.textContent = 'working… ' + s + 's';
      if (s < 38) wait(s < 4 ? 260 : 58, tick); else wait(500, ready);
    })();
  }
  function ready() {                 // 2 · the status line says something is ready
    done38(); phase(2); step(1);
    wait(2200, typeCmd);
  }
  function typeCmd() {               // 3 · you type /pauzza
    phase(3); step(2);
    var cmd = '/pauzza', i = 0;
    (function key() {
      i += 1; typedCmd.textContent = cmd.slice(0, i);
      if (i < cmd.length) wait(110, key); else wait(650, panel);
    })();
  }
  function panel() { phase(4); wait(1700, code); }                                // 4 · the panel, with one made-up offer
  function code() { phase(5); btn.textContent = 'Copy'; wait(1500, copied); }       // 5 · Get code was pressed
  function copied() { phase(6); btn.textContent = '✓ Copied'; wait(4200, play); } // 6 · copied; rest, then again

  function onScreen() {
    var r = demo.getBoundingClientRect();
    return r.top < window.innerHeight * 0.8 && r.bottom > window.innerHeight * 0.2;
  }
  function check() {
    reveal();
    if (!demo) return;
    var vis = onScreen() && !document.hidden;
    if (vis && !playing) { playing = true; how.classList.add('is-playing'); play(); }
    else if (!vis && playing) {      // off screen: stop, and rest on the finished picture
      playing = false; clearTimeout(timer);
      how.classList.remove('is-playing'); step(-1);
      done38(); typedCmd.textContent = '/pauzza'; btn.textContent = '✓ Copied'; phase(6);
    }
  }
  var queued = false;
  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; check(); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  document.addEventListener('visibilitychange', check);
  check();

  /* ---------- behind the headline, desktop only: falling code, drawn by a small shader ----------
     It falls for a moment on arrival, then only while you scroll, move the pointer or type. */
  var canvas = $('#rain');
  if (!canvas || window.innerWidth < 861) return;
  var gl = canvas.getContext('webgl', { antialias: false, alpha: true });
  if (!gl) return;

  var GLYPHS = '0123456789{}[]()<>=+-*/;:#&|!?%$';
  var atlas = document.createElement('canvas');
  var GW = 32, GH = 48;
  atlas.width = GW * GLYPHS.length; atlas.height = GH;
  var ctx = atlas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.font = '700 34px ' + getComputedStyle(document.body).getPropertyValue('--mono');
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (var g = 0; g < GLYPHS.length; g++) ctx.fillText(GLYPHS[g], g * GW + GW / 2, GH / 2 + 2);

  function shader(kind, src) {
    var sh = gl.createShader(kind); gl.shaderSource(sh, src); gl.compileShader(sh);
    return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
  }
  var vs = shader(gl.VERTEX_SHADER, 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}');
  var fs = shader(gl.FRAGMENT_SHADER, [
    'precision mediump float;',
    'uniform vec2 u_res, u_cell, u_ptr;',
    'uniform float u_t, u_n, u_glow;',
    'uniform vec3 u_dim, u_head;',
    'uniform sampler2D u_atlas;',
    'float h1(float x){return fract(sin(x*127.1)*43758.5453);}',
    'float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'void main(){',
    '  vec2 p = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y);',
    '  vec2 cell = floor(p / u_cell), f = fract(p / u_cell);',
    '  float rows = u_res.y / u_cell.y;',
    '  float speed = 0.5 + h1(cell.x) * 1.3;',
    '  float head = mod(u_t * speed * 5.0 + h1(cell.x + 7.0) * 60.0, rows + 18.0);',
    '  float d = head - cell.y;',
    '  float trail = d >= 0.0 ? exp(-d * 0.24) : 0.0;',
    '  float isHead = step(0.0, d) * step(d, 1.0);',
    '  float flick = floor(u_t * (0.3 + h1(cell.x + 3.0)) + h2(cell) * 9.0);',
    '  float gi = floor(h2(cell + flick) * u_n);',
    '  float a = texture2D(u_atlas, vec2((gi + f.x) / u_n, f.y)).a;',
    '  float near = smoothstep(u_glow, 0.0, distance(p, u_ptr));',
    '  float b = 0.07 + trail * 0.6 + near * 0.55;',
    '  vec3 c = mix(u_dim, u_head, clamp(isHead + near * 0.7, 0.0, 1.0));',
    '  gl_FragColor = vec4(c, 1.0) * (a * clamp(b, 0.0, 1.0));',
    '}'
  ].join('\n'));
  if (!vs || !fs) return;
  var prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  var U = function (n) { return gl.getUniformLocation(prog, n); };
  var uRes = U('u_res'), uCell = U('u_cell'), uPtr = U('u_ptr'), uT = U('u_t'), uDim = U('u_dim'), uHead = U('u_head');
  gl.uniform1f(U('u_n'), GLYPHS.length);

  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  function rgb(name) {
    var v = getComputedStyle(root).getPropertyValue(name).trim().replace('#', '');
    return [parseInt(v.slice(0, 2), 16) / 255, parseInt(v.slice(2, 4), 16) / 255, parseInt(v.slice(4, 6), 16) / 255];
  }
  function size() {
    var r = canvas.getBoundingClientRect();
    canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform2f(uCell, 17 * dpr, 26 * dpr);
    gl.uniform1f(U('u_glow'), 190 * dpr);
  }
  function colours() {
    var d = rgb('--rain-dim'), hd = rgb('--rain-head');
    gl.uniform3f(uDim, d[0], d[1], d[2]); gl.uniform3f(uHead, hd[0], hd[1], hd[2]);
  }
  size(); colours();

  var t = 0, energy = 0, target = 0, running = false, last = 0, ptr = [-9999, -9999];
  function inView() { return canvas.getBoundingClientRect().bottom > 0; }
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    energy += (target - energy) * 0.09;
    target *= 0.95;
    t += dt * energy;
    gl.uniform1f(uT, t);
    gl.uniform2f(uPtr, ptr[0], ptr[1]);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (energy > 0.004 && inView() && !document.hidden) requestAnimationFrame(frame);
    else running = false;
  }
  function wake(amount) {
    target = Math.max(target, amount);
    if (!running && inView()) { running = true; last = performance.now(); requestAnimationFrame(frame); }
  }
  window.addEventListener('resize', function () { size(); wake(0.3); });
  new MutationObserver(function () { colours(); wake(0.3); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function () { colours(); wake(0.3); });
  window.addEventListener('scroll', function () { wake(1); }, { passive: true });
  window.addEventListener('keydown', function () { wake(1); });
  window.addEventListener('pointermove', function (e) {
    var r = canvas.getBoundingClientRect();
    ptr = [(e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr];
    wake(1);
  }, { passive: true });
  canvas.classList.add('on');
  target = 1; energy = 1; wake(1);
})();
