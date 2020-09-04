function randint(n){ return Math.round(Math.random()*n); }
function rand(n){ return Math.random()*n; }
function dist(a,b){ return Math.sqrt( Math.pow((a.x-b.x), 2) + Math.pow((a.y-b.y), 2) ); }

// Enemy to HP map
var npcMap = {"zombie":"/100", "demon":"/150", "skeleton":"/50"};

// List of all connected users
var connected = [];

class Camera {
	constructor (map, width, height) {
		this.x = 0;
		this.y = 0;
		this.width = width;
		this.height = height;
		this.maxX = map[0].length * 50 - width;
		this.maxY = map.length * 50 - height;
		this.SPEED = 128;
	}

	move (delta, dirx, diry) {
		// move camera
		this.x += dirx * Camera.SPEED * delta;
		this.y += diry * Camera.SPEED * delta;
		// clamp values
		this.x = Math.max(0, Math.min(this.x, this.maxX));
		this.y = Math.max(0, Math.min(this.y, this.maxY));
	};
}

/**
 * The stage is the game area. 
 */
class Stage {
	constructor(canvas, mode){
		this.canvas = canvas;

		if (mode == 'Desktop') 
			this.canvas.width = 2500;
		else this.canvas.width = window.innerWidth;
		this.canvas.height = 2500;

		this.mode = mode;
	
		this.actors=[]; // all actors on this stage (monsters, player, boxes, ...)
		this.player=null; // a special actor, the player
		this.players=[]; // A3 enhancement: contains all players currently online 
		this.round = 1;

		this.context = this.canvas.getContext('2d');
		this.map = buildMap(150, 150);
		this.map.tsize = 50;

		this.camera = new Camera(this.map, this.canvas.width, this.canvas.height);

		this.enemies = 0;
	
		// the logical width and height of the stage
		this.width=canvas.width;
		this.height=canvas.height;
	}

	addPlayer(id, x, y) {
		var player_pos = new Pair(x, y);
		var player_v = new Pair(0, 0);
		var player = new Player(this, id, player_pos, player_v, 'rgba(215,215,0,50)', 10);

		//this.addActor(player);
		this.players.push(player);
	}

	removePlayer(id){
		var player = this.getPlayer(id);
		var index=this.actors.indexOf(player);
		if(index!=-1){
			this.actors.splice(index,1);
		}
	}

	getPlayer(id) {
		for (let player of this.players) {
			if (player._id == id)
				return player;
		}
	}

	addActor(actor){
		this.actors.push(actor);
	}

	removeActor(actor){
		var index=this.actors.indexOf(actor);
		this.actors[index] = null;
		return;
		if(index!=-1){
			this.actors.splice(index,1);
		}
	}

	// Take one step in the animation of the game.  Do this by asking each of the actors to take a single step. 
	// NOTE: Careful if an actor died, this may break!
	step(){
		for(var i=0;i<this.actors.length;i++){
			if (this.actors[i] != null) this.actors[i].step();
		}
	}
	
