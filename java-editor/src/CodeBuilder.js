import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function CodeBuilder() {
  const [blocks, setBlocks] = useState([
    { code: "", isEditable: false },
  ]);
  const navigate = useNavigate();

  const handleChange = (index, field, value) => {
    const newBlocks = [...blocks];
    newBlocks[index][field] = value;
    setBlocks(newBlocks);
  };

  const addBlock = () => {
    setBlocks([...blocks, { code: "", isEditable: false }]);
  };

  const generateCode = () => {
    const codeParts = blocks.map((block, i) => {
      if (block.isEditable) {
        return `// --- START EDITABLE BLOCK ${i + 1} ---\n${block.code}\n// --- FREEZE BLOCK ${i + 1} ---`;
      } else {
        return block.code;
      }
    });

    const generatedCode = codeParts.join("\n\n");

    localStorage.setItem("dynamicCode", generatedCode);
    navigate("/editor");
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Code Builder</h2>
      {blocks.map((block, index) => (
        <div key={index} style={{ marginBottom: "20px" }}>
          <textarea
            rows={5}
            cols={80}
            value={block.code}
            onChange={(e) => handleChange(index, "code", e.target.value)}
          />
          <br />
          <label>
            <input
              type="checkbox"
              checked={block.isEditable}
              onChange={(e) => handleChange(index, "isEditable", e.target.checked)}
            />
            Editable
          </label>
          <label style={{ marginLeft: "10px" }}>
            <input
              type="checkbox"
              checked={!block.isEditable}
              onChange={(e) =>
                handleChange(index, "isEditable", !e.target.checked)
              }
            />
            Freeze
          </label>
        </div>
      ))}
      <button onClick={addBlock}>Add New Block</button>
      <br />
      <br />
      <button onClick={generateCode}>Generate Code</button>
    </div>
  );
}

export default CodeBuilder;
