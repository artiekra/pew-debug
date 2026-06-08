const { JSDOM } = require("jsdom");
const dom = new JSDOM();
const { window } = dom;

const originalEvent = new window.KeyboardEvent("keydown", { key: "ArrowUp", code: "ArrowUp" });
Object.defineProperty(originalEvent, "keyCode", { get: () => 38 });

const clonedEvent = new window.KeyboardEvent("keydown", originalEvent);
console.log("Cloned keyCode:", clonedEvent.keyCode);

const mouseEvent = new window.MouseEvent("mousemove", { clientX: 100, clientY: 200 });
const clonedMouse = new window.MouseEvent("mousemove", mouseEvent);
console.log("Cloned clientX:", clonedMouse.clientX);
