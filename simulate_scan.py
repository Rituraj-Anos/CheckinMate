import requests
import time

API_URL = "http://localhost:3001/api/scan"  # Your app URL

scans = [
    {"uid": "STU001", "action": "check-in"},
    {"uid": "STU002", "action": "check-in"},
    {"uid": "STU003", "action": "check-in"},
    {"uid": "STU001", "action": "check-out"},
    {"uid": "STU002", "action": "check-out"}
]

for event in scans:
    resp = requests.post(API_URL, json=event)
    print(f"Sent {event['action']} for {event['uid']}, response code: {resp.status_code}")
    time.sleep(2)  # Wait 2 seconds between scans
