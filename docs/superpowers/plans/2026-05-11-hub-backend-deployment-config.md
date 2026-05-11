# Hub-Backend Deployment Configuration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configure production credentials on the Oracle Cloud server, restart PM2 with correct environment variables, test Evolution API webhook integration, and enable HTTPS with nginx reverse proxy.

**Architecture:** The deployment consists of 4 independent but sequential tasks: (1) Environment configuration on the server with real Supabase credentials, (2) Process restart to load new configuration, (3) Webhook testing to verify Evolution API integration, (4) HTTPS setup via nginx reverse proxy with Let's Encrypt SSL certificate.

**Tech Stack:** SSH (authentication), Ubuntu 22.04 LTS, PM2 (process management), nginx (reverse proxy), Certbot (Let's Encrypt), curl (testing), jq (JSON parsing)

---

## Task 1: Configure .env on Server with Real Credentials

**Files:**
- Modify: `~/hub-backend/.env` (on Oracle Cloud server 152.67.53.192)

**Context:**
The server currently has a placeholder `.env` file created during first deployment. This task updates it with real production credentials from Supabase and Evolution API. The credentials to use are:
- **Supabase URL:** `https://dysnlzaqnwpmmbqundqd.supabase.co`
- **Supabase ANON KEY:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5c25semFxbndwbW1icXVuZHFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzODAwMjQsImV4cCI6MjA5MTk1NjAyNH0.DKBAeXj_zHIXq8Kf9r0Gfk8-lLnUtZT0_7FZH0sOIgw`
- **Supabase SERVICE_ROLE_KEY:** From Supabase dashboard (see note below)
- **Database URL:** `postgresql://postgres.dysnlzaqnwpmmbqundqd:EmeeZ2026prod@aws-1-us-east-1.pooler.supabase.com:6543/postgres`
- **Evolution API URL:** `http://152.67.53.192:8080/api`
- **Evolution API KEY:** `4d64ae786ecee5d23b97a4168356075032252787e5975b5f`

**Note on SERVICE_ROLE_KEY:** This sensitive key should be obtained from Supabase Dashboard (Project Settings → API) rather than hard-coded here. The actual value will be provided during execution or retrieved securely.

- [ ] **Step 1: SSH into the server**

Run:
```bash
ssh -i ~/.ssh/id_rsa_emeez ubuntu@152.67.53.192
```

Expected: Connected to `ubuntu@ip-10-0-0-123` prompt

- [ ] **Step 2: Verify current .env exists and shows placeholders**

Run:
```bash
cat ~/hub-backend/.env
```

Expected output:
```
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
LOG_LEVEL=info

EVOLUTION_API_URL=http://152.67.53.192:8080/api
HUB_PUBLIC_URL=https://hub.jurialvo.com.br

SUPABASE_URL=https://your-supabase-url.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

DATABASE_URL=postgresql://user:password@localhost:5432/hub_db
```

- [ ] **Step 3: Create backup of current .env**

Run:
```bash
cp ~/hub-backend/.env ~/hub-backend/.env.backup
echo "Backup created at $(date)" >> ~/hub-backend/.env.backup
```

Expected: No output (command succeeds)

- [ ] **Step 4: Create new .env with real credentials**

Run:
```bash
cat > ~/hub-backend/.env << 'EOF'
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
LOG_LEVEL=info

EVOLUTION_API_URL=http://152.67.53.192:8080/api
HUB_PUBLIC_URL=https://hub.jurialvo.com.br

SUPABASE_URL=https://dysnlzaqnwpmmbqundqd.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5c25semFxbndwbW1icXVuZHFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzODAwMjQsImV4cCI6MjA5MTk1NjAyNH0.DKBAeXj_zHIXq8Kf9r0Gfk8-lLnUtZT0_7FZH0sOIgw
SUPABASE_SERVICE_ROLE_KEY=<ACTUAL_SERVICE_ROLE_KEY_FROM_SUPABASE_DASHBOARD>

DATABASE_URL=postgresql://postgres.dysnlzaqnwpmmbqundqd:EmeeZ2026prod@aws-1-us-east-1.pooler.supabase.com:6543/postgres
EOF
```

**Important:** Replace `<ACTUAL_SERVICE_ROLE_KEY_FROM_SUPABASE_DASHBOARD>` with the real service role key from your Supabase dashboard at https://app.supabase.com/project/dysnlzaqnwpmmbqundqd/settings/api

Expected: File created (no output)

- [ ] **Step 5: Verify .env was written correctly**

Run:
```bash
cat ~/hub-backend/.env
```

Expected output: Shows all credentials with real values (not placeholders), no errors

- [ ] **Step 6: Verify file permissions are secure**

Run:
```bash
chmod 600 ~/hub-backend/.env
ls -la ~/hub-backend/.env
```

Expected output:
```
-rw------- 1 ubuntu ubuntu 687 May 11 23:00 /home/ubuntu/hub-backend/.env
```

- [ ] **Step 7: Log out of server**

Run:
```bash
exit
```

Expected: Back to local terminal prompt

---

## Task 2: Restart PM2 with New Configuration

**Files:**
- No files modified
- Process: `hub-backend` (PM2 managed)

**Context:**
The PM2 process is currently running with the old placeholder .env. Restarting it will load the new credentials from Step 1.

- [ ] **Step 1: SSH into server**

Run:
```bash
ssh -i ~/.ssh/id_rsa_emeez ubuntu@152.67.53.192
```

Expected: Connected to server

- [ ] **Step 2: Check current PM2 status before restart**

Run:
```bash
pm2 status hub-backend
```

Expected output shows:
```
│ 3  │ hub-backend    │ ... │ online │ ... │
```

- [ ] **Step 3: Restart the hub-backend process**

Run:
```bash
pm2 restart hub-backend
```

Expected output:
```
[PM2] Restarting app : hub-backend
✓ App [hub-backend:0] restarted
```

- [ ] **Step 4: Wait 3 seconds for process to initialize**

Run:
```bash
sleep 3
```

Expected: (no output, just waiting)

- [ ] **Step 5: Verify process restarted and is online**

Run:
```bash
pm2 status hub-backend
```

Expected: Shows `online` status with uptime reset to a few seconds

- [ ] **Step 6: Check PM2 logs for any errors**

Run:
```bash
pm2 logs hub-backend --lines 20 --nostream
```

Expected: Recent logs showing successful startup, no error messages about credentials

**If you see errors about Supabase credentials:** 
- Stop: `pm2 stop hub-backend`
- Verify .env file: `cat ~/hub-backend/.env`
- Check for typos or incomplete keys in SUPABASE_SERVICE_ROLE_KEY
- Fix and restart

- [ ] **Step 7: Save PM2 configuration**

Run:
```bash
pm2 save
```

Expected:
```
[PM2] Successfully dumped environment
```

- [ ] **Step 8: Log out of server**

Run:
```bash
exit
```

Expected: Back to local terminal

---

## Task 3: Test Evolution API Webhook Integration

**Files:**
- No files modified
- Endpoint: `https://hub.jurialvo.com.br/webhooks/evolution` (will be `/health` for initial test)

**Context:**
The Evolution API sends webhook events to `http://152.67.53.192:3000/webhooks/evolution`. This task verifies the endpoint is responding correctly by:
1. Testing the health check endpoint (already configured)
2. Sending a simulated webhook payload
3. Verifying the response indicates successful processing

- [ ] **Step 1: Test health endpoint from local machine**

Run:
```bash
curl -s http://152.67.53.192:3000/health | jq .
```

Expected output:
```json
{
  "status": "ok",
  "servico": "emee-z-backend",
  "timestamp": "2026-05-11T23:00:00.000Z"
}
```

**If connection refused:** Server may still be restarting. Wait 5 seconds and retry.

- [ ] **Step 2: SSH to server and test webhook endpoint with curl**

Run:
```bash
ssh -i ~/.ssh/id_rsa_emeez ubuntu@152.67.53.192 'curl -s http://localhost:3000/webhooks/evolution' 
```

Expected: Response indicating endpoint exists (may show error about missing event data, which is OK)

- [ ] **Step 3: Test webhook with simulated MESSAGES_UPDATE event**

Run:
```bash
ssh -i ~/.ssh/id_rsa_emeez ubuntu@152.67.53.192 << 'EOFTEST'
curl -X POST http://localhost:3000/webhooks/evolution \
  -H "Content-Type: application/json" \
  -d '{
    "event": "MESSAGES_UPDATE",
    "data": {
      "id": "test-message-id",
      "instanceName": "evolution-instance",
      "text": "Test message from webhook",
      "number": "5511999999999"
    }
  }'
echo ""
EOFTEST
```

Expected: Server responds with HTTP 200 status (should accept the webhook)

- [ ] **Step 4: Check server logs for webhook processing**

Run:
```bash
ssh -i ~/.ssh/id_rsa_emeez ubuntu@152.67.53.192 'pm2 logs hub-backend --lines 10 --nostream | grep -i "webhook\|message"'
```

Expected: Should show log entries indicating webhook was received and processed

- [ ] **Step 5: Test webhook with CONNECTION_UPDATE event**

Run:
```bash
ssh -i ~/.ssh/id_rsa_emeez ubuntu@152.67.53.192 << 'EOFTEST'
curl -X POST http://localhost:3000/webhooks/evolution \
  -H "Content-Type: application/json" \
  -d '{
    "event": "CONNECTION_UPDATE",
    "data": {
      "instanceName": "evolution-instance",
      "status": "connected"
    }
  }'
echo ""
EOFTEST
```

Expected: HTTP 200 response

- [ ] **Step 6: Verify no errors in PM2 logs**

Run:
```bash
ssh -i ~/.ssh/id_rsa_emeez ubuntu@152.67.53.192 'pm2 logs hub-backend --lines 30 --nostream | grep -i "error\|fail" || echo "No errors found"'
```

Expected: "No errors found" message (or empty output)

---

## Task 4: Configure HTTPS with Nginx Reverse Proxy

**Files:**
- Create: `/etc/nginx/sites-available/hub.jurialvo.com.br`
- Create: `/etc/nginx/sites-enabled/hub.jurialvo.com.br` (symlink)
- Modify: `/etc/nginx/nginx.conf` (if needed for tuning)

**Context:**
Currently, the application is only accessible via HTTP on port 3000. This task:
1. Installs nginx as a reverse proxy
2. Configures it to forward traffic from port 80/443 to the Node.js app on port 3000
3. Obtains an SSL certificate from Let's Encrypt via Certbot
4. Enables automatic HTTPS redirection

- [ ] **Step 1: SSH into server**

Run:
```bash
ssh -i ~/.ssh/id_rsa_emeez ubuntu@152.67.53.192
```

Expected: Connected to server

- [ ] **Step 2: Update system packages**

Run:
```bash
sudo apt-get update
```

Expected: Package lists updated (may take a minute)

- [ ] **Step 3: Install nginx**

Run:
```bash
sudo apt-get install -y nginx
```

Expected:
```
Setting up nginx (1.25.x) ...
```

- [ ] **Step 4: Install certbot for Let's Encrypt**

Run:
```bash
sudo apt-get install -y certbot python3-certbot-nginx
```

Expected:
```
Setting up certbot ...
Setting up python3-certbot-nginx ...
```

- [ ] **Step 5: Create nginx configuration for hub.jurialvo.com.br**

Run:
```bash
sudo tee /etc/nginx/sites-available/hub.jurialvo.com.br > /dev/null << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name hub.jurialvo.com.br;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name hub.jurialvo.com.br;

    # SSL certificates (will be added by certbot)
    ssl_certificate /etc/letsencrypt/live/hub.jurialvo.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hub.jurialvo.com.br/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;

    # Reverse proxy to Node.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts for long-lived connections (webhooks)
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Webhook endpoint with increased timeouts
    location /webhooks/evolution {
        proxy_pass http://localhost:3000/webhooks/evolution;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Extended timeouts for webhook processing
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }
}
EOF
```

Expected: File created with no errors

- [ ] **Step 6: Enable the site by creating symlink**

Run:
```bash
sudo ln -sf /etc/nginx/sites-available/hub.jurialvo.com.br /etc/nginx/sites-enabled/hub.jurialvo.com.br
```

Expected: No output (symlink created)

- [ ] **Step 7: Test nginx configuration for syntax errors**

Run:
```bash
sudo nginx -t
```

Expected output:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

- [ ] **Step 8: Reload nginx to apply configuration**

Run:
```bash
sudo systemctl reload nginx
```

Expected: No output (nginx reloaded)

- [ ] **Step 9: Verify nginx is running**

Run:
```bash
sudo systemctl status nginx
```

Expected: Shows "active (running)"

- [ ] **Step 10: Obtain SSL certificate from Let's Encrypt**

Run:
```bash
sudo certbot certonly --nginx -d hub.jurialvo.com.br --non-interactive --agree-tos -m admin@jurialvo.com.br
```

**Note:** If you don't have Umbler DNS configured yet, this will fail. In that case:
- First ensure DNS A record points `hub.jurialvo.com.br` → `152.67.53.192` in Umbler
- Then re-run the certbot command

Expected output:
```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/hub.jurialvo.com.br/fullchain.pem
```

- [ ] **Step 11: Update nginx configuration to use the SSL certificate**

Run:
```bash
sudo tee /etc/nginx/sites-available/hub.jurialvo.com.br > /dev/null << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name hub.jurialvo.com.br;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name hub.jurialvo.com.br;

    ssl_certificate /etc/letsencrypt/live/hub.jurialvo.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hub.jurialvo.com.br/privkey.pem;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /webhooks/evolution {
        proxy_pass http://localhost:3000/webhooks/evolution;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }
}
EOF
```

Expected: Configuration file updated

- [ ] **Step 12: Test and reload nginx**

Run:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

Expected:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

- [ ] **Step 13: Enable automatic SSL renewal**

Run:
```bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
sudo systemctl status certbot.timer
```

Expected: Shows "active" status for certbot.timer

- [ ] **Step 14: Exit server**

Run:
```bash
exit
```

Expected: Back to local terminal

- [ ] **Step 15: Test HTTPS endpoint from local machine**

Run:
```bash
curl -s https://hub.jurialvo.com.br/health | jq .
```

Expected output:
```json
{
  "status": "ok",
  "servico": "emee-z-backend",
  "timestamp": "2026-05-11T23:00:00.000Z"
}
```

**If certificate error:** 
- Wait 30 seconds for DNS to propagate
- Verify DNS is correctly configured: `nslookup hub.jurialvo.com.br`
- Should resolve to `152.67.53.192`

- [ ] **Step 16: Verify SSL certificate details**

Run:
```bash
echo | openssl s_client -servername hub.jurialvo.com.br -connect hub.jurialvo.com.br:443 2>/dev/null | openssl x509 -noout -dates
```

Expected output shows certificate validity dates:
```
notBefore=May 11 ...
notAfter=Aug  9 ...
```

---

## Self-Review Checklist

**Spec Coverage:**
- ✅ Task 1: Configure .env on server with real credentials
- ✅ Task 2: Restart PM2 to load new configuration
- ✅ Task 3: Test Evolution API webhook integration
- ✅ Task 4: Configure HTTPS with nginx reverse proxy

**Placeholder Scan:**
- ✅ All commands are complete with actual values
- ✅ All file paths are exact
- ✅ All expected outputs are specific
- ⚠️ Note: `<ACTUAL_SERVICE_ROLE_KEY_FROM_SUPABASE_DASHBOARD>` is intentionally a placeholder requiring user input during execution

**Type Consistency:**
- ✅ All file paths consistent (~/hub-backend, /etc/nginx, /etc/letsencrypt)
- ✅ All domain references consistent (hub.jurialvo.com.br)
- ✅ All credentials reference consistent sources

**Sequence Validation:**
- ✅ Task 1 (config) → Task 2 (restart) → Task 3 (test) → Task 4 (HTTPS) is logical order
- ✅ Each task is independent but builds on previous state
- ✅ No circular dependencies

---

Plan complete and saved to `docs/superpowers/plans/2026-05-11-hub-backend-deployment-config.md`.

## Execution Options

**Two ways to execute this plan:**

**1. Subagent-Driven (Recommended)** 🤖
- I dispatch a fresh subagent per task
- Two-stage review after each task (spec compliance → code quality)
- Faster iteration, continuous progress
- Best for this plan's complexity

**2. Inline Execution** 💻
- Execute tasks sequentially in this session
- Checkpoints for review between tasks
- Better for real-time troubleshooting if issues arise

**Which approach do you prefer?**