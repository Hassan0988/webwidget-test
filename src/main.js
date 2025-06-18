import widgetTemplate from "@/widget-template.html?raw";
import { CallManager } from "@/call.lib";
import micSvg from "./mic.svg";
import "./style.css";

document.addEventListener("DOMContentLoaded", setupObserver);

const state = {
  /*
  [apiKey]: {callInProgress: boolean, isLoading: boolean, callInstance: retell instance obj, talkingTimeoutID: number, notTalkingTimeoutID: number}
*/
  isScanning: false,
};

const divAttrName = "data-widget-key";
const baseApiUrl = "https://xrur-hdnn-8wyr.n7c.xano.io/api:Jy1ozuiJ";
const getConfigsUrl = `${baseApiUrl}/widget-config-public`;
const createWebCallUrl = `${baseApiUrl}/createWebCallForWidget`;

const getDefaultApiHeaders = (apiKey) => ({
  "Content-Type": "application/json",
  "X-Data-Source": "staging",
  "X-Branch": "staging",
  ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
});

window.widgetLib = {};

window.widgetLib.scanWidgets = function () {
  scanForWidgets().finally(() => {
    state.isScanning = false;
  });
};

function $(q, all) {
  return all ? document.querySelectorAll(q) : document.querySelector(q);
}

function getWidgetEl(apiKey, all) {
  return $(`[${divAttrName}="${apiKey}"]`, all);
}

