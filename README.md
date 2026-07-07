# My Learning App — Login (React + Express + TypeScript + Tailwind)

A tiny full-stack app to learn Node. It has a login screen (frontend) that
talks to a login API (backend).

## Project layout

```
node app/
├── server/     Express + TypeScript API  (runs on http://localhost:4100)
│   └── src/
│       ├── index.ts          app setup + start
│       ├── routes/auth.ts     POST /api/login
│       └── data/users.ts      fake user "database"
└── client/     React + Vite + TS + Tailwind (runs on http://localhost:5180)
    └── src/
        ├── App.tsx            picks Login screen vs. logged-in screen
        ├── pages/Login.tsx    the login form
        └── api/auth.ts        calls the backend
```

## How to run it

Open **two terminals**.

**Terminal 1 — backend:**
```bash
cd server
npm install   # first time only
npm run dev
```

**Terminal 2 — frontend:**
```bash
cd client
npm install   # first time only
npm run dev
```

Then open **http://localhost:5180** in your browser.

## Try it

Log in with the demo account (pre-filled in the form):

- Email: `demo@example.com`
- Password: `password123`

## How the pieces connect

1. You submit the form in **Login.tsx**.
2. It calls `login()` in **api/auth.ts**, which does `fetch("/api/login")`.
3. Vite's dev proxy forwards `/api/*` to the Express server on port 4100.
4. Express (**routes/auth.ts**) checks the password with bcrypt and, if correct,
   signs a JWT and sends it back.
5. The React app stores the token and shows the "logged in" screen.
