import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

let currentTeam = null;
let timerInterval = null;
let gameActive = false;
const GAME_DURATION_MIN = 15;
let remainingTime = GAME_DURATION_MIN * 60; // seconds

// Helper: MM:SS format
function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// 1. Listen for Global Admin Stop Signal
onSnapshot(doc(db, "config", "gameState"), (doc) => {
    if (doc.exists() && doc.data().status === 'stopped' && gameActive) {
        finishGame("The Admin has stopped the game!");
    }
});

// 2. Start Game Logic
document.getElementById('start-btn').addEventListener('click', async () => {
  const nameInput = document.getElementById('team-name-input').value.trim();
  
  if (nameInput.length > 0) {
    // --- [FIX START] RESET GAME STATE & TIMER FOR NEW TEAM ---
    
    // 1. Clear browser storage so old progress doesn't persist
    localStorage.removeItem('level');
    localStorage.removeItem('answers');
    localStorage.removeItem('solved');

    // 2. Reset the in-memory game object (accessed via window because this is a module)
    if (window.game) {
        window.game.level = 0;
        window.game.answers = {};
        window.game.solved = [];
        window.game.changed = false;
        
        // Reset the visual board to Level 1
        if (window.levels) {
            window.game.loadLevel(window.levels[0]);
        }
        
        // Remove "solved" green markers from the level dropdown
        // (Assuming jQuery '$' is available globally)
        $('.level-marker').removeClass('solved');
        
        // Reset the score tracker variable
        window.currentScore = 0;
    }

    // 3. Reset the Timer variable (otherwise it continues from where it stopped)
    remainingTime = GAME_DURATION_MIN * 60;
    
    // --- [FIX END] ---

    currentTeam = nameInput;
    gameActive = true;

    // UI Updates
    document.getElementById('team-overlay').style.display = 'none';
    document.getElementById('game-timer').style.display = 'block';
    document.getElementById('stop-btn').style.display = 'block';

    // Start 15min Countdown
    timerInterval = setInterval(() => {
        remainingTime--;
        document.getElementById('game-timer').textContent = formatTime(remainingTime);
        
        if (remainingTime <= 0) {
            finishGame("Time's up!");
        }
    }, 1000);
    
    // Save Team
    try {
      await setDoc(doc(db, "froggy_teams", currentTeam), {
        name: currentTeam,
        score: 0,
        startTime: Date.now(),
        endTime: null,
        lastUpdated: Date.now()
      }, { merge: true });
    } catch(e) {
      console.error("Login error", e);
    }
  } else {
    alert("Please enter a team name.");
  }
});
// 3. Manual "Give Up" Button
document.getElementById('stop-btn').addEventListener('click', () => {
    if(confirm("Are you sure you want to stop? You cannot restart.")) {
        finishGame("You ended the game.");
    }
});

// 4. Finish Game Function (Handles all stop scenarios)
async function finishGame(reason) {
    if (!gameActive) return;
    gameActive = false;
    clearInterval(timerInterval);

    // Save end time
    try {
        const teamRef = doc(db, "froggy_teams", currentTeam);
        await updateDoc(teamRef, { endTime: Date.now() });
    } catch (e) { console.error(e); }

    // Show Overlay
    const overlay = document.getElementById('team-overlay');
    overlay.style.display = 'flex';
    document.getElementById('login-inputs').style.display = 'none';
    document.getElementById('status-message').innerHTML = `
        <h2 style="color:#e74c3c">GAME OVER</h2>
        <p>${reason}</p>
        <p>Final Score: ${window.currentScore || 0}</p>
    `;
    alert(reason);
}

// 5. Update Score Hook
window.currentScore = 0;
window.updateFirebaseScore = async (solvedCount) => {
  if (!currentTeam || !gameActive) return;
  window.currentScore = solvedCount;

  try {
    const teamRef = doc(db, "froggy_teams", currentTeam);
    await updateDoc(teamRef, { 
        score: solvedCount,
        lastUpdated: Date.now()
    });
  } catch (e) { console.error(e); }
  
  // Check win condition (24 levels)
  if (solvedCount >= 24) {
      finishGame("Congratulations! You finished all levels!");
  }
};