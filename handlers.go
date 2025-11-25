package main

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

// App holds application dependencies
type App struct {
	storage  *Storage
	executor *Executor
	commands map[string]*Command
}

// NewApp creates a new application instance
func NewApp() *App {
	storage := NewStorage()
	executor := NewExecutor(storage)

	commands, err := storage.LoadCommands()
	if err != nil {
		commands = make(map[string]*Command)
	}

	return &App{
		storage:  storage,
		executor: executor,
		commands: commands,
	}
}

// ExecuteHandler handles POST /api/execute
func (app *App) ExecuteHandler(w http.ResponseWriter, r *http.Request) {
	var req ExecuteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, ErrorResponse{Error: "Invalid request body"})
		return
	}

	if err := ValidateCommand(req.Workdir, req.Command); err != nil {
		respondJSON(w, http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	execution, err := app.executor.Execute(req.Workdir, req.Command, "", "")
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, ExecuteResponse{
		ExecutionID: execution.ID,
		Status:      execution.Status,
		Message:     "Command execution started",
	})
}

// CreateCommandHandler handles POST /api/commands
func (app *App) CreateCommandHandler(w http.ResponseWriter, r *http.Request) {
	var cmd Command
	if err := json.NewDecoder(r.Body).Decode(&cmd); err != nil {
		respondJSON(w, http.StatusBadRequest, ErrorResponse{Error: "Invalid request body"})
		return
	}

	// Validate
	if cmd.Name == "" {
		respondJSON(w, http.StatusBadRequest, ErrorResponse{Error: "Command name is required"})
		return
	}
	if err := ValidateCommand(cmd.Workdir, cmd.Command); err != nil {
		respondJSON(w, http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	// Generate ID and timestamps
	cmd.ID = uuid.New().String()
	cmd.CreatedAt = time.Now()
	cmd.UpdatedAt = time.Now()

	// Save
	app.commands[cmd.ID] = &cmd
	if err := app.storage.SaveCommands(app.commands); err != nil {
		respondJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "Failed to save command"})
		return
	}

	respondJSON(w, http.StatusCreated, cmd)
}

// ListCommandsHandler handles GET /api/commands
func (app *App) ListCommandsHandler(w http.ResponseWriter, r *http.Request) {
	commands := make([]*Command, 0, len(app.commands))
	for _, cmd := range app.commands {
		commands = append(commands, cmd)
	}

	respondJSON(w, http.StatusOK, commands)
}

// GetCommandHandler handles GET /api/commands/:id
func (app *App) GetCommandHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	cmd, ok := app.commands[id]
	if !ok {
		respondJSON(w, http.StatusNotFound, ErrorResponse{Error: "Command not found"})
		return
	}

	respondJSON(w, http.StatusOK, cmd)
}

// DeleteCommandHandler handles DELETE /api/commands/:id
func (app *App) DeleteCommandHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	if _, ok := app.commands[id]; !ok {
		respondJSON(w, http.StatusNotFound, ErrorResponse{Error: "Command not found"})
		return
	}

	delete(app.commands, id)
	if err := app.storage.SaveCommands(app.commands); err != nil {
		respondJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "Failed to delete command"})
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Command deleted successfully"})
}

// UpdateCommandHandler handles PUT /api/commands/:id
func (app *App) UpdateCommandHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	existing, ok := app.commands[id]
	if !ok {
		respondJSON(w, http.StatusNotFound, ErrorResponse{Error: "Command not found"})
		return
	}

	var cmd Command
	if err := json.NewDecoder(r.Body).Decode(&cmd); err != nil {
		respondJSON(w, http.StatusBadRequest, ErrorResponse{Error: "Invalid request body"})
		return
	}

	// Validate
	if cmd.Name == "" {
		respondJSON(w, http.StatusBadRequest, ErrorResponse{Error: "Command name is required"})
		return
	}
	if err := ValidateCommand(cmd.Workdir, cmd.Command); err != nil {
		respondJSON(w, http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	// Update fields
	existing.Name = cmd.Name
	existing.Description = cmd.Description
	existing.Workdir = cmd.Workdir
	existing.Command = cmd.Command
	existing.Tags = cmd.Tags
	existing.UpdatedAt = time.Now()

	// Save
	if err := app.storage.SaveCommands(app.commands); err != nil {
		respondJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "Failed to update command"})
		return
	}

	respondJSON(w, http.StatusOK, existing)
}

// ExecuteCommandHandler handles POST /api/commands/:id/execute
func (app *App) ExecuteCommandHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	cmd, ok := app.commands[id]
	if !ok {
		respondJSON(w, http.StatusNotFound, ErrorResponse{Error: "Command not found"})
		return
	}

	execution, err := app.executor.Execute(cmd.Workdir, cmd.Command, cmd.ID, cmd.Name)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, ExecuteResponse{
		ExecutionID: execution.ID,
		Status:      execution.Status,
		Message:     "Command execution started",
	})
}

// ListExecutionsHandler handles GET /api/executions
func (app *App) ListExecutionsHandler(w http.ResponseWriter, r *http.Request) {
	executions := app.executor.GetAllExecutions()
	respondJSON(w, http.StatusOK, executions)
}

// GetExecutionHandler handles GET /api/executions/:id
func (app *App) GetExecutionHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	execution, ok := app.executor.GetExecution(id)
	if !ok {
		respondJSON(w, http.StatusNotFound, ErrorResponse{Error: "Execution not found"})
		return
	}

	respondJSON(w, http.StatusOK, execution)
}

// DeleteExecutionHandler handles DELETE /api/executions/:id
func (app *App) DeleteExecutionHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	if !app.executor.DeleteExecution(id) {
		respondJSON(w, http.StatusNotFound, ErrorResponse{Error: "Execution not found"})
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Execution deleted successfully"})
}

// ClearExecutionsHandler handles POST /api/executions/clear
func (app *App) ClearExecutionsHandler(w http.ResponseWriter, r *http.Request) {
	app.executor.ClearExecutions()
	respondJSON(w, http.StatusOK, map[string]string{"message": "All executions cleared"})
}

// respondJSON writes a JSON response
func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}
