var endpoint;
var key;

// Register a Service Worker.
navigator.serviceWorker.register('service-worker.js')
.then(function(registration) {
  // Use the PushManager to get the user's subscription to the push service.
  return registration.pushManager.getSubscription()
  .then(function(subscription) {
    // If a subscription was found, return it.
    if (subscription) {
      return subscription;
    }

    // Otherwise, subscribe the user (unlike the other push recipes, here we don't set
    // the userVisibleOnly property because we don't plan to only send notifications that
    // have a visible effect for the user).
    return registration.pushManager.subscribe()
    .then(function(newSubscription) {
      return newSubscription;
    });
  });
}).then(function(subscription) {
  // Retrieve the user's public key.
  var rawKey = subscription.getKey ? subscription.getKey('p256dh') : '';
  key = rawKey ?
        btoa(String.fromCharCode.apply(null, new Uint8Array(rawKey))) :
        '';

  endpoint = subscription.endpoint;

  // Send the subscription details to the server using the Fetch API.
  fetch('./register', {
    method: 'post',
    headers: {
      'Content-type': 'application/json'
    },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      key: key,
    }),
  });
});

function askForNotifications(visible) {
  var notificationNum = document.getElementById('notification-num').value;

  // Ask the server to send the client a notification (for testing purposes, in real
  // applications the notification will be generated by some event on the server).
  fetch('./sendNotification', {
    method: 'post',
    headers: {
      'Content-type': 'application/json'
    },
    body: JSON.stringify({
      endpoint: endpoint,
      key: key,
      visible: visible,
      num: notificationNum,
    }),
  });
}

document.getElementById('visible').onclick = function() {
  // Ask the server to send a notification, that the service worker will then use
  // to show a visible notification.
  askForNotifications(true);
};

document.getElementById('invisible').onclick = function() {
  // Ask the server to send a notification, that the service worker will not use
  // to show a visible notification.
  askForNotifications(false);
};

document.getElementById('clear').onclick = function() {
  // Clear the 'notifications' cache, that stores the number of visible/invisible
  // notifications received.
  window.caches.open('notifications').then(function(cache) {
    Promise.all([
      cache.put(new Request('invisible'), new Response('0', {
        headers: {
          'content-type': 'application/json'
        }
      })),
      cache.put(new Request('visible'), new Response('0', {
        headers: {
          'content-type': 'application/json'
        }
      })),
    ]).then(function() {
      updateNumbers();
    });
  });
};

function updateNumbers() {
  // Read the number of notifications received from the 'notifications' cache and
  // update the page UI.
  window.caches.open('notifications').then(function(cache) {
    ['visible', 'invisible'].forEach(function(type) {
      cache.match(type).then(function(response) {
        response.text().then(function(text) {
          document.getElementById('sent-' + type).textContent = text;
        });
      });
    });
  });
}

window.onload = function() {
  // Periodically update the number of notifications received.
  updateNumbers();
  setInterval(updateNumbers, 1000);
};
