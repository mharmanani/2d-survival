var port = process.argv[2];
if (!port) port = 10360;

var express = require('express');
var app = express();

var WebSocketServer = require('ws').Server
   ,wss = new WebSocketServer({port: 10361});

var messages = [];
var clients = []; // keeps track of all clients

var positions = []; // stores actors each round

var users = []; // allocate space for 10 users
for (let el of Array(10)) users.push(null);

wss.on('close', function() {
    console.log('disconnected');
});

wss.broadcast = function(message){
	for (let ws of this.clients) { 
		ws.send(message); 
	}
}

wss.on('connection', function(ws) {
	clients.push(ws);
	var id = null;

	// Find space for the socket connection
	for (var i = 0; i < users.length; i ++) {
		if (users[i] == null) {
			id = i;
			users[i] = i;
			break;
		}
	}

	// No space found, allocate an extra slot
	if (id == null) {
		id = users.length;
		users.push(null);
	}

	// Assign the socket to a socket ID
	ws.send(JSON.stringify({
		status: 'assgn_id', 
		id: id
	}));

	ws.on('message', function(message) {
		/**
		 * The clients' response is encoded in a JSON file, stored in this variable.
		 * Contains fields such as: sock_id, usrid, status...
		 * 
		 */
		var data = JSON.parse(message);
		var sock_id = data.sock_id;

		// Client requqesting to login
		if (data.status == 'login') {
			
			/**
			 * Tell all clients to add an extra player to their stage.
			 */
			var res = JSON.stringify({
				sock_id: sock_id,
				status: 'new_user',
				usrid: data.info.usrid,
			});
			wss.broadcast(res);

			/**
			 * Determine whether the player is connecting for the first time.
			 */
			var isUserConnected = false;
			for (let u of users) {
				if (data.info.usrid == u) {
					isUserConnected = true;
					break;
				}
			}

			// If he is, give him a new slot and free the old one
			if (isUserConnected) {
				var j = users.indexOf(data.info.usrid);
				if (j != sock_id) {
					users[j] = null;
					users[sock_id] = data.info.usrid;
				}
			} else users[sock_id] = data.info.usrid; // otherwise, just give him a slot
			

			// keep track of the messages 
			messages.push(res);
		}

		/**
		 * add_user differs from new_user in that new_user prepares to synchronize
		 * the stage for the new player and add_user finally adds the player to every
		 * stage.
		 * This ensures that all clients have synchronized gameplay.
		 */
		if (data.status == 'add_user') {
			//for (let u of data.usrids) users.push(u);
			//data.usrids = users; 			
			wss.broadcast(JSON.stringify(data));
		}

		/**
		 * A request to move the player.
		 */
		if (data.status == 'move_player') {
			wss.broadcast(JSON.stringify(data));
		}

		/**
		 * Every time the stage calls step(), the server receives 
		 * the positions of all actors, and stores them here.
		 */
		if (data.status == 'step') {
			positions = data.positions;
		}

		/**
		 * Remove an actor from the stage.
		 * Update the array positions declared at the top.
		 */
		if (data.status == 'remove_actor') {
			positions[data.index] = null;
			data.positions = positions;
		}

		/**
		 * Creates new Pair objects to represent the actors to be spawned.
		 * Broadcasts them to each client so they can update their stage.
		 */
		if (data.status == 'spawn_actors') {
			for (let actor of data.actors) {
				var x=Math.floor(50+(Math.random()*data.width)); 
				var y=Math.floor((Math.random()*data.height)); 

				actor.x = x;
				actor.y = y;
			}
		}

		/**
		 * Creates new Pair objects to represent the obstacles to be spawned.
		 * Broadcasts them to each client so they can update their stage.
		 */
		if (data.status == 'spawn_obstacles') {
			for (let actor of data.obstacles) {
				var x=Math.floor(50+(Math.random()*data.width)); 
				var y=Math.floor((Math.random()*data.height)); 

				actor.x = x;
				actor.y = y;
			}
		}

		// kills a player
		if (data.status == 'player_dead') {
			users[data.sock_id] = null;
		}

		wss.broadcast(JSON.stringify(data));
	});
});


// http://www.sqlitetutorial.net/sqlite-nodejs/connect/
const sqlite3 = require('sqlite3').verbose();

// crypto for sha256 encryption
var crypto = require('crypto');
function hash (passwd) 
	{return crypto.createHash('sha256').update(passwd).digest('base64')};

