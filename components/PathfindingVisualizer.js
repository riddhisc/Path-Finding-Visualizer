"use client"
import React, { useState, useEffect, useCallback, memo } from 'react';
import { Play, Mouse, Trash2, MoveHorizontal, Target, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const GRID_ROWS = 20;
const GRID_COLS = 30;

const Node = {
  EMPTY: 'empty',
  WALL: 'wall',
  START: 'start',
  END: 'end',
  PATH: 'path',
  VISITED: 'visited',
};

// Memoized individual cell component for better performance
const Cell = memo(({ type, onMouseDown, onMouseEnter, onMouseUp }) => (
  <div
    className={`h-6 w-6 border border-gray-200 transition-all duration-150 hover:opacity-80
      ${type === Node.WALL ? 'bg-gray-800' : ''}
      ${type === Node.START ? 'bg-green-500' : ''}
      ${type === Node.END ? 'bg-red-500' : ''}
      ${type === Node.VISITED ? 'bg-blue-200 animate-pulse' : ''}
      ${type === Node.PATH ? 'bg-yellow-400 animate-bounce' : ''}
      ${type === Node.EMPTY ? 'bg-white' : ''}
    `}
    onMouseDown={onMouseDown}
    onMouseEnter={onMouseEnter}
    onMouseUp={onMouseUp}
  />
));

// Utility functions
const getAllNodes = (grid) => {
  const nodes = [];
  for (const row of grid) {
    for (const node of row) {
      nodes.push(node);
    }
  }
  return nodes;
};

const sortNodesByDistance = (unvisitedNodes) => {
  unvisitedNodes.sort((nodeA, nodeB) => nodeA.distance - nodeB.distance);
};

const getNeighbors = (node, grid) => {
  const neighbors = [];
  const { row, col } = node;
  if (row > 0) neighbors.push(grid[row - 1][col]);
  if (row < grid.length - 1) neighbors.push(grid[row + 1][col]);
  if (col > 0) neighbors.push(grid[row][col - 1]);
  if (col < grid[0].length - 1) neighbors.push(grid[row][col + 1]);
  return neighbors.filter(neighbor => !neighbor.isVisited);
};

const updateUnvisitedNeighbors = (node, grid) => {
  const neighbors = getNeighbors(node, grid);
  for (const neighbor of neighbors) {
    neighbor.distance = node.distance + 1;
    neighbor.previousNode = node;
  }
};

const CustomTooltipWrapper = ({ content, children }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      {children}
    </TooltipTrigger>
    <TooltipContent>
      <p>{content}</p>
    </TooltipContent>
  </Tooltip>
);

function PathfindingVisualizer() {
  const [grid, setGrid] = useState([]);
  const [isMousePressed, setIsMousePressed] = useState(false);
  const [startNode, setStartNode] = useState({ row: 10, col: 5 });
  const [endNode, setEndNode] = useState({ row: 10, col: 25 });
  const [currentTool, setCurrentTool] = useState('wall');
  const [isAnimating, setIsAnimating] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);

  const initializeGrid = useCallback(() => {
    const initialGrid = Array(GRID_ROWS).fill().map((_, row) =>
      Array(GRID_COLS).fill().map((_, col) => ({
        row,
        col,
        type: Node.EMPTY,
        isVisited: false,
        distance: Infinity,
        previousNode: null,
      }))
    );
    
    initialGrid[startNode.row][startNode.col].type = Node.START;
    initialGrid[endNode.row][endNode.col].type = Node.END;
    
    return initialGrid;
  }, [startNode.row, startNode.col, endNode.row, endNode.col]);

  useEffect(() => {
    setGrid(initializeGrid());
  }, [initializeGrid]);

  const handleNodeClick = useCallback((row, col) => {
    if (isAnimating) return;

    setGrid(prevGrid => {
      const newGrid = [...prevGrid];
      const node = newGrid[row][col];

      if (currentTool === 'wall') {
        if (node.type !== Node.START && node.type !== Node.END) {
          node.type = node.type === Node.WALL ? Node.EMPTY : Node.WALL;
        }
      } else if (currentTool === 'start') {
        newGrid[startNode.row][startNode.col].type = Node.EMPTY;
        node.type = Node.START;
        setStartNode({ row, col });
      } else if (currentTool === 'end') {
        newGrid[endNode.row][endNode.col].type = Node.EMPTY;
        node.type = Node.END;
        setEndNode({ row, col });
      }

      return newGrid;
    });
  }, [currentTool, isAnimating, startNode.row, startNode.col, endNode.row, endNode.col]);

  const animatePath = async (grid, endNode) => {
    const path = [];
    let currentNode = endNode;
    while (currentNode !== null) {
      path.unshift(currentNode);
      currentNode = currentNode.previousNode;
    }

    for (let i = 0; i < path.length; i++) {
      const node = path[i];
      if (node.type !== Node.START && node.type !== Node.END) {
        await new Promise(resolve => setTimeout(resolve, 50));
        const newGrid = [...grid];
        newGrid[node.row][node.col].type = Node.PATH;
        setGrid(newGrid);
      }
    }
  };

  const dijkstra = async () => {
    setIsAnimating(true);
    setShowTutorial(false);
    
    const newGrid = grid.map(row => row.map(node => ({
      ...node,
      distance: Infinity,
      isVisited: false,
      previousNode: null,
    })));

    const start = newGrid[startNode.row][startNode.col];
    start.distance = 0;
    const unvisitedNodes = getAllNodes(newGrid);

    while (unvisitedNodes.length) {
      sortNodesByDistance(unvisitedNodes);
      const closestNode = unvisitedNodes.shift();
      
      if (closestNode.distance === Infinity) break;
      if (closestNode.type === Node.WALL) continue;

      closestNode.isVisited = true;
      if (closestNode.type === Node.END) {
        await animatePath(newGrid, closestNode);
        setIsAnimating(false);
        return;
      }

      if (closestNode.type !== Node.START && closestNode.type !== Node.END) {
        newGrid[closestNode.row][closestNode.col].type = Node.VISITED;
        setGrid([...newGrid]);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      updateUnvisitedNeighbors(closestNode, newGrid);
    }
    setIsAnimating(false);
  };

  const clearBoard = useCallback(() => {
    if (isAnimating) return;
    setGrid(initializeGrid());
    setShowTutorial(true);
  }, [isAnimating, initializeGrid]);

  const renderToolbar = () => (
    <div className="flex flex-wrap justify-center gap-2 mb-4">
      <CustomTooltipWrapper content="Draw walls">
        <button
          onClick={() => setCurrentTool('wall')}
          className={`flex items-center gap-2 px-4 py-2 rounded transition-colors
            ${currentTool === 'wall' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
        >
          <Mouse size={16} /> Wall
        </button>
      </CustomTooltipWrapper>
      <CustomTooltipWrapper content="Place start point">
        <button
          onClick={() => setCurrentTool('start')}
          className={`flex items-center gap-2 px-4 py-2 rounded transition-colors
            ${currentTool === 'start' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
        >
          <MoveHorizontal size={16} /> Start
        </button>
      </CustomTooltipWrapper>
      <CustomTooltipWrapper content="Place end point">
        <button
          onClick={() => setCurrentTool('end')}
          className={`flex items-center gap-2 px-4 py-2 rounded transition-colors
            ${currentTool === 'end' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
        >
          <Target size={16} /> End
        </button>
      </CustomTooltipWrapper>
      <CustomTooltipWrapper content="Start visualization">
        <button
          onClick={dijkstra}
          disabled={isAnimating}
          className="flex items-center gap-2 px-4 py-2 rounded bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play size={16} /> Visualize
        </button>
      </CustomTooltipWrapper>
      <CustomTooltipWrapper content="Clear the board">
        <button
          onClick={clearBoard}
          disabled={isAnimating}
          className="flex items-center gap-2 px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 size={16} /> Clear
        </button>
      </CustomTooltipWrapper>
    </div>
  );

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 p-4">
      <TooltipProvider>
        <Card className="w-full max-w-4xl">
          <CardContent className="p-6">
            {showTutorial && (
              <Alert className="mb-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Welcome! Click and drag to draw walls, use the toolbar to place start and end points, 
                  then click Visualize to see the shortest path.
                </AlertDescription>
              </Alert>
            )}
            
            {renderToolbar()}

            <div className="flex justify-center">
              <div
                className="grid gap-px bg-gray-200 rounded-lg overflow-hidden shadow-lg"
                style={{
                  gridTemplateColumns: `repeat(${GRID_COLS}, 25px)`,
                }}
                onMouseLeave={() => setIsMousePressed(false)}
              >
                {grid.map((row, rowIdx) =>
                  row.map((node, colIdx) => (
                    <Cell
                      key={`${rowIdx}-${colIdx}`}
                      type={node.type}
                      onMouseDown={() => {
                        setIsMousePressed(true);
                        handleNodeClick(rowIdx, colIdx);
                      }}
                      onMouseEnter={() => isMousePressed && handleNodeClick(rowIdx, colIdx)}
                      onMouseUp={() => setIsMousePressed(false)}
                    />
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </TooltipProvider>
    </div>
  );
}

export default PathfindingVisualizer;