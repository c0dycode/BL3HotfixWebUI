/// <reference types="jquery" />

const wsAdd = "ws://127.0.0.1:9998/ws";
const uiVersion = "1.00";

var ws
var lastSelectedHotfix;
var webSocketIntervalID;
var proxyVersion;

var log = document.getElementById("log");

$(window).on("load", function () {
    var clearbtn = document.getElementById("clearButton");
    clearbtn.onclick = function () { clearChildElements("#log") }

    if (window.WebSocket === undefined) {
        var item = document.createElement("div");
        item.innerHTML = "<b>Your browser does not support WebSockets.</b>";
        log.append(item);
    }

    // ADD REMOTE HotfixURL
    document.querySelector("#addURLButton").onclick = function (event) {
        var url = prompt("Please enter the direct URL to a json- or txt-file!", "")
        if (url != null) {
            var msg = { error: "ok", content: url, eventName: "addNewHotfixURL" }
            ws.send(JSON.stringify(msg));
        }
    };

    // ADD LOCAL HotfixURL
    document.querySelector("#addLocalButton").onclick = function (event) {
        var msg = { error: "ok", content: "", eventName: "openFileDialog" }
        ws.send(JSON.stringify(msg));
    };

    // DELETE HotfixURL
    document.querySelector("#deleteHotfixURLButton").onclick = function (event) {
        var url = document.querySelector("#hotfixSelection").value
        if (url != null) {
            var msg = { error: "ok", content: url, eventName: "removeHotfixURL" }
            ws.send(JSON.stringify(msg));
            clearChildElements("#parameters");
        }
    };

    // REFRESH HotfixURL
    document.querySelector("#refreshHotfixURLButton").onclick = function (event) {
        lastSelectedHotfix = document.querySelector("#hotfixSelection").value;
        getHotfixList();
        if (lastSelectedHotfix != null) {
            var msg = { error: "ok", content: lastSelectedHotfix, eventName: "getParameter" }
            ws.send(JSON.stringify(msg));
        }
    };

    // Add MailItem SerialNumber
    document.querySelector("#btnAddSerialNumber").onclick = function (event) {
        sn = document.querySelector("#serialNumberInput").value;
        if (sn != null) {
            var msg = { error: "ok", content: sn, eventName: "addMailItem" }
            ws.send(JSON.stringify(msg));
            document.querySelector("#serialNumberInput").value = "";
        }
    };

    // Remove MailItem SerialNumber
    document.querySelector("#btnRemoveSerialNumber").onclick = function (event) {
        sn = document.querySelector("#mailItemSelection").value;
        if (sn != null) {
            var msg = { error: "ok", content: sn, eventName: "removeMailItem" }
            ws.send(JSON.stringify(msg));
        }
    };

    // Move HotfixURL Up - lower priority
    document.querySelector("#moveURLUpButton").onclick = function (event) {
        lastSelectedHotfix = document.querySelector("#hotfixSelection").value;
        let index = document.querySelector("#hotfixSelection").selectedIndex;

        var msg = { error: "ok", content: index.toString(), eventName: "moveHotfixURLUp" }
        ws.send(JSON.stringify(msg));

        getHotfixList();
        if (lastSelectedHotfix != null) {
            var msg = { error: "ok", content: lastSelectedHotfix, eventName: "getParameter" }
            ws.send(JSON.stringify(msg));
        }
    };

    // Move HotfixURL Down - higher priority
    document.querySelector("#moveURLDownButton").onclick = function (event) {
        lastSelectedHotfix = document.querySelector("#hotfixSelection").value;
        let index = document.querySelector("#hotfixSelection").selectedIndex;

        var msg = { error: "ok", content: index.toString(), eventName: "moveHotfixURLDown" }
        ws.send(JSON.stringify(msg));

        getHotfixList();
        if (lastSelectedHotfix != null) {
            var msg = { error: "ok", content: lastSelectedHotfix, eventName: "getParameter" }
            ws.send(JSON.stringify(msg));
        }
    };

    document.querySelector(".tablinks.last").onclick = function (event) {
        var decision = confirm("Would you like to exit? This will also turn off the proxy!")
        if (decision == true) {
            var msg = { error: "ok", content: lastSelectedHotfix, eventName: "quit" }
            ws.send(JSON.stringify(msg));

            var d = document.createElement("div");
            var item = document.createElement("p");
            item.innerText = "You can now close this window/tab!";
            item.setAttribute("class", "logInfo");

            d.appendChild(item)
            log.prepend(d);
        }
    };

    $("#mergeToggle").on("change", function (e) {
        var value = $("#mergeToggle > input")[0].checked;
        if (value !== null) {
            var msg = { error: "ok", content: value.toString(), eventName: "toggleMerge" }
            if (ws !== null)
                ws.send(JSON.stringify(msg));
            console.log("mergeToggle has changed: ", value);
        }
    });

    $("#speedrunToggle").on("change", function (e) {
        var value = $("#speedrunToggle > input")[0].checked;
        if (value !== null) {
            var msg = { error: "ok", content: value.toString(), eventName: "toggleSpeedrun" }
            if (ws !== null)
                ws.send(JSON.stringify(msg));
            console.log("speedrunToggle has changed: ", value);
        }
    });

    document.querySelector("#defaultTab").click();
})

