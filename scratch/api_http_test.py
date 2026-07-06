import urllib.request
import urllib.error
import json
import uuid

base_url = "http://127.0.0.1:8010"

def make_request(path, method="GET", data=None, token=None):
    url = f"{base_url}{path}"
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    req_data = None
    if data:
        req_data = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
        
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as res:
            status = res.status
            body = res.read().decode("utf-8")
            return status, json.loads(body) if body else None
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        return e.code, body
    except Exception as e:
        return 0, str(e)

print("Checking backend HTTP status...")
# Register a test user
rand_email = f"test_{uuid.uuid4().hex[:6]}@example.com"
payload = {
    "name": "HTTP Test User",
    "email": rand_email,
    "password": "Password123"
}

print(f"Registering user: {rand_email}")
status, res = make_request("/api/auth/register", "POST", payload)
print("Register Status:", status)
if status != 200:
    print("Register Response:", res)
    exit(1)

token = res["access_token"]

# Fetch user summary
print("\nFetching user summary...")
status, summary_res = make_request("/api/datasets/summary/user", "GET", token=token)
print("User summary status:", status)
if status == 200:
    print("User summary keys:", summary_res.keys())
else:
    print("User summary response:", summary_res)

# Fetch downloads history
print("\nFetching downloads history...")
status, history_res = make_request("/api/datasets/downloads/history", "GET", token=token)
print("Downloads history status:", status)
if status == 200:
    print("Downloads history:", history_res)
else:
    print("Downloads history response:", history_res)
