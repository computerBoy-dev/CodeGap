# CodeGap IDE

A powerful **web-based IDE** inspired by VS Code, designed for editing HTML, CSS, and JavaScript directly in the browser. It provides a modern, dark-themed interface with a file explorer, Monaco editor, real-time Firebase sync, and live preview functionality.

> ⚠️ **Strict Legal Warning**  
> This project is the private intellectual property of the developer.  
> **No one is allowed to use, copy, modify, redistribute, or host this project or any part of its code without written permission.**  
> Any unauthorized usage or reproduction will be considered a copyright violation and may result in legal action.

---

## 🚀 Features

- 🧠 **VS Code-like Interface** with resizable panels and tabbed editing.
- 📁 **Nested File & Folder Explorer** with support for `.html`, `.css`, and `.js` files.
- ✍️ **Monaco Editor** for code editing with syntax highlighting and autocomplete.
- 🔄 **Real-time Firebase Firestore Sync** to store all changes instantly.
- 🖥️ **Live Preview Window** that reflects real-time changes including linked CSS/JS.
- ⌨️ **Keyboard Shortcuts**: `Ctrl+S` (save), `Ctrl+Z` (undo), `Ctrl+Y` (redo), etc.
- 📦 **Download as ZIP** feature using JSZip.
- 🔐 **Firebase Authentication** (Email + Google) to protect user sessions.

---

## 🛠️ Built With

- HTML5 + Tailwind CSS  
- JavaScript (ES Modules)  
- Monaco Editor  
- Firebase Firestore + Auth  
- JSZip  
- Boxicons

---

## 📂 Folder Structure

```
codeGap/
├── index.html
├── HTMLeditor.html
├── editor.js
├── firestoreSync.js
├── preview.html
├── firebase-config.json
└── assets/
```

---

## 🔧 How to Use Locally

1. Clone this repository:
   ```
   git clone https://github.com/your-username/codeGap.git
   ```

2. Run with any local server (Live Server / VS Code / `npx serve`):
   ```
   npx serve .
   ```

3. Set up Firebase:
   - Enable Firestore and Auth (Email + Google)
   - Replace `firebase-config.json` with your config

4. Open `index.html` in browser and start coding!

---

## 🔒 Auth & Sync

- Firebase Authentication used (login required)
- Real-time file sync to Firestore
- Save status indicator shown in top navbar

---

## ⚠️ Limitations

- Only `.html`, `.css`, `.js` files supported  
- Rename and multi-user features are coming soon

---

## 🛑 License & Permissions

**© 2025 Aaryan. All Rights Reserved.**

- This is a private project.  
- Do **not** copy, clone, modify, re-upload, or distribute without written permission.  
- For permission or collaboration, contact the author.

---

## 📬 Contact

**Developer**: Aaryan 
📧 Email: iaaryan37@gmail.com 
🔗 LinkedIn: https://linkedin.com/in/computerboy/
