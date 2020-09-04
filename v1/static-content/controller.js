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
 * Generates actors on the stage depending on the round.
 * Helper function for spawnActors.
 * @return: [zombies, skeletons, demons, crates]
 */
function actorGenerator(stage) {
	if (stage.round == 1) {
		return [3, 2 , 0, 5];
	} else if (stage.round < 6) {
		return [3+stage.round, 2+stage.round , 1, 2+stage.round];
	} else if (stage.round < 15) {
		return [3+stage.round, 2+stage.round , stage.round, 2+stage.round];
	} else {
		return [35, 10 , 30, 2+stage.round];
	}
}

/**
 * Shades the extremities of the map.
 * Called whenever the round ends to shrink the stage.
 */
function shadeMap(stage) {
	for (var i = 0; i < stage.map[stage.round-1].length; i ++) {
		stage.map[stage.round-1][i] = 9;
		stage.map[stage.round][i] = 9;
		stage.map[stage.round+1][i] = 9;
	}
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
	stage=new Stage(document.getElementById('stage'));
	alive=true;

	$(document).ready(function() {
		// Add the actors + obstacles
		spawnObstacles(stage);
		spawnActors(stage);

		// Initialize click event
		document.getElementById("stage").addEventListener('click', (e) => {
			const pos = getCursorPosition(stage, e);

			if (!(stage.player.wpn.sprite in melee_range)) {
				stage.player.wpn.shoot();
				return;
			}

			if (stage.player.wpn.sprite == "builder") {
				stage.player.build(pos);
				return;
			}

			stage.actors.forEach(actor => {
			  if (dist(pos, actor.position) < 25 && actor != stage.player) {
				  if (stage.player.wpn.sprite in melee_range) {
					  if (dist(stage.player.position, actor.position) <= melee_range[stage.player.wpn.sprite]) {
						stage.player.addMaterial(actor);
						actor.hp -= stage.player.wpn.dmg;	 
					  } 
				  } 
			  }
			});
		});
	});


	// Initialize keyboard events
	document.addEventListener('keydown', moveByKey);
	document.addEventListener('keydown', actionKey);

	/**
	 * Lets the player shoot from a fully automatic weapon.
	 * @param {Event} e
	 */
	function autoShoot(e) {
		if (e.key != " ") return;

		const pos = getCursorPosition(stage, e);
		if (!(stage.player.wpn.sprite in melee_range)) {

			switch(stage.player.wpn.sprite) {
				case 'm9': return;
				case 'sniper': return;
				case 'shotgun': return;
				case 'ray_gun': return;
				default: break;
			}

			stage.player.wpn.shoot(pos);
			return;
		}
	}

	// Add listeners for autoShoot on the spacebar
	document.addEventListener('keydown', autoShoot);
	document.addEventListener('keypress', autoShoot);

}

/**
 * Spawn obstacles on the stage.
 * @param {Stage} stage
 */
function spawnObstacles(stage) {
	var total=5+2*stage.round;
	while(total>0){
		var x=Math.floor(50+(Math.random()*stage.width)); 
		var y=Math.floor((Math.random()*stage.height)); 
		if(stage.getActor(x,y)===null){
			var position = new Pair(x,y);
			var t = new Tombstone(stage, position, new Pair(0, 0), 'rgba(0,50,0,50)', 5);
			stage.addActor(t); 
			total--;
		}
	}
}

/**
 * Spawn actors on the stage.
 * @param {Stage} stage
 */
function spawnActors(stage) {
	
	// Call the actor generator helper
	var actorMap = actorGenerator(stage);

	// Spawn the generated amount of zombies
	while(actorMap[0]>0){
		var x=Math.floor(50+(Math.random()*stage.width)); 
		var y=Math.floor((Math.random()*stage.height)); 
		if(stage.getActor(x,y)===null){
			var position = new Pair(x,y);
			var z=new Zombie(stage, position, new Pair(4, 4), 'rgba(0,50,0,50)', 5); 
			stage.addActor(z);
			actorMap[0]--;
		}
	}

	// Spawn the generated amount of skeletons
	while(actorMap[1]>0){
		var x=Math.floor(50+(Math.random()*stage.width)); 
		var y=Math.floor((Math.random()*stage.height)); 
		if(stage.getActor(x,y)===null){
			var position = new Pair(x,y);
			stage.addActor(new Skeleton(stage, position, new Pair(8, 8), 'rgba(0,50,0,50)', 5));
			actorMap[1]--;
		}
	}

	// Spawn the generated amount of demons
	while(actorMap[2]>0){
		var x=Math.floor(50+(Math.random()*stage.width)); 
		var y=Math.floor((Math.random()*stage.height)); 
		if(stage.getActor(x,y)===null){
			var position = new Pair(x,y);
			stage.addActor(new Demon(stage, position, new Pair(3, 3), 'rgba(0,50,0,50)', 5));
			actorMap[2]--;
		}
	}

	for (var i = 0; i < 4; i ++) stage.enemies += actorMap[i];

	// Spawn the generated amount of crates
	while(actorMap[3]>0){
		x=Math.floor((Math.random()*stage.width)); 
		y=Math.floor((Math.random()*stage.height)); 
		if(stage.getActor(x,y)===null){
			position = new Pair(x,y);
			var c = new Crate(stage, position, new Pair(0, 0), 'rgba(0,50,0,50)', 5);
			stage.addActor(c); 
			actorMap[3]--;
		}
	}
}

