function onPlayClicked(token, agentId){
    const apiUrl = "https://xrur-hdnn-8wyr.n7c.xano.io/api:Jy1ozuiJ:dev/createWebCallForWidget?x-data-source=staging";
    const bearerToken = token; 
    const agentUuid = agentId;

    if (ava_playing) {
        stop_ava_call();
        onCallEnded();
        return;
    }
    ava_playing = true;

    fetch(apiUrl, {
        method: "POST", // Use the appropriate HTTP method (e.g., POST, PUT, DELETE)
        headers: {
            "Content-Type": "application/json", // Adjust if the content type differs
            Authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({
            agent_uuid: agentUuid, // Pass agent_uuid as a parameter
        })
    })
    .then((response) => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        return response.json(); // Parse JSON if the response is JSON
    })
    .then((data) => {
        start_ava_call(data.access_token, onCallEnded, onAgentStartTalking, onAgentStopTalking);
        // start_ava_call(data.access_token);
    })
    .catch((error) => {
        console.error("Error:", error);
    });
}

ava_playing = false;

ava_agent_talking_timeout_id = 0;

function onCallEnded() {
    ava_playing = false;
    const element = document.getElementById('playButton');
    element.className = 'ava-not-started';
}

function onAgentStartTalking() {
    clearTimeout(ava_agent_talking_timeout_id);
    const element = document.getElementById('playButton');
    element.className = 'ava-agent-talking';
}

function onAgentStopTalking() {
    clearTimeout(ava_agent_talking_timeout_id);
    ava_agent_talking_timeout_id = setTimeout(() => {
        const element = document.getElementById('playButton');
        element.className = 'ava-user-talking';
    }, 1000);

}

function onLoad(){

    // Define your HTML markup as a string
const htmlMarkup = `
<style>
        .ava-agent-talking {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            background: url('https://i.ibb.co/9TXggCD/Agent.jpg') no-repeat center center;
            background-size: cover;
            box-shadow: rgba(0, 0, 0, 0.3) 0px 4px 8px;
        }

        .ava-agent-talking img, .ava-user-talking img {
            display: none;
        }

        .ava-not-started {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            background: linear-gradient(to right, rgb(234, 89, 115), rgb(168, 52, 176));
            box-shadow: rgba(0, 0, 0, 0.3) 0px 4px 8px;
        }

        .ava-not-started #user-talking,
        .ava-agent-talking #user-talking {
            display: none;
        }

        .ava-user-talking {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            background: linear-gradient(to right, rgb(234, 89, 115), rgb(168, 52, 176));
            box-shadow: rgba(0, 0, 0, 0.3) 0px 4px 8px;
        }

        .ava-widget-container {
            width: 180px;
            height: 180px;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 10px;
            background-color: transparent;
            border: 2px solid rgb(109, 153, 241);
            box-shadow: rgba(58, 174, 248, 0.3) 0px 18.19px 63.67px 0px;
            cursor: pointer;
        }

        .wave-bar {
            width: 6px;
            height: 30px;
            margin: 0 2px;
            background-color: white;
            border-radius: 3px;
            animation: wave-animation 1s ease-in-out infinite;
        }

        @keyframes wave-animation {

            0%,
            100% {
                height: 20px;
            }

            50% {
                height: 40px;
            }
        }

        .talktoava {
            width: 120px;
        }

        .widget-img {
            background-size: contain !important;
        }

        @keyframes waves {
            0% {
                opacity: 1;
                transform: scale(1);
            }

            100% {
                opacity: 0;
                transform: scale(3);
            }
        }
    </style>
    <div style="position: relative; width: 180px; height: 180px; cursor:pointer;">
        <div onclick="onPlayClicked(ava_user_token, ava_agent_uuid);" style="width:100%;height:100%">
            <div  id="playButton" class="ava-not-started">
                <img src="https://i.ibb.co/DCcGD8H/microphone-2.png" alt="Microphone Icon"
                    style="width: 60px; height: 60px; transition: transform 0.3s; transform: scale(1);">
                <div id="user-talking">
                    <div
                        style="display: flex; justify-content: center; align-items: center; width: 100%; height: 100%;">
                        <div class="wave-bar" style="animation-delay: 0s;"></div>
                        <div class="wave-bar" style="animation-delay: 0.2s;"></div>
                        <div class="wave-bar" style="animation-delay: 0.4s;"></div>
                        <div class="wave-bar" style="animation-delay: 0.6s;"></div>
                        <div class="wave-bar" style="animation-delay: 0.8s;"></div>
                        <div class="wave-bar" style="animation-delay: 0.99s;"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;

    // Get the container by its ID
    const container = document.getElementById('ava-widget-container');

    // Add the HTML markup to the container
    if (container) {
        container.innerHTML += htmlMarkup;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    onLoad();
});


window.onPlayClicked = onPlayClicked;
window.onCallEnded = onCallEnded;
window.onAgentStartTalking = onAgentStartTalking;
window.onAgentStopTalking = onAgentStopTalking;
window.ava_user_token = null;
window.ava_agent_uuid = null;