	/**
	 * Draw the user interface.
	 * Player health and ammo reserves, enemy health, current round, player inventory.
	 */
	drawUI() {
		var ctx = this.canvas.getContext('2d');
		ctx.font = "15px Courier";


		for (var i = 0; i < this.players.length; i ++) {

			if (this.players[i] == null) continue;

			// Colors to indicate each player's health situation
			if (this.players[i].hp >= 70) ctx.fillStyle = "#0f0";
			else if (this.players[i].hp < 70) ctx.fillStyle = "#ff0";
			if (this.players[i].hp < 40) ctx.fillStyle = "#f00";
			if (this.players[i].hp + this.players[i].armor > 100) ctx.fillStyle = "#0ff";

			// Draw each player's health
			var max_hp = "100";
			var cur_hp = this.players[i].hp + this.players[i].armor;
			var msg = cur_hp + "/" + max_hp;
			ctx.fillText(msg, this.players[i].position.x, this.players[i].position.y);

			// Draw the round in red above the player
			ctx.fillStyle = "#500";
			ctx.font = "15px Arial";
			//ctx.fillText("Round: "+this.round, this.players[i].position.x, this.players[i].position.y-15);

			ctx.fillStyle = "#077";
			ctx.font = "15px Roboto";
			ctx.fillText("    "+this.players[i]._id, this.players[i].position.x, this.players[i].position.y-15);

			ctx.font = "15px Courier";
			ctx.fillStyle = "#000";
			
			// Draw the player's ammo reserves
			var mag = this.players[i].wpn.mag;
			var cap = this.players[i].wpn.cap;
			var ammo = mag+"/"+cap;

			// Draw the player's available materials
			var wood = this.players[i].materials["wood"];
			var stone = this.players[i].materials["stone"];
			var materials = wood+","+stone;

			// If the player has a builder equiped, show his materials
			// otherwise, show his ammo
			if (this.players[i].wpn.sprite != "builder")
				ctx.fillText(ammo, this.players[i].position.x, this.players[i].position.y+70);
			else {
				ctx.fillStyle = "#220";
				ctx.fillText(materials, this.players[i].position.x, this.players[i].position.y+70);
				ctx.fillStyle = "#000";
			}

			function makeArrow(dir) {
				var icn = new Image;
				icn.src = 'img/arrow'+dir+'.png';
				return icn;
			}
		}		
			

		// Draw every enemy NPC's health
		for (var i = 0; i < this.actors.length; i ++) {
			if (this.actors[i] && this.actors[i].sprite in npcMap) {
				var hp = this.actors[i].hp;
				var z = hp + npcMap[this.actors[i].sprite];
				ctx.font = "15px Courier";
				ctx.fillStyle = "#000";
				ctx.fillText(z, this.actors[i].position.x, this.actors[i].position.y);
			}
		}
	}

	/**
	 * Draw the map's graphical component.
	 * Draw all the actors and the player.
	 */
	draw(){
		var context = this.canvas.getContext('2d');
		//context.fillStyle = "#007900";
		//context.fillRect(0, 0, this.width, this.height);

		var c = context;

		var startCol = Math.floor(this.camera.x / map.tsize);
    	var endCol = startCol + (this.camera.width / map.tsize);
    	var startRow = Math.floor(this.camera.y / map.tsize);
		var endRow = startRow + (this.camera.height / map.tsize);
		
		var offsetX = -this.camera.x + startCol * map.tsize;
    	var offsetY = -this.camera.y + startRow * map.tsize;

		for (var x = startCol; x < endCol; x++) {
			for (var y = startRow; y < endRow; y++) {
			  var drawx = x - startCol * 50 + offsetX;
			  var drawy = y - startRow * 50 + offsetY;

			  var colour = null;
			  // Different colours for diverse terrain
			  if (this.map[x][y] === 0 ) colour = "#4caf50 ";
			  else if (this.map[x][y] === 1 ) colour = "#388e3c";
			  else if (this.map[x][y] === 2 ) colour = "#81c784";
			  else if (this.map[x][y] === 3 ) colour = "#1b5e20";

			  // Damaging terrain: nuclear waste and map shrinking
			  else if (this.map[x][y] === 8 ) colour = "#FF8C00";
			  else if (this.map[x][y] === 9 ) colour = "#707";


			  c.beginPath();
			  c.rect(drawx*this.map.tsize, drawy *this.map.tsize, 50, 50);
			  c.fillStyle = colour;
			  c.fill();
			}
			
			for (let player of this.players) {
				if (player) player.draw(c);
			}
		}

		//context.clearRect(0, 0, this.width, this.height);
		for(var i=0;i<this.actors.length;i++){
			if(this.actors[i]) this.actors[i].draw(context);
		}

		// Call the drawUI method to render the user interface
		this.drawUI();
	}

	// return the first actor at coordinates (x,y) return null if there is no such actor
	getActor(x, y){
		for(var i=0;i<this.actors.length;i++){
			if(!this.actors[i]) continue;
			if(this.actors[i].x==x && this.actors[i].y==y){
				return this.actors[i];
			}
		}
		return null;
	}

} // End Class Stage


/**
 * A class to represent Points as (x,y) pairs.
 */
class Pair {
	constructor(x,y){
		this.x=x; this.y=y;
	}

	toString(){
		return "("+this.x+","+this.y+")";
	}

