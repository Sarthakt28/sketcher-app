import axios from "axios";
import { HTTP_BACKEND } from "../app/config";

export type Shape = ({
    type: "rect"
    x: number;
    y: number;
    width: number;
    height: number;
} | {
    type: "circle",
    x: number;
    y: number;
    radius: number;
} | {
    type: "arrow",
    x: number;
    y: number;
    endX: number;
    endY: number;
} | {
    type: "triangle",
    x: number;
    y: number;
    endX: number;
    endY: number;
} | {
    type: "pencil",
    points: { x: number; y: number }[];
} | {
    type: "text",
    x: number;
    y: number;
    text: string;
} | {
    type: "eraser",
    points: { x: number; y: number }[];
}) & { id?: string; color?: string; size?: number; fontSize?: number };

export type ToolMode = "select" | "rect" | "circle" | "arrow" | "triangle" | "pencil" | "text" | "eraser" | "pan";

function getShapeBoundingBox(shape: Shape) {
    if (shape.type === "rect") {
        return {
            minX: Math.min(shape.x, shape.x + shape.width),
            maxX: Math.max(shape.x, shape.x + shape.width),
            minY: Math.min(shape.y, shape.y + shape.height),
            maxY: Math.max(shape.y, shape.y + shape.height)
        };
    } else if (shape.type === "circle") {
        return {
            minX: shape.x - shape.radius,
            maxX: shape.x + shape.radius,
            minY: shape.y - shape.radius,
            maxY: shape.y + shape.radius
        };
    } else if (shape.type === "arrow" || shape.type === "triangle") {
        return {
            minX: Math.min(shape.x, shape.endX),
            maxX: Math.max(shape.x, shape.endX),
            minY: Math.min(shape.y, shape.endY),
            maxY: Math.max(shape.y, shape.endY)
        };
    } else if (shape.type === "text") {
        const size = shape.size || 2;
        const fontSize = shape.fontSize || (size === 2 ? 14 : size === 6 ? 20 : size === 12 ? 28 : size === 20 ? 40 : 18);
        const width = shape.text.length * fontSize * 0.6;
        return {
            minX: shape.x,
            maxX: shape.x + width,
            minY: shape.y,
            maxY: shape.y + fontSize
        };
    } else if (shape.type === "pencil" || shape.type === "eraser") {
        const firstPoint = shape.points[0];
        if (!firstPoint) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
        let minX = firstPoint.x;
        let maxX = firstPoint.x;
        let minY = firstPoint.y;
        let maxY = firstPoint.y;
        shape.points.forEach(p => {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        });
        return { minX, maxX, minY, maxY };
    }
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
}

