export type PulseIdea = {
  id: string;
  text: string;
  votes: number;
};

let pulseIdeas: PulseIdea[] = [
  { id: '1', text: "Book Club: Discuss this month's bestseller", votes: 8 },
  { id: '2', text: "Hackathon: Build a community tool", votes: 12 },
  { id: '3', text: "Wellness Workshop: Mindfulness for all", votes: 5 }
];

export function getPulseIdeas() {
  return pulseIdeas.slice().sort((a, b) => b.votes - a.votes);
}

export function addPulseIdea(text: string) {
  const newIdea = { id: Date.now().toString(), text, votes: 1 };
  pulseIdeas.push(newIdea);
  return newIdea;
}

export function votePulseIdea(id: string) {
  const idea = pulseIdeas.find(i => i.id === id);
  if (idea) idea.votes += 1;
}