import React, { useRef, useState } from "react";
import MonacoEditor from "@monaco-editor/react";
import axios from "axios";

const prefix = `import java.io.*;\nimport java.util.*;\n\npublic class Main {\n\n    public static void main(String[] args) {`;
const suffix = `\n    }\n}`;
const defaultUserCode = `\n        Scanner sc = new Scanner(System.in);\n        // your code here`;

function App() {
  const editorRef = useRef(null);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

  const fullInitialCode = prefix + defaultUserCode + suffix;

  const prefixLines = prefix.split("\n").length;
  const suffixLines = suffix.split("\n").length-1;
  // const editableStartLine = prefixLines + 1;

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Initial decorations
    const totalLines = editor.getModel().getLineCount();
    const suffixStartLine = totalLines - suffixLines + 1;

    const decorations = [];

    // Read-only: prefix lines
    decorations.push({
      range: new monaco.Range(1, 1, prefixLines, 1),
      options: {
        isWholeLine: true,
        className: "read-only-line",
        linesDecorationsClassName: "read-only-line-decoration",
      },
    });

    // Read-only: suffix lines
    decorations.push({
      range: new monaco.Range(suffixStartLine, 1, totalLines, 1),
      options: {
        isWholeLine: true,
        className: "read-only-line",
        linesDecorationsClassName: "read-only-line-decoration",
      },
    });

    editor.deltaDecorations([], decorations);

    // Block typing in read-only areas
    editor.onKeyDown((e) => {
      const pos = editor.getPosition();
      const line = pos.lineNumber;
      const column = pos.column;
      const total = editor.getModel().getLineCount();
      const suffixStart = total - suffixLines + 1;
      const editableStartLine = prefixLines + 1;
    
      const isNavKey = [
        monaco.KeyCode.LeftArrow,
        monaco.KeyCode.RightArrow,
        monaco.KeyCode.UpArrow,
        monaco.KeyCode.DownArrow,
        monaco.KeyCode.PageDown,
        monaco.KeyCode.PageUp,
      ].includes(e.keyCode);
    
      // Block typing and deleting in prefix/suffix
      if (line <= prefixLines || line >= suffixStart) {
        if (!isNavKey) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    
      // Specifically block Backspace on the first editable line if trying to move to prefix
      if (
        e.keyCode === monaco.KeyCode.Backspace &&
        line === editableStartLine &&
        column <= 1
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    });
    

    // Revert changes to read-only areas
    let isApplyingEdits = false; // flag to prevent recursive edits

    editor.onDidChangeModelContent((e) => {
      if (isApplyingEdits) return; // prevent recursive calls

      const model = editor.getModel();
      const total = model.getLineCount();
      const suffixStart = total - suffixLines + 1; // fix suffixStart calculation

      e.changes.forEach((change) => {
        const { range } = change;

        if (range.startLineNumber <= prefixLines) {
          const originalPrefix = prefix
            .split("\n")
            .slice(range.startLineNumber - 1, range.endLineNumber)
            .join("\n");
          isApplyingEdits = true;
          editor.executeEdits(null, [{ range, text: originalPrefix }]);
          isApplyingEdits = false;
        } else if (range.startLineNumber >= suffixStart) {
          const suffixArray = suffix.split("\n");
          const start = range.startLineNumber - suffixStart;
          const end = range.endLineNumber - suffixStart;
          const originalSuffix = suffixArray.slice(start, end + 1).join("\n");
          isApplyingEdits = true;
          editor.executeEdits(null, [{ range, text: originalSuffix }]);
          isApplyingEdits = false;
        }
      });
    });
  };

  const handleRunCode = async () => {
    const fullCode = editorRef.current.getValue();
    try {
      const response = await axios.post(
        "http://localhost:8080/run-java",
        JSON.stringify({
          code: fullCode,
          input,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
      setOutput(response.data.stdout);
    } catch (error) {
      console.error("Error running the code:", error);
      if (error.response?.data) {
        setOutput(`Error: ${error.response.data}`);
      } else {
        setOutput("Error running the code.");
      }
    }
  };

  return (
    <div className="App">
      <h1>Java Code Editor</h1>
      <MonacoEditor
        height="400px"
        width="1400px"
        language="java"
        value={fullInitialCode}
        onMount={handleEditorDidMount}
        theme="vs-dark"
        options={{
          readOnly: false,
          scrollBeyondLastLine: false,
          minimap: { enabled: false },
        }}
      />
      <style>
        {`
          .editable-line {
            background-color: rgba(178, 46, 23, 0.1);
          }
          .read-only-line {
            background-color: rgba(200, 200, 200, 0.2);
            color: #666;
          }
          .read-only-line-decoration {
            background-color: rgba(200, 200, 200, 0.2);
          }
        `}
      </style>
      <div>
        <h3>Input:</h3>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={5}
          cols={60}
          placeholder="Enter input for the program here"
        />
      </div>
      <button onClick={handleRunCode}>Run Code</button>
      <div>
        <h3>Output:</h3>
        <pre>{output}</pre>
      </div>
    </div>
  );
}

export default App;
