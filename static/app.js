document.addEventListener("DOMContentLoaded", () => {
  const socket = io();
  const loginSection = document.getElementById("loginPage");
  const chatSection = document.getElementById("chatPage");
  const usernameInput = document.getElementById("username");
  const startBtn = document.getElementById("startChat");
  const messageInput = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendBtn");
  const messagesDiv = document.getElementById("messages");
  const friendList = document.getElementById("friendList");
  const groupList = document.getElementById("groupList");
  const typingStatus = document.getElementById("typingStatus");

  const settingsBtn = document.getElementById("settingsBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  let username = "";
  let currentRoom = "General";
  let activePrivateChat = null;

  console.log("✅ JS file loaded successfully");

  // ===== Login =====
  startBtn.addEventListener("click", () => {
    username = usernameInput.value.trim();
    if (username) {
      loginSection.style.display = "none";
      chatSection.style.display = "flex";
      socket.emit("join", { user: username, room: currentRoom });
      addMessage("System", `${username} joined the live chat 💬`);
    }
  });

  // ===== Send message =====
  sendBtn.addEventListener("click", () => {
    const text = messageInput.value.trim();
    if (!text) return;

    if (activePrivateChat) {
      socket.emit("private_message", { from: username, to: activePrivateChat, text });
      addMessage(`You → ${activePrivateChat}`, text);
    } else {
      socket.emit("send_message", { user: username, text, room: currentRoom });
    }

    messageInput.value = "";
  });

  // ===== Typing =====
  messageInput.addEventListener("input", () => {
    socket.emit("typing", { user: username, room: currentRoom });
  });

  // ===== Receive typing notification =====
  socket.on("typing", (data) => {
    typingStatus.textContent = `${data.user} is typing...`;
    setTimeout(() => (typingStatus.textContent = ""), 1000);
  });

  // ===== Receive message =====
  socket.on("message", (data) => {
    addMessage(data.user, data.text, data.time);
  });

  // ===== Receive private message =====
  socket.on("private_message", (data) => {
    const sender = data.from;
    if (!activePrivateChat || activePrivateChat !== sender) {
      openPrivateChat(sender);
    }
    addMessage(sender, data.text, data.time);
  });

  // ===== Update friends (online users) =====
  socket.on("user_list", (users) => {
    friendList.innerHTML = "";
    users.forEach((u) => {
      if (u === username) return; // don’t show yourself
      const li = document.createElement("li");
      li.textContent = u;
      li.classList.add("friend-item");
      li.addEventListener("click", () => openPrivateChat(u));
      friendList.appendChild(li);
    });
  });

  // ===== Update groups =====
  socket.on("group_list", (groups) => {
    groupList.innerHTML = "";
    groups.forEach((group) => {
      const li = document.createElement("li");
      li.textContent = group;
      li.addEventListener("click", () => {
        currentRoom = group;
        activePrivateChat = null;
        messagesDiv.innerHTML = "";
        addMessage("System", `You joined ${group}`);
        socket.emit("join", { user: username, room: group });
      });
      groupList.appendChild(li);
    });
  });

  // ===== Helper: Add message =====
  function addMessage(user, text, time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) {
    const div = document.createElement("div");
    div.classList.add("message");
    div.innerHTML = `<strong>${user}:</strong> ${text} <span class="time">${time}</span>`;
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  // ===== Helper: Open private chat =====
  function openPrivateChat(friend) {
    activePrivateChat = friend;
    messagesDiv.innerHTML = "";
    addMessage("System", `Private chat with ${friend} 🔒`);
  }

  // ===== Settings button =====
  settingsBtn.addEventListener("click", () => {
    alert("Settings feature coming soon ⚙️");
  });

  // ===== Logout button =====
  logoutBtn.addEventListener("click", () => {
    socket.disconnect();
    chatSection.style.display = "none";
    loginSection.style.display = "block";
    usernameInput.value = "";
    messagesDiv.innerHTML = "";
    addMessage("System", "You have logged out 🚪");
  });
});
