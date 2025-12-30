// Check if Socket.IO is loaded
if (typeof io === 'undefined') {
  console.error('Socket.IO client library not loaded!');
  alert('Error: Unable to load required libraries. Please refresh the page.');
}

const socket = io({
  transports: ['polling', 'websocket'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});

console.log('=== Controller.js loaded ===');
console.log('Socket.IO initialized');
console.log('Current path:', window.location.pathname);

let roomId = null;
let connectionReady = false;

// Connection status handling
socket.on('connect', () => {
  console.log('Connected to server:', socket.id);
  connectionReady = true;
  updateConnectionStatus('✓ Connected', 'green');
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  updateConnectionStatus('✗ Connection failed', 'red');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
  connectionReady = false;
  updateConnectionStatus('Disconnected', 'orange');
});

let playerData = null;
let selectedAvatar = '😊';
let currentCategory = null;
let assignments = {};
let assignedPlayers = new Set(); // Track which players are already assigned
let timerInterval = null;

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  // Check if we're on host path
  if (window.location.pathname.startsWith('/host')) {
    // This is a host screen, controller.js shouldn't run here
    return;
  }
  
  // Check for room code in URL (?join=ABCD)
  const urlParams = new URLSearchParams(window.location.search);
  const joinCode = urlParams.get('join');
  if (joinCode) {
    // Auto-open join screen with room code pre-filled
    setTimeout(() => {
      showJoinRoom();
      document.getElementById('roomCodeInput').value = joinCode.toUpperCase();
      document.getElementById('playerNameInput').focus();
    }, 100);
  }
  
  // Initialize emoji picker
  const emojiOptions = document.querySelectorAll('.emoji-option');
  if (emojiOptions.length > 0) {
    emojiOptions.forEach(option => {
      option.addEventListener('click', () => {
        document.querySelectorAll('.emoji-option').forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
        selectedAvatar = option.dataset.emoji;
      });
    });
  }
  
  console.log('Controller initialized');
});

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

socket.on('showSingleResult', ({ result, currentIndex, totalRoles, players }) => {
  // Update own score
  const me = players.find(p => p.id === socket.id);
  if (me) {
    playerData.score = me.score;
    playerData.earnedRoles = me.earnedRoles;
  }
  showSingleResult(result, currentIndex, totalRoles);
});

