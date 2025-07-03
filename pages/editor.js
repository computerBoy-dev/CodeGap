import { initFirestoreSync, syncFiles } from "./firestoreSync.js";
import * as monaco from "https://cdn.jsdelivr.net/npm/monaco-editor@0.33.0/+esm";
import JSZip from "https://cdn.jsdelivr.net/npm/jszip@3.10.0/+esm";

let editor;
let currentFile = null;
let openTabs = [];
let files = {};
let debounceTimer = null;

// Default Files
files["index.html"] = {
  content: `<!DOCTYPE html>
<html>
<head>
  <title>CodeGap</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h1>Hello, CodeGap!</h1>
  <script src="script.js"></script>
</body>
</html>`,
  type: "file"
};
files["style.css"] = {
  content: `body {
  margin: 0;
  font-family: sans-serif;
  background: #f5f5f5;
}`,
  type: "file"
};
files["script.js"] = {
  content: `console.log("Hello from script.js");`,
  type: "file"
};

// ------------------- INIT --------------------
window.addEventListener("DOMContentLoaded", () => {
    initFirestoreSync(files, () => {
    renderFileTree();
    openFile("index.html");
  });

  monaco.languages.html.htmlDefaults.setOptions({
  suggest: { html5: true },
  data: {
    useDefaultDataProvider: true,
    snippets: [
      {
        label: "script",
        documentation: "JavaScript script tag",
        body: '<script src="$1"></script>',
      },
      {
        label: "link-css",
        documentation: "CSS link tag",
        body: '<link rel="stylesheet" href="$1">',
      },
      {
        label: "meta-viewport",
        documentation: "Meta viewport tag",
        body: '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
      },
      {
        label: "img",
        documentation: "Image tag",
        body: '<img src="$1" alt="$2">',
      },
      {
        label: "input",
        documentation: "Input tag",
        body: '<input type="$1" name="$2">',
      }
    ]
  }
});

editor = monaco.editor.create(document.getElementById("editor"), {
  value: "",
  language: "html",
  theme: "vs-dark",
  fontFamily: "Ubuntu Mono, sans-serif", // ✅ Custom font
  fontSize: 14,                        // ✅ Font size
  lineHeight: 22,                      // ✅ Line spacing
  cursorStyle: "block",                 // block | line | underline
  automaticLayout: true,
});


let fontSize = 14; // Initial font size

window.addEventListener("keydown", (e) => {
  if (e.ctrlKey && (e.key === "=" || e.key === "+")) {
    e.preventDefault();
    fontSize += 1;
    editor.updateOptions({ fontSize });
  } else if (e.ctrlKey && e.key === "-") {
    e.preventDefault();
    fontSize = Math.max(8, fontSize - 1); // Limit: min 8px
    editor.updateOptions({ fontSize });
  } else if (e.ctrlKey && e.key === "0") {
    e.preventDefault();
    fontSize = 14; // Reset to default
    editor.updateOptions({ fontSize });
  }
});


  renderFileTree();
  openFile("index.html");

  editor.onDidChangeModelContent(() => {
    if (currentFile) {
      files[currentFile].content = editor.getValue();
      saveStatus("Saving...");
      debounceSave();
      syncFiles(files);
    }
  });

  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "s") {
      e.preventDefault();
      if (currentFile) {
        files[currentFile].content = editor.getValue();
        saveStatus("Saved ✅", "text-green-500");
      }
    }
  });

  // Live preview
  let previewWindow = null;
  const runBtn = document.getElementById("runBtn");
  runBtn?.addEventListener("click", () => {
    const htmlBlob = generatePreviewHTML();
    const blobUrl = URL.createObjectURL(htmlBlob);
    if (!previewWindow || previewWindow.closed) {
      previewWindow = window.open("htmlPreview.html", "codegapPreview", "width=1000,height=700");
    }
    setTimeout(() => {
      previewWindow.postMessage({ type: "load-preview", url: blobUrl }, "*");
    }, 300);
  });
});

