/* ========================================
   KEBAB STATION KUMEU — Build Your Kebab, real 3D
   Optional WebGL upgrade over the CSS bowl in
   builder.js / styles.css.

   The CSS bowl scatters flat icons/photos across a tilted plane — tilting
   a flat image just tilts the image, it never picks up real shading or
   volume, so no amount of translateZ tuning makes it read as an actual 3D
   object. This replaces it with real geometry (irregular blobs, not flat
   cards) lit by an actual light source, so it genuinely looks different
   from every angle instead of just repositioning a picture.

   Loaded the same way Motion is in main.js — dynamic import raced against
   a timeout, with a silent no-op fallback. If the CDN is slow/blocked, or
   this device has no WebGL, the CSS bowl underneath is left completely
   untouched; nothing here ever removes or depends on it being replaced.
   ======================================== */

(function () {
  'use strict';

  var stack = document.getElementById('builder-stack');
  var canvas = document.getElementById('builder-stack-canvas');
  if (!stack || !canvas || !window.WebGLRenderingContext) return;

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var threeReady = Promise.race([
    import('https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js').catch(function () {
      return null;
    }),
    new Promise(function (resolve) {
      setTimeout(function () {
        resolve(null);
      }, 4000);
    })
  ]);

  threeReady.then(function (THREE) {
    if (!THREE) return; // CDN blocked/slow/down — CSS bowl stays exactly as-is
    try {
      init(THREE);
    } catch (e) {
      // A driver/context error here shouldn't be able to take the rest of
      // the page down — same "fail quiet, keep the fallback" spirit as the
      // Motion loading path elsewhere in this codebase.
      stack.classList.remove('has-webgl');
    }
  });

  function iconSrc(option) {
    if (!option) return null;
    var img = option.querySelector('.builder__option-icon');
    return img ? img.getAttribute('src') : null;
  }

  function swatchColor(option) {
    var swatch = option.querySelector('.builder__option-swatch');
    return swatch ? swatch.style.getPropertyValue('--swatch').trim() : '#ffffff';
  }

  // Same mapping as PHOTO_FOR_ID in builder.js — kept as its own small copy
  // rather than shared state, so this optional module stays a self-
  // contained add-on that doesn't need to reach into builder.js's closure.
  var PHOTO_FOR_ID = {
    falafel: 'assets/ingredients/falafel.webp',
    falafelx: 'assets/ingredients/falafel.webp',
    cheese: 'assets/ingredients/cheese.webp',
    chicken: 'assets/ingredients/chicken.webp',
    lamb: 'assets/ingredients/lamb.webp',
    tomato: 'assets/ingredients/tomato.webp',
    parsley: 'assets/ingredients/parsley.webp',
    mixedcabbage: 'assets/ingredients/mixedcabbage.webp'
  };
  var MIXED_PHOTOS = ['assets/ingredients/chicken.webp', 'assets/ingredients/lamb.webp'];

  function init(THREE) {
    var renderer = new THREE.WebGLRenderer({
      canvas: canvas, alpha: true, antialias: true,
      // Without this, screenshot/capture tools (and some compositor paths)
      // can read the canvas between frames after WebGL has already cleared
      // its drawing buffer, showing nothing rendered even though every
      // frame draws correctly — a known WebGL/screenshot interaction, not
      // specific to this scene.
      preserveDrawingBuffer: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    var scene = new THREE.Scene();

    var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 20);
    camera.position.set(0, 2.5, 2.85);
    camera.lookAt(0, 0.15, 0);

    scene.add(new THREE.AmbientLight(0xfff2e0, 0.65));
    var keyLight = new THREE.DirectionalLight(0xffe6c2, 1.15);
    keyLight.position.set(1.6, 3, 1.8);
    scene.add(keyLight);
    var fillLight = new THREE.DirectionalLight(0x8fb0ff, 0.28);
    fillLight.position.set(-2, 1.2, -1.4);
    scene.add(fillLight);

    // Food group is what actually gets tilted/rotated for the look-around
    // interaction below — the plate/lights/camera stay put.
    var foodGroup = new THREE.Group();
    scene.add(foodGroup);

    var plateGeo = new THREE.CylinderGeometry(1.55, 1.4, 0.12, 48, 1, false);
    var plateMat = new THREE.MeshStandardMaterial({ color: 0x241811, roughness: 0.75, metalness: 0.05 });
    var plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.y = -0.06;
    foodGroup.add(plate);

    var plateRimGeo = new THREE.TorusGeometry(1.47, 0.045, 12, 48);
    var plateRim = new THREE.Mesh(plateRimGeo, new THREE.MeshStandardMaterial({
      color: 0x3a2717, roughness: 0.6, metalness: 0.1
    }));
    plateRim.rotation.x = Math.PI / 2;
    plateRim.position.y = 0.0;
    foodGroup.add(plateRim);

    var textureLoader = new THREE.TextureLoader();
    var textureCache = {};
    function getTexture(src) {
      if (!textureCache[src]) {
        var tex = textureLoader.load(src);
        tex.colorSpace = THREE.SRGBColorSpace;
        textureCache[src] = tex;
      }
      return textureCache[src];
    }

    var chunkGeo = new THREE.IcosahedronGeometry(0.5, 1);

    function makeChunkMesh(opts) {
      var mat;
      if (opts.src) {
        mat = new THREE.MeshStandardMaterial({
          map: getTexture(opts.src),
          roughness: 0.88,
          metalness: 0.02,
          transparent: true
        });
      } else {
        mat = new THREE.MeshStandardMaterial({
          color: opts.color || 0xcccccc,
          roughness: 0.7,
          metalness: 0.05,
          transparent: true
        });
      }
      var mesh = new THREE.Mesh(chunkGeo, mat);
      mesh.scale.set(
        opts.radius * (opts.squashX || 1),
        opts.radius * (opts.squashY || 0.62),
        opts.radius * (opts.squashZ || 1)
      );
      mesh.position.set(opts.x, opts.y, opts.z);
      mesh.rotation.y = opts.rotY || 0;
      mesh.rotation.z = opts.rotZ || 0;
      foodGroup.add(mesh);
      return mesh;
    }

    // ── Tween-in/out (no animation library needed for two scalar props) ──
    var tweens = [];
    function tweenIn(mesh, targetScale) {
      mesh.userData.baseScale = targetScale.slice();
      mesh.scale.set(0.001, 0.001, 0.001);
      mesh.position.y += 0.55;
      var startY = mesh.position.y;
      var endY = startY - 0.55;
      var start = null;
      var duration = prefersReducedMotion ? 1 : 480;
      tweens.push(function (now) {
        if (start === null) start = now;
        var t = Math.min((now - start) / duration, 1);
        var eo = 1 - Math.pow(1 - t, 3);
        mesh.scale.set(
          targetScale[0] * eo, targetScale[1] * eo, targetScale[2] * eo
        );
        mesh.position.y = startY + (endY - startY) * eo;
        return t < 1;
      });
    }
    function tweenOutAndRemove(mesh) {
      var start = null;
      var duration = prefersReducedMotion ? 1 : 260;
      var s0 = mesh.scale.toArray();
      tweens.push(function (now) {
        if (start === null) start = now;
        var t = Math.min((now - start) / duration, 1);
        var k = 1 - t;
        mesh.scale.set(s0[0] * k, s0[1] * k, s0[2] * k);
        if (t >= 1) {
          foodGroup.remove(mesh);
          mesh.material.dispose();
        }
        return t < 1;
      });
    }

    // ── Placement tables — same intent as the CSS bowl's *_SPOTS, in
    // world units instead of percentages. y is real elevation now (base
    // lowest, sauce highest), not a fake translateZ. ──
    function ring(count, radius, y, size) {
      var pts = [];
      for (var i = 0; i < count; i++) {
        var a = (i / count) * Math.PI * 2 + 0.4;
        pts.push({
          x: Math.cos(a) * radius * (0.5 + Math.random() * 0.5),
          z: Math.sin(a) * radius * (0.5 + Math.random() * 0.5),
          y: y, size: size, rotY: Math.random() * Math.PI
        });
      }
      return pts;
    }
    var BASE_SPOTS = ring(11, 1.05, 0.05, 0.36);
    var MEAT_SPOTS = [
      { x: 0.05, z: 0.1, y: 0.16, size: 0.44, rotY: 0.4 },
      { x: -0.32, z: -0.05, y: 0.16, size: 0.4, rotY: 1.1 },
      { x: 0.3, z: -0.15, y: 0.17, size: 0.4, rotY: 2.0 },
      { x: -0.1, z: -0.35, y: 0.16, size: 0.38, rotY: 2.7 },
      { x: 0.2, z: 0.32, y: 0.17, size: 0.38, rotY: 0.9 }
    ];
    var SALAD_ANGLES = { onion: 250, parsley: 322, tomato: 34, mixedcabbage: 106, lettuce: 178 };
    var EXTRA_SPOTS = [
      { x: 0.15, z: 0.55, y: 0.24, size: 0.3, rotY: 0.5 },
      { x: -0.2, z: 0.5, y: 0.25, size: 0.28, rotY: 1.6 },
      { x: 0.35, z: 0.45, y: 0.24, size: 0.26, rotY: 2.4 }
    ];

    function saladSpots(id) {
      var angle = SALAD_ANGLES[id];
      if (angle === undefined) return [{ x: 0, z: 0, y: 0.22, size: 0.3, rotY: 0 }];
      var rad = (angle * Math.PI) / 180;
      var cx = Math.cos(rad) * 1.12;
      var cz = Math.sin(rad) * 1.12;
      return [
        { x: cx - 0.12, z: cz - 0.08, y: 0.22, size: 0.3, rotY: 0.3 },
        { x: cx + 0.13, z: cz + 0.1, y: 0.23, size: 0.27, rotY: 1.8 }
      ];
    }

    function sauceTrail(band) {
      var y = 0.3 + band * 0.045;
      var pts = [];
      var count = 8;
      for (var i = 0; i < count; i++) {
        var t = i / (count - 1);
        var ang = -0.9 + t * 1.8;
        pts.push({
          x: Math.sin(ang) * 1.15,
          z: -0.95 + t * 0.35 + (i % 2 === 0 ? -0.05 : 0.05),
          y: y, size: 0.055
        });
      }
      return pts;
    }

    var sauceBandOf = {};
    function bandForSauce(id) {
      if (sauceBandOf[id] !== undefined) return sauceBandOf[id];
      var used = {};
      Object.keys(sauceBandOf).forEach(function (k) { used[sauceBandOf[k]] = true; });
      for (var b = 0; b < 3; b++) {
        if (!used[b]) { sauceBandOf[id] = b; return b; }
      }
      sauceBandOf[id] = 0;
      return 0;
    }

    var meshGroups = {}; // "prefix:id" -> mesh[]

    function clearGroup(key) {
      var meshes = meshGroups[key];
      if (!meshes) return;
      meshes.forEach(tweenOutAndRemove);
      delete meshGroups[key];
    }

    function syncCategory(prefix, activeOptions, buildFn, onRemove) {
      var activeIds = {};
      activeOptions.forEach(function (o) { activeIds[o.dataset.id] = true; });
      Object.keys(meshGroups).forEach(function (key) {
        if (key.indexOf(prefix + ':') !== 0) return;
        var id = key.slice(prefix.length + 1);
        if (!activeIds[id]) {
          clearGroup(key);
          if (onRemove) onRemove(id);
        }
      });
      activeOptions.forEach(function (option) {
        var key = prefix + ':' + option.dataset.id;
        if (meshGroups[key]) return;
        meshGroups[key] = buildFn(option);
      });
    }

    function chunksForSpots(spots, photoSrc, color) {
      return spots.map(function (spot) {
        var mesh = makeChunkMesh({
          src: photoSrc, color: color,
          radius: spot.size, x: spot.x, y: spot.y, z: spot.z, rotY: spot.rotY
        });
        var target = mesh.scale.toArray();
        tweenIn(mesh, target);
        return mesh;
      });
    }

    function colorForOption(option) {
      var c1 = option.dataset.c1;
      return c1 ? parseInt(c1.replace('#', ''), 16) : 0xd9a45c;
    }

    function sync() {
      var state = window.__builderState;
      if (!state) return;

      syncCategory('base', state.base ? [state.base] : [], function (option) {
        var photo = PHOTO_FOR_ID[option.dataset.id];
        return chunksForSpots(BASE_SPOTS, photo || null, photo ? undefined : colorForOption(option));
      });

      syncCategory('meat', state.meat ? [state.meat] : [], function (option) {
        var id = option.dataset.id;
        if (id === 'mixed') {
          return MEAT_SPOTS.map(function (spot, i) {
            var mesh = makeChunkMesh({
              src: MIXED_PHOTOS[i % 2], radius: spot.size, x: spot.x, y: spot.y, z: spot.z, rotY: spot.rotY
            });
            tweenIn(mesh, mesh.scale.toArray());
            return mesh;
          });
        }
        var photo = PHOTO_FOR_ID[id];
        return chunksForSpots(MEAT_SPOTS, photo || null, photo ? undefined : colorForOption(option));
      });

      syncCategory('salads', state.salads, function (option) {
        var photo = PHOTO_FOR_ID[option.dataset.id];
        return chunksForSpots(saladSpots(option.dataset.id), photo || null, photo ? undefined : 0x5a8f3a);
      });

      syncCategory('extras', state.extras, function (option) {
        var photo = PHOTO_FOR_ID[option.dataset.id];
        return chunksForSpots(EXTRA_SPOTS, photo || null, photo ? undefined : colorForOption(option));
      });

      syncCategory('sauces', state.sauces, function (option) {
        var band = bandForSauce(option.dataset.id);
        var color = new THREE.Color(swatchColor(option));
        return chunksForSpots(sauceTrail(band), null, color.getHex());
      }, function (id) {
        delete sauceBandOf[id];
      });
    }

    stack.addEventListener('builder:sync', sync);
    sync(); // pick up whatever was already active before this module loaded

    // ── Look around the plate ──
    // Same mouse-only, hover-driven language as the rest of the site's
    // card tilt/spotlight — a touch "hover" would just pin it wherever the
    // tap landed. Reduced motion gets a fixed, still genuinely-3D angle
    // with no interaction, same as the CSS bowl's own fallback.
    var targetRotX = 0, targetRotZ = 0, curRotX = 0, curRotZ = 0;
    if (!prefersReducedMotion) {
      stack.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        var rect = stack.getBoundingClientRect();
        var xFrac = (e.clientX - rect.left) / rect.width;
        var yFrac = (e.clientY - rect.top) / rect.height;
        targetRotZ = (xFrac - 0.5) * 0.5;
        targetRotX = (yFrac - 0.5) * -0.35;
      });
      stack.addEventListener('pointerleave', function () {
        targetRotX = 0;
        targetRotZ = 0;
      });
    }

    function resize() {
      var w = stack.clientWidth, h = stack.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    if ('ResizeObserver' in window) {
      new ResizeObserver(resize).observe(stack);
    } else {
      window.addEventListener('resize', resize);
    }

    // Only render while the preview is actually on screen — a hidden
    // canvas still costs a full render pass every frame otherwise.
    var isVisible = false;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        isVisible = entries[0].isIntersecting;
      }).observe(stack);
    } else {
      isVisible = true;
    }

    var rafId = null;
    function frame(now) {
      rafId = requestAnimationFrame(frame);
      if (!isVisible) return;

      tweens = tweens.filter(function (fn) { return fn(now); });

      curRotX += (targetRotX - curRotX) * 0.12;
      curRotZ += (targetRotZ - curRotZ) * 0.12;
      foodGroup.rotation.x = curRotX;
      foodGroup.rotation.z = curRotZ;
      if (!prefersReducedMotion) {
        foodGroup.rotation.y += 0.0018;
      }

      renderer.render(scene, camera);
    }
    rafId = requestAnimationFrame(frame);

    stack.classList.add('has-webgl');
  }
})();
