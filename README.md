# Deployar

🚀 **Deployar** is a modern deployment management tool that allows you to execute and manage command-line operations through a beautiful web interface.

## Features

- **Quick Command Execution**: Run commands directly with custom working directories
- **Saved Commands**: Register and reuse frequently used deployment commands
- **Execution History**: Track all command executions with timestamps and output
- **Real-time Updates**: Automatic refresh of execution status
- **Modern UI**: Beautiful dark-themed interface with glassmorphic design
- **Command Tagging**: Organize commands with custom tags
- **Output Capture**: View complete stdout/stderr from executions

## Installation

### Prerequisites

- Go 1.21 or higher

### Setup

1. Clone or download this repository
2. Navigate to the project directory:
   ```bash
   cd deployar
   ```

3. Install dependencies:
   ```bash
   go mod download
   ```

4. Run the application:
   ```bash
   go run .
   ```

5. Open your browser and navigate to:
   ```
   http://localhost:8080
   ```

## Usage

### Quick Execute

1. Enter a working directory (e.g., `/app/identity` or `.` for current directory)
2. Enter your command (e.g., `make build`)
3. Click "Execute Command"

### Save Commands

1. Click "Add Command" button
2. Fill in the command details:
   - **Name**: A descriptive name (e.g., "Build Identity Service")
   - **Description**: Optional description
   - **Working Directory**: Where the command should run
   - **Command**: The actual command to execute
   - **Tags**: Optional comma-separated tags
3. Click "Save Command"

### Run Saved Commands

- Click the "Run" button next to any saved command
- The command will execute with its configured settings

### View Execution History

- All executions appear in the "Execution History" section
- Click any execution to view detailed output
- Status indicators show: Running ⏳, Success ✅, Failed ❌

## API Documentation

### Execute Command

```bash
POST /api/execute
Content-Type: application/json

{
  "workdir": "/app/identity",
  "command": "make build"
}
```

### Register Command

```bash
POST /api/commands
Content-Type: application/json

{
  "name": "Build Identity",
  "description": "Build the identity service",
  "workdir": "/app/identity",
  "command": "make build",
  "tags": ["build", "identity"]
}
```

### List Commands

```bash
GET /api/commands
```

### Execute Saved Command

```bash
POST /api/commands/{id}/execute
```

### Get Execution History

```bash
GET /api/executions
```

### Get Execution Details

```bash
GET /api/executions/{id}
```

## Data Storage

All data is stored in JSON files in the project directory:

- `commands.json`: Saved commands
- `executions.json`: Execution history

## Security Considerations

⚠️ **Important**: This application executes arbitrary commands on the host machine. It should only be run in trusted environments (localhost, internal networks).

**Do not expose this application to the public internet without implementing proper authentication and authorization.**

## Configuration

The application uses port 8080 by default. You can change this by setting the `PORT` environment variable:

```bash
PORT=3000 go run .
```

## Development

### Project Structure

```
deployar/
├── main.go          # HTTP server and routing
├── models.go        # Data structures
├── storage.go       # JSON persistence
├── executor.go      # Command execution
├── handlers.go      # API handlers
├── static/          # Web UI
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── commands.json    # Saved commands (created at runtime)
└── executions.json  # Execution history (created at runtime)
```

### Technologies Used

- **Backend**: Go with gorilla/mux router
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Storage**: JSON file-based persistence
- **Design**: Glassmorphism, dark theme, animated gradients

## License

MIT License - Feel free to use this project for your deployment needs!

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests.
