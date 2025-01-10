import { RetellWebClient } from "../node_modules/retell-client-js-sdk";

const retellWebClient = new RetellWebClient();

var _onCallEnded;
var _onAgentStartTalking;
var _onAgentStopTalking;

var start_ava_call = async (
  accessToken,
  onCallEnded,
  onAgentStartTalking,
  onAgentStopTalking
) => {
  _onCallEnded = onCallEnded;
  _onAgentStartTalking = onAgentStartTalking;
  _onAgentStopTalking = onAgentStopTalking;

  await retellWebClient.startCall({
    accessToken: accessToken,
  });
};

var stop_ava_call = () => {
  retellWebClient.stopCall();
};

// When agent starts talking for the utterance
// useful for animation
retellWebClient.on("agent_start_talking", () => {
  if (_onAgentStartTalking) {
    _onAgentStartTalking();
  }
});

// When agent is done talking for the utterance
// useful for animation
retellWebClient.on("agent_stop_talking", () => {
  if (_onAgentStopTalking) {
    _onAgentStopTalking();
  }
});

// Update message such as transcript
// You can get transcrit with update.transcript
// Please note that transcript only contains last 5 sentences to avoid the payload being too large
retellWebClient.on("update", (update) => {});

retellWebClient.on("call_ended", () => {
  if (_onCallEnded) {
    _onCallEnded();
  }
});

retellWebClient.on("error", (error) => {
  // Stop the call
  retellWebClient.stopCall();
});

(window as any).start_ava_call = start_ava_call;
(window as any).stop_ava_call = stop_ava_call;
