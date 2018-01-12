$(document).on('ready', () => {
	init();
});

var canvas;
var ctx;

var grid = [];

var gridWidth = 63;
var gridHeight = 63;

var cellSize;

function setSize() {
	let navbarHeight = $('.navbar').outerHeight();
	$('body > .container').css('padding-top', (navbarHeight + 20) + 'px');
	
	let verticalSpace = Math.floor($(window).height() - $('#canvas-col').offset().top) - Math.max($(window).height() - $('footer').offset().top + 20, 20);
	$('#canvas-col').height(verticalSpace);
	
	let canvasWidth = Math.min(Math.floor($('#canvas-col').width() / gridWidth) * gridWidth, Math.floor($('#canvas-col').height() / gridHeight) * gridWidth);
	let canvasHeight = Math.min(Math.round(canvasWidth * (gridHeight / gridWidth)), Math.floor($('#canvas-col').height() / gridHeight) * gridHeight);
	
	cellSize = Math.min(canvasWidth / gridWidth, canvasHeight / gridHeight);
	
	canvas.width = canvasWidth || 1;
	canvas.height = canvasHeight || 1;
	canvas.style.width = canvasWidth || 1;
	canvas.style.height = canvasHeight || 1;
	
	$('#canvas-col').height(canvasHeight);
}

var seed = '';
var minRoomDim = 5;
var maxRoomDim = 13;
var roomPlacementAttempts = 256;
var extraConnectionVal = 0.125;
var drawLines = false;

var rooms, connectionList;

function init() {
	canvas = document.getElementById('view');
	ctx = canvas.getContext('2d');
	if (!canvas || !ctx) {
		alert("Unable to initialize 2d drawing context. Your browser or machine may not support it.");
		return;
	}
	
	// set the canvas element's size
	setSize();
	$(window).on('resize', () => {
		setSize();
		draw();
	});
	
	$('#seed').val(seed);
	$('#min-room-size').val(minRoomDim);
	$('label[for=min-room-size] > .value').text(minRoomDim);
	$('#max-room-size').val(maxRoomDim);
	$('label[for=max-room-size] > .value').text(maxRoomDim);
	$('#room-placement-attempts').val(roomPlacementAttempts);
	$('label[for=room-placement-attempts] > .value').text(roomPlacementAttempts);
	$('#extra-room-connections').val(extraConnectionVal);
	$('label[for=extra-room-connections] > .value').text(extraConnectionVal);
	$('#show-graph').prop('checked', drawLines);
	
	$('#seed').on('input', event => {
		seed = $('#seed').val();
	});
	$('#min-room-size').on('input', event => {
		minRoomDim = $('#min-room-size').val();
		maxRoomDim = $('#max-room-size').val();
	});
	$('#max-room-size').on('input', event => {
		minRoomDim = $('#min-room-size').val();
		maxRoomDim = $('#max-room-size').val();
	});
	$('#room-placement-attempts').on('input', event => {
		roomPlacementAttempts = $('#room-placement-attempts').val();
	});
	$('#extra-room-connections').on('input', event => {
		extraConnectionVal = $('#extra-room-connections').val();
	});
	
	$('#generate').on('click', event => {
		generate();
	});
	
	$('#show-graph').on('click', event => {
		drawLines = $('#show-graph').prop('checked');
		draw();
	});
	$(document).on('keypress', event => {
		if (event.key === 'l') {
			drawLines = !drawLines;
			$('#show-graph').prop('checked', drawLines);
			draw();
		}
	});
	
	// generate a dungeon
	generate();
}

