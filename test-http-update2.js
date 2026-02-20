async function test() {
    const executeSql = async (query) => {
        const res = await fetch('http://localhost:5000/api/execute-sql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query,
                project_id: "wfo7AJP3nGpkbLIwMzBl",
                user_id: "9aWYPLEp8Uaq2EoWtgNF8q77fIz1"
            })
        });
        return res.json();
    };

    try {
        const updateResult = await executeSql("UPDATE members SET name = 'changed' WHERE name = 'sumith'");
        console.log("UPDATE result sumith:", updateResult);

        const fetchUpdatedQuery = `
        SELECT m.id, m.name
        FROM members m
    `;
        const updatedResult = await executeSql(fetchUpdatedQuery);
        console.log("SELECT result:", updatedResult);
    } catch (err) {
        console.error(err);
    }
}

test();
