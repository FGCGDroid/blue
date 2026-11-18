#!/usr/bin/env python3
"""Disposable local upstream for testing the 3.0 gateway. Loopback only."""
from http.server import BaseHTTPRequestHandler, HTTPServer


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):  # noqa: N802
        path = self.path.split("?", 1)[0]
        if path == "/public":
            body, code = b"PUBLIC_OK\n", 200
        elif path == "/admin":
            body, code = b"ADMIN_LEAK_SHOULD_BE_BLOCKED\n", 200
        elif path == "/.env":
            body, code = b"SECRET=SHOULD_BE_BLOCKED\n", 200
        else:
            body, code = b"MOCK_UPSTREAM_HOME\n", 200
        self.send_response(code)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        print("%s %s" % (self.address_string(), fmt % args), flush=True)


if __name__ == "__main__":
    HTTPServer(("127.0.0.1", 18080), Handler).serve_forever()
