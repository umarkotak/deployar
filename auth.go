package main

import (
	"encoding/base64"
	"errors"
	"net/http"
	"strings"
)

// AuthMiddleware validates basic auth credentials
func (app *App) AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Check if setup is needed
		if len(app.users) == 0 {
			respondJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "Setup required"})
			return
		}

		username, password, ok := parseBasicAuth(r.Header.Get("Authorization"))
		if !ok {
			w.Header().Set("WWW-Authenticate", `Basic realm="Deployar"`)
			respondJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "Authentication required"})
			return
		}

		user, exists := app.users[username]
		if !exists || user.Password != password {
			w.Header().Set("WWW-Authenticate", `Basic realm="Deployar"`)
			respondJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "Invalid credentials"})
			return
		}

		// Authentication successful
		next.ServeHTTP(w, r)
	})
}

// parseBasicAuth parses HTTP Basic Authentication header
func parseBasicAuth(authHeader string) (username, password string, ok bool) {
	if authHeader == "" {
		return "", "", false
	}

	const prefix = "Basic "
	if !strings.HasPrefix(authHeader, prefix) {
		return "", "", false
	}

	encoded := authHeader[len(prefix):]
	decoded, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return "", "", false
	}

	credentials := string(decoded)
	colonIndex := strings.Index(credentials, ":")
	if colonIndex == -1 {
		return "", "", false
	}

	username = credentials[:colonIndex]
	password = credentials[colonIndex+1:]
	return username, password, true
}

// validatePassword performs basic password validation
func validatePassword(password string) error {
	if len(password) < 4 {
		return errors.New("Password must be at least 4 characters")
	}
	return nil
}

// validateUsername performs basic username validation
func validateUsername(username string) error {
	if len(username) < 3 {
		return errors.New("Username must be at least 3 characters")
	}
	if strings.Contains(username, ":") {
		return errors.New("Username cannot contain colon")
	}
	return nil
}
