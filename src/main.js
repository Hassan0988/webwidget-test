import widgetTemplate from "@/widget-template.html?raw";
import { CallManager } from "@/retell";
import "./style.css";

const state = {
  /*
  [apiKey]: {callInProgress: boolean, isLoading: boolean, callInstance: retell instance obj, talkingTimeoutID: number, notTalkingTimeoutID: number}
*/
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

document.addEventListener("DOMContentLoaded", onPageLoad);

function $(q, all) {
  return all ? document.querySelectorAll(q) : document.querySelector(q);
}

function getWidgetEl(apiKey) {
  return $(`[${divAttrName}="${apiKey}"]`);
}

async function onPageLoad() {
  const widgets = $(`[${divAttrName}]`, true);

  // console.log({ widgets });

  const apiKeys = Array.from(widgets, (el) =>
    el.getAttribute(divAttrName)
  ).filter(Boolean);

  const promises = apiKeys.map((k) => getWidgetConfig(k));

  const results = await Promise.allSettled(promises);

  const configs = apiKeys
    .map((k, i) => {
      if (results[i].status === "fulfilled") {
        return { key: k, ...results[i].value };
      }
    })
    .filter(Boolean);

  // console.log({ apiKeys, results, configs });

  for (const c of configs) {
    const el = getWidgetEl(c.key);
    el.innerHTML = widgetTemplate;

    const container = el.querySelector(".ava-widget-container");
    const agentImg = el.querySelector(".ava-agent-talking img");
    const stateContainer = el.querySelector(".ava-state-container");
    const rippleContainer = el.querySelector(".ripple-container");

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

    state[c.key] = {};
    state[c.key].callInProgress = false;

    container.addEventListener("click", onPlayClicked(c.key));

    container.style.display = "block";
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
  return () => {
    const callState = state[apiKey];

    if (callState.callInProgress) {
      callState.callInstance.stop();
      callState.callInProgress = false;
    } else if (!callState.isLoading) {
      startCall(apiKey);
    }
  };
}

function onAgentStartTalking(apiKey) {
  return () => {
    // console.log("agent is talking");
    const callState = state[apiKey];
    const el = getWidgetEl(apiKey);

    const agentImg = el.querySelector(".ava-agent-talking");

    const userEl = el.querySelector(".ava-user-talking");

    clearTimeout(callState.notTalkingTimeoutID);

    callState.talkingTimeoutID = setTimeout(() => {
      agentImg.style.display = "block";
      userEl.style.display = "none";
    }, 50);
  };
}

function onAgentStopTalking(apiKey) {
  return () => {
    // console.log("agent stopped talking");
    const callState = state[apiKey];
    const el = getWidgetEl(apiKey);
    const agentImg = el.querySelector(".ava-agent-talking");
    const userEl = el.querySelector(".ava-user-talking");

    callState.notTalkingTimeoutID = setTimeout(() => {
      agentImg.style.display = "none";
      userEl.style.display = "flex";
    }, 1000);
  };
}

function onCallEnded(apiKey) {
  return () => {
    const el = getWidgetEl(apiKey);
    const agentImg = el.querySelector(".ava-agent-talking");
    const userEl = el.querySelector(".ava-user-talking");
    const quietEl = el.querySelector(".ava-quiet");

    agentImg.style.display = "none";
    userEl.style.display = "none";
    quietEl.style.display = "block";
  };
}

function onCallStarted(apiKey) {
  return () => {
    const el = getWidgetEl(apiKey);
    const agentImg = el.querySelector(".ava-agent-talking");
    const loadingEl = el.querySelector(".ava-loading");

    setTimeout(() => {
      loadingEl.style.display = "none";
      agentImg.style.display = "block";
    }, 500);
  };
}

async function startCall(apiKey) {
  state[apiKey].isLoading = true;

  const el = getWidgetEl(apiKey);

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
    onCallStarted: onCallStarted(apiKey),
    onCallEnded: onCallEnded(apiKey),
    onAgentStartTalking: onAgentStartTalking(apiKey),
    onAgentStopTalking: onAgentStopTalking(apiKey),
  });

  call.start();

  state[apiKey].callInProgress = true;
  state[apiKey].callInstance = call;
  state[apiKey].isLoading = false;

  // console.log({ call });
}
