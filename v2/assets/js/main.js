/// <reference types="jquery" />

const wsAdd = "ws://127.0.0.1:9998/ws";
const uiVersion = "1.02";

var ws
var lastSelectedHotfix;
var webSocketIntervalID;
var proxyVersion;
var presetsVisible = false;

var log = document.getElementById("log");
$(window).on("load", function () {
	var clearbtn = document.getElementById("clearButton");
	clearbtn.onclick = function () {
		clearChildElements("#log")
	}

	if (window.WebSocket === undefined) {
		var item = document.createElement("div");
		item.innerHTML = "<b>Your browser does not support WebSockets.</b>";
		log.append(item);
	}

	// Close the Preset dropdown if we click somewhere else that's unrelated
	$('html').on("click", function (e) {
		if (presetsVisible &&
			e.target != document.getElementById("presetBtn") &&
			e.target != document.getElementById("myInput")) {
			togglePresetView();
			presetsVisible = false;
		}
	});

	document.querySelector("#presetCollection").onchange = function (e) {
		var msg = {
			error: "ok",
			content: e.target.value,
			eventName: "selectedPresetChanged"
		}
		ws.send(JSON.stringify(msg));

		getHotfixList();
	}


	// ADD REMOTE HotfixURL
	document.querySelector("#addURLButton").onclick = function (event) {
		var url = prompt("Please enter the direct URL to a json- or txt-file!", "")
		if (url != null) {
			var msg = {
				error: "ok",
				content: url,
				eventName: "addNewHotfixURL"
			}
			ws.send(JSON.stringify(msg));
		}
	};

	// ADD LOCAL HotfixURL
	document.querySelector("#addLocalButton").onclick = function (event) {
		var msg = {
			error: "ok",
			content: "",
			eventName: "openFileDialog"
		}
		ws.send(JSON.stringify(msg));
	};

	// REFRESH HotfixURL
	document.querySelector("#refreshHotfixURLButton").onclick = function (event) {
		lastSelectedHotfix = document.querySelector("#hotfixSelection").value;
		getHotfixList();
		if (lastSelectedHotfix != null) {
			var msg = {
				error: "ok",
				content: lastSelectedHotfix,
				eventName: "getParameter"
			}
			ws.send(JSON.stringify(msg));
		}
	};

	// ADD Preset
	document.querySelector("#addPresetButton").onclick = function (event) {
		// var tmp = document.getElementById("presetBtn");
		var tmp = document.getElementById("presetCollection");
		var currentSlection = tmp.value.toString();

		var presetName;
		if (currentSlection !== null) {
			presetName = prompt("Please enter a name for this preset!", currentSlection);
		} else {
			presetName = prompt("Please enter a name for this preset!", "");
		}
		if (presetName != null) {
			var d = document.getElementById("hotfixSelection");
			var presetLinks = []
			d.childNodes.forEach(element => {
				element.childNodes.forEach(element2 => {
					if (element2.value !== undefined) {
						presetLinks.push(element2.value);
					}
				});
			});
			var presetData = {
				PresetName: presetName,
				Paths: presetLinks
			};

			var msg = {
				error: "ok",
				content: JSON.stringify(presetData),
				eventName: "addPreset"
			}
			ws.send(JSON.stringify(msg));
		}
		getAvailablePresets();
	};

	// Add MailItem SerialNumber
	document.querySelector("#btnAddSerialNumber").onclick = function (event) {
		sn = document.querySelector("#serialNumberInput").value;
		if (sn != null) {
			var msg = {
				error: "ok",
				content: sn,
				eventName: "addMailItem"
			}
			ws.send(JSON.stringify(msg));
			document.querySelector("#serialNumberInput").value = "";
		}
	};

	// Remove MailItem SerialNumber
	document.querySelector("#btnRemoveSerialNumber").onclick = function (event) {
		sn = document.querySelector("#mailItemSelection").value;
		if (sn != null) {
			var msg = {
				error: "ok",
				content: sn,
				eventName: "removeMailItem"
			}
			ws.send(JSON.stringify(msg));
		}
	};

	$("#proxyOpToggle").on("change", function (e) {
		var msg = {
			error: "ok",
			content: "false",
			eventName: "toggleOperationalMode"
		}
		if (ws !== null)
			ws.send(JSON.stringify(msg));
	});

	$("#internalOpToggle").on("change", function (e) {
		var msg = {
			error: "ok",
			content: "true",
			eventName: "toggleOperationalMode"
		}
		if (ws !== null)
			ws.send(JSON.stringify(msg));
	});

	$("#consoleOffToggle").on("change", function (e) {
		var msg = {
			error: "ok",
			content: "false",
			eventName: "toggleConsole"
		}
		if (ws !== null)
			ws.send(JSON.stringify(msg));
	});

	$("#consoleOnToggle").on("change", function (e) {
		var msg = {
			error: "ok",
			content: "true",
			eventName: "toggleConsole"
		}
		if (ws !== null)
			ws.send(JSON.stringify(msg));
	});

	$("#mergeToggle").on("change", function (e) {
		var msg = {
			error: "ok",
			content: "true",
			eventName: "toggleMerge"
		}
		if (ws !== null)
			ws.send(JSON.stringify(msg));
	});

	$("#replaceToggle").on("change", function (e) {
		var msg = {
			error: "ok",
			content: "false",
			eventName: "toggleMerge"
		}
		if (ws !== null)
			ws.send(JSON.stringify(msg));
	});

	$("#speedrunToggleOn").on("change", function (e) {
		var msg = {
			error: "ok",
			content: "true",
			eventName: "toggleSpeedrun"
		}
		if (ws !== null)
			ws.send(JSON.stringify(msg));
	});

	$("#speedrunToggleOff").on("change", function (e) {
		var msg = {
			error: "ok",
			content: "false",
			eventName: "toggleSpeedrun"
		}
		if (ws !== null)
			ws.send(JSON.stringify(msg));
	});

	$("#skipStartupMoviesToggleOn").on("change", function (e) {
		var msg = {
			error: "ok",
			content: "true",
			eventName: "toggleStartupMovies"
		}
		if (ws !== null)
			ws.send(JSON.stringify(msg));
	});

	$("#skipStartupMoviesToggleOff").on("change", function (e) {
		var msg = {
			error: "ok",
			content: "false",
			eventName: "toggleStartupMovies"
		}
		if (ws !== null)
			ws.send(JSON.stringify(msg));
	});
})

