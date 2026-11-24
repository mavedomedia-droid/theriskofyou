# The Risk of You

Static site. No build step. Netlify publish directory is `.`

```
index.html            homepage
episodes/index.html   all 90 episodes, the archive
privacy/index.html    required before the Meta pixel and the mailing list
404.html
css/troy.css
js/config.js          the only file you edit. Also loads GTM
js/partials.js        nav, footer, tracking, newsletter
js/episodes.js        the episode rail, the archive grid, the view counter
assets/
netlify.toml
```

## Taking it live

Everything is in `js/config.js`. Nothing else needs touching.

| Value | What it does | Until you set it |
|---|---|---|
| `API_URL` | the Apps Script web app `/exec` URL | the rail shows one placeholder card and the newsletter says it isn't connected, instead of pretending to work |
| `WATCH` | the four channel pages | the watch buttons are not rendered at all, so there is never a dead link |
| `GTM_ID` | the GTM container | no container loads |
| `LR_URL` | where Get tickets goes | points at `loveracket.co` |
| `SHOW_VIEWS` | the 70M counter in the hero | hidden |
| `SHOW_PARTNERS` | the brands section | hidden |

## Publishing an episode

Two cells in the **Episodes** tab of the Sheet. Nothing else, ever.

| A: Episode | B: Link |
|---|---|
| `7` | `https://www.instagram.com/reel/XXXX/` |

The card appears on the site straight away as "Episode 07, out now, details
coming", and already opens that post when tapped. Within ten minutes Apify
pulls the cover, the caption and the view count and writes them into columns
C to F, and the card fills itself in.

Anything you type into Title or Cover yourself is never overwritten, so key
art and hand written titles always beat whatever Instagram has.

## Images it still wants

`assets/poster.jpg` at 4:5, which is the hero. Then `assets/og.jpg` and
`assets/og-episodes.jpg`, both 1200x630. Without them a
shared link is a blank card. Cast portraits go in `assets/cast/`.

Any element with `data-slot` draws a dashed box naming the file it wants, and
fills itself the moment that file exists. So a missing image is visibly
missing rather than quietly broken.

## Tracking

Each conversion gets its own URL pushed and then replaced, plus a dataLayer
event for GTM triggers:

| Event | Path | Carries |
|---|---|---|
| `troy_Signup` | `/signed-up/` | `source` |
| `troy_EpisodeOpen` | `/episode/NN/` | `episode` |
| `troy_WatchClick` | `/watch/<platform>` | `platform`, `episode` |
| `troy_CrossToLR` | `/out/loveracket` | |
| `troy_RecapOpen` | `/recap/` | |

## One thing not to change

`api()` in `js/partials.js` sends no `Content-Type` header on purpose. The
browser then uses `text/plain`, which is CORS safelisted, so there is no
preflight. Apps Script cannot answer a preflight. Adding a JSON content type
works on localhost and fails the moment it is deployed.
