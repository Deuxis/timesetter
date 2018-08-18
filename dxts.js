(function()
{
	"use strict";
	// TODO: Translations
	let days = [
	{
		enname: "Monday",
		code: "Mo"
	},
	{
		enname: "Tuesday",
		code: "Tu"
	},
	{
		enname: "Wednesday",
		code: "We"
	},
	{
		enname: "Thursday",
		code: "Th"
	},
	{
		enname: "Friday",
		code: "Fr"
	},
	{
		enname: "Saturday",
		code: "Sa"
	},
	{
		enname: "Sunday",
		code: "Su"
	}];
	let canvas, stringfield, ctx, colwidth, colheight, rowwidth, rowheight, row2height, quadheight;
	let selections = [],
		active_selection;

	init();

	function init()
	{
		canvas = document.getElementById('dxts_canvas');
		let stringcontainer = document.getElementById('dxts_stringfield');
		stringfield = stringcontainer.appendChild(document.createTextNode(""));
		doLabels();
		// All those calculations are so that the canvas is divided into even portions. Its dimensions get corrected to be the correct multiple of column width or row height if needed.
		colwidth = Math.floor(canvas.width / 7);
		canvas.width = rowwidth = colwidth * 7;
		rowheight = Math.floor(canvas.height / 24);
		canvas.height = colheight = rowheight * 24;
		row2height = rowheight * 2;
		quadheight = rowheight / 4;
		ctx = canvas.getContext('2d');
		drawBaseNew();
		canvas.addEventListener("pointerdown", pointerDown,
		{
			passive: false
		});
		canvas.addEventListener("pointerup", pointerUp,
		{
			passive: true
		});
	}

	function doLabels()
	{
		let wrapper = document.getElementById("dxts_gridwrapper");
		// Days
		for (let day of days)
		{
			let label = document.createElement("p");
			label.classList.add("dxts_uplabel");
			label.appendChild(document.createTextNode(day.enname));
			wrapper.appendChild(label);
		}
		// Hours
		for (var i = 0; i < 24; i++)
		{
			let label = document.createElement("p");
			label.classList.add("dxts_leftlabel");
			label.appendChild(document.createTextNode(i));
			wrapper.appendChild(label);
		}
	}

	function drawBase()
	{
		// Drawing full opaque:
		ctx.globalAlpha = 1.;
		// Hour rows:
		ctx.strokeStyle = "#333333";
		let rowstart = {
			x: 0,
			y: 0
		};
		// We only need to draw every second row:
		for (let i = 0; i < 12; i++)
		{
			ctx.strokeRect(rowstart.x, rowstart.y, rowwidth, rowheight);
			rowstart.y += row2height;
		}
		// Day columns:
		ctx.strokeStyle = "#000000";
		let colstart = {
			x: 0,
			y: 0
		};
		for (let i = 0; i < 7; i++)
		{
			ctx.strokeRect(colstart.x, colstart.y, colwidth, colheight);
			colstart.x += colwidth;
		}
	}

	function drawBaseNew() {
		// Drawing full opaque:
		ctx.globalAlpha = 1.;
		// Hour rows:
		ctx.beginPath();
		for (let i = 1; i < 24; i++) {
			let rowx = i * rowheight;
			ctx.moveTo(0, rowx);
			ctx.lineTo(canvas.width, rowx);
		}
		ctx.strokeStyle = "#333333";
		ctx.stroke();
		ctx.closePath();
		// Day columns:
		ctx.beginPath();
		for (let i = 1; i < 7; i++) {
			let coly = i * colwidth;
			ctx.moveTo(coly, 0);
			ctx.lineTo(coly, canvas.height);
		}
		ctx.strokeStyle = "#000000";
		ctx.stroke();
		ctx.closePath();
	}

	function drawSelection(selection)
	{
		// TODO: set alpha and colors
		ctx.fillRect(selection.start.x * colwidth, selection.start.y * quadheight, selection.end.x * colwidth, selection.end.y * quadheight);
	}

	function redraw()
	{
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		drawBaseNew();
		for (let selection of selections)
		{
			if (selection)
			{
				drawSelection(selection);
			}
		}
	}
	// Calculates column x (day)quarter table coordinates, used to draw the selection rectangle. The third argument determines if we want to calculate including the rectangle the coordinates are in.
	function calcTableCoordinates(x, y, including)
	{
		if (isNaN(x) || isNaN(y))
		{
			throw {
				name: "ReferenceError",
				message: "calcTableCoordinates called with NaN argument(s)"
			};
		}
		console.log("calcTableCoordinates raw: " + x + ", " + y);
		if (including) {
			x = Math.ceil(x / colwidth);
			y = Math.ceil(y / quadheight);
		}
		else {
			x = Math.floor(x / colwidth);
			y = Math.floor(y / quadheight);
		}
		console.log("calcTableCoordinates result: " + x + ", " + y + " (" + y / 4 + ")");
		return {
			x,
			y
		};
	}
	// Calculates day, hour, minutes objects, used to construct the opening hours string. Takes in table coordinates.
	function calcDayHour(coords)
	{
		let
		{
			x,
			y
		} = coords;
		let day = x;
		let hour = Math.floor(y / 4);
		let quarter = y % 4;
		let minutes;
		if (quarter < .25)
		{
			minutes = 0;
		}
		else if (quarter < .50)
		{
			minutes = 15;
		}
		else if (quarter < .75)
		{
			minutes = 30;
		}
		else
		{
			minutes = 45;
		}
		return {
			day,
			hour,
			minutes
		};
	}

	/*The most basic syntax is:
		Daycode-Daycode Hour:Minutes-Hour:Minutes; Daycode-Daycode Hour:Minutes-Hour:Minutes
	 */
	function generateTheString()
	{
		let thestring = "";
		for (let selection of selections)
		{
			if (!selection)
			{
				continue;
			}
			// If thestring already contains something (a previous loop iteration already inserted some rule):
			if (thestring != "")
			{
				thestring += "; ";
			}
			let sdayhour = calcDayHour(selection.start),
				edayhour = calcDayHour(selection.end);
			//console.dir(sdayhour);
			//console.dir(edayhour);
			if (sdayhour.day === 0 && sdayhour.hour === 0 && sdayhour.minutes === 0 && edayhour.day == 6 && edayhour.hour == 24)
			{
				return "24/7";
			}
			// We need two-digit minute codes, so if the minutes are zero change them to "00" string.
			sdayhour.minutes = sdayhour.minutes ? sdayhour.minutes : "00";
			edayhour.minutes = edayhour.minutes ? edayhour.minutes : "00";
			sdayhour.hour = (sdayhour.hour < 10)? "0" + sdayhour.hour : sdayhour.hour;
			edayhour.hour = (edayhour.hour < 10)? "0" + edayhour.hour : edayhour.hour;
			thestring += days[sdayhour.day].code;
			if (sdayhour.day != edayhour.day)
			{
				thestring += "-" + days[edayhour.day].code;
			}
			thestring += " " + sdayhour.hour + ":" + sdayhour.minutes + "-" + edayhour.hour + ":" + edayhour.minutes;
		}
		return thestring;
	}

	function updateTheString(content)
	{
		let temp = content ? content : generateTheString();
		console.log(temp);
		stringfield.textContent = temp;
	}

	function pointerDown(ev)
	{
		if (!ev.isPrimary)
		{
			console.log("Pointer not primary!");
			return true;
		}
		ev.preventDefault();
		let coords = calcTableCoordinates(ev.offsetX, ev.offsetY);
		active_selection = coords.x;
		if (ev.button == 2)
		{
			selections[active_selection] = undefined;
		}
		else {
			selections[active_selection] = {
				start:
				{
					x: coords.x,
					y: coords.y
				},
				end:
				{
					x: coords.x,
					y: coords.y
				}
			};
			ev.target.addEventListener("pointermove", pointerMove,
			{
				passive: true
			});
			window.addEventListener("pointerup", pointerUp,
			{
				passive: true
			});
		}
	}

	function pointerMove(ev)
	{
		if (!ev.isPrimary)
		{
			return true;
		}
		let coords = calcTableCoordinates(ev.offsetX, ev.offsetY);
		selections[active_selection].end = {
			x: coords.x,
			y: coords.y
		};
		redraw();
	}

	function pointerUp(ev)
	{
		if (!ev.isPrimary || ev.button == 2)
		{
			return true;
		}
		// If the selection's end is on an earlier day than the start, switch them around and assign the selection appropriately.
		if (selections[active_selection].end.x < selections[active_selection].start.x)
		{
			let thesel = selections[active_selection];
			selections[thesel.end.x] = {
				start:
				{
					x: thesel.end.x,
					y: thesel.end.y
				},
				end:
				{
					x: thesel.start.x,
					y: thesel.start.y
				}
			};
			selections[active_selection] = undefined;
			active_selection = thesel.end.x;
		}
		ev.target.removeEventListener("pointermove", pointerMove,
		{
			passive: true
		});
		window.removeEventListener("pointerup", pointerUp,
		{
			passive: true
		});
		updateTheString();
	}
})()
