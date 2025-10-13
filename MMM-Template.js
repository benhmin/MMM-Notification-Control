Module.register("MMM-Template", {

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
      // example: increment page by 1 or use payload.amount
      const increment = (payload && payload.amount) || 1
      this.page += increment
      this.templateContent = `${this.config.exampleContent} (Page ${this.page})`
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
    wrapper.innerHTML = `<b>Title</b><br />${this.templateContent}`

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
