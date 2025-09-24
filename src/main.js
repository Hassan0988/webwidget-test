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

  // Handle window resize to update mobile/desktop behavior
  window.addEventListener('resize', () => {
    updateWidgetMobileBehavior();
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
      if (c.textMode && c.mode=="overlay" && c.default_text && textContainer && titleEl && subtextEl) {
        container.classList.add("text-mode");
        
        // Check if hover mode is enabled (default to true if not specified)
        const isHoverMode = c.isHoverMode !== undefined ? c.isHoverMode : true;
        
        // Check if we're on mobile (screen width <= 480px)
        const isMobile = window.innerWidth <= 480;
        
        if (isMobile || !isHoverMode) {
          container.classList.add("always-expanded"); // Add class for always expanded behavior
        } else {
          container.classList.add("idle"); // Add idle class for hover behavior
        }
        
        titleEl.textContent = c.default_text.title || "";
        subtextEl.textContent = c.default_text.subtext || "";
        
        // Apply size configuration for text mode widgets (smaller than non-text mode)
        const size = c.size || "medium"; // Default to medium if no size specified
        
        // Add size class for CSS targeting
        container.classList.add(`text-mode-${size}`);
        
        // Apply dynamic sizing to text mode elements (smaller than non-text mode)
        if (size === "small") {
          // Small text mode - smaller than non-text mode
          stateContainer.style.width = "80px";
          stateContainer.style.height = "80px";
          quietImg.style.width = "24px";
          quietImg.style.height = "24px";
          titleEl.style.fontSize = "11px";
          subtextEl.style.fontSize = "10px";
        } else if (size === "medium") {
          // Medium text mode - smaller than non-text mode
          stateContainer.style.width = "100px";
          stateContainer.style.height = "100px";
          quietImg.style.width = "28px";
          quietImg.style.height = "28px";
          titleEl.style.fontSize = "13px";
          subtextEl.style.fontSize = "11px";
        } else if (size === "large") {
          // Large text mode - smaller than non-text mode
          stateContainer.style.width = "140px";
          stateContainer.style.height = "140px";
          quietImg.style.width = "36px";
          quietImg.style.height = "36px";
          titleEl.style.fontSize = "15px";
          subtextEl.style.fontSize = "13px";
        }
      } else {
        container.classList.remove("text-mode");
        container.classList.remove("idle");
        container.style.width = "auto";
        container.style.height = "auto";
        // Remove any text mode size classes
        container.classList.remove("text-mode-small", "text-mode-medium", "text-mode-large");
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
      state[c.key].summaryVisible = false;
      state[c.key].summaryGenerating = false;
      state[c.key].summaryTimeout = null;
      state[c.key].room = null;
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
        const isMobile = window.innerWidth <= 480;
        const isHoverMode = callState.config?.isHoverMode !== undefined ? callState.config.isHoverMode : true;
        
        container.classList.remove("idle");
        
        // Ensure always-expanded class is present on mobile or when hover mode is disabled
        if (isMobile || !isHoverMode) {
          container.classList.add("always-expanded");
        }
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
    
    // Add idle class back for text mode when call ends (but only on desktop with hover mode)
    if (callState.config?.textMode) {
      const isMobile = window.innerWidth <= 480;
      const isHoverMode = callState.config?.isHoverMode !== undefined ? callState.config.isHoverMode : true;
      
      // Remove both classes first to ensure clean state
      container.classList.remove("idle", "always-expanded");
      
      if (!isMobile && isHoverMode) {
        container.classList.add("idle");
      } else {
        container.classList.add("always-expanded");
      }
    }
    
    // Remove agent speaking class
    container.classList.remove("agent-speaking");
    container.style.boxShadow = null;
    
    // Show summary after call ends
    showSummary(apiKey, targetEl);
    
    try {
      audioStream.getTracks().forEach(track => track.stop());
    } catch {
      console.log("Couldn't stop audio streams!")
    }
  };
}

function onCallStarted(apiKey, targetEl) {
  return (e) => {
    const container = targetEl;
    const callState = state[apiKey];

    // Capture room ID from the call instance
    if (callState.callInstance && callState.callInstance.client && callState.callInstance.client.room) {
      callState.room = callState.callInstance.client.room?.roomInfo?.name || null;
      console.log('Room ID captured on call start:', callState.room);
    }

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
      if (callState.config?.textMode) {
        const isMobile = window.innerWidth <= 480;
        const isHoverMode = callState.config?.isHoverMode !== undefined ? callState.config.isHoverMode : true;
        
        container.classList.remove("idle");
        
        // Ensure always-expanded class is present on mobile or when hover mode is disabled
        if (isMobile || !isHoverMode) {
          container.classList.add("always-expanded");
        }
      }
    }, 500);
  };
}

