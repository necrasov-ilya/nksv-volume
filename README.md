# nksv-volume

Lightweight file sharing service with hidden admin panel.

## Quick start

```bash
cp .env.example .env   # edit password
npm install
npm start
```

## Config (.env)

| Variable        | Default   | Description                          |
|-----------------|-----------|--------------------------------------|
| PORT            | 3000      | Server port                          |
| ADMIN_PASSWORD  | changeme  | Admin panel password                 |
| MAX_FILE_SIZE   | 500       | Max upload size in MB                |

## Usage

- Landing page greets visitors and explains the service
- Triple-click the dot at the bottom of the page to open auth
- Enter password to access admin panel
- Drag & drop files to upload, create folders to organize
- Click "Copy link" to share `/v/:id` — opens with inline player
- `/r/:id` serves raw file with correct Content-Type
