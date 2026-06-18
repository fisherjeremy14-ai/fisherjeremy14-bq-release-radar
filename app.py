from flask import Flask, render_template, jsonify, request
import requests
import feedparser
from bs4 import BeautifulSoup
import re
import copy
import time

app = Flask(__name__)

# Cache configuration
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
cache = {
    "data": None,
    "last_fetched": 0,
    "ttl": 300  # 5 minutes cache
}

def parse_entry_content(html_content, entry_link):
    """
    Parses the HTML content of a feed entry and splits it into discrete updates by <h3> headers.
    """
    soup = BeautifulSoup(html_content, 'html.parser')
    items = []
    
    # Find all h3/h4 tags
    headers = soup.find_all(['h3', 'h4'])
    
    if not headers:
        # Fallback if no headings found
        text = soup.get_text().strip()
        text = re.sub(r'\s+', ' ', text)
        
        # Clean links
        for link in soup.find_all('a'):
            link['target'] = '_blank'
            link['rel'] = 'noopener noreferrer'
            if link.get('href', '').startswith('/'):
                link['href'] = 'https://docs.cloud.google.com' + link['href']
                
        return [{
            "id": "item-default-" + str(hash(entry_link)),
            "type": "Update",
            "content_html": str(soup),
            "raw_text": text,
            "link": entry_link
        }]

    for idx, header in enumerate(headers):
        item_type = header.get_text().strip()
        elements = []
        
        # Extract siblings until next header
        curr = header.next_sibling
        while curr and curr not in headers:
            if curr.name or (isinstance(curr, str) and curr.strip()):
                elements.append(copy.copy(curr))
            curr = curr.next_sibling
            
        item_soup = BeautifulSoup("", 'html.parser')
        for el in elements:
            item_soup.append(el)
            
        # Standardize links
        for link in item_soup.find_all('a'):
            link['target'] = '_blank'
            link['rel'] = 'noopener noreferrer'
            if link.get('href', '').startswith('/'):
                link['href'] = 'https://docs.cloud.google.com' + link['href']
                
        text = item_soup.get_text().strip()
        text = re.sub(r'\s+', ' ', text)
        
        # Generate a unique stable ID based on the text contents
        item_hash = str(abs(hash(text + item_type + entry_link)))
        
        items.append({
            "id": f"item-{item_hash[:8]}-{idx}",
            "type": item_type,
            "content_html": str(item_soup),
            "raw_text": text,
            "link": entry_link
        })
        
    return items

def fetch_and_parse_feed(force_refresh=False):
    """
    Fetches the BigQuery Atom feed and returns parsed release notes.
    """
    current_time = time.time()
    
    # Return cache if available and not expired (and not forced)
    if not force_refresh and cache["data"] and (current_time - cache["last_fetched"] < cache["ttl"]):
        return cache["data"], False
        
    try:
        # Fetch the live XML feed
        response = requests.get(FEED_URL, timeout=15)
        response.raise_for_status()
        xml_content = response.text
        
        # Parse Atom Feed using feedparser
        feed = feedparser.parse(xml_content)
        
        entries = []
        for entry in feed.entries:
            entry_link = entry.get('link', '')
            if not entry_link and 'links' in entry:
                for l in entry.links:
                    if l.get('rel') == 'alternate':
                        entry_link = l.get('href')
                        break
            if not entry_link:
                entry_link = entry.get('id', '')
                
            content_val = ""
            if 'content' in entry:
                content_val = entry.content[0].value
            elif 'summary' in entry:
                content_val = entry.summary
                
            items = parse_entry_content(content_val, entry_link)
            
            # Formatting update timestamp
            updated_str = entry.get('updated', '')
            
            entries.append({
                "date": entry.get('title', 'Unknown Date'),
                "updated": updated_str,
                "items": items
            })
            
        # Update cache
        cache["data"] = entries
        cache["last_fetched"] = current_time
        return entries, True
        
    except Exception as e:
        print(f"Error fetching feed: {e}")
        # If fetch fails but we have cached data, fall back to cache
        if cache["data"]:
            return cache["data"], False
        raise e

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        releases, refetched = fetch_and_parse_feed(force_refresh=force_refresh)
        return jsonify({
            "success": True,
            "refetched": refetched,
            "last_fetched": cache["last_fetched"],
            "releases": releases
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
