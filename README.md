# Easy Everyday Project 2 Version

A bilingual daily organizer with Home and Records, a Chinese/English switch, and dark mode.

## Files

- `public/`: current website HTML, CSS, JavaScript, and image assets.
- `worker/index.js`: existing Cloudflare Worker for confirmation photos.
- `migrations/`: original database schema.

Daily tasks and records are saved in browser localStorage. Language switching changes the interface without changing stored records. Tools and Settings have been removed.

## Hosting

The frontend can be hosted as a static site using `public` as the output directory, with no build command. Photo upload/view requires the existing `/api/evidence` Worker, D1 `DB`, R2 `EVIDENCE`, and trusted authentication headers. Static hosting alone does not provide that service. No secrets, user records, or database contents are included here.

Current Sites publication: https://gentle-day-api-lab.xieyx2007.chatgpt.site/

## Updates

Imported from the published Project 2 version 4, source commit d0dff8a4e8912fe0dc761dd02da306a6aa07e352.

Future changes requested in this conversation can be committed to this repository. Connecting the ChatGPT account does not create a background Sites-to-GitHub mirror. A hosting service connected to this repository can deploy after commits once configured.
