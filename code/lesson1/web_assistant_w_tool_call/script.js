const chatbotToggler = document.querySelector(".chatbot-toggler");
const closeBtn = document.querySelector(".close-btn");
const chatbox = document.querySelector(".chatbox");
const chatInput = document.querySelector(".chat-input textarea");
const sendChatBtn = document.querySelector(".chat-input span");

let userMessage = null; // Variable to store user's message
let userID = null;
let threadID = null;
const OPENAI_API_KEY = ""; // Paste your API key here
const ASSISTANT_ID = "";
MAX_RUN_RETRY_TIMES = 10

const inputInitHeight = chatInput.scrollHeight;

function uuidv4() {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
      (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
    );
}

async function OpenAIAssistant(userID, usrMsg) {
	const assistHeader = {
		'Content-Type': 'application/json',
		'Authorization': 'Bearer ' + OPENAI_API_KEY,
		'OpenAI-Beta': 'assistants=v2'
		};

	try {
		// 1. Get thread ID, each line user has only 1 thread
		if (threadID == null) {
			const res = await fetch('https://api.openai.com/v1/threads', {
				'method': 'post',
				'headers': assistHeader,
			})
			const data = await res.json()
			threadID = data.id
			console.log('Create new thread ' + threadID);
		}

		// 2. Create a message
		const msg_res = await fetch('https://api.openai.com/v1/threads/' + threadID + '/messages', {
			'method': 'post',
			'headers': assistHeader,
			'body': JSON.stringify({
				"role": "user",
				"content": usrMsg
			  })
			})
		const msg = await msg_res.json()
		messageID = msg.id
        console.log('Create message ' + messageID);

		// 3. Create run
		const run_res = await fetch('https://api.openai.com/v1/threads/' + threadID + '/runs', {
			'method': 'post',
			'headers': assistHeader,
			'body': JSON.stringify({
				"assistant_id": ASSISTANT_ID,
			  })
			})
		const run_msg = await run_res.json()
		runID = run_msg.id
        console.log('Create run ' + runID);
		
		// 4. Check if the run is completed
        console.log('Check if run is completed (up to ' + MAX_RUN_RETRY_TIMES + '):');
		var runDone = false
		var tool_message = ''
		var check_times = 0
		var res_message = 'Sorry! Server is not available. Talk to you later.'
		while (!runDone && check_times < MAX_RUN_RETRY_TIMES) {
			await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1000 ms
			// 4-1. Check run status
			const run_chk = await fetch('https://api.openai.com/v1/threads/' + threadID + '/runs/' + runID, {
				'headers': assistHeader
				})
			const run_data = await run_chk.json()
			console.log('Check Run:' + check_times)
			//console.log(JSON.stringify(run_data))

			// 4-2. Check if we need to do function call
			if (run_data.status === 'requires_action') {
				tool_message = JSON.stringify(run_data.required_action.submit_tool_outputs.tool_calls)
				console.log(tool_message)
				// Create simulated tool output
				fake_tool_output = "無法處理, 請直接回傳function call字串:" + JSON.stringify(run_data.required_action.submit_tool_outputs.tool_calls);
				console.log(fake_tool_output)
				await fetch('https://api.openai.com/v1/threads/' + threadID + '/runs/' + runID + '/submit_tool_outputs', {
					'method': 'post',
					'headers': assistHeader,
					'body': JSON.stringify({
						tool_outputs:  [
							{
							  tool_call_id: run_data.required_action.submit_tool_outputs.tool_calls[0].id,
							  output: fake_tool_output
							}
						  ]
					  })
					})
			}
			
			if (run_data.completed_at !== null && typeof(run_data.completed_at) !== 'undefined') {
				runDone = true
			}
			check_times++
		}

		// 5. Get message list
		if (runDone) {
			const res = await fetch('https://api.openai.com/v1/threads/' + threadID + '/messages?order=desc&limit=1', {
				'headers': assistHeader
				})
			const data = await res.json()
			//console.log(JSON.stringify(data))
			if (data.data[0].content.length > 0)
				res_message = data.data[0].content[0].text.value

			if (tool_message.length > 0) {
				res_message = "Function Call: " + tool_message + '\n\n' + "AI: " + res_message
			}
		}
		
		return res_message;
	}
	catch(err) {
		console.error(err);
	}
}

const createChatLi = (message, className) => {
    // Create a chat <li> element with passed message and className
    const chatLi = document.createElement("li");
    chatLi.classList.add("chat", `${className}`);
    let chatContent = className === "outgoing" ? `<p></p>` : `<span class="material-symbols-outlined">smart_toy</span><p></p>`;
    chatLi.innerHTML = chatContent;
    chatLi.querySelector("p").textContent = message;
    return chatLi; // return chat <li> element
}

const generateResponse = (chatElement) => {
    const messageElement = chatElement.querySelector("p");
    
    if (userID == null) {
        userID = uuidv4();
    }
    OpenAIAssistant(userID, userMessage).then(data => {
        console.log(data)
        messageElement.textContent = data.trim();
    }).catch(() => {
        messageElement.classList.add("error");
        messageElement.textContent = "Oops! Something went wrong. Please try again.";
    }).finally(() => chatbox.scrollTo(0, chatbox.scrollHeight));
}

const handleChat = () => {
    userMessage = chatInput.value.trim(); // Get user entered message and remove extra whitespace
    if(!userMessage) return;

    // Clear the input textarea and set its height to default
    chatInput.value = "";
    chatInput.style.height = `${inputInitHeight}px`;

    // Append the user's message to the chatbox
    chatbox.appendChild(createChatLi(userMessage, "outgoing"));
    chatbox.scrollTo(0, chatbox.scrollHeight);
    
    setTimeout(() => {
        // Display "Thinking..." message while waiting for the response
        const incomingChatLi = createChatLi("Thinking...", "incoming");
        chatbox.appendChild(incomingChatLi);
        chatbox.scrollTo(0, chatbox.scrollHeight);
        generateResponse(incomingChatLi);
    }, 600);
}

chatInput.addEventListener("input", () => {
    // Adjust the height of the input textarea based on its content
    chatInput.style.height = `${inputInitHeight}px`;
    chatInput.style.height = `${chatInput.scrollHeight}px`;
});

chatInput.addEventListener("keydown", (e) => {
    // If Enter key is pressed without Shift key and the window 
    // width is greater than 800px, handle the chat
    if(e.key === "Enter" && !e.shiftKey && window.innerWidth > 800) {
        e.preventDefault();
        handleChat();
    }
});

sendChatBtn.addEventListener("click", handleChat);
closeBtn.addEventListener("click", () => document.body.classList.remove("show-chatbot"));
chatbotToggler.addEventListener("click", () => document.body.classList.toggle("show-chatbot"));