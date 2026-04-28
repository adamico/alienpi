import { Timer, time } from "./node_modules/littlejsengine/dist/littlejs.esm.js";
const timer = new Timer(1.0);
console.log("Timer created at time:", time);
console.log("Timer get():", timer.get());
console.log("Timer elapsed():", timer.elapsed());