async function setupObserver() {
  await scanForWidgets().finally(() => {
    state.isScanning = false;
  });

  const observer = new MutationObserver(() => {
    scanForWidgets().finally(() => {
      state.isScanning = false;
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

async function scanForWidgets() {
  if (state.isScanning) return;

  state.isScanning = true;

  const widgets = $(`[${divAttrName}]`, true);

  // console.log({ widgets });

  const apiKeys = [
    ...new Set(
      Array.from(widgets, (el) => el.getAttribute(divAttrName)).filter(
        (k) => k && !(k in state)
      )
    ),
  ];

  const promises = apiKeys.map((k) => getWidgetConfig(k));

  const results = await Promise.allSettled(promises);

  const configs = apiKeys
    .map((k, i) => {
      if (results[i].status === "rejected") {
        state[k] = null;
      }

      if (results[i].status === "fulfilled") {
        return { key: k, ...results[i].value };
      }
    })
    .filter(Boolean);

  setupWidgets(configs);

}

function setupWidgets(configs) {
  for (const c of configs) {
    const els = getWidgetEl(c.key, true);

    for (const el of els) {
      if (!el) continue;

      el.innerHTML = widgetTemplate;

      const container = el.querySelector(".wcw-widget-container");
      const agentImg = el.querySelector(".wcw-agent-talking img");
      const stateContainer = el.querySelector(".wcw-state-container");
      const rippleContainer = el.querySelector(".ripple-container");
      const quietImg = el.querySelector(".wcw-quiet");

      agentImg.src = c.agent_image;
      stateContainer.style.background = c.bgColor;

      container.style.width = "120px";
      container.style.height = "auto";
      if (c.size === "medium") {
        container.style.width = "220px";
      }

      if (c.size === "large") {
        container.style.width = "350px";
      }

      if (c.speakingAnimation) {
        rippleContainer.style.display = "block";
      }

      if (c.idleIconUrl) {
        quietImg.src = c.idleIconUrl;
      } else {
        quietImg.src = micSvg;
      }
      
      // Apply new configuration options
      const mode = c.mode || "embedded"; // default to embedded
      const justification = c.justification || "center"; // default to center
      
      if (mode === "overlay") {
        el.style.position = "fixed";
        el.style.zIndex = "9999";
        el.style.bottom = "20px";
        
        // Reset any conflicting styles
        el.style.margin = "0";
        el.style.width = "auto";
        el.style.display = "block";
        
        switch (justification) {
          case "left":
            el.style.left = "20px";
            el.style.right = "auto";
            el.style.transform = "none";
            break;
          case "right":
            el.style.right = "20px";
            el.style.left = "auto";
            el.style.transform = "none";
            break;
          case "center":
          default:
            el.style.left = "50%";
            el.style.right = "auto";
            el.style.transform = "translateX(-50%)";
            break;
        }
      } else {
        // Embedded mode - apply justification
        el.style.position = "relative";
        el.style.zIndex = "auto";
        el.style.bottom = "auto";
        el.style.left = "auto";
        el.style.right = "auto";
        el.style.transform = "none";
        el.style.margin = "0";
        
        // Make sure the element takes full width of its container
        el.style.width = "100%";
        
        // Apply justification for embedded mode
        switch (justification) {
          case "left":
            el.style.display = "flex";
            el.style.justifyContent = "flex-start";
            break;
          case "right":
            el.style.display = "flex";
            el.style.justifyContent = "flex-end";
            break;
          case "center":
          default:
            el.style.display = "flex";
            el.style.justifyContent = "center";
            break;
        }
      }

      state[c.key] = {};
      state[c.key].callInProgress = false;

      container.addEventListener("click", onPlayClicked(c.key));

      container.style.display = "flex";
    }
  }
}

async function getWidgetConfig(apiKey) {
  const headers = getDefaultApiHeaders(apiKey);
  const req = await fetch(getConfigsUrl, {
    method: "GET",
    headers: headers,
  });

  const res = await req.json();

  if (!req.ok) {
    throw new Error(`${req.status} ${req.statusText}`);
  }

  return res;
}

function onPlayClicked(apiKey) {
  return (event) => {
    const callState = state[apiKey];

    if (callState.callInProgress) {
      callState.callInstance.stop();
    } else if (!callState.isLoading) {
      startCall(apiKey, event.currentTarget);
    }
  };
}

function onAgentStartTalking(apiKey, targetEl) {
  return () => {
    // console.log("agent is talking");
    const callState = state[apiKey];
    const el = targetEl;

    const agentImg = el.querySelector(".wcw-agent-talking");

    const userEl = el.querySelector(".wcw-user-talking");

    clearTimeout(callState.notTalkingTimeoutID);

    callState.talkingTimeoutID = setTimeout(() => {
      agentImg.style.display = "block";
      userEl.style.display = "none";
    }, 50);
  };
}

function onAgentStopTalking(apiKey, targetEl) {
  return () => {
    // console.log("agent stopped talking");
    const callState = state[apiKey];
    const el = targetEl;

    const agentImg = el.querySelector(".wcw-agent-talking");
    const userEl = el.querySelector(".wcw-user-talking");

    callState.notTalkingTimeoutID = setTimeout(() => {
      if (!callState.callInProgress) return;
      agentImg.style.display = "none";
      userEl.style.display = "flex";
    }, 1000);
  };
}

function onCallEnded(apiKey, targetEl) {
  return () => {
    const el = targetEl;
    const callState = state[apiKey];
    const agentImg = el.querySelector(".wcw-agent-talking");
    const userEl = el.querySelector(".wcw-user-talking");
    const quietEl = el.querySelector(".wcw-quiet");
    const loadingEl = el.querySelector(".wcw-loading");

    callState.callInProgress = false;

    loadingEl.style.display = "none";
    agentImg.style.display = "none";
    userEl.style.display = "none";
    quietEl.style.display = "block";

    try {
      audioStream.getTracks().forEach(track => track.stop());
    } catch {
      console.log("Couldn't stop audio streams!")
    }

  };
}

function onCallStarted(apiKey, targetEl) {
  return () => {
    const el = targetEl;

    const agentImg = el.querySelector(".wcw-agent-talking");
    const loadingEl = el.querySelector(".wcw-loading");

    setTimeout(() => {
      loadingEl.style.display = "none";
      agentImg.style.display = "block";
    }, 500);
  };
}

async function startCall(apiKey, targetEl) {
  const hasMicPermission = await checkMicrophonePermission()

  if (!hasMicPermission) return

  state[apiKey].isLoading = true;

  const el = targetEl;

  const quietEl = el.querySelector(".wcw-quiet");
  const loadingEl = el.querySelector(".wcw-loading");

  loadingEl.style.display = "block";
  quietEl.style.display = "none";

  const headers = getDefaultApiHeaders(apiKey);

  const req = await fetch(createWebCallUrl, {
    method: "POST",
    headers: headers,
  });

  const res = await req.json();

  if (!req.ok) {
    throw new Error(`${req.status} ${req.statusText}`);
  }

  // console.log(res);

  const accessToken = res.access_token;

  const call = new CallManager(accessToken, {
    onCallStarted: onCallStarted(apiKey, targetEl),
    onCallEnded: onCallEnded(apiKey, targetEl),
    onAgentStartTalking: onAgentStartTalking(apiKey, targetEl),
    onAgentStopTalking: onAgentStopTalking(apiKey, targetEl),
  });

  call.start();

  state[apiKey].callInProgress = true;
  state[apiKey].callInstance = call;
  state[apiKey].isLoading = false;

  // console.log({ call });
}

var audioStream = null;

async function checkMicrophonePermission() {
  try {
    let permissionStatus;

    try {
      permissionStatus = await navigator.permissions.query({ name: 'microphone' });

    } catch (e) {
      console.log('Permissions API not supported, proceeding with getUserMedia');
    }

    if (permissionStatus?.state === 'granted') {
      return true;
    }

    if (permissionStatus?.state === 'denied') {
      console.log('Microphone access was denied - please reset permission in browser settings');
      alert('Microphone permission was denied. Please reset the permission in your browser settings to try again.');
      return false;
    }

    audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return true;
  } catch (error) {
    console.error('Error accessing microphone:', error);

    if (error.name === 'NotAllowedError') {
      alert('Microphone access was denied. Please reset the permission in your browser settings to try again.');
    } else {
      alert('Error accessing microphone: ' + error.message);
    }

    return false;
  }
}
