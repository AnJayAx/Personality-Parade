const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const { generateCategories, describeWinner, finalTitle } = require('./ai.js');

const app = express();
app.use(cors());
app.use(express.static('public'));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { 
    origin: '*',
    methods: ['GET', 'POST']
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});

// In-memory game state
const rooms = new Map();

// Predefined categories
const PREDEFINED_CATEGORIES = [
  {
    name: "Sports they'd crush",
    roles: [
      { id: 1, label: "Football Star", desc: "Runs circles around everyone" },
      { id: 2, label: "Badminton Ace", desc: "Lightning reflexes" },
      { id: 3, label: "Swimming Pro", desc: "Like a fish in water" },
      { id: 4, label: "Esports Legend", desc: "Digital athlete extraordinaire" },
      { id: 5, label: "Marathon Runner", desc: "Never stops moving" },
      { id: 6, label: "Yoga Master", desc: "Zen flexibility goals" }
    ]
  },
  {
    name: "Office archetypes",
    roles: [
      { id: 1, label: "Chiongster", desc: "Deadline destroyer" },
      { id: 2, label: "Chill One", desc: "Stress? Never heard of it" },
      { id: 3, label: "Blur Sotong", desc: "Lost but lovable" },
      { id: 4, label: "The Boss", desc: "Natural leader vibes" },
      { id: 5, label: "Office Gossip", desc: "Knows everything about everyone" }
    ]
  },
  {
    name: "Foodie types",
    roles: [
      { id: 1, label: "Hawker Hero", desc: "$3 meal specialist" },
      { id: 2, label: "Fine Dining Snob", desc: "Michelin or nothing" },
      { id: 3, label: "Instant Noodles King", desc: "Maggi Mee master" },
      { id: 4, label: "Spicy Slayer", desc: "Extra chili please" },
      { id: 5, label: "Dessert First", desc: "Life's too short" }
    ]
  },
  {
    name: "Night out vibes",
    roles: [
      { id: 1, label: "Party Animal", desc: "Last one standing" },
      { id: 2, label: "Early Bird", desc: "Home by 10pm" },
      { id: 3, label: "KTV King", desc: "Microphone monopolizer" },
      { id: 4, label: "Food Hunt Leader", desc: "Supper is the main event" },
      { id: 5, label: "Designated Driver", desc: "The real MVP" }
    ]
  },
  {
    name: "Travel styles",
    roles: [
      { id: 1, label: "Budget Backpacker", desc: "$20/day champion" },
      { id: 2, label: "Luxury Seeker", desc: "5-star or bust" },
      { id: 3, label: "Staycation Pro", desc: "Home is the best destination" },
      { id: 4, label: "Adventure Junkie", desc: "Adrenaline addict" },
      { id: 5, label: "Planner Extraordinaire", desc: "Every minute scheduled" }
    ]
  },
  {
    name: "Social media personas",
    roles: [
      { id: 1, label: "Influencer Wannabe", desc: "Everything's content" },
      { id: 2, label: "Lurker Ghost", desc: "Never posts, always watches" },
      { id: 3, label: "Meme Lord", desc: "Reaction GIF expert" },
      { id: 4, label: "Oversharer", desc: "TMI is their middle name" },
      { id: 5, label: "Digital Detox", desc: "What's Instagram?" }
    ]
  },
  {
    name: "Shopping habits",
    roles: [
      { id: 1, label: "Impulse Buyer", desc: "Add to cart first, think later" },
      { id: 2, label: "Bargain Hunter", desc: "Never pays full price" },
      { id: 3, label: "Window Shopper", desc: "Looking is free" },
      { id: 4, label: "Hoarder", desc: "But I might need it someday" },
      { id: 5, label: "Minimalist", desc: "Do I really need this?" }
    ]
  },
  {
    name: "Morning types",
    roles: [
      { id: 1, label: "5am Warrior", desc: "Up before the sun" },
      { id: 2, label: "Snooze Button Champion", desc: "Ten more minutes..." },
      { id: 3, label: "Coffee Zombie", desc: "Don't talk to me yet" },
      { id: 4, label: "Breakfast Skipper", desc: "Sleep is more important" },
      { id: 5, label: "Morning Person", desc: "Annoyingly cheerful" }
    ]
  },
  {
    name: "Stress responders",
    roles: [
      { id: 1, label: "Panic Mode", desc: "Everything is on fire!" },
      { id: 2, label: "Ice Cold", desc: "Unshakeable calm" },
      { id: 3, label: "Stress Eater", desc: "Chocolate therapy" },
      { id: 4, label: "Exercise Maniac", desc: "Running from problems literally" },
      { id: 5, label: "Netflix Binger", desc: "Avoidance is key" }
    ]
  },
  {
    name: "Phone battery life",
    roles: [
      { id: 1, label: "Always 100%", desc: "Powerbank everywhere" },
      { id: 2, label: "Danger Zone Dweller", desc: "Lives at 3%" },
      { id: 3, label: "Charger Collector", desc: "Cable in every room" },
      { id: 4, label: "Airplane Mode Pro", desc: "Battery optimization expert" },
      { id: 5, label: "Dead by Noon", desc: "How is it dead already?" }
    ]
  }
];