	normalize(){
		var magnitude=Math.sqrt(this.x*this.x+this.y*this.y);
		this.x=this.x/magnitude;
		this.y=this.y/magnitude;
	}
}

/**
 * An actor on the stage.
 * This is the parent class for every element that appears on the map.
 */
class Actor {
	constructor(stage, position, velocity, colour, radius){
		this.stage = stage;
		this.position=position;
		this.intPosition(); // this.x, this.y are int version of this.position

		this.velocity=velocity;
		this.colour = colour;
		this.radius = radius;
	}
	
	headTo(position){
		this.velocity.x=(position.x-this.position.x);
		this.velocity.y=(position.y-this.position.y);
		this.velocity.normalize();
	}

	toString(){
		return this.position.toString() + " " + this.velocity.toString();
	}

	step(){
		this.position.x=this.position.x+this.velocity.x;
		this.position.y=this.position.y+this.velocity.y;
			
		// bounce off the walls
		if(this.position.x<0){
			this.position.x=0;
			this.velocity.x=Math.abs(this.velocity.x);
		}
		if(this.position.x>this.stage.width){
			this.position.x=this.stage.width;
			this.velocity.x=-Math.abs(this.velocity.x);
		}
		if(this.position.y<0){
			this.position.y=0;
			this.velocity.y=Math.abs(this.velocity.y);
		}
		if(this.position.y>this.stage.height){
			this.position.y=this.stage.height;
			this.velocity.y=-Math.abs(this.velocity.y);
		}
		this.intPosition();
	}

	intPosition(){
		this.x = Math.round(this.position.x);
		this.y = Math.round(this.position.y);
	}

	draw(context){
		var icn = new Image;
		icn.src = 'img/'+this.sprite+'.png';
		context.drawImage(icn, this.position.x, this.position.y, 64, 64);
	}
}

/**
 * Zombies, Skeletons and Demons are the three types of enemies the
 * Player will encounter. Each of these classes is defined below:
 */

class Zombie extends Actor {
	constructor(stage, position, velocity, colour, radius){
		super(stage, position, velocity, colour, radius);

		this.hp = 100;
		this.dmg = 5;
		this.sprite = 'zombie';
	}

	draw(context) {
		if (this.hp <= 0) {
			// Dispose of the sprite should the zombie die
			this.stage.removeActor(this);
			for (let player of this.stage.players) 
				player.kills++;
			this.stage.enemies --;
			return;
		} else {
			super.draw(context);
		}
	}

	step() {
		super.step();

		for (let player of this.stage.players) {
			if (player == null) continue;
			if (this.overlap(player)) {
				//player.getHit(this.dmg, 1);
				socket.send(JSON.stringify({
					status: 'player_dmg',
					usrid: player._id,
					armor_amount: this.dmg,
					regular_amount: 1
				}));
				this.velocity = new Pair(this.velocity.x*-1, this.velocity.y*-1);
			}
		}

		var collide = {
			"crate": true,
			"rip": true,
			"player": true,
			"wall": true,
			"crate_weak": true,
			"wall_weak": true
		}
		for(var i=1;i<this.stage.actors.length; i++) {
			if (this.stage.actors[i] == null) continue;
			if (this.overlap(this.stage.actors[i])) {
				if (!collide[this.stage.actors[i].sprite]) 
					continue;
				if (this.stage.actors[i].sprite == 'wall') // walls hurt zombies
					socket.send(JSON.stringify({
						status: 'npc_dmg',
						index: i,
						amount: 10
					}));
				this.velocity = new Pair(this.velocity.x*-1, this.velocity.y*-1);
				this.stage.actors[i].hp -= this.dmg;
			}
		}
	} 

	overlap(ob) {
		if (!ob) return false;
		return (dist(this.position, ob.position) < 50);
	}
}


class Skeleton extends Zombie {
	constructor(stage, position, velocity, colour, radius){
		super(stage, position, velocity, colour, radius);

		this.hp = 50;
		this.dmg = 1;
		this.sprite = 'skeleton';
	}
}

class Demon extends Zombie {
	constructor(stage, position, velocity, colour, radius){
		super(stage, position, velocity, colour, radius);

		this.hp = 150;
		this.dmg = 15;
		this.sprite = 'demon';
	}
}

