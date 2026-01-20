import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { authMiddleware, optionalAuthMiddleware } from './middleware/auth';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || process.env.GATEWAY_PORT || 3000;

// ===========================================
// Middleware
// ===========================================

// Security headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: '*',
  credentials: true,
}));

// NOTE: Do NOT use express.json() or express.urlencoded() here!
// The gateway is a pure proxy - body parsing would consume the request stream
// and prevent the proxy from forwarding the body to downstream services.

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Request logging
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ===========================================
// Health Check
// ===========================================

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'api-gateway', timestamp: new Date().toISOString() });
});

// ===========================================
// Service Routes (Proxy)
// ===========================================

const getUserServiceUrl = () => {
  if (process.env.USER_SERVICE_ADDR) {
    return `http://${process.env.USER_SERVICE_ADDR}`;
  }
  if (process.env.USER_SERVICE_URL) {
    return process.env.USER_SERVICE_URL;
  }
  // Fallback for Render Internal DNS (Service Name)
  if (process.env.NODE_ENV === 'production') {
    return `http://unisocial-user-service:10000`;
  }
  return `http://localhost:${process.env.USER_SERVICE_PORT || 3001}`;
};

const USER_SERVICE_URL = getUserServiceUrl();
console.log(`[Gateway] Proxying to User Service at: ${USER_SERVICE_URL}`);

// Authentication service proxy
app.use('/api/auth', createProxyMiddleware({
  target: USER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/auth': '/auth' },
  onError: (err, _req, res) => {
    console.error(`[Proxy Error] Target: ${USER_SERVICE_URL} | Error:`, err.message);
    (res as express.Response).status(502).json({
      success: false,
      error: { code: 'PROXY_ERROR', message: 'Service unavailable' }
    });
  }
}));

// Apply auth middleware to protected routes
app.use('/api/users/me', authMiddleware);
app.use('/api/users/:id/follow', authMiddleware);
app.use('/api/users/:id/unfollow', authMiddleware);

// User service proxy
app.use('/api/users', optionalAuthMiddleware, createProxyMiddleware({
  target: USER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/users': '/users' },
  onError: (err, _req, res) => {
    console.error(`[Proxy Error] Target: ${USER_SERVICE_URL} | Error:`, err.message);
    (res as express.Response).status(502).json({
      success: false,
      error: { code: 'PROXY_ERROR', message: 'Service unavailable' }
    });
  }
}));

// Post service proxy (consolidated into User Service for MVP)
app.use('/api/posts', authMiddleware, createProxyMiddleware({
  target: USER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/posts': '/posts' },
  onError: (err, _req, res) => {
    console.error(`[Proxy Error] Target: ${USER_SERVICE_URL} | Error:`, err.message);
    (res as express.Response).status(502).json({
      success: false,
      error: { code: 'PROXY_ERROR', message: 'Service unavailable' }
    });
  }
}));

// Poll service proxy (consolidated into User Service for MVP)
app.use('/api/polls', authMiddleware, createProxyMiddleware({
  target: USER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/polls': '/polls' },
  onError: (err, _req, res) => {
    console.error(`[Proxy Error] Target: ${USER_SERVICE_URL} | Error:`, err.message);
    (res as express.Response).status(502).json({
      success: false,
      error: { code: 'PROXY_ERROR', message: 'Service unavailable' }
    });
  }
}));

// Notification service proxy (consolidated into User Service for MVP)
app.use('/api/notifications', authMiddleware, createProxyMiddleware({
  target: USER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/notifications': '/notifications' },
  onError: (err, _req, res) => {
    console.error(`[Proxy Error] Target: ${USER_SERVICE_URL} | Error:`, err.message);
    (res as express.Response).status(502).json({
      success: false,
      error: { code: 'PROXY_ERROR', message: 'Service unavailable' }
    });
  }
}));

