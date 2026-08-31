#!/usr/bin/env bun
// Save current Chrome/Brave debug tab as PDF via CDP (Page.printToPDF).
// Lives in the enrollment skill so every machine gets it from the plugin —
// do NOT copy this into per-month folders.
//
// Usage: bun save_pdf.js <output_path> [title_filter]
// Env:   CDP_PORT (default 9222) — must match the debug browser's port

const outputPath = process.argv[2];
const titleFilter = process.argv[3]?.toLowerCase();
const port = process.env.CDP_PORT || "9222";

if (!outputPath) {
  console.error("Usage: save_pdf.js <output_path> [title_filter]");
  process.exit(1);
}

// Get list of pages
const pagesRes = await fetch(`http://localhost:${port}/json`);
const pages = await pagesRes.json();

// Find matching page
let target = null;
for (const page of pages) {
  if (page.type !== "page") continue;
  if (titleFilter && !page.title?.toLowerCase().includes(titleFilter)) continue;
  target = page;
  break;
}
if (!target) {
  // fallback: first page
  target = pages.find(p => p.type === "page");
}
if (!target) {
  console.error("No page tab found");
  process.exit(1);
}

console.log(`Printing: ${target.title} (${target.url})`);

// Connect via WebSocket
const ws = new WebSocket(target.webSocketDebuggerUrl);

await new Promise((resolve, reject) => {
  ws.addEventListener("open", () => {
    ws.send(JSON.stringify({
      id: 1,
      method: "Page.printToPDF",
      params: {
        printBackground: true,
        format: "Letter",
        marginTop: 0.4,
        marginBottom: 0.4,
        marginLeft: 0.4,
        marginRight: 0.4,
      }
    }));
  });

  ws.addEventListener("message", (event) => {
    const result = JSON.parse(event.data);
    if (result.id === 1) {
      if (result.error) {
        reject(new Error(result.error.message));
        return;
      }
      const pdfData = Buffer.from(result.result.data, "base64");
      require("fs").writeFileSync(outputPath, pdfData);
      console.log(`Saved: ${outputPath} (${pdfData.length.toLocaleString()} bytes)`);
      ws.close();
      resolve();
    }
  });

  ws.addEventListener("error", reject);
  setTimeout(() => reject(new Error("Timeout")), 30000);
});
