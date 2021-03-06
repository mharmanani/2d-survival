stage=null;
view = null;
interval=null;
spawnEvent = null;
alive=true;

/**
 * Metadata on each melee weapon available.
 * Includes damage and range + special tool to build.
 */
melee_range = {"axe":120, "sword":130, "fist":100, 
"ls_b": 150, "ls_r": 150, "ls_g": 150, "builder": 250};
melee_dmg = {"axe": 12, "sword": 10, "fist": 5,
"ls_b": 75, "ls_r": 75, "ls_g": 75, "builder": 0};

/**
 * Metadata on each gun available.
 * Includes damage and ammo.
 */
gunMap = {
	'm9':11, 'shotgun':8,
	'm16':33, 'r52s':45,
	'sniper':5, 'tmp':21,
	'm6a1':32, 'ray_gun': 9,
	'm60e4':256, '1887':6
};
gun_dmg = {
	'm9':7, 'shotgun':30,
	'm16':15, 'r52s':20,
	'sniper':50, 'tmp':20,
	'm6a1':35, 'ray_gun': 75,
	'm60e4':1, '1887':20
};


/**
 * Mobile API features.
 * Support for touch, motion, and orientation events is implemented below:
 */

/**
 * Returns the coordinates of a screen touch with respect to the 
 * canvas' bounding coordinates.
 * @return: Pair
 */
function getFingerPosition(stage, event) {
    var rect = stage.canvas.getBoundingClientRect();
    var x = event.touches[0].clientX - rect.left;
    var y = event.touches[0].clientY - rect.top;
    return new Pair(x, y);
}

/**
 * Determine how to move the player by checking if a button 
 * from the touchpad was pressed. 
 * 
 * @param {Pair} touch
 * @param {Player} player 
 */
function moveByTouch (touch, player) {
	// Move up
	if (Math.abs(touch.x - player.position.x) < 50 && touch.y <  player.position.y) {
		return {dx: 0, dy: -1};
	}

	// Move down
	if (Math.abs(touch.x - player.position.x) < 50 && touch.y >  player.position.y) {
		return {dx: 0, dy: 1};
	}

	// Move to the left
	if (touch.x < player.position.x  && Math.abs(touch.y - player.position.y) < 50) {
		return {dx: -1, dy: 0};
	}

	// Move to the right
	if (touch.x > player.position.x  && Math.abs(touch.y - player.position.y) < 50) {
		return {dx: 1, dy: 0};
	}

	// Do not move
	else return {dx: 0, dy: 0};
}

function computeMotion (event) {
	var touch = getFingerPosition(stage, event);

	// error checking
	if (!stage) return;
	if (!stage.getPlayer(USRID)) return;
	var player = stage.getPlayer(USRID);

	// get the player's current position
	var mvt = moveByTouch(touch, player);

	var dx = mvt.dx,
		dy = mvt.dy;

	if (dx == dy == 0) {
		/**
		 * If the player touches the screen too close to the player, 
		 * we check if there are any items nearby to pickup.
		 * This makes for a more intuitive playstyle on mobile.
		 */
		socket.send(JSON.stringify({
			status: 'action_key',
			key: 'f',
			usrid: USRID
		}));
	}
		
	// Tell the server to move the player
	var data = JSON.stringify({
		sock_id: SOCK_ID,
		usrid: USRID,
		status: 'move_player',
		dx: dx,
		dy: dy
	});
	socket.send(data);

}

function actionRotate (event) {
	var beta = event.beta;
	var gamma = event.gamma;

	/**
	 * Steer phone to the right.
	 */
	if (Math.round(beta) == 30) {
		//HealPlayer();
		socket.send(JSON.stringify({
			status: 'action_key',
			key: 'h',
			usrid: USRID
		}));
	}

	/**
	 * Steer phone to the left.
	 */
	if (Math.round(beta) == -30) {
		socket.send(JSON.stringify({
			status: 'action_key',
			key: 'r',
			usrid: USRID
		}));
		//Reload();		
	}

	/**
	 * Flip phone on its back.
	 */
	if (Math.round(gamma) == 0) {
		socket.send(JSON.stringify({
			status: 'action_key',
			key: 'x',
			usrid: USRID
		}));
		//SwapWeapons();		
	}

	/**
	 * Flip phone upside down.
	 */
	if (Math.round(gamma) == 30) {
		socket.send(JSON.stringify({
			status: 'action_key',
			key: 'b',
			usrid: USRID
		}));
		//SwapToBuilder();
	}
}

