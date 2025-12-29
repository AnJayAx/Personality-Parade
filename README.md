# 🎭 Personality Sorter

A multiplayer party game (like Jackbox Role Models) built with Node.js, Express, and Socket.IO. Players join via room codes and assign personality roles to each other!

## 🚀 Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Start the server
npm start
```

Open your browser:
- **Host screen**: http://localhost:3000 (laptop/tablet)
- **Player controllers**: http://localhost:3000 (mobile phones)

### Test With Multiple Devices

1. Start the server on your computer
2. Get your local IP address:
   - Windows: `ipconfig` (look for IPv4)
   - Mac/Linux: `ifconfig` (look for inet)
3. On phones, go to `http://YOUR-IP:3000`
4. Create room on host device, join with phones using room code

## 🎮 How to Play

1. **Create Room**: One player opens the app and creates a room → gets 4-letter code
2. **Join Room**: Other players (2-8 total) join with the room code on their phones
3. **Vote Category**: Everyone votes on a personality category (e.g., "Sports they'd crush")
4. **Assign Roles**: Each player assigns every role to someone (60 seconds)
5. **See Results**: Majority vote wins! AI generates funny descriptions
6. **Play 4 Rounds**: Repeat for 4 categories, highest score wins!

## 📁 Project Structure

```
personality-sorter/
├── server.js              # Express + Socket.IO server
├── ai.js                  # AI content generation (with fake mode)
├── package.json           # Dependencies
└── public/
    ├── host.html          # Host screen UI
    ├── host.js            # Host logic
    ├── controller.html    # Player controller UI
    └── controller.js      # Player controller logic
```

## 🔧 Features

✅ Room code system (4-letter codes)  
✅ 2-8 players per room  
✅ Real-time multiplayer with Socket.IO  
✅ 10 predefined categories with 4-6 roles each  
✅ Category voting system  
✅ 60-second assignment timer  
✅ Majority vote scoring  
✅ AI-generated descriptions (with fake mode for testing)  
✅ Final player titles and leaderboard  
✅ Mobile-first responsive design  
✅ Confetti animations  

## 🤖 AI Integration

The game includes AI-powered content generation:

- **Fake AI Mode** (default): Uses randomized templates for testing
- **Real AI Mode**: Connects to OpenAI API for custom descriptions

### Enable Real AI

1. Get an OpenAI API key from https://platform.openai.com/
2. Set environment variable:
   ```bash
   export OPENAI_API_KEY=your-api-key-here
   ```
3. In `ai.js`, change `USE_FAKE_AI` to `false`

AI generates:
- Funny 2-sentence descriptions for role winners
- Master titles based on roles won (e.g., "The Supreme Legend")

## 🌐 Deploy to Vercel

### ⚠️ Important: Vercel Limitations

**Vercel's serverless architecture has limitations with Socket.IO WebSocket connections.** For production use, consider these alternatives:

**Recommended hosting platforms:**
- **Railway** (https://railway.app) - Best for Socket.IO apps
- **Render** (https://render.com) - Great free tier
- **Heroku** - Classic choice for Node.js apps
- **DigitalOcean App Platform** - Reliable and affordable

These platforms support persistent WebSocket connections needed for real-time multiplayer.

### Deploy to Vercel (with polling fallback)

If you still want to use Vercel, the app will use HTTP polling as a fallback (slower but works):

**Option 1: Vercel CLI**
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Option 2: GitHub Integration

1. Push code to GitHub repository
2. Go to https://vercel.com
3. Click "Import Project" → Select your repo
4. Vercel auto-detects Node.js project
5. Deploy!

### Environment Variables (Optional)

In Vercel dashboard, add:
- `OPENAI_API_KEY`: Your OpenAI API key (if using real AI)

### Vercel Configuration

The project is already configured for Vercel:
- `package.json` includes `"main": "server.js"`
- Server exports `module.exports = app` for serverless
- Uses `process.env.PORT` for dynamic port assignment

## 🎨 Predefined Categories

1. **Sports they'd crush**: Football Star, Badminton Ace, Swimming Pro, etc.
2. **Office archetypes**: Chiongster, Chill One, Blur Sotong, The Boss, etc.
3. **Foodie types**: Hawker Hero, Fine Dining Snob, Instant Noodles King, etc.
4. **Night out vibes**: Party Animal, Early Bird, KTV King, etc.
5. **Travel styles**: Budget Backpacker, Luxury Seeker, Staycation Pro, etc.
6. **Social media personas**: Influencer Wannabe, Lurker Ghost, Meme Lord, etc.
7. **Shopping habits**: Impulse Buyer, Bargain Hunter, Window Shopper, etc.
8. **Morning types**: 5am Warrior, Snooze Button Champion, Coffee Zombie, etc.
9. **Stress responders**: Panic Mode, Ice Cold, Stress Eater, etc.
10. **Phone battery life**: Always 100%, Danger Zone Dweller, Dead by Noon, etc.

## 🔍 Testing

### Test Locally (Solo)

1. Open two browser windows
2. Window 1: Create room → becomes host
3. Window 2: Join room with code → becomes player
4. Use browser dev tools to simulate mobile (F12 → Device Toolbar)

### Test With Friends (LAN)

1. All devices on same WiFi network
2. Start server on one computer
3. Find your IP: `ipconfig` or `ifconfig`
4. Friends visit `http://YOUR-IP:3000`
5. Create room on one device, others join

## 📱 Device Recommendations

- **Host**: Laptop, desktop, or tablet (iPad works great)
- **Players**: Smartphones or tablets
- **Minimum**: 2 players (but 4-8 is most fun!)

## 🐛 Troubleshooting

**Players can't join room:**
- Check firewall settings (allow port 3000)
- Ensure all devices on same network
- Try using IP address instead of localhost

**Socket.IO connection errors:**
- Check CORS settings in `server.js`
- Ensure server is running (`npm start`)
- Verify no other app using port 3000

**AI descriptions not working:**
- Fake AI mode is enabled by default (works offline)
- For real AI, add OpenAI API key as environment variable
- Check `ai.js` logs for API errors

## 🛠️ Customization

### Add Custom Categories

Edit `PREDEFINED_CATEGORIES` in `server.js`:

```javascript
{
  name: "Your Category",
  roles: [
    { id: 1, label: "Role Name", desc: "Short description" },
    // Add 4-6 roles
  ]
}
```

### Change Timer Duration

In `server.js`, find the assignment timeout:

```javascript
setTimeout(() => {
  if (room.currentPhase === 'assign') {
    calculateResults(roomId);
  }
}, 60000); // Change 60000 to desired milliseconds
```

### Modify Scoring

Edit `calculateResults()` in `server.js`:

```javascript
const points = counts[winnerId] || 0; // Current: 1 point per vote
winner.score += points * 2; // Example: Double points
```

## 📦 Dependencies

- **express**: Web server framework
- **socket.io**: Real-time bidirectional communication
- **cors**: Enable cross-origin requests

## 🎯 Game Design Notes

- **Category voting** prevents stale categories and adds player agency
- **60-second timer** creates urgency and prevents overthinking
- **Majority vote** ensures consensus and makes results feel fair
- **AI descriptions** add personality and humor to results
- **4 rounds** balances playtime (~15-20 minutes total)
- **Score display** adds competitive element without being too serious

## 📜 License

MIT License - Feel free to modify and use for your parties!

## 🙌 Credits

Inspired by Jackbox Games' "Role Models" and other party games.

---

**Made with ❤️ for party game enthusiasts**

Ready to discover everyone's true personalities? 🎭✨
