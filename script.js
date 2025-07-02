// Firebase SDK（モジュール版）を読み込み
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, doc,
  onSnapshot, query, orderBy, getDoc,
  deleteDoc, setDoc, getDocs, Timestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// ● Firebase 初期化
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID"
};
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// URLパラメータ取得
const params    = new URLSearchParams(location.search);
const roomId    = params.get("id");
const isArchive = params.get("archived") === "1";

// --------- index.html 用ロジック ---------
const createBtn = document.getElementById("create-room");
if (createBtn) {
  const activeCol  = collection(db, "rooms", "active", "list");
  const archiveCol = collection(db, "rooms", "archive", "list");

  // 新規部屋作成
  createBtn.onclick = async () => {
    const title = document.getElementById("room-title").value.trim();
    if (!title) return alert("タイトルを入力してください");
    const docRef = await addDoc(activeCol, {
      title,
      createdAt: Timestamp.fromDate(new Date())
    });
    location.href = `room.html?id=${docRef.id}`;
  };

  // アクティブ部屋一覧のリアルタイム表示
  onSnapshot(
    query(activeCol, orderBy("createdAt", "desc")),
    snap => {
      const ul = document.getElementById("active-list");
      ul.innerHTML = "";
      snap.forEach(d => {
        const li = document.createElement("li");
        li.innerHTML = `<a href="room.html?id=${d.id}">${d.data().title}</a>`;
        ul.appendChild(li);
      });
    }
  );

  // アーカイブ一覧のリアルタイム表示
  onSnapshot(
    query(archiveCol, orderBy("closedAt", "desc")),
    snap => {
      const ul = document.getElementById("archive-list");
      ul.innerHTML = "";
      snap.forEach(d => {
        const data = d.data();
        const date = data.closedAt.toDate().toLocaleString();
        const li = document.createElement("li");
        li.innerHTML = `<a href="room.html?id=${d.id}&archived=1">` +
                       `${data.title} (終了: ${date})</a>`;
        ul.appendChild(li);
      });
    }
  );
}

// --------- room.html 用ロジック ---------
const addBtn    = document.getElementById("add");
const chatEl    = document.getElementById("chat");
const closeBtn  = document.getElementById("close-room");
if (roomId && (addBtn || isArchive)) {
  const metaActive  = doc(db, "rooms", "active",  "list", roomId);
  const metaArchive = doc(db, "rooms", "archive", "list", roomId);
  const chatCol     = collection(db, "rooms", "active", "list", roomId, "chat");

  // タイトル取得＆表示
  (async () => {
    const snap = await getDoc(isArchive ? metaArchive : metaActive);
    if (!snap.exists()) {
      alert("部屋が見つかりません");
      return;
    }
    document.getElementById("room-title").innerText = snap.data().title;
  })();

  // チャット表示
  if (!isArchive) {
    // リアルタイム監視
    onSnapshot(
      query(chatCol, orderBy("createdAt")),
      snap => {
        chatEl.innerHTML = "";
        snap.forEach(doc => renderBubble(doc.data()));
      }
    );
  } else {
    // アーカイブログは一度だけ取得
    (async () => {
      const snap = await getDoc(metaArchive);
      const logs = snap.data().logs || [];
      logs.forEach(item => renderBubble(item));
    })();
    // 編集UIは不要
    document.getElementById("editor").style.display = "none";
  }

  // 投稿ボタン
  if (!isArchive) {
    addBtn.onclick = async () => {
      const entry = {
        speaker: document.getElementById("speaker").value,
        avatar:  document.getElementById("avatar").value,
        position: document.getElementById("position").value,
        text:     document.getElementById("text").value,
        createdAt: Timestamp.fromDate(new Date())
      };
      await addDoc(chatCol, entry);
      document.getElementById("speaker").value = "";
      document.getElementById("avatar").value  = "";
      document.getElementById("text").value    = "";
    };

    // 部屋をアーカイブ
    closeBtn.onclick = async () => {
      // チャットログ全取得
      const logsSnap = await getDocs(chatCol);
      const logs = logsSnap.docs.map(d => d.data());
      // アーカイブドキュメント作成
      await setDoc(metaArchive, {
        ...(await (await getDoc(metaActive)).data()),
        closedAt: Timestamp.fromDate(new Date()),
        logs
      });
      // アクティブ部屋本体とチャットを削除
      await deleteDoc(metaActive);
      for (const d of logsSnap.docs) {
        await deleteDoc(doc(chatCol, d.id));
      }
      // 再読み込み→アーカイブモード表示
      location.href = `room.html?id=${roomId}&archived=1`;
    };
  }
}

// チャット吹き出し描画ヘルパー
function renderBubble(item) {
  const bubble = document.createElement("div");
  bubble.className = "chat-bubble " + (item.position === "left" ? "left" : "");
  const img = document.createElement("img");
  img.src = item.avatar;
  img.alt = item.speaker;
  const txt = document.createElement("div");
  txt.className = "chat-text";
  txt.innerText = item.text;
  bubble.append(img, txt);
  chatEl.append(bubble);
}