// ------------------ UTILITIES ------------------
function saveStatus(text, color = "text-gray-400") {
  const el = document.getElementById("saveStatus");
  el.textContent = text;
  el.className = `ml-4 ${color}`;
}
function debounceSave() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    saveStatus("Saved ✅", "text-green-500");
  }, 800);
}

// -------------- HTML PREVIEW GENERATOR --------------
function generatePreviewHTML() {
  let html = files["index.html"]?.content || "";

  // Inline CSS
  html = html.replace(/<link\s+[^>]*href=["']([^"']+)["'][^>]*>/gi, (match, href) => {
    if (/^https?:\/\//.test(href)) return match;
    const resolved = resolveRelativePath("index.html", href);
    if (files[resolved]?.type === "file" && resolved.endsWith(".css")) {
      return `<style>\n${files[resolved].content}\n</style>`;
    }
    return `<!-- Missing CSS: ${href} -->`;
  });

  // Inline JS
  html = html.replace(/<script\s+[^>]*src=["']([^"']+)["'][^>]*>\s*<\/script>/gi, (match, src) => {
    if (/^https?:\/\//.test(src)) return match;
    const resolved = resolveRelativePath("index.html", src);
    if (files[resolved]?.type === "file" && resolved.endsWith(".js")) {
      return `<script>\n${files[resolved].content}\n</script>`;
    }
    return `<!-- Missing JS: ${src} -->`;
  });

  return new Blob([html], { type: "text/html" });
}

// -------------- FILE/TREE SYSTEM --------------
window.createFile = () => openModal("file");
window.createFolder = () => openModal("folder");

let modalType = "file", contextTarget = "";
function openModal(type, parent = "") {
  modalType = type;
  contextTarget = parent || "";
  document.getElementById("modalInput").value = "";
  document.getElementById("modalTitle").textContent = `New ${type.charAt(0).toUpperCase() + type.slice(1)}`;
  document.getElementById("modalBackdrop").classList.remove("hidden");
}
window.closeModal = () => document.getElementById("modalBackdrop").classList.add("hidden");

window.confirmModal = () => {
  const name = document.getElementById("modalInput").value.trim();
  if (!name) return;
  const id = contextTarget ? `${contextTarget}/${name}` : name;
  if (files[id]) return alert("Already exists!");

  if (modalType === "file") {
    files[id] = { content: defaultTemplate(name), type: "file" };
    openFile(id);
  } else {
    files[id] = { type: "folder" };
  }
  renderFileTree();
  syncFiles(files);
  closeModal();
};

function defaultTemplate(name) {
  if (name.endsWith(".html")) return "<!DOCTYPE html>\n<html>\n<head>\n  <title></title>\n</head>\n<body>\n</body>\n</html>";
  if (name.endsWith(".css")) return "body {\n  margin: 0;\n}";
  if (name.endsWith(".js")) return "// JavaScript file";
  return "";
}

function renderFileTree() {
  const container = document.getElementById("fileList");
  container.innerHTML = "";

  const sorted = Object.keys(files).sort();

  sorted.forEach(id => {
    const data = files[id];
    const name = id.split("/").pop();
    const depth = id.split("/").length - 1;
    const isFile = data.type === "file";

    const item = document.createElement("li");
    item.className = `file-item pl-${depth * 4} flex items-center gap-2`;

    const iconSpan = document.createElement("span");
    iconSpan.className = "w-5 text-center";

    if (!isFile) iconSpan.innerHTML = `📁`;
    else if (id.endsWith(".html")) iconSpan.innerHTML = `<span class='text-orange-400'>&lt;/&gt;</span>`;
    else if (id.endsWith(".css")) iconSpan.innerHTML = `<span class='text-blue-400'>{}</span>`;
    else if (id.endsWith(".js")) iconSpan.innerHTML = `<span class='text-yellow-400'>JS</span>`;
    else iconSpan.textContent = "📄";

    const nameSpan = document.createElement("span");
    nameSpan.textContent = name;

    item.appendChild(iconSpan);
    item.appendChild(nameSpan);

    if (isFile) item.onclick = () => openFile(id);

    item.oncontextmenu = (e) => {
      e.preventDefault();
      contextTarget = id;
      const menu = document.getElementById("contextMenu");
      const isFolder = files[id]?.type === "folder";

      // Position menu
      menu.style.left = `${e.pageX}px`;
      menu.style.top = `${e.pageY}px`;
      menu.classList.remove("hidden");

      // Show create options only if it's a folder
      document.getElementById("newFileOption").style.display = isFolder ? "block" : "none";
      document.getElementById("newFolderOption").style.display = isFolder ? "block" : "none";
    };

    container.appendChild(item);
  });
}

window.deleteItem = () => {
  const target = contextTarget;

  // Show confirmation modal (you can call your custom modal here)
  const modal = document.getElementById("deleteModalBackdrop");
  modal.classList.remove("hidden");

  document.getElementById("confirmDeleteBtn").onclick = () => {
    Object.keys(files).forEach(path => {
      if (path === target || path.startsWith(target + "/")) {
        delete files[path];
        openTabs = openTabs.filter(tab => tab !== path);
        if (currentFile === path) currentFile = null;
      }
    });

    modal.classList.add("hidden");
    renderTabs();
    renderFileTree();
    syncFiles(files);
  };

  document.getElementById("cancelDeleteBtn").onclick = () => {
    modal.classList.add("hidden");
  };
};


// ------------------- TABS -------------------
function openFile(id) {
  if (!files[id] || files[id].type !== "file") return;
  currentFile = id;

  if (!openTabs.includes(id)) openTabs.push(id);

  const model = editor.getModel();
  if (model) {
    const currentContent = model.getValue();
    const newContent = files[id].content || "";
    if (currentContent !== newContent) {
      const cursor = editor.getPosition();
      const scroll = editor.getScrollTop();
      model.setValue(newContent);
      editor.setPosition(cursor);
      editor.setScrollTop(scroll);
    }
  }

  const ext = id.split(".").pop();
  monaco.editor.setModelLanguage(editor.getModel(), ext === "js" ? "javascript" : ext);
  renderTabs();
}


function closeTab(id) {
  openTabs = openTabs.filter(tab => tab !== id);
  if (currentFile === id) {
    currentFile = openTabs[openTabs.length - 1] || null;
    if (currentFile) openFile(currentFile);
    else editor.setValue("");
  }
  renderTabs();
}

function renderTabs() {
  const tabs = document.getElementById("tabs");
  tabs.innerHTML = "";

  openTabs.forEach(id => {
    const tab = document.createElement("div");
    tab.className = `tab px-3 py-1 mr-1 rounded-t flex items-center gap-2 cursor-pointer ${
      id === currentFile ? "bg-[#18cb96] text-black" : "bg-[#111] text-gray-400 hover:bg-[#222]"
    }`;

    const label = document.createElement("span");
    label.textContent = id.split("/").pop();

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕";
    closeBtn.className = "hover:text-red-400 text-xs";
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      closeTab(id);
    };

    tab.onclick = () => openFile(id);
    tab.appendChild(label);
    tab.appendChild(closeBtn);
    tabs.appendChild(tab);
  });
}

// ---------------- CONTEXT MENU ---------------
window.contextAction = (type) => {
  document.getElementById("contextMenu").classList.add("hidden");
  openModal(type, contextTarget);
};
document.body.addEventListener("click", () => {
  document.getElementById("contextMenu").classList.add("hidden");
});

// ---------------- RESOLVER -------------------
function resolveRelativePath(from, relPath) {
  const fromParts = from.split("/").slice(0, -1);
  const relParts = relPath.split("/");
  const resolvedParts = [];
  for (const part of relParts) {
    if (part === "..") fromParts.pop();
    else if (part !== ".") resolvedParts.push(part);
  }
  return [...fromParts, ...resolvedParts].join("/");
}

// ------------- TERMINAL ---------------------
const terminalInput = document.getElementById("terminalInput");
const terminalOutput = document.getElementById("terminalOutput");
let commandHistory = [];
let historyIndex = -1;

terminalInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const input = terminalInput.value.trim();
    commandHistory.push(input);
    historyIndex = commandHistory.length;
    terminalInput.value = "";
    runCommand(input);
  } else if (e.key === "ArrowUp") {
    if (historyIndex > 0) terminalInput.value = commandHistory[--historyIndex];
  } else if (e.key === "ArrowDown") {
    if (historyIndex < commandHistory.length - 1) terminalInput.value = commandHistory[++historyIndex];
    else terminalInput.value = "";
  }
});

