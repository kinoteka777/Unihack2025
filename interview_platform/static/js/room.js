// room.js - Version 3.0.0 (Final Fix)
console.log("Loading room.js version 3.0.0");

// Global variables - explicitly attach to window
window.socket = null;
window.uid = "";
window.wb = null;
window.timerInterval = null;
window.sessionEndTime = null;

// Initialize the room connection
function initRoom(roomId) {
	console.log("Initializing room with ID:", roomId);
	
	// Connect to WebSocket - handle both HTTP and HTTPS
	const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
	window.socket = new WebSocket(
		`${protocol}//${window.location.host}/ws/`
	);
	
	// Make socket globally available
	window.roomSocket = window.socket;
	
	window.socket.onopen = function(e) {
		console.log("WebSocket connection established");
		// Join the room
		window.socket.send(JSON.stringify({
			'join': roomId
		}));
		
		// Initialize whiteboard immediately after socket is connected
		initWhiteboard();
		
		// Request timer state
		window.socket.send(JSON.stringify({
			'type': 'get_timer'
		}));
		
		// Set up the text change handler
		if (document.getElementById('editor')) {
			document.getElementById('editor').addEventListener('keyup', function() {
				onTextChange();
			});
		}
	};
	
	window.socket.onclose = function(e) {
		console.log("WebSocket connection closed");
		// Don't redirect on close - just try to reconnect
		setTimeout(function() {
			console.log("Attempting to reconnect...");
			initRoom(roomId);
		}, 1000);
	};
	
	window.socket.onerror = function(e) {
		console.error("WebSocket error:", e);
	};

	// Process websocket message
	window.socket.onmessage = function(event) {
		try {
			const data = JSON.parse(event.data);
			
			// Only redirect if explicitly told to exit
			if (data.exit === 1) { 
				console.log("Server requested exit");
				window.location.href = '/'; 
			}

			if (data.join) {
				window.uid = data.join;
				console.log("Joined as user " + window.uid);
			} else if (data.type == "txt_update") {
				if (document.getElementById("editor")) {
					document.getElementById("editor").value = data.data;
				}
			} else if (data.type == "wb_buffer") {
				if (window.wb) {
					window.wb.setCanvasData(data.data);
				}
			} else if (data.type == "timer_update") {
				// Update the timer with the server's time
				updateTimerFromServer(data.end_time);
			}
		} catch (error) {
			console.error("Error processing WebSocket message:", error);
		}
	};
}

// Initialize the whiteboard
function initWhiteboard() {
	console.log("Initializing whiteboard (version 3.0)");
	const canvas = document.getElementById("whiteboard");
	if (!canvas) {
		console.error("Whiteboard canvas not found");
		return;
	}
	
	try {
		// Create the whiteboard object with inline callback
		window.wb = new Whiteboard("whiteboard", function(buff, opt) {
			// This is the onDraw callback
			if (window.wb) {
				window.wb.draw(buff, opt);
				if (window.socket && window.socket.readyState === WebSocket.OPEN) {
					window.socket.send(JSON.stringify({ 
						id: window.uid, 
						type: "wb_buffer", 
						data: window.wb.getCanvasData() 
					}));
				}
			}
		});
		
		console.log("Whiteboard initialized successfully");
	} catch (error) {
		console.error("Error initializing whiteboard:", error);
	}
}

// Function to handle text changes in the editor
function onTextChange() {
	const editor = document.getElementById("editor");
	if (!editor) {
		console.error("Editor element not found");
		return;
	}
	
	if (!window.socket || window.socket.readyState !== WebSocket.OPEN) {
		console.error("Cannot send text update: WebSocket not open");
		return;
	}
	
	try {
		window.socket.send(JSON.stringify({
			'type': 'txt_update',
			'data': editor.value
		}));
	} catch (error) {
		console.error("Error sending text update:", error);
	}
}

