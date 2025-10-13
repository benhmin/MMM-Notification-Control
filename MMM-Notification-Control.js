Module.register("MMM-Notification-Control", {

  defaults: {
    exampleContent: "",
    webhook: {
      enabled: false,
      port: 8080,
      path: "/mmm-webhook",
      secret: "" // optional; if set webhook requests must include this in X-Webhook-Secret header or body.secret
    }
  },

  /**
   * Apply the default styles.
   */
  getStyles() {
    return ["template.css"]
  },

  /**
   * Pseudo-constructor for our module. Initialize stuff here.
   */
  start() {
    this.templateContent = this.config.exampleContent
    this.page = 0
    this.webhookText = ""
    this.webhookInfo = null // { port, path }

    // send config to node_helper so it can start a webhook server if enabled
    this.sendSocketNotification("CONFIG", this.config)

    // set timeout for next random text (store id so we can clear it on stop)
    this._randomTextInterval = setInterval(() => this.addRandomText(), 3000)
  },

  /**
   * Clear timers and other resources.
   */
  stop() {
    if (this._randomTextInterval) {
      clearInterval(this._randomTextInterval)
      this._randomTextInterval = null
    }
  },

  /**
   * Handle notifications received by the node helper.
   * So we can communicate between the node helper and the module.
   *
   * @param {string} notification - The notification identifier.
   * @param {any} payload - The payload data`returned by the node helper.
   */
  socketNotificationReceived: function (notification, payload) {
    if (notification === "EXAMPLE_NOTIFICATION") {
      this.templateContent = `${this.config.exampleContent} ${payload.text}`
      this.updateDom()
    } else if (notification === "PAGE_TURN") {
      // Instead of changing pages when receiving a webhook, store the payload text
      // and display it below the current content. Prefer payload as string or
      // payload.text if present; fallback to JSON.
      if (typeof payload === "string") {
        this.webhookText = payload
      } else if (payload && typeof payload.text === "string") {
        this.webhookText = payload.text
      } else {
        try {
          this.webhookText = payload ? JSON.stringify(payload) : ""
        } catch (e) {
          this.webhookText = String(payload)
        }
      }
      this.updateDom()
    } else if (notification === "SET_PAGE") {
      const newPage = (payload && payload.page) || 0
      this.page = newPage
      this.templateContent = `${this.config.exampleContent} (Page ${this.page})`
      this.updateDom()
    } else if (notification === "WEBHOOK_STARTED") {
      // payload: { port, path }
      this.webhookInfo = payload || null
      this.updateDom()
    }
  },

  /**
   * Render the page we're on.
   */
  getDom() {
    const wrapper = document.createElement("div")

    // Title
    const title = document.createElement("div")
    title.innerHTML = "<b>Title</b>"
    wrapper.appendChild(title)

    // Main content (from config / random text)
    const content = document.createElement("div")
    content.className = "template-content"
    content.textContent = this.templateContent || ""
    wrapper.appendChild(content)

    // Webhook info (port/path)
    if (this.webhookInfo && this.webhookInfo.port) {
      const infoDiv = document.createElement("div")
      infoDiv.className = "webhook-info"
      infoDiv.textContent = `Webhook listening on ${this.webhookInfo.port}${this.webhookInfo.path ? ' ' + this.webhookInfo.path : ''}`
      wrapper.appendChild(infoDiv)
    }

    // Webhook text (displayed below current content if present)
    if (this.webhookText) {
      const webhookDiv = document.createElement("div")
      webhookDiv.className = "webhook-text"
      webhookDiv.textContent = this.webhookText
      wrapper.appendChild(webhookDiv)
    }

    return wrapper
  },

  addRandomText() {
    this.sendSocketNotification("GET_RANDOM_TEXT", { amountCharacters: 15 })
  },

  /**
   * This is the place to receive notifications from other modules or the system.
   *
   * @param {string} notification The notification ID, it is preferred that it prefixes your module name
   * @param {number} payload the payload type.
   */
  notificationReceived(notification, payload) {
    if (notification === "TEMPLATE_RANDOM_TEXT") {
      this.templateContent = `${this.config.exampleContent} ${payload}`
      this.updateDom()
    }
  }
})
Module.register("MMM-Notification-Control", {

  defaults: {
    exampleContent: "",
    webhook: {
      enabled: false,
      port: 8080,
      path: "/mmm-webhook",
      secret: "" // optional; if set webhook requests must include this in X-Webhook-Secret header or body.secret
    }
  },

  /**
   * Apply the default styles.
   */
  getStyles() {
    return ["template.css"]
  },

  /**
   * Pseudo-constructor for our module. Initialize stuff here.
   */
  start() {
    this.templateContent = this.config.exampleContent
    this.page = 0
    this.webhookText = ""

    // send config to node_helper so it can start a webhook server if enabled
    this.sendSocketNotification("CONFIG", this.config)

    // set timeout for next random text (store id so we can clear it on stop)
    this._randomTextInterval = setInterval(() => this.addRandomText(), 3000)
  },

  /**
   * Clear timers and other resources.
   */
  stop() {
    if (this._randomTextInterval) {
      clearInterval(this._randomTextInterval)
      this._randomTextInterval = null
    }
  },

  /**
   * Handle notifications received by the node helper.
   * So we can communicate between the node helper and the module.
   *
   * @param {string} notification - The notification identifier.
   * @param {any} payload - The payload data`returned by the node helper.
   */
  socketNotificationReceived: function (notification, payload) {
    if (notification === "EXAMPLE_NOTIFICATION") {
      this.templateContent = `${this.config.exampleContent} ${payload.text}`
      this.updateDom()
    } else if (notification === "PAGE_TURN") {
      // Instead of changing pages when receiving a webhook, store the payload text
      // and display it below the current content. Prefer payload as string or
      // payload.text if present; fallback to JSON.
      if (typeof payload === "string") {
        this.webhookText = payload
      } else if (payload && typeof payload.text === "string") {
        this.webhookText = payload.text
      } else {
        try {
          this.webhookText = payload ? JSON.stringify(payload) : ""
        } catch (e) {
          this.webhookText = String(payload)
        }
      }
      this.updateDom()
    } else if (notification === "SET_PAGE") {
      const newPage = (payload && payload.page) || 0
      this.page = newPage
      this.templateContent = `${this.config.exampleContent} (Page ${this.page})`
      this.updateDom()
    }
  },

  /**
   * Render the page we're on.
   */
  getDom() {
    const wrapper = document.createElement("div")

    // Title
    const title = document.createElement("div")
    title.innerHTML = "<b>Title</b>"
    wrapper.appendChild(title)

    // Main content (from config / random text)
    const content = document.createElement("div")
    content.className = "template-content"
    content.textContent = this.templateContent || ""
    wrapper.appendChild(content)

    // Webhook text (displayed below current content if present)
    if (this.webhookText) {
      const webhookDiv = document.createElement("div")
      webhookDiv.className = "webhook-text"
      webhookDiv.textContent = this.webhookText
      wrapper.appendChild(webhookDiv)
    }

    return wrapper
  },

  addRandomText() {
    this.sendSocketNotification("GET_RANDOM_TEXT", { amountCharacters: 15 })
  },

  /**
   * This is the place to receive notifications from other modules or the system.
   *
   * @param {string} notification The notification ID, it is preferred that it prefixes your module name
   * @param {number} payload the payload type.
   */
  notificationReceived(notification, payload) {
    if (notification === "TEMPLATE_RANDOM_TEXT") {
      this.templateContent = `${this.config.exampleContent} ${payload}`
      this.updateDom()
    }
  }
})
