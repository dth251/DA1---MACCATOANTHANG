import http.server
import socketserver
import os
import sys
import json

PORT = 3000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DIRECTORY = os.path.join(BASE_DIR, 'frontend')
SETTINGS_FILE = os.path.join(DIRECTORY, 'assets', 'web-settings.json')

DEFAULT_SETTINGS = {
    "brandName": "Macca Toàn Thắng",
    "phone": "0975895024",
    "phoneDisplay": "0975.895.024",
    "zalo": "https://zalo.me/0975895024",
    "facebook": "https://facebook.com/maccatoanthang",
    "email": "maccatoanthang@gmail.com",
    "address": "Sơn Lương, Phú Thọ"
}

def load_settings():
    try:
        if os.path.exists(SETTINGS_FILE):
            with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        print(f"Error reading settings: {e}")
    return DEFAULT_SETTINGS

def save_settings(data):
    try:
        os.makedirs(os.path.dirname(SETTINGS_FILE), exist_ok=True)
        with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"Error writing settings: {e}")
        return False

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Disable caching completely for local testing
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_GET(self):
        # Force fresh response, disable 304 Not Modified
        if 'If-Modified-Since' in self.headers:
            del self.headers['If-Modified-Since']
        if 'If-None-Match' in self.headers:
            del self.headers['If-None-Match']

        clean_path = self.path.split('?')[0]
        if clean_path == '/api/settings':
            settings = load_settings()
            payload = json.dumps(settings, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return

        super().do_GET()

    def do_POST(self):
        clean_path = self.path.split('?')[0]
        if clean_path == '/api/settings':
            try:
                length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(length).decode('utf-8')
                new_data = json.loads(body)
                current = load_settings()
                current.update(new_data)
                save_settings(current)
                
                resp = json.dumps({"ok": True, "settings": current}, ensure_ascii=False).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Content-Length', str(len(resp)))
                self.end_headers()
                self.wfile.write(resp)
            except Exception as e:
                err = json.dumps({"ok": False, "error": str(e)}).encode('utf-8')
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Content-Length', str(len(err)))
                self.end_headers()
                self.wfile.write(err)
            return
        super().do_POST()

if __name__ == '__main__':
    class ThreadedServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
        daemon_threads = True
        allow_reuse_address = True

    with ThreadedServer(('', PORT), NoCacheHTTPRequestHandler) as httpd:
        print(f"========================================================")
        print(f"  Macca Toan Thang - Frontend Dev Server (Threaded, No-Cache)")
        print(f"  Serving directory: {DIRECTORY}")
        print(f"  Running at: http://localhost:{PORT}")
        print(f"========================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")
            httpd.server_close()
