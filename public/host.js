const socket = io({
  transports: ['polling', 'websocket'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});

let roomId = null;

// Connection status handling
socket.on('connect', () => {
  console.log('Host connected:', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  updatePhaseIndicator('Connection error - please refresh');
});

let players = [];
let currentCategory = null;
let timerInterval = null;

// Get room ID from URL
const pathParts = window.location.pathname.split('/');
roomId = pathParts[pathParts.length - 1];

if (!roomId || roomId === 'host') {
  // No room ID - create new room
  updatePhaseIndicator('Creating room...');
  socket.emit('createRoom');
} else {
  // Has room ID from URL (redirected from controller)
  // Need to verify room exists or recreate it
  console.log('Host page loaded with room:', roomId);
  document.getElementById('roomCode').textContent = roomId;
  updatePhaseIndicator('Connecting to room...');
  
  // Tell server this socket is now the host for this room
  socket.emit('rejoinAsHost', { roomId });
}

// Socket event listeners
socket.on('roomCreated', ({ roomId: newRoomId }) => {
  roomId = newRoomId;
  document.getElementById('roomCode').textContent = roomId;
  
  // Update URL without reload
  window.history.pushState({}, '', `/host/${roomId}`);
  
  updateShareLink();
  showPhase('lobby');
  updatePhaseIndicator('Waiting for players to join...');
  players = []; // Initialize empty player list
  updatePlayersGrid();
  updateStartButton();
});

socket.on('hostJoined', ({ roomId: joinedRoomId, players: roomPlayers }) => {
  roomId = joinedRoomId;
  players = roomPlayers;
  showPhase('lobby');
  updatePhaseIndicator('Waiting for players to join...');
  updateShareLink();
  updatePlayersGrid();
  updateStartButton();
});

function updateShareLink() {
  const shareUrl = `${window.location.origin}/?join=${roomId}`;
  const linkEl = document.getElementById('shareLink');
  if (linkEl) {
    linkEl.textContent = shareUrl;
  }
}

function copyRoomLink() {
  const shareUrl = `${window.location.origin}/?join=${roomId}`;
  navigator.clipboard.writeText(shareUrl).then(() => {
    alert('✅ Link copied! Share it with your friends.');
  }).catch(() => {
    alert('Link: ' + shareUrl);
  });
}

socket.on('playerJoined', ({ player, players: allPlayers }) => {
  players = allPlayers;
  updatePlayersGrid();
  updateStartButton();
});

socket.on('playerLeft', ({ playerId, players: allPlayers }) => {
  players = allPlayers;
  updatePlayersGrid();
  updateStartButton();
});

socket.on('gameStarted', ({ phase, categoryOptions, round }) => {
  if (round) {
    updatePhaseIndicator(`Round ${round} of 4`);
  }
  showCategoryVoting(categoryOptions);
});

socket.on('categoryVoteUpdate', ({ voted, total }) => {
  document.getElementById('voteProgress').textContent = 
    `Votes: ${voted}/${total} players`;
});

socket.on('categorySelected', ({ category, phase }) => {
  currentCategory = category;
  showAssignmentPhase();
});

socket.on('assignmentProgress', ({ submitted, total }) => {
  document.getElementById('assignProgress').textContent = 
    `Assignments: ${submitted}/${total} players submitted`;
});

socket.on('resultsReady', ({ results, players: allPlayers }) => {
  players = allPlayers;
  showResults(results);
});

socket.on('gameSummary', ({ summaries }) => {
  showSummary(summaries);
});

socket.on('roomClosed', () => {
  alert('Room closed by host');
  location.href = '/';
});

socket.on('error', ({ message }) => {
  alert(message);
});

// UI Functions
function showPhase(phase) {
  ['lobbyPhase', 'categoryPhase', 'assignPhase', 'revealPhase', 'summaryPhase']
    .forEach(p => {
      document.getElementById(p).classList.add('hidden');
    });
  
  document.getElementById(phase + 'Phase').classList.remove('hidden');
}

function updatePhaseIndicator(text) {
  document.getElementById('phaseIndicator').textContent = text;
}

function updatePlayersGrid() {
  const grid = document.getElementById('playersGrid');
  const countEl = document.getElementById('playerCount');
  
  if (countEl) {
    countEl.textContent = players.length;
  }
  
  grid.innerHTML = players.map(p => `
    <div class="player-card">
      <div class="player-avatar">${p.avatar}</div>
      <div class="player-name">${p.name}</div>
      <div class="player-score">${p.score} pts</div>
    </div>
  `).join('');
}

function updateStartButton() {
  const btn = document.getElementById('startBtn');
  btn.disabled = players.length < 2;
  btn.textContent = players.length < 2 
    ? 'Need 2+ players' 
    : `Start Game (${players.length} players)`;
}

function startGame() {
  socket.emit('startGame', { roomId });
}

function showCategoryVoting(categories) {
  showPhase('category');
  updatePhaseIndicator('Vote for a category!');
  
  const grid = document.getElementById('categoriesGrid');
  grid.innerHTML = categories.map((cat, idx) => `
    <div class="category-card" onclick="voteCategory(${idx})">
      <div class="category-name">${cat.name}</div>
      <div class="category-roles">
        ${cat.roles.map(r => `
          <div class="category-role">${r.label}</div>
        `).join('')}
      </div>
    </div>
  `).join('');
  
  document.getElementById('voteProgress').textContent = 'Waiting for votes...';
}

function voteCategory(index) {
  socket.emit('voteCategory', { roomId, categoryIndex: index });
  
  // Disable further voting
  document.querySelectorAll('.category-card').forEach(card => {
    card.style.opacity = '0.5';
    card.style.pointerEvents = 'none';
  });
}

function showAssignmentPhase() {
  showPhase('assign');
  updatePhaseIndicator('Players assigning roles...');
  
  document.getElementById('categoryTitle').textContent = currentCategory.name;
  document.getElementById('assignProgress').textContent = 'Waiting for assignments...';
  
  // Start 60s timer
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
      timerEl.textContent = 'Time\'s up!';
    }
  }, 1000);
  
  // Show assignment container (will be updated with real-time votes if needed)
  const container = document.getElementById('assignmentContainer');
  container.innerHTML = currentCategory.roles.map(role => `
    <div class="role-assignment">
      <div class="role-header">${role.label}</div>
      <div class="role-desc">${role.desc}</div>
      <div class="vote-bar-container" id="votes-${role.id}">
        <em style="opacity: 0.7;">Waiting for votes...</em>
      </div>
    </div>
  `).join('');
}

