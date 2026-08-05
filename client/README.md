# Team Management

A polished, editorial-style team management console built with React, Vite, and Tailwind CSS. This application provides a comprehensive suite of tools for tracking shifts, managing quarterly goals, sharing weekly updates, and maintaining a team directory.

## Features

- **Dashboard**: Real-time overview of team activity, goals, and upcoming shifts.
- **Team Directory**: Manage team member profiles, roles, skills, and active projects.
- **Goals Tracker**: A Kanban-style board for tracking quarterly objectives (Blogs and Videos) with drag-and-drop functionality.
- **Shift Logs**: Record and approve shift exceptions and worked hours.
- **Weekly Updates**: Share progress and project details for the week.
- **Ideas Portal**: A space for team members to submit and review new content ideas.
- **Global Filtering**: Filter the entire dashboard and all modules by team member.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS 4
- **State Management**: TanStack Query (React Query)
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Drag and Drop**: @hello-pangea/dnd
- **AI Integration**: Google Gemini API via `@google/genai`

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd team-management
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add your configuration (see `.env.example` for reference):
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   VITE_API_URL=your_backend_api_url
   ```

### Development

Start the development server:
```bash
npm run dev
```
The application will be available at `http://localhost:3000`.

### Production

Build the application for production:
```bash
npm run build
```
The build artifacts will be located in the `dist/` directory.

## Google AI Studio Integration

This application was developed and refined using **Google AI Studio Build**. It leverages the Gemini API for intelligent features and was built using natural language prompting to ensure a high-quality, production-ready interface.

For more information on Google AI Studio, visit [ai.studio](https://ai.studio).

## License

MIT
