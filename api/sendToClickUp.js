// api/sendToClickUp.js

export default async function handler(req, res) {
  // Pozwalamy, żeby nasz serwer mógł być wołany z AI Studio (CORS)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Oczekujemy, że frontend wyśle JSON:
    // { type: "quote" | "contact", name, email, message, extra? }
    const { type, name, email, message, extra } = req.body || {};

    if (!type || !name || !email) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Wybieramy listę w ClickUp na podstawie typu formularza
    const listMap = {
      quote: process.env.CLICKUP_LIST_ID_QUOTE,
      contact: process.env.CLICKUP_LIST_ID_CONTACT,
    };

    const listId = listMap[type];

    if (!listId) {
      return res.status(400).json({ error: "Unknown form type" });
    }

    const apiKey = process.env.CLICKUP_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Server misconfigured" });
    }

    // Opis taska
    let description = `Email: ${email}\n\nMessage:\n${message || ""}`;

    // Dodatkowe pola (np. budżet, timeline)
    if (extra && typeof extra === "object") {
      description += `\n\n--- Extra ---\n`;
      for (const [key, value] of Object.entries(extra)) {
        description += `${key}: ${value}\n`;
      }
    }

    // Nazwa taska zależnie od typu
    const taskName =
      type === "quote"
        ? `QUOTE request from ${name}`
        : `Contact form from ${name}`;

    // Call do ClickUp
    const clickupResponse = await fetch(
      `https://api.clickup.com/api/v2/list/${listId}/task`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: apiKey,
        },
        body: JSON.stringify({
          name: taskName,
          description,
        }),
      }
    );

    const data = await clickupResponse.json();

    if (!clickupResponse.ok) {
      console.error("ClickUp error:", data);
      return res
        .status(500)
        .json({ error: "ClickUp API error", details: data });
    }

    return res.status(200).json({ success: true, task: data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
