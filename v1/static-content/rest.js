var struct = {};

function showLogin(){
	$.ajax({ 
		method: "GET", 
		url: "/api/home/"
	}).done(function(data){
		$("#loginTitle").show();
		$("#loginForm").show();
		$("#msg-sys").html("");
		$("#gameOver").hide();
		$("#quitGame").hide();
	});
}

function newGame() {
	$.ajax({ 
		method: "GET", 
		url: "/api/play/"
	}).done(function(data){
		$("#controlTable").hide();
		$("#controlHead").hide();

		$("#loginTitle").hide();
		$("#loginForm").hide();

		//$("#mainHeader").hide();
		$("#scoreTable").hide();

		$("#stage").show();
		$("#playerInventory").show();
		$("#quitGame").show();
		$("#gameOver").hide();

		setupGame(); 
		startGame();
	});
}

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

function displayScores() {
	$.ajax({ 
		method: "GET", 
		url: "/api/scores/"
	}).done(function(data){
		$("#controlTable").hide();
		$("#controlHead").hide();

		console.log(data["scores"]);

		var scores = "<tr><th></th> <th><b>User<b></th>" 
		+"<th><b>Best round<b> </th><th> <b>Kills<b> </th></tr>";

		for(var i = 0; i < data["scores"].length; i++) {
			var u = i + 1;
			scores += "<tr><td>"+ u + "</td><td>" +
			data["scores"][i].usrid+"</td>"
			+ "<td>" + data["scores"][i].score + "</td>"
			+ "<td>" + data["scores"][i].kills + "</td>"
			+ "</tr>";
		}

		$("#scoreTable").html(scores);
		$("#scoreTable").show();

	}).fail(function(err){
		$("#msg-sys").html(data["error"]);
	});
}

function homepage(){
	$.ajax({ 
		method: "GET", 
		url: "/api/home/"
	}).done(function(data){
		$("#controlTable").hide();
		$("#controlHead").hide();

		$("#registerTitle").hide();
		$("#registerForm").hide();
		$("#scoreTable").hide();

		$("#stage").hide();
		$("#playerInventory").hide();

		$("#gameOver").hide();
		$("#quitGame").hide();
		showLogin();
	});
}

function toggleControls () {
	$("#scoreTable").hide();
	$("#controlTable").show();
	$("#controlHead").show();
};

function register() {
	$.ajax({ 
		method: "GET", 
		url: "/api/register/"
	}).done(function(data){
		$("#msg-sys").html("");

		$("#loginTitle").hide();
		$("#loginForm").hide();

		$("#registerTitle").show();
		$("#registerForm").show();

		$("#controlHead").hide();
		$("#controlTable").hide();

		$("#scoreTable").hide();
	});
};

function authenticate() {
	$.ajax({ 
		method: "GET", 
		url: "/api/login/",
		data: {"usrid": $("#usrid").val(), "passwd": $("#passwd").val()}
	}).done(function(data){
		if ("error" in data){ $("#msg-sys").html(data["error"]); }
		else { newGame(); struct["usrid"]=data["usrid"]; }
	}).fail(function(err){
		$("#msg-sys").html(data["error"]);
	});
};

function createAccount() {
	$.ajax({ 
		method: "GET", 
		url: "/api/accounts/",
		data: {"usrid": $("#newUser").val(), "passwd": $("#newPass").val()}
	}).done(function(data) {
		if("error" in data){ $("#msg-sys").html(data["error"]); }
		else { homepage(); }
	}).fail(function(err){
		$("#msg-sys").html(data["error"]);
	});
};

$(function(){
	// Setup all events here and display the appropriate UI
	$("#registerBtn").on('click', () => {register();});
	$("#backToLogin").on('click', () => {
		homepage();
		showLogin();
	});

	$("#createAccount").on('click', () => {createAccount();});
	$("#loginBtn").on('click', () => {authenticate();});
	$("#scoreBtn").on('click', () => {displayScores();});
	$("#toggleControls").on('click', () => {
		toggleControls();
	});

	$("#deadBtn").on('click', () => {newGame();});
	$("#logoutBtn").on('click', () => {
		homepage();
		showLogin();
	});
	homepage();
});