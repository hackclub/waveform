import index from './src/index.html'
import tutorial from './src/tutorial.html'

Bun.serve({
    port: 3000,

    routes: {
        "/": index,
        "/tutorial": tutorial,
        "/*": (req) => {
            const path = new URL(req.url).pathname;
            console.log("Fetching:", path);
            const file = Bun.file('./src' + path);
            return new Response(file);
        }
    },
});

console.log("Server is running on http://localhost:3000");