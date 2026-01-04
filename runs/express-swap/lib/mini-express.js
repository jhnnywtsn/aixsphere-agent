import { createServer } from 'node:http';
import { parse as parseUrl } from 'node:url';

function createResponse(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(payload));
  };
  res.send = (payload) => {
    if (typeof payload === 'object' && payload !== null) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(payload));
    } else {
      res.end(payload);
    }
  };
  res.type = (contentType) => {
    res.setHeader('Content-Type', contentType);
    return res;
  };
  return res;
}

function matchPath(routePath, pathname) {
  const routeParts = routePath.split('/').filter(Boolean);
  const pathParts = pathname.split('/').filter(Boolean);
  if (routeParts.length !== pathParts.length) return null;
  const params = {};
  for (let i = 0; i < routeParts.length; i++) {
    const routeSegment = routeParts[i];
    const pathSegment = pathParts[i];
    if (routeSegment.startsWith(':')) {
      params[routeSegment.slice(1)] = decodeURIComponent(pathSegment);
    } else if (routeSegment !== pathSegment) {
      return null;
    }
  }
  return params;
}

function express() {
  const layers = [];

  function app(req, res) {
    createResponse(res);
    const { pathname } = parseUrl(req.url, true);
    req.pathname = pathname;
    req.params = {};
    let idx = 0;

    function next(err) {
      const layer = layers[idx++];
      if (!layer) {
        if (err) {
          res.status(500).json({ error: err.message || 'Server error' });
        } else if (!res.writableEnded) {
          res.status(404).send('Not found');
        }
        return;
      }

      const shouldRun =
        !layer.routePath ||
        pathname === layer.routePath ||
        pathname.startsWith(layer.routePath + '/') ||
        matchPath(layer.routePath, pathname);

      if (!shouldRun) return next(err);

      if (layer.method && layer.method !== req.method) return next(err);

      if (layer.routePath) {
        const params = matchPath(layer.routePath, pathname);
        if (layer.method && params === null) return next(err);
        if (params) req.params = params;
      }

      try {
        if (layer.handler.length === 4 && err) {
          return layer.handler(err, req, res, next);
        }
        if (layer.handler.length < 4 && !err) {
          return layer.handler(req, res, next);
        }
        return next(err);
      } catch (error) {
        return next(error);
      }
    }

    next();
  }

  function register(type, routePath, handler, method = null) {
    layers.push({ type, routePath, handler, method });
  }

  app.use = (routePath, handler) => {
    if (typeof routePath === 'function') {
      register('middleware', null, routePath);
    } else {
      register('middleware', routePath, handler);
    }
  };

  ['get', 'post', 'put', 'delete'].forEach((method) => {
    app[method] = (routePath, handler) => register('route', routePath, handler, method.toUpperCase());
  });

  app.listen = (port, cb) => {
    const server = createServer(app);
    server.listen(port, cb);
    app.server = server;
    return server;
  };

  return app;
}

express.json = () => {
  return (req, _res, next) => {
    if ((req.headers['content-type'] || '').includes('application/json')) {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        try {
          req.body = body ? JSON.parse(body) : {};
        } catch (err) {
          req.body = {};
        }
        next();
      });
    } else {
      next();
    }
  };
};

export default express;
