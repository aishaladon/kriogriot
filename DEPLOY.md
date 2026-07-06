# Deploying Krio Griot to Hostinger (Cloud / Node.js)

Target: Hostinger Cloud Hosting with Node.js support (managed, via hPanel).

## Prerequisites on Hostinger

- Cloud plan with Node.js enabled
- A domain (or subdomain) pointed at the hosting account
- SSH access enabled in hPanel (Advanced → SSH Access)

## One-time setup

1. **Create the Node.js app in hPanel**
   - hPanel → Websites → Manage → Advanced → Node.js
   - Create application:
     - Node version: `20.x` (matches `engines.node` in `package.json`)
     - Application mode: `Production`
     - Application root: `domains/<yourdomain>/kriogriot` (or wherever you place the repo)
     - Application URL: your domain / subdomain
     - Application startup file: `server/index.js`
   - Hostinger will inject `PORT` — do not hardcode it. `server/index.js` already reads `process.env.PORT`.

2. **Clone the repo**
   Via SSH:
   ```bash
   cd ~/domains/<yourdomain>
   git clone git@github.com:<you>/kriogriot.git
   cd kriogriot
   ```

3. **Create `.env`** (never committed)
   ```bash
   cp .env.example .env
   nano .env
   ```
   Fill in:
   - `ANTHROPIC_API_KEY`
   - `AIRTABLE_API_KEY`
   - `AIRTABLE_BASE_ID`
   - Leave `PORT` unset — Hostinger provides it.

4. **Install dependencies**
   From the hPanel Node.js panel click **Run NPM Install**, or via SSH:
   ```bash
   npm install --production
   ```

5. **Restart the app** from the Node.js panel.

## Redeploying after code changes

```bash
cd ~/domains/<yourdomain>/kriogriot
git pull
npm install --production   # only if dependencies changed
```
Then click **Restart** in hPanel → Node.js.

## Notes

- `uploads/` is gitignored; Airtable stores the canonical `Image URL` for each archived item, so the local cache is not load-bearing across environments.
- `server/gedcom-data.json` and `server/gedcom-map.json` are gitignored (contain family PII). If the app needs them at runtime on the server, upload them via SFTP or the hPanel file manager into `server/`.
- Make sure your domain's DNS points to Hostinger before creating the Node.js app, otherwise the Application URL binding will fail.
