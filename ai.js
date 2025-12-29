// AI helper functions for generating content
// Set USE_FAKE_AI to true for testing without API key

const USE_FAKE_AI = true; // Change to false when you have an OpenAI API key
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'your-api-key-here';

// Fake responses for testing
const FAKE_DESCRIPTIONS = [
  "{name} is the undisputed champion of {role}! Everyone knows it, even if they won't admit it.",
  "If {role} was an Olympic sport, {name} would have a gold medal collection. Absolute legend.",
  "{name} was born for {role}. It's not even a competition at this point.",
  "The {role} energy radiates from {name} like a beacon. Impossible to miss.",
  "{name} embodies {role} so perfectly, it's almost suspicious. Natural talent or secret training?",
  "When it comes to {role}, {name} is in a league of their own. The rest of us are mere mortals.",
  "{name} + {role} = a match made in heaven. The stars aligned for this one.",
  "Scientists are studying {name} to understand the genetics of peak {role} performance."
];

const FAKE_TITLES = [
  "The Legend",
  "Supreme Champion",
  "Ultimate Boss",
  "Absolute Unit",
  "Peak Performance",
  "Living Legend",
  "The GOAT",
  "Unstoppable Force",
  "Master of All",
  "The Icon"
];

// Generate category suggestions
async function generateCategories() {
  if (USE_FAKE_AI) {
    return [
      {
        name: "Netflix habits",
        roles: [
          { id: 1, label: "Binge Master", desc: "One more episode turns into entire season" },
          { id: 2, label: "Series Quitter", desc: "Never finishes anything" },
          { id: 3, label: "Rewatcher", desc: "The Office for the 10th time" },
          { id: 4, label: "Documentary Nerd", desc: "Learning while relaxing" }
        ]
      },
      {
        name: "Text message styles",
        roles: [
          { id: 1, label: "Essay Writer", desc: "Paragraphs for days" },
          { id: 2, label: "One Word Responder", desc: "k" },
          { id: 3, label: "Emoji Overuser", desc: "😂😂😂💯🔥" },
          { id: 4, label: "Voice Note Person", desc: "Why type when you can talk?" }
        ]
      }
    ];
  }

  // Real OpenAI API call
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'user',
          content: 'Generate 5 funny Singapore-themed personality categories with 4-6 roles each. Return as JSON array with structure: [{name: string, roles: [{id: number, label: string, desc: string}]}]'
        }],
        temperature: 0.9
      })
    });

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.error('AI generation failed:', error);
    return [];
  }
}

// Generate funny description for role winner
async function describeWinner(playerName, roleLabel) {
  if (USE_FAKE_AI) {
    const template = FAKE_DESCRIPTIONS[Math.floor(Math.random() * FAKE_DESCRIPTIONS.length)];
    return template
      .replace('{name}', playerName)
      .replace('{role}', roleLabel);
  }

  // Real OpenAI API call
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'user',
          content: `Write a funny 2-sentence description for ${playerName} who won the "${roleLabel}" role. Keep it light, friendly, and playful - no mean teasing. Singapore English style welcome.`
        }],
        temperature: 0.8,
        max_tokens: 100
      })
    });

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('AI description failed:', error);
    return `${playerName} absolutely crushed it as ${roleLabel}! The people have spoken.`;
  }
}

// Generate master title for player based on roles won
async function finalTitle(playerName, rolesWon) {
  if (USE_FAKE_AI) {
    if (rolesWon.length === 0) return "The Participant";
    if (rolesWon.length >= 4) return FAKE_TITLES[0];
    return FAKE_TITLES[Math.floor(Math.random() * FAKE_TITLES.length)];
  }

  // Real OpenAI API call
  try {
    const rolesText = rolesWon.join(', ');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'user',
          content: `Create a funny 2-4 word master title for ${playerName} who won these roles: ${rolesText}. Make it catchy and memorable.`
        }],
        temperature: 0.9,
        max_tokens: 20
      })
    });

    const data = await response.json();
    return data.choices[0].message.content.trim().replace(/['"]/g, '');
  } catch (error) {
    console.error('AI title failed:', error);
    return rolesWon.length > 0 ? "The Legend" : "The Participant";
  }
}

module.exports = {
  generateCategories,
  describeWinner,
  finalTitle
};
