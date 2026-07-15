import { Topic } from '../types';

export const topics: Topic[] = [
  {
    id: 'intro-node',
    title: '1. What Node.js Actually Is',
    level: 'beginner',
    subtitle: 'V8, libuv, and the single-threaded event-driven model',
    description: 'Node.js is not a framework or a programming language; it is a custom runtime environment. It wraps the Google V8 JavaScript Engine (written in C++) and libuv (a multi-platform C library focused on asynchronous I/O). Frontend JS operates inside a browser sandbox, while Node.js operates directly on the OS level, giving it access to file systems, raw TCP sockets, and processes.',
    keyPoints: [
      'V8 compiles JS directly to native machine code. Node.js adds C++ bindings to expose OS capability.',
      'Single-threaded execution: The main JavaScript thread executes your code sequentially.',
      'Asynchronous Event-Driven Model: Rather than spawning a thread for each incoming TCP connection (which wastes RAM on stack allocation and context switching), Node delegates blocking I/O operations to the OS kernel or libuv thread pool, receiving results back via an event queue.',
      'I/O-Bound Concurrency: Perfect for heavy network and file operations, but highly vulnerable to CPU-intensive blocking calculations.'
    ],
    codeExample: `// Raw JavaScript on the main thread vs OS delegation
import fs from 'fs';

console.log('1. Starting script');

// This is fully asynchronous. Node hands the I/O task to libuv,
// which leverages OS asynchronous interfaces (epoll/kqueue).
// The main thread is immediately free to run the next line.
fs.readFile('./package.json', 'utf8', (err, data) => {
  if (err) throw err;
  console.log('3. File read finished (deferred callback)');
});

console.log('2. Script reached the end');
// Output Order:
// 1. Starting script
// 2. Script reached the end
// 3. File read finished (deferred callback)`,
    misconception: 'People think Node.js is fully single-threaded. In reality, ONLY your JavaScript runs on a single thread. The underlying libuv system utilizes a worker thread pool (default 4 threads) for heavy synchronous operations, and the OS itself executes asynchronous network events in separate native threads.',
    interviewOneLiner: 'Node.js is a C++ wrapped JavaScript runtime combining the V8 compiler with the libuv event loop to handle non-blocking, asynchronous I/O-bound operations using a single main thread.',
    questions: [
      {
        question: 'Why does Node.js scale better than thread-per-request servers (like Apache) for I/O-bound applications?',
        answer: 'Thread-per-request models spawn a native thread for each active client, consuming roughly 1MB of memory per thread for stack storage, which limits concurrency to thousands of connections. Node.js handles tens of thousands of concurrent connections on a single thread because it never blocks on I/O. Connections are represented as file descriptors monitored by the OS kernel, incurring negligible memory overhead.'
      },
      {
        question: 'What is the role of V8 vs libuv?',
        answer: 'V8 is responsible for executing your JavaScript code (compiling it to machine code, managing memory/garbage collection, and the call stack). libuv is responsible for the asynchronous runtime behavior: implementing the Event Loop, managing the OS-level thread pool, and abstracting cross-platform system calls (epoll on Linux, kqueue on macOS, IOCP on Windows).'
      }
    ],
    frontendConnection: 'In the browser, JS executes on a single main thread shared with the UI renderer (layout/repaint). If you block the browser thread, the UI freezes. In Node, there is no UI, but blocking the main thread prevents the server from responding to any other concurrent HTTP requests, locking up the entire server for all connected users.',
    visualizerType: 'blocking'
  },
  {
    id: 'event-loop',
    title: '2. The Event Loop in Depth',
    level: 'beginner',
    subtitle: 'Phases, macrotasks, microtasks, and nextTick execution mechanics',
    description: 'The Event Loop is the heart of Node\'s asynchronous execution. It orchestrates the order in which callbacks run. Crucially, the Event Loop operates in strict phases. When JS completes synchronous execution, the loop begins spinning, executing callbacks queued for specific phases.',
    keyPoints: [
      'Timers Phase: Executes callbacks scheduled by setTimeout() and setInterval().',
      'Pending Callbacks: Executes I/O callbacks deferred from the previous loop iteration (e.g., TCP errors).',
      'Poll Phase: Retrieves new I/O events. If nothing is queued, the loop will poll the OS kernel for I/O, blocking here briefly if there are no pending immediate callbacks or timers.',
      'Check Phase: Executes callbacks registered via setImmediate().',
      'Close Callbacks: Handles closure events like socket.on(\'close\', ...).',
      'Microtask Queues (process.nextTick & Promises): Executed immediately AFTER the currently running synchronous operation finishes, and BEFORE transitioning to the next phase of the event loop. process.nextTick() is a Node-specific priority queue that drains before Promise microtasks!'
    ],
    codeExample: `// Classic event-loop execution ordering test
setTimeout(() => console.log('setTimeout (Macrotask)'), 0);
setImmediate(() => console.log('setImmediate (Check Phase)'));

Promise.resolve().then(() => console.log('Promise.then (Microtask)'));
process.nextTick(() => console.log('process.nextTick (Priority Microtask)'));

console.log('Synchronous script execution');

// EXPECTED EXECUTION ORDER:
// 1. Synchronous script execution
// 2. process.nextTick (Priority Microtask)
// 3. Promise.then (Microtask)
// 4. setTimeout (Macrotask - depending on timer precision and poll state)
// 5. setImmediate (Check Phase)`,
    misconception: 'Developers confuse process.nextTick() and setImmediate() due to their names. In reality, nextTick triggers IMMEDIATELY after the active JavaScript statement finishes (before the event loop moves on), whereas setImmediate executes in the CHECK phase on the NEXT tick of the event loop.',
    interviewOneLiner: 'The Event Loop is a continuous loop comprising six phases that handles asynchronous callbacks; process.nextTick and Promise microtasks drain immediately after any operation completes, prioritizing them above all loop phases.',
    questions: [
      {
        question: 'What happens if you run an infinite recursive function inside process.nextTick()?',
        answer: 'It will starve the Event Loop completely and cause a freeze. Because process.nextTick callbacks drain fully before the loop moves to the next phase, a recursive nextTick chain prevents the loop from ever entering the Poll or Timers phase. This is unlike recursive setTimeout() calls, which yield to the event loop between iterations.'
      },
      {
        question: 'Why does setImmediate() sometimes execute before setTimeout(cb, 0) when run in the main module, but always before setTimeout inside an I/O callback?',
        answer: 'In the main module, the loop starting speed is non-deterministic. If the loop initializes in less than 1ms, the timer is not ready yet, so setImmediate executes first. However, inside an I/O callback (which runs in the Poll phase), the event loop is guaranteed to transition directly to the Check phase (where setImmediate lives) before winding back around to the Timers phase.'
      }
    ],
    frontendConnection: 'Browser JS has macrotasks (setTimeout, UI render) and microtasks (Promise). Node adds two crucial layers: process.nextTick (which runs even before Promise microtasks) and setImmediate (which allows yielding heavy callback work specifically into the check phase of the loop).',
    visualizerType: 'event-loop'
  },
  {
    id: 'modules-cjs-esm',
    title: '3. CommonJS vs ES Modules',
    level: 'beginner',
    subtitle: 'Synchronous vs Asynchronous module resolution and cache mechanics',
    description: 'Node.js historically used CommonJS (CJS) with `require()` and `module.exports`. Modern Node fully supports ES Modules (ESM) with `import` and `export`. Under the hood, they operate with completely different lifecycles and compilers.',
    keyPoints: [
      'CommonJS is synchronous and dynamic: Modules are evaluated at runtime as they are encountered. You can require files inside an `if` block or dynamically build import strings.',
      'ES Modules are static and asynchronous: Imports are parsed and resolved during a compilation/linking phase BEFORE any JavaScript is executed. This enables static analysis, dead-code elimination (tree-shaking), and top-level await.',
      'Caching: Both systems cache evaluated modules. A required or imported file is run exactly once; subsequent imports return the cached exports object from `require.cache`.',
      'Interoperability: ESM can import CJS modules, but CJS cannot sync-require ESM because ESM loading is asynchronous. CJS must use dynamic `import()` to load ESM.'
    ],
    codeExample: `// --- CommonJS (math.cjs) ---
const add = (a, b) => a + b;
module.exports = { add };

// Loading in CommonJS
const { add } = require('./math.cjs');

// --- ES Modules (math.mjs) ---
export const add = (a, b) => a + b;

// Loading in ES Modules
import { add } from './math.mjs';

// Dynamic import (works in BOTH, returns a Promise)
const loadModule = async () => {
  const { add } = await import('./math.mjs');
};`,
    misconception: 'Developers assume module variables are global. In CommonJS, Node actually wraps your module inside an invisible IIFE function: `(function(exports, require, module, __filename, __dirname) { ... })`. This is why `__filename` and `__dirname` exist as local parameters. ES Modules do NOT use this wrapper, which is why those variables are undefined in ESM (requiring `import.meta.url` extraction instead).',
    interviewOneLiner: 'CommonJS loads modules synchronously at runtime by executing them directly, whereas ES Modules parse and link imports statically before execution, making CJS dynamic and ESM static.',
    questions: [
      {
        question: 'What is the module cache, and how can it be cleared in CommonJS?',
        answer: 'Node.js stores all loaded modules in `require.cache`. Subsequent `require()` calls for the exact same file path bypass file access and return the cached export. In CJS, you can delete a module from the cache using `delete require.cache[require.resolve("./module")]`, forcing it to re-execute on the next load. In ESM, the cache cannot be cleared dynamically because of static module mapping.'
      },
      {
        question: 'What happens when there is a circular dependency in CommonJS vs ESM?',
        answer: 'In CommonJS, a circular dependency returns an incomplete (partially evaluated) `exports` object, which can lead to runtime `TypeError: undefined is not a function`. In ESM, exports are handled via "live bindings" (read-only views of the exported variables). Because of this reference linking, circular imports often work smoothly in ESM as long as the variables are not accessed immediately during the module evaluation phase.'
      }
    ],
    frontendConnection: 'Modern web bundlers (Webpack, Vite) have simulated ESM for years. However, in Node, ESM is natively executed by the runtime. This means file extensions (like `.js` or `.mjs`) are MANDATORY in imports, and there is no automatic directory resolution (like importing `./utils` instead of `./utils/index.js`) without custom flags.'
  },
  {
    id: 'core-modules',
    title: '4. Core Built-In Modules',
    level: 'beginner',
    subtitle: 'fs, path, http, buffer, and event emitters',
    description: 'Node.js provides a high-quality suite of standard modules that communicate directly with the operating system. Understanding these core modules is essential because every framework (including Express) is built directly on top of them.',
    keyPoints: [
      'fs (File System): Offers sync, async-callback, and async-promise (from \'fs/promises\') methods. Use stream or promise APIs; never block the main thread with sync calls in a web server.',
      'path: Resolves relative directories safely across operating systems. Windows uses backslashes (\\) while Unix uses forward slashes (/). Always use `path.join` or `path.resolve` over raw string concatenation.',
      'Buffer: Binary memory storage. JS originally only handled strings. Buffers represent raw, fixed-size memory allocations outside the V8 heap, allowing Node to process binary streams (files, images, TCP packets).',
      'EventEmitter: The basis of event-driven programming. Many core components (Streams, HTTP requests) inherit from EventEmitter, which allows publishing and subscribing to event strings.'
    ],
    codeExample: `import { EventEmitter } from 'events';
import path from 'path';
import { Buffer } from 'buffer';

// 1. Path resolution
const fileLocation = path.resolve('src', 'components', 'EventLoop.tsx');
console.log('Absolute path:', fileLocation);

// 2. EventEmitter pattern
class DataProcessor extends EventEmitter {}
const processor = new DataProcessor();

processor.on('data', (payload) => {
  console.log('Received payload:', payload);
});

processor.emit('data', { id: 101, message: 'Process complete' });

// 3. Raw buffer operations
const buf = Buffer.from('Hello', 'utf-8');
console.log('Raw Bytes:', buf); // <Buffer 48 65 6c 6c 6f>
console.log('String decoded:', buf.toString('hex')); // 48656c6c6f`,
    misconception: 'Developers assume `path.resolve` and `path.join` are identical. They are not. `path.join` merely joins all segments together using the platform-specific delimiter. `path.resolve` always returns an absolute path, acting like navigating the terminal with `cd` starting from the current working directory (`process.cwd()`).',
    interviewOneLiner: 'Core modules provide direct OS abstraction: fs handles files, path manages cross-platform directories, Buffers handle binary memory, and EventEmitters enable custom event subscription.',
    questions: [
      {
        question: 'What is the risk of using `fs.readFileSync` inside an Express route handler?',
        answer: '`fs.readFileSync` blocks the single main thread synchronously. While a 50MB file is being read from disk, no other JavaScript can run. This means all other connected clients waiting for API responses will hang, resulting in high latency and server timeouts.'
      },
      {
        question: 'How do you prevent memory leaks when using EventEmitters?',
        answer: 'You must remove event listeners when they are no longer needed, using `emitter.off(event, listener)` or `emitter.removeListener(...)`. If you continually attach listeners (e.g., inside an active request) without cleaning them up, Node retains references to those callbacks, preventing garbage collection and leaking memory.'
      }
    ],
    frontendConnection: 'In the browser, you handle events with `addEventListener`. Under the hood, Node\'s `EventEmitter` uses a similar pub/sub pattern, but with a different method interface: `emitter.on` and `emitter.emit`. Buffers are similar to browser typed arrays (`Uint8Array`).'
  },
  {
    id: 'npm-package-json',
    title: '5. npm & package.json under the hood',
    level: 'beginner',
    subtitle: 'Dependencies, lockfiles, semver, and script lifecycles',
    description: 'The `package.json` file is the manifest of your Node project. The package manager (npm, pnpm, yarn) uses this to build the `node_modules` dependency tree.',
    keyPoints: [
      'dependencies vs devDependencies: devDependencies are build tools, linters, and type declarations that are not executed in production. production dependencies are runtime-critical.',
      'Semantic Versioning (Semver): Given a version `MAJOR.MINOR.PATCH`, `^1.2.3` (caret) allows updates to minor and patch releases (any `1.x.x` >= `1.2.3`). `~1.2.3` (tilde) allows updates to patch releases only (`1.2.x` >= `1.2.3`).',
      'The Lockfile (package-lock.json): Locks down the exact, nested dependency version tree installed at the time of commit. It ensures that every developer and production server builds the absolute identical dependency graph.',
      'npm scripts: Execute local binaries installed inside `node_modules/.bin` without needing them installed globally on the system.'
    ],
    codeExample: `{
  "name": "node-express-handbook",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx server.ts",
    "build": "vite build",
    "start": "node dist/server.cjs"
  },
  "dependencies": {
    "express": "^4.21.2"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "typescript": "^5.0.0"
  }
}`,
    misconception: 'Many developers think deleting `package-lock.json` is a harmless way to fix weird installation errors. Doing this is dangerous in production teams. Without the lockfile, running `npm install` on a new server might install newer minor or patch updates of transitive packages that contain breaking changes, causing production-only crashes.',
    interviewOneLiner: 'The package.json declares your app configuration and semver rules, while package-lock.json freezes the exact dependency tree to guarantee deterministic, repeatable builds.',
    questions: [
      {
        question: 'What is the difference between `npm install` and `npm ci`?',
        answer: '`npm install` reads `package.json` to calculate dependency versions and may update the lockfile if newer compatible versions exist. `npm ci` (clean install) is designed for automated pipelines and CI/CD. It deletes `node_modules`, reads the lockfile strictly (failing if it does not match `package.json`), and installs the exact versions instantly without making any updates.'
      },
      {
        question: 'What is a transitive dependency?',
        answer: 'A transitive dependency is a package that is required by one of your direct dependencies, rather than being explicitly declared in your own `package.json`. These are resolved recursively by npm and mapped into your lockfile.'
      }
    ],
    frontendConnection: 'Frontend frameworks use the exact same npm packaging structures. However, remember that in frontend, bundlers bundle all dependencies into a single output file for the client, whereas Node executes files directly from `node_modules` at runtime.'
  },
  {
    id: 'raw-http-vs-express',
    title: '6. Raw HTTP vs. Why Express Exists',
    level: 'intermediate',
    subtitle: 'Building a server from scratch and the need for abstraction',
    description: 'Before jumping into Express, you must understand how Node handles raw TCP and HTTP. Express is simply a thin abstraction layer built directly over Node\'s built-in `http` module. Building a server manually shows exactly what Express handles behind the scenes.',
    keyPoints: [
      'The `http.createServer` callback receives two crucial streams: `req` (IncomingMessage, a Readable stream) and `res` (ServerResponse, a Writable stream).',
      'No Router: Node\'s raw HTTP server gives you a single callback. You must manually parse `req.url` and `req.method` inside a massive nested `switch/case` block to implement routing.',
      'Manual Body Parsing: To read a POST body, you must listen to stream events (`data` chunks) and join them into a Buffer, then parse it manually.',
      'Express simplifies this by wrapping these core streams, providing an elegant router, body parsing middlewares, and helper methods like `res.json()` or `res.status()`.'
    ],
    codeExample: `// --- The RAW Node.js HTTP Way ---
import http from 'http';

const rawServer = http.createServer((req, res) => {
  // Manual URL parsing
  const url = new URL(req.url || '', \`http://\${req.headers.host}\`);

  if (url.pathname === '/api/user' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const parsed = JSON.parse(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ received: parsed, raw: true }));
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

// --- The EXPRESS Way ---
import express from 'express';
const app = express();

app.use(express.json()); // Built-in parsing middleware

app.post('/api/user', (req, res) => {
  res.json({ received: req.body, express: true }); // Clean abstractions
});`,
    misconception: 'People assume Express is a heavy server framework. Actually, Express is extremely lightweight. If you inspect the Express source code, it consists mostly of a router module and a middleware mounting pipeline, leaving your code running very close to the raw metal of Node.',
    interviewOneLiner: 'Express abstracts raw HTTP request streams, manual string routing, and chunked body parsing into a clean declarative pipeline of middlewares and routers.',
    questions: [
      {
        question: 'What does `res.json()` do under the hood that raw Node.js `res.end()` does not?',
        answer: '`res.json()` automatically sets the `Content-Type` header to `application/json; charset=utf-8`, runs `JSON.stringify()` on your object to serialize it, sets the `Content-Length` header, and then calls `res.end()` with the string data.'
      },
      {
        question: 'How does raw HTTP handle request body streams?',
        answer: 'The request object `req` is an instances of `http.IncomingMessage` which implements the Readable Stream interface. Because data arrives in chunks over a TCP socket, you must listen to the `data` events to accumulate buffer chunks and then parse the full payload inside the `end` event callback.'
      }
    ],
    frontendConnection: 'Think of Express as similar to routing/fetching libraries in frontend. Instead of manually parsing paths in the browser and managing fetch response streams, libraries like react-router or axios abstract the complexity. Express does the identical task on the server-side.',
    visualizerType: 'blocking'
  },
  {
    id: 'express-fundamentals',
    title: '7. Express Fundamentals',
    level: 'intermediate',
    subtitle: 'App setup, Routing, Route Params, Query Strings, and HTTP Stream Objects',
    description: 'An Express application is essentially a pipeline. It takes an incoming request stream, matches it against routing patterns, parses query parameters, and generates a response stream.',
    keyPoints: [
      'The App Object: The core application instance where settings, middleware, and routes are registered.',
      'Route Parameters: Dynamic URL path segments defined with colons (`/users/:id`). Express matches these via regex and populates the `req.params` object.',
      'Query Strings: Key-value pairs after the question mark (`/search?q=node`). Express automatically parses these into the `req.query` object.',
      'Request & Response: `req` and `res` are extended versions of Node\'s raw HTTP streams. You can pipe files, set headers, and terminate connection flows directly through them.'
    ],
    codeExample: `import express from 'express';
const app = express();

// 1. Path params and Query params in action
app.get('/api/users/:userId/articles/:articleId', (req, res) => {
  // Extracting route params: /api/users/42/articles/99
  const { userId, articleId } = req.params;

  // Extracting query parameters: ?sort=desc&limit=10
  const { sort, limit } = req.query;

  res.status(200).json({
    routeParams: { userId, articleId },
    queryParams: { sort, limit },
    timestamp: new Date()
  });
});`,
    misconception: 'New developers often think `req.params` and `req.query` are strings that need manual parsing. Express parses them automatically using the `path-to-regexp` and `qs` libraries, so they are always ready as key-value objects.',
    interviewOneLiner: 'Express routing matches dynamic URL segments to req.params and query strings to req.query, wrapping Node\'s core HTTP objects with high-level developer convenience APIs.',
    questions: [
      {
        question: 'What is the difference between route parameters and query strings, and when should you use each?',
        answer: 'Route parameters (`/users/:id`) represent structural, hierarchical resource identifiers and are mandatory to locate a resource. Query strings (`/users?status=active`) represent optional modifiers, such as filters, sorting, search queries, or pagination limits, and do not change the core resource path.'
      },
      {
        question: 'Can you call both `res.send()` and `res.json()` in a single route handler?',
        answer: 'No. Calling either of these methods sends headers and the response body, terminating the HTTP connection. If you attempt to call another sending method afterwards, Express will throw the famous error: `Error [ERR_HTTP_HEADERS_SENT]: Cannot set headers after they are sent to the client.`'
      }
    ],
    frontendConnection: 'This is identical to how client-side routing works (e.g., React Router). React Router uses paths like `/user/:id` to render components based on dynamic IDs, and extracts parameters via `useParams()`. Express uses the same pattern but links them to server controllers.'
  },
  {
    id: 'middleware',
    title: '8. Middleware: The Core Pipeline',
    level: 'intermediate',
    subtitle: 'Chaining, next(), and order-of-execution rules',
    description: 'In Express, EVERYTHING is middleware. A middleware is a function that has access to the Request, Response, and the `next` function in the app\'s cycle. Middlewares form a sequential execution chain.',
    keyPoints: [
      'The Middleware Signature: `(req, res, next) => { ... }`.',
      'The `next()` trigger: Crucial! If a middleware does not call `next()` (or terminate the response), the request hangs forever because Express does not know to advance.',
      'Types of Middleware: Application-level (`app.use`), Router-level (`router.use`), Built-in (`express.json`), and Error-handling.',
      'Execution Order: Middlewares run strictly in the exact order they are registered via `app.use` or HTTP verb methods. Placement is critical!'
    ],
    codeExample: `import express from 'express';
const app = express();

// Middleware 1: Logger
app.use((req, res, next) => {
  req.receivedAt = Date.now();
  console.log(\`[\${req.method}] \${req.url}\`);
  next(); // Pass control to the next middleware in the pipeline
});

// Middleware 2: Basic Auth Guard
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader === 'SecretToken') {
    next(); // Authorized!
  } else {
    // Terminate pipeline here by sending a response.
    // Notice we do NOT call next(), breaking the chain.
    res.status(401).send('Unauthorized');
  }
});

// Route Handler (Final middleware)
app.get('/api/dashboard', (req, res) => {
  res.json({ secureData: true, loadedInMs: Date.now() - req.receivedAt });
});`,
    misconception: 'Developers think calling `next()` acts like a `return` statement. It does not! Code written AFTER a `next()` call will still execute AFTER the subsequent middlewares down the chain have completed and returned. To avoid unexpected bugs, you should almost always write `return next();`.',
    interviewOneLiner: 'Express middleware functions execute sequentially in the order registered, passing control down the pipeline via next() or terminating the request by sending a response.',
    questions: [
      {
        question: 'What is the signature of an Express error-handling middleware, and where must it be registered?',
        answer: 'Error-handling middleware MUST have exactly 4 arguments: `(err, req, res, next)`. Express specifically checks the function\'s arity (`fn.length`) to identify error handlers. It must be registered at the very end of your middleware stack, after all route definitions.'
      },
      {
        question: 'What happens if you throw an error inside a middleware in Express v4?',
        answer: 'If the error is thrown in synchronous code, Express catches it automatically and forwards it to the error-handling middleware. However, if the error is thrown inside an asynchronous block (like a Promise or database callback), it will bypass Express and crash the process or trigger an unhandled promise rejection unless you catch it and pass it to `next(err)`.'
      }
    ],
    frontendConnection: 'This is the exact server-side equivalent of Interceptors in Axios or Angular, or Middleware in Next.js. They intercepts requests globally to add headers, log info, or guard routes, before passing the request along.',
    visualizerType: 'middleware'
  },
  {
    id: 'rest-api-design',
    title: '9. REST API Design',
    level: 'intermediate',
    subtitle: 'Verbs, status codes, resource modeling, and idempotency',
    description: 'Building REST APIs is the primary use case of Express. Senior engineers do not just construct routes; they strictly follow resource models, pick correct HTTP verbs, apply precise status codes, and maintain idempotency.',
    keyPoints: [
      'HTTP Verbs: Use GET (read, idempotent), POST (create, non-idempotent), PUT (replace, idempotent), PATCH (partial update, non-idempotent), and DELETE (remove, idempotent).',
      'Idempotency: An operation is idempotent if executing it multiple times yields the same system state as executing it once (e.g. GET, PUT, DELETE are idempotent).',
      'HTTP Status Codes: 200 (OK), 201 (Created), 204 (No Content), 400 (Bad Request), 401 (Unauthorized - no credentials), 403 (Forbidden - authenticated but insufficient rights), 404 (Not Found), 409 (Conflict), 500 (Internal Server Error).',
      'Resource Modeling: URLs represent nouns, not actions (e.g., use `GET /api/users` instead of `POST /api/getAllUsers`).'
    ],
    codeExample: `// Production-standard REST resource endpoints
import express from 'express';
const app = express();
app.use(express.json());

// GET /api/books - Read collection (Idempotent)
app.get('/api/books', (req, res) => {
  res.status(200).json({ books: [] });
});

// POST /api/books - Create resource (Non-idempotent)
app.post('/api/books', (req, res) => {
  const { title, author } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  res.status(201).json({ id: '101', title, author });
});

// DELETE /api/books/:id - Delete resource (Idempotent)
app.delete('/api/books/:id', (req, res) => {
  // Even if book is already deleted, returning 204 preserves idempotency.
  res.status(204).end();
});`,
    misconception: 'Many developers think PUT and PATCH are identical. In REST standards, PUT is a complete replacement of the resource (you must send the entire payload, missing fields will be cleared). PATCH is a partial update (you only send the specific fields you want to change).',
    interviewOneLiner: 'REST API design maps standard HTTP verbs to resource nouns, ensuring correct status codes and respecting the semantic rules of idempotency.',
    questions: [
      {
        question: 'What is the difference between a 401 and 403 status code?',
        answer: '401 (Unauthorized) means the user\'s identity has not been verified (they are unauthenticated). 403 (Forbidden) means the user\'s identity is verified, but they do not have permission or roles to access the specific resource.'
      },
      {
        question: 'Why is a POST request considered non-idempotent, while PUT is idempotent?',
        answer: 'If you send a POST request multiple times, the server will create multiple new resources (e.g., spawning duplicate database records). If you send a PUT request multiple times with the same ID, the first request creates/replaces the resource, and subsequent requests simply replace it with the identical state, leaving the system unchanged.'
      }
    ],
    frontendConnection: 'When building frontends, you make API requests using tools like Fetch or React Query. Structuring RESTful routes properly makes your client-side API layer highly predictable, allowing you to easily map UI events (Create, Edit, Delete) to clean HTTP verbs.'
  },
  {
    id: 'request-bodies',
    title: '10. Handling Request Bodies',
    level: 'intermediate',
    subtitle: 'JSON, URL-encoded parsing, and file upload structures',
    description: 'HTTP requests transmit payloads as raw binary streams. To access these payloads as clean JavaScript objects inside `req.body`, Express requires specialized parsers depending on the payload\'s content-type.',
    keyPoints: [
      'express.json(): Parses incoming requests with `application/json` content-types. Rejects payloads that exceed standard size limits (default 100kb) to prevent Denial of Service (DoS) attacks.',
      'express.urlencoded(): Parses form submissions (`application/x-www-form-urlencoded`).',
      'Multipart/Form-Data: Standard JSON parsers cannot handle file uploads. File transmissions require multipart parsers like `multer` to stream binary chunks onto disk or cloud storage.',
      'Security limits: Always configure size limitations on request body parsers to avoid letting malicious clients stream massive multi-gigabyte payloads that crash your server\'s RAM.'
    ],
    codeExample: `import express from 'express';
const app = express();

// 1. Limit JSON body sizes strictly to prevent crash attacks
app.use(express.json({ limit: '10kb' })); 
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.post('/api/profile', (req, res) => {
  // JSON payload parsed automatically into req.body
  const { username, bio } = req.body;
  res.json({ updated: true, username });
});

// Centralized Payload Size Error Handler
app.use((err: any, req: any, res: any, next: any) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload body too large' });
  }
  next(err);
});`,
    misconception: 'Developers assume `express.json()` is loaded automatically. It is not! In Express, if you forget to add `app.use(express.json())` before your routes, `req.body` will simply resolve to `undefined`, causing silent runtime crashes when you attempt destructuring.',
    interviewOneLiner: 'Express requires specific parser middlewares to decode request body streams, which must be configured with size limits to prevent memory exhaustion attacks.',
    questions: [
      {
        question: 'Why cannot standard JSON parsers read file uploads, and how do multipart requests solve this?',
        answer: 'JSON bodies are raw text representations of structured objects. Files are large binary arrays that would be highly inefficient to encode as JSON strings (like Base64). Multipart/form-data splits the HTTP payload into distinct sections separated by boundary strings, allowing metadata and raw binary file streams to be transmitted together.'
      },
      {
        question: 'What does the `extended: true` option inside `express.urlencoded` configure?',
        answer: 'It configures which library parses the query/form string. `true` uses the `qs` library, which allows parsing nested objects and arrays. `false` uses Node\'s built-in `querystring` library, which only handles basic flat key-value pairs.'
      }
    ],
    frontendConnection: 'When writing frontend requests (e.g., using `fetch`), you specify headers: `headers: { "Content-Type": "application/json" }` and send data via `body: JSON.stringify(data)`. On the Express end, the `express.json()` middleware specifically filters for that header and decodes the string back into an object.'
  },
  {
    id: 'async-handlers',
    title: '11. Async Patterns in Route Handlers',
    level: 'intermediate',
    subtitle: 'Avoiding unhandled rejections and implementing robust try-catch chains',
    description: 'Modern Node relies heavily on async/await. However, because Express v4 was written before Promises existed, uncaught rejected promises inside async route handlers do not flow to Express error handlers natively—instead, they trigger unhandled promise rejections which can freeze or crash your process.',
    keyPoints: [
      'Express v4 Routing Limitations: Inside async routes, throwing an error or having a Promise reject will not trigger the error middleware. You must explicitly catch it and pass it to `next(err)`.',
      'The manual pattern: Wrapping every async controller block inside a tedious `try { ... } catch (err) { next(err) }` block.',
      'The Async Wrapper Pattern: Utilizing a higher-order wrapper function to automatically wrap async routes, catching rejections and passing them to `next`.',
      'Express v5 Native Support: Modern Express v5 natively handles async rejections automatically, but understanding the wrapper pattern remains a senior requirement for legacy and high-performance setups.'
    ],
    codeExample: `// The standard high-order async wrapper helper
const asyncHandler = (fn: Function) => {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Application setup
import express from 'express';
const app = express();

// Route controller wrapped cleanly
app.get('/api/users/:id', asyncHandler(async (req, res) => {
  // database call that might throw an error (e.g., Connection Refused)
  const user = await db.findUser(req.params.id); 
  
  if (!user) {
    // This throw is caught by the asyncHandler wrapper and forwarded to next()
    throw new Error('User not found'); 
  }
  
  res.json(user);
}));

// Centralized error handler middleware
app.use((err: any, req: any, res: any, next: any) => {
  res.status(500).json({ error: err.message });
});`,
    misconception: 'New full-stack developers believe that putting a global `try/catch` block around the active Express listening code can catch runtime router errors. It cannot. Router controller loops are executed asynchronously inside the Event Loop, completely detached from the original app startup call stack.',
    interviewOneLiner: 'Async route handlers in Express v4 require wrapping or explicit try-catch blocks to safely forward rejected promise errors to centralized error middlewares via next(err).',
    questions: [
      {
        question: 'Why does an uncaught rejected promise crash or threaten a Node.js server process?',
        answer: 'Uncaught rejections leave the application in an unpredictable, unstable state. If a promise fails silently (e.g., a database connection times out), subsequent requests might hang or reference corrupted memory. Node.js deprecates silent unhandled rejections, and default behaviors now terminate the process via uncaught exception triggers.'
      },
      {
        question: 'How does the asyncHandler wrapper function work under the hood?',
        answer: 'It is a higher-order function that takes an async middleware function, returns a new standard middleware function, executes the original function within a resolved Promise (`Promise.resolve`), and chain-links a `.catch(next)` callback to automatically capture any thrown exceptions or rejected promises and forward them directly to Express.'
      }
    ],
    frontendConnection: 'In React, if a component throws an error during rendering, the entire app crashes unless you wrap it in an Error Boundary. In Express, route controllers are like components: if they crash, the connection crashes. The `asyncHandler` acts like a route-level Error Boundary.'
  },
  {
    id: 'error-handling',
    title: '12. Advanced Error Architecture',
    level: 'advanced',
    subtitle: 'Operational vs Programmer errors and centralizing handler flows',
    description: 'A resilient Node server must classify errors and handle them systematically. Letting uncaught programmer errors persist on a live thread is dangerous; a senior engineer separates predictable runtime issues from fatal application bugs.',
    keyPoints: [
      'Operational Errors: Known, expected run-time issues that can happen in healthy apps (e.g. invalid inputs, missing resources, database timeout, authentication failures). These must be caught, returned as clean HTTP responses, and logged.',
      'Programmer Errors: Unexpected bugs or code failures (e.g. ReferenceError, SyntaxError, calling a property of undefined). These render the running Node process unstable.',
      'Centralized Custom Error Class: Extending the standard JavaScript `Error` to append custom `statusCode` and `isOperational` flags.',
      'Process Lifecycle Control: For programmer errors, log the details, flush active connections, and IMMEDIATELY call `process.exit(1)`. Let your orchestrator (PM2, Kubernetes) spin up a fresh, clean process instance.'
    ],
    codeExample: `// 1. Custom Operational AppError Class
class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Identifies this as a manageable operational error
    Error.captureStackTrace(this, this.constructor);
  }
}

// 2. Centralized Express Error Handler Middleware
const errorHandler = (err: any, req: any, res: any, next: any) => {
  const status = err.statusCode || 500;
  
  if (err.isOperational) {
    // Send clean, secure messages to client
    res.status(status).json({ status: 'fail', error: err.message });
  } else {
    // Fatal Programmer Error! Log deep details (but don't expose stack traces to client)
    console.error('🔥 CRITICAL UNHANDLED ERROR:', err);
    res.status(500).json({ status: 'error', error: 'Internal server error occurred' });
    
    // Graceful process exit flow
    // process.exit(1); (Handled by process crash listener)
  }
};`,
    misconception: 'Many developers keep a server running forever after an `uncaughtException` occurs. This is bad practice. An uncaught exception means your application code is in an undefined state. Continuing to run risks writing corrupted data to databases or leaving open sockets hanging. You must fail fast and restart.',
    interviewOneLiner: 'Operational errors should be caught, decorated with custom HTTP status codes, and returned safely; programmer errors are fatal, requiring logging and a clean, immediate process restart.',
    questions: [
      {
        question: 'Why is it important to use `Error.captureStackTrace` inside a custom error class?',
        answer: 'It prevents the custom error class\'s own constructor from appearing in the generated stack trace. This keeps the stack trace clean and focused entirely on the exact line of code where the error was instantiated, simplifying debugging.'
      },
      {
        question: 'How do you handle unhandled promise rejections globally in Node.js?',
        answer: 'You register a listener on the process object: `process.on("unhandledRejection", (reason, promise) => { ... })`. Inside, you should log the error and transition to a graceful shutdown, letting a supervisor process handle the restart.'
      }
    ],
    frontendConnection: 'In the frontend, exposing a stack trace in the console is benign (the client already has the source code). In backend development, exposing a database stack trace in an API response is a massive security vulnerability, revealing table names, database dialects, and private file hierarchies.',
    visualizerType: 'middleware'
  },
  {
    id: 'streams-backpressure',
    title: '13. Streams & Backpressure',
    level: 'advanced',
    subtitle: 'Readable/Writable pipelines and the mechanics of consumer congestion',
    description: 'When reading large files or proxying media, reading everything into RAM as a single buffer is dangerous. Streams allow processing data chunk-by-chunk in real-time, holding minimal memory overhead. However, if the source reads faster than the target can write, memory builds up, causing Backpressure.',
    keyPoints: [
      'Stream Types: Readable (data source), Writable (data destination), Duplex (both read/write, e.g. TCP socket), Transform (modifies data as it passes through).',
      'The highWaterMark: The maximum internal buffer threshold (default 16kb for strings/buffers) that a stream maintains before pausing.',
      'Backpressure: When a Writable stream\'s buffer is full, its `.write()` method returns `false`. This warns the Readable source to call `.pause()`. Once the Writable drains its buffer, it fires a `drain` event, signaling the Readable to `.resume()`.',
      'Piping: `readable.pipe(writable)` automatically handles all backpressure logic under the hood.'
    ],
    codeExample: `import fs from 'fs';
import { Transform } from 'stream';

// Create a Readable stream of a massive file
const readable = fs.createReadStream('./massive.log', { highWaterMark: 1024 });

// Transform stream that converts text to uppercase chunk by chunk
const upperCaseTransform = new Transform({
  transform(chunk, encoding, callback) {
    this.push(chunk.toString().toUpperCase());
    callback(); // Finished processing this chunk
  }
});

// Create Writable stream
const writable = fs.createWriteStream('./uppercase.log');

// Pipe automatically manages backpressure:
// If writable cannot write fast enough, readable will be paused automatically
readable.pipe(upperCaseTransform).pipe(writable);

writable.on('finish', () => console.log('Streaming complete!'));`,
    misconception: 'Developers assume `fs.readFile()` is always sufficient. For small files, it is fine. But if your server receives concurrent requests for a 500MB file and you use `fs.readFile()`, Node will read the entire 500MB into RAM per request. Just 4 concurrent requests will consume 2GB of memory, crashing your container on heap limitations. Streams solve this by keeping memory usage constant (e.g. 16KB per stream).',
    interviewOneLiner: 'Streams process data chunk-by-chunk with constant memory usage; backpressure is the mechanism where a slow writable signals a fast readable to pause streaming, avoiding memory congestion.',
    questions: [
      {
        question: 'What is backpressure and how is it signaled in Node.js streams?',
        answer: 'Backpressure occurs when the consumer (Writable) is slower than the producer (Readable). The Writable signals this by returning `false` on its `.write(chunk)` method, indicating its buffer has crossed the `highWaterMark`. The pipeline then pauses the Readable stream until the Writable flushes its cache and emits the `drain` event.'
      },
      {
        question: 'What is the modern alternative to `.pipe()` and why is it preferred?',
        answer: 'The modern alternative is `pipeline()` from the `stream/promises` or `stream` module (e.g. `await pipeline(read, transform, write)`). Unlike standard `.pipe()`, which does not automatically destroy streams or propagate errors if one of the middle streams in the chain fails, `pipeline` cleans up resources automatically and simplifies error handling with promises.'
      }
    ],
    frontendConnection: 'Browsers also support streams (the Fetch API returns response bodies as streams). If you fetch a massive JSON file or stream a video, you can decode the stream chunk-by-chunk in the browser, rendering parts of the UI before the file is fully downloaded.',
    visualizerType: 'streams'
  },
  {
    id: 'perf-scaling',
    title: '14. Performance, Clustering, & Worker Threads',
    level: 'advanced',
    subtitle: 'Multiplexing CPU cores and executing intensive calculations safely',
    description: 'Since Node is single-threaded, it cannot naturally distribute work across multi-core CPUs, and running CPU-bound operations blocks the Event Loop entirely. To scale, Node provides two distinct architectures: Clustering and Worker Threads.',
    keyPoints: [
      'Clustering (Multi-Process): Spawns multiple independent copies of your Node.js process (one per CPU core). The primary process manages port sharing and routes incoming TCP connections using a Round-Robin algorithm. Each worker operates its own separate memory heap and Event Loop.',
      'Worker Threads (Multi-Thread): Creates multiple lightweight threads within the same parent process. Workers can share raw memory buffer spaces (`SharedArrayBuffer`), making them ideal for parallelizing CPU-bound operations (e.g., image resizing, encryption).',
      'Event Loop Blocking: Standard code execution blocks the loop. Avoid synchronous cryptography, massive array iterations, or deep recursive parsing on the main thread.'
    ],
    codeExample: `// --- CLUSTERING EXAMPLE (Multi-Process Server) ---
import cluster from 'cluster';
import http from 'http';
import os from 'os';

if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  console.log(\`Primary process running. Forking \${numCPUs} workers...\`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork(); // Spawns a worker process
  }

  cluster.on('exit', (worker) => {
    console.log(\`Worker \${worker.process.pid} died. Forking replacement...\`);
    cluster.fork();
  });
} else {
  // Workers share the TCP port!
  http.createServer((req, res) => {
    res.writeHead(200);
    res.end(\`Handled by worker process PID: \${process.pid}\\n\`);
  }).listen(3000);
}`,
    misconception: 'Developers often confuse Cluster and Worker Threads. Remember: Use Clusters to scale overall HTTP network throughput across CPU cores (perfect for high-traffic, stateless Express APIs). Use Worker Threads specifically to offload isolated CPU-intensive computation blocks without blocking your main event loop.',
    interviewOneLiner: 'Clusters multiply stateless network throughput by duplicating entire processes across CPU cores; Worker Threads run parallel CPU-intensive calculations sharing memory within a single process.',
    questions: [
      {
        question: 'Why is Node.js considered a poor choice for CPU-bound tasks like video rendering or raw machine learning?',
        answer: 'Node.js is designed for I/O-bound operations. Since all JavaScript runs on a single main thread, a heavy calculation (like video rendering or deep loop parsing) blocks the event loop. While that calculation is crunching, the server cannot accept new network requests, making the entire API unresponsive.'
      },
      {
        question: 'How do Worker Threads communicate with the main thread?',
        answer: 'They communicate via the `MessagePort` API using event-driven message passing (`parentPort.postMessage()` and `worker.on("message", ...)`). Because they live in the same process, they can also share memory allocations directly using `SharedArrayBuffer` objects, avoiding serialization overhead.'
      }
    ],
    frontendConnection: 'This is identical to Web Workers in the browser. Web Workers run scripts in a background thread, preventing heavy computing operations from blocking the browser\'s UI render loop, communicating back via postMessage.',
    visualizerType: 'scaling'
  },
  {
    id: 'security-essentials',
    title: '15. Production Security Essentials',
    level: 'advanced',
    subtitle: 'Helmet, Rate Limiting, CORS preflights, and Injection mitigation',
    description: 'Securing an Express application is a fundamental senior skill. An unconfigured Express API leaks default framework banners, lacks transport enforcement, and is easily susceptible to brute-force or injection attacks.',
    keyPoints: [
      'Helmet: Middleware that sets secure HTTP response headers. It hides the `X-Powered-By: Express` header, enforces HTTPS via HSTS, and prevents clickjacking and MIME-type sniffing.',
      'Rate Limiting: Prevents DDoS or brute-force logins by restricting the number of API calls an IP address can make in a given timeframe.',
      'CORS (Cross-Origin Resource Sharing): A security mechanism that restricts resources from being requested from an outside domain. Configure explicit whitelists; never deploy `origin: "*"` in production.',
      'SQL / NoSQL Injection: Never pass unvalidated user inputs directly into raw database strings. Always use parameterized queries or trusted ORM sanitizations.'
    ],
    codeExample: `import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

const app = express();

// 1. Enforce strict security headers
app.use(helmet());

// 2. Configure safe CORS whitelists
const whitelist = ['https://my-secure-frontend.com'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// 3. Mitigation against SQL Injection (Conceptual)
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  // ❌ VULNERABLE: db.query(\`SELECT * FROM users WHERE user = '\${username}'\`)
  // ✅ SECURE: Uses parameterized bindings to escape inputs safely
  // db.query('SELECT * FROM users WHERE user = ?', [username])
  
  res.json({ secured: true });
});`,
    misconception: 'Developers assume CORS is a server-side firewall that prevents hackers from hitting their API. This is completely false. CORS is a browser-only enforcement mechanism. A script running inside a browser is blocked, but an attacker can still easily hit your API directly using curl, Postman, or a Python script.',
    interviewOneLiner: 'Express security requires defense-in-depth: Helmet for headers, strict CORS domain whitelisting, rate limiting to block brute force, and parameterized queries to eliminate injections.',
    questions: [
      {
        question: 'What is a CORS preflight request, and which HTTP verb does it use?',
        answer: 'A preflight request is an initial handshake sent automatically by the browser before executing a "complex" cross-origin request (like POST with JSON, or custom headers). It uses the `OPTIONS` method to verify that the target server authorizes the caller origin and headers.'
      },
      {
        question: 'How does helmet protect against clickjacking attacks?',
        answer: 'Helmet sets the `X-Frame-Options` and `Content-Security-Policy: frame-ancestors` headers. These headers instruct browsers not to render the page inside nested `<iframe>`, `<embed>`, or `<object>` tags from untrusted domains, preventing malicious overlays.'
      }
    ],
    frontendConnection: 'In the frontend, when you make a cross-origin request and see a "CORS Error" in the console, that is your browser protecting you. The server actually received the request and sent a response, but the browser threw it away because the server did not include the correct `Access-Control-Allow-Origin` headers.'
  },
  {
    id: 'auth-strategies',
    title: '16. Auth: Stateful Sessions vs. Stateless JWTs',
    level: 'advanced',
    subtitle: 'Security tradeoffs, cookie storage, and cryptographically signed tokens',
    description: 'Authentication is the foundation of backend access control. Senior architects choose between stateful session models and stateless JWT (JSON Web Token) models based on horizontal scaling and security constraints.',
    keyPoints: [
      'Stateful Sessions: The server generates a unique session ID, stores session data in memory or Redis, and sends the session ID to the client in a secure, HTTP-only Cookie. On each request, the server reads the cookie and queries Redis to authenticate.',
      'Stateless JWTs: The server generates a cryptographic JSON token signed with a private secret. The client stores the token (usually in local storage or an HTTP-only cookie) and sends it in the `Authorization: Bearer <token>` header. The server authenticates purely by verifying the token signature without database queries.',
      'Horizontal Scale Tradeoff: JWT is frictionless because any server instance can verify the signature. Sessions require a shared fast cache (Redis) so all instances can access session states.',
      'Revocation Tradeoff: Session models can destroy sessions instantly in Redis. JWTs are hard to revoke before expiry unless you build complex blacklist infrastructures.'
    ],
    codeExample: `import express from 'express';
// Conceptual JWT Middleware validation
import jwt from 'jsonwebtoken';

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-super-secret';

// Auth Guard Middleware
const authenticateJWT = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, JWT_SECRET, (err: any, decodedUser: any) => {
      if (err) {
        return res.status(403).json({ error: 'Token is invalid or expired' });
      }
      req.user = decodedUser; // Attach cryptographically verified user
      next();
    });
  } else {
    res.status(401).json({ error: 'Missing authorization bearer token' });
  }
};

app.get('/api/admin', authenticateJWT, (req, res) => {
  res.json({ secretSalesData: true, user: req.user });
});`,
    misconception: 'Many developers believe JWT payloads are encrypted. This is a severe misunderstanding. Standard JWT payloads are merely Base64Encoded strings. Anyone can decode a JWT and read its fields (username, roles, email). Never store passwords, API keys, or sensitive PII inside a JWT payload.',
    interviewOneLiner: 'Sessions are stateful and easily revocable but require database lookups; JWTs are stateless and highly scalable but impossible to revoke before expiry without blacklists.',
    questions: [
      {
        question: 'Why are secure HttpOnly cookies preferred over LocalStorage for storing JWTs or Session IDs?',
        answer: 'Cookies configured with `HttpOnly` are inaccessible to client-side JavaScript. This completely eliminates the threat of token theft via Cross-Site Scripting (XSS) attacks. Additionally, configuring `Secure` ensures cookies are only transmitted over encrypted HTTPS, and `SameSite: Strict` mitigates Cross-Site Request Forgery (CSRF).'
      },
      {
        question: 'What is a JWT refresh token, and why is it used?',
        answer: 'A refresh token is a long-lived, securely stored token used exclusively to request fresh, short-lived access tokens (e.g. valid for 15 minutes). This limits the window of opportunity for an attacker if a temporary access token is intercepted.'
      }
    ],
    frontendConnection: 'In modern Next.js or React apps, choosing how to store authentication state is crucial. When accessing third-party APIs from the browser, we use stateless JWTs. But when storing login states in our own domain, secure, HTTP-only cookies are the gold standard for security.',
    visualizerType: 'auth'
  },
  {
    id: 'layered-architecture',
    title: '17. Clean Layered Architecture',
    level: 'advanced',
    subtitle: 'Decoupling routes, controllers, services, and data access layers',
    description: 'Placing database queries, routing logic, validation, and business rules inside a single Express route file is an anti-pattern. Enterprise applications use Layered Architecture (often referred to as 3-Tier Architecture) to isolate concerns.',
    keyPoints: [
      'Routing Layer: Responsible only for parsing HTTP request parameters, mapping paths, and passing control to Controllers.',
      'Controller Layer: Orchestrates the request lifecycle. Extracts payloads, handles basic validation, forwards parameters to Services, maps returned results, and sends HTTP responses.',
      'Service Layer: The heart of the application. Houses all core business rules, calculations, integrations, and logic. Completely detached from Express (unaware of `req` or `res`).',
      'Data Access Layer (Repository): Communicates directly with the database or ORM. Performs queries and translates records to business entities.'
    ],
    codeExample: `// --- 1. DATA ACCESS LAYER (user.repository.ts) ---
class UserRepository {
  async fetchById(id: string) {
    return db.query('SELECT * FROM users WHERE id = ?', [id]);
  }
}

// --- 2. SERVICE LAYER (user.service.ts) ---
class UserService {
  private userRepo = new UserRepository();

  async getUserProfile(id: string) {
    const user = await this.userRepo.fetchById(id);
    if (!user) throw new Error('UserProfileMissing');
    // Apply core business logic: decorate user statistics, filter fields
    return { ...user, calculatedRating: 100 };
  }
}

// --- 3. CONTROLLER LAYER (user.controller.ts) ---
class UserController {
  private userService = new UserService();

  getUser = async (req: any, res: any, next: any) => {
    try {
      const { id } = req.params;
      const profile = await this.userService.getUserProfile(id);
      return res.status(200).json(profile);
    } catch (err: any) {
      if (err.message === 'UserProfileMissing') {
        return res.status(404).json({ error: 'User profiles do not exist' });
      }
      next(err); // Forward unexpected errors to central handler
    }
  };
}

// --- 4. ROUTER LAYER (user.routes.ts) ---
import { Router } from 'express';
const router = Router();
const controller = new UserController();
router.get('/users/:id', controller.getUser);`,
    misconception: 'New full-stack developers believe that because they use an ORM (like Prisma or Mongoose) they don\'t need a layered architecture. An ORM is merely a tool for the Data Access Layer. Mixing routing with database modeling still tightly couples your application to Express and your specific database, preventing clean mock testing.',
    interviewOneLiner: 'Layered architecture decouples application concerns into isolated Tiers: Routing processes HTTP, Controllers map request lifecycles, Services execute business rules, and Repositories run database queries.',
    questions: [
      {
        question: 'Why should the Service Layer be completely decoupled from Express?',
        answer: 'Decoupling services from Express ensures they can be tested in isolation using pure unit tests without needing to mock complex HTTP request/response streams. Additionally, this allows the identical business logic to be triggered by other interfaces, such as message queues (RabbitMQ), CLI cron scripts, or GraphQL schemas.'
      },
      {
        question: 'What is Dependency Injection (DI) and how does it improve layered architecture?',
        answer: 'Dependency Injection is the design pattern where a class receives its dependencies from the outside rather than instantiating them internally. By injecting mock dependencies (e.g. passing a MockUserRepository into the UserService constructor), you can test service business logic independently without making real network database queries.'
      }
    ],
    frontendConnection: 'This mirrors modern architectural patterns in large-scale frontend apps. In Angular, you decouple components (view controllers) from Services (API fetching and global state). Decoupling keeps your view elements stupid and your services smart.'
  },
  {
    id: 'testing-node',
    title: '18. Testing: Unit, Integration, & Supertest',
    level: 'advanced',
    subtitle: 'Isolating logical units and testing server endpoints programmatically',
    description: 'Testing backends requires different tools than frontends. We don\'t test button clicks; we test logical operations (Unit Testing) and full HTTP endpoints from request to response (Integration Testing).',
    keyPoints: [
      'Unit Tests: Focus on isolated pieces of code, primarily Service Layer functions, mocking all databases and external dependencies.',
      'Integration Tests: Verify that different modules work together. For APIs, this means starting your Express application and firing virtual requests at it.',
      'Supertest: A library that lets you test Express configurations programmatically. It wraps the Express app, creates virtual HTTP request streams, and asserts on status codes, body payloads, and headers without binding to a real network socket.'
    ],
    codeExample: `// --- INTEGRATION TEST WITH SUPERTEST (user.test.ts) ---
import request from 'supertest';
import express from 'express';

const app = express();
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

describe('GET /api/health', () => {
  it('should respond with 200 OK and valid JSON metadata', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toEqual({ status: 'healthy' });
  });
});`,
    misconception: 'Many developers think they have to launch their live Express server using `app.listen(3000)` in order to run tests. Supertest does not require this. If you export your `app` configuration without calling `.listen()`, Supertest launches a high-performance virtual server instance locally on-the-fly, preventing port conflicts during parallel test execution.',
    interviewOneLiner: 'Backend testing maps unit tests to isolated service logic using mocks, and integration tests to Express routers using Supertest to assert on HTTP states without binding ports.',
    questions: [
      {
        question: 'What is the role of mocking in database integration testing?',
        answer: 'In unit tests, mocking database connections (e.g. using Jest/Vitest spy functions) ensures tests run in milliseconds without requiring a database online. In full integration tests, developers often prefer running tests against a real, lightweight database (like a Dockerized PostgreSQL instance) to verify that queries and transactions function correctly.'
      },
      {
        question: 'How do you test routes that require JWT authorization using Supertest?',
        answer: 'You generate a mock JWT signed with the testing secret inside your test suite, and then append it to your Supertest request using the `.set()` method: `.set("Authorization", "Bearer " + mockToken)`.'
      }
    ],
    frontendConnection: 'In the browser, you use tools like Testing Library to simulate DOM actions and check layouts. In the backend, there is no DOM. Testing focuses on API payload verification, data integrity, security validation, and boundary conditions, which are fast and reliable to execute.'
  },
  {
    id: 'db-patterns',
    title: '19. Database Connection Pooling & N+1',
    level: 'advanced',
    subtitle: 'Managing database sockets, pooling mechanics, and performance traps',
    description: 'Connecting an Express server to a SQL or NoSQL database is more than just importing a client. Senior engineers must master connection pooling and avoid infamous database round-trip performance bottlenecks.',
    keyPoints: [
      'Connection Costs: Opening a TCP socket to a database requires a multi-step cryptographic handshake, costing up to hundreds of milliseconds. Opening a new socket for every single incoming HTTP request blocks your API.',
      'Connection Pooling: Spawns a pre-warmed set of database connections (e.g., pool of 10) on server startup. When a request queries the database, it acquires an idle connection from the pool instantly, uses it, and returns it to the pool when finished.',
      'The N+1 Query Problem: A severe database bottleneck. Occurs when you fetch a list of N parent records, then loop through them to fetch child records in separate queries, resulting in N+1 database round-trips.',
      'Solving N+1: Use SQL JOINs, database subqueries, or eager-loading strategies to fetch all required parent and child records in a single query.'
    ],
    codeExample: `// --- ❌ THE N+1 ANTI-PATTERN (Massive Latency) ---
async function badGetArticlesWithAuthors() {
  const articles = await db.query('SELECT * FROM articles LIMIT 100'); // 1 query
  
  for (const article of articles) {
    // Spawns 100 extra database queries in a loop! Total 101 round-trips!
    article.author = await db.query('SELECT * FROM users WHERE id = ?', [article.authorId]);
  }
  return articles;
}

// --- ✅ THE IDIOMATIC JOIN PATTERN (Single round-trip!) ---
async function goodGetArticlesWithAuthors() {
  // Joins articles and authors instantly. A single database query!
  const query = \`
    SELECT a.*, u.username as author_name, u.email as author_email 
    FROM articles a 
    INNER JOIN users u ON a.authorId = u.id 
    LIMIT 100
  \`;
  return db.query(query);
}`,
    misconception: 'New developers think expanding connection pool size to 1000 will speed up their server. It will actually slow it down and crash the database. A database is limited by hardware (CPU cores and disk I/O). Spawning hundreds of connections causes high context switching overhead. For a standard backend, a small connection pool of 10-25 connections is highly optimal and can handle thousands of concurrent requests.',
    interviewOneLiner: 'Connection pooling reuses persistent database sockets to avoid TCP handshakes; N+1 query bottlenecks are eliminated by joining queries to execute a single round-trip.',
    questions: [
      {
        question: 'What is the connection pool queue, and what happens when the pool is fully saturated?',
        answer: 'When all connections in a pool are busy executing queries and a new request arrives, it is placed in an internal waiting queue. If a connection does not free up within a configured timeout limit, the request rejects with a "Connection timeout" or "Queue limit exceeded" error.'
      },
      {
        question: 'What is database hydration and why does it affect performance?',
        answer: 'Hydration is the process where an ORM parses raw tabular database row structures into complex JavaScript objects with helper methods. For large datasets, this hydration process runs on Node\'s single main thread, causing heavy CPU bottlenecks. Using raw queries (or turning off ORM hydration) bypasses this completely.'
      }
    ],
    frontendConnection: 'Think of database connection pooling like a pool of HTTP connections managed by your browser. Browsers limit simultaneous TCP connections to a single domain to 6 connections, queuing subsequent requests to prevent client and server resource exhaustion.',
    visualizerType: 'database'
  }
];
