const { exec } = require('child_process');

console.log("Starting backend server for a quick test...");
const serverProcess = exec('node src/app.js');

setTimeout(async () => {
    try {
        console.log("Pinging ticket creation endpoint...");
        const res = await fetch("http://localhost:3000/api/tickets/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ serviceId: 1 })
        });
        
        const data = await res.json();
        console.log("Response Status:", res.status);
        console.log("Response Body:", data);
        
    } catch(e) {
        console.error("Fetch Exception:", e.message);
    } finally {
        console.log("Shutting down the test server.");
        serverProcess.kill();
        process.exit(0);
    }
}, 3000);