// Generate 4-letter room code
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // No I, O to avoid confusion
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'controller.html'));
});

app.get('/host/:roomId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'host.html'));
});

app.get('/join', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'controller.html'));
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Create room
  socket.on('createRoom', () => {
    const roomId = generateRoomCode();
    rooms.set(roomId, {
      roomId,
      hostId: socket.id,
      players: [],
      currentPhase: 'lobby',
      currentCategory: null,
      categoryOptions: [],
      categoryVotes: {},
      assignments: {},
      results: {},
      currentRound: 0,
      totalRounds: 4,
      timer: null
    });
    
    socket.join(roomId);
    socket.emit('roomCreated', { roomId });
    console.log('Room created:', roomId);
  });

  // Rejoin as host (when redirected from controller page)
  socket.on('rejoinAsHost', ({ roomId: requestedRoomId }) => {
    let room = rooms.get(requestedRoomId);
    
    if (!room) {
      // Room doesn't exist, create it with this room ID
      console.log('Room not found, creating:', requestedRoomId);
      room = {
        roomId: requestedRoomId,
        hostId: socket.id,
        players: [],
        currentPhase: 'lobby',
        currentCategory: null,
        categoryOptions: [],
        categoryVotes: {},
        assignments: {},
        results: {},
        currentRound: 0,
        totalRounds: 4,
        timer: null
      };
      rooms.set(requestedRoomId, room);
    } else {
      // Room exists, update host ID
      console.log('Updating host for room:', requestedRoomId);
      room.hostId = socket.id;
    }
    
    socket.join(requestedRoomId);
    socket.emit('hostJoined', { 
      roomId: requestedRoomId,
      players: room.players 
    });
  });

  // Join room
  socket.on('joinRoom', ({ roomId, name, avatar }) => {
    const room = rooms.get(roomId.toUpperCase());
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    if (room.players.length >= 8) {
      socket.emit('error', { message: 'Room is full' });
      return;
    }

    if (room.currentPhase !== 'lobby') {
      socket.emit('error', { message: 'Game already started' });
      return;
    }

    const player = {
      id: socket.id,
      name: name || `Player ${room.players.length + 1}`,
      avatar: avatar || '😊',
      score: 0,
      earnedRoles: []
    };

    room.players.push(player);
    socket.join(roomId.toUpperCase());
    
    io.to(roomId.toUpperCase()).emit('playerJoined', { 
      player,
      players: room.players 
    });
    
    socket.emit('joinedRoom', { 
      roomId: roomId.toUpperCase(),
      player,
      players: room.players
    });

    console.log(`${name} joined room ${roomId}`);
  });

  // Start game
  socket.on('startGame', ({ roomId }) => {
    const room = rooms.get(roomId);
    
    if (!room || room.hostId !== socket.id) {
      socket.emit('error', { message: 'Not authorized' });
      return;
    }

    if (room.players.length < 2) {
      socket.emit('error', { message: 'Need at least 2 players' });
      return;
    }

    // Generate category options (mix of predefined and AI)
    const shuffled = [...PREDEFINED_CATEGORIES].sort(() => Math.random() - 0.5);
    room.categoryOptions = shuffled.slice(0, 5);
    room.currentPhase = 'category';
    room.categoryVotes = {};

    io.to(roomId).emit('gameStarted', { 
      phase: 'category',
      categoryOptions: room.categoryOptions
    });

    console.log('Game started in room:', roomId);
  });

  // Vote for category
  socket.on('voteCategory', ({ roomId, categoryIndex }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    room.categoryVotes[socket.id] = categoryIndex;

    // Check if all players voted
    if (Object.keys(room.categoryVotes).length === room.players.length) {
      // Count votes
      const counts = {};
      Object.values(room.categoryVotes).forEach(idx => {
        counts[idx] = (counts[idx] || 0) + 1;
      });

      // Find winner
      const winnerIndex = parseInt(Object.keys(counts).reduce((a, b) => 
        counts[a] > counts[b] ? a : b
      ));

      room.currentCategory = room.categoryOptions[winnerIndex];
      room.currentPhase = 'assign';
      room.assignments = {};
      room.categoryVotes = {};

      io.to(roomId).emit('categorySelected', {
        category: room.currentCategory,
        phase: 'assign'
      });

      // Start 60s timer
      setTimeout(() => {
        if (room.currentPhase === 'assign') {
          calculateResults(roomId);
        }
      }, 60000);
    } else {
      io.to(roomId).emit('categoryVoteUpdate', {
        voted: Object.keys(room.categoryVotes).length,
        total: room.players.length
      });
    }
  });

  // Submit assignments
  socket.on('submitAssignments', ({ roomId, assignments }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    room.assignments[socket.id] = assignments;

    // Check if all players submitted
    const submitted = Object.keys(room.assignments).length;
    io.to(roomId).emit('assignmentProgress', {
      submitted,
      total: room.players.length
    });

    if (submitted === room.players.length) {
      calculateResults(roomId);
    }
  });

  // Next round
  socket.on('nextRound', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room || room.hostId !== socket.id) return;

    room.currentRound++;

    if (room.currentRound >= room.totalRounds) {
      // Game over - show final summary
      generateFinalSummary(roomId);
    } else {
      // Next category vote
      const shuffled = [...PREDEFINED_CATEGORIES].sort(() => Math.random() - 0.5);
      room.categoryOptions = shuffled.slice(0, 5);
      room.currentPhase = 'category';
      room.categoryVotes = {};

      io.to(roomId).emit('gameStarted', { 
        phase: 'category',
        categoryOptions: room.categoryOptions,
        round: room.currentRound + 1
      });
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Remove player from rooms
    rooms.forEach((room, roomId) => {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      
      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
        io.to(roomId).emit('playerLeft', { 
          playerId: socket.id,
          players: room.players 
        });
      }

      // Delete room if host leaves or no players
      if (room.hostId === socket.id || room.players.length === 0) {
        rooms.delete(roomId);
        io.to(roomId).emit('roomClosed');
      }
    });
  });
});