function generate() {
	// initialize or reset the grid
	for (var i = 0; i < gridHeight; i++) {
		grid[i] = [];
		for (var j = 0; j < gridWidth; j++) {
			grid[i][j] = 0;
		}
	}
	
	// set Math.random to use the predefined seed, or a random one
	let dungeonSeed = (seed && (seed + '').length > 0) ? seed : (Date.now() + '');
	Math.seedrandom(dungeonSeed);
	
	// randomly place rooms on the grid
	rooms = randomRooms(roomPlacementAttempts, minRoomDim, maxRoomDim);
	//console.log("Rooms: " + rooms.length);
	
	var fullConnectionList = graphConnections(rooms);
	connectionList = processConnections(fullConnectionList, rooms);
	//console.log("Connections: " + connectionList.length());
	
	connectionList.forEach((a, b) => {carveCorridor(rooms[a], rooms[b]);});
	
	for (var y = 0; y < gridHeight; y++) {
		for (var x = 0; x < gridWidth; x++) {
			if (grid[y][x] != 0) grid[y][x] = 1;
		}
	}
	
	draw();
	
	$('#view').attr('title', 'Rooms: ' + rooms.length + '\n' + 'Connections: ' + connectionList.length() + '\n' + 'Seed: ' + dungeonSeed);
}

function draw() {
	drawGrid();
	if (drawLines === true) drawConnections(connectionList, rooms);
}

function carveCorridor(startRoom, endRoom) {
	var start = new Cell(Math.floor((startRoom.centerCell().x - 1) / 2), Math.floor((startRoom.centerCell().y - 1) / 2));
	var end = new Cell((endRoom.centerCell().x - 1) / 2, (endRoom.centerCell().y - 1) / 2);
	var graph = [];
	for (var y = 0; (y * 2) + 1 < gridHeight; y++) {
		graph[y] = [];
		for (var x = 0; (x * 2) + 1 < gridWidth; x++) {
			if ((x * 2) + 1 >= startRoom.x && (x * 2) + 1 < startRoom.x + startRoom.width && (y * 2) + 1 >= startRoom.y && (y * 2) + 1 < startRoom.y + startRoom.height) {
				// set cells inside the starting room to have a weight of 1
				graph[y][x] = 1.1;
			} else if ((x * 2) + 1 >= endRoom.x && (x * 2) + 1 < endRoom.x + endRoom.width && (y * 2) + 1 >= endRoom.y && (y * 2) + 1 < endRoom.y + endRoom.height) {
				// mark cells within the target room as destinations
				graph[y][x] = -1;
				let tempCell;
				//if (start.manhattanDistanceTo(tempCell = new Cell(x, y)) < start.manhattanDistanceTo(end)) end = tempCell;
			} else {
				// set the weight of empty space to 1, and filled space to 10
				graph[y][x] = ((grid[(y * 2) + 1][(x * 2) + 1] === 0) ? 1 : (grid[(y * 2) + 1][(x * 2) + 1] === 666) ? 10 : 100);
			}
		}
	}
	// stores active cells, sorted by their priority
	var frontier = new PriorityQueue();
	// stores visited cells by their flattened coordinate
	var visited = new Map();
	
	start.priority = 0;
	start.costSoFar = 0;
	frontier.put(start);
	visited.set(start.flatten(), start);
	
	var current;
	while (!frontier.isEmpty()) {
		current = frontier.next();
		if (graph[current.y][current.x] === -1) break;
		for (var dir = 0; dir < 4; dir++) {
			var next = current.offset(dir);
			if (next.x < 0 || next.x >= (gridWidth - 1) / 2 || next.y < 0 || next.y >= (gridHeight - 1) / 2) continue;
			if (graph[next.y][next.x] === 0) continue;
			var newCost = current.costSoFar + graph[next.y][next.x];
			if (!visited.has(next.flatten()) || newCost < visited.get(next.flatten()).costSoFar) {
				next.costSoFar = newCost;
				next.cameFrom = current;
				next.prevDir = dir;
				next.priority = newCost + next.manhattanDistanceTo(end) + (dir === current.prevDir ? 0 : 0);
				visited.set(next.flatten(), next);
				
				frontier.put(next, (a, b) => {
					if (a.x === b.x && a.y === b.y) return 'replace';
					return (a.priority < b.priority ? -1 : a.priority > b.priority ? 1 : 0);
				});
			}
		}
	}
	
	while (current.cameFrom) {
		let temp = new Cell((current.x * 2) + 1, (current.y * 2) + 1);
		if (grid[temp.y][temp.x] === 0) grid[temp.y][temp.x] = 666;
		temp = temp.offset((current.prevDir % 2 === 0 ? current.prevDir + 1 : current.prevDir - 1));
		if (grid[temp.y][temp.x] === 0) grid[temp.y][temp.x] = 666;
		
		current = current.cameFrom;
	}
}

