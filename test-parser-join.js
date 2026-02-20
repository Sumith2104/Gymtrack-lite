const fs = require('fs');
const { Parser } = require('node-sql-parser');
const p = new Parser();
const query = `
        SELECT m.id, m.name
        FROM members m
        LEFT JOIN plans p ON m.plan_id = p.id
        WHERE m.id = 'actualId'`;
const ast = p.astify(query, { database: 'PostgreSQL' });
fs.writeFileSync('test-ast.json', JSON.stringify(ast, null, 2));
