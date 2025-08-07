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
  console.log(configs)
  for (const c of configs) {
    const els = getWidgetEl(c.key, true);

    for (const el of els) {
      if (!el) continue;

      el.innerHTML = widgetTemplate;

      const container = el.querySelector(".wcw-widget-container");
      const stateContainer = el.querySelector(".wcw-state-container");
      const agentImg = el.querySelector(".wcw-agent-talking img");
      const quietImg = el.querySelector(".wcw-quiet");
      const textContainer = el.querySelector(".wcw-text-container");
      const titleEl = el.querySelector(".wcw-title");
      const subtextEl = el.querySelector(".wcw-subtext");
      
      // const rippleContainer = el.querySelector(".ripple-container");

      // Set agent image
      if (c.agent_image && agentImg) {
        agentImg.src = ''; // force reflow
        agentImg.src = c.agent_image;
    }
      // Set background color for state container and create CSS custom properties
      if (c.bgColor) {
        stateContainer.style.background = c.bgColor;
        container.style.setProperty('--accent-color', c.bgColor);
        
        // Create shadow color with opacity
        const shadowColor = hexToRgba(c.bgColor, 0.3);
        container.style.setProperty('--accent-shadow', shadowColor);
      }
      
      // Apply theme
      const theme = c.theme || "light";
      container.classList.add(`wcw-theme-${theme}`);

      // Handle idle icon
      if (c.idleIconUrl && quietImg) {
        quietImg.src = c.idleIconUrl;
      } else if (quietImg) {
        quietImg.src = micSvg;
      }

      // Handle text mode
      if (c.textMode && c.default_text && textContainer && titleEl && subtextEl) {
        container.classList.add("text-mode");
        container.classList.add("idle"); // Add idle class for text mode
        titleEl.textContent = c.default_text.title || "";
        subtextEl.textContent = c.default_text.subtext || "";
      } else {
        container.classList.remove("text-mode");
        container.classList.remove("idle");
        container.style.width = "auto";
        container.style.height = "auto";
        // Apply size configuration for non-text mode widgets
        const size = c.size 
        if (size === "small") {
          quietImg.style.width = "28px";
          quietImg.style.height = "28px";
          stateContainer.style.width = "120px";
          stateContainer.style.height = "120px";
        } else if (size === "medium") {
          stateContainer.style.width = "220px";
          stateContainer.style.height = "220px";
          quietImg.style.width = "38px";
          quietImg.style.height = "38px";
        } else if (size === "large") {
          stateContainer.style.width = "350px";
          stateContainer.style.height = "350px";
          quietImg.style.width = "48px";
          quietImg.style.height = "48px";
        }
      }
      
      // Apply positioning configuration
      const mode = c.mode || "embedded";
      const justification = c.justification || "center";
      
      if (mode === "overlay") {
        el.style.position = "fixed";
        el.style.zIndex = "9999";
        el.style.bottom = "20px";
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
        // Embedded mode
        el.style.position = "relative";
        el.style.zIndex = "auto";
        el.style.bottom = "auto";
        el.style.left = "auto";
        el.style.right = "auto";
        el.style.transform = "none";
        el.style.margin = "0";
        el.style.width = "100%";
        
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
      state[c.key].config = c; // Store the config for later use

      container.addEventListener("click", onPlayClicked(c.key));

      container.style.display = "flex";
    }
  }
}

// Helper function to convert hex color to rgba
function hexToRgba(hex, alpha) {
  if (!hex) return 'rgba(255, 107, 157, 0.3)';
  
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Convert 3-digit hex to 6-digit
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
    const callState = state[apiKey];
    const container = targetEl;

    const agentImg = container.querySelector(".wcw-agent-talking");
    const userEl = container.querySelector(".wcw-user-talking");
    const quietEl = container.querySelector(".wcw-quiet");
    const rippleContainer = container.querySelector(".ripple-container");
    const titleEl = container.querySelector(".wcw-title");
    const subtextEl = container.querySelector(".wcw-subtext");
    clearTimeout(callState.notTalkingTimeoutID);

    callState.talkingTimeoutID = setTimeout(() => {
      if (agentImg) agentImg.style.display = "flex";
      if (userEl) userEl.style.display = "none";
      if (quietEl) quietEl.style.display = "none";

      
      // Show ripple animation only when speakingAnimation is true and not in text mode
      if (!callState.config?.textMode && callState.config?.speakingAnimation && rippleContainer) {
        rippleContainer.style.display = "block";
      }
      
      // Update text content for text mode when agent is speaking
      if (container.classList.contains("text-mode") && titleEl && subtextEl) {
        titleEl.textContent = "Hello!";
        subtextEl.textContent = "I'm your AI assistant";
      }
      
      // Add agent speaking class for text mode styling
      container.classList.add("agent-speaking");
      
      // Remove idle class when agent starts talking for text mode
      if (callState.config?.textMode) {
        container.classList.remove("idle");
      }
      
      const rgb = hexToRgb(callState.config?.bgColor);
      container.style.boxShadow = `
      0 0 12px rgba(${rgb}, 0.6),
      0 0 24px rgba(${rgb}, 0.5),
      0 0 48px rgba(${rgb}, 0.3)
     `;
    }, 50);
  };
}

