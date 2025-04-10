import widgetTemplate from "@/widget-template.html?raw";
import { CallManager } from "@/retell";
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

  // console.log({ apiKeys, results, configs });

  for (const c of configs) {
    const els = getWidgetEl(c.key, true);

    for (const el of els) {
      if (!el) continue;

      el.innerHTML = widgetTemplate;

      const container = el.querySelector(".ava-widget-container");
      const agentImg = el.querySelector(".ava-agent-talking img");
      const stateContainer = el.querySelector(".ava-state-container");
      const rippleContainer = el.querySelector(".ripple-container");
      const quietImg = el.querySelector(".ava-quiet");

      agentImg.src = c.agent_image;
      stateContainer.style.background = c.bgColor;

      container.style.maxWidth = "120px";
      container.style.maxHeight = "120px";

      if (c.size === "medium") {
        container.style.maxWidth = "220px";
        container.style.maxHeight = "220px";
      }

      if (c.size === "large") {
        container.style.maxWidth = "350px";
        container.style.maxHeight = "350px";
      }

      if (c.speakingAnimation) {
        rippleContainer.style.display = "block";
      }

      if (c.idleIconUrl) {
        quietImg.src = c.idleIconUrl;
      } else {
        quietImg.src = micSvg;
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

    const agentImg = el.querySelector(".ava-agent-talking");

    const userEl = el.querySelector(".ava-user-talking");

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

    const agentImg = el.querySelector(".ava-agent-talking");
    const userEl = el.querySelector(".ava-user-talking");

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
    const agentImg = el.querySelector(".ava-agent-talking");
    const userEl = el.querySelector(".ava-user-talking");
    const quietEl = el.querySelector(".ava-quiet");
    const loadingEl = el.querySelector(".ava-loading");

    callState.callInProgress = false;

    loadingEl.style.display = "none";
    agentImg.style.display = "none";
    userEl.style.display = "none";
    quietEl.style.display = "block";
  };
}

function onCallStarted(apiKey, targetEl) {
  return () => {
    const el = targetEl;

    const agentImg = el.querySelector(".ava-agent-talking");
    const loadingEl = el.querySelector(".ava-loading");

    setTimeout(() => {
      loadingEl.style.display = "none";
      agentImg.style.display = "block";
    }, 500);
  };
}

async function startCall(apiKey, targetEl) {
  const hasMicPermission = await checkMicrophonePermission()

  if(!hasMicPermission) return
  
  state[apiKey].isLoading = true;

  const el = targetEl;

  const quietEl = el.querySelector(".ava-quiet");
  const loadingEl = el.querySelector(".ava-loading");

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

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
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
