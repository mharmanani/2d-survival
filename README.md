# 2D Survival
A 2D multiplayer survival game built with JavaScript, Node.js, and React.js

### Version 1 - Single Player
 1) **Node Server**: ftd.js 
	supplies static content + deals with routes for member management, scores etc.
 2) **Client**: model.js+controller.js 
	handles game logic.
 3) **Client**: rest.js 
 	handles the client side of the restful application, ajax requests to server etc.
  
  ### Version 2 - Multiplayer
  1) **Backend server**: ftd.js (`NodeJS+Express+WebSocketServer`). Serves static content and implements the REST API via Node+Express. Receives socket connections from clients via WebSocketServer.

  2) **Client-side**: controller.js + ftdClient.js (`jQuery+AJAX+WebSocket+JSON`). This is the client side of the application. It establishes a WebSocket connection to IP:10361, and makes requests to the server to display the correct aspect of the UI or update the state of the game/stage.

  3) **Front-end and UI**: index.html ('React.js + Babel + MaterialUI'). This is the React application served from the HTML file. Integrated with MaterialUI to display clean/elegant user interface as well as a responsive design.
