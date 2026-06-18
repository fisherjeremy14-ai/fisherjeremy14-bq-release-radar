# BigQuery Release Notes Radar

[![Python Version](https://img.shields.io/badge/python-3.8%20%7C%203.9%20%7C%203.10%20%7C%203.11%20%7C%203.12%20%7C%203.13%20%7C%203.14-blue.svg)](https://www.python.org/)
[![Flask Version](https://img.shields.io/badge/flask-3.0%2B-green.svg)](https://flask.palletsprojects.com/)
[![License](https://img.shields.io/badge/license-MIT-orange.svg)](LICENSE)
[![GCP Data Source](https://img.shields.io/badge/GCP%20Source-Official%20Feed-blueviolet.svg)](https://docs.cloud.google.com/feeds/bigquery-release-notes.xml)

A modern, high-performance developer dashboard built with **Python Flask** and **Vanilla HTML5, CSS3, and JavaScript** that aggregates, parses, and formats official Google BigQuery release notes. It allows users to filter, search, preview, and share release updates directly to Twitter/X.

---

## 🌟 Key Features

*   **Granular Parsing & Organization:** Splits multi-entry daily release notes by type headings (`Feature`, `Announcement`, `Issue`, `Deprecation`) into clean, independent cards.
*   **In-Memory Caching:** Includes a 5-minute TTL caching system to ensure extremely fast local responses while avoiding feed-throttling from Google's servers.
*   **Forced Sync Override:** Allows a manual cache bypass utilizing an animated loader spinner during active fetch operations.
*   **Premium Dark UI:** Sleek, visual developer-focused dashboard with category-specific colored badges, responsive grid layouts, and glowing focus states.
*   **X/Twitter Composer Modal:** Custom modal composer that accurately handles character counting based on X's standard URL rules (treating all links as exactly 23 characters), provides hashtag toggles, and showcases a live Twitter card mock layout.
*   **Utility Operations:** Supports copy-to-clipboard actions directly on cards (with success state animations) and instant CSV generation/downloads for currently filtered search results on the client side.

---

## 🛠️ Technology Stack

*   **Backend:** Python 3, Flask, `requests` (HTTP client), `feedparser` (Atom parser), `beautifulsoup4` (HTML parsing/manipulation)
*   **Frontend:** Vanilla HTML5, Vanilla JavaScript (ES6+), Vanilla CSS3 (Custom design system with CSS Variables)
*   **Icons & Fonts:** FontAwesome 6, Google Fonts (Inter, Outfit, JetBrains Mono)

---

## 📂 Project Structure

```text
fisherjeremy14-bq-release-radar/
├── .gitignore              # Configured patterns for venv, caches, & IDE files
├── README.md               # Project documentation (this file)
├── app.py                  # Core Flask server, feed scraper & caching layer
├── requirements.txt        # Backend dependencies
├── templates/
│   └── index.html          # Frontend page template & Tweet Composer Modal
└── static/
    ├── css/
    │   └── style.css       # Visual themes, layout styles & responsive queries
    └── js/
        └── app.js          # Client-side state, event handlers & X Web Intent
```

---

## 🚀 Quick Start Guide

### 1. Prerequisite Checks
Ensure you have Python 3.8+ and `pip` installed:
```bash
python3 --version
pip --version
```

### 2. Clone the Repository
```bash
git clone https://github.com/fisherjeremy14-ai/fisherjeremy14-bq-release-radar.git
cd fisherjeremy14-bq-release-radar
```

### 3. Initialize & Activate Virtual Environment
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 4. Install Dependencies
```bash
pip install -r requirements.txt
```

### 5. Run the Server
```bash
python app.py
```
The server will boot in debug mode on **[http://127.0.0.1:5000](http://127.0.0.1:5000)**.

---

## 📡 API Reference

#### Fetch Release Notes
*   **Endpoint:** `/api/releases`
*   **Method:** `GET`
*   **Query Parameters:** 
    *   `refresh` (boolean, optional): Set to `true` to force bypass the cache and parse the feed directly from GCP.
*   **Sample Response:**
    ```json
    {
      "success": true,
      "refetched": false,
      "last_fetched": 1781745345.247,
      "releases": [
        {
          "date": "June 17, 2026",
          "updated": "2026-06-17T00:00:00-07:00",
          "items": [
            {
              "id": "item-31523326-0",
              "type": "Feature",
              "content_html": "<p>You can enable <a href=\"...\" target=\"_blank\" rel=\"noopener noreferrer\">autonomous embedding generation</a>...</p>",
              "raw_text": "You can enable autonomous embedding generation on new or existing tables...",
              "link": "https://docs.cloud.google.com/bigquery/docs/release-notes#June_17_2026"
            }
          ]
        }
      ]
    }
    ```

---

## 🐦 Tweet Composer Specifications

Twitter/X implements specific text limits. The app's Javascript parser evaluates length correctly using the following guidelines:
1.  **Link Value:** Any URL matching `https?://...` is automatically measured as exactly **23 characters**, matching Twitter's `t.co` shortening standard.
2.  **Auto Truncation:** Compiles: `📢 BigQuery {Type} ({Date}): "{CleanText}" {Link} {Hashtags}`. If the text exceeds **280 characters**, the description is sliced and appended with `...` to stay within boundaries.
3.  **UI Feedback:** An SVG circular progress ring turns from **Blue (Safe)** to **Red (Over Limit)** and disables submission if the count exceeds 280.
