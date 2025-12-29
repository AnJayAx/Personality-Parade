const socket = io();

let roomId = null;
let playerData = null;
let selectedAvatar = '😊';
let currentCategory = null;
let assignments = {};
let timerInterval = null;

// Check if we're on host path
if (window.location.pathname.startsWith('/host')) {
  // This is a host screen, controller.js shouldn't run here
} else {
  // Initialize emoji picker
  document.querySelectorAll('.emoji-option').forEach(option => {
    option.addEventListener('click', () => {
      document.querySelectorAll('.emoji-option').forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');
      selectedAvatar = option.dataset.emoji;
    });
  });
}

// Socket event listeners
socket.on('roomCreated', ({ roomId: newRoomId }) => {
  roomId = newRoomId;
  // Redirect to host screen
  window.location.href = `/host/${roomId}`;
});

socket.on('joinedRoom', ({ roomId: joinedRoomId, player, players }) => {
  roomId = joinedRoomId;
  playerData = player;
  showPage('waitingPage');
  updatePlayerCount(players.length);
});

socket.on('playerJoined', ({ players }) => {
  updatePlayerCount(players.length);
});

socket.on('playerLeft', ({ players }) => {
  updatePlayerCount(players.length);
});

socket.on('gameStarted', ({ phase, categoryOptions }) => {
  showCategoryVoting(categoryOptions);
});

socket.on('categoryVoteUpdate', ({ voted, total }) => {
  // Could show progress if needed
});

socket.on('categorySelected', ({ category }) => {
  currentCategory = category;
  showAssignmentPage();
});

socket.on('assignmentProgress', ({ submitted, total }) => {
  // Could show who's submitted
});

socket.on('resultsReady', ({ results, players }) => {
  // Update own score
  const me = players.find(p => p.id === socket.id);
  if (me) {
    playerData.score = me.score;
    playerData.earnedRoles = me.earnedRoles;
  }
  showResults(results);
});

socket.on('gameSummary', ({ summaries }) => {
  const myData = summaries.find(s => s.id === socket.id);
  if (myData) {
    showSummary(myData);
  }
});

socket.on('roomClosed', () => {
  alert('Room closed');
  location.href = '/';
});

socket.on('error', ({ message }) => {
  const errorEl = document.getElementById('joinError');
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
  document.getElementById('joinBtn').disabled = false;
});

// Navigation functions
function showPage(pageId) {
  ['landingPage', 'createRoomPage', 'joinRoomPage', 'waitingPage', 
   'categoryPage', 'assignmentPage', 'waitingResultsPage', 'resultsPage', 'summaryPage']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
  
  const page = document.getElementById(pageId);
  if (page) page.classList.remove('hidden');
}

function showLanding() {
  showPage('landingPage');
}

function showCreateRoom() {
  showPage('createRoomPage');
  socket.emit('createRoom');
}

function showJoinRoom() {
  showPage('joinRoomPage');
  document.getElementById('joinError').classList.add('hidden');
}

function joinRoom() {
  const roomCode = document.getElementById('roomCodeInput').value.trim().toUpperCase();
  const playerName = document.getElementById('playerNameInput').value.trim();
  
  document.getElementById('joinError').classList.add('hidden');
  
  if (!roomCode || roomCode.length !== 4) {
    showError('Please enter a 4-letter room code');
    return;
  }
  
  if (!playerName) {
    showError('Please enter your name');
    return;
  }
  
  document.getElementById('joinBtn').disabled = true;
  socket.emit('joinRoom', {
    roomId: roomCode,
    name: playerName,
    avatar: selectedAvatar
  });
}

function showError(message) {
  const errorEl = document.getElementById('joinError');
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
}

function updatePlayerCount(count) {
  const el = document.getElementById('playerCount');
  if (el) {
    el.textContent = `${count} player${count !== 1 ? 's' : ''} in room`;
  }
}

// Category voting
function showCategoryVoting(categories) {
  showPage('categoryPage');
  
  const container = document.getElementById('categoriesContainer');
  container.innerHTML = categories.map((cat, idx) => `
    <div class="category-card" onclick="voteForCategory(${idx})">
      <div class="category-name">${cat.name}</div>
      <div class="category-roles">
        ${cat.roles.map(r => `
          <div class="category-role">${r.label}</div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function voteForCategory(index) {
  socket.emit('voteCategory', { roomId, categoryIndex: index });
  
  // Visual feedback
  const cards = document.querySelectorAll('.category-card');
  cards.forEach((card, idx) => {
    if (idx === index) {
      card.classList.add('selected');
    }
    card.style.pointerEvents = 'none';
    card.style.opacity = idx === index ? '1' : '0.5';
  });
  
  showPage('waitingResultsPage');
}

// Assignment phase
function showAssignmentPage() {
  showPage('assignmentPage');
  
  document.getElementById('assignmentTitle').textContent = currentCategory.name;
  
  assignments = {};
  
  // Start timer
  let timeLeft = 60;
  const timerEl = document.getElementById('timer');
  
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft--;
    timerEl.textContent = timeLeft;
    
    if (timeLeft <= 10) {
      timerEl.classList.add('urgent');
    }
    
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      submitAssignments();
    }
  }, 1000);
  
  // Render assignment interface
  const grid = document.getElementById('assignmentGrid');
  grid.innerHTML = currentCategory.roles.map(role => `
    <div class="role-card">
      <div class="role-title">${role.label}</div>
      <div class="role-description">${role.desc}</div>
      <div class="player-select" id="role-${role.id}">
        ${renderPlayerOptions(role.id)}
      </div>
    </div>
  `).join('');
}

