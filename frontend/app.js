//Generates sessionID for the backend, passes URL to the ingestion pipeline
const sessionID = crypto.randomUUID()

async function submitUrl() {
    const url = document.getElementById("urlInput").value;

    await fetch("/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, sessionID }),
    });
}

document.getElementById("submitBtn").addEventListener("click", submitUrl);