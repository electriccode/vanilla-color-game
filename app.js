var config = {
    totalTime: 30,
    colorList: [ "red","orange","gold","green","purple","blue","black","silver","magenta","brown","pink" ],
    winningPoints: 2,
    losingPoints: 1,
}

var util = {
    secondsToTime: function(seconds) {
        var minutes = this.zeroPad(parseInt(seconds / 60));
        var seconds = this.zeroPad(seconds % 60);
        return minutes + ":" + seconds;
    },
    zeroPad: function(integerVar) {
        return integerVar <= 10 ? "0" + integerVar : integerVar;
    },
};

var Game = {
    totalTime: config.totalTime,
    timeElapsed: 0,
    generateNextQuestion: function() {
        this.correct = Math.round(Math.random()) <= 0.5;
        var randomColor = this.generateRandomColor();
        document.querySelector('.color-name').textContent = randomColor;
        var colorTextNode = document.querySelector('.colored-text');
        var uselessRandomColor = this.generateRandomColor();
        colorTextNode.textContent = uselessRandomColor;
        if(!this.correct) {
            randomColor = this.generateRandomColor();
        }
        colorTextNode.style.color = randomColor;
    },
    generateRandomColor: function() {
        if(!this.colors) {
            this.colors = config.colorList;
        }
        var totalColors = this.colors.length;
        var randomColorIndex = Math.round(Math.random()*totalColors) % totalColors;
        return this.colors[randomColorIndex];
    },
    tick: function() {
        this.timeElapsed++;
        if(this.timeElapsed === this.totalTime) {
            this.end();
        }
        var timeElapsedString = util.secondsToTime(this.timeElapsed);
        document.querySelector('.time-spent').textContent = timeElapsedString;
        document.querySelector('.progress .done').style.width = ((this.timeElapsed * 100) / this.totalTime) + "%";
    },
    end: function() {
        clearInterval(this.timer);
        this.timeElapsed = 0;
        Leader.updateLeader({
            name: Player.name,
            score: Player.score,
        });
        Player.reset();
        ui.loadLeaderboard();
        ui.loadScore();
        ui.endSession();
        
    },
};

var Leader = {
    getAll: function() {
        var leaderboard = localStorage.getItem('leaderboard');
        return leaderboard ? JSON.parse(leaderboard) : [];
    },
    updateLeader: function(player) {
        var leaders = this.getAll();
        var leadersCount = leaders.length;
        if(leadersCount === 0) {
            leaders.push(player);
        } else {
            leaders.every(function(leader, index) {
                if(player.score >= leader.score) {
                    for(var i = leadersCount; i > index; i--) {
                        leaders[i] = leaders[i - 1];
                    }
                    leaders[index] = player;
                    return false;
                } else {
                    return true;
                }
            });
            if(leaders.length === leadersCount) {
                leaders.push(player);
            }
        }
        var leaderboard = JSON.stringify(leaders);
        localStorage.setItem('leaderboard', leaderboard);
    },
};

var Player = {
    winningPoints: config.winningPoints,
    losingPoints: config.losingPoints,
    score: 0,
    name: "",
    set: function(name) {
        this.name = name;
    },
    updateScore: function(points) {

    },
    win: function() {
        this.score += this.winningPoints;
    },
    lose: function() {
        this.score -= this.losingPoints;
    },
    reset: function() {
        this.score = 0;
        this.set("");
    },
};