function onAgentStopTalking(apiKey, targetEl) {
  return () => {
    const callState = state[apiKey];
    const container = targetEl;

    const agentImg = container.querySelector(".wcw-agent-talking");
    const userEl = container.querySelector(".wcw-user-talking");
    const quietEl = container.querySelector(".wcw-quiet");
    const rippleContainer = container.querySelector(".ripple-container");
    const titleEl = container.querySelector(".wcw-title");
    const subtextEl = container.querySelector(".wcw-subtext");

    callState.notTalkingTimeoutID = setTimeout(() => {
      if (!callState.callInProgress) return;
      
      if (agentImg) agentImg.style.display = "none";
      if (userEl) userEl.style.display = "flex";
      if (quietEl) quietEl.style.display = "none";
      
      // Hide ripple animation only when speakingAnimation is true and not in text mode
      if (!callState.config?.textMode && callState.config?.speakingAnimation && rippleContainer) {
        rippleContainer.style.display = "none";
      }
      
      // Update text content for text mode when agent is listening
      if (container.classList.contains("text-mode") && callState.config?.textMode && titleEl && subtextEl) {
        titleEl.textContent = "Talk to me!";
        subtextEl.textContent = "Listening...";
      }
      
      // Remove agent speaking class
      container.classList.remove("agent-speaking");
      container.style.boxShadow = null;
      
    }, 1000);
  };
}

function onCallEnded(apiKey, targetEl) {
  return () => {
    const container = targetEl;
    const callState = state[apiKey];
    const agentImg = container.querySelector(".wcw-agent-talking");
    const userEl = container.querySelector(".wcw-user-talking");
    const quietEl = container.querySelector(".wcw-quiet");
    const loadingEl = container.querySelector(".wcw-loading");
    const rippleContainer = container.querySelector(".ripple-container");
    const titleEl = container.querySelector(".wcw-title");
    const subtextEl = container.querySelector(".wcw-subtext");

    callState.callInProgress = false;

    if (loadingEl) loadingEl.style.display = "none";
    if (agentImg) agentImg.style.display = "none";
    if (userEl) userEl.style.display = "none";
    if (quietEl) quietEl.style.display = "block";
    
    // Hide ripple animation only when speakingAnimation is true and not in text mode
    if (!callState.config?.textMode && callState.config?.speakingAnimation && rippleContainer) {
      rippleContainer.style.display = "none";
    }
    
    // Reset text content to original config values for text mode
    if (callState.config?.textMode && titleEl && subtextEl && callState.config && callState.config.default_text) {
      titleEl.textContent = callState.config.default_text.title || "";
      subtextEl.textContent = callState.config.default_text.subtext || "";
    }
    
    // Add idle class back for text mode when call ends
    if (callState.config?.textMode) {
      container.classList.add("idle");
    }
    
    // Remove agent speaking class
    container.classList.remove("agent-speaking");
    container.style.boxShadow = null;
    try {
      audioStream.getTracks().forEach(track => track.stop());
    } catch {
      console.log("Couldn't stop audio streams!")
    }
  };
}

function onCallStarted(apiKey, targetEl) {
  return () => {
    const container = targetEl;

    const agentImg = container.querySelector(".wcw-agent-talking");
    const loadingEl = container.querySelector(".wcw-loading");
    const quietEl = container.querySelector(".wcw-quiet");
    const rippleContainer = container.querySelector(".ripple-container");

    setTimeout(() => {
      if (loadingEl) loadingEl.style.display = "none";
      if (agentImg) agentImg.style.display = "flex";
      if (quietEl) quietEl.style.display = "none";
      
      // Show ripple animation only when speakingAnimation is true and not in text mode
      if (!callState.config?.textMode && callState.config?.speakingAnimation && rippleContainer) {
        rippleContainer.style.display = "block";
      }
      
      // Add agent speaking class for text mode styling
      container.classList.add("agent-speaking");
      
      // Remove idle class when call starts for text mode
      const callState = state[apiKey];
      if (callState.config?.textMode) {
        container.classList.remove("idle");
      }
    }, 500);
  };
}

async function startCall(apiKey, targetEl) {
  const hasMicPermission = await checkMicrophonePermission()

  if (!hasMicPermission) return

  state[apiKey].isLoading = true;

  const container = targetEl;

  const quietEl = container.querySelector(".wcw-quiet");
  const loadingEl = container.querySelector(".wcw-loading");

  if (loadingEl){ 
    loadingEl.style.display = "flex";
    loadingEl.style.justifyContent = "center";
    loadingEl.style.alignItems = "center";

  }
  if (quietEl) quietEl.style.display = "none";

  // Remove idle class when call starts for text mode
  if (state[apiKey].config?.textMode) {
    container.classList.remove("idle");
  }

  const headers = getDefaultApiHeaders(apiKey);

  const req = await fetch(createWebCallUrl, {
    method: "POST",
    headers: headers,
  });

  const res = await req.json();

  if (!req.ok) {
    throw new Error(`${req.status} ${req.statusText}`);
  }

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

function hexToRgb(hex) {
  hex = hex.replace("#", "");
  if (hex.length === 3) {
    hex = hex.split("").map(c => c + c).join(""); // Convert shorthand #abc → #aabbcc
  }
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`; // returns "173, 61, 225"
}