function showResults(results) {
  clearInterval(timerInterval);
  showPhase('reveal');
  updatePhaseIndicator('🎉 Results!');
  
  const container = document.getElementById('resultsContainer');
  
  // Create confetti
  createConfetti();
  
  container.innerHTML = Object.values(results).map(result => `
    <div class="result-card">
      <div class="result-role">🏆 ${result.roleLabel}</div>
      <div class="result-winner">
        <span class="result-winner-avatar">${result.winnerAvatar}</span>
        <span>${result.winnerName}</span>
      </div>
      <div class="result-description">${result.description}</div>
      <div class="result-votes">${result.votes} votes</div>
    </div>
  `).join('');
  
  // Update player scores in grid
  updatePlayersGrid();
}

function showSummary(summaries) {
  showPhase('summary');
  updatePhaseIndicator('🎊 Game Over!');
  
  createConfetti();
  
  const container = document.getElementById('summaryContainer');
  container.innerHTML = summaries.map((player, idx) => `
    <div class="summary-card">
      <div class="summary-rank">#${idx + 1}</div>
      <div class="summary-avatar">${player.avatar}</div>
      <div class="summary-info">
        <div class="summary-name">${player.name}</div>
        <div class="summary-title">"${player.title}"</div>
        <div class="summary-roles">Won: ${player.earnedRoles.join(', ') || 'No roles'}</div>
      </div>
      <div class="summary-score">${player.score}</div>
    </div>
  `).join('');
}

function nextRound() {
  socket.emit('nextRound', { roomId });
}

function createConfetti() {
  const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffd700'];
  
  for (let i = 0; i < 50; i++) {
    setTimeout(() => {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.animationDelay = Math.random() * 3 + 's';
      confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
      document.body.appendChild(confetti);
      
      setTimeout(() => confetti.remove(), 5000);
    }, i * 50);
  }
}