/**
 * Start the game. 
 * Sets interval events to draw the map, spawn actors/obstacles,
 * increment the round, etc...
 */
function startGame() {

	if (!stage) return;

	interval = setInterval(
		function(){ stage.step(); stage.draw(); },20);

	spawnEvent = setInterval(
		function() {
			shadeMap(stage);
			stage.round ++;
			spawnActors(stage);
			spawnObstacles(stage);
		}, 90000
	);

	isPlayerAlive = setInterval (
		function() { 
			if (alive && stage.player.hp <= 0) { 
				gameOver(stage.round, stage.player.kills);
				alive=false;
			}
		}, 
	20);

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

	var moveMap = { 
		'a': { "dx": -1, "dy": 0},
		's': { "dx": 0, "dy": 1},
		'd': { "dx": 1, "dy": 0},
		'w': { "dx": 0, "dy": -1}
	};

	if (event.key in moveMap) {
		stage.player.move(stage.player, moveMap[key].dx, moveMap[key].dy);
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
function actionKey(event) {
	var actionMap = {

		'r': function() { // Reload
			if (!(stage.player.wpn.sprite in gunMap)) return;
			var ammo = gunMap[stage.player.wpn.sprite];

			if (stage.player.wpn.cap == 0) return;

			if (stage.player.wpn.cap < ammo) {
				stage.player.wpn.mag += stage.player.wpn.cap;
				stage.player.wpn.cap = 0;
			}

			if (stage.player.wpn.mag == 0) {
				stage.player.wpn.mag = ammo;
				stage.player.wpn.cap = Math.max(stage.player.wpn.cap - ammo, 0);
			}

			else {
				stage.player.wpn.cap = Math.max(stage.player.wpn.cap - (ammo-stage.player.wpn.mag), 0);
				stage.player.wpn.mag += (ammo - stage.player.wpn.mag);
			}

		}, 
		
		'x': function () { // Swap weapon
			next = (stage.player.eqp+1)%2;
			if (stage.player.weapons[next] != null) {
				stage.player.eqp = next;
				stage.player.wpn = stage.player.weapons[next];
			}
		}, 
		
		'f': function () { // Pickup item
			for (var i = 1; i < stage.actors.length; i ++) {
				if (stage.player.overlap(stage.actors[i])) {
					if (stage.player.wpn.sprite in melee_range || 
						stage.player.wpn.sprite in gunMap) {
						var retval = acquireLoot(stage.player, stage.actors[i]);
						if (retval == 0) stage.removeActor(stage.actors[i]);
					}
				}
			} 
		}, 
		
		'z': function () { // Melee
			stage.player.wpn = stage.player.melee;
		}, 
		
		'v': function () { // Drop weapon
			if (stage.player.eqp == 0) {
				stage.player.weapons[0] = stage.player.melee;
				stage.player.wpn = stage.player.weapons[0];
			}
			if (stage.player.eqp == 1) {
				stage.player.eqp = 0;
				stage.player.wpn = stage.player.weapons[0];
				stage.player.weapons[1] = null;
			}
			stage.drawUI();
		}, 
		
		'h': function () { // Heal
			for (var i = 0; i < 5; i ++) {
				if (stage.player.inventory[i] == null) continue;
				if (stage.player.inventory[i] == 'medkit') {
					stage.player.hp = 100;
					stage.player.inventory[i] = null;
					break;
				}
			}
		}, 

		'b': function () { // Build
			stage.player.wpn = new Weapon(stage.player, 0, 0, "builder");
		}, 

		']': function() {
			homepage();
			showLogin();
		}
	}

	if (event.key in actionMap) {
		actionMap[event.key]();
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