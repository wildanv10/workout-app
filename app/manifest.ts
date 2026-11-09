import type { MetadataRoute } from 'next';

/** Served at /manifest.webmanifest, so the app can be installed to a phone. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Workout',
    short_name: 'Workout',
    description:
      'Pick the muscles you want to train and the equipment you have, and get the exercises you can actually do.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    // Matches the app surface and the light theme-color in the root layout.
    background_color: '#ffffff',
    theme_color: '#ffffff',
    categories: ['health', 'fitness', 'sports'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // The glyph sits inside the safe zone, so the same art masks cleanly.
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
