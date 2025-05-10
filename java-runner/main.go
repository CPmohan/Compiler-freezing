
package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

const (
	codeDir    = "/tmp/code"     // Directory to store temporary code files
	outputFile = "Main.class"    // Name of the compiled Java class file
)

type RunRequest struct {
	Code  string `json:"code"`
	Input string `json:"input"`
}

type RunResponse struct {
	Stdout string `json:"stdout"`
}

func runJavaCode(w http.ResponseWriter, r *http.Request) {
	var req RunRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid JSON request", http.StatusBadRequest)
		return
	}

	// Create a unique directory for this request
	dir := filepath.Join(codeDir, fmt.Sprintf("%d", time.Now().UnixNano()))
	err = os.MkdirAll(dir, 0755)
	if err != nil {
		http.Error(w, "Failed to create directory", http.StatusInternalServerError)
		return
	}
	defer os.RemoveAll(dir) // Clean up temporary files

	// Save the Java code to a file
	codeFilePath := filepath.Join(dir, "Main.java")
	err = ioutil.WriteFile(codeFilePath, []byte(req.Code), 0644)
	if err != nil {
		http.Error(w, "Failed to save Java code", http.StatusInternalServerError)
		return
	}

	// Compile the Java code
	cmd := exec.Command("javac", "Main.java")
	cmd.Dir = dir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	err = cmd.Run()
	if err != nil {
		http.Error(w, "Failed to compile Java code", http.StatusInternalServerError)
		return
	}

	// Run the compiled Java program with input
	cmd = exec.Command("java", "Main")
	cmd.Dir = dir

	stdin, err := cmd.StdinPipe()
	if err != nil {
		http.Error(w, "Failed to get stdin pipe", http.StatusInternalServerError)
		return
	}

	stdoutPipe, err := cmd.StdoutPipe()
	if err != nil {
		http.Error(w, "Failed to get stdout pipe", http.StatusInternalServerError)
		return
	}

	stderrPipe, err := cmd.StderrPipe()
	if err != nil {
		http.Error(w, "Failed to get stderr pipe", http.StatusInternalServerError)
		return
	}

	err = cmd.Start()
	if err != nil {
		http.Error(w, "Failed to start Java program", http.StatusInternalServerError)
		return
	}

	input := strings.TrimSpace(req.Input)
	_, err = stdin.Write([]byte(input))
	if err != nil {
		http.Error(w, "Failed to write to stdin", http.StatusInternalServerError)
		return
	}
	stdin.Close()

	stdoutBytes, _ := ioutil.ReadAll(stdoutPipe)
	stderrBytes, _ := ioutil.ReadAll(stderrPipe)

	err = cmd.Wait()
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to run Java code: %s\n%s", err, string(stderrBytes)), http.StatusInternalServerError)
		return
	}

	output := append(stdoutBytes, stderrBytes...)

	// Return the output of the Java program as JSON
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	resp := RunResponse{Stdout: string(output)}
	jsonResp, err := json.Marshal(resp)
	if err != nil {
		http.Error(w, "Failed to marshal JSON response", http.StatusInternalServerError)
		return
	}
	w.Write(jsonResp)
}

func enableCors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func main() {
	// Ensure the temporary directory exists
	err := os.MkdirAll(codeDir, 0755)
	if err != nil {
		log.Fatal("Failed to create base directory:", err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/run-java", runJavaCode)

	fmt.Println("Server running on http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", enableCors(mux)))
}
