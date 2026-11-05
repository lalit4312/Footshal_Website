# Server setup

## Deploy on Vercel

The root `vercel.json` sends `/api/*` requests to the Node API function, serves existing static files first, and falls back to the client app for routes such as `/admin` and `/fixtures`. After pushing changes, wait for the Vercel deployment to finish before testing deep links.

In the Vercel project's server/runtime environment variables, configure:

- `MONGODB_URI`: the production MongoDB connection string.
- `JWT_SECRET`: a private random value with at least 32 characters.
- `CORS_ORIGINS`: the exact production site origin, for example `https://footshalwebsite.vercel.app` (no path or trailing slash). Add any custom domain or preview origins that need cross-origin access, separated by commas.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` if admin image uploads are needed.

Allow the Vercel deployment to reach the MongoDB Atlas cluster using the project's supported network access configuration. If the API reports `Database unavailable`, check the Vercel function logs and Atlas network access, credentials, and database user permissions. `GET /api/health` actively checks MongoDB connectivity and reports the result without returning connection details.

Redeploy after changing environment variables. Check `https://your-domain/api/health`, then directly open and refresh `/admin` and `/fixtures`.

## Admin image uploads

Images are uploaded directly from the admin form to Cloudinary. The API signs upload requests after checking the admin session; the Cloudinary API secret must stay on the server and must never be added to client environment variables.

1. Create a Cloudinary account and copy its cloud name, API key, and API secret from the Cloudinary dashboard.
2. For local development, set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in `server/.env`. All three values are required together. Restart the API after changing them.
3. For Vercel, add those same three variables to the project's server/runtime environment variables and redeploy.
4. In the admin editor, select a tournament, team, player, or sponsor image field and choose a JPG, PNG, WebP, or GIF image up to 5 MB. Wait for the upload to finish before saving the record.

If Cloudinary is not configured, image uploads show a configuration error and other API features continue to work.
