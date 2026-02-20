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
        const fetchRes = await executeSql("SELECT * FROM members ORDER BY created_at DESC LIMIT 1");
        if (!fetchRes.rows || fetchRes.rows.length === 0) {
            console.log("No members found.");
            return;
        }
        const member = fetchRes.rows[0];
        console.log("Found member:", member.name, member.id);

        const updateQuery = `
      UPDATE members
        SET name = 'changed_again'
      WHERE id = '${member.id}'
    `;
        console.log("Running UPDATE:", updateQuery);
        const updateRes = await executeSql(updateQuery);
        console.log("UPDATE result:", updateRes);

        const fetchUpdatedQuery = `
        SELECT m.id, m.name
        FROM members m
        LEFT JOIN plans p ON m.plan_id = p.id
        WHERE m.id = '${member.id}'
    `;
        console.log("Running SELECT:", fetchUpdatedQuery);
        const updatedResult = await executeSql(fetchUpdatedQuery);
        console.log("SELECT result:", updatedResult);
    } catch (err) {
        console.error(err);
    }
}

test();