function printToTerminal(text) {
  terminalOutput.innerHTML += text + "\n";
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

function runCommand(cmd) {
  const args = cmd.split(" ");
  const base = args[0];
  printToTerminal(`$ ${cmd}`);

  if (base === "help") return printToTerminal(`Available commands:
help             Show this help message
mkdir [name]     Create folder
touch [name]     Create file
rm [name]        Delete file or folder
mv old new       Rename file or folder
ls               List all files/folders
cat [file]       Show file content
clear            Clear the terminal`);

  if (base === "mkdir" && args[1]) {
    if (files[args[1]]) return printToTerminal("Folder already exists");
    files[args[1]] = { type: "folder" };
    renderFileTree();
    syncFiles(files);
  } else if (base === "touch" && args[1]) {
    if (files[args[1]]) return printToTerminal("File already exists");
    files[args[1]] = { type: "file", content: "" };
    renderFileTree();
    syncFiles(files);
  } else if (base === "rm" && args[1]) {
    if (!files[args[1]]) return printToTerminal("Not found");
    delete files[args[1]];
    renderFileTree();
    syncFiles(files);
  } else if (base === "mv" && args[1] && args[2]) {
    if (!files[args[1]]) return printToTerminal("Old name not found");
    if (files[args[2]]) return printToTerminal("New name exists");
    files[args[2]] = files[args[1]];
    delete files[args[1]];
    renderFileTree();
    syncFiles(files);
  } else if (base === "ls") {
    Object.keys(files).forEach(f => printToTerminal(f));
  } else if (base === "cat" && args[1]) {
    const file = files[args[1]];
    if (!file) return printToTerminal("File not found");
    if (file.type === "folder") return printToTerminal("Is a folder");
    printToTerminal(file.content);
  } else if (base === "clear") {
    terminalOutput.innerHTML = "";
  } else {
    printToTerminal("Unknown command. Use `help`");
  }
}

// ---------- Terminal Resize ----------
const resizeHandle = document.getElementById("terminalResizeHandle");
const terminal = document.getElementById("terminalWrapper");

let isResizingTerminal = false;
let initialMouseY = 0;
let initialHeight = 0;

resizeHandle.addEventListener("mousedown", (e) => {
  isResizingTerminal = true;
  document.body.style.cursor = "row-resize";
  initialMouseY = e.clientY;
  initialHeight = terminal.offsetHeight;
});

document.addEventListener("mousemove", (e) => {
  if (!isResizingTerminal) return;

  const deltaY = initialMouseY - e.clientY;
  const newHeight = initialHeight + deltaY;

  const minHeight = 100;
  const maxHeight = window.innerHeight * 0.5;

  terminal.style.height = `${Math.min(Math.max(newHeight, minHeight), maxHeight)}px`;
});

document.addEventListener("mouseup", () => {
  isResizingTerminal = false;
  document.body.style.cursor = "";
});



//zip

document.getElementById("downloadProjectBtn")?.addEventListener("click", async () => {
  const zip = new JSZip();

  // Recursively add files/folders into zip
  for (const path in files) {
    const entry = files[path];
    if (entry.type === "file" && entry.content != null) {
      zip.file(path, entry.content);
    }
    // folders are automatically created by JSZip if path contains subdirectories
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "CodeGap-Project.zip";
  link.click();

  URL.revokeObjectURL(link.href);
});