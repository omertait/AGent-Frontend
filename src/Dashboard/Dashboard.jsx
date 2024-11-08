import React, { useState, useCallback, useRef } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import TaskNode from './components/TaskNode';
import './Dashboard.css';
import EditTask from './EditTask';
import GenerateWindow from './GenerateWindow';
import { checkIfGraphConnected } from './build';


const nodeTypes = [
  // Existing LLM Interact Node
  {
    type: 'LLM_interact',
    label: 'LLM Interact',
    data: {
      steps: [
        {
          type: "llm_interact",
          promptTemplate: "Respond to the following: {task_input}\n\nAct as a helpful assistant.",
          model: "gpt-4o-mini"
        }
      ]
    }
  },

  // 1. Memory Update Node
  {
    type: 'Memory_update',
    label: 'Update Memory',
    data: {
      steps: [
        {
          type: "update_memory",
          memory_arg: "user_preference"
        }
      ]
    }
  },

  // 2. Tool Usage Node
  {
    type: 'Math_tool_usage',
    label: 'Math Calculation',
    data: {
      steps: [
        {
          type: "tool",
          tool: "calculator",
          input_data_func: "{\"x\": int(task_input), \"y\": 2, \"operation\": \"add\"}"
        }
      ]
    }
  },

  // 3. LLM Interact Node with Common Template
  {
    type: 'Summarize_text',
    label: 'Summarize Text',
    data: {
      steps: [
        {
          type: "llm_interact",
          promptTemplate: "Summarize the following text into a concise and clear summary:\n\n{task_input}.",
          model: "gpt-4o"
        }
      ]
    }
  }
];


let id = 0;
const getId = () => `dndnode_${id++}`;

const nodesTypes = { customNode: TaskNode };

const Dashboard = ({
  nodes, setNodes, onNodesChange,
  edges, setEdges, onEdgesChange,
  agents, tools, setCurrentExampleIndex, currentExampleIndex
}) => {

  const [isGenWindowOpen, setGenWindowOpen] = useState(false);
  const [prompt, setPrompt] = useState('');

  const handleOpenGenWindow = () => setGenWindowOpen(true);
  const handleCloseGenWindow = () => setGenWindowOpen(false);

  const handleSubmit = (prompt) => {
    console.log('Submitting:', prompt);
    // Add your code here to send the prompt to your backend
    setGenWindowOpen(false);
  };

  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [editNode, setEditNode] = useState(null);
  

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed }}, eds)),
    []
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
  
      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');
  
      if (typeof type === 'undefined' || !type) {
        return;
      }
  
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });
  
      const nodeType = nodeTypes.find(n => n.label === type);
  
      // if there are no start nodes, set the first node as the start node
      const newNode = {
        id: getId(),
        type: 'customNode',
        position,
        data: {
          isStartNode: nodes.length === 0,
          taskName: `${type} Task`,
          agent: 'Assistent',
          ...nodeType.data,  // spread the data from the nodeTypes definition
        },
      };
  
      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, nodes]
  );

  const onNodeDoubleClick = useCallback((event, node) => {
    event.preventDefault();
    setEditNode(node);
  }, []);

  const onNodeContextMenu = useCallback((event, node) => {
    event.preventDefault();
    if (window.confirm('Are you sure you want to delete this task?')) {
      setNodes((nds) => nds.filter((n) => n.id !== node.id));
      setEdges((eds) => eds.filter((e) => e.source !== node.id && e.target !== node.id));
    }
  }, [setNodes, setEdges]);

  const onSaveEdit = useCallback((id, isStartNode, taskName, agent, steps) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          if (isStartNode){
            // delete all incoming edges
            setEdges((eds) => eds.filter((e) => e.target !== id));
          }
          return { ...node, data: { ...node.data, isStartNode, taskName, agent, steps } };
        }
        return node;
      })
    );
    setEditNode(null);
  }, [setNodes]);

  return (
    <div className="Dashboard">
      <aside>
        <div className="dndnodes">
        <h2>Drag & Drop Tasks</h2>
        <div className="description">You can drag these Task-Nodes to the Canvas on the right.</div>
        {nodeTypes.map((node) => (
          <div
            key={node.type}
            className="dndnode"
            onDragStart={(event) => event.dataTransfer.setData('application/reactflow', node.label)}
            draggable
          >
            {node.label}
          </div>
        ))}
        </div>
        <div className='actions'>
          {/* TO IMPLEMENT - generating workflows with prompt to llms based on JSON Schema */}
          {/* currently using fixed examples */}
          {/* <button className='generate-button' onClick={handleOpenGenWindow}>Generate</button> */}
          <button className='generate-button' onClick={() => setCurrentExampleIndex((currentExampleIndex+1)%4)}>Generate</button>
          <button className='build-button' onClick={()=> console.log(checkIfGraphConnected(nodes, edges, tools, agents))}>Build</button>
        </div>
      </aside>
      <GenerateWindow
        isOpen={isGenWindowOpen}
        onClose={handleCloseGenWindow}
        onSubmit={handleSubmit}
        prompt={prompt}
        setPrompt={setPrompt}
      />
      <ReactFlowProvider>
        <div className="reactflow-wrapper" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeDoubleClick={onNodeDoubleClick}
            onNodeContextMenu={onNodeContextMenu}
            nodeTypes={nodesTypes}
            snapToGrid={true}
            fitView
          >
            <Controls />
            {/* <MiniMap /> */}
            <Background variant="dots" gap={12} size={1} />
          </ReactFlow>
        </div>
      </ReactFlowProvider>
      {editNode && (
        <EditTask 
          editNode={editNode}
          setEditNode={setEditNode}
          onSaveEdit={onSaveEdit}
          agents={agents}
        />
      )}
    </div>
  );
};


export default Dashboard;