/**
 * Generates actors on the stage depending on the round.
 * Helper function for spawnActors.
 * @return: [zombies, skeletons, demons, crates]
 */
function actorGenerator(stage) {
	if (stage.round == 1) {
		return [3, 2 , 0, 5];
	} else if (stage.round < 6) {
		return [3, 2, 1, 6];
	} else if (stage.round < 15) {
		return [3, 1, 3, 7];
	} else {
		return [5, 3 , 3, 10];
	}
}

/**
 * Shades the extremities of the map.
 * Called whenever the round ends to shrink the stage.
 */
function shadeMap(stage) {
	socket.send(JSON.stringify({
		status: 'shade_map',
		round: stage.round
	}));
}

/**
 * Returns the coordinates of a mouse click.
 * @return: Pair
 */
function getCursorPosition(stage, event) {
    var rect = stage.canvas.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;
    return new Pair(x, y);
}

/**
 * Setup the stage, add the actors, initialize events.
 */
function setupGame() {
	// Setup the stage
	if (!stage) {
		if(!mobile) stage=new Stage(document.getElementById('stage'), 'Desktop');
		else stage=new Stage(document.getElementById('stage'), 'Mobile');
	}
	alive=true;

	$(document).ready(function() {
		// Add obstacles
		if (stage.players.length == 0) {
			spawnObstacles(stage);
		}

		// Parse coordinates when screen is clicked
		function processClick (e) {
			if (!stage) return;
			const pos = getCursorPosition(stage, e);
			processCoordinates(pos, 'click');
		}

		// Parse coordinates when screen is touched
		function processTouch (e) {
			if (!stage) return;
			const pos = getFingerPosition(stage, e);
			processCoordinates(pos, 'touch');
		}

		/**
		 * Initialize click/touch events.
		 * We differentiate with 'mode'.
		 * 
		 * @param {Pair} pos 
		 * @param {Strings} mode (touch/click)
		 */
		function processCoordinates (pos, mode) {
			for (var x=0; x < stage.players.length; x++) {
				player = stage.players[x];
				if (!player) continue;
				if (!(player.wpn.sprite in melee_range)) {
					if (mode == 'click') {
						/**
						 * Tell the server which player is shooting.
						 * It will then reflect that change across all clients.
						 */
						socket.send(JSON.stringify({
							usrid: USRID,
							status: 'shoot',
						}));
					}
					return;
				}

				if (player.wpn.sprite == "builder") {
					/**
					 * Tell the server which player is building.
					 * It will then reflect that change across all clients.
					 */
					socket.send(JSON.stringify({
						usrid: USRID,
						status: 'build',
						position: pos
					}));
					return;
				}

				stage.actors.forEach(actor => {
					if (!actor) return;
					if (dist(pos, actor.position) < 25 && actor != player) {
						if (player.wpn.sprite in melee_range) {
							if (dist(player.position, actor.position) <= melee_range[player.wpn.sprite]) {
								//player.addMaterial(actor);
								socket.send(JSON.stringify({
									usrid: USRID,
									status: 'add_material',
									index: stage.actors.indexOf(actor)
								}));
								//actor.hp -= player.wpn.dmg;	
								socket.send(JSON.stringify({
									usrid: USRID,
									status: 'actor_damage',
									index: stage.actors.indexOf(actor),
									dmg: player.wpn.dmg
								})); 
							} 
						} 
					}
				});
			}
		}

		// Initialize click & touch events
		document.getElementById("stage").addEventListener('click', processClick);
		document.getElementById("stage").addEventListener('touchstart', processTouch);
	});

	// Initialize keyboard events
	document.addEventListener('keydown', moveByKey);
	document.addEventListener('keydown', actionKey);

	// Initialize touch events
	document.getElementById("stage").addEventListener('touchstart', computeMotion);

	// Initalize orientation, gyroscope, acceleromter
	window.addEventListener('deviceorientation', actionRotate);


	/**
	 * Lets the player shoot from a fully automatic weapon.
	 * @param {Event} e
	 */
	function autoShoot(e) {
		if (e.key != " ") return;

		const pos = getCursorPosition(stage, e);

		if (!(stage.getPlayer(USRID).wpn.sprite in melee_range)) {

			switch(stage.getPlayer(USRID).wpn.sprite) {
				case 'm9': return;
				case 'sniper': return;
				case 'shotgun': return;
				case 'ray_gun': return;
				default: break;
			}

			socket.send(JSON.stringify({
				status: 'shoot',
				usrid: USRID,
				position: pos
			}));

			//stage.players[SOCK_ID].wpn.shoot(pos);
			//stage.getPlayer(USRID).wpn.shoot(pos);
			return;
		}
	}

	// Add listeners for autoShoot on the spacebar
	document.addEventListener('keydown', autoShoot);
	document.addEventListener('keypress', autoShoot);

	return stage;
}