// Marketplace service proxy (consolidated into User Service for MVP)
app.use('/api/marketplace', authMiddleware, createProxyMiddleware({
  target: USER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/marketplace': '/marketplace' },
  onError: (err, _req, res) => {
    console.error(`[Proxy Error] Target: ${USER_SERVICE_URL} | Error:`, err.message);
    (res as express.Response).status(502).json({
      success: false,
      error: { code: 'PROXY_ERROR', message: 'Service unavailable' }
    });
  }
}));

// Study service proxy (consolidated into User Service for MVP)
app.use('/api/study', optionalAuthMiddleware, createProxyMiddleware({
  target: USER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/study': '/study' },
  onError: (err, _req, res) => {
    console.error(`[Proxy Error] Target: ${USER_SERVICE_URL} | Error:`, err.message);
    (res as express.Response).status(502).json({
      success: false,
      error: { code: 'PROXY_ERROR', message: 'Service unavailable' }
    });
  }
}));

// Event service proxy (consolidated into User Service for MVP)
app.use('/api/events', authMiddleware, createProxyMiddleware({
  target: USER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/events': '/events' },
  onError: (err, _req, res) => {
    console.error(`[Proxy Error] Target: ${USER_SERVICE_URL} | Error:`, err.message);
    (res as express.Response).status(502).json({
      success: false,
      error: { code: 'PROXY_ERROR', message: 'Service unavailable' }
    });
  }
}));

// Gallery service proxy
app.use('/api/gallery', optionalAuthMiddleware, createProxyMiddleware({
  target: USER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/gallery': '/gallery' },
  onError: (err, _req, res) => {
    console.error(`[Proxy Error] Target: ${USER_SERVICE_URL} | Error:`, err.message);
    (res as express.Response).status(502).json({
      success: false,
      error: { code: 'PROXY_ERROR', message: 'Service unavailable' }
    });
  }
}));

// Story service proxy
app.use('/api/stories', authMiddleware, createProxyMiddleware({
  target: USER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/stories': '/stories' },
  onError: (err, _req, res) => {
    console.error(`[Proxy Error] Target: ${USER_SERVICE_URL} | Error:`, err.message);
    (res as express.Response).status(502).json({
      success: false,
      error: { code: 'PROXY_ERROR', message: 'Service unavailable' }
    });
  }
}));

// Communities service proxy
app.use('/api/communities', authMiddleware, createProxyMiddleware({
  target: USER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/communities': '/communities' },
  onError: (err, _req, res) => {
    console.error(`[Proxy Error] Target: ${USER_SERVICE_URL} | Error:`, err.message);
    (res as express.Response).status(502).json({
      success: false,
      error: { code: 'PROXY_ERROR', message: 'Service unavailable' }
    });
  }
}));

// Portfolio service proxy
app.use('/api/portfolio', authMiddleware, createProxyMiddleware({
  target: USER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/portfolio': '/portfolio' },
  onError: (err, _req, res) => {
    console.error(`[Proxy Error] Target: ${USER_SERVICE_URL} | Error:`, err.message);
    (res as express.Response).status(502).json({
      success: false,
      error: { code: 'PROXY_ERROR', message: 'Service unavailable' }
    });
  }
}));

// Search service proxy (consolidated into User Service for MVP)
app.use('/api/search', optionalAuthMiddleware, createProxyMiddleware({
  target: USER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/search': '/search' },
  onError: (err, _req, res) => {
    console.error(`[Proxy Error] Target: ${USER_SERVICE_URL} | Error:`, err.message);
    (res as express.Response).status(502).json({
      success: false,
      error: { code: 'PROXY_ERROR', message: 'Service unavailable' }
    });
  }
}));

// Upload service proxy (for file uploads)
app.use('/api/upload', authMiddleware, createProxyMiddleware({
  target: USER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/upload': '/upload' },
  onError: (err, _req, res) => {
    console.error(`[Proxy Error] Target: ${USER_SERVICE_URL} | Error:`, err.message);
    (res as express.Response).status(502).json({
      success: false,
      error: { code: 'PROXY_ERROR', message: 'Service unavailable' }
    });
  }
}));

