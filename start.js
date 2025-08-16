const { spawn } = require("child_process");
const os = require("os");
const path = require("path");

// Determine Python executable based on OS
const pythonExec = os.platform() === "win32" ? "python" : "python3";

// Optional: resolve absolute paths for safety
const backendPath = path.join(__dirname, "backend", "main.py");
const frontendPath = path.join(__dirname, "frontend");

function startBackend() {
  console.log("Starting backend...");
  return spawn(pythonExec, [backendPath], { stdio: "inherit", shell: true });
}

function startFrontend() {
  console.log("Starting frontend...");
  // On Windows, shell=true is required for npm scripts
  return spawn("npm", ["start", "--prefix", frontendPath], { stdio: "inherit", shell: true });
}

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startAll() {
  const backend = startBackend();

  // Delay before starting frontend (adjust as needed)
  await delay(10000); // wait 10 seconds for backend to be ready

  const frontend = startFrontend();

  // Handle process exits
  backend.on("exit", (code) => {
    console.log(`Backend exited with code ${code}`);
    frontend.kill();
  });

  frontend.on("exit", (code) => {
    console.log(`Frontend exited with code ${code}`);
    backend.kill();
  });

  // Handle unexpected errors
  backend.on("error", (err) => {
    console.error("Backend failed to start:", err);
    frontend.kill();
  });

  frontend.on("error", (err) => {
    console.error("Frontend failed to start:", err);
    backend.kill();
  });
}

startAll();
