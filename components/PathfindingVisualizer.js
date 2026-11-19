"use client";

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  Info,
  Play,
  RotateCcw,
  Square,
  Trash2,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';

const GRID_ROWS = 20;
const GRID_COLS = 30;
const CELL_SIZE = 24;
const CELL_GAP = 1;
const DEFAULT_START = { row: 10, col: 5 };
const DEFAULT_END = { row: 10, col: 25 };

const createGrid = () =>
  Array.from({ length: GRID_ROWS }, (_, row) =>
    Array.from({ length: GRID_COLS }, (_, col) => ({
      row,
      col,
      isWall: false,
      isVisited: false,
      isPath: false,
      distance: Infinity,
      previousNode: null,
    })),
  );

const cloneGridWithoutResults = (grid, clearWalls = false) =>
  grid.map((row) =>
    row.map((node) => ({
      ...node,
      isWall: clearWalls ? false : node.isWall,
      isVisited: false,
      isPath: false,
      distance: Infinity,
      previousNode: null,
    })),
  );

const getAllNodes = (grid) => grid.flat();

const getNeighbors = (node, grid) => {
  const neighbors = [];
  const { row, col } = node;
  if (row > 0) neighbors.push(grid[row - 1][col]);
  if (row < grid.length - 1) neighbors.push(grid[row + 1][col]);
  if (col > 0) neighbors.push(grid[row][col - 1]);
  if (col < grid[0].length - 1) neighbors.push(grid[row][col + 1]);
  return neighbors.filter((neighbor) => !neighbor.isVisited);
};

const updateUnvisitedNeighbors = (node, grid) => {
  for (const neighbor of getNeighbors(node, grid)) {
    neighbor.distance = node.distance + 1;
    neighbor.previousNode = node;
  }
};

const Cell = memo(function Cell({ row, col, variant }) {
  return (
    <div
      data-cell="true"
      data-row={row}
      data-col={col}
      aria-label={`${variant} cell at row ${row + 1}, column ${col + 1}`}
      className={`h-6 w-6 select-none border border-gray-200 ${
        variant === 'wall' ? 'bg-gray-800' : ''
      } ${variant === 'start' ? 'bg-green-500' : ''} ${
        variant === 'end' ? 'bg-red-500' : ''
      } ${variant === 'visited' ? 'cell-visited bg-blue-200' : ''} ${
        variant === 'path' ? 'cell-path bg-yellow-400' : ''
      } ${variant === 'empty' ? 'bg-white hover:bg-gray-100' : ''}`}
    />
  );
});

const getVariant = (node, startNode, endNode) => {
  if (node.row === startNode.row && node.col === startNode.col) return 'start';
  if (node.row === endNode.row && node.col === endNode.col) return 'end';
  if (node.isWall) return 'wall';
  if (node.isPath) return 'path';
  if (node.isVisited) return 'visited';
  return 'empty';
};

