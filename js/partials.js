/* The Risk of You: nav, footer, tracking and the newsletter.
   Nothing in here needs editing. Everything it reads comes from config.js. */
(function () {
  'use strict';
  var C = window.TROY_CONFIG || {};
  var B = window.TROY_BASE || '';

  /* ---------------------------------------------------------------- api
     The POST deliberately sends no Content-Type header. The browser then
     uses text/plain, which is CORS safelisted, so there is no preflight.
     Apps Script cannot answer a preflight, so adding a JSON content type
     here works locally and fails the moment it is deployed. Leave it. */
  function api(action, data) {
    if (!C.API_URL) return Promise.reject(new Error('no api'));
    return fetch(C.API_URL, {
      method: 'POST',
      body: JSON.stringify(Object.assign({ action: action }, data || {}))
    }).then(function (r) { return r.json(); });
  }
  window.TROY_API = api;

  /* ------------------------------------------------------------- tracking
     Each conversion gets its own URL to land on, pushed and then replaced so
     the visitor never sees it, plus a dataLayer event for GTM triggers.
     The three sends are independently guarded: history.pushState throws in
     some in-app browsers, and TikTok's is exactly where this traffic lands.
     One shared try block would take the dataLayer push down with it. */
  var FB = {
    Signup: 'Lead', WatchClick: 'ViewContent', EpisodeOpen: 'ViewContent',
    CrossToLR: 'ViewContent', RecapOpen: 'ViewContent', TrailerPlay: 'ViewContent'
  };

  function track(name, path, params) {
    if (path) {
      try {
        var back = location.pathname + location.search;
        history.pushState({ troy: name }, '', path);
        if (window.gtag) gtag('event', 'page_view', { page_path: path });
        history.replaceState({}, '', back);
      } catch (e) {
        if (window.gtag) { try { gtag('event', 'page_view', { page_path: path }); } catch (e2) {} }
      }
    }
    try {
      (window.dataLayer = window.dataLayer || []).push(
        Object.assign({ event: 'troy_' + name, troy_path: path || '' }, params || {}));
    } catch (e) {}
    try {
      if (C.PIXEL_FROM_PAGE && window.fbq && FB[name]) fbq('track', FB[name], params || {});
    } catch (e) {}
  }
  window.TROY_TRACK = track;

  /* ------------------------------------------------------------ platforms */
  var ICONS = {
    tiktok:    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 1 1-1.84-2.48V9.77a5.68 5.68 0 1 0 4.93 5.63V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.28 4.28 0 0 1-3.24-1.48z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="3.8"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none"/></svg>',
    youtube:   '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.25 5 12 5 12 5s-6.25 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.77C5.75 19 12 19 12 19s6.25 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15V9l5.2 3z"/></svg>',
    snapchat:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.2c2.6 0 4.5 2 4.6 4.6 0 .7 0 1.5-.1 2.2.3.1.6.1.9 0 .5-.2 1.1.1 1.2.6.1.4-.1.8-.6 1-.4.2-1.3.5-1.5.9-.1.3.1.7.4 1.2.6 1 1.6 2 2.8 2.4.4.1.6.5.5.9-.2.6-1.2.9-2.2 1.1-.3 0-.4.3-.5.6l-.1.5c-.1.3-.3.5-.7.4-.5-.1-1.1-.2-1.8-.1-.7.1-1.3.5-1.9.9-.6.4-1.2.8-2 .8s-1.4-.4-2-.8c-.6-.4-1.2-.8-1.9-.9-.7-.1-1.3 0-1.8.1-.4.1-.6-.1-.7-.4l-.1-.5c-.1-.3-.2-.6-.5-.6-1-.2-2-.5-2.2-1.1-.1-.4.1-.8.5-.9 1.2-.4 2.2-1.4 2.8-2.4.3-.5.5-.9.4-1.2-.2-.4-1.1-.7-1.5-.9-.5-.2-.7-.6-.6-1 .1-.5.7-.8 1.2-.6.3.1.6.1.9 0-.1-.7-.1-1.5-.1-2.2C7.5 4.2 9.4 2.2 12 2.2z"/></svg>',
    x:         '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 3h3.2l-7 8 8.2 10h-6.4l-5-6.1L4.7 21H1.5l7.5-8.6L1.2 3h6.6l4.5 5.6zm-1.1 16.1h1.8L7.7 4.8H5.8z"/></svg>'
  };
  var LABEL = { tiktok: 'TikTok', instagram: 'Reels', youtube: 'Shorts', snapchat: 'Snapchat', x: 'X' };
  window.TROY_ICONS = ICONS;
  window.TROY_LABEL = LABEL;

  /* Where to watch says Reels and Shorts, because that is what the thing is
     called on that platform. Follow says Instagram and YouTube, because that
     is what you are following. Same links, same config, different words. */
  var BRAND = { tiktok: 'TikTok', instagram: 'Instagram', youtube: 'YouTube', snapchat: 'Snapchat' };

  /* Builds the four buttons from WATCH in config. A platform with no URL is
     simply not rendered, so the row is never a dead link. */
  function watchRow(cls, brand) {
    var keys = ['tiktok', 'instagram', 'youtube', 'snapchat'], out = '';
    keys.forEach(function (k) {
      var u = (C.WATCH || {})[k];
      if (!u) return;
      out += '<a href="' + u + '" target="_blank" rel="noopener" data-watch="' + k + '">' +
             ICONS[k] + (brand ? BRAND[k] : LABEL[k]) + '</a>';
    });
    /* No links set means nothing is drawn. This used to print a note telling
       whoever was building it to fill in config, which was fine while the
       site was private and is a leak now that it is public. The reminder
       lives in the config comments and the console instead. */
    if (!out) {
      if (window.console && console.info) {
        console.info('TRoY: no channel links in WATCH, so the follow buttons are hidden.');
      }
      return '';
    }
    return '<div class="' + (cls || 'watch') + '">' + out + '</div>';
  }
  window.TROY_WATCH = watchRow;

  /* Config is written by hand, so anything from it that lands in innerHTML
     gets escaped. partials.js had no escaper of its own until now. */
  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* The press pull quote. Shows only when there is a real quote AND a real
     source in config, because a quote with no attribution is worthless and
     an attribution with no link is worse. The link is optional in code but
     the config comment asks for it; without one the source is plain text. */
  var pz = document.getElementById('press');
  if (pz) {
    var P = C.PRESS || {};
    var qt = String(P.text || '').trim(), sc = String(P.source || '').trim();
    if (qt && sc) {
      var who = P.url
        ? '<a href="' + esc(P.url) + '" target="_blank" rel="noopener">' + esc(sc) + '</a>'
        : esc(sc);
      pz.innerHTML =
        '<blockquote>&ldquo;' + esc(qt) + '&rdquo;</blockquote>' +
        '<figcaption>' + who +
          (String(P.rating || '').trim()
            ? '<span class="rt">' + esc(String(P.rating).trim()) + '</span>' : '') +
        '</figcaption>';
      pz.classList.remove('hidden');
    }
  }

  /* The Follow the series row in the story section. The whole block goes,
     label and divider included, rather than leaving a heading over nothing. */
  var fol = document.getElementById('follow');
  if (fol) {
    var row = watchRow('watch', true);
    if (row) fol.innerHTML = row;
    else {
      var blk = fol.closest ? fol.closest('.follow') : null;
      if (blk) blk.classList.add('hidden'); else fol.classList.add('hidden');
    }
  }

  /* ----------------------------------------------------------------- nav */
  var nav = document.getElementById('nav');
  if (nav) {
    nav.innerHTML =
      '<div class="wrap">' +
        '<a class="brand" href="' + B + 'index.html"><img src="' + (C.LOGO || '') + '" alt="The Risk of You"></a>' +
        '<nav class="lk">' +
          '<a href="' + B + 'episodes/index.html">Episodes</a>' +
          '<a href="' + B + 'index.html#story">The story</a>' +
          '<a href="' + B + 'index.html#cast">Cast</a>' +
          '<a href="' + B + 'index.html#event">The event</a>' +
        '</nav>' +
        '<a class="btn lime sm lr-link" href="#">Love Racket</a>' +
      '</div>';
  }

  /* -------------------------------------------------------------- footer */
  var foot = document.getElementById('foot');
  if (foot) {
    var soc = '';
    ['instagram', 'tiktok', 'x'].forEach(function (k) {
      var u = (C.SOCIAL || {})[k];
      if (u) soc += '<a href="' + u + '" target="_blank" rel="noopener" aria-label="' + k + '">' + ICONS[k] + '</a>';
    });
    var mail = (C.SERIES || {}).email || '';
    foot.innerHTML =
      '<div class="wrap">' +
        '<div class="row">' +
          '<img class="fl" src="' + (C.LOGO || '') + '" alt="The Risk of You">' +
          '<div class="ln">' +
            '<a href="' + B + 'episodes/index.html">Episodes</a>' +
            '<a class="lr-link" href="#">Love Racket</a>' +
            '<a href="' + B + 'privacy/index.html">Privacy</a>' +
            (mail ? '<a href="mailto:' + mail + '">' + mail + '</a>' : '') +
          '</div>' +
          (soc ? '<div class="soc">' + soc + '</div>' : '') +
        '</div>' +
        '<p class="cp">A Boxonia Blueprint series, in collaboration with Ramsey Nouah Production. ' +
        '&copy; ' + new Date().getFullYear() + '</p>' +
      '</div>';
  }

  /* --------------------------------------------- links that come from config */
  function wire() {
    [].forEach.call(document.querySelectorAll('.lr-link'), function (a) {
      a.href = C.LR_URL || '#';
      if (C.LR_URL) { a.target = '_blank'; a.rel = 'noopener'; }
      a.addEventListener('click', function () { track('CrossToLR', '/out/loveracket'); });
    });
    /* Love Racket's game, deep linked so the visitor lands on it rather than
       on their homepage having to find it. Falls back to the homepage if no
       play URL is set, and hides itself if neither is. */
    [].forEach.call(document.querySelectorAll('.lr-play'), function (a) {
      var u = C.LR_PLAY_URL || C.LR_URL || '';
      if (!u) { a.classList.add('hidden'); return; }
      a.href = u; a.target = '_blank'; a.rel = 'noopener';
      a.addEventListener('click', function () { track('CrossToLRGame', '/out/loveracket/play'); });
    });

    /* The Follow buttons on the two lead sections. No URL in config means no
       button, so an unannounced account never ships as a dead link. */
    [].forEach.call(document.querySelectorAll('[data-follow]'), function (a) {
      var who = a.getAttribute('data-follow');
      var u = ((C.CAST || {})[who] || {}).instagram || '';
      if (!u) { a.classList.add('hidden'); return; }
      a.href = u; a.target = '_blank'; a.rel = 'noopener';
      a.addEventListener('click', function () {
        track('FollowClick', '/out/instagram/' + who, { who: who });
      });
    });

    [].forEach.call(document.querySelectorAll('[data-watch]'), function (a) {
      if (a.getAttribute('data-ep')) return;   /* episode links bind in episodes.js */
      a.addEventListener('click', function () {
        var p = a.getAttribute('data-watch');
        track('WatchClick', '/watch/' + p, { platform: p });
      });
    });
    var rc = document.querySelector('.recap');
    if (rc) rc.addEventListener('toggle', function () { if (rc.open) track('RecapOpen', '/recap/'); });

    /* the partner block only exists when you switch it on */
    var pt = document.getElementById('partners');
    if (pt) pt.classList.toggle('hidden', !C.SHOW_PARTNERS);
    var pb = document.getElementById('partnerBtn');
    if (pb) {
      var pe = C.PARTNER_EMAIL || (C.SERIES || {}).email || '';
      pb.href = pe ? 'mailto:' + pe + '?subject=' + encodeURIComponent('Partnering on The Risk of You') : '#';
    }
  }

  /* ------------------------------------------------------- image slots
     An image can finish failing before DOMContentLoaded, in which case an
     error listener added later never fires. So check .complete as well. */
  function slots(root) {
    [].forEach.call((root || document).querySelectorAll('[data-slot]'), function (el) {
      var img = el.querySelector('img');
      if (!img) { el.classList.add('empty'); return; }
      var drop = function () { el.classList.add('empty'); };
      var ok = function () { el.classList.remove('empty'); };
      if (img.complete) { (img.naturalWidth ? ok : drop)(); }
      img.addEventListener('error', drop);
      img.addEventListener('load', ok);
    });
  }
  window.TROY_SLOTS = slots;

  /* The dashed box with a file path in it tells the builder which image is
     missing. On the live site it told visitors the same thing. It now shows
     only when the page is opened from a file, on localhost, or with ?slots
     in the address; everywhere else an empty slot is just a quiet tile. */
  try {
    if (location.protocol === 'file:' || /^(localhost|127\.)/.test(location.hostname) ||
        /[?&]slots\b/.test(location.search)) {
      document.documentElement.classList.add('dev');
    }
  } catch (e) {}

  /* Five blank squares is not a cast section. Until at least one supporting
     portrait exists, the grid collapses to names and roles. */
  function castGrid() {
    var g = document.querySelector('.supp');
    if (!g) return;
    var any = g.querySelector('.ph:not(.empty)');
    g.classList.toggle('noimg', !any);
  }
  window.addEventListener('load', function () { setTimeout(castGrid, 60); });

  /* ----------------------------------------------------------- newsletter */
  /* One signup handler, used by the form in the page and by the slide up
     bar. They post the same thing and fail the same way, so they should not
     be two copies that drift. `src` is what lands in the Source column. */
  function wireSignup(form, msg, src) {
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.company && form.company.value) return;            // honeypot
      var email = (form.email.value || '').trim();
      var say = function (t, bad) {
        if (!msg) return;
        msg.className = bad ? 'fmsg err' : 'fmsg';
        msg.textContent = t;
      };
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { say('That email does not look right.', true); return; }

      var btn = form.querySelector('button[type="submit"], button');
      if (btn) btn.disabled = true;
      say('One moment.');

      if (!C.API_URL) {
        if (btn) btn.disabled = false;
        say('Not connected yet. Add API_URL in js/config.js.', true);
        return;
      }
      api('signup', {
        email: email,
        cross: form.cross && form.cross.checked ? 1 : 0,
        src: src
      }).then(function (r) {
        if (btn) btn.disabled = false;
        /* Apps Script answers 200 even for an unknown action, and fetch
           resolves on 200, so the body has to be read before confirming.
           Without this the form congratulates people it never stored. */
        if (r && r.ok) {
          form.reset(); say('');
          track('Signup', '/signed-up/', { source: src });
          try { localStorage.setItem('troy_signed', '1'); } catch (err) {}
          hidePop();
          var l = document.getElementById('layer');
          if (l) l.classList.add('on');
        } else {
          say((r && r.error) || 'That did not save. Try again in a moment.', true);
        }
      }).catch(function () {
        if (btn) btn.disabled = false;
        say('Network trouble. Try again in a moment.', true);
      });
    });
  }

  wireSignup(document.getElementById('news'), document.getElementById('fmsg'), 'troy-site');

  /* ------------------------------------------------- the slide up bar
     A bar, not a modal over the middle of the screen. It never covers what
     someone is reading, and it only appears once somebody has shown they
     are actually reading: 45% down the page, or 25 seconds in.

     It stays away if they have already signed up, already dismissed it, or
     are looking at the newsletter section itself, because competing with
     your own form is the one thing worse than not asking. Every storage
     call is wrapped, since it throws in a private window. */
  var pop = null, popShown = false;

  function flag(k) { try { return localStorage.getItem(k) === '1'; } catch (e) { return false; } }
  function setFlag(k) { try { localStorage.setItem(k, '1'); } catch (e) {} }

  function hidePop() { if (pop) pop.classList.remove('on'); }

  function buildPop() {
    if (!C.API_URL) return null;                     // nothing to post to
    if (flag('troy_signed') || flag('troy_pop_off')) return null;

    var el = document.createElement('div');
    el.className = 'pop';
    el.id = 'pop';
    el.innerHTML =
      '<button class="x" type="button" aria-label="Close">&times;</button>' +
      '<div class="tx"><b>Don\'t miss one</b><span>One email the moment a new episode drops.</span></div>' +
      '<form id="popForm" novalidate>' +
        '<input type="text" name="company" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">' +
        '<label for="popEmail" class="sr">Email</label>' +
        '<input type="email" id="popEmail" name="email" placeholder="Your email" autocomplete="email" inputmode="email">' +
        '<button class="btn lime" type="submit">Keep me posted</button>' +
      '</form>' +
      '<p class="fmsg" id="popMsg"></p>';
    document.body.appendChild(el);

    el.querySelector('.x').addEventListener('click', function () {
      hidePop(); setFlag('troy_pop_off');
      track('PopDismiss', '/popup/dismissed');
    });
    wireSignup(el.querySelector('#popForm'), el.querySelector('#popMsg'), 'troy-popup');
    return el;
  }

  function newsletterOnScreen() {
    var n = document.querySelector('.news');
    if (!n) return false;
    var r = n.getBoundingClientRect();
    return r.top < window.innerHeight && r.bottom > 0;
  }

  function showPop() {
    if (popShown || !pop || newsletterOnScreen()) return;
    popShown = true;
    pop.classList.add('on');
    track('PopShow', '/popup/shown');
  }

  function startPop() {
    pop = buildPop();
    if (!pop) return;
    var depth = function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      if (h > 0 && (window.scrollY / h) > 0.45) { showPop(); window.removeEventListener('scroll', depth); }
    };
    window.addEventListener('scroll', depth, { passive: true });
    setTimeout(showPop, 25000);
    /* If they reach the real form, get out of its way for good. */
    window.addEventListener('scroll', function () {
      if (popShown && newsletterOnScreen()) hidePop();
    }, { passive: true });
  }

  var layer = document.getElementById('layer');
  if (layer) {
    layer.addEventListener('click', function (e) {
      if (e.target === layer || e.target.closest('.x') || e.target.closest('.btn')) layer.classList.remove('on');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { wire(); slots(); startPop(); });
  } else { wire(); slots(); startPop(); }

  /* ------------------------------------------------------------ gallery
     Tapping a photo opens it full screen. Tap anywhere, or press Escape,
     to close. Left and right move through the set. */
  (function () {
    var rail = document.getElementById('grail');
    if (!rail) return;
    var tiles = [].slice.call(rail.querySelectorAll('.gt')), at = 0, box = null;
    function show(i) {
      at = (i + tiles.length) % tiles.length;
      box.querySelector('img').src = tiles[at].getAttribute('href');
    }
    function close() { if (box) { box.remove(); box = null; document.documentElement.style.overflow = ''; } }
    function open(i) {
      box = document.createElement('div');
      box.className = 'lbox';
      box.innerHTML = '<button class="lb-p" type="button" aria-label="Previous"></button><img alt="">' +
                      '<button class="lb-n" type="button" aria-label="Next"></button>';
      document.body.appendChild(box);
      document.documentElement.style.overflow = 'hidden';
      box.addEventListener('click', function (e) {
        if (e.target.className === 'lb-p') return show(at - 1);
        if (e.target.className === 'lb-n') return show(at + 1);
        close();
      });
      show(i);
      track('GalleryOpen', '', { photo: i + 1 });
    }
    tiles.forEach(function (t, i) {
      t.addEventListener('click', function (e) { e.preventDefault(); open(i); });
    });
    document.addEventListener('keydown', function (e) {
      if (!box) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(at - 1);
      if (e.key === 'ArrowRight') show(at + 1);
    });
  })();
})();
