import index from './src/index.html'
import tutorial from './src/tutorial.html'
import submit from './src/submit.html'

Bun.serve({
    port: 3000,
    hostname: '0.0.0.0',

    development: process.env.PRODUCTION !== 'true',

    routes: {
        "/": index,
        "/tutorial": tutorial,
        '/submit': (req) => {
            if (req.method === 'GET') {
                return Response.redirect('https://forms.hackclub.com/t/qcnZQpvVb9us', 302);
            } else {
                return new Response("Method not allowed", { status: 405 }); 
            }
        },
        '/health': (req) => {
            return new Response("OK");
        },
        "/*": (req) => {
            const path = new URL(req.url).pathname;
            console.log("Fetching:", path);
            const file = Bun.file('./src' + path);
            return new Response(file);
        }
    },
});

console.log("Server is running on http://0.0.0.0:3000");