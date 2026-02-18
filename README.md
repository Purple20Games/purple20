# Purple20

Purple20 is a Chrome extension that supports integration of the DCC Crawler Companion with the Roll20 virtual table top, allowing:

* rolls made in Crawler Companion (simple rolls, fumbles, crits, etc) to appear in Roll20 chat
* 0-level characters generated through Crawler Companion to automatically spawn populated character sheets in Roll20 (also requires the 'P20_Bot' Roll20 API script, available at https://github.com/Purple20Games/roll20_api)

### Installation
Install via the Chrome store at https://chromewebstore.google.com/detail/fhefaendccigncfdkfjcaklophndhkkd

### Usage
* Navigate to Crawler Companion (be sure you're online and broadcasting)
* In a separate tab, navigate to Roll20 and enter a game
* Confirm that the Purple 20 extension shows the status of both as "connected"
* The following dice rolls should appear in Roll20: straight rolls, fumble table, crit table, spells


#### Optional (character generator support)
* Install P20Bot
* In Crawler Companion, generate any 0-level PC character
* P20Bot should recognize it in Roll20 and auto-generate a character sheet for it

### Revisions
0.008 - Fixed incorrect registration check

0.9   - MV3 support.  Code refactor
