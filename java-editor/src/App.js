import React, { useRef, useState } from "react";
import MonacoEditor from "@monaco-editor/react";
import axios from "axios";

const fullInitialCode = `import java.io.*;
import java.util.*;

public class Main {

    public static void main(String[] args) {

        // --- START EDITABLE BLOCK 1 ---
        Scanner sc = new Scanner(System.in);
        // your code here - block 1

        // --- FREEZE BLOCK 1 ---
        System.out.println("Checkpoint 1");

        // --- START EDITABLE BLOCK 2 ---
        // your code here - block 2
        int x = sc.nextInt();

        // --- FREEZE BLOCK 2 ---
        System.out.println("Checkpoint 2");

        // --- START EDITABLE BLOCK 3 ---
        // your code here - block 3

        // --- FREEZE BLOCK 3 ---
        System.out.println("Checkpoint 3");
    }
}`;

function App() {
  const editorRef = useRef(null);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [decorations, setDecorations] = useState([]);

  // Load code from localStorage or fallback to default
  const initialCode = localStorage.getItem("dynamicCode") || fullInitialCode;

  const getEditableLines = (model) => {
    const editableLines = new Set();
    const lineCount = model.getLineCount();
    let inEditable = false;

    for (let i = 1; i <= lineCount; i++) {
      const lineText = model.getLineContent(i).trim();
      if (lineText.includes("// --- START EDITABLE BLOCK")) {
        inEditable = true;
        editableLines.add(i);
        continue;
      }
      if (lineText.includes("// --- FREEZE BLOCK")) {
        inEditable = false;
      }
      if (inEditable) {
        editableLines.add(i);
      }
    }
    return editableLines;
  };

  const applyDecorations = (editor, monaco, editableLines) => {
    const model = editor.getModel();
    const lineCount = model.getLineCount();
    const newDecorations = [];

    for (let i = 1; i <= lineCount; i++) {
      if (!editableLines.has(i)) {
        newDecorations.push({
          range: new monaco.Range(i, 1, i, 1),
          options: {
            isWholeLine: true,
            className: "read-only-line",
          },
        });
      }
    }
    setDecorations(editor.deltaDecorations(decorations, newDecorations));
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    const model = editor.getModel();
    let editableLines = getEditableLines(model);
    applyDecorations(editor, monaco, editableLines);

    const isEditableLine = (line) => editableLines.has(line);

    editor.onKeyDown((e) => {
      const pos = editor.getPosition();
      const line = pos.lineNumber;
      const isNavKey = [
        monaco.KeyCode.LeftArrow,
        monaco.KeyCode.RightArrow,
        monaco.KeyCode.UpArrow,
        monaco.KeyCode.DownArrow,
        monaco.KeyCode.PageDown,
        monaco.KeyCode.PageUp,
      ].includes(e.keyCode);

      if (!isEditableLine(line) && !isNavKey) {
        e.preventDefault();
        e.stopPropagation();
      }
    });

    editor.onDidChangeModelContent(() => {
      editableLines = getEditableLines(model);
      applyDecorations(editor, monaco, editableLines);
    });
  };

  const handleRunCode = async () => {
    const fullCode = editorRef.current.getValue();
    try {
      const response = await axios.post(
        "http://localhost:8080/run-java",
        JSON.stringify({ code: fullCode, input }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
      setOutput(response.data.stdout);
    } catch (error) {
      console.error("Error running the code:", error);
      setOutput("Error running the code.");
    }
  };

  return (
    <div className="App">
      <h1>Java Code Editor</h1>
      <MonacoEditor
        height="500px"
        language="java"
        value={initialCode}
        onMount={handleEditorDidMount}
        theme="vs-dark"
        options={{
          scrollBeyondLastLine: false,
          minimap: { enabled: false },
        }}
      />
      {/* Optional CSS for readonly lines */}
      {/* <style>{`
        .read-only-line {
          background-color: rgba(200, 200, 200, 0.1);
          color: #888;
        }
      `}</style> */}
      <h3>Input:</h3>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={5}
        cols={60}
      />
      <br />
      <button onClick={handleRunCode}>Run Code</button>
      <h3>Output:</h3>
      <pre>{output}</pre>
    </div>
  );
}

export default App;