function openTabContent(evt, tabName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++)  tabcontent[i].style.display = "none";

    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) tablinks[i].className = tablinks[i].className.replace(" active", "");

    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}

var wsOnOpen = function (msg) {
    console.log("WebSocket connected...");
    document.getElementById('warningLabel').textContent = ''; // Empty the warning label 

    getProxyVersion();
    getHotfixList();
    getItemSerials();
    getProxySettings();
}

var wsOnClose = function (msg) {
    console.log('Socket is closed. Reconnect will be attempted in 1 second.', msg.reason);
    document.getElementById('warningLabel').textContent = 'WebSocket disconnected! Connection can take a bit. Be patient until you see info in the Log below!'; // Empty the warning label 
    ws = null;
    setTimeout(function () { initWs(); }, 1000);
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
            styledContent = resp.Content.toString().fontcolor((resp.Error == "ok" ? "green" : (resp.Error == "error" ? "red" : "yellow")));
            logParagraph.innerHTML = styledContent + "<br>" + logParagraph.innerHTML;
        }
        else if (resp.EventName == "proxyVersion") {
            proxyVersion = resp.Content.toString();
            let versionHeader = document.getElementById("versionHeader");
            if (proxyVersion == uiVersion) {
                versionHeader.innerHTML = ("Version: " + proxyVersion).fontcolor("green");
            }
            else {
                versionHeader.innerHTML = ("Version: " + proxyVersion + " (Most recent version: " + uiVersion + "!)").fontcolor("red");
            }
        }
        else if (resp.EventName == "itemSerialsList") {
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
        }
        else if (resp.EventName == "hotfixList") {
            if (resp.Content == "null") return;

            var d = document.getElementById("hotfixSelection");
            var hotfixes = JSON.parse(resp.Content);

            clearChildElements("#hotfixSelection")
            let elemCount = 1;
            if (hotfixes != null && hotfixes.length > 0) {
                hotfixes.forEach(element => {
                    var item = document.createElement("option");
                    item.innerText = elemCount + ". " + element;
                    item.value = element;

                    d.appendChild(item);
                    elemCount++;
                });
                d.onchange = function (e) {
                    lastSelectedHotfix = e.target.value;
                    var msg = { error: "ok", content: e.target.value, eventName: "getParameter" }
                    ws.send(JSON.stringify(msg));
                };
            }
        }
        else if (resp.EventName == "parameters") {
            var d = document.getElementById("parameters");

            clearChildElements("#parameters");

            var params = document.getElementById("parameters");
            var item = document.createElement("pre");
            formattedParam = "";
            try {
                let unpacked = window.pako.inflate(resp.Content, { to: 'string' });
                formattedParam = JSON.stringify(JSON.parse(unpacked), null, 4);
            } catch (e) { formattedParam = unpacked == "null" ? "N/A" : unpacked; }
            item.innerText = formattedParam;
            params.appendChild(item);

            if (lastSelectedHotfix != null)
                hfs = document.getElementById("hotfixSelection").value = lastSelectedHotfix;
        }
        else if (resp.EventName == "proxySettings") {
            var temp = JSON.parse(resp.Content);
            if (temp !== null) {
                $("#mergeToggle > input")[0].checked = !temp.replaceHotfixes;
                $("#speedrunToggle > input")[0].checked = temp.speedrunmode;
                $("#speedrunToggle > input")[0].disabled = !temp.CanToggleSpeedrun;

                if (temp.CanToggleSpeedrun != true) {
                    $("#lblSpeedrunMode")[0].innerHTML = "Speedrun Mode (forced until game is closed)";
                }
                else {
                    $("#lblSpeedrunMode")[0].innerHTML = "Speedrun Mode";
                }
            }
        }
        else if (resp.EventName == "speedrunSetting") {
            var temp = JSON.parse(resp.Content);
            if (temp !== null) {
                $("#speedrunToggle > input")[0].disabled = !temp;
                if (temp != true) {
                    $("#lblSpeedrunMode")[0].innerHTML = "Speedrun Mode (forced until game is closed)";
                }
                else {
                    $("#lblSpeedrunMode")[0].innerHTML = "Speedrun Mode";
                }
            }
        }
    }
    catch (e) {
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
    while (node.lastElementChild) {
        node.removeChild(node.lastElementChild);
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
$(window).load(function () {
    setTimeout(function () {
        initWs();
    }, 1000);
});
