import "./style.css";

const APP_NAME = "Paint Tool";
const app = document.querySelector<HTMLDivElement>("#app")!;

const title = document.createElement("h1");
title.textContent = APP_NAME;
app.appendChild(title);

const canvas = document.createElement("canvas");
canvas.id = "appCanvas";
app.appendChild(canvas);
