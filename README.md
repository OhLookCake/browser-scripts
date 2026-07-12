# Browser Scripts Backup

Backup of my browser customizations, organized by the extension they restore into.

## Restore guide

| Folder | Extension | How to restore |
|---|---|---|
| `violentmonkey/` | [Violentmonkey](https://violentmonkey.github.io/) | Open the dashboard → **+** (new script) → paste the file contents → save. The `// ==UserScript==` header sets the name, matches, and grants automatically. |
| `stylus/` | [Stylus](https://add0n.com/stylus.html) | Drag the `.user.css` file onto a browser tab, or open it via a `file://` URL — Stylus detects the `/* ==UserStyle== */` header and offers a one-click install with name + site matching prefilled. (Or: Stylus dashboard → **Manage** → import.) |
| `firefox-chrome/` | Firefox `userChrome.css` / `userContent.css` | Copy the contents into your Firefox profile's `chrome/` folder. Requires `toolkit.legacyUserProfileCustomizations.stylesheets = true` in `about:config`, then restart. |
