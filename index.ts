import index from './src/index.html'
import tutorial from './src/tutorial.html'

Bun.serve({
    port: 3000,
    hostname: '0.0.0.0',

    routes: {
        "/": index,
        "/tutorial": tutorial,
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