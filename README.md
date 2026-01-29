# Amp Task Management

A web UI to visualize and manage Amp `task_list` tasks with full CRUD operations.

![Amp Task Viewer Screenshot](https://via.placeholder.com/800x400?text=Amp+Task+Viewer)

## 🔍 Research Findings

Based on network monitoring, Amp's `task_list` tool stores tasks **on the Amp server** (ampcode.com), not locally. 

### API Endpoint

```
POST https://ampcode.com/api/internal?{method}
```

### Available Methods

| Method | Description | Required Params |
|--------|-------------|-----------------|
| `listTasks` | List all tasks | `limit` (optional) |
| `getTask` | Get single task | `taskID` |
| `createTask` | Create new task | `title` |
| `updateTask` | Update existing task | `taskID` |
| `deleteTask` | Soft delete task | `taskID` |

### Request Format

```json
{
  "method": "listTasks",
  "params": {
    "limit": 100,
    "status": "open",
    "repoURL": "https://github.com/...",
    "ready": true
  }
}
```

### Task Schema

```typescript
interface Task {
  id: string;
  userID: string;
  repoURL: string | null;
  title: string;
  description: string | null;
  status: 'open' | 'in_progress' | 'completed';
  dependsOn: string[];
  parentID: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
```

### Authentication

- Bearer token from `~/.local/share/amp/secrets.json`
- Key: `apiKey@https://ampcode.com/` or `apiKey`

## 🚀 Quick Start

### 1. Start the server

```bash
node ~/.local/share/amp-task-viewer/server.js
```

Or if cloned from GitHub:

```bash
cd amp-task-management
node server.js
```

### 2. Open in browser

```
http://localhost:3847
```

## 📋 REST API

The server exposes a REST API that proxies requests to ampcode.com:

### List Tasks
```bash
GET /api/tasks?limit=100&status=open&ready=true
```

### Get Single Task
```bash
GET /api/tasks/85
```

### Create Task
```bash
POST /api/tasks
Content-Type: application/json

{
  "title": "My new task",
  "description": "Task description",
  "status": "open",
  "repoURL": "https://github.com/user/repo",
  "dependsOn": ["84"]
}
```

### Update Task
```bash
PUT /api/tasks/85
Content-Type: application/json

{
  "status": "completed",
  "description": "Updated description"
}
```

### Delete Task
```bash
DELETE /api/tasks/85
```

## ✨ Features

- **📋 List View**: See all tasks in a clean card layout
- **📊 Graph View**: Visualize task dependencies with Mermaid diagrams
- **🔍 Filters**: Filter by status, repository, or search text
- **📈 Stats**: Quick overview of task counts by status
- **🔎 Detail Modal**: Click any task to see full details
- **⌨️ Keyboard Shortcuts**:
  - `R` - Refresh tasks
  - `G` - Toggle graph view
  - `Esc` - Close modal

## 📁 Project Structure

```
amp-task-management/
├── index.html        # Frontend UI (Tailwind + Mermaid)
├── server.js         # Backend proxy to Amp API
├── README.md         # This file
├── package.json      # NPM package config
├── .gitignore        # Git ignore rules
└── .agents/          # UI-UX skill data (optional)
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3847` |
| `AMP_API_KEY` | Override API key | From secrets file |

### Secrets Location

The server reads the Amp API key from:
```
~/.local/share/amp/secrets.json
```

## 🎨 Design System

Built with the UI-UX Pro Max skill recommendations:

- **Style**: Dark mode, developer-focused
- **Colors**: Slate/Blue palette with amber/green/blue status colors
- **Typography**: JetBrains Mono (code) + IBM Plex Sans (UI)
- **Framework**: Tailwind CSS

## 🔄 How It Works

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Browser     │────▶│    server.js    │────▶│  ampcode.com    │
│  (localhost)    │◀────│    (proxy)      │◀────│  (task storage) │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

1. Frontend makes requests to local proxy server
2. Server reads API key from `~/.local/share/amp/secrets.json`
3. Server forwards requests to `ampcode.com/api/internal`
4. Response is returned to frontend for display

## 📝 License

MIT - Use freely!

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🙏 Acknowledgments

- [Amp](https://ampcode.com) - The frontier coding agent
- [Tailwind CSS](https://tailwindcss.com) - Utility-first CSS
- [Mermaid](https://mermaid.js.org) - Diagram library
