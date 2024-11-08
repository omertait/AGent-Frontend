import React, { useState, useEffect, useRef  } from 'react';
import './EditTask.css'; 



const EditTask = ({ editNode, setEditNode, onSaveEdit ,agents}) => {
  const [steps, setSteps] = useState(editNode.data.steps || []);
  const [toolsOptions, setToolsOptions] = useState([]);
  const [showPromptHelp, setShowPromptHelp] = useState(false);
  const textareaRefs = useRef([]);


  const specialStrings = ['{task_input}', '{last_step_result}', '{memory["user_input"]}', '{memory["conversation_history"]}', '{memory}'];

  const highlightSpecialStrings = (text) => {
    // Safeguard against undefined or null text
    if (!text) return <span>{text || ''}</span>;
  
    // Escape basic special strings for regex
    const staticSpecialStrings = specialStrings
      .filter((str) => !str.includes('[\'') && !str.includes('[\"')) // Exclude dynamic memory forms
      .map((str) => str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')); // Escape special characters
  
    // Regex for dynamic memory keys like {memory['key']} or {memory["key"]}
    const dynamicMemoryPattern = '\\{memory\\[(["\']).+?\\1\\]}';
  
    // Combine static and dynamic patterns into one regex
    const combinedPattern = new RegExp(`(${[...staticSpecialStrings, dynamicMemoryPattern].join('|')})`, 'g');
  
    // Split the text by the regex and filter out empty parts
    const parts = (text.split(combinedPattern) || []).filter((part) => typeof part === 'string' && part.trim() !== '');
  
    // Highlight matched parts
    return parts.map((part, index) => {
      // Test if part matches either static or dynamic patterns
      if (new RegExp(dynamicMemoryPattern).test(part) || staticSpecialStrings.some((str) => new RegExp(`^${str}$`).test(part))) {
        return (
          <span key={index} className="special-string">
            {part}
          </span>
        );
      }
      // Return plain text for unmatched parts
      return <span key={index}>{part}</span>;
    });
  };
  


  // make sure that the highlighted-text div width and height are the same as the textarea every time the textarea resizes
  const syncScroll = (index) => {
    const textarea = textareaRefs.current[index];
    const highlightedText = textarea.nextSibling;
    highlightedText.scrollTop = textarea.scrollTop;
    highlightedText.scrollLeft = textarea.scrollLeft;
  };

  const syncSize = (index) => {
    const textarea = textareaRefs.current[index];
    if (!textarea) return; // Safeguard against null or undefined refs
    const highlightedText = textarea.nextSibling;
    if (!highlightedText) return; // Safeguard against null or undefined sibling
    
    highlightedText.style.width = `${textarea.clientWidth}px`;
    highlightedText.style.height = `${textarea.clientHeight}px`;
  };

  const resizeTextarea = (index) => {
    const textarea = textareaRefs.current[index];
    if (!textarea) return; // Safeguard against null or undefined refs
    textarea.style.height = 'auto'; // Reset height to calculate scrollHeight
    textarea.style.height = `${textarea.scrollHeight}px`; // Set to content height
    // add 1px buffer
    textarea.style.height = `${textarea.scrollHeight + 1}px`;
    syncSize(index); // Ensure overlay is synced
  };
  
 

  const handleStepChange = (index, field, value) => {
    const updatedSteps = [...steps];
    updatedSteps[index] = { ...updatedSteps[index], [field]: value };
    setSteps(updatedSteps);
    setEditNode({ ...editNode, data: { ...editNode.data, steps: updatedSteps } });
  };

  const addStep = () => {
    // setSteps([...steps, { type: '', update_memory_func: '', memory_arg: '', tool: '', input_data_func: '', messages: '', model: 'gpt-3.5-turbo' }]);
    setSteps([...steps, { type: ''}]);

  };

  const removeStep = (index) => {
    const updatedSteps = steps.filter((_, i) => i !== index);
    setSteps(updatedSteps);
    setEditNode({ ...editNode, data: { ...editNode.data, steps: updatedSteps } });
  };

  useEffect(() => {
    const tools = agents.filter(agent => agent.name === editNode.data.agent)[0]?.tools || [];    
    setToolsOptions(tools);
    steps.forEach((step, index) => {
      if (step.type === 'tool') {
        if (tools.length > 0) {
          handleStepChange(index, 'tool_name', tools[0]);
        }
      }
    });
  }, [editNode.data.agent, agents]);

  const HelpPopup = () => (
    <div className="help-popup-overlay">
      <div className="help-popup-content">
        <h5>How to fill the prompt</h5>
        <p>Write the prompt for the LLM. You can use special keywords:</p>
        <ul>
          <li><strong>{'{task_input}'}</strong>: Refers to the initial value passed to the task. If this is the first task, it refers to the user input.</li>
          <li><strong>{'{last_step_result}'}</strong>: Refers to the value passed from the last step within the task. If this is the first step, it's None, so avoid using it in that case.</li>
          <li><strong>{'{memory}'}</strong>: Refers to the object containing the conversation memory</li>
          <li><strong>{'{memory["user_input"]}'}</strong>: Refers to the user's input triggered this workflow</li>
          <li><strong>{'{memory["conversation_history"]}'}</strong>: Refers to the list containing the conversation messages</li>
        </ul>
        <p>Example: "act as a private tutor and responed to the following: {'{task_input}'}\n\ncontext:\nquestion's answer: {'{last_step_result}'}."</p>
        <button onClick={() => setShowPromptHelp(false)}>Close</button>
      </div>
    </div>
  );

  return (
    <div className="edit-modal">
      <h3>Edit Task</h3>
      <div className="form-group">
        <label>Start Node</label>
        <input
          type='checkbox'
          checked={editNode.data.isStartNode}
          onChange={(e) => setEditNode({ ...editNode, data: { ...editNode.data, isStartNode: e.target.checked } })}
        />
      </div>
      
      <div className="form-group">
        <label>Task Name</label>
        <input
          type="text"
          value={editNode.data.taskName}
          onChange={(e) => setEditNode({ ...editNode, data: { ...editNode.data, taskName: e.target.value } })}
        />
      </div>
      
      <div className="form-group">
        <label>Assigned Agent</label>
        <select value={editNode.data.agent ? editNode.data.agent : 'Unassigned'}
        
          onChange={(e) => setEditNode({ ...editNode, data: { ...editNode.data, agent: e.target.value } })} >
            {agents.map((agent) => (
                <option key={agent.id} value={agent.name}>{agent.name}</option>
            ))}
            {agents.length === 0 && <option value="Unassigned"  hidden>No Agents Available</option>}
        </select>
      </div>
      <h4>Steps</h4>
      {steps.map((step, index) => (
        <div key={index} className="step">
          <div className="form-group">
            <label>Step Type</label>
            <select
              value={step.type}
              onChange={(e) => handleStepChange(index, 'type', e.target.value)}
            >
              <option value="">Select Step Type</option>
              <option value="update_memory">Update Memory</option>
              <option value="tool">Tool</option>
              <option value="llm_interact">LLM Interact</option>
            </select>
          </div>

          {step.type === 'update_memory' && (
            <>
              <div className="form-group">
                <label>Memory Arg</label>
                <input
                  type="text"
                  value={step.memory_arg}
                  onChange={(e) => handleStepChange(index, 'memory_arg', e.target.value)}
                  placeholder="Memory Arg"
                />
              </div>
            </>
          )}

          {step.type === 'tool' && (
            <>
              <div className="form-group">
                <label>Tool</label>
                <select value={toolsOptions.includes(step.tool) ? step.tool : 'Unassigned'}
                    onChange={(e) => handleStepChange(index, 'tool_name', e.target.value)}>
                        
                        {toolsOptions.map((tool) => (
                            <option key={tool} value={tool}>{tool}</option>
                        ))}
                        <option value="Unassigned"  hidden>No Tools Available</option>
                        
                </select>
              </div>
              <div className="form-group">
                <label>Input Data Function</label>
                <textarea
                  value={step.input_data_func}
                  onChange={(e) => handleStepChange(index, 'input_data_func', e.target.value)}
                  placeholder="Input Data Function"
                />
              </div>
            </>
          )}

          {step.type === 'llm_interact' && (
            <>
              <div className="form-group">
                <label>prompt
                <button className="help-button" onClick={() => setShowPromptHelp(!showPromptHelp)}>?</button>
                </label>
                {showPromptHelp && <HelpPopup />} 
                <div className="textarea-container">
                  <div className="highlighted-text">
                    {highlightSpecialStrings(step.promptTemplate || '')}
                  </div>
                  <textarea
                    className="textarea"
                    value={step.promptTemplate}
                    onScroll={() => syncScroll(index)}
                    onInput={() => resizeTextarea(index)}
                    ref={(el) => {
                      if (el && el !== textareaRefs.current[index]) {
                        textareaRefs.current[index] = el;
                        setTimeout(() => resizeTextarea(index), 0); // Defer resize to after DOM update
                      }
                    }}
                    onChange={(e) => handleStepChange(index, 'promptTemplate', e.target.value)}
                    placeholder="Prompt for Agent - e.g. 'respond to the following: {task_input}'"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Model</label>
                <input
                  type="text"
                  value={step.model ? step.model : 'gpt-4o-mini'}
                  onChange={(e) => handleStepChange(index, 'model', e.target.value)}
                  placeholder="Model"
                />
              </div>
            </>
          )}
          
          <button className="remove-step" onClick={() => removeStep(index)}>Remove Step</button>
        </div>
      ))}
      <button className="add-step" onClick={addStep}>Add Step</button>
      <div className='actions'>
        <div className='actions-container'>
            <button className="save" onClick={() => onSaveEdit(editNode.id, editNode.data.isStartNode, editNode.data.taskName, editNode.data.agent, editNode.data.steps)}>Save</button>
            <button className="cancel" onClick={() => setEditNode(null)}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default EditTask;
