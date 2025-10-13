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

    const port = webhookConfig.port || 8080
    const path = webhookConfig.path || "/mmm-webhook"
    const expectedSecret = webhookConfig.secret || ""

    this._server = http.createServer((req, res) => {
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
          this.sendSocketNotification(notification, payload)

          res.writeHead(200, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ ok: true, forwarded: notification }))
        })
      } else {
        res.writeHead(404, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ error: "not_found" }))
      }
    })

    this._server.on("error", err => {
      // simple logging
      console.error("MMM-Notification-Control webhook server error:", err)
    })

    this._server.listen(port, () => {
      console.log(`MMM-Notification-Control webhook listening on port ${port} path ${path}`)
    })
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