function PathfindingVisualizer() {
  const [grid, setGrid] = useState(() => createGrid());
  const [startNode, setStartNode] = useState(DEFAULT_START);
  const [endNode, setEndNode] = useState(DEFAULT_END);
  const [isAnimating, setIsAnimating] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const gridRef = useRef(null);
  const interactionRef = useRef(null);
  const timeoutRefs = useRef(new Set());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      timeoutRefs.current.forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutRefs.current.clear();
    };
  }, []);

  const delay = useCallback((milliseconds) => new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      timeoutRefs.current.delete(timeoutId);
      resolve();
    }, milliseconds);
    timeoutRefs.current.add(timeoutId);
  }), []);

  const cellFromTarget = useCallback((target) => {
    const cell = target?.closest?.('[data-cell]');
    return cell ? { row: Number(cell.dataset.row), col: Number(cell.dataset.col) } : null;
  }, []);

  const cellFromPoint = useCallback((clientX, clientY) => {
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const col = Math.floor((clientX - rect.left) / (CELL_SIZE + CELL_GAP));
    const row = Math.floor((clientY - rect.top) / (CELL_SIZE + CELL_GAP));
    return row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS ? { row, col } : null;
  }, []);

  const isEndpoint = useCallback((row, col) => (
    (row === startNode.row && col === startNode.col) ||
    (row === endNode.row && col === endNode.col)
  ), [endNode, startNode]);

  const applyWallSegment = useCallback((from, to, mode) => {
    if (!from || !to) return;
    const cells = [];
    const steps = Math.max(Math.abs(to.row - from.row), Math.abs(to.col - from.col));
    for (let step = 0; step <= steps; step += 1) {
      const progress = steps === 0 ? 0 : step / steps;
      const cell = {
        row: Math.round(from.row + (to.row - from.row) * progress),
        col: Math.round(from.col + (to.col - from.col) * progress),
      };
      if (!cells.some((item) => item.row === cell.row && item.col === cell.col)) cells.push(cell);
    }

    setGrid((previousGrid) => previousGrid.map((gridRow) => gridRow.map((node) => {
      const touched = cells.some((cell) => cell.row === node.row && cell.col === node.col);
      const isWall = touched && !isEndpoint(node.row, node.col) ? mode === 'paint' : node.isWall;
      return {
        ...node,
        isWall,
        isVisited: false,
        isPath: false,
        distance: Infinity,
        previousNode: null,
      };
    })));
    setFeedback(null);
  }, [isEndpoint]);

  const moveEndpoint = useCallback((kind, target) => {
    if (!target || isEndpoint(target.row, target.col)) return;
    if (kind === 'start') setStartNode(target);
    else setEndNode(target);
    setGrid((previousGrid) => previousGrid.map((gridRow) => gridRow.map((node) => ({
      ...node,
      isWall: node.row === target.row && node.col === target.col ? false : node.isWall,
      isVisited: false,
      isPath: false,
      distance: Infinity,
      previousNode: null,
    }))));
    setFeedback(null);
  }, [isEndpoint]);

  const handlePointerDown = useCallback((event) => {
    if (event.button !== 0 || isAnimating) return;
    event.preventDefault();
    const targetCell = cellFromTarget(event.target);
    if (!targetCell) return;
    const { row, col } = targetCell;
    const endpoint = row === startNode.row && col === startNode.col
      ? 'start'
      : row === endNode.row && col === endNode.col ? 'end' : null;
    interactionRef.current = endpoint
      ? { kind: 'endpoint', endpoint, pointerId: event.pointerId, lastCell: targetCell }
      : {
        kind: 'wall',
        mode: grid[row][col].isWall ? 'erase' : 'paint',
        pointerId: event.pointerId,
        lastCell: targetCell,
      };
    gridRef.current?.setPointerCapture?.(event.pointerId);
    if (!endpoint) applyWallSegment(targetCell, targetCell, interactionRef.current.mode);
  }, [applyWallSegment, cellFromTarget, endNode, grid, isAnimating, startNode]);

  const handlePointerMove = useCallback((event) => {
    const interaction = interactionRef.current;
    if (isAnimating || !interaction || interaction.pointerId !== event.pointerId) return;
    const targetCell = cellFromPoint(event.clientX, event.clientY);
    if (!targetCell) return;
    if (interaction.kind === 'endpoint') moveEndpoint(interaction.endpoint, targetCell);
    else applyWallSegment(interaction.lastCell, targetCell, interaction.mode);
    interaction.lastCell = targetCell;
  }, [applyWallSegment, cellFromPoint, isAnimating, moveEndpoint]);

  const handlePointerUp = useCallback((event) => {
    if (interactionRef.current?.pointerId !== event.pointerId) return;
    interactionRef.current = null;
    gridRef.current?.releasePointerCapture?.(event.pointerId);
  }, []);

  const clearPath = useCallback(() => {
    if (isAnimating) return;
    setGrid((previousGrid) => cloneGridWithoutResults(previousGrid));
    setFeedback(null);
  }, [isAnimating]);

  const clearBoard = useCallback(() => {
    if (isAnimating) return;
    setGrid((previousGrid) => cloneGridWithoutResults(previousGrid, true));
    setFeedback(null);
  }, [isAnimating]);

  const animatePath = useCallback(async (workingGrid, end) => {
    const path = [];
    let currentNode = end;
    while (currentNode) {
      path.unshift(currentNode);
      currentNode = currentNode.previousNode;
    }
    for (const node of path) {
      if (!mountedRef.current) return;
      if (node.row !== startNode.row || node.col !== startNode.col) {
        node.isPath = true;
        setGrid(workingGrid.map((row) => row.map((gridNode) => ({ ...gridNode }))));
        await delay(40);
      }
    }
  }, [delay, startNode]);

  const dijkstra = useCallback(async () => {
    if (isAnimating || grid.length === 0) return;
    setIsAnimating(true);
    setFeedback(null);
    const workingGrid = cloneGridWithoutResults(grid);
    workingGrid[startNode.row][startNode.col].distance = 0;
    const unvisitedNodes = getAllNodes(workingGrid);
    setGrid(workingGrid.map((row) => row.map((node) => ({ ...node }))));

    while (unvisitedNodes.length && mountedRef.current) {
      unvisitedNodes.sort((a, b) => a.distance - b.distance);
      const closestNode = unvisitedNodes.shift();
      if (closestNode.distance === Infinity) break;
      if (closestNode.isWall) continue;
      closestNode.isVisited = true;
      if (closestNode.row === endNode.row && closestNode.col === endNode.col) {
        await animatePath(workingGrid, closestNode);
        if (mountedRef.current) {
          setFeedback({ type: 'success', text: `Path found: ${Math.max(0, closestNode.distance)} steps` });
          setIsAnimating(false);
        }
        return;
      }
      if (closestNode.row !== startNode.row || closestNode.col !== startNode.col) {
        setGrid(workingGrid.map((row) => row.map((node) => ({ ...node }))));
        await delay(10);
      }
      updateUnvisitedNeighbors(closestNode, workingGrid);
    }
    if (mountedRef.current) {
      setFeedback({ type: 'error', text: 'No path found: the end is blocked off.' });
      setIsAnimating(false);
    }
  }, [animatePath, delay, endNode, grid, isAnimating, startNode]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-5xl">
        <CardContent className="p-6">
          <div className="mb-4 flex items-start gap-3 rounded-lg border bg-background p-4 text-sm">
            <Info className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">How to use the visualizer</p>
              <p>Drag the green and red squares to move them. Click and drag on empty cells to draw walls.</p>
            </div>
          </div>
          {feedback && (
            <Alert className="mb-4" variant={feedback.type === 'error' ? 'destructive' : 'default'}>
              <AlertDescription>{feedback.text}</AlertDescription>
            </Alert>
          )}
          <div className="mb-4 flex flex-wrap justify-center gap-2">
            <span className="self-center text-sm text-gray-600">Click and drag empty cells to draw walls</span>
            <button type="button" onClick={dijkstra} disabled={isAnimating} className="flex items-center gap-2 rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50">
              <Play className="h-4 w-4" /> Visualize
            </button>
            <button type="button" onClick={clearPath} disabled={isAnimating} className="flex items-center gap-2 rounded bg-yellow-500 px-4 py-2 text-white hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-50">
              <RotateCcw className="h-4 w-4" /> Clear Path
            </button>
            <button type="button" onClick={clearBoard} disabled={isAnimating} className="flex items-center gap-2 rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50">
              <Trash2 className="h-4 w-4" /> Clear
            </button>
          </div>
          <div className="mb-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-gray-700">
            <span className="flex items-center gap-2"><Square className="h-4 w-4 fill-green-500 text-green-500" /> Start</span>
            <span className="flex items-center gap-2"><Square className="h-4 w-4 fill-red-500 text-red-500" /> End</span>
            <span className="flex items-center gap-2"><Square className="h-4 w-4 fill-gray-800 text-gray-800" /> Wall</span>
            <span className="flex items-center gap-2"><Square className="h-4 w-4 fill-blue-200 text-blue-200" /> Visited</span>
            <span className="flex items-center gap-2"><Square className="h-4 w-4 fill-yellow-400 text-yellow-400" /> Path</span>
          </div>
          <div
            ref={gridRef}
            className="mx-auto grid w-fit select-none touch-none gap-px overflow-hidden rounded-lg bg-gray-200 shadow-lg"
            style={{ gridTemplateColumns: `repeat(${GRID_COLS}, ${CELL_SIZE}px)` }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {grid.flat().map((node) => (
              <Cell key={`${node.row}-${node.col}`} row={node.row} col={node.col} variant={getVariant(node, startNode, endNode)} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PathfindingVisualizer;
