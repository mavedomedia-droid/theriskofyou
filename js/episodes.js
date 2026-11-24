/* The Risk of You: the episode rail, the archive grid and the view counter.
   Everything here is fed by the Episodes tab through the Apps Script web app,
   so publishing an episode is a row in a sheet and never a redeploy. */
(function () {
  'use strict';
  var C = window.TROY_CONFIG || {};
  var B = window.TROY_BASE || '';
  var api = window.TROY_API, track = window.TROY_TRACK;
  var ICONS = window.TROY_ICONS || {}, LABEL = window.TROY_LABEL || {};

  /* The selected tab decides the starting order, rather than a default here.
     The homepage opens on Latest and the archive opens From the beginning, so
     a hardcoded value made one of the two render against its own tab. */
  function startOrder() {
    var sel = document.querySelector('.tabs button[aria-selected="true"]');
    return (sel && sel.getAttribute('data-order')) || 'latest';
  }

  var state = { eps: [], views: 0, cfg: {}, feed: [], order: startOrder(),
                shown: C.PER_PAGE || 12, loaded: false };

  /* --------------------------------------------------------- seen episodes
     Per viewer, per browser, and nothing here is load bearing: if storage is
     blocked or throws, the page simply does not dim anything. */
  function seen() {
    try { return JSON.parse(localStorage.getItem('troy_seen') || '[]'); } catch (e) { return []; }
  }
  function markSeen(n) {
    try {
      var s = seen();
      if (s.indexOf(n) < 0) { s.push(n); localStorage.setItem('troy_seen', JSON.stringify(s.slice(-120))); }
    } catch (e) {}
  }

  function nfmt(v) {
    v = Number(v) || 0;
    if (v >= 1e6) return (v / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
    if (v >= 1e3) return (v / 1e3).toFixed(v >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'K';
    return String(v);
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* --------------------------------------------------------------- a card */
  /* An episode is live the moment its link is in the sheet. Until the pull
     fills in the cover and title it renders as a waiting card that already
     opens the post, so pasting the link is genuinely the whole job. */
  var PLATS = ['instagram', 'tiktok', 'youtube', 'snapchat'];

  /* The row of "watch on" icons. Built from the episode's own columns in the
     sheet, never from the channel links in config: a channel link would land
     on a profile page instead of the episode, which is not what the icon
     promises. A platform with an empty cell is simply not drawn. */
  function platRow(ep, cls) {
    var links = ep.links || {}, num = ('0' + ep.n).slice(-2), out = '';
    PLATS.forEach(function (k) {
      var u = links[k];
      if (!u) return;
      out += '<a href="' + esc(u) + '" target="_blank" rel="noopener"' +
             ' data-watch="' + k + '" data-ep="' + ep.n + '"' +
             ' title="Watch episode ' + num + ' on ' + esc(LABEL[k] || k) + '"' +
             ' aria-label="Watch episode ' + num + ' on ' + esc(LABEL[k] || k) + '">' +
             (ICONS[k] || '') + '</a>';
    });
    return out ? '<div class="' + (cls || 'plats') + '">' + out + '</div>' : '';
  }

  /* An episode is live the moment its link is in the sheet. The cover and the
     title arrive with the pull, so a card can be on screen and tappable
     before either exists.

     The card is an <article>, not an <a>: the platform icons are links of
     their own, and an anchor inside an anchor is invalid HTML that browsers
     silently tear apart. So the cover and title share one link, and the icons
     sit beside it. */
  function card(ep) {
    var s = seen().indexOf(ep.n) > -1;
    var num = ('0' + ep.n).slice(-2);
    if (!ep.live) {
      return '<article class="epc soon"><div class="cv"><span>Episode ' + num + '</span></div>' +
             '<div class="ti">Not out yet</div></article>';
    }
    var href = ep.link || '#';
    var cover = ep.cover
      ? '<img src="' + esc(ep.cover) + '" alt="Episode ' + num + '" loading="lazy">'
      : '';
    /* No view count here on purpose. Apify reads the Instagram post and
       nothing else, so a number on the card would be one platform's partial
       count standing in for the whole episode, and it goes stale between
       pulls. The Views column still feeds the Totals tab if you ever want
       the hero counter, which is its own switch in config. */
    var meta = ep.pending && !ep.title ? '<div class="mt">Details coming</div>' : '';
    return '<article class="epc' + (s ? ' seen' : '') + (ep.pending ? ' wait' : '') + '">' +
      '<a class="hit" href="' + esc(href) + '" target="_blank" rel="noopener" data-ep="' + ep.n + '">' +
        '<div class="cv">' +
          '<span class="n">EP ' + num + '</span>' + cover +
          (ep.pending && !ep.cover ? '<span class="ld">Out now</span>' : '') +
        '</div>' +
        '<div class="ti">' + esc(ep.title || ('Episode ' + num)) + '</div>' +
        meta +
      '</a>' +
      platRow(ep) +
    '</article>';
  }

  function bindCards(root) {
    [].forEach.call(root.querySelectorAll('[data-ep]'), function (a) {
      a.addEventListener('click', function () {
        var n = Number(a.getAttribute('data-ep'));
        var p = a.getAttribute('data-watch');
        markSeen(n);
        if (p) track('WatchClick', '/watch/' + p, { platform: p, episode: n });
        else track('EpisodeOpen', '/episode/' + ('0' + n).slice(-2) + '/', { episode: n });
      });
    });
    if (window.TROY_SLOTS) window.TROY_SLOTS(root);
  }


  /* ------------------------------------------------- the trailer week
     Between the trailer dropping and the first episode there is nothing
     to put in an episode rail, and that is exactly the week the PR boxes
     and the trailer itself push people here. So while no episode is live
     and the Settings tab holds a trailer link, the hero leads with the
     trailer and a countdown instead. The moment the first episode link
     lands in the sheet this disappears on its own. */
  function ytId(u) {
    var m = String(u || '').match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
    return m ? m[1] : '';
  }

  function countdown(host, iso) {
    if (!iso) return;
    var when = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso + 'T00:00:00+01:00' : iso).getTime();
    if (!when || isNaN(when)) return;
    var tick = function () {
      var left = when - Date.now();
      if (left <= 0) { host.textContent = 'Out now'; return; }
      var d = Math.floor(left / 864e5), h = Math.floor(left % 864e5 / 36e5), m = Math.floor(left % 36e5 / 6e4);
      host.textContent = d > 0 ? (d + (d === 1 ? ' day' : ' days') + ', ' + h + 'h to go')
                               : (h + 'h ' + m + 'm to go');
    };
    tick();
    setInterval(tick, 60000);
  }

  function paintTrailer() {
    var host = document.getElementById('liveEp');
    if (!host) return false;
    var cfg = state.cfg || {};
    var url = (cfg.trailerLink || '').trim();
    if (!url) return false;
    if (state.eps.filter(function (e) { return e.live; }).length) return false;   // episodes win

    var id = ytId(url);
    var frame = id
      ? '<div class="tfr"><iframe src="https://www.youtube-nocookie.com/embed/' + esc(id) +
        '?rel=0" title="The Risk of You trailer" loading="lazy" allowfullscreen ' +
        'allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"></iframe></div>'
      : '<a class="tfr link" href="' + esc(url) + '" target="_blank" rel="noopener" data-trailer="1">' +
        '<span class="pl" aria-hidden="true"></span><span class="lb">Watch the trailer</span></a>';

    host.innerHTML =
      '<div class="trailer">' + frame +
        '<div class="tm">' +
          (cfg.announcement ? '<p class="an">' + esc(cfg.announcement) + '</p>' : '') +
          (cfg.launchDate ? '<p class="cd" id="cdn"></p>' : '') +
        '</div>' +
      '</div>';

    var cd = document.getElementById('cdn');
    if (cd) countdown(cd, cfg.launchDate);

    var lk = host.querySelector('[data-trailer]');
    if (lk) lk.addEventListener('click', function () { track('TrailerPlay', '/trailer/'); });
    if (id) track('TrailerShown', '');

    var lbl = document.querySelector('.live .lbl span');
    if (lbl) lbl.textContent = 'The trailer';
    var start = document.querySelector('.hero .start');
    if (start) start.classList.add('hidden');
    return true;
  }

  /* ------------------------------------------------------------ the hero */
  function paintLive() {
    var host = document.getElementById('liveEp');
    if (!host) return;
    if (paintTrailer()) return;
    var live = state.eps.filter(function (e) { return e.live; });
    if (!live.length) {
      host.innerHTML =
        '<div class="lvcard"><div class="cv" data-slot="first episode cover"></div>' +
        '<div><div class="ep">Coming soon</div><h2>The first episodes are on their way.</h2>' +
        '<p>Put your email in below and we will tell you the moment they land.</p>' +
        (window.TROY_WATCH ? window.TROY_WATCH() : '') + '</div></div>';
      bindCards(host);
      return;
    }
    var ep = live[live.length - 1];
    var num = ('0' + ep.n).slice(-2);
    /* The hero has room for words, so these carry a label as well as an icon.
       Same source as the card icons: the episode's own row. */
    var eplinks = ep.links || {}, links = '';
    PLATS.forEach(function (k) {
      var u = eplinks[k];
      if (!u) return;
      links += '<a href="' + esc(u) + '" target="_blank" rel="noopener"' +
               ' data-watch="' + k + '" data-ep="' + ep.n + '">' +
               (ICONS[k] || '') + (k === 'instagram' ? 'Watch episode ' + num : (LABEL[k] || k)) +
               '</a>';
    });
    host.innerHTML =
      '<div class="lvcard">' +
        '<div class="cv">' +
          (ep.cover ? '<img src="' + esc(ep.cover) + '" alt="Episode ' + num + '">'
                    : '<span class="ld">EP ' + num + '</span>') +
        '</div>' +
        /* The "Out now" label with the pulsing dot sits directly above this
           card in the page, so saying it again here, and a third time in the
           empty cover, read as a stutter. The card states the number only. */
        '<div><div class="ep">Episode ' + num + '</div>' +
          '<h2>' + esc(ep.title || 'Episode ' + num + ' is live') + '</h2>' +
          '<p>' + esc(ep.blurb || (ep.pending ? 'Details coming. Tap to watch it now.' : '')) + '</p>' +
          '<div class="watch">' + links + '</div>' +
        '</div>' +
      '</div>';
    bindCards(host);   /* binds the watch links too: they carry data-ep */
  }

  /* ------------------------------------------------- latest posts
     A window on the accounts, not an archive. The Latest Posts tab is
     rewritten wholesale every few hours by pullFeeds, so whatever is in it
     is current. A rail with nothing in it hides its whole section rather
     than leaving a heading over empty space. */
  function ago(iso) {
    if (!iso) return '';
    var then = new Date(iso).getTime();
    if (!then || isNaN(then)) return '';
    var mins = Math.round((Date.now() - then) / 6e4);
    if (mins < 2) return 'just now';
    if (mins < 60) return mins + 'm ago';
    var hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    var days = Math.round(hrs / 24);
    if (days < 7) return days + (days === 1 ? ' day ago' : ' days ago');
    var wks = Math.round(days / 7);
    if (wks < 5) return wks + (wks === 1 ? ' week ago' : ' weeks ago');
    return new Date(then).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  function paintFeed(hostId, source) {
    var host = document.getElementById(hostId);
    if (!host) return;
    var sec = host.closest ? host.closest('.fdsec') : null;
    var posts = (state.feed || []).filter(function (p) {
      return String(p.source || '').toLowerCase() === String(source).toLowerCase();
    });
    if (!posts.length) {
      if (sec) sec.classList.add('hidden');
      return;
    }
    if (sec) sec.classList.remove('hidden');
    host.innerHTML = posts.slice(0, 9).map(function (p) {
      var when = ago(p.at);
      return '<a class="fd" href="' + esc(p.link) + '" target="_blank" rel="noopener"' +
             ' data-feed="' + esc(source) + '">' +
          '<div class="im" data-slot="post">' +
            (p.image ? '<img src="' + esc(p.image) + '" alt="" loading="lazy">' : '') +
          '</div>' +
          (p.caption ? '<p>' + esc(p.caption) + '</p>' : '') +
          (when ? '<span class="dt">' + esc(when) + '</span>' : '') +
        '</a>';
    }).join('');
    if (window.TROY_SLOTS) window.TROY_SLOTS(host);
    [].forEach.call(host.querySelectorAll('[data-feed]'), function (a) {
      a.addEventListener('click', function () {
        track('FeedOpen', '/feed/' + String(source).toLowerCase(), { feed: source });
      });
    });
  }

  function paintFeeds() {
    paintFeed('feedWin', 'Win');
    paintFeed('feedSeries', 'Series');
  }

  /* ------------------------------------------------------------ the rail */
  function paintRail() {
    var rail = document.getElementById('rail');
    if (!rail) return;
    var list = state.eps.slice();
    if (state.order === 'latest') list.reverse();
    var isGrid = rail.classList.contains('grid');
    var slice = isGrid ? list.slice(0, state.shown) : list.slice(0, 24);
    rail.innerHTML = slice.map(card).join('');
    bindCards(rail);

    var more = document.getElementById('more');
    if (more) {
      more.classList.toggle('hidden', !isGrid || state.shown >= list.length);
      var left = list.length - state.shown;
      var b = more.querySelector('button');
      if (b) b.textContent = 'Show ' + Math.min(left, C.PER_PAGE || 12) + ' more';
    }
    var cnt = document.getElementById('epCount');
    if (cnt) {
      var liveN = state.eps.filter(function (e) { return e.live; }).length;
      cnt.textContent = liveN ? liveN + (liveN === 1 ? ' episode out' : ' episodes out') : '';
    }
  }

  /* --------------------------------------------------------- the counter */
  function paintViews() {
    var box = document.getElementById('ctr');
    if (!box) return;
    if (!C.SHOW_VIEWS || !state.views) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    var target = (C.SERIES || {}).target || 70000000;
    var pc = Math.max(0, Math.min(100, state.views / target * 100));
    var b = box.querySelector('b'), bar = box.querySelector('.bar i'), of = box.querySelector('.of');
    if (b) b.textContent = nfmt(state.views) + ' views';
    if (of) of.textContent = 'of ' + nfmt(target) + ' target';
    if (bar) setTimeout(function () { bar.style.width = pc.toFixed(1) + '%'; }, 60);
  }

  /* ----------------------------------------------------------- the fetch */
  /* The sample rows in config, used only while API_URL is empty. They carry
     the same shape as a real episode so the page previews as it will look
     with content in it, rather than as an empty shell. The moment API_URL is
     set, live data replaces all of this. */
  function fromFallback(e, i) {
    return {
      n: e.n || i + 1, title: e.title || '', blurb: e.blurb || '',
      live: !!e.live, pending: !!e.pending, cover: e.cover || '',
      views: e.views || 0, link: e.link || (e.links || {}).instagram || '',
      links: e.links || {}
    };
  }

  function load() {
    if (!C.API_URL) {
      state.eps = (C.EPISODES_FALLBACK || []).map(fromFallback);
      state.feed = C.FEED_FALLBACK || [];
      paintLive(); paintRail(); paintViews(); paintFeeds();
      return;
    }
    api('episodes', {}).then(function (r) {
      if (!r || !r.ok) throw new Error((r && r.error) || 'bad response');
      state.eps = (r.episodes || []).slice().sort(function (a, b) { return a.n - b.n; });
      state.views = Number(r.views) || 0;
      state.cfg = r.settings || {};
      state.feed = r.feed || [];
      state.loaded = true;
      paintLive(); paintRail(); paintViews(); paintFeeds();
    }).catch(function () {
      if (state.loaded) return;                       // keep what is on screen
      state.eps = (C.EPISODES_FALLBACK || []).map(fromFallback);
      state.feed = C.FEED_FALLBACK || [];
      paintLive(); paintRail(); paintViews(); paintFeeds();
    });
  }

  /* -------------------------------------------------------------- wiring */
  [].forEach.call(document.querySelectorAll('.tabs button'), function (b) {
    b.addEventListener('click', function () {
      [].forEach.call(document.querySelectorAll('.tabs button'), function (x) {
        x.setAttribute('aria-selected', String(x === b));
      });
      state.order = b.getAttribute('data-order') || 'latest';
      state.shown = C.PER_PAGE || 12;
      paintRail();
    });
  });

  var moreBtn = document.querySelector('#more button');
  if (moreBtn) moreBtn.addEventListener('click', function () {
    state.shown += (C.PER_PAGE || 12);
    paintRail();
  });

  load();
  if (C.API_URL && C.POLL_MS) setInterval(load, C.POLL_MS);
})();
