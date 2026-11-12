# Easy Everyday Project 2 Version

A bilingual daily organizer with Home and Records, a Chinese/English switch, and dark mode.

## Files

- `public/`: current website HTML, CSS, JavaScript, and image assets.
- `worker/index.js`: existing Cloudflare Worker for confirmation photos.
- `migrations/`: original database schema.

Daily records, weekly schedules, meal definitions, labels, and recurring items now load from and save to the Node.js backend. Browser localStorage keeps a backup and pending changes. Language, dark mode, and calendar display preferences remain local to the browser.

## Run in GitHub Codespaces

Use Node.js 22.13 or later. In the repository terminal:

```sh
npm install
npm start
```

Open the forwarded port 3000. The website and API must use this same URL. Saving a file to GitHub alone does not start the server or update the earlier Sites publication.

- `backend.cjs`: the single-file Express API and SQLite database setup.
- `public/api.js`: frontend connection, save status, local backup, retry, and revision conflict handling.
- `GET /api/state`: load all daily records and custom settings.
- `PUT /api/state`: atomically save changes, including deletions, with a revision check.
- `/api/records`: individual CRUD endpoints use the same records table. Their writes also advance the revision.

On first connection to an empty backend, existing `gentle-static` and `gentle-extra` records at the **same browser origin** are uploaded automatically. Data on the old Sites domain cannot be read from a Codespaces domain. No automatic migration between domains is provided.

The page shows whether changes reached the backend. Failed saves keep a local pending copy; click the status to retry. On a version conflict, export a backup before choosing to load backend records. The revision check prevents an older tab from silently overwriting newer records. Avoid editing the same data in multiple tabs.

SQLite is created in `.easy-everyday-data/`, which is ignored by Git. Set `DATA_DIR` to a persistent disk on a production host. MongoDB has **not** been connected yet. No database credentials belong in frontend code or the GitHub repository.

Anonymous browser cookies separate users. This is not physical device recognition or an account: clearing cookies loses access, and different browsers do not sync. Local backups also depend on browser storage being available.

## Hosting

The connected website requires a Node.js host running `npm start`; static hosting alone cannot run the API. Photo upload/view still requires the existing `/api/evidence` Worker, D1 `DB`, R2 `EVIDENCE`, and trusted authentication headers. The Node.js backend does not implement photo storage. No secrets, user records, or database contents are included here.

Current Sites publication: https://gentle-day-api-lab.xieyx2007.chatgpt.site/

## Updates

Imported from the published Project 2 version 4, source commit d0dff8a4e8912fe0dc761dd02da306a6aa07e352.

Future changes requested in this conversation can be committed to this repository. Connecting the ChatGPT account does not create a background Sites-to-GitHub mirror. A hosting service connected to this repository can deploy after commits once configured.

