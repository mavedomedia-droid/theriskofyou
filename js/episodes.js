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


  /* ------------------------------------------------- before episode one */
  var TRAILER_IMG = 'assets/coming-soon.jpg';
  function setEmpty(on) { document.documentElement.classList.toggle('noeps', !!on); }
  function trailerCard() {
    /* "Coming soon" until Settings holds a Trailer link, then it opens it. */
    var t = String((state.cfg || {}).trailerLink || '').trim();
    var tag = t ? 'a' : 'div';
    return '<' + tag + ' class="trlc big"' +
           (t ? ' href="' + esc(t) + '" target="_blank" rel="noopener"' : '') + '>' +
           '<img src="' + B + TRAILER_IMG + '" alt="" loading="lazy">' +
           '<div class="tx"><div class="ep">Trailer</div><h2>' +
           (t ? 'Watch the trailer' : 'Trailer coming soon') + '</h2></div></' + tag + '>';
  }

  /* ------------------------------------------------------------ the hero
     A row of posters you swipe through. The series poster is first, then the
     episodes from the Sheet with the newest one sitting in the middle when
     the page opens. With no episodes yet the middle card is the trailer:
     "coming soon" by default, or the real one once Settings holds a
     Trailer link. */
  var heroSig = '', heroSlides = [], heroAt = 1;

  function heroList() {
    /* The hero is the series poster on its own. Episodes live in one place,
       the "Every episode" row straight under it. */
    return [{ kind: 'series', img: B + 'assets/poster.jpg', link: '' }];
  }

  function slideHtml(sl, i) {
    var tag = sl.link ? 'a' : 'div';
    var attrs = sl.link ? ' href="' + esc(sl.link) + '" target="_blank" rel="noopener"' : '';
    if (sl.kind === 'ep') attrs += ' data-ep="' + sl.ep.n + '"';
    if (sl.kind === 'trailer' && sl.link) attrs += ' data-trailer="1"';
    var cap = sl.kind === 'series'
      ? '<h1><em>Win</em> bets she can make <em>Kunle</em> fall.</h1>'
      : '<div class="kick">' + esc(sl.kick) + '</div><h2>' + esc(sl.title) + '</h2>';
    return '<' + tag + ' class="hs ' + sl.kind + '" data-i="' + i + '"' + attrs + '>' +
      (sl.img ? '<img src="' + esc(sl.img) + '" alt=""' + (i > 2 ? ' loading="lazy"' : '') + '>' : '') +
      '<div class="c">' + cap + '</div></' + tag + '>';
  }

  function heroSet(i, jump) {
    var track = document.getElementById('heroTrack');
    if (!track) return;
    var els = track.querySelectorAll('.hs');
    if (!els.length) return;
    i = Math.max(0, Math.min(els.length - 1, i));
    var el = els[i];
    var left = el.offsetLeft - (track.clientWidth - el.offsetWidth) / 2;
    if (jump) track.scrollLeft = left;
    else if (track.scrollTo) track.scrollTo({ left: left, behavior: 'smooth' });
    else track.scrollLeft = left;
  }

  function heroMark() {
    var track = document.getElementById('heroTrack');
    if (!track) return;
    var els = track.querySelectorAll('.hs'), mid = track.scrollLeft + track.clientWidth / 2;
    var best = 0, gap = 1e9;
    [].forEach.call(els, function (el, i) {
      var d = Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid);
      if (d < gap) { gap = d; best = i; }
    });
    heroAt = best;
    [].forEach.call(els, function (el, i) { el.classList.toggle('on', i === best); });
    var dots = document.getElementById('heroDots');
    if (dots) [].forEach.call(dots.children, function (d, i) { d.classList.toggle('on', i === best); });

    /* Play follows the card in the middle. On the series poster it plays the
       newest episode, so the button is never a dead end. */
    var play = document.getElementById('heroPlay');
    if (play) {
      var sl = heroSlides[best] || {};
      var target = sl.link ? sl : null;
      if (!target) for (var k = 0; k < heroSlides.length; k++) if (heroSlides[k].link) { target = heroSlides[k]; break; }
      play.classList.toggle('hidden', !target);
      if (target) {
        play.href = target.link;
        if (target.ep) { play.setAttribute('data-ep', target.ep.n); play.setAttribute('data-watch', 'instagram'); }
        else { play.removeAttribute('data-ep'); play.removeAttribute('data-watch'); }
      }
    }
  }

  function paintProof() {
    var el = document.getElementById('heroProof');
    var P = C.PRESS || {};
    if (!el) return;
    if (!P.text || !P.source) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    if (P.url) { el.href = P.url; el.target = '_blank'; el.rel = 'noopener'; }
    /* Stars only draw when PRESS.rating holds a number out of 5, e.g. '4.5'.
       Left empty, the line is just the quote and the outlet. */
    var r = parseFloat(P.rating), stars = '';
    if (r > 0 && r <= 5) {
      stars = '<i class="stars" style="--r:' + (r / 5 * 100).toFixed(1) + '%" role="img" aria-label="' +
              r + ' out of 5 stars">\u2605\u2605\u2605\u2605\u2605</i><b>' + r + '</b><br>';
    }
    el.innerHTML = stars +
      '<span>&ldquo;' + esc(P.text) + '&rdquo;</span><em>' + esc(P.source) + '</em>';
  }

  function paintLive() {
    var track = document.getElementById('heroTrack');
    if (!track) return;
    var live = state.eps.filter(function (e) { return e.live; });
    setEmpty(!live.length);
    paintProof();

    var list = heroList();
    var sig = JSON.stringify(list.map(function (s) { return [s.kind, s.img, s.link, s.title]; }));
    if (sig === heroSig) return;            /* a poll with nothing new must not move the row */
    heroSig = sig; heroSlides = list;

    track.innerHTML = list.map(slideHtml).join('');
    var hero = track.closest ? track.closest('.hero') : null;
    if (hero) hero.classList.toggle('solo', list.length < 2);
    var dots = document.getElementById('heroDots');
    if (dots) dots.innerHTML = list.map(function (s, i) {
      return '<button type="button" aria-label="Go to card ' + (i + 1) + '" data-i="' + i + '"></button>';
    }).join('');

    /* A card off to the side slides into the middle on the first tap and
       only opens its link once it is the one in focus. */
    [].forEach.call(track.querySelectorAll('.hs'), function (el) {
      el.addEventListener('click', function (e) {
        var i = Number(el.getAttribute('data-i'));
        if (i !== heroAt) { e.preventDefault(); e.stopImmediatePropagation(); heroSet(i); }
        else if (el.getAttribute('data-trailer')) track_('TrailerPlay', '/trailer/');
      });
    });
    if (dots) [].forEach.call(dots.children, function (d) {
      d.addEventListener('click', function () { heroSet(Number(d.getAttribute('data-i'))); });
    });
    bindCards(track);
    requestAnimationFrame(function () { heroSet(list.length > 1 ? 1 : 0, true); heroMark(); });
  }
  function track_(a, b) { try { track(a, b); } catch (e) {} }

  (function () {
    var track = document.getElementById('heroTrack');
    if (!track) return;
    var t = 0;
    track.addEventListener('scroll', function () {
      if (t) return;
      t = requestAnimationFrame(function () { t = 0; heroMark(); });
    }, { passive: true });
    window.addEventListener('resize', function () { heroSet(heroAt, true); heroMark(); });
    [].forEach.call(document.querySelectorAll('.harr'), function (b) {
      b.addEventListener('click', function () { heroSet(heroAt + Number(b.getAttribute('data-dir'))); });
    });
    var sub = document.getElementById('heroSub');
    if (sub) sub.addEventListener('click', function (e) {
      var f = document.getElementById('news');
      var sec = document.getElementById('subscribe') || f;
      if (!f) return;
      e.preventDefault();
      /* Lands with the form at the top of the screen, so Love Racket, which
         sits directly under it, is in view at the same time. */
      var y = sec.getBoundingClientRect().top + window.pageYOffset - 62;
      window.scrollTo({ top: y, behavior: 'smooth' });
      var inp = f.querySelector('input[type="email"]');
      if (inp) setTimeout(function () { try { inp.focus({ preventScroll: true }); } catch (x) {} }, 500);
      track_('SubscribeClick', '');
    });
    var play = document.getElementById('heroPlay');
    if (play) play.addEventListener('click', function () {
      var n = Number(play.getAttribute('data-ep'));
      if (n) { markSeen(n); track_('WatchClick', '/watch/instagram', { platform: 'instagram', episode: n }); }
      else track_('TrailerPlay', '/trailer/');
    });
  })();

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

  function feedCard(p, source) {
    var when = ago(p.at);
    return '<a class="fd" href="' + esc(p.link) + '" target="_blank" rel="noopener"' +
           ' data-feed="' + esc(source) + '">' +
        '<div class="im" data-slot="post">' +
          (p.image ? '<img src="' + esc(p.image) + '" alt="" loading="lazy">' : '') +
        '</div>' +
        (p.caption ? '<p>' + esc(p.caption) + '</p>' : '') +
        (when ? '<span class="dt">' + esc(when) + '</span>' : '') +
      '</a>';
  }

  function postsFrom(source) {
    return (state.feed || []).filter(function (p) {
      return String(p.source || '').toLowerCase() === String(source).toLowerCase();
    });
  }

  function paintFeed(hostId, source) {
    var host = document.getElementById(hostId);
    if (!host) return;
    var sec = host.closest ? host.closest('.fdsec') : null;
    var posts = postsFrom(source);
    if (!posts.length) {
      if (sec) sec.classList.add('hidden');
      return;
    }
    if (sec) sec.classList.remove('hidden');
    host.innerHTML = posts.slice(0, 9).map(function (p) {
      return feedCard(p, source);
    }).join('');
    if (window.TROY_SLOTS) window.TROY_SLOTS(host);
    [].forEach.call(host.querySelectorAll('[data-feed]'), function (a) {
      a.addEventListener('click', function () {
        track('FeedOpen', '/feed/' + String(source).toLowerCase(), { feed: source });
      });
    });
  }

  /* Three of Win's latest, sitting in the story section where the
     production stills used to be. Same card as the rails, same data. */
  function paintStoryPosts() {
    var host = document.getElementById('storyPost');
    if (!host) return;
    var posts = postsFrom('Win').slice(0, 3);
    if (!posts.length) { host.classList.add('hidden'); return; }
    host.classList.remove('hidden');
    host.innerHTML = posts.map(function (p) { return feedCard(p, 'Win'); }).join('');
    if (window.TROY_SLOTS) window.TROY_SLOTS(host);
    [].forEach.call(host.querySelectorAll('[data-feed]'), function (a) {
      a.addEventListener('click', function () {
        track('FeedOpen', '/feed/win', { feed: 'Win' });
      });
    });
  }

  function paintFeeds() {
    paintStoryPosts();
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
    setEmpty(!list.length);
    rail.innerHTML = list.length ? slice.map(card).join('') : trailerCard();
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
      /* No count on the page, by request: neither a total nor a running
         tally. The element stays so the archive layout does not shift. */
      cnt.textContent = '';
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
      /* The sample rows are for previewing with no backend. With a real
         API_URL a failed fetch shows the coming soon card instead, never
         made-up episodes. */
      state.eps = []; state.feed = [];
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
