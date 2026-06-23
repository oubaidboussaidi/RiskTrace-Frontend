

export interface IntegrationTab {
  id: string;
  label: string;
  descKey: string;
}

export const INTEGRATION_TABS: IntegrationTab[] = [
  { id: 'frontend', label: 'Frontend (JS)',  descKey: 'SITES.INTEGRATION.DESC_FRONTEND' },
  { id: 'nodejs',   label: 'Node.js',        descKey: 'SITES.INTEGRATION.DESC_NODEJS'   },
  { id: 'spring',   label: 'Spring Boot',    descKey: 'SITES.INTEGRATION.DESC_SPRING'   },
  { id: 'csharp',   label: '.NET Core',      descKey: 'SITES.INTEGRATION.DESC_CSHARP'   },
  { id: 'python',   label: 'Python',         descKey: 'SITES.INTEGRATION.DESC_PYTHON'   },
  { id: 'php',      label: 'PHP',            descKey: 'SITES.INTEGRATION.DESC_PHP'      },
];

export function getSnippet(tabId: string, apiKey: string, endpoint: string): string {
  switch (tabId) {

    case 'frontend':
      return `<script src="http://localhost:8084/tracker.js"\n  data-api-key="${apiKey}"></script>`;

    case 'nodejs':
      return `const riskTraceMiddleware = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (res.statusCode >= 400) {
      fetch('${endpoint}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{
          apiKey: '${apiKey}',
          type: 'backend_error',
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          responseTime: Date.now() - start
        }])
      }).catch(console.error);
    }
  });
  next();
};

// Register before your routes:
app.use(riskTraceMiddleware);`;

    case 'spring':
      return `import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.net.http.*;
import java.net.URI;

@Component
public class RiskTraceFilter extends OncePerRequestFilter {

    private static final String API_KEY  = "${apiKey}";
    private static final String ENDPOINT = "${endpoint}";

    @Override
    protected void doFilterInternal(HttpServletRequest req,
            HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        long start = System.currentTimeMillis();
        chain.doFilter(req, res);
        long ms = System.currentTimeMillis() - start;

        if (res.getStatus() >= 400) {
            String body = "[{\\"apiKey\\":\\"" + API_KEY + "\\"," +
                "\\"type\\":\\"backend_error\\"," +
                "\\"method\\":\\"" + req.getMethod() + "\\"," +
                "\\"url\\":\\"" + req.getRequestURI() + "\\"," +
                "\\"statusCode\\":" + res.getStatus() + "," +
                "\\"responseTime\\":" + ms + "}]";

            // Fire-and-forget — does not block the response
            HttpClient.newHttpClient().sendAsync(
                HttpRequest.newBuilder()
                    .uri(URI.create(ENDPOINT))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build(),
                HttpResponse.BodyHandlers.discarding()
            );
        }
    }
}`;

    case 'csharp':
      return `public class RiskTraceMiddleware
{
    private readonly RequestDelegate _next;
    private const string ApiKey   = "${apiKey}";
    private const string Endpoint = "${endpoint}";

    public RiskTraceMiddleware(RequestDelegate next) => _next = next;

    public async Task Invoke(HttpContext ctx)
    {
        var start = DateTime.UtcNow;
        await _next(ctx);
        var ms = (long)(DateTime.UtcNow - start).TotalMilliseconds;

        if (ctx.Response.StatusCode >= 400)
        {
            var log = new[] { new {
                apiKey       = ApiKey,
                type         = "backend_error",
                method       = ctx.Request.Method,
                url          = ctx.Request.Path.ToString(),
                statusCode   = ctx.Response.StatusCode,
                responseTime = ms
            }};
            using var http = new HttpClient();
            await http.PostAsJsonAsync(Endpoint, log);
        }
    }
}

// In Program.cs:
// app.UseMiddleware<RiskTraceMiddleware>();`;

    case 'python':
      return `import httpx, time
from fastapi import Request

RISKTRACE_API_KEY = "${apiKey}"
RISKTRACE_ENDPOINT = "${endpoint}"

@app.middleware("http")
async def risktrace_middleware(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    ms = int((time.time() - start) * 1000)

    if response.status_code >= 400:
        async with httpx.AsyncClient() as client:
            await client.post(RISKTRACE_ENDPOINT, json=[{
                "apiKey":       RISKTRACE_API_KEY,
                "type":         "backend_error",
                "method":       request.method,
                "url":          str(request.url.path),
                "statusCode":   response.status_code,
                "responseTime": ms
            }])
    return response`;

    case 'php':
      return `<?php
// Generate with: php artisan make:middleware RiskTraceMiddleware
namespace App\\Http\\Middleware;
use Closure, Illuminate\\Http\\Request;

class RiskTraceMiddleware
{
    private const API_KEY  = '${apiKey}';
    private const ENDPOINT = '${endpoint}';

    public function handle(Request $request, Closure $next)
    {
        $start    = microtime(true);
        $response = $next($request);
        $ms       = (int)((microtime(true) - $start) * 1000);

        if ($response->status() >= 400) {
            \\Illuminate\\Support\\Facades\\Http::post(self::ENDPOINT, [[
                'apiKey'       => self::API_KEY,
                'type'         => 'backend_error',
                'method'       => $request->method(),
                'url'          => $request->path(),
                'statusCode'   => $response->status(),
                'responseTime' => $ms,
            ]]);
        }
        return $response;
    }
}
// Register in app/Http/Kernel.php -> protected $middleware = [...];`;

    default:
      return '';
  }
}
