import "./app.postcss";
import "flowbite/dist/flowbite.css";
import App from "./App.svelte";

const app = new App({
  target: document.getElementById("app")!,
});

export default app;
