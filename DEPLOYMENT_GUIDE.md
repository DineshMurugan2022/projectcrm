# Deploying your Enterprise CRM (Render + Vercel)

This guide provides the exact steps to deploy your current setup. Because you are using a decoupled stack (Backend on Render, Frontend on Vercel), we need to ensure they can talk to each other securely.

---

## 🎨 Phase 1: Frontend (Vercel)

1.  **Project Choice**: Link your GitHub repository to Vercel.
2.  **Framework Preset**: Select **Vite**.
3.  **Root Directory**: `frontend`
4.  **Build Settings**:
    *   **Build Command**: `npm run build`
    *   **Output Directory**: `dist`
5.  **Environment Variables**:
    *   `VITE_API_URL`: `https://your-backend-url.onrender.com/api`
    *   `VITE_SOCKET_URL`: `https://your-backend-url.onrender.com`

---

## ⚙️ Phase 2: Backend (Render)

1.  **Service Type**: Choose **Web Service**.
2.  **Runtime**: **Node**.
3.  **Root Directory**: `backend`  *(CRITICAL: You must set this to 'backend')*.
4.  **Build & Start Commands**:
    *   **Build Command**: `npm install`
    *   **Start Command**: `npm start` 

---

## 🆘 The "Golden Fix" for "ENOENT: no such file"

If Render continues to fail, it is strictly because the files aren't on GitHub yet. **Follow these exact 4 steps in your terminal:**

1.  **Stop all servers** (Press Ctrl+C in all terminals).
2.  **Add all new files**:
    ```bash
    git add .
    ```
3.  **Commit with a clear message**:
    ```bash
    git commit -m "Fix pm2 pathing and root directory"
    ```
4.  **Push to your repository**:
    ```bash
    git push
    ```

**Once you push, Render will see the new `ecosystem.config.js` and the updated `package.json`, and the error will disappear.**
    *   `PORT`: `10000` (Render's default)
    *   `MONGO_URI`: `...your-atlas-url...`
    *   `JWT_SECRET`: `...your-secret...`
    *   `CORS_ORIGIN`: `https://your-frontend-url.vercel.app` (CRITICAL for security)

---

## 🔀 Connecting the Two (CORS)

For your project to work, the Backend must "whitelist" the Frontend.
1.  Once Vercel gives you your frontend URL (e.g., `https://my-crm.vercel.app`), copy it.
2.  In Render, update the `CORS_ORIGIN` variable to match that exact URL.
3.  Restart your Render service.

---

## 📡 Live Features Check (Real-time & Logging)

1.  **Socket.IO**: Because you are on Render's free tier, the server might "sleep." If chat doesn't connect instantly, wait 30 seconds for the server to wake up.
2.  **Observability**: You can view your logs directly in the Render dashboard under the **"Logs"** tab. These will show the Winston/Morgan output we configured.
3.  **DB Speed**: Your MongoDB Atlas indexes will automatically activate once the Render backend connects for the first time.

---

## 🚀 Pro Tip: Continuous Deployment
Every time you `git push` to your repository, both Vercel and Render will automatically re-deploy your changes. Your PM2 cluster will handle the transition, ensuring a smooth update.