socket.on('roundComplete', ({ players, results }) => {
  const me = players.find(p => p.id === socket.id);
  if (me) {
    playerData = me;
  }
  showRoundComplete(results);
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
function updateConnectionStatus(text, color) {
  const statusEl = document.getElementById('statusText');
  if (statusEl) {
    statusEl.textContent = text;
    statusEl.style.color = color;
  }
}

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
  console.log('showCreateRoom called, socket.connected:', socket.connected);
  
  if (!socket.connected) {
    // Try to wait for connection
    showPage('createRoomPage');
    let attempts = 0;
    const waitForConnection = setInterval(() => {
      attempts++;
      if (socket.connected) {
        clearInterval(waitForConnection);
        console.log('Connected! Creating room...');
        socket.emit('createRoom');
      } else if (attempts > 10) {
        clearInterval(waitForConnection);
        alert('Unable to connect to server. Please check your internet connection and try again.');
        showPage('landingPage');
      }
    }, 500);
    return;
  }
  
  console.log('Showing create room page and emitting createRoom event');
  showPage('createRoomPage');
  socket.emit('createRoom');
}

function showJoinRoom() {
  console.log('showJoinRoom called');
  showPage('joinRoomPage');
  const errorEl = document.getElementById('joinError');
  if (errorEl) {
    errorEl.classList.add('hidden');
  }
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

// Results - show one at a time
function showSingleResult(result, currentIndex, totalRoles) {
  clearInterval(timerInterval);
  showPage('resultsPage');
  
  console.log('Showing single result:', result);
  
  document.getElementById('scoreDisplay').textContent = 
    `Your Score: ${playerData ? playerData.score : 0} pts`;
  
  const container = document.getElementById('resultsContainer');
  container.innerHTML = `
    <div class="result-card">
      <div style="text-align: center; font-size: 1.5em; margin-bottom: 20px; color: #ffd700;">
        Result ${currentIndex + 1} of ${totalRoles}
      </div>
      <div class="result-role">🏆 ${result.roleLabel}</div>
      <div class="result-winner">
        ${result.winnerAvatar} ${result.winnerName}
      </div>
      ${result.winnerId === socket.id ? 
        '<div style="font-size: 1.5em; color: #ffd700;">🎉 That\'s you!</div>' : 
        ''}
      <div class="result-description">${result.description || 'Amazing performance!'}</div>
      <div style="margin-top: 10px; color: #ffd700;">${result.votes} vote${result.votes !== 1 ? 's' : ''}</div>
    </div>
    <div style="text-align: center; margin-top: 20px; opacity: 0.8;">
      Waiting for next result...
    </div>
  `;
}

function showRoundComplete(results) {
  showPage('resultsPage');
  
  document.getElementById('scoreDisplay').textContent = 
    `Your Score: ${playerData ? playerData.score : 0} pts`;
  
  const container = document.getElementById('resultsContainer');
  container.innerHTML = `
    <h2 style="text-align: center; font-size: 2em; margin-bottom: 20px;">🏆 Round Complete!</h2>
    <div style="text-align: center; margin-bottom: 30px;">
      ${playerData.earnedRoles.length > 0 ? 
        `<div style="font-size: 1.5em; color: #ffd700; margin: 20px 0;">You won: ${playerData.earnedRoles[playerData.earnedRoles.length - 1]}!</div>` :
        '<div style="font-size: 1.2em; opacity: 0.8;">Better luck next round!</div>'
      }
    </div>
    ${Object.values(results).map(result => `
      <div style="background: rgba(255,255,255,0.15); padding: 15px; margin: 10px 0; border-radius: 10px; display: flex; align-items: center; gap: 15px;">
        <div style="font-size: 2em;">${result.winnerAvatar}</div>
        <div style="flex: 1;">
          <div style="font-size: 1.2em; font-weight: bold;">${result.winnerName}</div>
          <div style="opacity: 0.9;">${result.roleLabel}</div>
        </div>
      </div>
    `).join('')}
    <div style="text-align: center; margin-top: 30px; opacity: 0.8;">
      Waiting for next round...
    </div>
  `;
}

function showResults(results) {
  clearInterval(timerInterval);
  showPage('resultsPage');
  
  console.log('Showing results:', results);
  
  document.getElementById('scoreDisplay').textContent = 
    `Your Score: ${playerData ? playerData.score : 0} pts`;
  
  const container = document.getElementById('resultsContainer');
  
  if (!results || Object.keys(results).length === 0) {
    container.innerHTML = '<div class="result-card"><h2>No results yet...</h2></div>';
    return;
  }
  
  container.innerHTML = Object.values(results).map(result => `
    <div class="result-card">
      <div class="result-role">🏆 ${result.roleLabel}</div>
      <div class="result-winner">
        ${result.winnerAvatar} ${result.winnerName}
      </div>
      ${result.winnerId === socket.id ? 
        '<div style="font-size: 1.5em; color: #ffd700;">🎉 That\'s you!</div>' : 
        ''}
      <div class="result-description">${result.description || 'Amazing performance!'}</div>
      <div style="margin-top: 10px; color: #ffd700;">${result.votes} vote${result.votes !== 1 ? 's' : ''}</div>
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
  assignedPlayers = new Set(); // Reset
  
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
          <div class="player-option" onclick="selectPlayerEnhanced(this, ${role.id}, '${p.id}')" data-player-id="${p.id}">
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
  
  // Check if player is already assigned to another role
  if (assignedPlayers.has(playerId) && assignments[playerId] !== roleId) {
    // Player already assigned elsewhere, show feedback
    element.style.animation = 'shake 0.3s';
    setTimeout(() => {
      element.style.animation = '';
    }, 300);
    return;
  }
  
  // Remove previous assignment for this player if any
  if (assignments[playerId]) {
    const oldRoleId = assignments[playerId];
    delete assignments[playerId];
    assignedPlayers.delete(playerId);
    
    // Update UI for old role
    const oldContainer = document.getElementById(`role-${oldRoleId}`);
    if (oldContainer) {
      oldContainer.querySelectorAll('.player-option').forEach(opt => {
        opt.classList.remove('selected');
      });
    }
  }
  
  // Deselect others in this role
  container.querySelectorAll('.player-option').forEach(opt => {
    const optPlayerId = opt.getAttribute('data-player-id');
    if (optPlayerId && assignments[optPlayerId] === roleId) {
      delete assignments[optPlayerId];
      assignedPlayers.delete(optPlayerId);
    }
    opt.classList.remove('selected');
  });
  
  // Select this one
  element.classList.add('selected');
  assignments[playerId] = roleId;
  assignedPlayers.add(playerId);
  
  // Update all player options to show which are unavailable
  updatePlayerOptionsAvailability();
}

function updatePlayerOptionsAvailability() {
  document.querySelectorAll('.player-option').forEach(opt => {
    const playerId = opt.getAttribute('data-player-id');
    if (playerId && assignedPlayers.has(playerId) && !opt.classList.contains('selected')) {
      opt.style.opacity = '0.3';
      opt.style.pointerEvents = 'none';
    } else if (playerId) {
      opt.style.opacity = '1';
      opt.style.pointerEvents = 'auto';
    }
  });
}
