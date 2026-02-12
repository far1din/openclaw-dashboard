<div align="center">

# OpenNeet

**OpenNeet** is a modern, real-time dashboard designed for managing and interacting with [OpenClaw](https://openclaw.ai/) agents. Built with performance and user experience in mind, it provides a seamless interface for monitoring agent activities, managing sessions, and engaging in direct communication with your AI workforce.

<img src="public/logox.png" alt="OpenNeet Logo" width="369" />

</div>

## Features

- **Real-time Chat**: Engage with your agents instantly using a robust WebSocket connection.
- **Session Management**: Easily switch between active agent sessions to monitor different contexts.
- **Live Monitoring**: Watch agent thinking processes, tool executions, and responses as they happen.
- **Modern UI**: A polished interface built with the latest web technologies, featuring dark mode support and smooth animations.

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Components**: [Radix UI](https://www.radix-ui.com/) & [Shadcn UI](https://ui.shadcn.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

## Getting Started

### Prerequisites

- Node.js 18+ installed on your machine.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/openclaw-admin.git
   cd openclaw-admin
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   # or
   bun install
   ```

3. Configure environment variables:
   Create a `.env.local` file in the root directory and add the following:

   ```bash
   # Your VPS IP or Domain (e.g., api.my-agent.com)
   # For local dev with raw IP, use ws:// and the IP address
   NEXT_PUBLIC_VPS_URL="ws://127.0.0.1:18789"

   # Token generated via `openclaw tokens create`
   NEXT_PUBLIC_ADMIN_TOKEN="your_admin_token_here"
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Learn More

To learn more about the technologies used in this project, take a look at the following resources:

- [OpenClaw Getting Started](https://docs.openclaw.ai/start/getting-started) - set up and run OpenClaw.
- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Tailwind CSS Documentation](https://tailwindcss.com/docs) - learn about utility-first CSS.
- [Radix UI Documentation](https://www.radix-ui.com/docs/primitives/overview/introduction) - learn about accessible UI primitives.