function openTabContent(evt, tabName) {
	var i, tabcontent, tablinks;
	tabcontent = document.getElementsByClassName("tabcontent");
	for (i = 0; i < tabcontent.length; i++) tabcontent[i].style.display = "none";

	tablinks = document.getElementsByClassName("tablinks");
	for (i = 0; i < tablinks.length; i++) tablinks[i].className = tablinks[i].className.replace(" active", "");

	document.getElementById(tabName).style.display = "block";
	evt.currentTarget.className += " active";
}

var wsOnOpen = function (msg) {
	console.log("WebSocket connected...");
	document.getElementById('proxyStatus').innerHTML = ("Connected").fontcolor("#01FC17");
	//document.getElementById('warningLabel').textContent = ''; // Empty the warning label 

	getAvailablePresets();
	getProxyVersion();
	getHotfixList();
	getItemSerials();
	getProxySettings();
}

var wsOnClose = function (msg) {
	console.log('Socket is closed. Reconnect will be attempted in 1 second.', msg.reason);
	document.getElementById('proxyStatus').innerHTML = ("Disconnected").fontcolor("#FB171E");
	//document.getElementById('warningLabel').textContent = 'WebSocket disconnected! Be patient until you see text in the logs.'; // Empty the warning label 
	ws = null;
	setTimeout(function () {
		initWs();
	}, 1000);
};

var wsOnError = function (msg) {
	console.log("Websocket Error: ", msg);
	ws.close();
}