function isPointInShape(px: number, py: number, shape: Shape): boolean {
    const box = getShapeBoundingBox(shape);
    const padding = 8; // clickable padding around thin lines
    
    // Quick bounding box filter
    if (px < box.minX - padding || px > box.maxX + padding || py < box.minY - padding || py > box.maxY + padding) {
        return false;
    }

    if (shape.type === "rect" || shape.type === "text" || shape.type === "triangle") {
        return true;
    } else if (shape.type === "circle") {
        const dx = px - shape.x;
        const dy = py - shape.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist <= shape.radius + padding;
    } else if (shape.type === "arrow") {
        const l2 = Math.pow(shape.x - shape.endX, 2) + Math.pow(shape.y - shape.endY, 2);
        if (l2 === 0) return false;
        let t = ((px - shape.x) * (shape.endX - shape.x) + (py - shape.y) * (shape.endY - shape.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        const projX = shape.x + t * (shape.endX - shape.x);
        const projY = shape.y + t * (shape.endY - shape.y);
        const dist = Math.sqrt(Math.pow(px - projX, 2) + Math.pow(py - projY, 2));
        return dist <= padding;
    } else if (shape.type === "pencil" || shape.type === "eraser") {
        for (let i = 0; i < shape.points.length - 1; i++) {
            const p1 = shape.points[i];
            const p2 = shape.points[i + 1];
            if (!p1 || !p2) continue;
            const l2 = Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
            if (l2 === 0) continue;
            let t = ((px - p1.x) * (p2.x - p1.x) + (py - p1.y) * (p2.y - p1.y)) / l2;
            t = Math.max(0, Math.min(1, t));
            const projX = p1.x + t * (p2.x - p1.x);
            const projY = p1.y + t * (p2.y - p1.y);
            const dist = Math.sqrt(Math.pow(px - projX, 2) + Math.pow(py - projY, 2));
            if (dist <= padding + (shape.size || 2)) {
                return true;
            }
        }
        return false;
    }
    return false;
}

function moveShape(shape: Shape, dx: number, dy: number): Shape {
    if (shape.type === "rect" || shape.type === "text") {
        return {
            ...shape,
            x: shape.x + dx,
            y: shape.y + dy
        };
    } else if (shape.type === "circle") {
        return {
            ...shape,
            x: shape.x + dx,
            y: shape.y + dy
        };
    } else if (shape.type === "arrow" || shape.type === "triangle") {
        return {
            ...shape,
            x: shape.x + dx,
            y: shape.y + dy,
            endX: shape.endX + dx,
            endY: shape.endY + dy
        };
    } else if (shape.type === "pencil" || shape.type === "eraser") {
        return {
            ...shape,
            points: shape.points.map(p => ({ x: p.x + dx, y: p.y + dy }))
        };
    }
    return shape;
}

type ResizeHandle = "TL" | "TR" | "BL" | "BR";

function getResizeHandleUnderMouse(mx: number, my: number, shape: Shape): ResizeHandle | null {
    const box = getShapeBoundingBox(shape);
    const padding = 6;
    const clickRadius = 12; // 12px active click zone

    const x1 = box.minX - padding;
    const y1 = box.minY - padding;
    const x2 = box.maxX + padding;
    const y2 = box.minY - padding;
    const x3 = box.minX - padding;
    const y3 = box.maxY + padding;
    const x4 = box.maxX + padding;
    const y4 = box.maxY + padding;

    const handles = [
        { name: "TL" as ResizeHandle, x: x1, y: y1 },
        { name: "TR" as ResizeHandle, x: x2, y: y2 },
        { name: "BL" as ResizeHandle, x: x3, y: y3 },
        { name: "BR" as ResizeHandle, x: x4, y: y4 }
    ];

    for (const h of handles) {
        const dx = mx - h.x;
        const dy = my - h.y;
        if (Math.sqrt(dx * dx + dy * dy) <= clickRadius) {
            return h.name;
        }
    }
    return null;
}

function resizeShape(shape: Shape, handle: ResizeHandle, mx: number, my: number, startBox: { minX: number; maxX: number; minY: number; maxY: number }): Shape {
    if (shape.type === "rect" || shape.type === "triangle") {
        let newX = shape.x;
        let newY = shape.y;
        let newWidth = 0;
        let newHeight = 0;

        if (shape.type === "rect") {
            newWidth = shape.width;
            newHeight = shape.height;
        } else {
            newWidth = shape.endX - shape.x;
            newHeight = shape.endY - shape.y;
        }

        if (handle === "BR") {
            newWidth = mx - startBox.minX;
            newHeight = my - startBox.minY;
        } else if (handle === "TL") {
            newX = mx;
            newY = my;
            newWidth = startBox.maxX - mx;
            newHeight = startBox.maxY - my;
        } else if (handle === "TR") {
            newY = my;
            newWidth = mx - startBox.minX;
            newHeight = startBox.maxY - my;
        } else if (handle === "BL") {
            newX = mx;
            newWidth = startBox.maxX - mx;
            newHeight = my - startBox.minY;
        }

        if (shape.type === "rect") {
            return {
                ...shape,
                x: newX,
                y: newY,
                width: newWidth,
                height: newHeight
            };
        } else { // triangle
            return {
                ...shape,
                x: newX,
                y: newY,
                endX: newX + newWidth,
                endY: newY + newHeight
            };
        }
    } else if (shape.type === "circle") {
        const dx = mx - shape.x;
        const dy = my - shape.y;
        const radius = Math.max(5, Math.sqrt(dx * dx + dy * dy));
        return {
            ...shape,
            radius
        };
    } else if (shape.type === "arrow") {
        const distStart = Math.sqrt(Math.pow(mx - shape.x, 2) + Math.pow(my - shape.y, 2));
        const distEnd = Math.sqrt(Math.pow(mx - shape.endX, 2) + Math.pow(my - shape.endY, 2));
        if (distStart < distEnd) {
            return {
                ...shape,
                x: mx,
                y: my
            };
        } else {
            return {
                ...shape,
                endX: mx,
                endY: my
            };
        }
    } else if (shape.type === "text") {
        const size = shape.size || 2;
        const initialFontSize = shape.fontSize || (size === 2 ? 14 : size === 6 ? 20 : size === 12 ? 28 : size === 20 ? 40 : 18);
        const originalWidth = shape.text.length * initialFontSize * 0.6;
        
        let newWidth = originalWidth;
        if (handle === "BR" || handle === "TR") {
            newWidth = mx - startBox.minX;
        } else {
            newWidth = startBox.maxX - mx;
        }
        
        const scale = newWidth / originalWidth;
        const fontSize = Math.max(8, Math.min(200, Math.round(initialFontSize * scale)));
        
        return {
            ...shape,
            x: handle === "TL" || handle === "BL" ? mx : shape.x,
            fontSize
        };
    }
    return shape;
}

export function initDraw(
    canvas:HTMLCanvasElement, 
    roomId: string, 
    socket: WebSocket, 
    getActiveTool: () => ToolMode, 
    getActiveColor: () => string | null, 
    getActiveSize: () => number | null, 
    onRequireSelection: () => void,
    onViewChange?: (zoom: number, panX: number, panY: number) => void
){
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                return {
                    cleanup: () => {},
                    undo: () => {},
                    redo: () => {},
                    clear: () => {},
                    getShapes: () => [],
                    resetView: () => {},
                    zoomIn: () => {},
                    zoomOut: () => {},
                    updateSelectedShapeColor: () => {},
                    updateSelectedShapeSize: () => {}
                };
            }

            let existingShapes: Shape[] = [];
            let myDrawnShapeIds: string[] = [];
            let redoStack: Shape[] = [];
            let currentPencilPoints: { x: number; y: number }[] = [];
            let currentEraserPoints: { x: number; y: number }[] = [];

            let selectedShape: Shape | null = null;
            let isDragging = false;
            let dragStartX = 0;
            let dragStartY = 0;
            let originalShapeCopy: Shape | null = null;

            let isResizing = false;
            let activeResizeHandle: ResizeHandle | null = null;
            let originalShapeBeforeResize: Shape | null = null;
            let resizeStartBox: { minX: number; maxX: number; minY: number; maxY: number } | null = null;

            // Pan & Zoom state
            let panX = 0;
            let panY = 0;
            let zoom = 1;
            let isPanning = false;
            let panStartX = 0;
            let panStartY = 0;
            let isSpacePressed = false;

            const offscreenCanvas = document.createElement("canvas");
            const offscreenCtx = offscreenCanvas.getContext("2d")!;

            const clearCanvas = () => {
                // Ensure offscreen canvas matches visible canvas dimensions
                if (offscreenCanvas.width !== canvas.width || offscreenCanvas.height !== canvas.height) {
                    offscreenCanvas.width = canvas.width;
                    offscreenCanvas.height = canvas.height;
                }

                // 1. Clear offscreen canvas
                offscreenCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);

                // 2. Draw all shapes in chronological layer order onto the offscreen canvas
                offscreenCtx.save();
                offscreenCtx.translate(panX, panY);
                offscreenCtx.scale(zoom, zoom);
                offscreenCtx.lineCap = "round";
                offscreenCtx.lineJoin = "round";

                existingShapes.forEach((shape) => {
                    if (shape.type === "eraser") {
                        offscreenCtx.globalCompositeOperation = "destination-out";
                    } else {
                        offscreenCtx.globalCompositeOperation = "source-over";
                    }
                    drawShape(offscreenCtx, shape);
                });

                // Draw active pencil path if drawing
                if (currentPencilPoints.length > 0 && currentPencilPoints[0]) {
                    offscreenCtx.globalCompositeOperation = "source-over";
                    offscreenCtx.strokeStyle = getActiveColor() || "#ffffff";
                    offscreenCtx.lineWidth = getActiveSize() || 2;
                    offscreenCtx.beginPath();
                    offscreenCtx.moveTo(currentPencilPoints[0].x, currentPencilPoints[0].y);
                    for (let i = 1; i < currentPencilPoints.length; i++) {
                        const p = currentPencilPoints[i];
                        if (p) offscreenCtx.lineTo(p.x, p.y);
                    }
                    offscreenCtx.stroke();
                }

                // Draw active eraser path if erasing
                if (currentEraserPoints.length > 0 && currentEraserPoints[0]) {
                    offscreenCtx.globalCompositeOperation = "destination-out";
                    offscreenCtx.strokeStyle = "rgba(0,0,0,1)";
                    offscreenCtx.lineWidth = getActiveSize() || 6;
                    offscreenCtx.beginPath();
                    offscreenCtx.moveTo(currentEraserPoints[0].x, currentEraserPoints[0].y);
                    for (let i = 1; i < currentEraserPoints.length; i++) {
                        const p = currentEraserPoints[i];
                        if (p) offscreenCtx.lineTo(p.x, p.y);
                    }
                    offscreenCtx.stroke();
                }

                offscreenCtx.restore();

                // 4. Draw background and dots on the main visible canvas
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = "#09090b";
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Draw dynamic grid of dots
                ctx.save();
                const gridSpacing = 40;
                const minX = -panX / zoom;
                const minY = -panY / zoom;
                const maxX = (canvas.width - panX) / zoom;
                const maxY = (canvas.height - panY) / zoom;
                const startGridX = Math.floor(minX / gridSpacing) * gridSpacing;
                const startGridY = Math.floor(minY / gridSpacing) * gridSpacing;

                ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
                if (zoom > 0.2) {
                    for (let gx = startGridX; gx <= maxX; gx += gridSpacing) {
                        for (let gy = startGridY; gy <= maxY; gy += gridSpacing) {
                            const screenX = gx * zoom + panX;
                            const screenY = gy * zoom + panY;
                            ctx.beginPath();
                            ctx.arc(screenX, screenY, 1, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }
                }
                ctx.restore();

                // 5. Draw the offscreen canvas (with shapes and erasures) on top of the main canvas
                ctx.drawImage(offscreenCanvas, 0, 0);

                // 6. Draw selection bounding box if a shape is selected
                if (selectedShape) {
                    ctx.save();
                    ctx.translate(panX, panY);
                    ctx.scale(zoom, zoom);

                    const box = getShapeBoundingBox(selectedShape);
                    const padding = 6;
                    
                    ctx.strokeStyle = "rgba(129, 140, 248, 0.8)"; // indigo-400
                    ctx.lineWidth = 1.5 / zoom;
                    ctx.setLineDash([6 / zoom, 4 / zoom]);
                    
                    const x = box.minX - padding;
                    const y = box.minY - padding;
                    const w = (box.maxX - box.minX) + 2 * padding;
                    const h = (box.maxY - box.minY) + 2 * padding;
                    
                    ctx.strokeRect(x, y, w, h);
                    ctx.setLineDash([]);
                    
                    ctx.fillStyle = "#818cf8";
                    const hs = 6 / zoom;
                    ctx.fillRect(x - hs/2, y - hs/2, hs, hs);
                    ctx.fillRect(x + w - hs/2, y - hs/2, hs, hs);
                    ctx.fillRect(x - hs/2, y + h - hs/2, hs, hs);
                    ctx.fillRect(x + w - hs/2, y + h - hs/2, hs, hs);
                    ctx.restore();
                }
            };

            // Fetch shapes in the background asynchronously
            getExistingShapes(roomId).then((shapes) => {
                existingShapes = [...shapes, ...existingShapes];
                clearCanvas();
            }).catch((err) => {
                console.error("[Draw] Error loading initial shapes:", err);
            });

            socket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    if (message.type === "user_text_message") return;

                    if (message.type === "chat") {
                        const parsedShape = JSON.parse(message.message);
                        if (parsedShape && (
                            parsedShape.type === "rect" || 
                            parsedShape.type === "circle" ||
                            parsedShape.type === "arrow" ||
                            parsedShape.type === "triangle" ||
                            parsedShape.type === "pencil" ||
                            parsedShape.type === "text" ||
                            parsedShape.type === "eraser"
                        )) {
                            const existingIndex = existingShapes.findIndex(s => s.id === parsedShape.id);
                            if (existingIndex !== -1) {
                                existingShapes[existingIndex] = parsedShape;
                                if (selectedShape && selectedShape.id === parsedShape.id) {
                                    selectedShape = parsedShape;
                                }
                            } else {
                                existingShapes.push(parsedShape);
                            }
                            clearCanvas();
                        }
                    } else if (message.type === "delete_shape") {
                        const shapeId = message.shapeId;
                        if (selectedShape && selectedShape.id === shapeId) {
                            selectedShape = null;
                        }
                        existingShapes = existingShapes.filter(s => s.id !== shapeId);
                        clearCanvas();
                    } else if (message.type === "clear_canvas") {
                        selectedShape = null;
                        existingShapes = [];
                        myDrawnShapeIds = [];
                        redoStack = [];
                        clearCanvas();
                    }
                } catch (e) {
                    console.error("[Draw] Failed to parse incoming shape from socket:", e);
                }
            }
            clearCanvas();
            
            let activeTextInput: HTMLInputElement | null = null;

            let clicked = false;
            let startX = 0;
            let startY = 0;
            
            const handleMouseDown = (e: MouseEvent) => {
                const tool = getActiveTool();
                const color = getActiveColor() || undefined;
                const size = getActiveSize() || undefined;
                const rect = canvas.getBoundingClientRect();

                const shouldPan = tool === "pan" || isSpacePressed || e.button === 1;
                if (shouldPan) {
                    isPanning = true;
                    panStartX = e.clientX - panX;
                    panStartY = e.clientY - panY;
                    canvas.style.cursor = "grabbing";
                    return;
                }

                const clickWorldX = (e.clientX - rect.left - panX) / zoom;
                const clickWorldY = (e.clientY - rect.top - panY) / zoom;

                if (tool === "select") {
                    if (selectedShape) {
                        const handle = getResizeHandleUnderMouse(clickWorldX, clickWorldY, selectedShape);
                        if (handle) {
                            isResizing = true;
                            activeResizeHandle = handle;
                            originalShapeBeforeResize = JSON.parse(JSON.stringify(selectedShape));
                            resizeStartBox = getShapeBoundingBox(selectedShape);
                            dragStartX = clickWorldX;
                            dragStartY = clickWorldY;
                            return;
                        }
                    }
                    
                    let found: Shape | null = null;
                    for (let i = existingShapes.length - 1; i >= 0; i--) {
                        const s = existingShapes[i];
                        if (s && isPointInShape(clickWorldX, clickWorldY, s)) {
                            found = s;
                            break;
                        }
                    }

                    if (found) {
                        selectedShape = found;
                        isDragging = true;
                        dragStartX = clickWorldX;
                        dragStartY = clickWorldY;
                        originalShapeCopy = JSON.parse(JSON.stringify(found));
                        clearCanvas();
                    } else {
                        selectedShape = null;
                        clearCanvas();
                    }
                    return;
                }

                const isColorRequired = tool !== "eraser";
                if ((isColorRequired && color === undefined) || size === undefined) {
                    onRequireSelection();
                    return;
                }

                if (tool === "text") {
                    if (activeTextInput) {
                        const oldInput = activeTextInput;
                        activeTextInput = null;

                        const oldVal = oldInput.value.trim();
                        if (oldVal) {
                            const oldX = parseFloat(oldInput.dataset.inputX || "0");
                            const oldY = parseFloat(oldInput.dataset.inputY || "0");
                            const oldColor = oldInput.dataset.inputColor || "#ffffff";
                            const oldSize = parseFloat(oldInput.dataset.inputSize || "2");
                            const shapeId = Math.random().toString(36).substring(2, 9);
                            const shape: Shape = {
                                id: shapeId,
                                type: "text",
                                x: oldX,
                                y: oldY,
                                text: oldVal,
                                color: oldColor,
                                size: oldSize
                            };
                            existingShapes.push(shape);
                            myDrawnShapeIds.push(shapeId);
                            redoStack = [];
                            clearCanvas();
                            if (socket.readyState === WebSocket.OPEN) {
                                socket.send(JSON.stringify({
                                    type: "chat",
                                    message: JSON.stringify(shape),
                                    roomId
                                }));
                            }
                        }
                        if (oldInput.parentElement) {
                            oldInput.parentElement.removeChild(oldInput);
                        }
                    }

                    const inputWorldX = (e.clientX - rect.left - panX) / zoom;
                    const inputWorldY = (e.clientY - rect.top - panY) / zoom;
                    const activeColorVal = color || "#ffffff";
                    const activeSizeVal = size || 6;

                    const input = document.createElement("input");
                    input.type = "text";
                    input.placeholder = "Type text & press Enter...";
                    input.style.position = "absolute";
                    
                    const screenX = inputWorldX * zoom + panX + rect.left;
                    const screenY = inputWorldY * zoom + panY + rect.top;
                    input.style.left = `${screenX}px`;
                    input.style.top = `${screenY - 10}px`;
                    input.style.background = "transparent";
                    input.style.border = "none";
                    input.style.outline = "none";
                    input.style.color = activeColorVal;

                    input.dataset.inputX = String(inputWorldX);
                    input.dataset.inputY = String(inputWorldY);
                    input.dataset.inputColor = activeColorVal;
                    input.dataset.inputSize = String(activeSizeVal);
                    
                    const baseFontSize = activeSizeVal === 2 ? 14 : activeSizeVal === 6 ? 20 : activeSizeVal === 12 ? 28 : activeSizeVal === 20 ? 40 : 18;
                    input.style.font = `${baseFontSize * zoom}px sans-serif`;
                    input.style.zIndex = "1000";
                    input.style.width = `${300 * zoom}px`;
                    input.style.caretColor = activeColorVal;

                    if (canvas.parentElement) {
                        canvas.parentElement.appendChild(input);
                    }
                    
                    activeTextInput = input;
                    setTimeout(() => input.focus(), 50);

                    const commitText = () => {
                        const val = input.value.trim();
                        if (val) {
                            const shapeId = Math.random().toString(36).substring(2, 9);
                            const shape: Shape = {
                                id: shapeId,
                                type: "text",
                                x: inputWorldX,
                                y: inputWorldY,
                                text: val,
                                color: activeColorVal,
                                size: activeSizeVal
                            };
                            existingShapes.push(shape);
                            myDrawnShapeIds.push(shapeId);
                            redoStack = [];
                            clearCanvas();

                            if (socket.readyState === WebSocket.OPEN) {
                                socket.send(JSON.stringify({
                                    type: "chat",
                                    message: JSON.stringify(shape),
                                    roomId
                                }));
                            }
                        }
                        cleanupInput();
                    };

                    const cleanupInput = () => {
                        if (input.parentElement) {
                            input.parentElement.removeChild(input);
                        }
                        if (activeTextInput === input) {
                            activeTextInput = null;
                        }
                    };

                    input.addEventListener("keydown", (ev) => {
                        if (ev.key === "Enter") {
                            commitText();
                        } else if (ev.key === "Escape") {
                            cleanupInput();
                        }
                    });

                    input.addEventListener("blur", () => {
                        setTimeout(() => {
                            if (activeTextInput === input) {
                                commitText();
                            }
                        }, 100);
                    });

                    return;
                }

                clicked = true;
                startX = (e.clientX - rect.left - panX) / zoom;
                startY = (e.clientY - rect.top - panY) / zoom;

                if (getActiveTool() === "pencil") {
                    currentPencilPoints = [{ x: startX, y: startY }];
                } else if (getActiveTool() === "eraser") {
                    currentEraserPoints = [{ x: startX, y: startY }];
                }
            };

            const handleMouseUp = (e: MouseEvent) => {
                let tool = getActiveTool();
                if (isPanning) {
                    isPanning = false;
                    canvas.style.cursor = tool === "pan" || isSpacePressed ? "grab" : "default";
                    return;
                }

                const rect = canvas.getBoundingClientRect();
                const currentWorldX = (e.clientX - rect.left - panX) / zoom;
                const currentWorldY = (e.clientY - rect.top - panY) / zoom;

                if (tool === "select") {
                    if (isResizing && selectedShape && originalShapeBeforeResize) {
                        isResizing = false;
                        activeResizeHandle = null;
                        originalShapeBeforeResize = null;
                        resizeStartBox = null;

                        const shapeId = selectedShape.id;
                        if (shapeId) {
                            if (socket.readyState === WebSocket.OPEN) {
                                socket.send(JSON.stringify({
                                    type: "delete_shape",
                                    shapeId: shapeId,
                                    roomId
                                }));
                                socket.send(JSON.stringify({
                                    type: "chat",
                                    message: JSON.stringify(selectedShape),
                                    roomId
                                }));
                            }
                        }
                        return;
                    }

                    if (isDragging && selectedShape && originalShapeCopy) {
                        isDragging = false;
                        const dx = currentWorldX - dragStartX;
                        const dy = currentWorldY - dragStartY;

                        if (Math.abs(dx) > 2 / zoom || Math.abs(dy) > 2 / zoom) {
                            const shapeId = selectedShape.id;
                            if (shapeId) {
                                if (socket.readyState === WebSocket.OPEN) {
                                    socket.send(JSON.stringify({
                                        type: "delete_shape",
                                        shapeId: shapeId,
                                        roomId
                                    }));
                                    socket.send(JSON.stringify({
                                        type: "chat",
                                        message: JSON.stringify(selectedShape),
                                        roomId
                                    }));
                                }
                            }
                        }
                        originalShapeCopy = null;
                    }
                    return;
                }

                if (getActiveTool() === "text") return;
                const width = currentWorldX - startX;
                const height = currentWorldY - startY;
                clicked = false;

                tool = getActiveTool();
                const color = getActiveColor() || undefined;
                const size = getActiveSize() || undefined;
                let shape: Shape;
                const shapeId = Math.random().toString(36).substring(2, 9);

                if (tool === "pencil") {
                    if (currentPencilPoints.length < 2) return;
                    shape = {
                        id: shapeId,
                        type: "pencil",
                        points: currentPencilPoints,
                        color: color,
                        size: size
                    };
                    currentPencilPoints = [];
                } else if (tool === "eraser") {
                    if (currentEraserPoints.length < 2) return;
                    shape = {
                        id: shapeId,
                        type: "eraser",
                        points: currentEraserPoints,
                        color: "#000000",
                        size: size
                    };
                    currentEraserPoints = [];
                } else if (tool === "rect") {
                    if (Math.abs(width) < 2 || Math.abs(height) < 2) return;
                    shape = {
                        id: shapeId,
                        type: "rect",
                        x: startX,
                        y: startY,
                        width: width,
                        height: height,
                        color: color,
                        size: size
                    };
                } else if (tool === "circle") {
                    const radius = Math.sqrt(width * width + height * height);
                    if (radius < 2) return;
                    shape = {
                        id: shapeId,
                        type: "circle",
                        x: startX,
                        y: startY,
                        radius: radius,
                        color: color,
                        size: size
                    };
                } else if (tool === "arrow") {
                    if (Math.abs(width) < 2 && Math.abs(height) < 2) return;
                    shape = {
                        id: shapeId,
                        type: "arrow",
                        x: startX,
                        y: startY,
                        endX: currentWorldX,
                        endY: currentWorldY,
                        color: color,
                        size: size
                    };
                } else { // triangle
                    if (Math.abs(width) < 2 && Math.abs(height) < 2) return;
                    shape = {
                        id: shapeId,
                        type: "triangle",
                        x: startX,
                        y: startY,
                        endX: currentWorldX,
                        endY: currentWorldY,
                        color: color,
                        size: size
                    };
                }

                existingShapes.push(shape);
                myDrawnShapeIds.push(shapeId);
                redoStack = [];

                if (socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        type: "chat",
                        message: JSON.stringify(shape),
                        roomId
                    }));
                } else {
                    console.warn("[Draw] Cannot send shape, socket is not open. State:", socket.readyState);
                }
            };

            const handleMouseMove = (e: MouseEvent) => {
                const tool = getActiveTool();
                const size = getActiveSize() || 2;
                const rect = canvas.getBoundingClientRect();

                if (isPanning) {
                    panX = e.clientX - panStartX;
                    panY = e.clientY - panStartY;
                    clearCanvas();
                    onViewChange?.(zoom, panX, panY);
                    return;
                }

                const currentWorldX = (e.clientX - rect.left - panX) / zoom;
                const currentWorldY = (e.clientY - rect.top - panY) / zoom;

                if (tool === "pan" || isSpacePressed) {
                    canvas.style.cursor = isPanning ? "grabbing" : "grab";
                } else if (tool !== "select") {
                    canvas.style.cursor = "default";
                }

                if (tool === "select") {
                    if (isResizing && selectedShape && originalShapeBeforeResize && resizeStartBox && activeResizeHandle) {
                        const shapeIndex = existingShapes.findIndex(s => s.id === selectedShape!.id);
                        if (shapeIndex !== -1) {
                            const updatedShape = resizeShape(originalShapeBeforeResize, activeResizeHandle, currentWorldX, currentWorldY, resizeStartBox);
                            existingShapes[shapeIndex] = updatedShape;
                            selectedShape = updatedShape;
                            clearCanvas();
                        }
                        return;
                    }

                    if (isDragging && selectedShape && originalShapeCopy) {
                        const dx = currentWorldX - dragStartX;
                        const dy = currentWorldY - dragStartY;

                        const shapeIndex = existingShapes.findIndex(s => s.id === selectedShape!.id);
                        if (shapeIndex !== -1) {
                            const updatedShape = moveShape(originalShapeCopy, dx, dy);
                            existingShapes[shapeIndex] = updatedShape;
                            selectedShape = updatedShape;
                            clearCanvas();
                        }
                        return;
                    }

                    // Update cursor style on hover when not dragging or resizing
                    if (!isDragging && !isResizing) {
                        if (selectedShape) {
                            const handle = getResizeHandleUnderMouse(currentWorldX, currentWorldY, selectedShape);
                            if (handle) {
                                if (handle === "TL" || handle === "BR") {
                                    canvas.style.cursor = "nwse-resize";
                                } else {
                                    canvas.style.cursor = "nesw-resize";
                                }
                                return;
                            }

                            if (isPointInShape(currentWorldX, currentWorldY, selectedShape)) {
                                canvas.style.cursor = "move";
                                return;
                            }
                        }

                        let hoverShape = false;
                        for (let i = existingShapes.length - 1; i >= 0; i--) {
                            const s = existingShapes[i];
                            if (s && isPointInShape(currentWorldX, currentWorldY, s)) {
                                hoverShape = true;
                                break;
                            }
                        }

                        if (hoverShape) {
                            canvas.style.cursor = "pointer";
                        } else {
                            canvas.style.cursor = "default";
                        }
                    }
                    return;
                }

                if (tool === "text") return;

                if (tool === "eraser") {
                    if (clicked) {
                        currentEraserPoints.push({ x: currentWorldX, y: currentWorldY });
                    }

                    clearCanvas();

                    // Draw only the preview circle of the eraser tool on the main canvas
                    ctx.save();
                    ctx.translate(panX, panY);
                    ctx.scale(zoom, zoom);
                    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
                    ctx.lineWidth = 1 / zoom;
                    ctx.beginPath();
                    ctx.arc(currentWorldX, currentWorldY, size / 2, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.restore();

                    return;
                }

                if (clicked){
                    const width = currentWorldX - startX;
                    const height = currentWorldY - startY;
                    const color = getActiveColor() || "#ffffff";

                    if (tool === "pencil") {
                        currentPencilPoints.push({ x: currentWorldX, y: currentWorldY });
                        clearCanvas();
                        return;
                    }

                    clearCanvas();
                    ctx.save();
                    ctx.translate(panX, panY);
                    ctx.scale(zoom, zoom);
                    ctx.strokeStyle = color;
                    ctx.lineWidth = size;

                    if (tool === "rect") {
                        ctx.strokeRect(startX, startY, width, height);
                    } else if (tool === "circle") {
                        const radius = Math.sqrt(width * width + height * height);
                        ctx.beginPath();
                        ctx.arc(startX, startY, radius, 0, Math.PI * 2);
                        ctx.stroke();
                    } else if (tool === "arrow") {
                        ctx.beginPath();
                        ctx.moveTo(startX, startY);
                        ctx.lineTo(currentWorldX, currentWorldY);
                        ctx.stroke();
                        
                        const angle = Math.atan2(height, width);
                        const headLength = 15;
                        ctx.beginPath();
                        ctx.moveTo(currentWorldX, currentWorldY);
                        ctx.lineTo(currentWorldX - headLength * Math.cos(angle - Math.PI / 6), currentWorldY - headLength * Math.sin(angle - Math.PI / 6));
                        ctx.moveTo(currentWorldX, currentWorldY);
                        ctx.lineTo(currentWorldX - headLength * Math.cos(angle + Math.PI / 6), currentWorldY - headLength * Math.sin(angle + Math.PI / 6));
                        ctx.stroke();
                    } else if (tool === "triangle") {
                        ctx.beginPath();
                        ctx.moveTo(startX, startY);
                        ctx.lineTo(2 * startX - currentWorldX, currentWorldY);
                        ctx.lineTo(currentWorldX, currentWorldY);
                        ctx.closePath();
                        ctx.stroke();
                    }
                    ctx.restore();
                }
            };

            const handleMouseLeave = () => {
                if (getActiveTool() === "eraser") {
                    clearCanvas();
                }
            };

            const handleWheel = (e: WheelEvent) => {
                e.preventDefault();
                const rect = canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;

                const zoomFactor = 1.1;
                let newZoom = zoom;
                if (e.deltaY < 0) {
                    newZoom = Math.min(newZoom * zoomFactor, 20);
                } else {
                    newZoom = Math.max(newZoom / zoomFactor, 0.1);
                }

                if (newZoom !== zoom) {
                    const worldX = (mouseX - panX) / zoom;
                    const worldY = (mouseY - panY) / zoom;
                    zoom = newZoom;
                    panX = mouseX - worldX * zoom;
                    panY = mouseY - worldY * zoom;

                    clearCanvas();
                    onViewChange?.(zoom, panX, panY);
                }
            };

            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.code === "Space") {
                    if (document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
                        e.preventDefault();
                        isSpacePressed = true;
                        canvas.style.cursor = "grab";
                    }
                }
            };

            const handleKeyUp = (e: KeyboardEvent) => {
                if (e.code === "Space") {
                    isSpacePressed = false;
                    const tool = getActiveTool();
                    if (tool === "select") {
                        canvas.style.cursor = "default";
                    }
                }
            };

            canvas.addEventListener("mousedown", handleMouseDown);
            canvas.addEventListener("mouseup", handleMouseUp);
            canvas.addEventListener("mousemove", handleMouseMove);
            canvas.addEventListener("mouseleave", handleMouseLeave);
            canvas.addEventListener("wheel", handleWheel, { passive: false });
            window.addEventListener("keydown", handleKeyDown);
            window.addEventListener("keyup", handleKeyUp);

            const undo = () => {
                if (myDrawnShapeIds.length === 0) return;
                const lastId = myDrawnShapeIds.pop();
                if (!lastId) return;

                selectedShape = null;

                const shapeIndex = existingShapes.findIndex(s => s.id === lastId);
                if (shapeIndex !== -1) {
                    const [removedShape] = existingShapes.splice(shapeIndex, 1);
                    if (removedShape) {
                        redoStack.push(removedShape);
                    }
                    clearCanvas();

                    if (socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({
                            type: "delete_shape",
                            shapeId: lastId,
                            roomId
                        }));
                    }
                }
            };

            const redo = () => {
                if (redoStack.length === 0) return;
                const restoredShape = redoStack.pop();
                if (!restoredShape) return;

                selectedShape = null;
                existingShapes.push(restoredShape);
                if (restoredShape.id) {
                    myDrawnShapeIds.push(restoredShape.id);
                }
                clearCanvas();

                if (socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        type: "chat",
                        message: JSON.stringify(restoredShape),
                        roomId
                    }));
                }
            };

            const clear = () => {
                selectedShape = null;
                existingShapes = [];
                myDrawnShapeIds = [];
                redoStack = [];
                clearCanvas();

                if (socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        type: "clear_canvas",
                        roomId
                    }));
                }
            };

            return {
                cleanup: () => {
                    canvas.removeEventListener("mousedown", handleMouseDown);
                    canvas.removeEventListener("mouseup", handleMouseUp);
                    canvas.removeEventListener("mousemove", handleMouseMove);
                    canvas.removeEventListener("mouseleave", handleMouseLeave);
                    canvas.removeEventListener("wheel", handleWheel);
                    window.removeEventListener("keydown", handleKeyDown);
                    window.removeEventListener("keyup", handleKeyUp);
                    socket.onmessage = null;
                    if (activeTextInput && activeTextInput.parentElement) {
                        activeTextInput.parentElement.removeChild(activeTextInput);
                    }
                },
                undo,
                redo,
                clear,
                getShapes: () => existingShapes,
                resetView: () => {
                    panX = 0;
                    panY = 0;
                    zoom = 1;
                    clearCanvas();
                    onViewChange?.(zoom, panX, panY);
                },
                zoomIn: () => {
                    const rect = canvas.getBoundingClientRect();
                    const centerX = rect.width / 2;
                    const centerY = rect.height / 2;
                    const worldX = (centerX - panX) / zoom;
                    const worldY = (centerY - panY) / zoom;
                    zoom = Math.min(zoom * 1.2, 20);
                    panX = centerX - worldX * zoom;
                    panY = centerY - worldY * zoom;
                    clearCanvas();
                    onViewChange?.(zoom, panX, panY);
                },
                zoomOut: () => {
                    const rect = canvas.getBoundingClientRect();
                    const centerX = rect.width / 2;
                    const centerY = rect.height / 2;
                    const worldX = (centerX - panX) / zoom;
                    const worldY = (centerY - panY) / zoom;
                    zoom = Math.max(zoom / 1.2, 0.1);
                    panX = centerX - worldX * zoom;
                    panY = centerY - worldY * zoom;
                    clearCanvas();
                    onViewChange?.(zoom, panX, panY);
                },
                updateSelectedShapeColor: (newColor: string) => {
                    if (selectedShape && selectedShape.id) {
                        selectedShape.color = newColor;
                        const shapeIndex = existingShapes.findIndex(s => s.id === selectedShape!.id);
                        if (shapeIndex !== -1) {
                            existingShapes[shapeIndex] = { ...selectedShape };
                        }
                        clearCanvas();
                        if (socket.readyState === WebSocket.OPEN) {
                            socket.send(JSON.stringify({
                                type: "delete_shape",
                                shapeId: selectedShape.id,
                                roomId
                            }));
                            socket.send(JSON.stringify({
                                type: "chat",
                                message: JSON.stringify(selectedShape),
                                roomId
                            }));
                        }
                    }
                },
                updateSelectedShapeSize: (newSize: number) => {
                    if (selectedShape && selectedShape.id) {
                        selectedShape.size = newSize;
                        const shapeIndex = existingShapes.findIndex(s => s.id === selectedShape!.id);
                        if (shapeIndex !== -1) {
                            existingShapes[shapeIndex] = { ...selectedShape };
                        }
                        clearCanvas();
                        if (socket.readyState === WebSocket.OPEN) {
                            socket.send(JSON.stringify({
                                type: "delete_shape",
                                shapeId: selectedShape.id,
                                roomId
                            }));
                            socket.send(JSON.stringify({
                                type: "chat",
                                message: JSON.stringify(selectedShape),
                                roomId
                            }));
                        }
                    }
                }
            };
}

