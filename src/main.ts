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

const buttons = ["undo", "redo", "clear", "export"];
buttons.forEach((btn) => {
    const button = document.createElement("button");
    button.innerHTML = btn;
    buttonContainer.appendChild(button);
});

const toolContainer = document.createElement("div");
toolContainer.id = "tool-container";
app.appendChild(toolContainer);

const tools = ["Thin", "Thick"];
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

const colorPickerContainer = document.createElement("div");
colorPickerContainer.style.display = "flex";
colorPickerContainer.style.justifyContent = "center";
colorPickerContainer.style.marginTop = "10px";

const colorLabel = document.createElement("span");
colorLabel.textContent = "Color: ";
colorLabel.style.marginRight = "5px";

const colorPicker = document.createElement("input");
colorPicker.type = "color";
colorPicker.value = "#000000"; // Default color is black

colorPickerContainer.appendChild(colorLabel);
colorPickerContainer.appendChild(colorPicker);
app.appendChild(colorPickerContainer);

const ctx = canvas.getContext("2d")!;

// Data structures and global variables
const cursor = { active: false, x: 0, y: 0 };
const lines: MarkerLine[] = [];
const stickersOnCanvas: Sticker[] = [];
const redoStack: (MarkerLine | Sticker)[] = [];
let currentThickness = 3; // Default thickness
let currentColor = colorPicker.value; // Default color
let toolPreview: ToolPreview | null = null;
let currentSticker: string | null = null;
const initialStickers = ["🏈", "🏀", "⚾"];
const stickers = [...initialStickers];

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
    color: string;
    drag(x: number, y: number): void;
    display(ctx: CanvasRenderingContext2D): void;
}

function createMarkerLine(
    initialX: number,
    initialY: number,
    thickness: number,
    color: string,
): MarkerLine {
    return {
        points: [{ x: initialX, y: initialY }],
        thickness,
        color,
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
                ctx.strokeStyle = this.color;
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
                ctx.font = "24px Arial"; // Adjusted size
                ctx.fillText(currentSticker, x, y);
                ctx.globalAlpha = 1.0; // Reset opacity to default
            } else {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.thickness / 2, 0, Math.PI * 2);
                ctx.lineWidth = 2;
                ctx.strokeStyle = currentColor;
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
            ctx.font = "24px Arial"; // Adjusted size
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
        const newLine = createMarkerLine(
            cursor.x,
            cursor.y,
            currentThickness,
            currentColor,
        );
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

buttonContainer.querySelector("button:nth-child(1)")!.addEventListener( // Undo
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

buttonContainer.querySelector("button:nth-child(2)")!.addEventListener( // Redo
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

buttonContainer.querySelector("button:nth-child(3)")!.addEventListener( // Clear
    "click",
    () => {
        lines.length = 0;
        redoStack.length = 0;
        stickersOnCanvas.length = 0;
        canvas.dispatchEvent(new Event("drawing-changed"));
    },
);

buttonContainer.querySelector("button:nth-child(4)")!.addEventListener( // Export
    "click",
    () => {
        const exportCanvas = document.createElement("canvas");
        exportCanvas.width = 1024;
        exportCanvas.height = 1024;
        const exportCtx = exportCanvas.getContext("2d")!;
        exportCtx.scale(4, 4);
        exportCtx.lineCap = "round";

        lines.forEach((line) => {
            line.display(exportCtx);
        });

        stickersOnCanvas.forEach((sticker) => {
            sticker.display(exportCtx);
        });
        const dataUrl = exportCanvas.toDataURL();
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = "image.png";
        link.click();
    },
);

toolContainer.querySelector("button:nth-child(1)")!.addEventListener(
    "click",
    () => {
        currentThickness = 3; // Adjusted thickness
    },
);

toolContainer.querySelector("button:nth-child(2)")!.addEventListener(
    "click",
    () => {
        currentThickness = 8; // Adjusted thickness
    },
);

customStickerButton.addEventListener("click", () => {
    const newSticker = prompt("Enter a new sticker:", "😀");
    if (newSticker) {
        stickers.push(newSticker);
        renderStickers();
    }
});

colorPicker.addEventListener("input", (e) => {
    currentColor = (e.target as HTMLInputElement).value;
});

canvas.addEventListener("drawing-changed", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";

    lines.forEach((line) => {
        line.display(ctx);
    });

    stickersOnCanvas.forEach((sticker) => {
        sticker.display(ctx);
    });
});
