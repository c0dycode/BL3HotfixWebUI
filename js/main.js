/// <reference types="jquery" />

const wsAdd = "ws://127.0.0.1:9998/ws";

var ws;// = new WebSocket(wsAdd);
var lastSelectedHotfix;
var webSocketIntervalID;

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

    // DELETE HotfixURL
    document.querySelector("#deleteHotfixURLButton").onclick = function (event) {
        var url = document.querySelector("#hotfixSelection").value
        if (url != null) {
            var msg = {
                error: "ok",
                content: url,
                eventName: "removeHotfixURL"
            }
            ws.send(JSON.stringify(msg));
            clearChildElements("#parameters");
        }
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


    document.querySelector(".tablinks.last").onclick = function (event) {
        var decision = confirm("Would you like to exit? This will also turn off the proxy!")
        if (decision == true) {
            var msg = {
                error: "ok",
                content: lastSelectedHotfix,
                eventName: "quit"
            }
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
            var msg = {
                error: "ok",
                content: value.toString(),
                eventName: "toggleMerge"
            }
            if (ws !== null) {
                ws.send(JSON.stringify(msg));
            }
            console.log("mergeToggle has changed: ", value);
        }
    });

    document.querySelector("#defaultTab").click();
})

function openTabContent(evt, tabName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}


var wsOnOpen = function (msg) {
    //clearInterval(webSocketIntervalID);
    getHotfixList();
    getProxySettings();
}

var wsOnClose = function (msg) {
    console.log('Socket is closed. Reconnect will be attempted in 1 second.', msg.reason);
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
    let container = document.getElementById("log");
    try {
        var resp = JSON.parse(e.data);
        if (resp.eventName == "LogMessage") {
            var d = document.createElement("div");
            var item = document.createElement("p");
            item.innerText = resp.content;
            if (resp.error == "ok") {
                item.setAttribute("class", "logOk")
            } else if (resp.error == "error") {
                item.setAttribute("class", "logError")
            } else if (resp.error == "info") {
                item.setAttribute("class", "logInfo")
            }
            d.appendChild(item)
            container.prepend(d);
        } else if (resp.eventName == "hotfixList") {
            var d = document.getElementById("hotfixSelection");
            var hotfixes = JSON.parse(resp.content);

            clearChildElements("#hotfixSelection")

            if (hotfixes != null && hotfixes.length > 0) {
                hotfixes.forEach(element => {
                    var item = document.createElement("option");
                    item.innerText = element;
                    item.value = element;
                    d.appendChild(item);
                });
                d.onchange = function (e) {
                    lastSelectedHotfix = e.target.value;
                    var msg = {
                        error: "ok",
                        content: e.target.value,
                        eventName: "getParameter"
                    }
                    ws.send(JSON.stringify(msg));
                };
            }
        } else if (resp.eventName == "parameters") {
            var d = document.getElementById("parameters");

            clearChildElements("#parameters");

            var params = document.getElementById("parameters");
            var item = document.createElement("pre");
            item.innerText = resp.content;
            params.appendChild(item);

            if (lastSelectedHotfix != null) {
                let hfs = document.getElementById("hotfixSelection").value = lastSelectedHotfix;
            }
        } else if (resp.eventName == "proxySettings") {
            var temp = JSON.parse(resp.content);
            if (temp !== null) {
                $("#mergeToggle > input")[0].checked = !temp.replaceHotfixes;
            }
        }
    } catch (e) {
        console.log(e);
    }
}

async function initWs() {
    ws = new WebSocket(wsAdd);
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

function getProxySettings() {
    var msg = {
        error: "ok",
        content: "",
        eventName: "getProxySettings"
    }
    ws.send(JSON.stringify(msg));
}

initWs();