import "./style.css";

const APP_NAME = "Paint Tool";
const app = document.querySelector<HTMLDivElement>("#app")!;

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

const undoButton = document.createElement("button");
undoButton.innerHTML = "undo";
buttonContainer.appendChild(undoButton);

const redoButton = document.createElement("button");
redoButton.innerHTML = "redo";
buttonContainer.appendChild(redoButton);

const clearButton = document.createElement("button");
clearButton.innerHTML = "clear";
buttonContainer.appendChild(clearButton);

const ctx = canvas.getContext("2d")!;

class MarkerLine {
    private points: { x: number; y: number }[] = [];

    constructor(initialX: number, initialY: number) {
        this.points.push({ x: initialX, y: initialY });
    }

    drag(x: number, y: number) {
        this.points.push({ x, y });
    }

    display(ctx: CanvasRenderingContext2D) {
        if (this.points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(this.points[0].x, this.points[0].y);
            for (let i = 1; i < this.points.length; i++) {
                ctx.lineTo(this.points[i].x, this.points[i].y);
            }
            ctx.stroke();
        }
    }
}

const cursor = { active: false, x: 0, y: 0 };
const lines: MarkerLine[] = [];
const redoStack: MarkerLine[] = [];

canvas.addEventListener("mousedown", (e) => {
    cursor.active = true;
    cursor.x = e.offsetX;
    cursor.y = e.offsetY;
    const newLine = new MarkerLine(cursor.x, cursor.y);
    lines.push(newLine);
    canvas.dispatchEvent(new Event("drawing-changed"));
});

canvas.addEventListener("mousemove", (e) => {
    if (cursor.active) {
        const currentLine = lines[lines.length - 1];
        currentLine.drag(e.offsetX, e.offsetY);
        canvas.dispatchEvent(new Event("drawing-changed"));
        cursor.x = e.offsetX;
        cursor.y = e.offsetY;
    }
});

canvas.addEventListener("mouseup", () => {
    cursor.active = false;
});

clearButton.addEventListener("click", () => {
    lines.length = 0;
    redoStack.length = 0;
    canvas.dispatchEvent(new Event("drawing-changed"));
});

undoButton.addEventListener("click", () => {
    if (lines.length > 0) {
        const lastLine = lines.pop();
        if (lastLine) {
            redoStack.push(lastLine);
        }
        canvas.dispatchEvent(new Event("drawing-changed"));
    }
});

redoButton.addEventListener("click", () => {
    if (redoStack.length > 0) {
        const lastRedoLine = redoStack.pop();
        if (lastRedoLine) {
            lines.push(lastRedoLine);
        }
        canvas.dispatchEvent(new Event("drawing-changed"));
    }
});

canvas.addEventListener("drawing-changed", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = "black";

    lines.forEach((line) => {
        line.display(ctx);
    });
});
