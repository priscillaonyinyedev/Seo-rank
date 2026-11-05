# SEO Rank Tracker

**SEO Rank Tracker** is an AI-powered SEO analyzer built with React, Vite, and Tailwind CSS. It provides instant SEO audits, performance scores, keyword analysis, and actionable recommendations for any website.

## Features

- **Instant SEO Audits:** Get comprehensive insights into your website's SEO performance.
- **Performance Scores:** Analyze page speed and Core Web Vitals.
- **Keyword Analysis:** Discover and optimize for relevant keywords.
- **Actionable Recommendations:** Receive step-by-step guidance to improve your rankings.
- **AI-Powered Insights:** Leverage AI to analyze content quality and structure.

## Tech Stack

- **Frontend:** React 19, React Router, Tailwind CSS 4
- **Icons:** Lucide React, React Simple Icons
- **Build Tool:** Vite
- **Language:** TypeScript

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/GreatStackDev/seo-rank-tracker.git
    ```
2. Navigate to the project directory:
    ```bash
    cd seo-rank-tracker
    ```
3. Install dependencies:
    ```bash
    npm install
    ```

### Running the Development Server

Start the Vite development server:

```bash
npm run dev
```

### Building for Production

Create a production build:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

## Deployment

The Vercel configuration in this repository deploys the Vite frontend. The API is a separate Express service in `seo-backend2`; it needs a Node host, a MongoDB database, Redis, and running `worker` and `scheduler` processes. Deploying only the frontend does not enable sign in, audits, or rank tracking.

For the frontend, set `VITE_API_URL` to the public API origin (for example, `https://api.example.com`) in the hosting provider's build environment. For the backend, configure `MONGO_URI`, `REDIS_URL`, a strong `JWT_SECRET`, and `CLIENT_ORIGIN` set to the deployed frontend origin. Start the API with `npm start`, and run `npm run worker` and `npm run scheduler` as persistent processes. See `seo-backend2/SETUP.md` for details.

Never commit `.env` files or production secrets. `.env.example` files contain placeholders only.

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for more details.

## Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before participating in our community.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
