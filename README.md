# MomFit - Fitness Community for Mothers

A supportive fitness community platform for mothers who want to prioritize their health and wellness while balancing family life.

## Features

- Community-based social platform
- Event management and RSVPs
- AI-powered recommendations and insights
- Direct messaging between members
- Profile customization
- Mobile-responsive design

## Deployment

### Vercel Deployment

1. Fork or clone this repository
2. Create a new project on [Vercel](https://vercel.com)
3. Connect your GitHub repository
4. Set up the following environment variables in Vercel:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key
5. Deploy!

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

Optional AI API keys:
```
VITE_GOOGLE_AI_API_KEY=your_google_ai_api_key_here
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_XAI_API_KEY=your_xai_api_key_here
VITE_GROQ_API_KEY=your_groq_api_key_here
VITE_COHERE_API_KEY=your_cohere_api_key_here
```

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Supabase (Auth, Database, Storage, Edge Functions)
- Capacitor (for mobile apps)