/**
 * Spawn obstacles on the stage.
 * Obstacle spawning is different for each player to ensure that each of them have
 * enough resources to build.
 * @param {Stage} stage
 */
function spawnObstacles(stage) {
	var total=5+2*stage.round;
	var obstacles = [];
	while(total>0){
		var x=Math.floor(50+(Math.random()*stage.width)); 
		var y=Math.floor((Math.random()*stage.height)); 
		if(stage.getActor(x,y)===null){
			var position = {
				x: 0,
				y: 0
			};
			//var t = new Tombstone(stage, position, new Pair(0, 0), 'rgba(0,50,0,50)', 5);
			//stage.addActor(t); 
			obstacles.push(position);
			total--;
		}
	}
	socket.send(JSON.stringify({
		width: stage.width,
		height: stage.height,
		status: "spawn_obstacles",
		obstacles: obstacles
	}));
}

/**
 * Spawn actors on the stage.
 * @param {Stage} stage
 */
function spawnActors(stage) {
	
	// Call the actor generator helper
	var actorMap = actorGenerator(stage);
	var actorList = [];

	// Spawn the generated amount of zombies
	while(actorMap[0]>0){
		/*var x=Math.floor(50+(Math.random()*stage.width)); 
		var y=Math.floor((Math.random()*stage.height)); 
		var dx = directions[Math.floor((Math.random()*2))]; 
		var dy = directions[Math.floor((Math.random()*2))]; */
		if(stage.getActor(x,y)===null){
			var position = new Pair(x,y);
			//var z=new Zombie(stage, position, new Pair(4, 4), 'rgba(0,50,0,50)', 5); 
			//stage.addActor(z);
			actorList.push({
				sprite: 'zombie'
			});
			actorMap[0]--;
		}
	}

	// Spawn the generated amount of skeletons
	while(actorMap[1]>0){
		var x=Math.floor(50+(Math.random()*stage.width)); 
		var y=Math.floor((Math.random()*stage.height)); 
		if(stage.getActor(x,y)===null){
			var position = new Pair(x,y);
			//stage.addActor(new Skeleton(stage, position, new Pair(8, 8), 'rgba(0,50,0,50)', 5));
			actorList.push({
				sprite: 'skeleton',
			});
			actorMap[1]--;
		}
	}

	// Spawn the generated amount of demons
	while(actorMap[2]>0){
		var x=Math.floor(50+(Math.random()*stage.width)); 
		var y=Math.floor((Math.random()*stage.height)); 
		if(stage.getActor(x,y)===null){
			var position = new Pair(x,y);
			//stage.addActor(new Demon(stage, position, new Pair(3, 3), 'rgba(0,50,0,50)', 5));
			actorList.push({
				sprite: 'demon',
			});
			actorMap[2]--;
		}
	}

	// Spawn the generated amount of crates
	while(actorMap[3]>0){
		x=Math.floor((Math.random()*stage.width)); 
		y=Math.floor((Math.random()*stage.height)); 
		if(stage.getActor(x,y)===null){
			position = new Pair(x,y);
			//var c = new Crate(stage, position, new Pair(0, 0), 'rgba(0,50,0,50)', 5);
			//stage.addActor(c); 
			actorList.push({
				sprite: 'crate'
			});
			actorMap[3]--;
		}
	}

	socket.send(JSON.stringify({
		round: stage.round,
		status: 'spawn_actors',
		width: stage.width,
		height: stage.height,
		actors: actorList
	}));
}

/**
 * Start the game. 
 * Sets interval events to draw the map, spawn actors/obstacles,
 * increment the round, etc...
 */
