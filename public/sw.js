self.addEventListener("install", (event) => {
  console.log("SW: Installed");
  // Activate immediately after install
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("SW: Activated");
  // Take control of all clients (open tabs)
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", function (event) {
  let data = {};
  if (event.data) {
    data = event.data.json();
  }

  // Send to React (if open)
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: "PUSH_NOTIFICATION",
        payload: data,
      });
    });
  });

  // Also show system notification
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192x192.png",
    })
  );
});
