package main

import (
	"bytes"
	"fmt"
	"os/exec"
	"strings"
	"time"

	"github.com/google/uuid"
)

// Executor manages command execution
type Executor struct {
	storage    *Storage
	executions map[string]*Execution
}

// NewExecutor creates a new executor instance
func NewExecutor(storage *Storage) *Executor {
	executions, err := storage.LoadExecutions()
	if err != nil {
		executions = make(map[string]*Execution)
	}

	return &Executor{
		storage:    storage,
		executions: executions,
	}
}

// Execute runs a command and records the execution
func (e *Executor) Execute(workdir, command, commandID, commandName, username string) (*Execution, error) {
	execution := &Execution{
		ID:         uuid.New().String(),
		CommandID:  commandID,
		Name:       commandName,
		Workdir:    workdir,
		Command:    command,
		Status:     "running",
		ExecutedBy: username,
		StartedAt:  time.Now(),
	}

	// Save initial execution state
	e.executions[execution.ID] = execution
	e.storage.SaveExecutions(e.executions)

	// Execute command in background
	go e.runCommand(execution)

	return execution, nil
}

// runCommand executes the actual command
func (e *Executor) runCommand(execution *Execution) {
	var stdout, stderr bytes.Buffer

	// Parse command - support shell commands with pipes, etc.
	cmd := exec.Command("sh", "-c", execution.Command)
	cmd.Dir = execution.Workdir
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	// Run the command
	err := cmd.Run()

	// Update execution record
	execution.EndedAt = time.Now()
	execution.Duration = execution.EndedAt.Sub(execution.StartedAt).String()

	// Combine stdout and stderr
	output := stdout.String()
	if stderr.Len() > 0 {
		if len(output) > 0 {
			output += "\n"
		}
		output += stderr.String()
	}
	execution.Output = output

	if err != nil {
		execution.Status = "failed"
		if exitErr, ok := err.(*exec.ExitError); ok {
			execution.ExitCode = exitErr.ExitCode()
		} else {
			execution.ExitCode = 1
			execution.Output += fmt.Sprintf("\nError: %v", err)
		}
	} else {
		execution.Status = "success"
		execution.ExitCode = 0
	}

	// Save final execution state
	e.executions[execution.ID] = execution
	e.storage.SaveExecutions(e.executions)
}

// GetExecution retrieves an execution by ID
func (e *Executor) GetExecution(id string) (*Execution, bool) {
	exec, ok := e.executions[id]
	return exec, ok
}

// GetAllExecutions returns all executions sorted by start time (newest first)
func (e *Executor) GetAllExecutions() []*Execution {
	execList := make([]*Execution, 0, len(e.executions))
	for _, exec := range e.executions {
		execList = append(execList, exec)
	}

	// Sort by started time (newest first)
	for i := 0; i < len(execList)-1; i++ {
		for j := i + 1; j < len(execList); j++ {
			if execList[i].StartedAt.Before(execList[j].StartedAt) {
				execList[i], execList[j] = execList[j], execList[i]
			}
		}
	}

	return execList
}

// GetRecentExecutions returns the N most recent executions
func (e *Executor) GetRecentExecutions(limit int) []*Execution {
	all := e.GetAllExecutions()
	if len(all) <= limit {
		return all
	}
	return all[:limit]
}

// DeleteExecution removes an execution from history
func (e *Executor) DeleteExecution(id string) bool {
	if _, ok := e.executions[id]; !ok {
		return false
	}
	delete(e.executions, id)
	e.storage.SaveExecutions(e.executions)
	return true
}

// ClearExecutions removes all execution history
func (e *Executor) ClearExecutions() {
	e.executions = make(map[string]*Execution)
	e.storage.SaveExecutions(e.executions)
}

// ValidateCommand checks if a command is valid
func ValidateCommand(workdir, command string) error {
	if strings.TrimSpace(command) == "" {
		return fmt.Errorf("command cannot be empty")
	}
	if strings.TrimSpace(workdir) == "" {
		return fmt.Errorf("workdir cannot be empty")
	}
	return nil
}
