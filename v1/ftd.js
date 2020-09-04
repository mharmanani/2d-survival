var port = process.argv[2];
if (!port) port = 10360;

var express = require('express');
var app = express();

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

app.use(express.static('static-content')); 

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
	var flag = 0;
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
	return;
});