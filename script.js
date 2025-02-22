const chatsContainer = document.querySelector('.chats-container');
const container = document.querySelector('.container');
const promptForm = document.querySelector('.prompt-form');
const promptInput = promptForm.querySelector('.prompt-input');
const sendPromptBtn = promptForm.querySelector('#send-prompt-btn');
const fileInput = promptForm.querySelector('#file-input');
const fileUploadWrapper = promptForm.querySelector('.fille-upload-welpper');
const cancleFileBtn = promptForm.querySelector('#cancle-file-btn');
const stopResponseBtn = promptForm.querySelector('#stop-response-btn');
const deleteChatsBtn = document.querySelector('#delete-chats-btn');
const themeToggleBtn = document.querySelector('#theme-toggle-btn');
const suggestionItem = document.querySelectorAll(".suggestion-item");

// API Setup
const API_KEY = "AIzaSyDRvXPcM1fjfloT7Qg1imArI2WSY1GeNBw";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

let typingInterval, controller;
const chatHistory = [];
const userData = { message: "", file: {} };


// Function to create message ele
const createMsgElement = (content, ...classes) =>
{
    const div = document.createElement('div');
    div.classList.add(`massage`, ...classes);
    div.innerHTML = content;
    return div;
};

// Scroll to the bottom of the containercontainer
const scrollToBottom = () => container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });

// Simulate typing Effect for bot response
const typingEffect = (text, textElement, botMsgDiv) =>
{
    textElement.textContent = '';
    const words = text.split(' ');
    let wordIndex = 0;

    // Set an interval to type each word 
    typingInterval = setInterval(() =>
    {
        if (wordIndex < words.length)
        {
            textElement.textContent += (wordIndex === 0 ? '' : ' ') + words[wordIndex++];
            scrollToBottom();
        } else
        {
            clearInterval(typingEffect);
            botMsgDiv.classList.remove('loading');
            document.body.classList.remove("bot-responding");
            sendPromptBtn.classList.remove('disaple');
        }
    }, 40)
}

// Make The API call and generate the bot's response
const generateResponse = async (botMsgDiv) =>
{
    const textElement = botMsgDiv.querySelector(".massage-text");

    controller = new AbortController();
    // Add User Message to the file data to the chat history 
    chatHistory.push({
        role: "user",
        parts: [{ text: userData.message }, ...(userData.file.data ? [{ inline_data: (({ fileName, isImage, ...rest }) => rest)(userData.file) }] : [])]
    });
    try
    {
        // send the chat history to the api to get a response
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: chatHistory }),
            signal: controller.signal,
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error.message);
        console.log(data);
        // Process the response text and display with typing effect 
        const responseText = data.candidates[0].content.parts[0].text.replace(/\*\*([^*]+)\*\*/g, "$1").trim();

        chatHistory.push({
            role: "model",
            parts: [{ text: responseText }]
        });

        typingEffect(responseText, textElement, botMsgDiv);
    } catch (error)
    {
        textElement.style.color = '#d62939';
        textElement.textContent = error.name === "AborError" ? "Response Generation stopped." : error.message;

        botMsgDiv.classList.remove('loading');
        document.body.classList.remove("bot-responding");
        sendPromptBtn.classList.remove('disaple');
        scrollToBottom();
    } finally
    {
        userData.file = {};
    }
};

