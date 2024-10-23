import "./style.css";

const APP_NAME = "Paint Tool";
const app = document.querySelector<HTMLDivElement>("#app")!;

// UI elements
const title = document.createElement("h1");
title.textContent = APP_NAME;
app.appendChild(title);

const canvas = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;
app.appendChild(canvas);

const buttonContainer = document.createElement("div");
buttonContainer.id = "button-container";
app.appendChild(buttonContainer);

const buttons = ["undo", "redo", "clear"];
buttons.forEach((btn) => {
    const button = document.createElement("button");
    button.innerHTML = btn;
    buttonContainer.appendChild(button);
});

const toolContainer = document.createElement("div");
toolContainer.id = "tool-container";
app.appendChild(toolContainer);

const tools = ["thin", "thick"];
tools.forEach((tool) => {
    const button = document.createElement("button");
    button.innerHTML = tool;
    toolContainer.appendChild(button);
});

const stickerContainer = document.createElement("div");
stickerContainer.id = "sticker-container";
app.appendChild(stickerContainer);

const customStickerButton = document.createElement("button");
customStickerButton.innerHTML = "Add Custom Sticker";
app.appendChild(customStickerButton);

const ctx = canvas.getContext("2d")!;

// Data structures and global variables
const cursor = { active: false, x: 0, y: 0 };
const lines: MarkerLine[] = [];
const stickersOnCanvas: Sticker[] = [];
const redoStack: (MarkerLine | Sticker)[] = [];
let currentThickness = 5; // Default thickness
let toolPreview: ToolPreview | null = null;
let currentSticker: string | null = null;
const initialStickers = ["😀", "🏀", "🌟"];
let stickers = [...initialStickers];

// Helper functions
function renderStickers() {
    stickerContainer.innerHTML = "";
    stickers.forEach((sticker, index) => {
        const button = document.createElement("button");
        button.innerHTML = sticker;
        button.addEventListener("click", () => {
            currentSticker = stickers[index];
            canvas.dispatchEvent(new Event("tool-moved"));
        });
        stickerContainer.appendChild(button);
    });
}
renderStickers(); // Render initial stickers

// Interfaces & constructor functions
interface MarkerLine {
    points: { x: number; y: number }[];
    thickness: number;
    drag(x: number, y: number): void;
    display(ctx: CanvasRenderingContext2D): void;
}

function createMarkerLine(
    initialX: number,
    initialY: number,
    thickness: number,
): MarkerLine {
    return {
        points: [{ x: initialX, y: initialY }],
        thickness,
        drag(x: number, y: number) {
            this.points.push({ x, y });
        },
        display(ctx: CanvasRenderingContext2D) {
            if (this.points.length > 1) {
                ctx.beginPath();
                ctx.moveTo(this.points[0].x, this.points[0].y);
                for (let i = 1; i < this.points.length; i++) {
                    ctx.lineTo(this.points[i].x, this.points[i].y);
                }
                ctx.lineWidth = this.thickness;
                ctx.stroke();
            }
        },
    };
}

interface ToolPreview {
    x: number;
    y: number;
    thickness: number;
    draw(ctx: CanvasRenderingContext2D): void;
}

function createToolPreview(
    x: number,
    y: number,
    thickness: number,
): ToolPreview {
    canvas.classList.add("hide-cursor"); // Hide the cursor
    return {
        x,
        y,
        thickness,
        draw(ctx: CanvasRenderingContext2D) {
            if (currentSticker) {
                ctx.globalAlpha = 0.5; // Set opacity to 50%
                ctx.font = "30px Arial";
                ctx.fillText(currentSticker, x, y);
                ctx.globalAlpha = 1.0; // Reset opacity to default
            } else {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.thickness / 2, 0, Math.PI * 2);
                ctx.lineWidth = 2;
                ctx.strokeStyle = "red";
                ctx.stroke();
            }
        },
    };
}

interface Sticker {
    x: number;
    y: number;
    emoji: string;
    drag(x: number, y: number): void;
    display(ctx: CanvasRenderingContext2D): void;
}

