# Browser Scripts Backup

Backup of my browser customizations, bookmarklets, app settings, and shell/editor dotfiles.

## Restore guide

| Folder | Used by | How to restore |
|---|---|---|
| [violentmonkey/](violentmonkey/) | Violentmonkey | Create a new script in the dashboard, replace the template with the file contents, and save. The `// ==UserScript==` header defines its name, matching URLs, and grants. |
| [stylus/](stylus/) | Stylus | Create a new style and paste the complete `.user.css` file, including its `/* ==UserStyle== */` header. |
| [firefox-chrome/](firefox-chrome/) | Firefox interface styles | Copy into your profile's `chrome/` folder, preserving the nested directory structure. See below. |
| [bookmarklets/](bookmarklets/) | Browser bookmarks | Create a bookmark and paste the contents of `cal.js` into its URL/location field, including `javascript:`. |
| [configs/](configs/) | Sidebery, iTerm2, Joplin | App-specific backups; see below. |
| [dotfiles/](dotfiles/) | Shell, Vim, tmux | Copy or symlink the desired files to your home directory, merging with existing settings as needed. |
| [misc/](misc/) | Sidebery custom CSS | Paste `sideberry.css` into Sidebery's custom styles editor. |

## Userscripts

| Script | What it does |
|---|---|
| [amazon-video-keyboard-shortcuts.js](violentmonkey/amazon-video-keyboard-shortcuts.js) | On Amazon UK Video, use **J** to seek back, **K** to play/pause, **L** to seek forward, and **P** to skip a recap or intro. |
| [channel4-video-overlay.js](violentmonkey/channel4-video-overlay.js) | Removes the dark player overlay while keeping media controls visible. |
| [decathlon-pickle-booking.js](violentmonkey/decathlon-pickle-booking.js) | Redirects Canada Water pickleball listings to booking dates, loads more slots, and adds day/hour filters and a normal/off-peak switch. |
| [dupr-dashboard.js](violentmonkey/dupr-dashboard.js) | Adds an **Analyse** button to the DUPR dashboard. Scrolls to load results, then shows separate singles/doubles reports with statistics, rating charts, and a **Save PDF** print action. |
| [london-social-club.js](violentmonkey/london-social-club.js) | Hides archived events in the old Reddit layout of r/LondonSocialClub, with a **Hide past** toggle. |
| [youtube-custom-seek.js](violentmonkey/youtube-custom-seek.js) | Use **U** to rewind and **O** to advance by three seconds. |

Each script's `@match` entries define where it runs.

## Userstyles

The [stylus/](stylus/) folder contains styles for Amazon Video, Apterous, Board Game Arena, ChatGPT, Downforacross, Google Calendar, Greem Rackonine, Wikipedia, Xcancel, and YouTube. Each file includes its own site rules and metadata.

Some styles reference local fonts, including **Atkinson Hyperlegible**, **Source Code Pro**, and **Futura Hv BT**. Install those fonts to reproduce the intended appearance; fallback fonts apply where specified.

## Firefox interface styles

Find your profile directory through `about:support` → **Profile Folder**. Copy the contents of `firefox-chrome/` into its `chrome/` directory so the result looks like:

```text
<profile>/chrome/
├── userChrome.css
├── userContent.css
└── chrome/
    ├── tab_spacing.css
    ├── tab_look.css
    └── ...
```

Set `toolkit.legacyUserProfileCustomizations.stylesheets` to `true` in `about:config`, then restart Firefox.

[userChrome.css](firefox-chrome/userChrome.css) imports the active horizontal-tab styles. The nested `chrome/` folder also contains optional vertical-tab styles; `chrome/old/` holds older snippets. Enable only the imports you want, using paths that match the files' current locations. [userContent.css](firefox-chrome/userContent.css) is currently empty.

## Google Calendar bookmarklet

[cal.js](bookmarklets/cal.js) is the minified bookmark URL; [cal_formatted.js](bookmarklets/cal_formatted.js) is its editable source. Click the bookmark to enter:

```text
event [day] time [duration] [s]
```

Examples:

```text
tennis practice wed 1900 2h
Park Run today 9.30am +90m
Dinner 9 pm
```

- The day defaults to today. A named weekday means its next occurrence, including next week if it is today.
- Times use your local timezone and accept forms such as `1900`, `9:30`, `9.30am`, and `9 pm`. Use `12am` or `12pm` to make midnight/noon explicit.
- Duration defaults to 60 minutes. Use minutes (`90`, `90m`, `+90m`) or hours (`2h`, `1.5h`).
- The event title is converted to title case, and a Google Calendar event template opens in a new tab.
- A trailing `s` attempts to click **Save** in the opened tab. This depends on access to that tab's document; cross-origin browser restrictions can prevent it, so save manually when needed.

After editing the source, regenerate the bookmarklet from the repository root:

```sh
bash bookmarklets/minify.sh
```

This requires Node.js/npm with `npx`. The script runs Terser pinned to `5.51.2` and writes a single-line `javascript:` URL to `cal.js`.

## App configs and dotfiles

| File | Purpose / restore destination |
|---|---|
| [Sidebery backup](configs/sidebery-data-2026.09.24-12.27.59.json) | Import through Sidebery's settings backup/import controls. |
| [iterm-default.json](configs/iterm-default.json) | Import as an iTerm2 profile. |
| [joplin-rendered-md-userstyle.css](configs/joplin-rendered-md-userstyle.css) | Use as Joplin's `userstyle.css` in its profile directory for rendered Markdown styling. |
| [.aliases](dotfiles/.aliases) | Shell aliases and helper functions; source from your shell startup file. Includes references to personal files such as `~/.aliases_servers` that are not included here. |
| [.gitstat.sh](dotfiles/.gitstat.sh) | Source from your shell startup file to define `gs`, a Git status summary with branch, upstream counts, and file changes. |
| [.vimrc](dotfiles/.vimrc) | Restore to `~/.vimrc`; expects Vundle at `~/.vim/bundle/Vundle.vim`. |
| [tmux.conf](dotfiles/tmux.conf) | Restore to `~/.tmux.conf`. |
