# GymTrack Lite

This is a NextJS starter for a gym management application.

To get started, take a look at src/app/page.tsx.

## Deploying to Vercel

To deploy this project to Vercel, you can follow these steps:

1.  Push your code to a Git repository (e.g., GitHub, GitLab).
2.  Go to the Vercel dashboard and create a new project, importing your Git repository.
3.  Vercel will automatically detect that this is a Next.js project and configure the build settings.

### Environment Variables

Before deploying, you must add your Supabase credentials as environment variables in your Vercel project's settings.

Go to **Settings -> Environment Variables** in your Vercel project and add the following:

-   `NEXT_PUBLIC_SUPABASE_URL`: The URL of your Supabase project.
-   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: The `anon` public key for your Supabase project.
-   `SUPABASE_SERVICE_ROLE_KEY`: The `service_role` secret key for your Supabase project.

If you are using a custom SMTP server for sending emails, you will also need to add these secrets:

-   `SMTP_HOST`: Your SMTP server host.
-   `SMTP_PORT`: Your SMTP server port.
-   `SMTP_USER`: Your SMTP username.
-   `SMTP_PASS`: Your SMTP password.
-   `SMTP_FROM_EMAIL`: The "From" email address to use for system emails.

Once these are configured, trigger a new deployment on Vercel. Your app should build and go live!
