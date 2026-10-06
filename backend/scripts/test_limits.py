import argparse
import itertools

import httpx

CLAIMS = [
    "Drinking hot lemon water every morning completely cures diabetes within a month",
    "A new law will make every bank account holder pay a tax on UPI payments above two thousand rupees",
    "NASA confirmed that the sun will go dark for six days next November",
    "Eating banana at night causes permanent damage to the kidneys, doctors warn",
    "The government will shut down all mobile phone networks for two days next week for maintenance",
    "A viral video shows a bridge in Kolkata collapsing yesterday during heavy rain",
    "Schools across India will remain closed for the whole of December, says official circular",
    "Scientists discover that drinking tea with milk reduces the effect of every vaccine",
]

p = argparse.ArgumentParser()
p.add_argument("base")
p.add_argument("-n", type=int, default=1)
p.add_argument("--token", default="x", help='turnstile token; "none" sends no token')
p.add_argument("--text", default=None, help="send this exact claim every time")
a = p.parse_args()

pool = itertools.cycle(CLAIMS)
with httpx.Client(timeout=60) as client:
    for i in range(1, a.n + 1):
        body = {"text": a.text or next(pool)}
        if a.token != "none":
            body["turnstile_token"] = a.token
        r = client.post(f"{a.base.rstrip('/')}/api/check", json=body)
        data = r.json()
        if r.status_code == 200:
            print(i, 200, "job:", data.get("job_id"), "| from_cache:", data.get("from_cache"),
                  "| seen_before:", bool(data.get("seen_before")))
        else:
            d = data.get("detail")
            if isinstance(d, dict):
                print(i, r.status_code, d.get("code"), "-", d.get("message"))
            else:
                print(i, r.status_code, d)