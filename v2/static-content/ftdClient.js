// 
if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
	var mobile = true; // detect whether a mobile device is being used or not
} else var mobile = false; 

var origPort = 10360; // port connecting to socket
var SOCK_ID = null; // socket id used by the server to manage users/clients
var USRID = null; // user id used by the server and the stage to manage players

function gameOver(round, kills) {
	$.ajax({ 
		method: "GET", 
		url: "/api/over/",
		data: {"round": round, "kills": kills, "usrid":struct["usrid"]}
	}).done(function(data){
		$("#mainHeader").show();
		$("#scoreTable").hide();

		$("#stage").hide();
		$("#playerInventory").hide();

		$("#gameOver").show();
	});
}

/**
 * Executes onload.
 */
$(function(){

	//socket = new WebSocket("ws://142.1.200.140:" + (origPort + 1));
	socket = new WebSocket("ws://localhost:" + (origPort + 1));
	socket.onopen = function (event) {
		console.log('connected');
	};

	/** 
	 * Executes when the socket closes.
	 */
	socket.onclose = function (event) {
		stage.players.getPlayer(USRID) = null;
		if (event.code == 4007) // hardcoded value used to indicate a player dying
			console.log(USRID + " has been killed");
		else if (event.code == 1000){
			console.log("[" +USRID +"] " + "Abnormal closure" );
			console.log("Connection interrupted");
		}
	};

	/**
	 * Executes whenever the socket receives a response from the server.
	 */
	socket.onmessage = function (event) {

		/**
		 * Receive instructions from the server in the form of a JSON
		 * file. Typically, it contains the following fields:
		 * status: the next action required to update the model
		 * usrid: the user that fired that action
		 * sock_id: the socket the user is connected to
		 * ... some more data depending on the value of status
		 */

		var data = JSON.parse(event.data);
		
		/**
		 * Bind a socket ID to the socket.
		 * Helps with client/user management.
		 */
		if (data.status == 'assgn_id') {
			SOCK_ID = data.id;
			console.log(SOCK_ID);
			stage = setupGame();
			startGame();
			$('#stage').show();
		}

		/**
		 * Signal that a new user has connected.
		 * We want to update the model to reflect changes made before.
		 */
		else if (data.status == 'new_user') {
			if (data.sock_id == SOCK_ID) 
				USRID = data.usrid;
			var usrids = [];
			for (let player of stage.players) {
				var player_data = {
					usrid: player._id,
					x: player.position.x,
					y: player.position.y
				}
				usrids.push(player_data);
			}
			usrids.push({
				usrid: USRID,
				x: 30,
				y: 30
			});
			socket.send(JSON.stringify({
				status: "add_user",
				usrids: usrids
			}));
		}

		/**
		 * Add a list of users to the stage.
		 */
		else if (data.status == 'add_user') {
			var player_data = data.usrids;
			for (let user of player_data) {
				if (user.usrid && stage.getPlayer(user.usrid) == null)
					stage.addPlayer(user.usrid, user.x, user.y);
			}
			stage.draw();
		}

		/**
		 * Move the players requesting to move.
		 */
		if (data.status == 'move_player') {
			//console.log(stage.players[data.sock_id]);
			//console.log(data.dy);
			console.log(data.usrid); console.log(stage.players);
			stage.getPlayer(data.usrid).move(stage, data.dx, data.dy);
		}

		/**
		 * Update the position of actors, NPCs, the map, etc...
		 */
		if (data.status == 'step') {
			//console.log(data.actors);
			/*var positions = JSON.parse(data.positions);
			var i = 0;
			for (let pos of positions){
				var newPos = new Pair(pos.x, pos.y);
				if (!stage.actors[i]) continue;
				if (stage.actors[i].sprite != 'zombie'   &&
					stage.actors[i].sprite != 'skeleton' &&
					stage.actors[i].sprite != 'demon'
				   ) {
						i ++;
						continue;
					}
				stage.actors[i].position = newPos;
				i ++;
			}*/
			stage.step(); 
			stage.draw(); 
		}

		/**
		 * Remove an actor.
		 */
		if (data.status == 'remove_actor') {
			var i = data.index;
			stage.removeActor(stage.actors[i]);
			for (let pos of data.positions){
				var newPos = new Pair(pos.x, pos.y);
				if (!stage.actors[i]) continue;
				if (stage.actors[i].sprite != 'zombie'   &&
					stage.actors[i].sprite != 'skeleton' &&
					stage.actors[i].sprite != 'demon'
				   ) {
						i ++;
						continue;
					}
				stage.actors[i].position = newPos;
				i ++;
				stage.step(); 
				stage.draw(); 
			}

		}

		/**
		 * Add material to the player specified by the server.
		 */
		if (data.status == 'add_material') {
			stage.getPlayer(data.usrid).addMaterial(stage.actors[data.index]);
		}

		/**
		 * Execute an actionEvent, depending on the key pressed
		 * by the user.
		 * 
		 * As players press keys, changes are executed here and reflected
		 * across other players.
		 */
		if (data.status == 'action_key') {
			var actionMap = { // Key to function map
				'r': Reload , 
				'x': SwapWeapons ,
				'f': Pickup, 
				'z': SwapToMelee , 
				'v': DropWeapon ,
				'h': HealPlayer ,
				'b': SwapToBuilder, 
			}
			actionMap[data.key](data.usrid);
		}

		// Decrease an actor's HP
		if (data.status == 'actor_damage') {
			stage.actors[data.index].hp -= data.dmg;
		}

		// Decrease a player's HP
		if (data.status == 'player_dmg') {
			stage.getPlayer(data.usrid).getHit(data.armor_amount,data.regular_amount);
		}

		// Redundant. If this is still here, I forgot to delete it.
		if (data.status == 'npc_dmg') {
			if (stage.actors[i]) stage.actors[i].hp -= data.amount;
		}

		if (data.status == 'update_inventory') {
			acquireLoot(stage.getPlayer(data.usrid), {sprite: data.sprite});
		}

		/**
		 * Add actors at each location specified.
		 * The server specifies the type of actor it wants (zombie/demom/skeleton/crate)
		 * as well as the location it wants it at.
		 */
		if (data.status == 'spawn_actors') {
			for (let ob of data.actors) {
				switch(ob.sprite) {
					case 'zombie': {
						// Add a zombie at the specified location
						stage.addActor(
							new Zombie(stage, new Pair(ob.x, ob.y), new Pair(5,5), 0, 0)
						);
						break;
					}
					case 'skeleton': {
						// Add a skeleton at the specified location
						stage.addActor(
							new Skeleton(stage, new Pair(ob.x, ob.y), new Pair(6,6), 0, 0)
						);
						break;
					}
					case 'demon': {
						// Add a demon at the specified location
						stage.addActor(
							new Demon(stage, new Pair(ob.x, ob.y), new Pair(4,4), 0, 0)
						);
						break;
					}
					case 'crate': {
						// Add a crate at the specified location
						stage.addActor(
							new Crate(stage, new Pair(ob.x, ob.y), new Pair(0,0), 0, 0)
						);
						break;
					}
				}
				stage.enemies += 1;
			}
		}

		/**
		 * Receive instructions to shrink the map.
		 */
		if (data.status == 'shade_map') {
			for (var i = 0; i < stage.map[data.round].length; i ++) {
				stage.map[data.round-1][i] = 9;
				stage.map[data.round][i] = 9;
				stage.map[data.round+1][i] = 9;
			}
			stage.draw();
		}

		/**
		 * Kill a player. 
		 * Boots the user from the game and frees their socket spot.
		 */
		if (data.status == 'player_dead') {
			stage.removePlayer(data.id);
			if (data.sock_id == SOCK_ID) {
				socket.close(4007); // custom code 4007 indicates a death
				alive = false;
			}
		}

		// Spawn obstacles
		if (data.status == 'spawn_obstacles') {
			for (let ob of data.obstacles) {
				var pos = new Pair(ob.x, ob.y);
				var t = new Tombstone(stage, pos, new Pair(0, 0), 'rgba(0,50,0,50)', 5);
				stage.addActor(t); 
			}
		}

		/**
		 * The server tells the stage to display each player shooting.
		 */
		if (data.status ==  'shoot') {
			stage.getPlayer(data.usrid).wpn.shoot();
		}

		/**
		 * The server tells the stage to display walls built by each player.
		 */
		if (data.status == 'build') {
			stage.getPlayer(data.usrid).build(data.position);
		}

	};
});