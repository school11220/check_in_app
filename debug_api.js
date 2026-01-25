const http = require('http');

http.get('http://localhost:3000/api/events', (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        if (res.statusCode === 200) {
            try {
                const json = JSON.parse(data);
                console.log('Events:', JSON.stringify(json, null, 2));
            } catch (e) {
                console.log('Body is not JSON:', data.substring(0, 200));
            }
        } else {
            console.log('Body:', data);
        }
    });
}).on('error', (err) => {
    console.error('Error:', err.message);
});