function startGame() {

	if (!stage) return;

	interval = setInterval(
		function() { 

			var positions = [];
			for (let actor of stage.actors) {
				if (!actor) {
					var pos = {
						x: -5000,
						y: -5000,
					}
				}
				else var pos = {
					sprite: actor.sprite,
					x: actor.position.x,
					y: actor.position.y
				}
				//console.log(actor);
				positions.push(pos);
			}

			if (alive) 
				socket.send(JSON.stringify({
					sock_id: SOCK_ID,
					status: 'step',
					positions: JSON.stringify(positions)
				}));
		}, 20);

	spawnEvent = setInterval(
		function() {
			if (stage.enemies != 0) 
				return;
			shadeMap(stage);
			stage.round ++;
			spawnActors(stage);
			spawnObstacles(stage);
		}, 60000
	);

	isPlayerAlive = setInterval (
		function() { 
			for (let player of stage.players) {
				if (!player) continue;
				if (player.hp <= 0) {
					if (alive) socket.send(JSON.stringify({
						status: "player_dead",
						sock_id: SOCK_ID,
						id: player._id
					}));
				}
			}
		}, 
	20);

	tapEvent = setInterval (
		() => {
			taps = 0;
		},
	180);

}

/**
 * Pauses the game;
 */
function pauseGame(){
	clearInterval(interval);
	interval=null;
}

/**
 * Allows the player to move via the WASD keys.
 * @param event: key event
 */
function moveByKey(event) {
	var key = event.key;
	if (!stage) return;

	var moveMap = { 
		'a': { "dx": -1, "dy": 0},
		's': { "dx": 0, "dy": 1},
		'd': { "dx": 1, "dy": 0},
		'w': { "dx": 0, "dy": -1}
	};

	if (stage.players.length <= SOCK_ID) {
		return;
	}

	if (event.key in moveMap) {
		var data = JSON.stringify({
			sock_id: SOCK_ID,
			usrid: USRID,
			status: 'move_player',
			dx: moveMap[key].dx,
			dy: moveMap[key].dy
		});
		socket.send(data);
		//stage.players[SOCK_ID].move(stage.players[SOCK_ID], moveMap[key].dx, moveMap[key].dy);
		stage.draw();
	}
}

/**
 * Allows the player to execute certain actions, outlined below:
 * r: Reload weapon
 * x: Swap weapons
 * z: Switch into melee
 * f: Pickup item
 * v: Toss current weapon
 * h: Use a medkit to heal
 * 
 * @param event: key event
 * @returns {null}
 */

/**
 * Various player actions implemented below.
 * These functions will be used in the actionKey function as well as
 * the functions written for mobile.
 * @param {String} id: the player's user id
 */

function Reload(id) { // Reload
	if (!(stage.getPlayer(id).wpn.sprite in gunMap)) return;
	var ammo = gunMap[stage.getPlayer(id).wpn.sprite];

	if (stage.getPlayer(id).wpn.cap == 0) return;

	if (stage.getPlayer(id).wpn.cap < ammo) {
		stage.getPlayer(id).wpn.mag += stage.getPlayer(id).wpn.cap;
		stage.getPlayer(id).wpn.cap = 0;
	}

	if (stage.getPlayer(id).wpn.mag == 0) {
		stage.getPlayer(id).wpn.mag = ammo;
		stage.getPlayer(id).wpn.cap = Math.max(stage.getPlayer(id).wpn.cap - ammo, 0);
	}

	else {
		stage.getPlayer(id).wpn.cap = Math.max(stage.getPlayer(id).wpn.cap - (ammo-stage.getPlayer(id).wpn.mag), 0);
		stage.getPlayer(id).wpn.mag += (ammo - stage.getPlayer(id).wpn.mag);
	}
}

function SwapWeapons (id) { // Swap weapon
	next = (stage.getPlayer(id).eqp+1)%2;
	if (stage.getPlayer(id).weapons[next] != null) {
		stage.getPlayer(id).eqp = next;
		stage.getPlayer(id).wpn = stage.getPlayer(id).weapons[next];
		stage.getPlayer(id).draw(stage.context);
	}
}

function Pickup (id)  { // Pickup item
	for (var i = 1; i < stage.actors.length; i ++) {
		if (stage.getPlayer(id).overlap(stage.actors[i])) {
			if (stage.getPlayer(id).wpn.sprite in melee_range || 
				stage.getPlayer(id).wpn.sprite in gunMap) {
				var retval = acquireLoot(stage.getPlayer(id), stage.actors[i]);
				var data = JSON.stringify({
					usrid: USRID,
					status: "update_inventory",
					sprite: stage.actors[i].sprite
				});
				socket.send(data);
				if (retval == 0) {
					//stage.removeActor(stage.actors[i]);
					data = JSON.stringify({
						index: i,
						status: "remove_actor",
					});
					socket.send(data);
				}
			}
		}
	} 
}