/**
 * The Player class.
 * This is where we keep track of the player's kills, inventory, weapons, health,
 * armor, etc...
 */
class Player extends Actor {

	constructor(stage, usrid, position, velocity, colour, radius){
		super(stage, position, velocity, colour, radius);

		//this.stage.player = this;

		this.hp = 100;
		this.inventory = [null, null, null, null, null];
		this.melee = new Weapon(stage.player, 0, 0, 'fist');
		this.weapons = [this.melee, null];
		this.eqp = 0;

		this._id = usrid;

		this.wpn = this.weapons[this.eqp];
		this.kills = 0;

		this.materials = {
			"wood": 0,
			"stone": 0
		};

		this.sprite = 'hero';
		this.armor = 0;
	}

	// Get damaged by an enemy
	getHit(armorDamage, healthDamage) {
		if (this.armor == 0) this.hp -= healthDamage;
		else this.armor -= armorDamage;

		if (this.armor <= 0) {
			this.armor = 0;
			for (var i = 0; i < 5; i ++) {
				if (this.inventory[i] == 'vest') {
					this.inventory[i] = null;
				}
			}
		}

	}

	// The move function allows the player to move
	// It is called through the WASD keys
	move(stage, dx, dy) {
		console.log(this.position.x, dx*25);
		console.log(this.position.y, dy*25);
		this.position.x += dx*25;
		this.position.y += dy*25;
		var mapPos = this.stage.map[Math.round(this.position.x/50)][Math.round(this.position.y/50)];

		if (mapPos == 9 || mapPos == 8) {
			this.getHit(5, 1);
		}

		for(var i=1;i<this.stage.actors.length; i++){
			if (this.stage.actors[i] == null) continue;
			if (this.overlap(this.stage.actors[i])) {
				if (this.stage.actors[i].sprite == 'crate' ||
				this.stage.actors[i].sprite == 'rip' ||
				this.stage.actors[i].sprite == 'crate_weak') {
					this.position.x -= dx*25;
					this.position.y -= dy*25;
				} else if (this.stage.actors[i].sprite == 'zombie' ||
						   this.stage.actors[i].sprite == 'skeleton' ||
						   this.stage.actors[i].sprite == 'demon') {
					var dmg = this.stage.actors[i].dmg;
					this.getHit(dmg,dmg);
				}
			}
		}

		this.stage.draw();
	}

	draw(context) {
		if (this.armor <= 0) this.sprite = 'hero';
		else this.sprite = 'hero_vest';

		var icn = new Image;
		icn.src = 'img/'+this.sprite+'.png';
		context.drawImage(icn, this.position.x, this.position.y, 64, 64);

		var wpn_img = new Image;
		wpn_img.src = 'img/'+this.wpn.sprite+'.png';
		context.drawImage(wpn_img, this.position.x+50, this.position.y+20);
	}

	addMaterial (actor) {
		if (!actor) return;
		if (actor.sprite == "crate" || actor.sprite == "crate_weak")
			this.materials["wood"] += Math.round((this.melee.dmg)/5);
		if (actor.sprite == "rip")
			this.materials["stone"] += 1;
		if (actor.sprite == "wall") {
			this.materials["stone"] += Math.round((this.melee.dmg)/5);
			this.materials["wood"] += Math.round((this.melee.dmg)/5);
		}
	}

	build (pos) {
		if (this.materials["wood"] >= 1 && this.materials["stone"] >= 2)
			var w = new Wall(this.stage, pos, new Pair(0, 0), null, null);
		else return;

		this.stage.addActor(w);
		this.materials["wood"] -= 1;
		this.materials["stone"] -= 2;
	}

	// Resolve collisions with other objects
	overlap (ob) {
		if (!ob) return false;
		return (dist(this.position, ob.position) < 50);
	}
}

/**
 * A crate is an obstacle that drops loot when broken.
 * It has a very modest amount of health.
 */
class Crate extends Actor {

	constructor(stage, position, velocity, colour, radius) {
		super(stage, position, velocity, colour, radius);
		this.stage = stage;
		this.sprite = 'crate';
		this.hp = 10;
		this.position = position;
		this.velocity = new Pair(0, 0);
	}