function PriorityQueue() {
	this.queue = [];
}
PriorityQueue.prototype.put = function(obj, comparator) {
	for (var i = this.queue.length - 1; i >= 0; i--) {
		if (comparator) {
			if (comparator(this.queue[i], obj) === 'replace') {
				this.queue[i] = obj;
				this.queue.sort(comparator);
				return;
			}
			// comparator should return a negative number if a < b, a postive number if a > b, or 0 if a === b
			if (comparator(this.queue[i], obj) < 0) return this.queue.splice(i + 1, 0, obj);
		} else {
			if (this.queue[i] < obj) return this.queue.splice(i + 1, 0, obj);
		}
	}
	return this.queue.unshift(obj);
}
PriorityQueue.prototype.next = function() {
	return this.queue.shift();
}
PriorityQueue.prototype.has = function(obj, comparator) {
	for (var i = 0; i < this.queue.length; i++) {
		if (comparator) {
			if (comparator(this.queue[i], obj)) return true;
		} else {
			if (this.queue[i] === obj) return true;
		}
	}
	return false;
}
PriorityQueue.prototype.isEmpty = function() {
	return this.queue.length === 0;
}

function graphConnections(rooms) {
	var list = new EdgeList(rooms.length);
	var tempList = new EdgeList(rooms.length);
	var points = [];
	for (var i = 0; i < rooms.length; i++) {
		points.push(rooms[i].centerPoint());
	}
	// get a list of all the triangles in the Delaunay triangulation of the rooms' centers
	var triArray = triangulate(points);
	// convert the list of triangles into a list of edges, including only edges shared by more than one triangle
	for (var i = triArray.length - 3; i >= 0; i -= 3) {
		let a = triArray[i], b = triArray[i + 1], c = triArray[i + 2];
		if (tempList.connected(a, b)) list.connect(a, b);
		if (tempList.connected(b, c)) list.connect(b, c);
		if (tempList.connected(a, c)) list.connect(a, c);
		tempList.connect(a, b);
		tempList.connect(b, c);
		tempList.connect(a, c);
	}
	return list;
}

/* creates a rectilinear minimum spanning tree from the delaunay triangulation of all the rooms
 * then re-inserts some of the removed connections */
function processConnections(connectionList, rooms) {
	var list = new EdgeList(rooms.length);
	var availableEdges = new EdgeList(rooms.length);
	connectionList.forEach((a, b) => {availableEdges.connect(a, b);});
	var connectedNodes = new Set();
	var extraEdges = [];
	
	connectedNodes.add(randomInt(rooms.length));
	
	var loop = true;
	while (loop) {
		var possibleConnections = [];
		for (var i of connectedNodes) {
			for (var j of availableEdges.list[i]) {
				possibleConnections.push({a: i, b: j, dist: dist(i, j)});
			}
		}
		possibleConnections.sort((a, b) => {return a.dist < b.dist ? -1 : a.dist > b.dist ? 1 : 0;});
		if (possibleConnections[0]) {
			var newEdge = possibleConnections[0];
			connectedNodes.add(newEdge.b);
			list.connect(newEdge.a, newEdge.b);
			for (var k of availableEdges.list[newEdge.b]) {
				if (connectedNodes.has(k)) {
					availableEdges.disconnect(k, newEdge.b);
					if (!list.connected(newEdge.b, k)) extraEdges.push({a: newEdge.b, b: k, dist: dist(newEdge.b, k)});
				}
			}
			if (connectedNodes.size === rooms.length) loop = false;
		} else {
			loop = false;
		}
	}
	
	// sort the removed edges by length, then add some of them back
	extraEdges.sort((a, b) => {return a.dist < b.dist ? -1 : a.dist > b.dist ? 1 : 0;});
	for (var i = 0; i < extraEdges.length * extraConnectionVal; i++) {
		var j = randomInt(extraEdges.length * 0.4);
		list.connect(extraEdges[j].a, extraEdges[j].b);
		extraEdges.splice(j, 1);
	}
	
	return list;
	
	function dist(a, b) {
		let midA = rooms[i].centerCell(), midB = rooms[j].centerCell();
		//return Math.abs(midB.x - midA.x) + Math.abs(midB.y - midA.y);
		return Math.hypot(midB.x - midA.x, midB.y - midA.y);
	}
}

