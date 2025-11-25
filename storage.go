package main

import (
	"encoding/json"
	"os"
	"sync"
)

const (
	commandsFile   = "commands.json"
	executionsFile = "executions.json"
	usersFile      = "users.json"
)

// Storage manages persistent data storage
type Storage struct {
	commandsMutex   sync.RWMutex
	executionsMutex sync.RWMutex
	usersMutex      sync.RWMutex
}

// NewStorage creates a new storage instance
func NewStorage() *Storage {
	return &Storage{}
}

// SaveCommands writes commands to JSON file
func (s *Storage) SaveCommands(commands map[string]*Command) error {
	s.commandsMutex.Lock()
	defer s.commandsMutex.Unlock()

	data, err := json.MarshalIndent(commands, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(commandsFile, data, 0644)
}

// LoadCommands reads commands from JSON file
func (s *Storage) LoadCommands() (map[string]*Command, error) {
	s.commandsMutex.RLock()
	defer s.commandsMutex.RUnlock()

	commands := make(map[string]*Command)

	data, err := os.ReadFile(commandsFile)
	if err != nil {
		if os.IsNotExist(err) {
			return commands, nil
		}
		return nil, err
	}

	if len(data) == 0 {
		return commands, nil
	}

	err = json.Unmarshal(data, &commands)
	return commands, err
}

// SaveExecutions writes executions to JSON file
func (s *Storage) SaveExecutions(executions map[string]*Execution) error {
	s.executionsMutex.Lock()
	defer s.executionsMutex.Unlock()

	data, err := json.MarshalIndent(executions, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(executionsFile, data, 0644)
}

// LoadExecutions reads executions from JSON file
func (s *Storage) LoadExecutions() (map[string]*Execution, error) {
	s.executionsMutex.RLock()
	defer s.executionsMutex.RUnlock()

	executions := make(map[string]*Execution)

	data, err := os.ReadFile(executionsFile)
	if err != nil {
		if os.IsNotExist(err) {
			return executions, nil
		}
		return nil, err
	}

	if len(data) == 0 {
		return executions, nil
	}

	err = json.Unmarshal(data, &executions)
	return executions, err
}

// SaveUsers writes users to JSON file
func (s *Storage) SaveUsers(users map[string]*User) error {
	s.usersMutex.Lock()
	defer s.usersMutex.Unlock()

	data, err := json.MarshalIndent(users, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(usersFile, data, 0644)
}

// LoadUsers reads users from JSON file
func (s *Storage) LoadUsers() (map[string]*User, error) {
	s.usersMutex.RLock()
	defer s.usersMutex.RUnlock()

	users := make(map[string]*User)

	data, err := os.ReadFile(usersFile)
	if err != nil {
		if os.IsNotExist(err) {
			return users, nil
		}
		return nil, err
	}

	if len(data) == 0 {
		return users, nil
	}

	err = json.Unmarshal(data, &users)
	return users, err
}
