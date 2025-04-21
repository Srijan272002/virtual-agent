# AI Girlfriend Application

A Next.js application for creating personalized AI companion experiences.

## Tech Stack

- Next.js with TypeScript
- Tailwind CSS for styling
- Supabase for backend services
- Google Gemini API for AI capabilities

## Getting Started

First, install the dependencies:

```bash
npm install
```

### Environment Setup

1. Copy the environment template to create your local environment file:
   ```bash
   cp env.template .env.local
   ```

2. Update the following variables in your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
   - `GEMINI_API_KEY`: Your Google Gemini API key
   - Other optional variables as needed

### Setting up Supabase with Google OAuth

1. Create a Supabase project at [https://supabase.com](https://supabase.com)
2. Set up Google OAuth:
   - Go to the [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or use an existing one
   - Configure the OAuth consent screen
   - Create OAuth credentials (Web application type)
   - Add authorized JavaScript origins: `https://your-supabase-project.supabase.co`
   - Add authorized redirect URIs: `https://your-supabase-project.supabase.co/auth/v1/callback`
3. In your Supabase dashboard:
   - Go to Authentication > Providers
   - Enable Google provider
   - Add your Client ID and Client Secret from Google Cloud Console
4. Create a `.env.local` file with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Development Tools

- ESLint for code quality
- Prettier for code formatting
- Husky for pre-commit hooks

## Project Structure

- `src/app` - App Router pages and layouts
- `src/components` - Reusable UI components
- `src/lib` - Utility functions and shared code
- `src/types` - TypeScript type definitions

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
