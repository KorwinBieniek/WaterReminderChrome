document.addEventListener('DOMContentLoaded', () => {
  // Get DOM elements
  const presetButtons = document.querySelectorAll('.preset-button');
  const customAmountInput = document.getElementById('customAmount');
  const confirmButton = document.getElementById('confirmButton');
  const totalAmountSpan = document.getElementById('totalAmount');
  const totalLitersSpan = document.getElementById('totalLiters');
  let selectedAmount = 250; // Default amount in ml

  // Play notification sound
  const audio = new Audio('notification.mp3');
  audio.play();

  // Load and display current water consumption
  chrome.storage.local.get(['totalWater'], (result) => {
    const totalWater = result.totalWater || 0;
    totalAmountSpan.textContent = totalWater;
    totalLitersSpan.textContent = (totalWater / 1000).toFixed(1);
  });

  // Handle preset amount buttons
  presetButtons.forEach(button => {
    button.addEventListener('click', () => {
      selectedAmount = parseInt(button.dataset.amount);
      customAmountInput.value = selectedAmount;
      
      // Update active button styling
      presetButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
    });
  });

  // Handle custom amount input
  customAmountInput.addEventListener('change', () => {
    selectedAmount = parseInt(customAmountInput.value);
    // Remove active state from preset buttons
    presetButtons.forEach(btn => btn.classList.remove('active'));
  });

  // Handle water consumption confirmation
  confirmButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ 
      type: 'WATER_CONSUMED',
      amount: selectedAmount
    }, (response) => {
      if (response && response.success) {
        window.close();
      } else {
        console.error('Failed to update water count');
      }
    });
  });
}); 