	draw(context) {
		var icn = new Image;
		if (this.hp <= 5 && this.hp > 0) 
			this.sprite = 'crate_weak';
		if (this.hp <= 0) {
			var loot = new Loot(this.stage, this.position, this.velocity, this.colour, this.radius, crateLootProbGen());
			this.stage.addActor(loot);
			this.stage.removeActor(this);
			return;
		}
		icn.src = 'img/'+this.sprite+'.png';
		context.drawImage(icn, this.position.x, this.position.y, 64, 64);
	}

	step() {
		return;
	}
}

/**
 * Another type of obstacle.
 * Tombstones are harder to break than Crates, and do not drop loot.
 */
class Tombstone extends Actor {
	constructor(stage, position, velocity, colour, radius) {
		super(stage, position, velocity, colour, radius);
		this.stage = stage;
		this.sprite = 'rip';
		this.position = position;
		this.velocity = new Pair(0, 0);
		this.hp = 20;
	}

	draw(context) {
		var icn = new Image;
		if (this.hp <= 0) {
			this.stage.removeActor(this);
			return;
		}
		icn.src = 'img/'+this.sprite+'.png';
		context.drawImage(icn, this.position.x, this.position.y, 64, 64);
	}

	step() { return; }
}

/**
 * Another type of obstacle.
 * Walls are the hardest to break, and can only be built by the Player
 * using the special Builder weapon.
 * Players can walk through walls, but Zombies cannot.
 */
class Wall extends Actor {

	constructor(stage, position, velocity, colour, radius) {
		super(stage, position, velocity, colour, radius);
		this.stage = stage;
		this.sprite = 'wall';
		this.hp = 30;
		this.position = position;
		this.velocity = new Pair(0, 0);
	}

	draw(context) {
		var icn = new Image;
		if (this.hp <= 15 && this.hp > 0) 
			this.sprite = 'wall_weak';
		if (this.hp <= 0) {
			this.stage.removeActor(this);
			return;
		}
		icn.src = 'img/'+this.sprite+'.png';
		context.drawImage(icn, this.position.x, this.position.y, 64, 64);
	}

	step() {
		return;
	}
}

/**
 * The Loot class allows items to spawn on the map when a Crate
 * is broken, and allows the player to interact with loot by picking it up
 * or activating it.
 */
class Loot extends Actor {
	constructor(stage, position, velocity, colour, radius, sprite) {
		super(stage, position, velocity, colour, radius);
		this.sprite = sprite;
		this.position = position;

		this.timer = setTimeout(
			function() {
				this.stage.removeActor(this);
			}, 10000
		);
	}

	draw(context) {
		var icn = new Image;
		icn.src = 'img/'+this.sprite+'.png';
		context.drawImage(icn, this.position.x, this.position.y);
	}

	step() {return;}
}

/**
 * Bullets are projectiles spawned when the Player shoots.
 */
class Bullet extends Actor {
	constructor(stage, position, velocity, colour, dmg) {
		super(stage, position, velocity, colour, dmg);
		this.position = position;
		this.sprite = "bullet";
		this.dmg = dmg;
	}

	draw(context) {
		var icn = new Image;
		icn.src = 'img/'+this.sprite+'.png';
		context.drawImage(icn, this.position.x, this.position.y, 16, 16);
	}

	step () {
		this.position.x=this.position.x+this.velocity.x;
		this.position.y=this.position.y+this.velocity.y;

		for(var i=1;i<this.stage.actors.length; i++) {
			if (this.stage.actors[i] == null) continue;
			if (this.overlap(this.stage.actors[i])) {
				var s = this.stage.actors[i].sprite;
				if (!(s in npcMap) && s != 'crate' && s != 'crate_weak' && s != 'rip') continue;
				if (this.sprite == this.stage.actors[i].sprite) continue; 
				this.stage.actors[i].hp -= this.dmg;
				this.stage.removeActor(this);
			}
		}

		if (this.position.x<0 || this.position.x>this.stage.width ||
			this.position.y<0 || this.position.y>this.stage.height ) this.stage.removeActor(this);
	}

	overlap(ob) {
		if (!ob) return false;
		return (dist(this.position, ob.position) < 50);
	}


}

