# Node.js & Express Visual Handbook

An interactive handbook for learning Node.js and Express fundamentals through animated visualizations, guided explanations, and hands-on examples.

## What this project includes

This app is a React + TypeScript + Vite experience that covers core backend concepts such as:

- Node.js runtime fundamentals
- The event loop and async execution
- CommonJS vs ES Modules
- Core built-in modules
- npm and package management
- Raw HTTP versus Express
- Express middleware and routing
- REST API design
- Scaling, thread pools, streams, and database pooling

The content is organized into topic cards with visual simulators and explanatory sections, and the app also saves your completed topics and theme preference in local storage.

## Tech stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Motion for animations
- Lucide icons

## Run locally

Prerequisites: Node.js 18+.

1. Install dependencies:
   `npm install`
2. Start the development server:
   `npm run dev`
3. Open the app in your browser at:
   `http://localhost:3000`

## Build for production

```bash
npm run build
```

## Type check / lint

```bash
npm run lint
```

## Project structure

- `src/App.tsx` — app shell, topic selection, and persistence
- `src/components/` — sidebar, topic content, and visual simulators
- `src/data/topics.ts` — the handbook content and examples
- `src/types.ts` — shared TypeScript types

