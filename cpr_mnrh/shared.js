// Function to get the current app data from localStorage
function getAppData() {
    const defaultData = {
        users: ["plan", "mnrncpr", "pimpon"],
        cases: {
            "plan": [],
            "mnrncpr": [],
            "pimpon": []
        }
    };
    const savedData = localStorage.getItem('cprAppData');
    if (savedData) {
        return JSON.parse(savedData);
    }
    return defaultData;
}
