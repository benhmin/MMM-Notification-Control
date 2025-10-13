const NodeHelper = require("node_helper")
const http = require("http")
const url = require("url")

module.exports = NodeHelper.create({
  start() {
    this.config = {}
    this._server = null
  },

  async socketNotificationReceived(notification, payload) {
    if (notification === "GET_RANDOM_TEXT") {
      const amountCharacters = payload.amountCharacters || 10
      const randomText = Array.from({ length: amountCharacters }, () => String.fromCharCode(Math.floor(Math.random() * 26) + 97)).join("")
      this.sendSocketNotification("EXAMPLE_NOTIFICATION", { text: randomText })
    } else if (notification === "CONFIG") {
      // store configuration sent from the front-end and (re)start webhook server if enabled
      this.config = payload || {}
      if (this.config.webhook && this.config.webhook.enabled) {
        this._startWebhookServer(this.config.webhook)
      } else {
        this._stopWebhookServer()
      }
    }
  },

  _startWebhookServer(webhookConfig) {
    if (this._server) {
      // already running, ignore or restart if port/path changed
      return
    }

    const basePort = webhookConfig.port || 8080
    const path = webhookConfig.path || "/mmm-webhook"
    const expectedSecret = webhookConfig.secret || ""
    const maxAttempts = webhookConfig.maxPortAttempts || 10

    const self = this

    // Request handler reused for each server instance
    const requestHandler = (req, res) => {
      const reqUrl = url.parse(req.url).pathname

      if (req.method === "POST" && reqUrl === path) {
        let body = ""
        req.on("data", chunk => {
          body += chunk
          // Protect from huge bodies
          if (body.length > 1e6) {
            req.connection.destroy()
          }
        })
        req.on("end", () => {
          let data = {}
          try {
            data = body ? JSON.parse(body) : {}
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" })
            res.end(JSON.stringify({ error: "invalid_json" }))
            return
          }

          // Secret check: either header X-Webhook-Secret or body.secret
          const reqSecret = req.headers["x-webhook-secret"] || data.secret || ""
          if (expectedSecret && reqSecret !== expectedSecret) {
            res.writeHead(403, { "Content-Type": "application/json" })
            res.end(JSON.stringify({ error: "invalid_secret" }))
            return
          }

          const notification = data.notification
          const payload = data.payload || null

          if (!notification || typeof notification !== "string") {
            res.writeHead(400, { "Content-Type": "application/json" })
            res.end(JSON.stringify({ error: "missing_notification" }))
            return
          }

          // Forward to the front-end module(s)
          self.sendSocketNotification(notification, payload)

          res.writeHead(200, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ ok: true, forwarded: notification }))
        })
      } else {
        res.writeHead(404, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ error: "not_found" }))
      }
    }

    let attempts = 0

    const tryListen = (portToTry) => {
      const server = http.createServer(requestHandler)

      server.on('error', (err) => {
        if (err && err.code === 'EADDRINUSE' && attempts < maxAttempts) {
          console.warn(`MMM-Notification-Control: port ${portToTry} in use, trying ${portToTry + 1}`)
          attempts += 1
          // try next port
          tryListen(portToTry + 1)
        } else if (err && err.code === 'EADDRINUSE') {
          console.warn(`MMM-Notification-Control: ports ${basePort}-${portToTry} in use, falling back to ephemeral port`)
          // fall back to ephemeral port 0
          tryListen(0)
        } else {
          console.error('MMM-Notification-Control webhook server error:', err)
        }
      })

      server.listen(portToTry, () => {
        // store running server reference
        self._server = server
        const actualPort = server.address().port
        console.log(`MMM-Notification-Control webhook listening on port ${actualPort} path ${path}`)
        // notify front-end which port/path were used
        try {
          self.sendSocketNotification('WEBHOOK_STARTED', { port: actualPort, path: path })
        } catch (e) {
          // ignore if send fails
        }
      })
    }

    // kick off attempts
    tryListen(basePort)
  },

  _stopWebhookServer() {
    if (this._server) {
      try {
        this._server.close()
      } catch (e) {
        // ignore
      }
      this._server = null
    }
  },

  // optional cleanup if the helper is shut down
  stop() {
    this._stopWebhookServer()
  },
})