// Calculate results from assignments
async function calculateResults(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  const results = {};
  const roleCounts = {};

  // Count votes for each role
  room.currentCategory.roles.forEach(role => {
    roleCounts[role.id] = {};
  });

  Object.entries(room.assignments).forEach(([voterId, assignments]) => {
    Object.entries(assignments).forEach(([playerId, roleId]) => {
      if (!roleCounts[roleId]) roleCounts[roleId] = {};
      roleCounts[roleId][playerId] = (roleCounts[roleId][playerId] || 0) + 1;
    });
  });

  // Find winners for each role
  for (const role of room.currentCategory.roles) {
    const counts = roleCounts[role.id];
    if (Object.keys(counts).length === 0) continue;

    const winnerId = Object.keys(counts).reduce((a, b) => 
      counts[a] > counts[b] ? a : b
    );

    const winner = room.players.find(p => p.id === winnerId);
    if (!winner) continue;

    // Award points (1 point per vote received)
    const points = counts[winnerId] || 0;
    winner.score += points;
    winner.earnedRoles.push(role.label);

    // Generate AI description
    const description = await describeWinner(winner.name, role.label);

    results[role.id] = {
      roleId: role.id,
      roleLabel: role.label,
      winnerId,
      winnerName: winner.name,
      winnerAvatar: winner.avatar,
      votes: counts[winnerId],
      description,
      voteCounts: counts
    };
  }

  room.results = results;
  room.currentPhase = 'reveal';

  io.to(roomId).emit('resultsReady', {
    results,
    players: room.players,
    phase: 'reveal'
  });
}

// Generate final summary
async function generateFinalSummary(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  room.currentPhase = 'summary';

  // Generate master titles for each player
  const summaries = [];
  for (const player of room.players) {
    const title = await finalTitle(player.name, player.earnedRoles);
    summaries.push({
      ...player,
      title
    });
  }

  // Sort by score
  summaries.sort((a, b) => b.score - a.score);

  io.to(roomId).emit('gameSummary', {
    summaries,
    phase: 'summary'
  });
}

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🎮 Personality Sorter running on port ${PORT}`);
});

// Export for Vercel
module.exports = app;