// Update our timer from server end time
function updateTimerFromServer(endTimeStr) {
	try {
		// Parse the end time from the server - carefully
		console.log("Raw end time from server:", endTimeStr);
		
		// Handle different formats
		let endTime;
		if (typeof endTimeStr === 'string') {
			if (endTimeStr.includes('T') || endTimeStr.includes('-')) {
				// ISO format or similar string
				endTime = new Date(endTimeStr);
			} else {
				// Likely a timestamp as string
				endTime = new Date(parseInt(endTimeStr, 10));
			}
		} else if (typeof endTimeStr === 'number') {
			// Unix timestamp in seconds or milliseconds
			if (endTimeStr < 20000000000) { // If less than year 2603 (in seconds)
				endTime = new Date(endTimeStr * 1000); // Convert seconds to milliseconds
			} else {
				endTime = new Date(endTimeStr); // Already in milliseconds
			}
		} else {
			console.error("Invalid end time format:", typeof endTimeStr, endTimeStr);
			return;
		}
		
		console.log("Parsed end time:", endTime);
		
		if (isNaN(endTime.getTime())) {
			console.error("Failed to parse end time into valid date");
			return;
		}
		
		// Store end time as a timestamp to avoid date object issues
		window.sessionEndTime = endTime.getTime();
		
		// Clear any existing timer
		if (window.timerInterval) {
			clearInterval(window.timerInterval);
		}
		
		// Start a new timer
		updateTimerDisplay();
		window.timerInterval = setInterval(updateTimerDisplay, 1000);
		
		console.log("Timer started successfully");
	} catch (error) {
		console.error("Error updating timer from server:", error);
	}
}

// Update timer display based on current time and stored end time
function updateTimerDisplay() {
	try {
		const timerElement = document.getElementById("timer");
		if (!timerElement) {
			console.error("Timer element not found");
			return;
		}
		
		if (!window.sessionEndTime) {
			console.error("Session end time not set");
			return;
		}
		
		// Calculate time left in milliseconds - using timestamps directly
		const now = new Date().getTime();
		const timeLeftMs = window.sessionEndTime - now;
		const timeLeft = Math.max(0, Math.floor(timeLeftMs / 1000));
		
		// Format time as MM:SS
		const minutes = Math.floor(timeLeft / 60);
		const seconds = timeLeft % 60;
		const formattedTime = 
			String(minutes).padStart(2, '0') + ':' + 
			String(seconds).padStart(2, '0');
		
		timerElement.textContent = 'Time remaining: ' + formattedTime;
		
		// Change color when less than 5 minutes
		if (timeLeft < 300) {
			timerElement.className = 'alert alert-warning';
		}
		
		// Change color when less than 1 minute
		if (timeLeft < 60) {
			timerElement.className = 'alert alert-danger';
		}
		
		// End session when timer reaches 0
		if (timeLeft <= 0) {
			clearInterval(window.timerInterval);
			
			// Remove the navigation warning
			window.onbeforeunload = null;
			
			// Mark the session as expired on the server
			if (window.socket && window.socket.readyState === WebSocket.OPEN) {
				window.socket.send(JSON.stringify({
					'type': 'expire_session',
					'room': document.getElementById('roomId').value
				}));
			}
			
			// Show alert and redirect
			alert('Your interview session has ended. Thank you for participating!');
			window.location.href = '/?refresh=1';
		}
	} catch (error) {
		console.error("Error updating timer display:", error);
	}
}

// Session timer function - now just sends a request to start the timer on the server
function startSessionTimer(seconds) {
	console.log("Starting session timer for", seconds, "seconds");
	const roomId = document.getElementById('roomId').value;
	
	if (!roomId) {
		console.error("Cannot start timer: roomId not available");
		return;
	}
	
	if (!window.socket || window.socket.readyState !== WebSocket.OPEN) {
		console.error("Cannot start timer: WebSocket not open");
		return;
	}
	
	console.log("Sending start_timer request to server for room", roomId);
	// Send request to start timer on the server
	try {
		window.socket.send(JSON.stringify({
			'type': 'start_timer',
			'room': roomId,
			'duration': seconds
		}));
	} catch (error) {
		console.error("Error sending start_timer request:", error);
	}
}

// Make startSessionTimer available globally
window.startSessionTimer = startSessionTimer;
window.onTextChange = onTextChange;
window.updateTimerDisplay = updateTimerDisplay;
window.updateTimerFromServer = updateTimerFromServer;

// Initialize the room when the page loads
document.addEventListener('DOMContentLoaded', function() {
	console.log("DOM loaded, initializing room (v3.0)");
	const roomIdElement = document.getElementById('roomId');
	if (roomIdElement) {
		const roomId = roomIdElement.value;
		if (roomId) {
			initRoom(roomId);
		} else {
			console.error("Room ID is empty");
		}
	} else {
		console.error("Room ID element not found");
	}
});