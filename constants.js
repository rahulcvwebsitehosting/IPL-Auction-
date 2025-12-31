// IPL Auction Simulator Constants
// We use a .js file to ensure it's natively importable by the Node.js server.

export const Role = {
  BAT: 'BATTER',
  BOWL: 'BOWLER',
  AR: 'ALL-ROUNDER',
  WK: 'WICKET-KEEPER'
};

export const TEAMS = [
  { id: 'CSK', name: 'Chennai Super Kings', shortName: 'CSK', color: '#FFFF35', secondaryColor: '#005CA8', logo: 'https://scores.iplt20.com/ipl-sdk/static/logos/CSK.png' },
  { id: 'MI', name: 'Mumbai Indians', shortName: 'MI', color: '#004BA0', secondaryColor: '#D1AB3E', logo: 'https://scores.iplt20.com/ipl-sdk/static/logos/MI.png' },
  { id: 'RCB', name: 'Royal Challengers Bengaluru', shortName: 'RCB', color: '#EC1C24', secondaryColor: '#2B2A29', logo: 'https://scores.iplt20.com/ipl-sdk/static/logos/RCB.png' },
  { id: 'KKR', name: 'Kolkata Knight Riders', shortName: 'KKR', color: '#3A225D', secondaryColor: '#F2D06B', logo: 'https://scores.iplt20.com/ipl-sdk/static/logos/KKR.png' },
  { id: 'DC', name: 'Delhi Capitals', shortName: 'DC', color: '#00008B', secondaryColor: '#EF1B23', logo: 'https://scores.iplt20.com/ipl-sdk/static/logos/DC.png' },
  { id: 'PBKS', name: 'Punjab Kings', shortName: 'PBKS', color: '#ED1B24', secondaryColor: '#D1D3D4', logo: 'https://scores.iplt20.com/ipl-sdk/static/logos/PBKS.png' },
  { id: 'RR', name: 'Rajasthan Royals', shortName: 'RR', color: '#EA1A85', secondaryColor: '#004B8C', logo: 'https://scores.iplt20.com/ipl-sdk/static/logos/RR.png' },
  { id: 'SRH', name: 'Sunrisers Hyderabad', shortName: 'SRH', color: '#F26522', secondaryColor: '#231F20', logo: 'https://scores.iplt20.com/ipl-sdk/static/logos/SRH.png' },
  { id: 'GT', name: 'Gujarat Titans', shortName: 'GT', color: '#1B2133', secondaryColor: '#B8975D', logo: 'https://scores.iplt20.com/ipl-sdk/static/logos/GT.png' },
  { id: 'LSG', name: 'Lucknow Super Giants', shortName: 'LSG', color: '#0057E2', secondaryColor: '#FF4D4D', logo: 'https://scores.iplt20.com/ipl-sdk/static/logos/LSG.png' },
];

export const INITIAL_PLAYER_POOL = [
  // BATTERS
  { id: 1, name: "Rohit Sharma", country: "India", role: Role.BAT, basePrice: 200, set: "BA1", overseas: false },
  { id: 2, name: "Virat Kohli", country: "India", role: Role.BAT, basePrice: 200, set: "BA1", overseas: false },
  { id: 3, name: "Travis Head", country: "Australia", role: Role.BAT, basePrice: 200, set: "BA1", overseas: true },
  { id: 4, name: "Shubman Gill", country: "India", role: Role.BAT, basePrice: 200, set: "BA1", overseas: false },
  { id: 5, name: "Devon Conway", country: "New Zealand", role: Role.BAT, basePrice: 200, set: "BA1", overseas: true },
  { id: 6, name: "David Warner", country: "Australia", role: Role.BAT, basePrice: 200, set: "BA1", overseas: true },
  { id: 7, name: "Yashasvi Jaiswal", country: "India", role: Role.BAT, basePrice: 150, set: "BA2", overseas: false },
  { id: 8, name: "Ruturaj Gaikwad", country: "India", role: Role.BAT, basePrice: 150, set: "BA2", overseas: false },
  { id: 9, name: "Suryakumar Yadav", country: "India", role: Role.BAT, basePrice: 200, set: "BA1", overseas: false },
  { id: 10, name: "Kane Williamson", country: "New Zealand", role: Role.BAT, basePrice: 200, set: "BA1", overseas: true },
  // ALL ROUNDERS
  { id: 11, name: "Hardik Pandya", country: "India", role: Role.AR, basePrice: 200, set: "AR1", overseas: false },
  { id: 12, name: "Ravindra Jadeja", country: "India", role: Role.AR, basePrice: 200, set: "AR1", overseas: false },
  { id: 13, name: "Rashid Khan", country: "Afghanistan", role: Role.AR, basePrice: 200, set: "AR1", overseas: true },
  { id: 14, name: "Glenn Maxwell", country: "Australia", role: Role.AR, basePrice: 200, set: "AR1", overseas: true },
  { id: 15, name: "Andre Russell", country: "West Indies", role: Role.AR, basePrice: 200, set: "AR1", overseas: true },
  // WICKET KEEPERS
  { id: 21, name: "Rishabh Pant", country: "India", role: Role.WK, basePrice: 200, set: "WK1", overseas: false },
  { id: 22, name: "Heinrich Klaasen", country: "South Africa", role: Role.WK, basePrice: 200, set: "WK1", overseas: true },
  { id: 23, name: "Jos Buttler", country: "England", role: Role.WK, basePrice: 200, set: "WK1", overseas: true },
  { id: 24, name: "KL Rahul", country: "India", role: Role.WK, basePrice: 200, set: "WK1", overseas: false },
  { id: 25, name: "Sanju Samson", country: "India", role: Role.WK, basePrice: 200, set: "WK1", overseas: false },
  // BOWLERS
  { id: 31, name: "Jasprit Bumrah", country: "India", role: Role.BOWL, basePrice: 200, set: "BO1", overseas: false },
  { id: 32, name: "Mitchell Starc", country: "Australia", role: Role.BOWL, basePrice: 200, set: "BO1", overseas: true },
  { id: 33, name: "Mohammed Shami", country: "India", role: Role.BOWL, basePrice: 200, set: "BO1", overseas: false },
  { id: 34, name: "Kagiso Rabada", country: "South Africa", role: Role.BOWL, basePrice: 200, set: "BO1", overseas: true },
  { id: 35, name: "Trent Boult", country: "New Zealand", role: Role.BOWL, basePrice: 200, set: "BO1", overseas: true },
];
