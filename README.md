# BigQuery Release Notes Radar

A Flask and vanilla web application that retrieves Google BigQuery release notes and parses them into discrete, categorized updates, allowing users to search, filter, and compose/publish tweets about specific updates.

## Features

- **Robust Feed Parsing:** Breaks down Google's BigQuery Atom feed updates by headers (`Feature`, `Announcement`, `Issue`, `Deprecation`) for modular viewing.
- **Cache Management:** Caches responses in memory for 5 minutes with a force-refresh capability (complete with a UI loading spinner).
- **Interactive Developer UI:** A premium, responsive dark-themed developer dashboard featuring category-specific color tokens, glowing card selections, and an instant search/filtering mechanism.
- **Twitter/X Composer Modal:** Custom modal composer highlighting character limit validation (specifically counting URLs as exactly 23 characters matching Twitter rules), live preview card, and quick hashtag injection tags.

## Project Structure

```text
.gitignore
app.py
requirements.txt
README.md
static/
  css/
    style.css
  js/
    app.js
templates/
  index.html
```

## Quick Start

### 1. Set up Virtual Environment
```bash
python3 -m venv venv
source venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Run the Server
```bash
python app.py
```
The server will run on `http://127.0.0.1:5000/`.

## License
MIT License. Data sourced from Google Cloud Platform.