function SwapToMelee (id) { // Swap to melee weapon
	stage.getPlayer(id).wpn = stage.getPlayer(id).melee;
}

function DropWeapon (id) { // Drop weapon
	if (stage.getPlayer(id).eqp == 0) {
		stage.getPlayer(id).weapons[0] = stage.getPlayer(id).melee;
		stage.getPlayer(id).wpn = stage.getPlayer(id).weapons[0];
	}
	if (stage.getPlayer(id).eqp == 1) {
		stage.getPlayer(id).eqp = 0;
		stage.getPlayer(id).wpn = stage.getPlayer(id).weapons[0];
		stage.getPlayer(id).weapons[1] = null;
	}
	stage.drawUI();
}

function HealPlayer(id) {
	for (var i = 0; i < 5; i ++) {
		if (stage.getPlayer(id).inventory[i] == null) continue;
		if (stage.getPlayer(id).inventory[i] == 'medkit') {
			stage.getPlayer(id).hp = 100;
			stage.getPlayer(id).inventory[i] = null;
			break;
		}
	}
}

function SwapToBuilder (id) {
	if (stage.getPlayer(id).wpn.sprite == 'builder')
	stage.getPlayer(id).wpn = stage.getPlayer(id).weapons[0];
	else stage.getPlayer(id).wpn = new Weapon(stage.getPlayer(id), 0, 0, "builder");
}

/**
 * Handles any keyboard input for the Desktop version of the game.
 * @param {event} 
 */
function actionKey(event) {
	var actionMap = { // Key to function map
		'r': Reload , 
		'x': SwapWeapons ,
		'f': Pickup, 
		'z': SwapToMelee , 
		'v': DropWeapon ,
		'h': HealPlayer ,
		'b': SwapToBuilder, 

		']': function() {
			homepage();
			showLogin();
		}
	}

	if (event.key in actionMap) {
		socket.send(JSON.stringify({
			status: 'action_key',
			usrid: USRID,
			key: event.key
		}));
		//actionMap[event.key]();
	}
}

/**
 * Builds a 2D array to represent the graphical component
 * of the stage's map. 
 * Allows Canvas to draw on the map, and the user to interact 
 * with the environment.
 * 
 * @param {int} x 
 * @param {int} y 
 * @return {array[x][y]}
 */
function buildMap(x, y) {
	var i = 0;
	map = [];
	while (i < x){
		var j = 0;
		row = [];
		while (j < y) {
			row.push(Math.round(Math.random()*3));
			j ++;
		}
		map.push(row);
		i ++;
	}
	return map;
}

/**
 * Generates a probability distribution to determine which weapon
 * to spawn from a broken crate. 
 * More powerful items get more probable as the rounds progress.
 * 
 * @returns {string}
 */
function genWpnDist() {
	var j = null;
	if (stage.round < 7) j = Math.round(Math.random()*150);	
	else j = Math.round(Math.random()*180);

	if (j <= 20) return 'm9';
	if (j <= 40) {
		var k = Math.round(Math.random()*1);
		if (k == 0) return 'shotgun';
		if (k == 1) return '1887';
	}
	if (j <= 60) return 'm16';
	if (j <= 70) return 'r52s';
	if (j <= 80) return 'sniper';
	if (j <= 100) return 'tmp';
	if (j <= 120) return 'sword';
	if (j <= 130) return 'm6a1';
	if (j <= 150) return 'axe'; 
	if (j <= 155) return 'ray_gun'; 
	if (j <= 160) {
		var color = Math.round(Math.random()*2);
		if (color == 0) return 'ls_b';
		if (color == 1) return 'ls_r';
		if (color == 2) return 'ls_g';
	}
	if (j <= 180) return 'm60e4'; 
}

/**
 * Generates a probability distribution to determine which item
 * to spawn from a broken crate. 
 * More powerful items get more probable as the rounds progress.
 * Uses the genWpnDist() function from above.
 * 
 * @returns {string}
 */
function crateLootProbGen() {
	var i = null;
	if (stage.round < 10) i = Math.round(Math.random()*60);	
	else j = Math.round(Math.random()*65);

	if (i < 20) {
		return genWpnDist();
	} else if (i <= 30) return 'medkit';
	else if (i <= 40) return 'vest';
	else if (i <= 60) return 'ammo';
	else if (i <= 65) return 'nuke';
}