function renderPlayerOptions(roleId) {
  // Get all players from socket (we need to track this)
  // For now, we'll use a simplified version
  return `
    <div class="player-option" onclick="selectPlayer(this, ${roleId}, 'player1')">
      <div class="player-option-avatar">👤</div>
      <div class="player-option-name">Player 1</div>
    </div>
  `;
}

function selectPlayer(element, roleId, playerId) {
  const container = element.closest('.player-select');
  
  // Deselect others in this role
  container.querySelectorAll('.player-option').forEach(opt => {
    opt.classList.remove('selected');
  });
  
  // Select this one
  element.classList.add('selected');
  assignments[roleId] = playerId;
}

function submitAssignments() {
  clearInterval(timerInterval);
  
  // Convert assignments to server format: { playerId: roleId }
  const serverAssignments = {};
  Object.entries(assignments).forEach(([roleId, playerId]) => {
    serverAssignments[playerId] = parseInt(roleId);
  });
  
  socket.emit('submitAssignments', { 
    roomId, 
    assignments: serverAssignments 
  });
  
  document.getElementById('submitBtn').disabled = true;
  showPage('waitingResultsPage');
}

// Results
function showResults(results) {
  clearInterval(timerInterval);
  showPage('resultsPage');
  
  document.getElementById('scoreDisplay').textContent = 
    `Your Score: ${playerData.score} pts`;
  
  const container = document.getElementById('resultsContainer');
  container.innerHTML = Object.values(results).map(result => `
    <div class="result-card">
      <div class="result-role">🏆 ${result.roleLabel}</div>
      <div class="result-winner">
        ${result.winnerAvatar} ${result.winnerName}
      </div>
      ${result.winnerId === socket.id ? 
        '<div style="font-size: 1.5em; color: #ffd700;">🎉 That\'s you!</div>' : 
        ''}
      <div class="result-description">${result.description}</div>
    </div>
  `).join('');
}

// Summary
function showSummary(myData) {
  showPage('summaryPage');
  
  document.getElementById('finalTitle').textContent = `"${myData.title}"`;
  document.getElementById('finalScore').textContent = `Final Score: ${myData.score} pts`;
  document.getElementById('finalRoles').textContent = 
    myData.earnedRoles.length > 0 
      ? `You won: ${myData.earnedRoles.join(', ')}` 
      : 'You participated!';
}

// Enhanced player selection with actual player data
let allPlayers = [];

socket.on('joinedRoom', ({ roomId: joinedRoomId, player, players }) => {
  roomId = joinedRoomId;
  playerData = player;
  allPlayers = players;
  showPage('waitingPage');
  updatePlayerCount(players.length);
});

socket.on('playerJoined', ({ players }) => {
  allPlayers = players;
  updatePlayerCount(players.length);
});

socket.on('categorySelected', ({ category }) => {
  currentCategory = category;
  showAssignmentPageEnhanced();
});

function showAssignmentPageEnhanced() {
  showPage('assignmentPage');
  
  document.getElementById('assignmentTitle').textContent = currentCategory.name;
  
  assignments = {};
  
  // Start timer
  let timeLeft = 60;
  const timerEl = document.getElementById('timer');
  
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft--;
    timerEl.textContent = timeLeft;
    
    if (timeLeft <= 10) {
      timerEl.classList.add('urgent');
    }
    
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      submitAssignments();
    }
  }, 1000);
  
  // Render assignment interface with real players
  const grid = document.getElementById('assignmentGrid');
  grid.innerHTML = currentCategory.roles.map(role => `
    <div class="role-card">
      <div class="role-title">${role.label}</div>
      <div class="role-description">${role.desc}</div>
      <div class="player-select" id="role-${role.id}">
        ${allPlayers.map(p => `
          <div class="player-option" onclick="selectPlayerEnhanced(this, ${role.id}, '${p.id}')">
            <div class="player-option-avatar">${p.avatar}</div>
            <div class="player-option-name">${p.name}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function selectPlayerEnhanced(element, roleId, playerId) {
  const container = element.closest('.player-select');
  
  // Deselect others in this role
  container.querySelectorAll('.player-option').forEach(opt => {
    opt.classList.remove('selected');
  });
  
  // Select this one
  element.classList.add('selected');
  assignments[playerId] = roleId;
}
