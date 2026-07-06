import urllib.request
import urllib.parse
import json

BASE_URL = "http://127.0.0.1:8010"

def make_request(url, data=None, headers=None, method='GET'):
    if headers is None:
        headers = {}
    
    req_data = None
    if data is not None:
        req_data = json.dumps(data).encode('utf-8')
        headers['Content-Type'] = 'application/json'
        
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            status = response.status
            body = response.read().decode('utf-8')
            return status, json.loads(body) if body else None
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        return e.code, body
    except Exception as e:
        return 0, str(e)

def test_flow():
    # 1. Health check
    status, body = make_request(f"{BASE_URL}/")
    print("Health Check:", status, body)
    if status != 200:
        print("Health Check Failed")
        return

    # 2. Try registering a test user
    email = "test_user_unique@example.com"
    password = "password123"
    name = "Test User"
    
    register_payload = {
        "name": name,
        "email": email,
        "password": password
    }
    
    token = None
    status, body = make_request(f"{BASE_URL}/api/auth/register", data=register_payload, method='POST')
    print("Register Status:", status)
    
    if status == 200:
        token = body.get("access_token")
        print("Registered successfully, token obtained.")
    elif status == 400:
        print("Register failed (likely already registered), trying login...")
        login_payload = {"email": email, "password": password}
        status_login, body_login = make_request(f"{BASE_URL}/api/auth/login", data=login_payload, method='POST')
        print("Login Status:", status_login)
        if status_login == 200:
            token = body_login.get("access_token")
            print("Login successful, token obtained.")
        else:
            print("Login failed:", body_login)
    else:
        print("Register failed:", body)

    if not token:
        print("No token, aborting list datasets.")
        return

    # 3. List datasets
    headers = {"Authorization": f"Bearer {token}"}
    status_ds, body_ds = make_request(f"{BASE_URL}/api/datasets", headers=headers)
    print("List Datasets Status:", status_ds)
    print("Datasets Body:", body_ds)

if __name__ == "__main__":
    test_flow()
