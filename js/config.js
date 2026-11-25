/* The Risk of You config.
   This is the only file you edit to take the site live. Everything that was
   an open question when this was built is a value in here, so answering one
   is a one line change and never a rebuild.
   Names mirror CFG in Code.gs so the two read side by side. */
window.TROY_CONFIG = {

  /* ---- the one required value ----
     Paste the Apps Script web app URL here. Until you do, the episode rail
     falls back to EPISODES_FALLBACK below and the newsletter form says so
     rather than pretending to work. */
  API_URL: '',

  /* ---- where to watch. Empty hides that button everywhere on the site ----
     These are the channel pages. Per episode links come from the Sheet. */
  WATCH: {
    tiktok:    '',   // https://www.tiktok.com/@...
    instagram: '',   // https://www.instagram.com/...
    youtube:   '',   // https://www.youtube.com/@...
    snapchat:  ''    // https://www.snapchat.com/add/...
  },

  /* ---- press ----
     A pull quote goes on the page only when it was really published. Fill in
     `text` and `source` and the block appears; leave `text` empty and the
     whole thing stays hidden, which is how it ships.
     `url` should point at the actual piece, so anyone reading the quote can
     click through and check it. A quote with no link is the kind of thing
     that gets a brand called out, so do not skip it.
     `rating` is optional and only shows next to a source. Leave it empty
     unless that same publication actually scored it. */
  PRESS: {
    text:   'a social media thriller',
    source: 'What Kept Me Up',
    url:    '',          // paste the link to the piece so it is checkable
    rating: ''           // '4/5', or leave empty for no rating
  },

  /* ---- links ---- */
  LR_URL: 'https://loveracket.co/?utm_source=troy&utm_medium=site&utm_campaign=cross',
  /* The game lives on its own page over there, so this drops the visitor
     straight onto it instead of the homepage. Change the path only if the
     Love Racket site moves the game. */
  LR_PLAY_URL: 'https://loveracket.co/play/?utm_source=troy&utm_medium=site&utm_campaign=game',

  /* ---- the two leads ----
     Only the Instagram URLs live here. The names, roles and bios are written
     into index.html, so copy edits happen where you can read them in context.
     An empty value hides that Follow button rather than linking nowhere.
     The handle that the latest posts rail pulls from is a different setting:
     that one is "Win instagram" on the Settings tab of the Sheet. */
  CAST: {
    win:   { instagram: 'https://www.instagram.com/win.darling_/' },
    kunle: { instagram: '' }    // https://www.instagram.com/...
  },

  /* ---- the series. Must match CFG in Code.gs ---- */
  /* The episode count and the launch date deliberately do not live here.
     Both have moved more than once, and a number in a config file ends up
     contradicting the sheet. The launch date comes from the Settings tab,
     and the site never states a total. */
  SERIES: {
    target: 70000000,                        // the 70M views in the deck
    email:  'info@theriskofyou.co'
  },

  /* ---- the view counter ----
     false until the number flatters us. Flip to true and it appears in the
     hero and in the story strip, reading the live total from the Sheet. */
  SHOW_VIEWS: false,

  /* ---- the partner block. false hides the whole section ---- */
  SHOW_PARTNERS: false,
  PARTNER_EMAIL: '',          // who sponsorship enquiries go to

  /* ---- tracking ---- */
  GTM_ID: 'GTM-T2Z4FGHF',     // The Risk of You container. Empty = none loads
  PIXEL_FROM_PAGE: false,     // false = GTM fires the Meta events off the dataLayer

  /* ---- social, shown in the footer. Empty hides that icon ---- */
  SOCIAL: { instagram: '', tiktok: '', x: '' },

  /* ---- internal ---- */
  POLL_MS: 60000,             // how often the episode rail refreshes
  PER_PAGE: 12,               // episodes per "load more" on the archive

  /* ---- PREVIEW CONTENT ----
     Everything below is shown ONLY while API_URL above is empty. It exists so
     the page can be opened and judged before the Sheet is connected. The
     moment you paste the web app URL into API_URL, every one of these rows is
     ignored and the live Sheet takes over. You do not have to delete them.
     The captions are deliberately obvious placeholders. */
  EPISODES_FALLBACK: [
    { n: 1, title: 'The bet', live: true,
      links: { instagram: '#', tiktok: '#', youtube: '#' } },
    { n: 2, title: 'He does not play along', live: true,
      links: { instagram: '#', tiktok: '#' } },
    { n: 3, title: 'She picks her mark', live: true,
      links: { instagram: '#', youtube: '#' } },
    { n: 4, title: 'The dinner', live: true,
      links: { instagram: '#', tiktok: '#', youtube: '#' } },
    { n: 5, title: 'Her father walks in', live: true,
      blurb: 'Nobody breathes. She has three months and a group chat watching.',
      links: { instagram: '#', tiktok: '#' } }
  ],

  FEED_FALLBACK: [
    { source: 'Win', at: '', caption: 'Sample post. Replace by connecting the Sheet.', image: '', link: '#' },
    { source: 'Win', at: '', caption: 'Sample post. Replace by connecting the Sheet.', image: '', link: '#' },
    { source: 'Win', at: '', caption: 'Sample post. Replace by connecting the Sheet.', image: '', link: '#' },
    { source: 'Win', at: '', caption: 'Sample post. Replace by connecting the Sheet.', image: '', link: '#' },
    { source: 'Series', at: '', caption: 'Sample post. Replace by connecting the Sheet.', image: '', link: '#' },
    { source: 'Series', at: '', caption: 'Sample post. Replace by connecting the Sheet.', image: '', link: '#' },
    { source: 'Series', at: '', caption: 'Sample post. Replace by connecting the Sheet.', image: '', link: '#' },
    { source: 'Series', at: '', caption: 'Sample post. Replace by connecting the Sheet.', image: '', link: '#' }
  ],

  LOGO: (window.TROY_BASE || '') + 'assets/logo.png'
};

/* Loads the GTM container from GTM_ID above. This file sits in the <head> of
   every page, so the container loads early. dataLayer is created here first,
   so nothing pushed later is lost. */
(function (w, d, i) {
  w.dataLayer = w.dataLayer || [];
  if (!i) return;
  w.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  var f = d.getElementsByTagName('script')[0], j = d.createElement('script');
  j.async = true;
  j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i;
  f.parentNode.insertBefore(j, f);
})(window, document, window.TROY_CONFIG.GTM_ID);
