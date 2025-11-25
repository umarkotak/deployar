package main

import "time"

// Command represents a saved command template
type Command struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Workdir     string    `json:"workdir"`
	Command     string    `json:"command"`
	Tags        []string  `json:"tags"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Execution represents a command execution record
type Execution struct {
	ID         string    `json:"id"`
	CommandID  string    `json:"command_id,omitempty"` // Optional: link to saved command
	Name       string    `json:"name"`                 // Command name (if from saved command)
	Workdir    string    `json:"workdir"`
	Command    string    `json:"command"`
	Status     string    `json:"status"` // running, success, failed
	Output     string    `json:"output"`
	ExitCode   int       `json:"exit_code"`
	ExecutedBy string    `json:"executed_by"` // Username of executor
	StartedAt  time.Time `json:"started_at"`
	EndedAt    time.Time `json:"ended_at,omitempty"`
	Duration   string    `json:"duration,omitempty"`
}

// ExecuteRequest represents a request to execute a command
type ExecuteRequest struct {
	Workdir string `json:"workdir"`
	Command string `json:"command"`
}

// ExecuteResponse represents the response from executing a command
type ExecuteResponse struct {
	ExecutionID string `json:"execution_id"`
	Status      string `json:"status"`
	Message     string `json:"message"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error string `json:"error"`
}

// User represents a user account
type User struct {
	Username  string    `json:"username"`
	Password  string    `json:"password"` // Plain text for simplicity (NOT production ready)
	CreatedAt time.Time `json:"created_at"`
}

// SetupRequest represents initial setup request
type SetupRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// LoginRequest represents login credentials
type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// CreateUserRequest represents request to create new user
type CreateUserRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// UserResponse represents user data without password
type UserResponse struct {
	Username  string    `json:"username"`
	CreatedAt time.Time `json:"created_at"`
}
