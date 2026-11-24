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

  /* Builds the four watch buttons from config. A platform with no URL is
     simply not rendered, so the row is never a dead link. */
  function watchRow(cls) {
    var keys = ['tiktok', 'instagram', 'youtube', 'snapchat'], out = '';
    keys.forEach(function (k) {
      var u = (C.WATCH || {})[k];
      if (!u) return;
      out += '<a href="' + u + '" target="_blank" rel="noopener" data-watch="' + k + '">' +
             ICONS[k] + LABEL[k] + '</a>';
    });
    if (!out) {
      out = '<span style="font-size:12.5px;color:#6E6F62">' +
            'Add the four channel links in js/config.js and these buttons appear</span>';
    }
    return '<div class="' + (cls || 'watch') + '">' + out + '</div>';
  }
  window.TROY_WATCH = watchRow;

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

  /* ----------------------------------------------------------- newsletter */
  var form = document.getElementById('news');
  if (form) {
    var msg = document.getElementById('fmsg');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.company && form.company.value) return;            // honeypot
      var email = (form.email.value || '').trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        msg.className = 'fmsg err'; msg.textContent = 'That email does not look right.'; return;
      }
      var btn = form.querySelector('button');
      btn.disabled = true; msg.className = 'fmsg'; msg.textContent = 'One moment.';

      if (!C.API_URL) {
        btn.disabled = false; msg.className = 'fmsg err';
        msg.textContent = 'Not connected yet. Add API_URL in js/config.js.';
        return;
      }
      api('signup', {
        email: email,
        cross: form.cross && form.cross.checked ? 1 : 0,
        src: 'troy-site'
      }).then(function (r) {
        btn.disabled = false;
        /* Apps Script answers 200 even for an unknown action, and fetch
           resolves on 200, so the body has to be read before confirming.
           Without this the form congratulates people it never stored. */
        if (r && r.ok) {
          form.reset(); msg.textContent = '';
          track('Signup', '/signed-up/', { source: 'troy-site' });
          var l = document.getElementById('layer');
          if (l) l.classList.add('on');
        } else {
          msg.className = 'fmsg err';
          msg.textContent = (r && r.error) || 'That did not save. Try again in a moment.';
        }
      }).catch(function () {
        btn.disabled = false; msg.className = 'fmsg err';
        msg.textContent = 'Network trouble. Try again in a moment.';
      });
    });
  }

  var layer = document.getElementById('layer');
  if (layer) {
    layer.addEventListener('click', function (e) {
      if (e.target === layer || e.target.closest('.x') || e.target.closest('.btn')) layer.classList.remove('on');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { wire(); slots(); });
  } else { wire(); slots(); }
})();