function createSticker(x: number, y: number, emoji: string): Sticker {
    return {
        x,
        y,
        emoji,
        drag(newX: number, newY: number) {
            this.x = newX;
            this.y = newY;
        },
        display(ctx: CanvasRenderingContext2D) {
            ctx.font = "30px Arial";
            ctx.fillText(this.emoji, this.x, this.y);
        },
    };
}

// Event listeners
canvas.addEventListener("mouseout", () => {
    toolPreview = null;
    canvas.classList.remove("hide-cursor"); // Show the cursor
    canvas.dispatchEvent(new Event("tool-moved"));
});

canvas.addEventListener("tool-moved", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.strokeStyle = "black";

    lines.forEach((line) => {
        line.display(ctx);
    });

    stickersOnCanvas.forEach((sticker) => {
        sticker.display(ctx);
    });

    if (toolPreview) {
        toolPreview.draw(ctx);
    }
});

canvas.addEventListener("mousedown", (e) => {
    cursor.active = true;
    cursor.x = e.offsetX;
    cursor.y = e.offsetY;
    if (currentSticker) {
        const newSticker = createSticker(cursor.x, cursor.y, currentSticker);
        stickersOnCanvas.push(newSticker);
        currentSticker = null;
    } else {
        const newLine = createMarkerLine(cursor.x, cursor.y, currentThickness);
        lines.push(newLine);
    }
    canvas.dispatchEvent(new Event("drawing-changed"));
    canvas.dispatchEvent(new Event("tool-moved"));
});

canvas.addEventListener("mousemove", (e) => {
    if (cursor.active) {
        if (currentSticker) {
            const currentStickerObj =
                stickersOnCanvas[stickersOnCanvas.length - 1];
            currentStickerObj.drag(e.offsetX, e.offsetY);
        } else {
            const currentLine = lines[lines.length - 1];
            currentLine.drag(e.offsetX, e.offsetY);
        }
        canvas.dispatchEvent(new Event("drawing-changed"));
        cursor.x = e.offsetX;
        cursor.y = e.offsetY;
    }
    toolPreview = createToolPreview(e.offsetX, e.offsetY, currentThickness);
    canvas.dispatchEvent(new Event("tool-moved"));
});

canvas.addEventListener("mouseup", () => {
    cursor.active = false;
});

buttonContainer.querySelector("button:nth-child(1)")!.addEventListener(
    "click",
    () => {
        if (lines.length > 0 || stickersOnCanvas.length > 0) {
            if (lines.length > 0) {
                const lastLine = lines.pop();
                if (lastLine) {
                    redoStack.push(lastLine);
                }
            } else if (stickersOnCanvas.length > 0) {
                const lastSticker = stickersOnCanvas.pop();
                if (lastSticker) {
                    redoStack.push(lastSticker);
                }
            }
            canvas.dispatchEvent(new Event("drawing-changed"));
        }
    },
);

buttonContainer.querySelector("button:nth-child(2)")!.addEventListener(
    "click",
    () => {
        if (redoStack.length > 0) {
            const lastRedoItem = redoStack.pop();
            if (lastRedoItem) {
                if ("points" in lastRedoItem) {
                    lines.push(lastRedoItem);
                } else {
                    stickersOnCanvas.push(lastRedoItem);
                }
            }
            canvas.dispatchEvent(new Event("drawing-changed"));
        }
    },
);

buttonContainer.querySelector("button:nth-child(3)")!.addEventListener(
    "click",
    () => {
        lines.length = 0;
        redoStack.length = 0;
        stickersOnCanvas.length = 0;
        canvas.dispatchEvent(new Event("drawing-changed"));
    },
);

toolContainer.querySelector("button:nth-child(1)")!.addEventListener(
    "click",
    () => {
        currentThickness = 5;
    },
);

toolContainer.querySelector("button:nth-child(2)")!.addEventListener(
    "click",
    () => {
        currentThickness = 10;
    },
);

customStickerButton.addEventListener("click", () => {
    const newSticker = prompt("Enter a new sticker:", "😀");
    if (newSticker) {
        stickers.push(newSticker);
        renderStickers();
    }
});

canvas.addEventListener("drawing-changed", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.strokeStyle = "black";

    lines.forEach((line) => {
        line.display(ctx);
    });

    stickersOnCanvas.forEach((sticker) => {
        sticker.display(ctx);
    });
});
