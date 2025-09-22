class MovieTriviaGame {
    constructor() {
        this.gameState = {
            currentView: 'game',
            currentPhase: 'setup',
            currentRound: 0,
            teams: {
                A: { players: [], score: 0, lives: 3, atRisk: [] },
                B: { players: [], score: 0, lives: 3, atRisk: [] },
                C: { players: [], score: 0, lives: 3, atRisk: [] },
                D: { players: [], score: 0, lives: 3, atRisk: [] }
            },
            eliminatedPlayers: [],
            
            round1: {
                teamMovies: {
                    A: {},
                    B: {},
                    C: {},
                    D: {}
                },
                currentTeam: 'A',
                currentMovie: 0,
                currentFrame: 1,
                guessCount: 1,
                maxGuessesPerFrame: 4
            },
            
            round2: {
                images: [],
                currentImageIndex: 0,
                tiles: [],
                tilesRemaining: 16,
                buzzedTeam: null
            },
            
            round3: {
                movies: [],
                currentMovie: 0,
                currentTeam: 'A',
                currentPlayerIndex: 0
            }
        };
        
        // Folder structure will be dynamically detected
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadFromFolderStructure();
        this.switchView('game');
    }
    
    setupEventListeners() {
        // Team setup - dynamic player management
        this.setupTeamPlayerManagement();
        
        // Game events
        document.getElementById('start-game').addEventListener('click', () => this.startGame());
        document.getElementById('new-game').addEventListener('click', () => this.resetGame());
        
        // Round 1 events
        document.getElementById('correct-guess').addEventListener('click', () => this.handleRound1Guess(true));
        document.getElementById('wrong-guess').addEventListener('click', () => this.handleRound1Guess(false));
        document.getElementById('steal-attempt').addEventListener('click', () => this.handleSteal());
        document.getElementById('next-team-manual').addEventListener('click', () => this.nextMovie());
        document.getElementById('prev-team-manual').addEventListener('click', () => this.prevMovie());
        document.getElementById('view-answer').addEventListener('click', () => this.revealMovieName());
        document.getElementById('prev-frame').addEventListener('click', () => this.navigateFrame(-1));
        document.getElementById('next-frame').addEventListener('click', () => this.navigateFrame(1));
        
        // Round 2 events
        document.querySelectorAll('.team-answer-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleRound2Correct(e.target.dataset.team));
        });
        document.getElementById('round2-wrong-answer').addEventListener('click', () => this.handleRound2Wrong());
        document.getElementById('round2-view-answer').addEventListener('click', () => this.revealRound2MovieName());
        document.getElementById('round2-next-image').addEventListener('click', () => this.nextRound2Image());
        document.getElementById('round2-prev-image').addEventListener('click', () => this.prevRound2Image());
        
        // Round 3 events
        document.querySelectorAll('.round3-team-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleRound3Correct(e.target.dataset.team));
        });
        document.getElementById('round3-wrong-answer').addEventListener('click', () => this.handleRound3Wrong());
        document.getElementById('round3-view-answer').addEventListener('click', () => this.revealRound3MovieName());
        document.getElementById('next-keywords').addEventListener('click', () => this.nextKeywords());
        document.getElementById('prev-keywords').addEventListener('click', () => this.prevKeywords());
        
        // Popup events
        document.getElementById('close-scoreboard').addEventListener('click', () => this.closeScoreboard());
        document.getElementById('new-game-winner').addEventListener('click', () => this.resetGame());
    }
    
    switchView(view) {
        this.gameState.currentView = view;
        this.updateDisplay();
    }
    
    async loadFromFolderStructure() {
        document.getElementById('loading-status').textContent = 'Loading game data...';
        
        try {
            // Load Round 1 frames
            await this.loadRound1Frames();
            
            // Load Round 2 images
            await this.loadRound2Images();
            
            // Load Round 3 movies
            await this.loadRound3Movies();
            
            document.getElementById('loading-status').textContent = 'Game data loaded successfully!';
            setTimeout(() => {
                document.getElementById('loading-status').textContent = '';
            }, 3000);
            
        } catch (error) {
            console.error('Error loading game data:', error);
            document.getElementById('loading-status').textContent = 'Error loading game data';
        }
    }
    
    async loadRound1Frames() {
        const teams = ['A', 'B', 'C', 'D'];
        console.log('Loading Round 1 frames for teams:', teams);
        
        for (const teamLetter of teams) {
            const teamName = `Team ${teamLetter}`;
            console.log(`Loading frames for ${teamName}...`);
            
            try {
                // Dynamically discover movie folders for this team
                const movieFolders = await this.discoverMovieFolders(teamName);
                console.log(`${teamName} movie folders discovered:`, movieFolders);
                
                if (movieFolders.length === 0) {
                    console.warn(`No movie folders discovered for ${teamName}. Please check folder structure.`);
                    continue;
                }
                
                for (let movieIndex = 0; movieIndex < movieFolders.length; movieIndex++) {
                    const movieName = movieFolders[movieIndex];
                    const frames = [];
                    
                    // Load 4 frames for each movie
                    for (let frameNum = 1; frameNum <= 4; frameNum++) {
                        try {
                            // Try different image extensions
                            const extensions = ['png', 'jpg', 'jpeg', 'gif'];
                            let imagePath = null;
                            
                            for (const ext of extensions) {
                                const testPath = `Round 1/${teamName}/${movieName}/${frameNum}.${ext}`;
                                if (await this.checkImageExists(testPath)) {
                                    imagePath = testPath;
                                    break;
                                }
                            }
                            
                            if (imagePath) {
                                const frame = {
                                    id: `${teamLetter}_${movieIndex}_${frameNum}`,
                                    name: `${frameNum}.${imagePath.split('.').pop()}`,
                                    data: imagePath,
                                    title: movieName,
                                    frameNumber: frameNum,
                                    team: teamLetter,
                                    movie: movieIndex
                                };
                                frames.push(frame);
                            }
                        } catch (error) {
                            console.warn(`Could not load frame ${frameNum} for ${teamName} - ${movieName}`);
                        }
                    }
                    
                    // Store frames in game state
                    this.gameState.round1.teamMovies[teamLetter][movieName] = frames;
                }
            } catch (error) {
                console.error(`Error loading movies for ${teamName}:`, error);
            }
        }
    }
    
    async discoverMovieFolders(teamName) {
        // Try to dynamically discover movie folders by attempting to load manifest or common patterns
        const discoveredMovies = [];
        
        // First, try to load a manifest file for this team if it exists
        try {
            const manifestResponse = await fetch(`Round 1/${teamName}/movies.json`);
            if (manifestResponse.ok) {
                const manifest = await manifestResponse.json();
                return manifest.movies || [];
            }
        } catch (error) {
            // Manifest doesn't exist, continue with auto-discovery
        }
        
        // Try common movie folder naming patterns
        const commonMoviePatterns = [
            // Popular movies that might be used
            'Aavesham', 'Leo', 'Raanjhanaa', 'Dear Comrade', 'MS Dhoni - The Untold Story', 
            'Padmavat', 'Eega (Nan Ee)', 'Khabir Singh', 'Premam', 'Animal', 
            'Endhiran (Robot)', 'Soorarai potru', 'KGF', 'Pushpa', 'RRR', 'Baahubali',
            'Dangal', '3 Idiots', 'PK', 'Lagaan', 'Zindagi Na Milegi Dobara',
            'Queen', 'Andhadhun', 'Article 15', 'Pink', 'Tumhari Sulu',
            // Generic naming patterns
            'Movie1', 'Movie2', 'Movie3', 'Movie 1', 'Movie 2', 'Movie 3',
            'Film1', 'Film2', 'Film3', 'Film 1', 'Film 2', 'Film 3'
        ];
        
        // Test each pattern by trying to load the first frame
        for (const movieName of commonMoviePatterns) {
            const extensions = ['png', 'jpg', 'jpeg', 'gif'];
            let movieExists = false;
            
            for (const ext of extensions) {
                const testPath = `Round 1/${teamName}/${movieName}/1.${ext}`;
                if (await this.checkImageExists(testPath)) {
                    movieExists = true;
                    break;
                }
            }
            
            if (movieExists) {
                discoveredMovies.push(movieName);
                // Limit to 3 movies per team as per game rules
                if (discoveredMovies.length >= 3) {
                    break;
                }
            }
        }
        
        // If no movies found through auto-discovery, try numbered fallback
        if (discoveredMovies.length === 0) {
            for (let i = 1; i <= 3; i++) {
                const movieName = `Movie ${i}`;
                const extensions = ['png', 'jpg', 'jpeg', 'gif'];
                
                for (const ext of extensions) {
                    const testPath = `Round 1/${teamName}/${movieName}/1.${ext}`;
                    if (await this.checkImageExists(testPath)) {
                        discoveredMovies.push(movieName);
                        break;
                    }
                }
            }
        }
        
        return discoveredMovies;
    }
    
    async checkImageExists(imagePath) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = imagePath;
            
            // Timeout after 1 second
            setTimeout(() => resolve(false), 1000);
        });
    }
    
    async loadRound2Images() {
        const images = [];
        const teams = ['A', 'B', 'C', 'D'];
        
        // Load images from Round 2/Team X/ folder structure
        for (const teamLetter of teams) {
            const teamName = `Team ${teamLetter}`;
            
            // Try to discover movie images for this team in Round 2
            const movieImages = await this.discoverRound2Movies(teamName);
            images.push(...movieImages);
        }
        
        this.gameState.round2.images = images;
        console.log(`Loaded ${images.length} Round 2 images:`, images.map(img => img.name));
    }
    
    async discoverRound2Movies(teamName) {
        const images = [];
        
        // Try common movie names that might be in Round 2 for this team
        const moviePatterns = [
            // Common movie names that might be used in Round 2
            'Banglore Days', 'Ponniyin Selvan PSI', 'Salaar', 'Sita Ramam',
            'Vada Chennai', 'Vikram', 'RRR', 'Tamasha', 'KGF', 'Pushpa',
            'Baahubali', 'Dangal', '3 Idiots', 'PK', 'Lagaan', 'Queen',
            'Andhadhun', 'Article 15', 'Pink', 'Tumhari Sulu',
            // Generic patterns
            'Movie1', 'Movie2', 'Movie3', 'Movie 1', 'Movie 2', 'Movie 3'
        ];
        
        for (const movieName of moviePatterns) {
            const extensions = ['png', 'jpg', 'jpeg', 'gif'];
            let imageFound = false;
            
            for (const ext of extensions) {
                const imagePath = `Round 2/${teamName}/${movieName}.${ext}`;
                if (await this.checkImageExists(imagePath)) {
                    images.push({
                        id: `${teamName}_${movieName}.${ext}`,
                        name: `${movieName}.${ext}`,
                        data: imagePath,
                        title: movieName,
                        team: teamName
                    });
                    imageFound = true;
                    break;
                }
            }
            
            if (imageFound && images.length >= 3) break; // Limit per team
        }
        
        if (images.length === 0) {
            console.warn(`No Round 2 images found for ${teamName}`);
        }
        
        return images;
    }
    
    async loadRound3Movies() {
        console.log('Starting to load Round 3 movies...');
        console.log('Current location:', window.location.href);
        
        try {
            // Try multiple path formats for local file system
            const possiblePaths = [
                'IRound 3/movies.json',
                './Round 3/movies.json',
                'Round%203/movies.json',
                './Round%203/movies.json'
            ];
            
            for (const path of possiblePaths) {
                try {
                    console.log(`Trying path: ${path}`);
                    const response = await fetch(path);
                    console.log(`Path ${path} - Status:`, response.status, response.statusText);
                    
                    if (response.ok) {
                        const movies = await response.json();
                        this.gameState.round3.movies = movies;
                        console.log('Round 3 movies loaded successfully from:', path);
                        console.log('Movies loaded:', movies);
                        console.log('Number of movies loaded:', movies.length);
                        return; // Success, exit function
                    }
                } catch (pathError) {
                    console.log(`Path ${path} failed:`, pathError.message);
                }
            }
            
            // If all paths failed, throw an error to go to catch block
            throw new Error('All fetch paths failed');
        } catch (error) {
            console.error('Error loading movies.json:', error);
            console.log('This might be because you are opening the HTML file directly.');
            console.log('Try running a local web server or use the fallback data.');
            console.log('Loading fallback sample data...');
            this.gameState.round3.movies = [
  {
    "title": "The Shawshank Redemption",
    "keywords": [
      "prison",
      "corruptii coulon",
      "police brutality",
      "prison cell",
      "delinquent",
      "parole board",
      "prison escape",
      "wrongful imprisonment",
      "framed for murder",
      "1940s"
    ]
  },
  {
    "title": "The Dark Knight",
    "keywords": [
      "crime fighter",
      "secret identity",
      "anti hero",
      "scarecrow",
      "sadism",
      "chaos",
      "vigilante",
      "superhero",
      "based on comic",
      "tragic hero",
      "organized crime",
      "anti villain",
      "criminal mastermind",
      "district attorney",
      "super power",
      "super villain",
      "neo-noir"
    ]
  },
  {
    "title": "GoodFellas",
    "keywords": [
      "new york city",
      "prison",
      "based on novel or book",
      "florida",
      "1970s",
      "mass murder",
      "irish-american",
      "drug trafficking",
      "gangster",
      "biography",
      "based on true story",
      "murder",
      "organized crime",
      "gore",
      "mafia",
      "brooklyn, new york city",
      "crime epic",
      "tampa, florida"
    ]
  },
  {
    "title": "Parasite",
    "keywords": [
      "birthday party",
      "private lessons",
      "basement",
      "dark comedy",
      "con artist",
      "working class",
      "psychological thriller",
      "class differences",
      "housekeeper",
      "tutor",
      "family",
      "crime family",
      "unemployed",
      "wealthy family",
      "seoul, south korea"
    ]
  },
  {
    "title": "Fight Club",
    "keywords": [
      "based on novel or book",
      "support group",
      "dual identity",
      "nihilism",
      "fight",
      "rage and hate",
      "insomnia",
      "dystopia",
      "alter ego",
      "cult film",
      "split personality",
      "quitting a job",
      "dissociative identity disorder",
      "self destructiveness"
    ]
  },
  {
    "title": "Interstellar",
    "keywords": [
      "artificial intelligence",
      "nasa",
      "spacecraft",
      "expedition",
      "future",
      "wormhole",
      "space travel",
      "famine",
      "time travel",
      "black hole",
      "dystopia",
      "race against time",
      "quantum mechanics",
      "space",
      "rescue",
      "family relationships",
      "robot",
      "astronaut",
      "scientist",
      "single father",
      "farmer",
      "space station",
      "space adventure",
      "father daughter relationship"
    ]
  },
  {
    "title": "Five Feet Apart",
    "keywords": [
      "hospital",
      "teenagers",
      "forbidden love",
      "rules",
      "distance",
      "breathing",
      "nurse",
      "cystic fibrosis",
      "bucket list",
      "tragedy"
    ]
  },
  {
    "title": "Inception",
    "keywords": [
      "paris, france",
      "spy",
      "philosophy",
      "allegory",
      "dream",
      "kidnapping",
      "manipulation",
      "airplane",
      "virtual reality",
      "car crash",
      "heist",
      "rescue",
      "mission",
      "memory",
      "architecture",
      "los angeles, california",
      "dream world",
      "subconscious"
    ]
  }
];
            console.log('Fallback data loaded:', this.gameState.round3.movies);
        }
    }
    
    setupTeamPlayerManagement() {
        // Add event listeners for add/remove player buttons
        document.querySelectorAll('.add-player-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const teamTile = e.target.closest('.team-tile');
                const team = teamTile.dataset.team;
                this.addPlayerToTeam(team);
            });
        });
        
        // Prefill teams with specified names
        this.prefillTeamNames();
    }
    
    prefillTeamNames() {
        const prefilledTeams = {
            'A': [
                'John Samuel Jeyaraj',
                'Halith',
                'Anantha',
                'Pavithrah Manikandan'
            ],
            'B': [
                'Avinash Singh',
                'Mabasha R',
                'Gotham Abhishek Reddy',
                'Mugeshbabu A'
            ],
            'C': [
                'SakthiKumaran Selvakumar',
                'Ashok Muthupandi',
                'Sruthi',
                'Pravin R F'
            ],
            'D': [
                'Aravind',
                'Yogeshwari E',
                'Edson',
                'Catherine R'
            ]
        };
        
        // Clear existing players and add prefilled names
        Object.entries(prefilledTeams).forEach(([team, players]) => {
            // Clear existing players
            const teamTile = document.querySelector(`.team-tile[data-team="${team}"]`);
            const playersContainer = teamTile.querySelector('.team-players');
            playersContainer.innerHTML = '';
            
            // Add all prefilled players
            players.forEach((playerName) => {
                this.addPlayerToTeam(team, playerName);
            });
        });
    }
    
    addPlayerToTeam(team, playerName = '') {
        const teamTile = document.querySelector(`.team-tile[data-team="${team}"]`);
        const playersContainer = teamTile.querySelector('.team-players');
        const playerCount = playersContainer.children.length;
        
        const playerGroup = document.createElement('div');
        playerGroup.className = 'player-input-group flex gap-2';
        playerGroup.innerHTML = `
            <input type="text" placeholder="Player ${playerCount + 1}" value="${playerName}"
                   class="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            <button class="remove-player-btn text-red-600 hover:text-red-800 px-2 ${playerCount === 0 ? 'hidden' : ''}">×</button>
        `;
        
        // Add remove functionality
        const removeBtn = playerGroup.querySelector('.remove-player-btn');
        removeBtn.addEventListener('click', () => {
            this.removePlayerFromTeam(team, playerGroup);
        });
        
        playersContainer.appendChild(playerGroup);
        
        // Show remove button for first player if more than one player
        this.updateRemoveButtonsVisibility(team);
    }
    
    removePlayerFromTeam(team, playerGroup) {
        playerGroup.classList.add('removing');
        setTimeout(() => {
            playerGroup.remove();
            this.updatePlayerPlaceholders(team);
            this.updateRemoveButtonsVisibility(team);
        }, 300);
    }
    
    updatePlayerPlaceholders(team) {
        const teamTile = document.querySelector(`.team-tile[data-team="${team}"]`);
        const inputs = teamTile.querySelectorAll('.player-input-group input');
        inputs.forEach((input, index) => {
            input.placeholder = `Player ${index + 1}`;
        });
    }
    
    updateRemoveButtonsVisibility(team) {
        const teamTile = document.querySelector(`.team-tile[data-team="${team}"]`);
        const removeButtons = teamTile.querySelectorAll('.remove-player-btn');
        const playerCount = removeButtons.length;
        
        removeButtons.forEach(btn => {
            if (playerCount <= 1) {
                btn.classList.add('hidden');
            } else {
                btn.classList.remove('hidden');
            }
        });
    }
    
    // Frame reordering methods removed - frames are now loaded in correct order from folder structure
    
    // Game Flow Methods
    startGame() {
        console.log('Starting game...');
        this.collectTeamData();
        console.log('Team data collected:', this.gameState.teams);
        
        // Check if Round 1 data is loaded
        const hasRound1Data = Object.keys(this.gameState.round1.teamMovies).some(team => 
            Object.keys(this.gameState.round1.teamMovies[team]).length > 0
        );
        
        if (!hasRound1Data) {
            console.warn('Round 1 data not loaded yet. Game may not function properly.');
            this.showNotification('Loading game data... Please wait.', 'info');
            // Try to reload data
            this.loadFromFolderStructure().then(() => {
                this.startGameAfterDataLoaded();
            });
            return;
        }
        
        this.startGameAfterDataLoaded();
    }
    
    startGameAfterDataLoaded() {
        console.log('Starting game with data loaded...');
        this.gameState.currentPhase = 'round1';
        this.gameState.currentRound = 1;
        this.initializeRound1();
        this.updateDisplay();
    }
    
    collectTeamData() {
        ['A', 'B', 'C', 'D'].forEach(team => {
            const inputs = document.querySelectorAll(`.team-tile[data-team="${team}"] .player-input-group input`);
            this.gameState.teams[team].players = Array.from(inputs)
                .map(input => input.value.trim())
                .filter(name => name !== '');
        });
    }
    
    initializeRound1() {
        this.gameState.round1.currentTeam = 'A';
        this.gameState.round1.currentMovie = 0;
        this.gameState.round1.currentFrame = 1;
        this.gameState.round1.guessCount = 1;
        this.displayCurrentFrame();
        this.updateRound1UI();
    }
    
    displayCurrentFrame() {
        const { currentTeam, currentMovie, currentFrame } = this.gameState.round1;
        console.log(`Displaying frame - Team: ${currentTeam}, Movie: ${currentMovie}, Frame: ${currentFrame}`);
        
        const teamMovies = Object.keys(this.gameState.round1.teamMovies[currentTeam]);
        console.log(`Team ${currentTeam} movies:`, teamMovies);
        console.log(`Team movies data:`, this.gameState.round1.teamMovies[currentTeam]);
        
        if (teamMovies.length > currentMovie && currentMovie >= 0) {
            const movieName = teamMovies[currentMovie];
            const frames = this.gameState.round1.teamMovies[currentTeam][movieName];
            console.log(`Movie: ${movieName}, Frames:`, frames);
            
            if (frames && frames.length > 0 && frames[currentFrame - 1]) {
                const frame = frames[currentFrame - 1];
                document.getElementById('current-frame-img').src = frame.data;
                console.log(`Set frame image to: ${frame.data}`);
            } else {
                document.getElementById('current-frame-img').src = '';
                this.showNotification(`No frames found for Team ${currentTeam} Movie ${movieName}`, 'error');
                console.error(`No frames found - Team: ${currentTeam}, Movie: ${movieName}, Frame index: ${currentFrame - 1}`);
            }
        } else {
            // Check if we should move to round 2
            if (this.allTeamsCompleted()) {
                this.startRound2();
                return;
            }
            document.getElementById('current-frame-img').src = '';
            this.showNotification(`No movie found for Team ${currentTeam} at index ${currentMovie}`, 'error');
            console.error(`No movie found - Team: ${currentTeam}, Movie index: ${currentMovie}, Available movies: ${teamMovies.length}`);
        }
    }
    
    updateRound1UI() {
        const { currentTeam, currentMovie, currentFrame, guessCount } = this.gameState.round1;
        const teamMovies = Object.keys(this.gameState.round1.teamMovies[currentTeam]);
        const movieName = (teamMovies && teamMovies[currentMovie]) ? teamMovies[currentMovie] : 'Unknown';
        
        // Update all team displays
        document.getElementById('current-team').textContent = currentTeam;
        document.getElementById('current-team-control').textContent = currentTeam;
        document.getElementById('current-movie-number').textContent = `${currentMovie + 1}`;
        
        // Update frame counters
        document.getElementById('frame-counter').textContent = `Frame ${currentFrame} of 4`;
        document.getElementById('guess-counter').textContent = `Guess ${guessCount} of 4`;
        document.getElementById('current-frame-num').textContent = currentFrame;
        document.getElementById('control-frame-info').textContent = `Frame ${currentFrame}`;
        document.getElementById('control-guess-info').textContent = guessCount;
        
        // Update points display
        const points = [20, 15, 10, 5][currentFrame - 1] || 0;
        document.getElementById('points-for-guess').textContent = points;
        
        // Update navigation buttons
        document.getElementById('prev-frame').disabled = currentFrame <= 1;
        document.getElementById('next-frame').disabled = currentFrame >= 4;
    }
    
    navigateFrame(direction) {
        const newFrame = this.gameState.round1.currentFrame + direction;
        if (newFrame >= 1 && newFrame <= 4) {
            this.gameState.round1.currentFrame = newFrame;
            this.displayCurrentFrame();
            this.updateRound1UI();
        }
    }
    
    revealMovieName() {
        const { currentTeam, currentMovie } = this.gameState.round1;
        const teamMovies = Object.keys(this.gameState.round1.teamMovies[currentTeam]);
        const movieName = (teamMovies && teamMovies[currentMovie]) ? teamMovies[currentMovie] : 'Unknown Movie';
        
        document.getElementById('revealed-movie-name').textContent = movieName;
        document.getElementById('movie-name-reveal').classList.remove('hidden');
    }
    
    hideMovieName() {
        document.getElementById('movie-name-reveal').classList.add('hidden');
    }
    
    handleRound1Guess(correct) {
        const { currentTeam, currentFrame, guessCount } = this.gameState.round1;
        const points = [20, 15, 10, 5][currentFrame - 1] || 0;
        
        if (correct) {
            this.gameState.teams[currentTeam].score += points;
            this.showNotification(`Team ${currentTeam} scored ${points} points! Use "View Answer" to reveal movie name.`, 'success');
            // Don't auto-advance - let admin control the flow
        } else {
            // Wrong answer - deduct 5 points
            this.gameState.teams[currentTeam].score -= 5;
            this.showNotification(`Team ${currentTeam} got it wrong! -5 points. Use "View Answer" to reveal movie name.`, 'error');
            // Don't move to next team - admin controls the flow manually
        }
        
        this.updateDisplay();
    }
    
    handleSteal() {
        // Award 5 points to stealing team
        const stealingTeam = prompt('Which team is stealing? (A, B, C, D)');
        if (stealingTeam && stealingTeam.trim() !== '') {
            const teamLetter = stealingTeam.trim().toUpperCase();
            if (['A', 'B', 'C', 'D'].includes(teamLetter)) {
                this.gameState.teams[teamLetter].score += 5;
                this.showNotification(`Team ${teamLetter} stole and got 5 points! Use "View Answer" to reveal movie name.`, 'success');
                this.updateDisplay();
            } else {
                alert('Please enter a valid team letter (A, B, C, or D)');
            }
        }
    }
    
    nextMovie() {
        // Move to the next team for the same movie round
        const teams = ['A', 'B', 'C', 'D'];
        const currentTeamIndex = teams.indexOf(this.gameState.round1.currentTeam);
        
        if (currentTeamIndex < teams.length - 1) {
            // Move to next team for the same movie round
            this.gameState.round1.currentTeam = teams[currentTeamIndex + 1];
        } else {
            // All teams completed this movie round, move to next movie round
            this.gameState.round1.currentTeam = 'A';
            this.gameState.round1.currentMovie++;
            
            // Check if all movie rounds are completed
            if (this.gameState.round1.currentMovie >= 3) {
                this.startRound2();
                return;
            }
        }
        
        // Reset frame and guess count for new team/movie
        this.gameState.round1.currentFrame = 1;
        this.gameState.round1.guessCount = 1;
        
        // Hide movie name for new team/movie
        this.hideMovieName();
        
        this.displayCurrentFrame();
        this.updateRound1UI();
    }
    
    prevMovie() {
        // Move to the previous team for the same movie round
        const teams = ['A', 'B', 'C', 'D'];
        const currentTeamIndex = teams.indexOf(this.gameState.round1.currentTeam);
        
        if (currentTeamIndex > 0) {
            // Move to previous team for the same movie round
            this.gameState.round1.currentTeam = teams[currentTeamIndex - 1];
        } else {
            // At Team A, move to previous movie round
            if (this.gameState.round1.currentMovie > 0) {
                this.gameState.round1.currentTeam = 'D';
                this.gameState.round1.currentMovie--;
            } else {
                // Already at the beginning
                this.showNotification('Already at the beginning of Round 1', 'info');
                return;
            }
        }
        
        // Reset frame and guess count for new team/movie
        this.gameState.round1.currentFrame = 1;
        this.gameState.round1.guessCount = 1;
        
        // Hide movie name for new team/movie
        this.hideMovieName();
        
        this.displayCurrentFrame();
        this.updateRound1UI();
    }
    
    allTeamsCompleted() {
        // Check if all teams have completed all their movies
        const teams = ['A', 'B', 'C', 'D'];
        return this.gameState.round1.currentMovie >= 3 && 
               this.gameState.round1.currentTeam === 'D';
    }
    
    
    startRound2() {
        this.showScoreboard('Round 1 Complete!', () => {
            this.gameState.currentPhase = 'round2';
            this.gameState.currentRound = 2;
            this.initializeRound2();
            this.updateDisplay();
        });
    }
    
    initializeRound2() {
        this.gameState.round2.currentImageIndex = 0;
        this.displayRound2Image();
    }
    
    displayRound2Image() {
        const currentImage = this.gameState.round2.images[this.gameState.round2.currentImageIndex];
        
        if (currentImage) {
            document.getElementById('round2-current-image').src = currentImage.data;
            document.getElementById('round2-image-counter').textContent = 
                `Image ${this.gameState.round2.currentImageIndex + 1} of ${this.gameState.round2.images.length}`;
            this.hideRound2MovieName();
        } else {
            document.getElementById('round2-current-image').src = '';
            this.showNotification('No more images in Round 2', 'info');
        }
    }
    
    handleRound2Correct(team) {
        this.gameState.teams[team].score += 20;
        this.showNotification(`Team ${team} got it correct! +20 points`, 'success');
        this.updateDisplay();
    }
    
    handleRound2Wrong() {
        const wrongTeam = prompt('Which team gave the wrong answer? (A, B, C, D)');
        if (wrongTeam && wrongTeam.trim() !== '') {
            const teamLetter = wrongTeam.trim().toUpperCase();
            if (['A', 'B', 'C', 'D'].includes(teamLetter)) {
                this.gameState.teams[teamLetter].score -= 5;
                this.showNotification(`Team ${teamLetter} got it wrong! -5 points`, 'error');
                this.updateDisplay();
            } else {
                alert('Please enter a valid team letter (A, B, C, or D)');
            }
        }
    }
    
    revealRound2MovieName() {
        const currentImage = this.gameState.round2.images[this.gameState.round2.currentImageIndex];
        if (currentImage) {
            document.getElementById('round2-revealed-movie-name').textContent = currentImage.title;
            document.getElementById('round2-movie-reveal').classList.remove('hidden');
        }
    }
    
    hideRound2MovieName() {
        document.getElementById('round2-movie-reveal').classList.add('hidden');
    }
    
    nextRound2Image() {
        this.gameState.round2.currentImageIndex++;
        if (this.gameState.round2.currentImageIndex >= this.gameState.round2.images.length) {
            // All Round 2 images completed, move to Round 3
            this.startRound3();
        } else {
            this.displayRound2Image();
        }
    }
    
    prevRound2Image() {
        if (this.gameState.round2.currentImageIndex > 0) {
            this.gameState.round2.currentImageIndex--;
            this.displayRound2Image();
        } else {
            this.showNotification('Already at the first image', 'info');
        }
    }
    
    startRound3() {
        this.showScoreboard('Round 2 Complete!', () => {
            this.gameState.currentPhase = 'round3';
            this.gameState.currentRound = 3;
            this.initializeRound3();
            this.updateDisplay();
        });
    }
    
    initializeRound3() {
        // Reset team lives for round 3
        Object.keys(this.gameState.teams).forEach(team => {
            this.gameState.teams[team].lives = 3;
        });
        
        this.gameState.round3.currentMovie = 0;
        this.gameState.round3.currentTeam = 'A';
        this.gameState.round3.currentPlayerIndex = 0;
        this.displayCurrentKeywords();
    }
    
    displayCurrentKeywords() {
        const movie = this.gameState.round3.movies[this.gameState.round3.currentMovie];
        console.log('Current movie:', movie);
        console.log('All movies loaded:', this.gameState.round3.movies);
        
        if (movie && movie.keywords && Array.isArray(movie.keywords)) {
            // Display all keywords with better formatting
            console.log('Keywords to display:', movie.keywords);
            console.log('Number of keywords:', movie.keywords.length);
            
            // Create a more readable format with better spacing
            const keywordsHtml = movie.keywords
                .map(keyword => `<span class="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm mr-2 mb-2">${keyword}</span>`)
                .join('');
            
            document.getElementById('keywords-show').innerHTML = keywordsHtml;
            
            // Hide answer when showing new keywords
            this.hideRound3MovieName();
        } else {
            document.getElementById('keywords-show').innerHTML = '<span class="text-red-600">No keywords available</span>';
            console.warn('No movie or keywords found for current index:', this.gameState.round3.currentMovie);
        }
    }
    
    revealRound3MovieName() {
        const movie = this.gameState.round3.movies[this.gameState.round3.currentMovie];
        if (movie && movie.title) {
            document.getElementById('round3-revealed-movie-name').textContent = movie.title;
            document.getElementById('round3-movie-reveal').classList.remove('hidden');
        } else {
            document.getElementById('round3-revealed-movie-name').textContent = 'Unknown Movie';
            document.getElementById('round3-movie-reveal').classList.remove('hidden');
        }
    }
    
    hideRound3MovieName() {
        document.getElementById('round3-movie-reveal').classList.add('hidden');
    }
    
    handleRound3Correct(team) {
        this.gameState.teams[team].score += 20;
        this.showNotification(`Team ${team} got it correct! +20 points`, 'success');
        this.updateDisplay();
    }
    
    handleRound3Wrong() {
        const wrongTeam = prompt('Which team gave the wrong answer? (A, B, C, D)');
        if (wrongTeam && wrongTeam.trim() !== '') {
            const teamLetter = wrongTeam.trim().toUpperCase();
            if (['A', 'B', 'C', 'D'].includes(teamLetter)) {
                this.gameState.teams[teamLetter].score -= 5;
                this.showNotification(`Team ${teamLetter} got it wrong! -5 points`, 'error');
                this.updateDisplay();
            } else {
                alert('Please enter a valid team letter (A, B, C, or D)');
            }
        }
    }
    
    nextKeywords() {
        this.gameState.round3.currentMovie++;
        if (this.gameState.round3.currentMovie >= this.gameState.round3.movies.length) {
            this.endGame();
        } else {
            this.displayCurrentKeywords();
        }
    }
    
    prevKeywords() {
        if (this.gameState.round3.currentMovie > 0) {
            this.gameState.round3.currentMovie--;
            this.displayCurrentKeywords();
        } else {
            this.showNotification('Already at the first movie', 'info');
        }
    }
    
    showScoreboard(title, onContinue) {
        document.getElementById('scoreboard-title').textContent = title;
        
        // Generate scoreboard content
        const scores = Object.entries(this.gameState.teams)
            .map(([team, data]) => ({ team, score: data.score }))
            .sort((a, b) => b.score - a.score);
        
        const scoreboardHtml = scores.map(({team, score}, index) => {
            const position = index + 1;
            const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : '';
            return `
                <div class="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <span class="text-xl font-bold">${medal} Team ${team}</span>
                    <span class="text-2xl font-bold text-blue-600">${score} points</span>
                </div>
            `;
        }).join('');
        
        document.getElementById('scoreboard-content').innerHTML = scoreboardHtml;
        
        // Store the continue callback
        this.scoreboardCallback = onContinue;
        
        // Show popup with animation
        const popup = document.getElementById('scoreboard-popup');
        popup.classList.remove('hidden');
        setTimeout(() => {
            popup.querySelector('.bg-white').style.transform = 'scale(1)';
        }, 50);
    }
    
    closeScoreboard() {
        const popup = document.getElementById('scoreboard-popup');
        popup.querySelector('.bg-white').style.transform = 'scale(0)';
        setTimeout(() => {
            popup.classList.add('hidden');
            if (this.scoreboardCallback) {
                this.scoreboardCallback();
            }
        }, 500);
    }
    
    showWinnerAnnouncement() {
        const scores = Object.entries(this.gameState.teams)
            .map(([team, data]) => ({ team, score: data.score }))
            .sort((a, b) => b.score - a.score);
        
        const winner = scores[0];
        document.getElementById('winner-announcement').textContent = 
            `🎉 Team ${winner.team} Wins with ${winner.score} points! 🎉`;
        
        // Generate final scores
        const finalScoresHtml = scores.map(({team, score}, index) => {
            const position = index + 1;
            const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `${position}.`;
            const textColor = position === 1 ? 'text-yellow-600' : position === 2 ? 'text-gray-500' : position === 3 ? 'text-orange-600' : 'text-gray-700';
            return `
                <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span class="text-lg font-bold ${textColor}">${medal} Team ${team}</span>
                    <span class="text-xl font-bold ${textColor}">${score} points</span>
                </div>
            `;
        }).join('');
        
        document.getElementById('final-scores').innerHTML = finalScoresHtml;
        
        // Show popup with animation
        const popup = document.getElementById('winner-popup');
        popup.classList.remove('hidden');
        setTimeout(() => {
            popup.querySelector('.bg-white').style.transform = 'scale(1)';
        }, 50);
    }
    
    endGame() {
        this.showWinnerAnnouncement();
    }
    
    displayFinalResults() {
        const scores = Object.entries(this.gameState.teams)
            .map(([team, data]) => ({ team, score: data.score }))
            .sort((a, b) => b.score - a.score);
        
        const winningTeam = scores[0];
        document.getElementById('winning-team').innerHTML = `
            🏆 <strong>Team ${winningTeam.team} Wins!</strong><br>
            Score: ${winningTeam.score} points
        `;
        
        // Display individual achievements
        const individualsHtml = scores.map(({team, score}) => 
            `Team ${team}: ${score} points`
        ).join('<br>');
        
        document.getElementById('best-individuals').innerHTML = `
            <h3>Final Standings:</h3>
            ${individualsHtml}
        `;
    }
    
    updateActiveTeam(team) {
        document.querySelectorAll('.score-team').forEach(scoreTeam => {
            scoreTeam.classList.remove('active');
        });
        
        if (team) {
            document.querySelector(`.score-team[data-team="${team}"]`).classList.add('active');
        }
    }
    
    updateDisplay() {
        this.updateScoreboard();
        this.updateRoundIndicator();
        this.updatePhases();
    }
    
    updateScoreboard() {
        Object.entries(this.gameState.teams).forEach(([team, data]) => {
            const scoreElement = document.querySelector(`.score-team[data-team="${team}"] .score`);
            const livesElement = document.querySelector(`.score-team[data-team="${team}"] .lives`);
            const atRiskElement = document.querySelector(`.score-team[data-team="${team}"] .at-risk`);
            
            if (scoreElement) scoreElement.textContent = data.score;
            if (livesElement) livesElement.textContent = `Lives: ${data.lives}`;
            if (atRiskElement) {
                atRiskElement.textContent = data.atRisk.length > 0 ? 'At Risk!' : '';
            }
        });
        
        // Show scoreboard if game started
        if (this.gameState.currentPhase !== 'setup') {
            document.getElementById('scoreboard').classList.remove('hidden');
        }
    }
    
    updateRoundIndicator() {
        const roundNames = {
            setup: 'Setup',
            round1: 'Round 1: Frame Guess',
            round2: 'Round 2: The Reveal',
            round3: 'Round 3: Plot Keywords',
            final: 'Final Results'
        };
        
        document.getElementById('current-round').textContent = roundNames[this.gameState.currentPhase] || 'Game';
    }
    
    updatePhases() {
        // Hide all phases
        document.querySelectorAll('.game-phase').forEach(phase => {
            phase.classList.add('hidden');
        });
        
        // Show current phase
        const currentPhaseElement = document.getElementById(`${this.gameState.currentPhase}-phase`);
        if (currentPhaseElement) {
            currentPhaseElement.classList.remove('hidden');
        }
    }
    
    // Save/load methods removed - game data now loads automatically from folder structure
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg text-white z-50 transition-all duration-300 ${
            type === 'success' ? 'bg-green-600' : 
            type === 'error' ? 'bg-red-600' : 'bg-blue-600'
        }`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
    
    // loadGameData removed - data now loads from folder structure
    
    resetGame() {
        this.gameState = {
            currentView: 'game',
            currentPhase: 'setup',
            currentRound: 0,
            teams: {
                A: { players: [], score: 0, lives: 3, atRisk: [] },
                B: { players: [], score: 0, lives: 3, atRisk: [] },
                C: { players: [], score: 0, lives: 3, atRisk: [] },
                D: { players: [], score: 0, lives: 3, atRisk: [] }
            },
            eliminatedPlayers: [],
            
            round1: {
                teamMovies: this.gameState.round1.teamMovies, // Keep loaded content
                currentTeam: 'A',
                currentMovie: 0,
                currentFrame: 1,
                guessCount: 1,
                maxGuessesPerFrame: 4
            },
            
            round2: {
                images: this.gameState.round2.images, // Keep loaded content
                currentImageIndex: 0,
                tiles: [],
                tilesRemaining: 16,
                buzzedTeam: null
            },
            
            round3: {
                movies: this.gameState.round3.movies, // Keep loaded content
                currentMovie: 0,
                currentTeam: 'A',
                currentPlayerIndex: 0
            }
        };
        
        // Clear team inputs and reset to one player per team
        ['A', 'B', 'C', 'D'].forEach(team => {
            const teamTile = document.querySelector(`.team-tile[data-team="${team}"]`);
            if (teamTile) {
                const playersContainer = teamTile.querySelector('.team-players');
                playersContainer.innerHTML = '';
                this.addPlayerToTeam(team);
            }
        });
        
        this.updateDisplay();
    }
}

// Initialize the game when the page loads
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new MovieTriviaGame();
});