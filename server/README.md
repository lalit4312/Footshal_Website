# Server setup

## Admin image uploads

Images are uploaded directly from the admin form to Cloudinary. The API signs upload requests after checking the admin session; the Cloudinary API secret must stay on the server and must never be added to client environment variables.

1. Create a Cloudinary account and copy its cloud name, API key, and API secret from the Cloudinary dashboard.
2. For local development, set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in `server/.env`. All three values are required together. Restart the API after changing them.
3. For Vercel, add those same three variables to the project's server/runtime environment variables and redeploy.
4. In the admin editor, select a tournament, team, player, or sponsor image field and choose a JPG, PNG, WebP, or GIF image up to 5 MB. Wait for the upload to finish before saving the record.

If Cloudinary is not configured, image uploads show a configuration error and other API features continue to work.