function EdgeList(length) {
	this.list = new Array(length);
	for (var i = 0; i < length; i++) this.list[i] = new Set();
}
EdgeList.prototype.connected = function(a, b) {
	return this.list[a].has(b) || this.list[b].has(a);
};
EdgeList.prototype.connect = function(a, b) {
	this.list[a].add(b);
	this.list[b].add(a);
};
EdgeList.prototype.disconnect = function(a, b) {
	this.list[a].delete(b);
	this.list[b].delete(a);
};
EdgeList.prototype.length = function() {
	var length = 0;
	for (var a = 0; a < this.list.length; a++) {
		this.list[a].forEach(b => {
			if (a < b) length++;
		});
	}
	return length;
};
EdgeList.prototype.forEach = function(action) {
	for (var a = 0; a < this.list.length; a++) {
		this.list[a].forEach(b => {
			if (a < b) action(a, b);
		});
	}
};

function randomOdd(range) {
	return (Math.floor(Math.random() * (range / 2)) * 2) + 1;
}

function randomInt(range) {
	return Math.floor(Math.random() * range);
}

function decToHex(dec, padding) {
    var hex = (dec).toString(16);
    padding = padding || 2;

    while (hex.length < padding) hex = "0" + hex;

    return hex;
}

const dir = {
	"north": 0,
	"south": 1,
	"west": 2,
	"east": 3,
};
const dirs = ["north", "south", "west", "east"];

function Cell(x, y) {
	this.x = x;
	this.y = y;
}
Cell.prototype.offset = function(dir, amount) {
	amount = amount || 1;
	switch (dir) {
	case 0:
		return new Cell(this.x, this.y - amount);
	case 1:
		return new Cell(this.x, this.y + amount);
	case 2:
		return new Cell(this.x - amount, this.y);
	case 3:
		return new Cell(this.x + amount, this.y);
	}
};
Cell.prototype.flatten = function() {
	return (gridWidth * this.y) + this.x;
}
Cell.unflatten = function(flattened) {
	let x = flattened % gridWidth;
	let y = Math.floor(flattened / gridWidth);
	return new Cell(x, y);
}
Cell.prototype.distanceTo = function(target) {
	return Math.hypot(target.x - this.x, target.y - this.y);
}
Cell.prototype.manhattanDistanceTo = function(target) {
	return Math.abs(target.x - this.x) + Math.abs(target.y - this.y);
}

const colors = [
	"#1f1f1f",
	"#7f8faf",
	"#ff0000",
	"#0000ff",
];
function drawGrid() {
	for (var y = 0; y < gridHeight; y++) {
		for (var x = 0; x < gridWidth; x++) {
			ctx.fillStyle = colors[grid[y][x]] || "#ffffff";
			ctx.strokeStyle = "#000000";
			ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
			if (cellSize > 4) ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
		}
	}
}

