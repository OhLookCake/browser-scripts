# Browser Scripts Backup

Backup of my browser customizations, bookmarklets, app settings, and shell/editor dotfiles.

## Restore guide

| Folder | Used by | How to restore |
|---|---|---|
| [violentmonkey/](violentmonkey/) | Violentmonkey | Create a new script in the dashboard, replace the template with the file contents, and save. The `// ==UserScript==` header defines its name, matching URLs, and grants. |
| [stylus/](stylus/) | Stylus | Use Stylus' import functionality |
| [firefox-chrome/](firefox-chrome/) | Firefox interface styles | Copy into your profile's `chrome/` folder, preserving the nested directory structure. |
| [bookmarklets/](bookmarklets/) | Browser bookmarks | Create a bookmark and paste the contents into its URL/location field, including `javascript:`. |
| [configs/](configs/) | Sidebery, iTerm2, Joplin | App-specific backups |
| [dotfiles/](dotfiles/) | Shell, Vim, tmux | Copy the desired files to your home directory, merging with existing settings as needed. |
| [misc/](misc/) | Sidebery custom CSS | Paste `sideberry.css` into Sidebery's custom styles editor. |


## Firefox interface styles

Find your profile directory through `about:support` → **Profile Folder**.
It might look something like
``~/Library/Application Support/Firefox/Profiles/123abc45.default-release/chrome
Copy the contents of `firefox-chrome/` into its `chrome/` directory so the result looks like:

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

