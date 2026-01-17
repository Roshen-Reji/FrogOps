import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, orderBy, onSnapshot, getDocs, deleteDoc, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- PASTE YOUR FIREBASE CONFIG HERE ---
const firebaseConfig = {
    // ...
    apiKey: "AIzaSyCg5JDoP_lfNKxg6XzRu0J5xevBLsx1JIo",
  authDomain: "sell-the-product.firebaseapp.com",
  projectId: "sell-the-product",
  storageBucket: "sell-the-product.firebasestorage.app",
  messagingSenderId: "1085888316819",
  appId: "1:1085888316819:web:324fa69a3a56a88b831466"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Login
document.getElementById('login-btn').addEventListener('click', () => {
  if (document.getElementById('admin-pass').value === 'admin123') {
    document.getElementById('login-overlay').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    initDashboard();
  } else {
    alert('Incorrect Password');
  }
});

// 1. FORCE STOP ALL GAMES
document.getElementById('force-stop-btn').addEventListener('click', async () => {
    if(confirm("This will stop the game for ALL currently playing teams. Are you sure?")) {
        try {
            // Write to a config document that clients listen to
            await setDoc(doc(db, "config", "gameState"), { status: 'stopped' });
            alert("Stop signal sent to all players.");
        } catch(e) { console.error(e); }
    }
});

// 2. CLEAR DATABASE (Reset)
document.getElementById('clear-db-btn').addEventListener('click', async () => {
    const code = prompt("Type 'DELETE' to confirm clearing the entire leaderboard:");
    if (code === 'DELETE') {
        try {
            // Delete all teams
            const q = query(collection(db, "froggy_teams"));
            const snapshot = await getDocs(q);
            const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
            await Promise.all(deletePromises);
            
            // Reset game state to running so people can play again
            await setDoc(doc(db, "config", "gameState"), { status: 'running' });
            
            alert("Database cleared and game reset.");
        } catch(e) { console.error(e); alert("Error clearing database."); }
    }
});

function initDashboard() {
  const q = query(collection(db, "froggy_teams"), orderBy("score", "desc"));
  
  onSnapshot(q, (snapshot) => {
    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = "";
    
    const teams = [];
    snapshot.forEach(doc => teams.push(doc.data()));

    teams.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const timeA = (a.endTime || Date.now()) - a.startTime;
      const timeB = (b.endTime || Date.now()) - b.startTime;
      return timeA - timeB;
    });

    teams.forEach((team, index) => {
      const tr = document.createElement('tr');
      const isFinished = !!team.endTime;
      const duration = formatDuration(team.startTime, team.endTime);
      
      tr.innerHTML = `
        <td>#${index + 1}</td>
        <td>${team.name}</td>
        <td>${team.score}</td>
        <td>${duration}</td>
        <td style="color:${isFinished ? '#2ecc71' : '#f1c40f'}">${isFinished ? 'Finished' : 'Playing'}</td>
      `;
      tbody.appendChild(tr);
    });
  });
}

function formatDuration(start, end) {
  if (!start) return "--";
  const endTime = end || Date.now();
  const diff = endTime - start;
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
  return `${m}:${s}`;
}