function drawShape(ctx: CanvasRenderingContext2D, shape: Shape) {
    ctx.strokeStyle = shape.color || "rgba(255,255,255)";
    ctx.lineWidth = shape.size || 2;

    if (shape.type === "rect") {
        ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
    } else if (shape.type === "circle") {
        ctx.beginPath();
        ctx.arc(shape.x, shape.y, shape.radius, 0, Math.PI * 2);
        ctx.stroke();
    } else if (shape.type === "arrow") {
        // Draw line
        ctx.beginPath();
        ctx.moveTo(shape.x, shape.y);
        ctx.lineTo(shape.endX, shape.endY);
        ctx.stroke();

        // Draw arrowhead
        const angle = Math.atan2(shape.endY - shape.y, shape.endX - shape.x);
        const headLength = 15;
        ctx.beginPath();
        ctx.moveTo(shape.endX, shape.endY);
        ctx.lineTo(shape.endX - headLength * Math.cos(angle - Math.PI / 6), shape.endY - headLength * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(shape.endX, shape.endY);
        ctx.lineTo(shape.endX - headLength * Math.cos(angle + Math.PI / 6), shape.endY - headLength * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
    } else if (shape.type === "triangle") {
        ctx.beginPath();
        ctx.moveTo(shape.x, shape.y);
        ctx.lineTo(2 * shape.x - shape.endX, shape.endY);
        ctx.lineTo(shape.endX, shape.endY);
        ctx.closePath();
        ctx.stroke();
    } else if (shape.type === "pencil") {
        if (shape.points.length > 0 && shape.points[0]) {
            ctx.beginPath();
            ctx.moveTo(shape.points[0].x, shape.points[0].y);
            for (let i = 1; i < shape.points.length; i++) {
                const p = shape.points[i];
                if (p) ctx.lineTo(p.x, p.y);
            }
            ctx.stroke();
        }
    } else if (shape.type === "text") {
        ctx.fillStyle = shape.color || "rgba(255,255,255)";
        const size = shape.size || 2;
        const fontSize = shape.fontSize || (size === 2 ? 14 : size === 6 ? 20 : size === 12 ? 28 : size === 20 ? 40 : 18);
        ctx.font = `${fontSize}px sans-serif`;
        ctx.textBaseline = "top";
        ctx.fillText(shape.text, shape.x, shape.y);
    } else if (shape.type === "eraser") {
        ctx.strokeStyle = "#000000";
        if (shape.points.length > 0 && shape.points[0]) {
            ctx.beginPath();
            ctx.moveTo(shape.points[0].x, shape.points[0].y);
            for (let i = 1; i < shape.points.length; i++) {
                const p = shape.points[i];
                if (p) ctx.lineTo(p.x, p.y);
            }
            ctx.stroke();
        }
    }
}

// Removed legacy clearCanvas helper since it has been moved inside initDraw.

async function getExistingShapes(roomId: string): Promise<Shape[]> {
    try {
        const res = await axios.get(`${HTTP_BACKEND}/chats/${roomId}`);
        const messages: { message: string }[] = res.data.messages;

        if (!Array.isArray(messages)) {
            console.warn("[Draw] /chats returned unexpected data:", res.data);
            return [];
        }

        const shapes: Shape[] = [];
        for (const x of messages) {
            try {
                const parsed = JSON.parse(x.message);
                // Validate: only accept known shape types
                if (parsed && (
                    parsed.type === "rect" || 
                    parsed.type === "circle" ||
                    parsed.type === "arrow" ||
                    parsed.type === "triangle" ||
                    parsed.type === "pencil" ||
                    parsed.type === "text" ||
                    parsed.type === "eraser"
                )) {
                    shapes.push(parsed as Shape);
                }
            } catch (e) {
                // Skip any corrupt/non-shape message rows silently
                console.warn("[Draw] Skipping unparseable message from DB:", x.message);
            }
        }

        return shapes;
    } catch (e) {
        console.error("[Draw] Failed to fetch existing shapes from backend:", e);
        return [];
    }
}