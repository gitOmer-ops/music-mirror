# AI Development Logs

## Secure Redirect URI for Spotify (2024)

**Issue:** Spotify Developer Dashboard requires exact, preferably HTTPS redirect URIs.

**Solution Implemented:**
- Dynamic `redirect_uri: location.origin + location.pathname` in `app.js` (works for localhost HTTP dev + HTTPS deploys).
- Netlify SPA redirects and security headers in `netlify.toml`.

**Setup Steps:**
1. Deploy to Netlify: `netlify deploy --prod --dir=.` → Get HTTPS URL (e.g., `https://your-app.netlify.app`).
2. Spotify Dashboard > Edit App > Add Redirect URI: `https://your-app.netlify.app` (exact, no trailing slash).
3. Test: Paste Client ID, connect on deployed site.

**Verification:**
- Local: `http://localhost:3000/` (dev OK).
- Prod: HTTPS + exact path match.

**Repo Status:** Pushed to `https://github.com/gitOmer-ops/music-mirror` (master clean).