/**
 * A more powerful type of Bullet.
 */
class Laser extends Bullet {
	constructor(stage, position, velocity, colour, radius) {
		super(stage, position, velocity, colour, radius);
		this.position = position;
		this.sprite = "bullet_blue";
		this.dmg = 75;
	}
}

/**
 * The Weapon class allows the Player to shoot from his gun.
 */
class Weapon {
	constructor(player, mag, cap, sprite) {
		this.player = player;
		this.mag = mag;
		this.cap = cap;
		this.sprite = sprite;

		// Use the gunMap construct to determine the weapon damage
		this.dmg = calculateDamage(this.sprite);
	}

	/**
	 * This function attributes a unique behaviour to some weapons, and 
	 * leaves other weapons with a default mechanism.
	 */
	shoot () {
		if (this.mag == 0) return; // Mag empty cannot shoot

		// The player's position. 
		// This is the starting point for the bullets.
		var pos = new Pair(this.player.position.x+50, this.player.position.y+25);

		/**
		 * The M16 has a three-round burst.
		 */
		if (this.sprite == 'm16') {
			for (var  i = 0; i < 3; i ++) {
				var newPos = new Pair(pos.x+10*i, pos.y);
				this.player.stage.addActor(new Bullet(this.player.stage, newPos, new Pair(25, 0), null, this.dmg));
				if (this.mag == 0) return;
			} this.mag -= 3;
		} 
		
		/**
		 * The Shotgun & the 1887 have a wide spread.
		 */
		else if (this.sprite == 'shotgun') {
			for (var  i = 0; i < 5; i ++) {
				var newPos = new Pair(pos.x, pos.y+10*i);
				this.player.stage.addActor(new Bullet(this.player.stage, newPos, new Pair(20, 0), null, this.dmg));
			}
			this.mag -= 1;
		} else if (this.sprite == '1887') {
			for (var  i = 0; i < 4; i ++) {
				var newPos = new Pair(pos.x, pos.y+10*i);
				this.player.stage.addActor(new Bullet(this.player.stage, newPos, new Pair(40, 0), null, this.dmg));
			}
			this.mag -= 1;
		} 
		
		/**
		 * The Sniper has high damage and high bullet speed.
		 */
		else if (this.sprite == 'sniper') {
			this.player.stage.addActor(new Bullet(this.player.stage, pos, new Pair(75, 0), null, this.dmg));
			this.mag -= 1;
		} 
		
		/**
		 * The Ray Gun has very high damage but low bullet speed.
		 */
		else if (this.sprite == 'ray_gun') {
			for (var  i = 0; i < 3; i ++) {
				var newPos = new Pair(pos.x+5*i, pos.y+5*i);
				this.player.stage.addActor(new Laser(this.player.stage, newPos, new Pair(10, 0), null, this.dmg));
			}
			this.mag -= 1;
		} 
		
		/**
		 * The TMP shoots very fast
		 */
		else if (this.sprite == 'tmp') {
			this.player.stage.addActor(new Bullet(this.player.stage, pos, new Pair(50, 0), null, this.dmg));
			this.mag -= 1;
		} 
		
		/**
		 * The M60 has lots of ammunition but low damage
		 */
		else if (this.sprite == 'm60e4') {
			for (var  i = 0; i < 2; i ++) {
				var newPos = new Pair(pos.x+2*i, pos.y+2*i);
				this.player.stage.addActor(new Bullet(this.player.stage, newPos, new Pair(50, 0), null, this.dmg));
			}
			this.mag -= 1;
		}
		
		/**
		 * The default behaviour for other weapons.
		 */
		else {
			this.player.stage.addActor(new Bullet(this.player.stage, pos, new Pair(20, 0), null, this.dmg));
			this.mag -= 1;
		}
	}
}

/**
* The Builder class allows the player to build walls.
*/
class Builder extends Weapon {
	constructor(player, mag, cap, sprite) {
		super(player, mag, cap, sprite);
		this.player = player;
		this.mag = 0;
		this.cap = 0;
		this.sprite = "builder";
	}

	draw(context) {
		var icn = new Image;
		icn.src = 'img/'+this.sprite+'.png';
		context.drawImage(icn, this.position.x, this.position.y);
	}
}