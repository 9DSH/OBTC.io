const { spawn } = require("child_process");

function startBackend() {
  console.log("Starting backend...");
  return spawn("python", ["backend/main.py"], { stdio: "inherit" });
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
  await delay(10000); // wait 3 seconds

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
}

startAll();