/**
 * Equips the Player with a gun.
 * It has 'ammo' rounds in the mag, and a spare cartridge of 'ammoCap'.
 * @param {Player} player 
 * @param {int} ammo 
 * @param {int} ammoCap 
 * @param {Loot} wpn 
 */
function equipWpn(player, ammo, ammoCap, wpn) {
	if (player.weapons[0].sprite == player.melee.sprite) {
		player.weapons[0] = new Weapon(player, ammo, ammoCap, wpn.sprite);
		player.weapons[1] = new Weapon(player, 0, 0, player.melee.sprite);
		player.wpn = player.weapons[0];
		return;
	} else {
		if (player.weapons[1] == null || player.weapons[1].sprite == player.melee.sprite) {
			player.weapons[1] = new Weapon(player, ammo, ammoCap, wpn.sprite);
			player.wpn = player.weapons[1];
			return;
		}
	}
	player.weapons[player.eqp] = new Weapon(player, ammo, ammoCap, wpn.sprite);
	player.wpn = player.weapons[player.eqp];
} 

/**
 * Determines the action executed for each different item picked up.
 * 
 * The items currently available are:
 *   Shield/Vest: Gives the player armor and resistance to damage
 *   Melee weapons: Sword, Axe, Lightsabers
 *   Weapons: Handgun, Shotguns, Assault Rifles, Sniper, Machine Guns, Ray Gun...
 *   Ammo: Ammo for the player's gun
 *   Medkit: Allows the player to heal
 *   Nuke: Kills all enemies on the map, leaves a damaging crater behind
 * 
 * @param {Player} player 
 * @param {Loot} loot 
 */
function acquireLoot(player, loot) {
	if (loot.sprite in melee_range) {
		equipWpn(player, 0, 0, loot);
		player.melee = new Weapon(player, 0, 0, loot.sprite);
		return 0;
	}

	else if (loot.sprite in gunMap) {
		var ammoCap = gunMap[loot.sprite];
		for (var i = 0; i <= 1; i ++) {
			if (player.weapons[i] == null) continue;
			if (player.weapons[i].sprite == loot.sprite)  {
				player.weapons[i].mag += ammoCap;
				player.weapons[i].cap += ammoCap;
				return 0;
			}
		}
		equipWpn(player, 0, ammoCap, loot);
		return 0;
	}

	else if (loot.sprite == 'ammo') {
		var flag = 0;
		for (var i = 0; i <= 1; i ++) {
			if (player.weapons[i] == null) continue;
			if (player.weapons[i].sprite in gunMap) {
				player.weapons[i].mag = gunMap[player.weapons[i].sprite];
				player.weapons[i].cap += gunMap[player.weapons[i].sprite];
				flag++;
			}
		}
		return flag==0;
	}
	
	else if (loot.sprite == 'vest') {
		for (var i = 0; i < player.inventory.length; i ++) {
			if (player.inventory[i] == null) {
				player.inventory[i] = 'vest';
				player.armor = 100;
				return 0;
			} else if (player.inventory[i] == 'vest') {
				if (player.armor < 100) {
					player.armor = 100;
					return 0;
				}
				return 1;
			}
		}
		return 1;
	}

	else if (loot.sprite == 'medkit') {
		for (var i = 0; i < player.inventory.length; i ++) {
			if (player.inventory[i] == null) {
				player.inventory[i] = 'medkit';
				return 0;
			}
		}
		return 1;
	} 
	
	else if (loot.sprite == 'nuke') {
		for (var i = 0; i < stage.actors.length; i ++) {
			if (stage.actors[i] == null) continue;
			else if (stage.actors[i].sprite in npcMap) stage.actors[i].hp = 0;
		}
		stage.map[Math.round(loot.position.x/50)][Math.round(loot.position.y/50)] = 8;
		stage.map[1+Math.round(loot.position.x/50)][Math.round(loot.position.y/50)] = 8;
		stage.map[Math.round(loot.position.x/50)-1][Math.round(loot.position.y/50)] = 8;
		stage.map[Math.round(loot.position.x/50)][1+Math.round(loot.position.y/50)] = 8;
		stage.map[Math.round(loot.position.x/50)][Math.round(loot.position.y/50)-1] = 8;
		return 0;
	}		
}

function calculateDamage(wpn) {
	if (wpn in  gun_dmg) return gun_dmg[wpn];
	if (wpn in melee_dmg) return melee_dmg[wpn];
}