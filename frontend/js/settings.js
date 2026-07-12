document.addEventListener('DOMContentLoaded', () => {
    // 1. Get User Session Data
    const userData = localStorage.getItem('transitOpsUser');
    if (!userData) {
        window.location.href = 'login.html';
        return;
    }
    const user = JSON.parse(userData);

    const settingsForm = document.getElementById('settingsForm');
    const depotNameInput = document.getElementById('depotName');
    const currencyCodeInput = document.getElementById('currencyCode');
    const distanceUnitInput = document.getElementById('distanceUnit');
    const saveBtn = document.getElementById('saveBtn');

    // Load saved settings if they exist
    const savedSettingsStr = localStorage.getItem('transitOpsSettings');
    if (savedSettingsStr) {
        const savedSettings = JSON.parse(savedSettingsStr);
        if(savedSettings.depotName) depotNameInput.value = savedSettings.depotName;
        if(savedSettings.currencyCode) currencyCodeInput.value = savedSettings.currencyCode;
        if(savedSettings.distanceUnit) distanceUnitInput.value = savedSettings.distanceUnit;
    }

    if (settingsForm) {
        settingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            saveBtn.textContent = 'Saving...';
            saveBtn.style.opacity = '0.7';

            const payload = {
                depotName: depotNameInput.value,
                currencyCode: currencyCodeInput.value,
                distanceUnit: distanceUnitInput.value
            };

            // Fake API delay then save to local storage
            setTimeout(() => {
                localStorage.setItem('transitOpsSettings', JSON.stringify(payload));
                
                saveBtn.textContent = 'Saved!';
                saveBtn.style.backgroundColor = 'var(--secondary-color)';
                saveBtn.style.color = '#000';
                saveBtn.style.opacity = '1';
                
                setTimeout(() => {
                    saveBtn.textContent = 'Save changes';
                    saveBtn.style.backgroundColor = 'var(--primary-color)';
                    saveBtn.style.color = '#fff';
                }, 2000);
            }, 500);
        });
    }
});
