import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, doc,
  onSnapshot, query, orderBy, getDoc, deleteDoc, setDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  // ...
};
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// 省略：Firebase初期化コード

const activeCol  = collection(db, "rooms", "active", "list");
const archiveCol = collection(db, "rooms", "archive", "list");

// 新規部屋作成
document.getElementById("create-room").onclick = async () => {
  const title = document.getElementById("room-title").value.trim();
  if (!title) return alert("タイトルを入力してください");
  const docRef = await addDoc(activeCol, {
    title,
    createdAt: new Date()
  });
  window.location.href = `room.html?id=${docRef.id}`;
};

// リアルタイムにアクティブ一覧を監視
onSnapshot(query(activeCol, orderBy("createdAt", "desc")), snap => {
  const ul = document.getElementById("active-list");
  ul.innerHTML = "";
  snap.forEach(doc => {
    const li = document.createElement("li");
    li.innerHTML = `<a href="room.html?id=${doc.id}">${doc.data().title}</a>`;
    ul.appendChild(li);
  });
});

// アーカイブ一覧を監視
onSnapshot(query(archiveCol, orderBy("closedAt", "desc")), snap => {
  const ul = document.getElementById("archive-list");
  ul.innerHTML = "";
  snap.forEach(doc => {
    const d = doc.data();
    const li = document.createElement("li");
    li.innerHTML = `<a href="room.html?id=${doc.id}&archived=1">${d.title} (終了: ${d.closedAt.toDate().toLocaleString()})</a>`;
    ul.appendChild(li);
  });
});



let story = [];
const speakerEl = document.getElementById('speaker');
const avatarEl  = document.getElementById('avatar');
const posEl     = document.getElementById('position');
const textEl    = document.getElementById('text');
const preview   = document.getElementById('preview');
const addBtn    = document.getElementById('addBtn');
const toggleBtn = document.getElementById('toggleView');
const exportBtn = document.getElementById('exportJson');
let viewMode = 'editor';

function render() {
  preview.innerHTML = '';
  story.forEach(item => {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble ' + (item.position === 'left' ? 'left' : '');
    const img = document.createElement('img');
    img.src = item.avatar;
    img.alt = item.speaker;
    const txt = document.createElement('div');
    txt.className = 'chat-text';
    txt.innerText = item.text;
    bubble.appendChild(img);
    bubble.appendChild(txt);
    preview.appendChild(bubble);
  });
}

addBtn.addEventListener('click', () => {
  const entry = {
    speaker: speakerEl.value,
    avatar:  avatarEl.value,
    position: posEl.value,
    text:     textEl.value
  };
  story.push(entry);
  render();
  speakerEl.value = avatarEl.value = textEl.value = '';
});

toggleBtn.addEventListener('click', () => {
  const editor = document.getElementById('editor-column');
  if (viewMode === 'editor') {
    editor.style.display = 'none';
    toggleBtn.textContent = '編集モードに戻す';
    viewMode = 'chat';
  } else {
    editor.style.display = 'block';
    toggleBtn.textContent = '表示モード切替';
    viewMode = 'editor';
  }
});

exportBtn.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(story, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'story.json';
  a.click();
  URL.revokeObjectURL(url);
});

render();