function drawConnections(connectionList, rooms) {
	ctx.strokeStyle = "#ff000088";
	connectionList.forEach((i, j) => {
		let a = rooms[i].centerPoint();
		let b = rooms[j].centerPoint();
		ctx.beginPath();
		ctx.moveTo(a[0], a[1]);
		ctx.lineTo(b[0], b[1]);
		ctx.closePath();
		ctx.stroke();
	});
}

function floodFill(cell, oldRegion, fillRegion) {
	if (cell && (cell.x < 0 || cell.x >= gridWidth || cell.y < 0 || cell.y >= gridHeight)) return;
	if (grid[cell.y][cell.x] != oldRegion) return;
	grid[cell.y][cell.x] = fillRegion;
	for (var dir = 0; dir < 4; dir++) {
		var adj = cell.offset(dir);
		if (grid[adj.y][adj.x] === oldRegion) {
			floodFill(adj, oldRegion, fillRegion);
		}
	}
}

function stackFloodFill(start, oldRegion, fillRegion) {
	var cellStack = [];
	
	if (oldRegion === fillRegion) return;
	
	if (fill(start, oldRegion, fillRegion)) cellStack.push(start);
	while (cellStack.length > 0) {
		var cell = cellStack[cellStack.length - 1];
		
		var adjCell;
		if (fill(adjCell = cell.offset(0), oldRegion, fillRegion)) cellStack.push(adjCell);
		else if (fill(adjCell = cell.offset(1), oldRegion, fillRegion)) cellStack.push(adjCell);
		else if (fill(adjCell = cell.offset(2), oldRegion, fillRegion)) cellStack.push(adjCell);
		else if (fill(adjCell = cell.offset(3), oldRegion, fillRegion)) cellStack.push(adjCell);
		else cellStack.pop();
	}
	
	function fill(toFill, old, fill) {
		if (grid[toFill.y][toFill.x] != old) return false;
		grid[toFill.y][toFill.x] = fill;
		return true;
	}
}

function forceFill(oldRegion, fillRegion) {
	grid.map((column, y, cols) => {
		column.map((cellRegion, x, col) => {col[x] = (cellRegion === oldRegion ? fillRegion : cellRegion);});
	});
}

function randomRooms(attempts, minWidth, maxWidth) {
	var rooms = [];
	
	for (var i = 0; i < attempts; i++) {
		var width = ((minWidth % 2 === 1) ? minWidth - 1 : minWidth) + randomOdd((maxWidth - minWidth) + 1);
		var height = ((minWidth % 2 === 1) ? minWidth - 1 : minWidth) + randomOdd((maxWidth - minWidth) + 1);
		var x = randomOdd(gridWidth);
		var y = randomOdd(gridHeight);
		
		var room = new Room(x, y, width, height);
		if (room.place()) {
			rooms.push(room);
		}
	}
	
	return rooms;
}

function Room(x, y, width, height) {
	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;
	this.placed = false;
}
Room.prototype.centerPoint = function () {
	return [(this.x + (this.width / 2)) * cellSize, (this.y + (this.height / 2)) * cellSize];
}
Room.prototype.centerCell = function() {
	return new Cell(this.x + Math.ceil(this.width / 2), this.y + Math.ceil(this.height / 2));
}
Room.prototype.place = function() {
	if (!this.placed) {
		for (var y = this.y; y < this.y + this.height; y++) {
			for (var x = this.x; x < this.x + this.width; x++) {
				if (y < 0 || y >= gridHeight || x < 0 || x >= gridWidth || grid[y][x] != 0) return false;
			}
		}
		for (var y = this.y; y < this.y + this.height; y++) {
			for (var x = this.x; x < this.x + this.width; x++) {
				grid[y][x] = 1;
			}
		}
		this.placed = true;
		return true;
	}
}
Room.prototype.remove = function() {
	if (this.placed) {
		for (var y = this.y; y < this.y + this.height; y++) {
			for (var x = this.x; x < this.x + this.width; x++) {
				grid[y][x] = 0;
			}
		}
		this.placed = false;
		return true;
	}
}