async function startCall(apiKey, targetEl) {
  const hasMicPermission = await checkMicrophonePermission()

  if (!hasMicPermission) return

  // Hide summary if visible when starting a new call
  if (state[apiKey].summaryVisible) {
    hideSummary(apiKey, targetEl);
  }

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
    const isMobile = window.innerWidth <= 480;
    const isHoverMode = state[apiKey].config?.isHoverMode !== undefined ? state[apiKey].config.isHoverMode : true;
    
    container.classList.remove("idle");
    
    // Ensure always-expanded class is present on mobile or when hover mode is disabled
    if (isMobile || !isHoverMode) {
      container.classList.add("always-expanded");
    }
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

function updateWidgetMobileBehavior() {
  const isMobile = window.innerWidth <= 480;
  
  // Update all text mode widgets based on current screen size
  Object.keys(state).forEach(apiKey => {
    if (state[apiKey]?.config?.textMode) {
      const widgets = getWidgetEl(apiKey, true);
      const isHoverMode = state[apiKey].config?.isHoverMode !== undefined ? state[apiKey].config.isHoverMode : true;
      
      widgets.forEach(widget => {
        const container = widget.querySelector('.wcw-widget-container');
        if (container) {
          // Remove existing classes
          container.classList.remove('idle', 'always-expanded');
          
          // Apply appropriate class based on mobile state
          if (isMobile || !isHoverMode) {
            container.classList.add('always-expanded');
          } else {
            container.classList.add('idle');
          }
        }
      });
    }
  });
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

// Summary functionality
async function showSummary(apiKey, targetEl) {
  console.log('showSummary called for apiKey:', apiKey);
  const callState = state[apiKey];
  
  // Get the widget element that contains this target element
  const widgetEl = targetEl.closest(`[${divAttrName}="${apiKey}"]`);
  
  if (!widgetEl) {
    console.error('Widget element not found for apiKey:', apiKey);
    console.log('targetEl:', targetEl);
    console.log('Looking for attribute:', `${divAttrName}="${apiKey}"`);
    return;
  }
  
  console.log('Widget element found:', widgetEl);
  
  const summarySection = widgetEl.querySelector('.wcw-summary-section');
  
  if (!summarySection) {
    console.error('Summary section not found in widget');
    console.log('Widget HTML:', widgetEl.innerHTML);
    return;
  }
  
  const summaryLoader = summarySection.querySelector('.wcw-summary-loader');
  const summaryContent = summarySection.querySelector('.wcw-summary-content');
  const closeBtn = summarySection.querySelector('.wcw-summary-close');
  
  console.log('Summary elements found:', {
    summarySection: !!summarySection,
    summaryLoader: !!summaryLoader,
    summaryContent: !!summaryContent,
    closeBtn: !!closeBtn
  });
  
  // Show loader first
  summarySection.style.display = 'block';
  summaryLoader.style.display = 'flex';
  summaryContent.style.display = 'none';
  
  // Position summary after it's visible in the DOM
  setTimeout( () => {
    positionSummary(apiKey, widgetEl, summarySection);
  }, 10);
  
  console.log('Summary section display set to block');
  
  // Store summary state
  callState.summaryGenerating = true;
  callState.summaryVisible = true;
  
  // Start the summary fetching process after 5 seconds
  callState.summaryTimeout = setTimeout(() => {
    if (callState.room) {
      console.log('Starting summary fetch process for room:', callState.room);
      fetchSummaryWithRetry(apiKey, callState.room, summaryLoader, summaryContent, 0);
    } else {
      // No room ID, show default summary
      showDefaultSummary(summaryLoader, summaryContent);
      callState.summaryGenerating = false;
    }
  }, 5000);
  
  // Add close button handler
  if (closeBtn) {
    closeBtn.onclick = () => hideSummary(apiKey, targetEl);
  }
}

function hideSummary(apiKey, targetEl) {
  const callState = state[apiKey];
  const widgetEl = targetEl.closest(`[${divAttrName}="${apiKey}"]`);
  const summarySection = widgetEl.querySelector('.wcw-summary-section');
  const container = targetEl;
  
  // Clear any pending timeout
  if (callState.summaryTimeout) {
    clearTimeout(callState.summaryTimeout);
    callState.summaryTimeout = null;
  }
  
  // Add hiding animation class
  summarySection.classList.add('wcw-summary-hiding');
  
  // Reset widget position
  resetWidgetPosition(container);
  
  setTimeout(() => {
    summarySection.style.display = 'none';
    summarySection.classList.remove('wcw-summary-hiding');
    callState.summaryVisible = false;
    callState.summaryGenerating = false;
  }, 300);
}

function positionSummary(apiKey, widgetEl, summarySection) {
  const callState = state[apiKey];
  const config = callState.config;
  const wrapper = widgetEl.querySelector('.wcw-widget-wrapper');
  
  if (wrapper) {
    // Remove existing alignment classes
    wrapper.classList.remove('wcw-align-start', 'wcw-align-center', 'wcw-align-end');
    
    // Set alignment based on widget justification
    const justification = config.justification || 'center';
    
    switch (justification) {
      case 'left':
        wrapper.classList.add('wcw-align-start');
        break;
      case 'right':
        wrapper.classList.add('wcw-align-end');
        break;
      case 'center':
      default:
        wrapper.classList.add('wcw-align-center');
        break;
    }
  }
}

function resetWidgetPosition(container) {
  // No longer need to modify widget position since summary doesn't affect it
}

// Fetch summary with retry logic
async function fetchSummaryWithRetry(apiKey, roomId, summaryLoader, summaryContent, retryCount) {
  const maxRetries = 5;
  
  // Remove "web_" prefix if it exists, otherwise use room ID as is
  const cleanRoomId = roomId.startsWith('web_') ? roomId.substring(4) : roomId;
  
  console.log(`Attempt ${retryCount + 1}: Fetching summary for room:`, cleanRoomId);
  
  try {
    const headers = getDefaultApiHeaders(apiKey);
    const req = await fetch(`https://thinkrr.xano.io/api:Jy1ozuiJ:dev/call-summary?roomId=${cleanRoomId}`, {
      method: "GET",
      headers: headers,
    });
    
    if (req.ok) {
      const summaryData = await req.json();
      console.log('Summary response:', summaryData);
      
      if (summaryData.processed === true) {
        // Summary is ready, display it
        displaySummary(summaryLoader, summaryContent, summaryData.summary);
        return;
      } else {
        // Summary not ready yet
        console.log('Summary not processed yet, retrying...');
        
        if (retryCount < maxRetries - 1) {
          // Retry after 2 seconds
          setTimeout(() => {
            fetchSummaryWithRetry(apiKey, roomId, summaryLoader, summaryContent, retryCount + 1);
          }, 3000);
        } else {
          // Max retries reached, show default summary
          console.log('Max retries reached, showing default summary');
          showDefaultSummary(summaryLoader, summaryContent);
        }
      }
    } else {
      throw new Error(`API request failed: ${req.status} ${req.statusText}`);
    }
  } catch (error) {
    console.error('Error fetching summary:', error);
    
    if (retryCount < maxRetries - 1) {
      // Retry after 2 seconds
      setTimeout(() => {
        fetchSummaryWithRetry(apiKey, roomId, summaryLoader, summaryContent, retryCount + 1);
      }, 2000);
    } else {
      // Max retries reached, show default summary
      showDefaultSummary(summaryLoader, summaryContent);
    }
  }
}

// Display the summary from API response
function displaySummary(summaryLoader, summaryContent, summaryData) {
  const bodyEl = summaryContent.querySelector('.wcw-summary-body p');
  
  // Build content with title above description if title exists
  let content = '';
  
  if (summaryData.title) {
    content += `<strong>${summaryData.title}</strong><br>`;
  }
  
  if (summaryData.description) {
    content += summaryData.description;
  } else if (summaryData.content) {
    // Fallback to content if description is not available
    content += summaryData.content;
  }
  
  // Update the body content with HTML
  if (bodyEl) {
    bodyEl.innerHTML = content;
  }
  
  // Hide loader and show content
  summaryLoader.style.display = 'none';
  summaryContent.style.display = 'block';
  
  console.log('Summary displayed successfully');
}

// Show default summary when API fails or processing fails
function showDefaultSummary(summaryLoader, summaryContent) {
  const defaultSummary = {
    title: "I'm sorry I couldn't be more helpful this time.",
    description: "I'm still learning, but I'm getting smarter with every conversation. Please try again if you need to—I'm ready when you are!"
  };
  
  displaySummary(summaryLoader, summaryContent, defaultSummary);
  console.log('Default summary displayed');
}