// Static uploads proxy (for serving uploaded files)
app.use('/api/uploads', createProxyMiddleware({
  target: USER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/uploads': '/uploads' },
  onError: (err, _req, res) => {
    console.error(`[Proxy Error] Target: ${USER_SERVICE_URL} | Error:`, err.message);
    (res as express.Response).status(502).json({
      success: false,
      error: { code: 'PROXY_ERROR', message: 'Service unavailable' }
    });
  }
}));

// Messaging/Chat service proxy
app.use('/api/messaging', authMiddleware, createProxyMiddleware({
  target: USER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/messaging': '/chat' },
  onError: (err, _req, res) => {
    console.error(`[Proxy Error] Target: ${USER_SERVICE_URL} | Error:`, err.message);
    (res as express.Response).status(502).json({
      success: false,
      error: { code: 'PROXY_ERROR', message: 'Service unavailable' }
    });
  }
}));

// Resources service proxy
app.use('/api/resources', authMiddleware, createProxyMiddleware({
  target: USER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/resources': '/resources' },
  onError: (err, _req, res) => {
    console.error(`[Proxy Error] Target: ${USER_SERVICE_URL} | Error:`, err.message);
    (res as express.Response).status(502).json({
      success: false,
      error: { code: 'PROXY_ERROR', message: 'Service unavailable' }
    });
  }
}));

// Courses service proxy
app.use('/api/courses', authMiddleware, createProxyMiddleware({
  target: USER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/courses': '/courses' },
  onError: (err, _req, res) => {
    console.error(`[Proxy Error] Target: ${USER_SERVICE_URL} | Error:`, err.message);
    (res as express.Response).status(502).json({
      success: false,
      error: { code: 'PROXY_ERROR', message: 'Service unavailable' }
    });
  }
}));

// RAG (AI Q&A) service proxy
app.use('/api/rag', authMiddleware, createProxyMiddleware({
  target: USER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/rag': '/rag' },
  onError: (err, _req, res) => {
    console.error(`[Proxy Error] Target: ${USER_SERVICE_URL} | Error:`, err.message);
    (res as express.Response).status(502).json({
      success: false,
      error: { code: 'PROXY_ERROR', message: 'Service unavailable' }
    });
  }
}));

// WebSocket Proxy
app.use('/socket.io', createProxyMiddleware({
  target: USER_SERVICE_URL,
  changeOrigin: true,
  ws: true,
  onError: (err, _req, _res) => {
    console.error('Socket Proxy error:', err.message);
    // WebSockets don't use standard response methods on error during upgrade
    // but http-proxy-middleware handles cleanup
  }
}));

// ===========================================
// Error Handling
// ===========================================

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  });
});

// ===========================================
// Server Start
// ===========================================

const server = app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 API Gateway running on http://0.0.0.0:${PORT}`);
  console.log(`📊 Health check available at http://0.0.0.0:${PORT}/health`);
  console.log(`→ Proxying auth to ${USER_SERVICE_URL}`);

  // Connectivity Probe
  const probeUserService = async () => {
    try {
      console.log(`[Connectivity Probe] Pinging User Service at ${USER_SERVICE_URL}/health...`);
      const response = await fetch(`${USER_SERVICE_URL}/health`);
      if (response.ok) {
        console.log(`[Connectivity Probe] ✅ User Service is reachable and healthy (Status: ${response.status})`);
      } else {
        console.error(`[Connectivity Probe] ⚠️ User Service returned status ${response.status}`);
      }
    } catch (err: any) {
      console.error(`[Connectivity Probe] ❌ Failed to reach User Service at ${USER_SERVICE_URL}`);
      console.error(`[Connectivity Probe] Error: ${err.message}`);
      if (err.cause) console.error(`[Connectivity Probe] Cause:`, err.cause);
    }
  };
  
  // Initial probe delay to allow for startup jitter
  setTimeout(probeUserService, 5000);
});

// Graceful shutdown
const shutdown = () => {
  console.log('SIGTERM/SIGINT received, shutting down gateway...');
  server.close(() => {
    console.log('Gateway closed');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;