var wsOnMessage = function (e) {
	let logParagraph = document.getElementById("log");
	try {
		var raw_binary_data = new Uint8Array(e.data);
		var resp = msgpack.decode(raw_binary_data);
		if (resp.EventName == "LogMessage") {
			// Set the font color of the specific logging types
			// ok = "green", error = "red", all others = "yellow"
			var ok = "#26B404";
			var error = "#FF1404";
			var others = "#F0C407";

			styledContent = resp.Content.toString().fontcolor((resp.Error == "ok" ? ok : (resp.Error == "error" ? error : others)));
			logParagraph.innerHTML = styledContent + "<br>" + logParagraph.innerHTML;
		} else if (resp.EventName == "presetList") {
			data = JSON.parse(resp.Content.toString())
			if (data !== null) {
				var d = document.getElementById("presetCollection");

				clearChildElements("#presetCollection")
				let elemCount = 1;
				if (data != null && data.length > 0) {
					data.forEach(element => {
						var newOption = new Option(elemCount + ". " + element, element, false, false);
						$("#presetCollection").append(newOption);
						$('#presetCollection').val(null); // Select the option with a value of '1'
						// $('#presetCollection').trigger('change'); // Notify any JS components that the value changed
						elemCount++;
					});
				}
			}
		} else if (resp.EventName == "proxyVersion") {
			proxyVersion = resp.Content.toString();
			let versionHeader = document.getElementById("proxyVersion");
			if (proxyVersion == uiVersion) {
				versionHeader.innerHTML = (proxyVersion).fontcolor("#01FC17");
			} else {
				versionHeader.innerHTML = (proxyVersion).fontcolor("#FB171E");
				var newVersionLink = document.getElementById("newVersionLink");
				newVersionLink.setAttribute("href", "https://github.com/c0dycode/BL3HotfixWebUI/releases/latest");
				newVersionLink.innerHTML = ("(Most recent version: " + uiVersion + "!)").fontcolor("#01FC17");
				newVersionLink.classList.toggle("disabled");
			}
		} else if (resp.EventName == "itemSerialsList") {
			clearChildElements("#mailItemSelection");
			if (resp.Content == "null") return;

			var d = document.getElementById("mailItemSelection");
			var serials = JSON.parse(resp.Content);

			let elemCount = 1;
			if (serials != null && serials.length > 0) {
				serials.forEach(element => {
					var item = document.createElement("option");
					item.innerText = elemCount + ". " + element;
					item.value = element;

					d.appendChild(item);
					elemCount++;
				});
			}
		} else if (resp.EventName == "hotfixList") {
			clearChildElements("#hotfixSelection")
			var hotfixes = JSON.parse(resp.Content);
			if (hotfixes == "null") return;

			var d = document.getElementById("hotfixSelection");
			let elemCount = 1;
			if (hotfixes != null && hotfixes.urls.length > 0) {
				for (let i = 0; i < hotfixes.urls.length; i++) {

					var item = document.createElement("tr");
					item.classList.add("hotfixRow");
					var td1 = document.createElement("td");
					td1.innerText = hotfixes.urls[i].id + ". " + hotfixes.urls[i].path;
					// td1.innerText = elemCount + ". " + element;
					td1.value = hotfixes.urls[i].path;

					var td2 = document.createElement("td");
					td2.classList.add("text-center");

					var td3 = document.createElement("td");
					td3.classList.add("text-center");

					var td4 = document.createElement("td");
					td4.classList.add("text-center");

					var td5 = document.createElement("td");
					td5.classList.add("text-center");

					var deleteBtn = document.createElement("button");
					deleteBtn.classList.add("btn");
					deleteBtn.setAttribute("type", "button");

					deleteBtn.addEventListener("click", () => {
						var msg = {
							error: "ok",
							content: hotfixes.urls[i].path,
							eventName: "removeHotfixURL"
						}
						ws.send(JSON.stringify(msg));
					})

					var toggleBtn = document.createElement("button");
					toggleBtn.classList.add("btn");
					toggleBtn.setAttribute("type", "button");
					toggleBtn.addEventListener("click", () => {
						var msg = {
							error: "ok",
							content: i.toString(),
							eventName: "toggleHotfixURL"
						}
						ws.send(JSON.stringify(msg));
						getHotfixList();
					})

					var moveUpBtn = document.createElement("button");
					moveUpBtn.classList.add("btn");
					moveUpBtn.setAttribute("type", "button");

					moveUpBtn.addEventListener("click", () => {
						var msg = {
							error: "ok",
							content: i.toString(),
							eventName: "moveHotfixURLUp"
						}
						ws.send(JSON.stringify(msg));
						getHotfixList();
					})

					var moveDownBtn = document.createElement("button");
					moveDownBtn.classList.add("btn");
					moveDownBtn.setAttribute("type", "button");
					moveDownBtn.addEventListener("click", () => {
						var msg = {
							error: "ok",
							content: i.toString(),
							eventName: "moveHotfixURLDown"
						}
						ws.send(JSON.stringify(msg));
						getHotfixList();
					})

					var deleteIcon = document.createElement("i");
					deleteIcon.classList.add("fas", "fa-trash");

					var toggleIcon = document.createElement("i");
					if (hotfixes.urls[i].path.includes("[DISABLED] ")) {
						toggleIcon.classList.add("fas", "fa-toggle-off");
					} else {
						toggleIcon.classList.add("fas", "fa-toggle-on");
					}

					var moveUpIcon = document.createElement("i");
					moveUpIcon.classList.add("fas", "fa-arrow-up");

					var moveDownIcon = document.createElement("i");
					moveDownIcon.classList.add("fas", "fa-arrow-down");

					deleteBtn.appendChild(deleteIcon);
					toggleBtn.appendChild(toggleIcon);
					moveUpBtn.appendChild(moveUpIcon);
					moveDownBtn.appendChild(moveDownIcon);
					td2.appendChild(deleteBtn);
					td3.appendChild(toggleBtn);
					td4.appendChild(moveUpBtn);
					td5.appendChild(moveDownBtn);
					item.appendChild(td1);
					item.appendChild(td2);
					item.appendChild(td3);
					item.appendChild(td4);
					item.appendChild(td5);


					d.appendChild(item);
					elemCount++;
				}
			}
		} else if (resp.EventName == "parameters") {
			var d = document.getElementById("parameters");

			clearChildElements("#parameters");

			var params = document.getElementById("parameters");
			var item = document.createElement("pre");
			formattedParam = "";
			try {
				let unpacked = window.pako.inflate(resp.Content, {
					to: 'string'
				});
				formattedParam = JSON.stringify(JSON.parse(unpacked), null, 4);
			} catch (e) {
				console.log(e);
				formattedParam = unpacked == "null" ? "N/A" : unpacked;
			}
			item.innerText = formattedParam;
			params.appendChild(item);

			if (lastSelectedHotfix != null)
				hfs = document.getElementById("hotfixSelection").value = lastSelectedHotfix;
		}
		else if (resp.EventName == "proxySettings") {
			var temp = JSON.parse(resp.Content);
			if (temp !== null) {
				$("#consoleOnToggle")[0].checked = temp.enableConsole == true;
				$("#consoleOffToggle")[0].checked = temp.enableConsole == false;
				$("#mergeToggle")[0].checked = temp.replaceHotfixes == false;
				$("#replaceToggle")[0].checked = temp.replaceHotfixes == true;


				$("#speedrunToggleOn")[0].checked = temp.speedrunmode;
				$("#speedrunToggleOn")[0].disabled = temp.CanToggleSpeedrun;
				$("#speedrunToggleOff")[0].checked = !temp.speedrunmode;
				$("#speedrunToggleOff")[0].disabled = temp.CanToggleSpeedrun;

				// if (temp.CanToggleSpeedrun != true) {
				// 	$("#lblSpeedrunMode")[0].innerHTML = "Speedrun Mode (forced until game is closed)";
				// } else {
				// 	$("#lblSpeedrunMode")[0].innerHTML = "Speedrun Mode";
				// }
				$('#presetCollection').val(temp.lastPreset);
				$('#presetCollection').trigger('change');
			}
		} else if (resp.EventName == "speedrunSetting") {
			var temp = JSON.parse(resp.Content);
			if (temp !== null) {
				$("#speedrunToggle")[0].disabled = !temp;
				// if (temp != true) {
				// 	$("#lblSpeedrunMode")[0].innerHTML = "Speedrun Mode (forced until game is closed)";
				// } else {
				// 	$("#lblSpeedrunMode")[0].innerHTML = "Speedrun Mode";
				// }
			}
		}
	} catch (e) {
		console.log(e);
	}
}

