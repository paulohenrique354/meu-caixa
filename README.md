# Meu Caixa

Personal finance app for one person, made for phones: income, expenses, accounts, credit cards with statements and installments, savings jars, budget, reports, and reading of the electronic receipt (NFC-e).

**Use it:** https://paulohenrique354.github.io/meu-caixa/

On iPhone (Safari), tap Share and then "Add to Home Screen". On Android (Chrome), tap the menu and then "Install app".

## Where the data lives

All data stays **on the device**, in the browser itself (IndexedDB). Nothing goes to a server. Each phone or browser has its own data, so make a backup in Settings from time to time.

The password is a screen lock (it is stored only as a SHA-256 hash). The AI key for reading receipts, if used, is also stored only on the device.

## Code

- `index.html`: the complete app, generated from the parts in `src/`.
- `src/p1.html` (screen and styles), `src/p2.js` (data and financial rules), `src/p3.js` (screens and actions). Edit the parts and run `src/build.sh`.
- `sw.js` and `manifest.webmanifest`: let it install as an app and work offline. When you change these files, bump `VERSAO` in `sw.js`.