// https://scotch.io/tutorials/use-expressjs-to-get-url-and-post-parameters
var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

// http://www.sqlitetutorial.net/sqlite-nodejs/connect/
// will create the db if it does not exist
var db = new sqlite3.Database('db/database.db', (err) => {
	if (err) console.error(err.message);
});

app.use('/', express.static('static-content')); 

app.get('/api/home/', (req, res) => {
	var result = {"status": "home"};
	res.json(result);
});

app.get('/api/play/', (req, res) => {
	var result = {"status": "play"};
	res.json(result);
});

app.get('/api/over/', (req, res) => {
	
	var usrid = req.query.usrid;
	var kills = req.query.kills;	
	var round = req.query.round;	

	var result = {};
	var sql = 'SELECT * FROM highscores WHERE usrid=?';
	db.get(sql, [usrid], (err, row) => {
		if (err) {
			res.status(403); 
			result["error"] = err.message;
			res.json(result);
		} else {
			if (row["bestRound"] < round) {
				var q = 'UPDATE highscores SET bestRound=? WHERE usrid=?';
				db.run(q, [round, usrid], (err, row) => {
					if (err) {
						res.status(401); 
						result["error"] = err.message;
						res.json(result);
					} else {
						result["usrid"] = usrid;
						result["round"] = round;
					} 
				});
			}
		}
	});

	sql = 'UPDATE playerStats SET num_kills=num_kills+? WHERE usrid=?';
	db.run(sql, [kills, usrid], (err, row) => {
		var result = {};
		if (err) {
			res.status(409); 
			result["error"] = err.message;
			res.json(result);
		} else {
			result["usrid"] = usrid;
			result["kills"] = kills;
		}
	});
	res.json(result);

});

app.get('/api/scores/', (req, res) => {
	let sql = 'SELECT * FROM highscores INNER JOIN playerStats ' +  
	'ON highscores.usrid=playerStats.usrid ORDER BY bestRound DESC';
	var scores = [];

	db.all(sql, [], (err, rows) => {
		var result = {};
		
  		if (err) {
			res.status(404); 
    		result["error"] = err.message;
  		} 

  		rows.forEach((row) => {
  			var data = {"usrid": row.usrid, "score": row.bestRound, "kills": row.num_kills};
  			scores.push(data);
  		});
  		result["scores"] = scores;
  		res.json(result);
  	});
});

app.get('/api/login/', (req, res) => {
	var usrid = req.query.usrid;
	var passwd = req.query.passwd;

	let findUser = 'SELECT * FROM users WHERE usrid=? AND password=?';
	db.get(findUser, [usrid, hash(passwd)], (err, row) => {
		var result = {};
		
  		if (err) {
			res.status(404); 
    		result["error"] = err.message;
  		} 

		if (row != null) {
			result["usrid"] = usrid;
			result["passwd"] = hash(passwd);
		} else {
			result["error"] = "Invalid credentials";
		}
		res.json(result);
	});
});

app.get('/api/register/',  (req, res) => {
	var result = {
		"status": "register"
	};
	res.json(result);
});

// Create an account 
app.get('/api/accounts/', (req, res) => {
	var usrid = req.query.usrid;
	var passwd = req.query.passwd;	
	var result = {};
	var sql = 'INSERT INTO users(usrid, password) VALUES (?,?);';

	if (passwd.length <= 8) {
		result["error"] = "Password must be at least 8 characters long!";
		res.json(result);
	}

	if ("error" in result) 
		return;

	db.run(sql, [usrid, hash(passwd)], (err, row) => {
		if (err) {
			res.status(409); 
			result["error"] = err.message;
		} else {
			result["usrid"] = usrid;
			result["passwd"] = hash(passwd);
			result["status"] = "credentials logged";
		}
	});

	sql = 'INSERT INTO highscores(usrid, bestRound) VALUES (?,0);';
	db.run(sql, [usrid], (err, row) => {
		if (err) {
			res.status(409); 
			result["error"] = err.message;
		} else {
			result["status"] = "highscores created";
		}
	});

	sql = 'INSERT INTO playerStats(usrid, num_kills) VALUES (?,0);';
	db.run(sql, [usrid], (err, row) => {
		if (err) {
			res.status(409); 
			result["error"] = err.message;
		} else {
			result["status"] = "playerStats created";
		}
	});
	res.json(result);
});

app.listen(port, () => {
	console.log("Listening on port " + port);
});