// Handle the form submission
const handleFormSubmit = (e) =>
{
    e.preventDefault();
    const userMessage = promptInput.value.trim();
    if (!userMessage || document.body.classList.contains("bot-responding")) return;

    promptInput.value = '';
    userData.message = userMessage;
    document.body.classList.add("bot-responding", 'chats-active');
    sendPromptBtn.classList.add('disaple');
    fileUploadWrapper.classList.remove('active', "img-attached", "file-attached");


    // Generate user message HTML With optional file attachment
    const userHTML = `<p class="massage-text">${userMessage}</p>
    ${userData.file.data ? (userData.file.isImage ? `    <img src="data:${userData.file.mime_type};base64, ${userData.file.data}" class= "img-attachment" /> ` : `<p class= "file-attachment"><span class="material-symbols-rounded">
        description </span> ${userData.file.fileName}</p>`) : ""}
    `;
    const userMsgDiv = createMsgElement(userHTML, 'user-massage');

    userMsgDiv.querySelector(".massage-text").textContent = userMessage;
    chatsContainer.appendChild(userMsgDiv);
    scrollToBottom();

    setTimeout(() =>
    {

        // Generate bot message HTML and add in the chats container after 600ms
        const botMsgHTML = ` <img src="./gemini-chatbot-logo.svg" class="avatar"><p class="massage-text">Just a sec...</p>`;

        const botMsgDiv = createMsgElement(botMsgHTML, 'bot-massage', 'loading');

        chatsContainer.appendChild(botMsgDiv);
        scrollToBottom();

        generateResponse(botMsgDiv);

    }, 500)

};

// Handle file input change (file upload)
fileInput.addEventListener("change", () =>
{
    const file = fileInput.files[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");

    const render = new FileReader();
    render.readAsDataURL(file);
    console.log(file);
    render.onload = (e) =>
    {
        fileInput.value = "";
        const base64String = e.target.result.split(",")[1];
        fileUploadWrapper.querySelector('.file-preview').src = e.target.result;
        fileUploadWrapper.classList.add('active', isImage ? "img-attached" : "file-attached");

        // Store file data in userData object 
        userData.file = { fileName: file.name, data: base64String, mime_type: file.type, isImage };

    }

});

// Cancle File upload
cancleFileBtn.addEventListener('click', () =>
{
    userData.file = {};
    fileUploadWrapper.classList.remove('active', "img-attached", "file-attached");
});

// Stop ongoing bot response
stopResponseBtn.addEventListener('click', () =>
{
    userData.file = {};
    controller?.abort();
    clearInterval(typingInterval);

    chatsContainer.querySelector(".bot-massage.loading").classList.remove('loading');
    document.body.classList.remove("bot-responding");
    sendPromptBtn.classList.remove('disaple');

});

// delete all chats
deleteChatsBtn.addEventListener('click', () =>
{
    chatHistory.length = 0;
    chatsContainer.innerHTML = '';
    document.body.classList.remove("bot-responding", 'chats-active');
    sendPromptBtn.classList.remove('disaple');
});

// Handle suggestion click
suggestionItem.forEach(item =>
{
    item.addEventListener('click', () =>
    {
        promptInput.value = item.querySelector(".text").textContent;
        promptForm.dispatchEvent(new Event('submit'));
    })
});


// Show/hide controls for mobile on prompt input foucus 
document.addEventListener('click', ({ target }) =>
{
    const wrapper = document.querySelector('.prompt-welpper');
    const shaildhide = target.classList.contains('prompt-input') || (wrapper.classList.contains("hide-controls") && (target.id === "add-file-btn" || target.id === "stop-response-btn"));

    wrapper.classList.toggle('hide-controls', shaildhide);
});

// Toggle dark/light theme
themeToggleBtn.addEventListener('click', () =>
{
    const isLighttheme = document.body.classList.toggle('light-theme');
    localStorage.setItem('themeColor', isLighttheme ? 'light_mode' : 'dark_mode');
    themeToggleBtn.textContent = isLighttheme ? 'dark_mode' : 'light_mode';
});

// Set initial them from localStorage
const isLighttheme = localStorage.getItem('themeColor' === 'light_mode');
document.body.classList.toggle('light-theme', isLighttheme);
themeToggleBtn.textContent = isLighttheme ? 'dark_mode' : 'light_mode';

promptForm.addEventListener('submit', handleFormSubmit);
promptForm.querySelector('#add-file-btn').addEventListener('click', () => fileInput.click());







/*
what is the image abut?
what i can use this caht ?
create a simple form html form 
*/