async function initWs() {
	ws = new WebSocket(wsAdd);
	ws.binaryType = 'arraybuffer';
	ws.onopen = wsOnOpen;
	ws.onmessage = wsOnMessage;
	ws.onclose = wsOnClose;
	ws.onerror = wsOnError;
}

function clearChildElements(nodeName) {
	var node = document.querySelector(nodeName);
	while (node && node.firstChild) {
		node.removeChild(node.firstChild);
	}
}

function getSelectedHotfixIndex() {
	return $('.hotfixItem.active').index();
}

/* When the user clicks on a hotfix-item,
toggle the 'active'-flag and remove it from any other currently active item*/
function hotfixItemClicked(e) {
	var children = Array.prototype.slice.call(document.getElementById("hotfixSelection").children);
	children.forEach(element => {
		// element.classList.toggle("active");
		element.classList.remove("active");
	});
	e.target.classList.add("active");
	console.log(getSelectedHotfixIndex(e.target));

	lastSelectedHotfix = e.target.getAttribute("data-value");
	var msg = {
		error: "ok",
		content: lastSelectedHotfix,
		eventName: "getParameter"
	}
	ws.send(JSON.stringify(msg));
	// e.target.toggle("active");
}

/* When the user clicks on the button,
toggle between hiding and showing the dropdown content */
function togglePresetView() {
	document.getElementById("myInput").value = "";
	filterFunction();

	if (!presetsVisible) {
		presetsVisible = true;
	} else {
		presetsVisible = false;
	}
	document.getElementById("presetDropdown").classList.toggle("show");
}

