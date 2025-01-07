document.addEventListener('DOMContentLoaded', () => {
  // Get DOM elements
  const intervalInput = document.getElementById('interval');
  const saveButton = document.getElementById('save');
  const waterCountSpan = document.getElementById('waterCount');
  const literCountSpan = document.getElementById('literCount');
  const waterLevel = document.getElementById('water-level');
  const timerDisplay = document.getElementById('timer');
  const resetButton = document.getElementById('reset');
  const pauseResumeButton = document.getElementById('pauseResume');
  let timerInterval = null;

  // Updates the water bottle visualization and counters
  function updateWaterLevel(count, totalWater = 0) {
    const percentage = Math.min((totalWater / 5000) * 100, 100); // Max at 5L
    waterLevel.style.height = `${percentage}%`;
    waterCountSpan.textContent = count;
    literCountSpan.textContent = (totalWater / 1000).toFixed(1);
  }

  // Updates the countdown timer display
  function updateTimer(nextAlarmTime) {
    const now = Date.now();
    const timeLeft = nextAlarmTime - now;
    
    if (timeLeft > 0) {
      const minutes = Math.floor(timeLeft / 60000);
      const seconds = Math.floor((timeLeft % 60000) / 1000);
      timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      timerDisplay.textContent = "00:00";
    }
  }

  // Starts or restarts the countdown timer
  function startTimer(nextAlarmTime) {
    if (timerInterval) clearInterval(timerInterval);
    
    const updateTimerDisplay = () => {
      const now = Date.now();
      if (now >= nextAlarmTime) {
        timerDisplay.textContent = "00:00";
        clearInterval(timerInterval);
      } else {
        updateTimer(nextAlarmTime);
      }
    };
    
    updateTimerDisplay();
    timerInterval = setInterval(updateTimerDisplay, 1000);
  }

  // Listen for storage changes to update UI
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (changes.waterCount || changes.totalWater) {
      chrome.storage.local.get(['waterCount', 'totalWater'], (result) => {
        updateWaterLevel(result.waterCount || 0, result.totalWater || 0);
      });
    }
    
    if (changes.nextAlarmTime && changes.nextAlarmTime.newValue) {
      startTimer(changes.nextAlarmTime.newValue);
    }
  });

  // Updates pause button text and style
  function updatePauseButtonState(isPaused) {
    if (isPaused) {
      pauseResumeButton.textContent = 'Wznów przypomnienia';
      pauseResumeButton.classList.add('resumed');
    } else {
      pauseResumeButton.textContent = 'Wstrzymaj przypomnienia';
      pauseResumeButton.classList.remove('resumed');
    }
  }

  // Load initial values when popup opens
  chrome.storage.local.get(
    ['interval', 'waterCount', 'nextAlarmTime', 'totalWater', 'isPaused'], 
    (result) => {
      intervalInput.value = result.interval || 30;
      updateWaterLevel(result.waterCount || 0, result.totalWater || 0);
      updatePauseButtonState(result.isPaused);
      
      if (result.nextAlarmTime) {
        startTimer(result.nextAlarmTime);
      }
    }
  );

  // Event Listeners
  resetButton.addEventListener('click', () => {
    if (confirm('Czy na pewno chcesz zresetować licznik wypitej wody?')) {
      chrome.runtime.sendMessage({ type: 'RESET_COUNTER' });
    }
  });

  saveButton.addEventListener('click', () => {
    const interval = parseInt(intervalInput.value);
    chrome.runtime.sendMessage({ 
      type: 'UPDATE_TIMER', 
      interval
    });
  });

  pauseResumeButton.addEventListener('click', () => {
    chrome.storage.local.get(['isPaused'], (result) => {
      const newPausedState = !result.isPaused;
      chrome.storage.local.set({ isPaused: newPausedState }, () => {
        updatePauseButtonState(newPausedState);
        chrome.runtime.sendMessage({ 
          type: 'TOGGLE_PAUSE', 
          isPaused: newPausedState 
        });
      });
    });
  });
}); 