var ui = {
    render: function() {
        this.bindRegisterEvents();
        this.loadLeaderboard();
    },
    loadLeaderboard: function() {
        var leaders = Leader.getAll();
        var playersNode = document.querySelector('.panel-leaderboard .players');
        playersNode.textContent = "";
        leaders.forEach(function(leader) {
            var playerNode = document.createElement("div");
            playerNode.classList.add('player');
            var playerNameNode = document.createElement("div");
            playerNameNode.classList.add('label');
            var textnode = document.createTextNode(leader.name); 
            playerNameNode.appendChild(textnode);
            var playerScoreNode = document.createElement("div");
            textnode = document.createTextNode(leader.score);
            playerScoreNode.appendChild(textnode);
            playerScoreNode.classList.add('score');
            playerNode.appendChild(playerNameNode);
            playerNode.appendChild(playerScoreNode);
            playersNode.appendChild(playerNode);
        });
    },
    bindRegisterEvents: function() {
        var self = this;
        document.forms['new-player'].addEventListener('submit', function(submitEvent) {
            var playerName = this.querySelector('[name=name]').value;
            Player.set(playerName);
            self.loadSession();
            self.setUpGame();
            submitEvent.preventDefault();
        });
    },
    setUpGame: function() {
        this.updateSessionUi();
        this.bindOptionEvents();
        Game.timer = setInterval(function() {
            Game.tick();
        }, 1000);
    },
    bindOptionEvents: function() {
        var self = this;
        document.querySelectorAll('[data-option]').forEach(function(node) {
            var option = node.attributes.item('data-option').value;
            node.addEventListener('click', function(clickEvent) {
                var answeredYes = option === "Y";
                var answeredNo = option === "N";
                answeredYes && self.highlightYes();
                answeredNo && self.highightNo();
                var answeredCorrectly = (Game.correct && answeredYes) || (!Game.correct && answeredNo);
                self.handleAnswerSubmit(answeredCorrectly);
                clickEvent.stopImmediatePropagation();
            });
        });
        document.addEventListener('keydown', function(keydownEvent) {
            if(keydownEvent.key === "ArrowLeft") {
                var answeredCorrectly = !Game.correct;
                self.highightNo();
                self.handleAnswerSubmit(answeredCorrectly);
            } else if(keydownEvent.key === "ArrowRight") {
                var answeredCorrectly = Game.correct;
                self.highlightYes();
                self.handleAnswerSubmit(answeredCorrectly);
            }
            keydownEvent.stopImmediatePropagation();
        });
    },
    handleAnswerSubmit: function(answeredCorrectly) {
        answeredCorrectly ? this.won() : this.lost();
        Game.generateNextQuestion();
    },
    highlightYes: function() {
        this.highlight(document.querySelector('[data-option=Y]'), 'highlight');
    },
    highightNo: function() {
        this.highlight(document.querySelector('[data-option=N]'), 'highlight');
    },
    highlight: function(button, cssClass) {
        button.classList.add(cssClass);
        setTimeout((function(button) {
            return function() {
                button.classList.remove(cssClass);
            }
        })(button), 500);
    },
    won: function() {
        Player.win();
        this.loadScore();
        this.highlight(document.querySelector('.screen'), 'highlight-won');
    },
    lost: function() {
        Player.lose();
        this.loadScore();
        this.highlight(document.querySelector('.screen'), 'highlight-lost');
    },
    updateSessionUi: function() {
        var totalTimeString = util.secondsToTime(Game.totalTime);
        document.querySelector('.time-total').textContent = totalTimeString;
        this.loadScore();
        Game.generateNextQuestion();
    },
    loadScore: function() {
        document.querySelector('.score .value').textContent = Player.score;
    },
    loadSession: function() {
        document.forms['new-player'].reset();
        document.querySelector('.panel-new-player').classList.add('hide');
        document.querySelector('.panel-game').classList.remove('hide');
    },
    endSession: function() {
        document.querySelector('.panel-new-player').classList.remove('hide');
        document.querySelector('.panel-game').classList.add('hide');
    },
    forceLogin: function() {
        document.querySelector('[name=name]').value = "Player Unknown";
        document.querySelector('[type=submit]').click();
    },
    addDOM: function(target) {
        target.innerHTML = '<div class="screen">\
        <div class="panel panel-game hide">\
            <div class="panel-title">\
                <span class="time">\
                    <span class="label">Time: </span>\
                    <span class="time-spent">00:00</span>\
                    <span class="separator">/</span>\
                    <span class="time-total">00:00</span>\
                </span>\
                <div class="score">\
                    <span class="label">Score: </span>\
                    <span class="value">0</span>\
                </div>\
            </div>\
            <div class="panel-body">\
                <div class="progress">\
                    <div class="done"></div>\
                </div>\
                <div class="game-question">\
                    <div class="card color-name">Blue</div>\
                    <div class="card colored-text">Red</div>\
                </div>\
                <div class="game-options">\
                    <button data-option="N">No</button>\
                    <button data-option="Y">Yes</button>\
                </div>\
            </div>\
        </div>\
        <div class="panel panel-new-player">\
            <div class="panel-title">New Player</div>\
            <div class="panel-body">\
                <form name="new-player">\
                    <input autocomplete="off" type="text" name="name" placeholder="Player name" required />\
                    <input type="submit" value="Start Game" class="button button-primary">\
                </form>\
            </div>\
            \
        </div>\
        <div class="panel panel-leaderboard">\
            <div class="panel-title">Highscores</div>\
            <div class="players">\
            </div>\
        </div>\
    </div>';
    }
};

document.addEventListener('DOMContentLoaded', function(event) {
    ui.addDOM(document.querySelector('.root'));
    ui.render();
});

