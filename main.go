package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/gorilla/mux"
)

func main() {
	// Create application
	app := NewApp()

	// Setup router
	router := mux.NewRouter()

	// Public auth routes (no middleware)
	router.HandleFunc("/api/auth/setup", app.CheckSetupHandler).Methods("GET")
	router.HandleFunc("/api/auth/setup", app.SetupHandler).Methods("POST")
	router.HandleFunc("/api/auth/login", app.LoginHandler).Methods("POST")

	// API routes (protected with auth middleware)
	api := router.PathPrefix("/api").Subrouter()
	api.Use(app.AuthMiddleware)

	// Auth endpoints (protected)
	api.HandleFunc("/auth/logout", app.LogoutHandler).Methods("POST")
	api.HandleFunc("/auth/me", app.GetCurrentUserHandler).Methods("GET")

	// User management endpoints (protected)
	api.HandleFunc("/users", app.ListUsersHandler).Methods("GET")
	api.HandleFunc("/users", app.CreateUserHandler).Methods("POST")
	api.HandleFunc("/users/{username}", app.DeleteUserHandler).Methods("DELETE")

	// Execute commands
	api.HandleFunc("/execute", app.ExecuteHandler).Methods("POST")

	// Command management
	api.HandleFunc("/commands", app.CreateCommandHandler).Methods("POST")
	api.HandleFunc("/commands", app.ListCommandsHandler).Methods("GET")
	api.HandleFunc("/commands/{id}", app.GetCommandHandler).Methods("GET")
	api.HandleFunc("/commands/{id}", app.UpdateCommandHandler).Methods("PUT")
	api.HandleFunc("/commands/{id}", app.DeleteCommandHandler).Methods("DELETE")
	api.HandleFunc("/commands/{id}/execute", app.ExecuteCommandHandler).Methods("POST")

	// Execution history
	api.HandleFunc("/executions", app.ListExecutionsHandler).Methods("GET")
	api.HandleFunc("/executions/{id}", app.GetExecutionHandler).Methods("GET")
	api.HandleFunc("/executions/{id}", app.DeleteExecutionHandler).Methods("DELETE")
	api.HandleFunc("/executions/clear", app.ClearExecutionsHandler).Methods("POST")

	// Serve static files
	router.PathPrefix("/").Handler(http.FileServer(http.Dir("./static")))

	// Add CORS middleware
	router.Use(corsMiddleware)

	// Start server
	port := "3029"
	if envPort := os.Getenv("PORT"); envPort != "" {
		port = envPort
	}

	server := &http.Server{
		Addr:    ":" + port,
		Handler: router,
	}

	// Graceful shutdown
	go func() {
		sigint := make(chan os.Signal, 1)
		signal.Notify(sigint, os.Interrupt, syscall.SIGTERM)
		<-sigint

		log.Println("\nShutting down server...")
		if err := server.Close(); err != nil {
			log.Printf("Server shutdown error: %v\n", err)
		}
	}()

	// Start listening
	fmt.Printf("🚀 Deployar server started on http://localhost:%s\n", port)
	fmt.Println("📁 Data stored in: commands.json, executions.json")
	fmt.Println("Press Ctrl+C to stop")

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server error: %v\n", err)
	}
}

// corsMiddleware adds CORS headers
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