function filterFunction() {
	var input, filter, ul, li, a, i;
	input = document.getElementById("myInput");
	filter = input.value.toUpperCase();
	div = document.getElementById("presetDropdown");
	a = div.getElementsByTagName("label");
	for (i = 0; i < a.length; i++) {
		txtValue = a[i].textContent || a[i].innerText;
		if (txtValue.toUpperCase().indexOf(filter) > -1) {
			a[i].style.display = "";
		} else {
			a[i].style.display = "none";
		}
	}
}

function getHotfixList() {
	var msg = {
		error: "ok",
		content: "",
		eventName: "getHotfixList"
	}
	ws.send(JSON.stringify(msg));
}

function getItemSerials() {
	var msg = {
		error: "ok",
		content: "",
		eventName: "getMailItems"
	}
	ws.send(JSON.stringify(msg));
}

function getAvailablePresets() {
	var msg = {
		error: "ok",
		content: "",
		eventName: "getAvailablePresets"
	}
	ws.send(JSON.stringify(msg));
	getProxySettings();
}

function getProxySettings() {
	var msg = {
		error: "ok",
		content: "",
		eventName: "getProxySettings"
	}
	ws.send(JSON.stringify(msg));
}

function getProxyVersion() {
	var msg = {
		error: "ok",
		content: "",
		eventName: "getProxyVersion"
	}
	ws.send(JSON.stringify(msg));
}

// Trying to load delay first try of the connection
// as trying it too early might fail and delay the connection 
// for an unknown amount of time
$(window).on("load", function () {
	setTimeout(function () {
		initWs();
	}, 1000);
});