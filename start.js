const { spawn } = require("child_process");
const os = require("os");

// Determine Python executable based on OS
const pythonExec = os.platform() === "win32" ? "python" : "python3";

function startBackend() {
  console.log("Starting backend...");
  return spawn(pythonExec, ["backend/main.py"], { stdio: "inherit", shell: true });
}

function startFrontend() {
  console.log("Starting frontend...");
  return spawn("npm", ["start", "--prefix", "frontend"], { stdio: "inherit", shell: true });
}

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startAll() {
  const backend = startBackend();

  // Delay before starting frontend (adjust as needed)
  await delay(10000); // wait 10 seconds

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
