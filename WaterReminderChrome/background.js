let isNotificationActive = false; // Prevents multiple notifications from showing at once

// Initialize extension with default values
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed/updated');
  const today = new Date().toDateString();
  chrome.storage.local.set({ 
    waterCount: 0,
    lastResetDate: today,
    totalWater: 0,
    isPaused: false
  });
  setupTimer(30); // Start with 30-minute default interval
});

// Sets up or updates the reminder timer
function setupTimer(interval) {
  console.log('Setting up timer with interval:', interval);
  chrome.storage.local.get(['isPaused'], (result) => {
    chrome.alarms.clearAll(); // Clear any existing alarms
    
    if (!result.isPaused) {
      const nextAlarmTime = Date.now() + interval * 60000; // Convert minutes to milliseconds
      
      chrome.storage.local.set({ 
        nextAlarmTime,
        interval 
      });
      
      chrome.alarms.create('waterReminder', {
        when: nextAlarmTime
      });
    } else {
      // If paused, clear the next alarm time
      chrome.storage.local.set({ 
        nextAlarmTime: null
      });
    }
  });
}

// Resets counters at midnight
function checkAndResetDaily() {
  const today = new Date().toDateString();
  chrome.storage.local.get(['lastResetDate'], (result) => {
    if (result.lastResetDate !== today) {
      console.log('Resetting daily counter');
      chrome.storage.local.set({
        waterCount: 0,
        lastResetDate: today
      });
    }
  });
}

// Handle alarm triggers
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'waterReminder') {
    chrome.storage.local.get(['isPaused'], (result) => {
      if (!result.isPaused) {
        checkAndResetDaily();
        if (!isNotificationActive) {
          showWaterReminder();
        } else {
          // If previous reminder is still open, schedule next one
          chrome.storage.local.get(['interval'], (result) => {
            setupTimer(result.interval || 30);
          });
        }
      }
    });
  }
});

// Creates and shows the reminder window
function showWaterReminder() {
  isNotificationActive = true;
  
  chrome.system.display.getInfo((displays) => {
    const primaryDisplay = displays[0];
    const width = 400;
    const height = 600;
    
    // Center the reminder window on screen
    chrome.windows.create({
      url: 'reminder.html',
      type: 'popup',
      width: width,
      height: height,
      left: Math.round((primaryDisplay.workArea.width - width) / 2),
      top: Math.round((primaryDisplay.workArea.height - height) / 2)
    });
  });
}

// Handle messages from popup and reminder windows
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message);
  
  if (message.type === 'TOGGLE_PAUSE') {
    // Handle pause/resume functionality
    if (message.isPaused) {
      chrome.alarms.clearAll();
      chrome.storage.local.set({ nextAlarmTime: null });
    } else {
      chrome.storage.local.get(['interval'], (result) => {
        setupTimer(result.interval || 30);
      });
    }
  } else if (message.type === 'UPDATE_TIMER') {
    setupTimer(message.interval);
  } else if (message.type === 'RESET_COUNTER') {
    // Reset all water tracking counters
    chrome.storage.local.set({ 
      waterCount: 0,
      totalWater: 0
    }, () => {
      if (sendResponse) sendResponse({ success: true });
    });
    return true; // Keep message channel open for async response
  } else if (message.type === 'WATER_CONSUMED') {
    isNotificationActive = false;
    
    // Update water consumption counters and schedule next reminder
    chrome.storage.local.get(['interval', 'waterCount', 'totalWater'], (result) => {
      const newCount = (result.waterCount || 0) + 1;
      const interval = result.interval || 30;
      const nextAlarmTime = Date.now() + interval * 60000;
      const waterAmount = message.amount || 250;
      const totalWater = (result.totalWater || 0) + waterAmount;
      
      chrome.storage.local.set({ 
        waterCount: newCount,
        nextAlarmTime: nextAlarmTime,
        totalWater: totalWater
      }, () => {
        chrome.alarms.create('waterReminder', {
          when: nextAlarmTime
        });
        
        if (sendResponse) sendResponse({ success: true });
      });
    });
    return true; // Keep message channel open for async response
  }
});

// Dodajmy nasłuchiwanie na zmiany w storage dla debugowania
chrome.storage.onChanged.addListener((changes, namespace) => {
  for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
    console.log(
      `Storage key "${key}" in namespace "${namespace}" changed:`,
      `Old value:`, oldValue,
      `New value:`, newValue
    );
  }
}); 