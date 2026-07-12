document.addEventListener('DOMContentLoaded', () => {
    // Simulated dynamic data fetching from an API
    const fetchDashboardData = () => {
        // This simulates a payload returned from the backend based on the KPI cards
        return {
            available: 42,
            onTrip: 53,
            inShop: 5,
            retired: 0 
        };
    };

    const updateVehicleStatusBars = () => {
        const data = fetchDashboardData();
        const total = data.available + data.onTrip + data.inShop + data.retired;

        // Calculate percentages
        const availablePct = total > 0 ? (data.available / total) * 100 : 0;
        const onTripPct = total > 0 ? (data.onTrip / total) * 100 : 0;
        const inShopPct = total > 0 ? (data.inShop / total) * 100 : 0;
        const retiredPct = total > 0 ? (data.retired / total) * 100 : 0;

        // Find elements and apply width with a slight delay for animation
        setTimeout(() => {
            const barAvailable = document.getElementById('bar-available');
            const barOnTrip = document.getElementById('bar-ontrip');
            const barInShop = document.getElementById('bar-inshop');
            const barRetired = document.getElementById('bar-retired');

            if (barAvailable) barAvailable.style.width = `${availablePct}%`;
            if (barOnTrip) barOnTrip.style.width = `${onTripPct}%`;
            if (barInShop) barInShop.style.width = `${inShopPct}%`;
            if (barRetired) barRetired.style.width = `${retiredPct}%`;
        }, 100); // 100ms delay triggers the CSS transition smoothly on page load
    };

    updateVehicleStatusBars();
});
