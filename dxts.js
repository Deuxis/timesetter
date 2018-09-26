(function()
{
	"use strict";
	// TODO: Translations
	let days = [
	{
		code: "Mo",
		enname: "Monday"
	},
	{
		code: "Tu",
		enname: "Tuesday"
	},
	{
		code: "We",
		enname: "Wednesday"
	},
	{
		code: "Th",
		enname: "Thursday"
	},
	{
		code: "Fr",
		enname: "Friday"
	},
	{
		code: "Sa",
		enname: "Saturday"
	},
	{
		code: "Su",
		enname: "Sunday"
	}];
	let constructed, ctx, colwidth, colheight, rowwidth, rowheight, quadheight;
	let selections = [],
		active_selection;

	let elements = {
		root: undefined,
		canvas: undefined,
		stringfield: undefined,
		button_reset: undefined,
		button_24: undefined,
		table: undefined,
		day_labels: [],
		hour_labels: []
	};

	init();

	/*
	 *  This constructs the required DOM structure. bound_field is the text field (usually text input) where the generated string will go; if undefined we create our own field. root_element is the element inside which we create the structure; if undefined and bound_field is defined, it is set to bound_field's parent. If both are undefined, it's set to document.body.
	 */
	function construct(bound_field, root_element)
	{
		if (root_element)
		{
			elements.root = root_element;
		}
		else
		{
			elements.root = bound_field ? bound_field.parentNode : document.body.appendChild(document.createElement("div"));
		}
		elements.root.classList.add("dxts");
		let domfragment = document.createDocumentFragment();
		if (bound_field)
		{
			elements.stringfield = bound_field;
		}
		else
		{
			elements.stringfield = document.createElement("textarea");
			domfragment.appendChild(elements.stringfield);
		}
		elements.button_reset = document.createElement("button");
		elements.button_reset.appendChild(document.createTextNode("Reset"));
		elements.button_reset.addEventListener("click", reset);
		domfragment.appendChild(elements.button_reset);
		elements.button_24 = document.createElement("button");
		elements.button_24.appendChild(document.createTextNode("24/7"));
		elements.button_24.addEventListener("click", set24);
		domfragment.appendChild(elements.button_24);
		elements.table = document.createElement("table");
		domfragment.appendChild(elements.table);
		let tbody = document.createElement("tbody");
		elements.table.appendChild(tbody);
		// I didn't come up with a more elegant solution to the "row" variable, so creating a separate scope so that it will die as soon as possible.
		{
			let placeholder = document.createElement("td");
			let row = tbody.insertRow();
			row.appendChild(placeholder);
			for (let i = 0; i < 7; i++)
			{
				elements.day_labels[i] = row.insertCell();
				elements.day_labels[i].classList.add("dxts-daylabel");
				elements.day_labels[i].appendChild(document.createTextNode(days[i].enname));
			}
		}
		for (var i = 0; i < 24; i++)
		{
			// We want strings like 01:00-02:00
			let string = String(i).padStart(2, "0") + ":00-" + String(i + 1).padStart(2, "0") + ":00";
			let row = tbody.insertRow();
			elements.hour_labels[i] = row.insertCell();
			elements.hour_labels[i].classList.add("dxts-hourlabel");
			elements.hour_labels[i].appendChild(document.createTextNode(string));
		}
		// All labels set up, table of correct size. Now create and insert the canvas (into the first non-label row).
		elements.canvas = document.createElement("canvas");
		let canvascell = tbody.children[1].insertCell();
		canvascell.setAttribute("colspan", "7");
		canvascell.setAttribute("rowspan", "24");
		canvascell.appendChild(elements.canvas);
		ctx = elements.canvas.getContext('2d');
		elements.canvas.addEventListener("pointerdown", pointerDown,
		{
			passive: false
		});
		elements.canvas.addEventListener("pointerup", pointerUp,
		{
			passive: true
		});
		elements.canvas.addEventListener("resize", resize,
		{
			passive: true
		});
		constructed = true;
		elements.root.appendChild(domfragment);
		resize();
	}

	function resize()
	{
		let canvas = elements.canvas;
		canvas.width = canvas.clientWidth;
		canvas.height = canvas.clientHeight;
		colwidth = elements.day_labels[0].clientWidth;
		colheight = canvas.height;
		rowwidth = canvas.width;
		rowheight = elements.hour_labels[0].clientHeight;
		quadheight = rowheight / 4;
	}

	function init()
	{
		if (!constructed)
		{
			construct();
		}
		redraw();
	}

	function redraw()
	{
		ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
		drawBase();
		for (let selection of selections)
		{
			if (selection)
			{
				drawSelection(selection);
			}
		}
	}

	function reset()
	{
		selections = [];
		active_selection = undefined;
		elements.stringfield.textContent = "";
		redraw();
	}

	function set24()
	{
		reset();
		selections[0] = {
			start: {
				x: 0,
				y: 0
			},
			end: {
				x: 6, // Sunday
				y: 96 // 24 * 4, last quadrant of last hour
			}
		};
		redraw();
		updateTheString();
	}

	function drawBase()
	{
		/*
		 * The authors of the Canvas2DContext API carefully analysed all the different coordinate systems and drawing conventions and masterfully chose the worst one for the job.
		 * Coordinates describe lines in-between pixels. All drawings are positioned by the coordinates. Therefore a 1px black vertical line at x 50 draws a 2px blurry grey line at 49th and 50th vertical pixel lines. Yes, really. They could've, of course, also made 0,0 be at offset 7 from the bottom-right corner, but I assume that the only reason they chose a somewhat saner approach is that if they didn't, people would realise it's intentional.
		 * As a result of such glorious design worthy of the 21st century, all coordinates are offset by 0.5. Don't worry, it makes my eyes bleed too.
		 */
		// Drawing full opaque:
		ctx.globalAlpha = 1.;
		// Hour rows:
		ctx.beginPath();
		for (let i = 1; i < 24; i++) // Starting from 1 and ending before 24 because we're skipping the edge lines, table border does them for us.
		{
			let rowx = i * rowheight + i - 0.5; // The line is drawn in the middle of the next border line (previous rows * rowheight + previous borders * 1px - 0.5)
			ctx.moveTo(0, rowx);
			ctx.lineTo(elements.canvas.width, rowx);
		}
		ctx.strokeStyle = "black";
		ctx.stroke();
		ctx.closePath();
		// Day columns:
		ctx.beginPath();
		for (let i = 1; i < 7; i++)
		{
			let coly = i * colwidth + i - 0.5;
			ctx.moveTo(coly, 0);
			ctx.lineTo(coly, elements.canvas.height);
		}
		ctx.strokeStyle = "black";
		ctx.stroke();
		ctx.closePath();
	}

	function drawSelection(selection)
	{
		let startx = selection.start.x * (colwidth + 1),
			starty = selection.start.y * (quadheight + 1),
			endx = (selection.end.x + 1) * (colwidth + 1),
			endy = (selection.end.y - 1) * (quadheight + 1);

		// TODO: fancy stuff
		ctx.save(); // Put current context state on stack
		ctx.globalAlpha = .5; // Half-opaque
		ctx.fillStyle = "blue";
		ctx.beginPath();
		ctx.moveTo(startx, starty);
		ctx.lineTo(endx, starty); // →
		ctx.lineTo(endx, endy); // ↓
		ctx.lineTo(startx, endy); // ←
		ctx.lineTo(startx, starty); // ↑
		ctx.fill();
		ctx.restore(); // Restore saved state, popping it from the stack
	}

	// Calculates column x (day)quarter table coordinates, used to draw the selection rectangle. The third argument determines if we want to calculate including the rectangle the coordinates are in.
	function calcTableCoordinates(x, y)
	{
		if (isNaN(x) || isNaN(y))
		{
			throw {
				name: "TypeError",
				message: "calcTableCoordinates called with NaN argument(s)"
			};
		}
		console.log("calcTableCoordinates raw: " + x + ", " + y);
		x = Math.floor(x / (colwidth + 1));
		y = Math.floor(y / (quadheight + 1));
		console.log("calcTableCoordinates result: " + x + ", " + y);
		return {
			x,
			y
		};
	}
	// Calculates {day, hour, minutes} objects, used to construct the opening hours string. Takes in table coordinates.
	function calcDayHour({x, y})
	{
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
			// We need two-digit minute codes, pad everything with zeroes
			sdayhour.minutes = String(sdayhour.minutes).padStart(2, "0");
			edayhour.minutes = String(edayhour.minutes).padStart(2, "0");
			sdayhour.hour = String(sdayhour.hour).padStart(2, "0");
			edayhour.hour = String(edayhour.hour).padStart(2, "0");
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
		elements.stringfield.textContent = temp;
	}

	function pointerDown(ev)
	{
		if (!ev.isPrimary)
		{
			console.log("Pointer not primary!"); // TEMP, will quit silently at release.
			return true;
		}
		ev.preventDefault();
		let coords = calcTableCoordinates(ev.offsetX, ev.offsetY);
		active_selection = coords.x;
		if (ev.button == 2)
		{
			selections[active_selection] = undefined;
		}
		else
		{
			selections[active_selection] = {
				start:
				{
					x: coords.x,
					y: coords.y
				},
				end:
				{
					x: coords.x + 1,
					y: coords.y + 1
				}
			};
			ev.target.addEventListener("pointermove", pointerMove,
			{
				passive: false
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
		ev.preventDefault();
		let coords = calcTableCoordinates(ev.offsetX, ev.offsetY, false);
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
